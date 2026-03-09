#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const DEFAULT_REMOTE = 'upstream';
const DEFAULT_BRANCH = 'main';

function parseArgs(argv) {
  const args = {
    remote: DEFAULT_REMOTE,
    remoteExplicit: false,
    branch: DEFAULT_BRANCH,
    ref: null,
    source: null,
    dryRun: false,
    prune: false,
    verbose: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--prune') {
      args.prune = true;
      continue;
    }

    if (token === '--verbose') {
      args.verbose = true;
      continue;
    }

    if (token === '--remote') {
      args.remote = argv[i + 1];
      args.remoteExplicit = true;
      i += 1;
      continue;
    }

    if (token === '--branch') {
      args.branch = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--ref') {
      args.ref = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--source') {
      args.source = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function printHelp() {
  console.log(`Sync template structure without overwriting story passages.

Usage:
  node sync-template.js [options]

Options:
  --remote <name>   Git remote that points to the template repo (default: upstream, fallback: origin)
  --branch <name>   Branch to sync from when --ref is not used (default: main)
  --ref <git-ref>   Exact git ref to sync from (tag, commit, or branch)
  --source <path>   Sync from a local folder instead of a git remote
  --dry-run         Show what would change without writing files
  --prune           Remove non-protected files that no longer exist upstream
  --verbose         Print skipped protected paths
  --help, -h        Show this help message

Protected paths:
  - passages/**
`);
}

function toPosixPath(p) {
  return p.split(path.sep).join('/');
}

function isProtected(relPath) {
  const normalized = toPosixPath(relPath);
  return normalized === 'passages' || normalized.startsWith('passages/');
}

function isIgnored(relPath) {
  const normalized = toPosixPath(relPath);
  return (
    normalized === '.git' ||
    normalized.startsWith('.git/') ||
    normalized === 'node_modules' ||
    normalized.startsWith('node_modules/')
  );
}

async function listFilesRecursive(rootDir) {
  const out = new Map();

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(currentDir, entry.name);
      const rel = path.relative(rootDir, absolute);
      const relPosix = toPosixPath(rel);

      if (isIgnored(relPosix)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }

      if (entry.isFile()) {
        out.set(relPosix, absolute);
      }
    }
  }

  await walk(rootDir);
  return out;
}

async function ensureParentDir(filePath, dryRun) {
  if (dryRun) return;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readBuffer(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function removeEmptyDirectories(rootDir) {
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      await walk(path.join(dir, entry.name));
    }

    if (dir === rootDir) return;

    const after = await fs.readdir(dir);
    if (after.length === 0) {
      await fs.rmdir(dir);
    }
  }

  await walk(rootDir);
}

function run(command, options = {}) {
  return execSync(command, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options
  });
}

function listGitRemotes(cwd) {
  const output = run('git remote', { cwd });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolveRemote(args, cwd) {
  const remotes = listGitRemotes(cwd);

  if (remotes.includes(args.remote)) {
    return { remote: args.remote, note: null };
  }

  if (!args.remoteExplicit && args.remote === DEFAULT_REMOTE && remotes.includes('origin')) {
    return {
      remote: 'origin',
      note: `Remote '${DEFAULT_REMOTE}' not found. Falling back to 'origin'.`
    };
  }

  if (remotes.length === 0) {
    throw new Error('No git remotes found. Add a remote or pass --source <path>.');
  }

  const available = remotes.join(', ');
  throw new Error(
    `Git remote '${args.remote}' was not found. Available remotes: ${available}. ` +
      'Add the remote first, pass --remote <name>, or use --source <path>.'
  );
}

async function materializeSource(args) {
  if (args.source) {
    const absoluteSource = path.resolve(args.source);
    const stat = await fs.stat(absoluteSource);
    if (!stat.isDirectory()) {
      throw new Error(`--source path is not a directory: ${absoluteSource}`);
    }
    return { sourceDir: absoluteSource, tempDir: null, refLabel: absoluteSource };
  }

  const cwd = process.cwd();
  const ref = args.ref || args.branch;
  const { remote, note } = resolveRemote(args, cwd);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'passagejs-sync-'));

  if (note) {
    console.log(`[sync-template] ${note}`);
  }

  try {
    run(`git fetch --depth=1 ${remote} ${ref}`, { cwd });
  } catch (error) {
    const stderr = error && error.stderr ? String(error.stderr).trim() : '';
    throw new Error(
      `Could not fetch ${remote}/${ref}. Add the remote first or pass --source. ${stderr}`.trim()
    );
  }

  try {
    run(`git archive --format=tar ${remote}/${ref} | tar -xf - -C "${tempDir}"`, { cwd, shell: '/bin/bash' });
  } catch (error) {
    const stderr = error && error.stderr ? String(error.stderr).trim() : '';
    throw new Error(`Could not export files from ${remote}/${ref}. ${stderr}`.trim());
  }

  return { sourceDir: tempDir, tempDir, refLabel: `${remote}/${ref}` };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const projectRoot = process.cwd();
  const { sourceDir, tempDir, refLabel } = await materializeSource(args);

  try {
    const sourceFiles = await listFilesRecursive(sourceDir);
    const targetFiles = await listFilesRecursive(projectRoot);

    const created = [];
    const updated = [];
    const deleted = [];
    const skipped = [];

    for (const [relPosix, sourceAbs] of sourceFiles.entries()) {
      if (isProtected(relPosix)) {
        if (args.verbose) skipped.push(relPosix);
        continue;
      }

      const targetAbs = path.join(projectRoot, relPosix);
      const [sourceBuffer, targetBuffer] = await Promise.all([
        fs.readFile(sourceAbs),
        readBuffer(targetAbs)
      ]);

      if (targetBuffer && Buffer.compare(sourceBuffer, targetBuffer) === 0) {
        continue;
      }

      if (!targetBuffer) {
        created.push(relPosix);
      } else {
        updated.push(relPosix);
      }

      if (!args.dryRun) {
        await ensureParentDir(targetAbs, false);
        await fs.writeFile(targetAbs, sourceBuffer);
      }
    }

    if (args.prune) {
      for (const [relPosix, targetAbs] of targetFiles.entries()) {
        if (isProtected(relPosix)) {
          if (args.verbose) skipped.push(relPosix);
          continue;
        }

        if (!sourceFiles.has(relPosix)) {
          deleted.push(relPosix);
          if (!args.dryRun) {
            await fs.unlink(targetAbs);
          }
        }
      }

      if (!args.dryRun) {
        await removeEmptyDirectories(projectRoot);
      }
    }

    const modeLabel = args.dryRun ? 'DRY RUN' : 'SYNC';
    console.log(`[${modeLabel}] Template source: ${refLabel}`);
    console.log(`Created: ${created.length}`);
    console.log(`Updated: ${updated.length}`);
    if (args.prune) console.log(`Deleted: ${deleted.length}`);
    console.log(`Protected (passages/**): ${skipped.length}`);

    const preview = (label, items) => {
      if (items.length === 0) return;
      console.log(`\n${label}:`);
      for (const item of items.slice(0, 20)) {
        console.log(`  - ${item}`);
      }
      if (items.length > 20) {
        console.log(`  ...and ${items.length - 20} more`);
      }
    };

    preview('Created files', created);
    preview('Updated files', updated);
    if (args.prune) preview('Deleted files', deleted);

    if (!args.dryRun) {
      console.log('\nSync complete. Story content under passages/ was not modified.');
    } else {
      console.log('\nNo files were written (dry run).');
    }
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(`Sync failed: ${error.message}`);
  process.exit(1);
});