# Assets Pipeline

## Layout

- `assets/raw_png/` - local source PNG files (not in git)
- `assets/import-manifest.js` - canonical asset manifest (`assetId`, `source`, and per-source required fields)
- `assets/pipeline-work/` - intermediate outputs (not in git)
  - `import/`
  - `refine/`
- `assets/pipelines/` - pipeline scripts (atlas order is derived from `atlasPosition` in manifest)
- `assets/visuals/raster/assets-atlas.png` - final atlas
- `assets/visuals/assets-atlas.gen.js` - generated atlas regions

## Commands

- Full pipeline:
  - `npm run icons:build-assets-atlas`
- Pipeline without chroma step:
  - `npm run icons:build-assets-atlas:no-chroma`
- Dry run (validation only):
  - `npm run icons:pipeline:dry-run`

## Flags

- `--skip-chroma` - skip chroma-to-alpha step
- `--skip-refine` - skip refine step
- `--dry-run` - run only preflight checks and report

## Glossary

- `registry.js`: logical asset catalog (`kind`, `family`, `source`), no pixel coordinates
- `assets-atlas.gen.js`: atlas map (`REGIONS`) with `{x,y,w,h}` per `assetId`
- `assets-atlas.png`: packed pixel image used by runtime rendering
- `import-manifest.js`: single source of truth for all `assetId` strings
