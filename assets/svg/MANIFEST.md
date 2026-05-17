# App SVG Manifest

`app_*` icons are loaded directly from this folder at runtime.

## Naming

- File name must match asset id exactly: `<assetId>.svg`
- Example: `app_menu_button` -> `assets/svg/app_menu_button.svg`

## Runtime contract

- `registry.js` is generated from `assets/import-manifest.js` and stores `source: "svg_icons"` with `path`
- React client loads SVG via Vite (`client/src/visuals/atlasIconDom.ts`, `?url` imports)

## SVG requirements

- Must include a valid `viewBox` (recommended: `0 0 64 64`)
- Keep transparent background
- Use single icon centered in frame

## PR checklist

- Added/updated SVG file in this folder
- Updated `assets/import-manifest.js` entry for the same `assetId` (`source: "svg_icons"`)
- Verified icon in `assets/visuals/preview.html`
