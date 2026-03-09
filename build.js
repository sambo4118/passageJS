#!/usr/bin/env node

const esbuild = require('esbuild');
const fs = require('fs/promises');
const path = require('path');

const SRC = __dirname;
const DIST = path.join(__dirname, 'dist');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

function buildIndexHtml(original) {
  // Remove the two module script tags and replace with the single bundle + inline glue
  let html = original;

  // Remove <script type="module" src="./main.js"></script>
  html = html.replace(/<script type="module" src="\.\/main\.js"><\/script>\s*/, '');

  // Replace the inline module script block with a non-module version that uses window globals
  const inlineModuleRegex = /<script type="module">\s*import \{[^}]+\} from '\.\/main\.js';\s*([\s\S]*?)<\/script>/;
  const match = html.match(inlineModuleRegex);

  if (!match) {
    throw new Error('Could not find inline module script in index.html');
  }

  const inlineBody = match[1];

  // Build replacement: load the bundle first, then the inline script that reads from window
  const replacement =
    `<script src="./engine.min.js"></script>\n` +
    `    <script>\n` +
    `      var saveGame = window.__passageJS.saveGame;\n` +
    `      var loadGame = window.__passageJS.loadGame;\n` +
    `      var getSaveSlots = window.__passageJS.getSaveSlots;\n` +
    `      var deleteSave = window.__passageJS.deleteSave;\n` +
    `${inlineBody}</script>`;

  html = html.replace(inlineModuleRegex, replacement);

  return html;
}

async function build() {
  // Clean dist
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });

  // Bundle main.js + macros.js → engine.min.js
  await esbuild.build({
    entryPoints: [path.join(SRC, 'main.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: '__passageJS',
    outfile: path.join(DIST, 'engine.min.js'),
    footer: {
      // Expose exports on window so inline scripts can access them
      js: 'window.__passageJS = __passageJS;'
    }
  });

  // Build index.html (rewrite script tags)
  const originalHtml = await fs.readFile(path.join(SRC, 'index.html'), 'utf8');
  const builtHtml = buildIndexHtml(originalHtml);
  await fs.writeFile(path.join(DIST, 'index.html'), builtHtml);

  // Copy styles.css
  await fs.copyFile(path.join(SRC, 'styles.css'), path.join(DIST, 'styles.css'));

  // Copy passages/
  const passagesDir = path.join(SRC, 'passages');
  try {
    await fs.stat(passagesDir);
    await copyDir(passagesDir, path.join(DIST, 'passages'));
  } catch {
    // No passages dir yet — that's fine
  }

  // Summary
  const engineStat = await fs.stat(path.join(DIST, 'engine.min.js'));
  const sizeKB = (engineStat.size / 1024).toFixed(1);
  console.log(`✓ engine.min.js  ${sizeKB} KB`);
  console.log(`✓ index.html`);
  console.log(`✓ styles.css`);
  console.log(`✓ passages/`);
  console.log(`\nBuild output → dist/`);
  console.log('Ready to deploy (itch.io, GitHub Pages, etc.)');
}

build().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
