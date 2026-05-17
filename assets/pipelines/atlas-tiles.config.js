import { IMPORT_MANIFEST } from "../import-manifest.js";

function atlasAssetIds() {
  return [...IMPORT_MANIFEST]
    .filter((row) => row?.source === "asset_atlas")
    .sort((a, b) => a.atlasPosition - b.atlasPosition)
    .map((row) => row.assetId);
}

/**
 * Append-only: add new ids to the end to keep stable regions.
 */
export const ATLAS_TILE_ORDER = Object.freeze([...atlasAssetIds()]);

export const ATLAS_TILE_CELL = 64;
