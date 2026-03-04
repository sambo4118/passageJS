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

Put your story JS in the `Story JavaScript` passage in `src/story.twee`.