# whatIwillIdo

Twine (Twee) project scaffold using `tweego` + SugarCube for JavaScript-friendly stories.

## Quick start

1. Ensure `tweego` is installed and available in PATH.
2. Run:

```bash
npm run build
```

This will:
- download SugarCube story format into `.tweego/storyformats` (first run),
- compile `.twee` files from `src/` into `dist/story.html`.

## Scripts

- `npm run twine:setup` — fetches SugarCube format locally for Tweego.
- `npm run build` — compiles story once.
- `npm run watch` — watches `src/` and rebuilds on changes.

## JavaScript in Twine

Put story JS in separate `.js` files inside `src/` (for example `src/story.js`).
Tweego automatically bundles `.js` files, so passages can call those functions directly.

You can still use a `Story JavaScript` passage if you prefer, but it is optional.