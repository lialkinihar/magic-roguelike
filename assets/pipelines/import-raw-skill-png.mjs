import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { IMPORT_MANIFEST } from "../import-manifest.js";
import { chromaKeyBufferToPngBuffer } from "./lib/chroma-key-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const rawDir = join(root, "assets", "raw_png");
const importDir = join(root, "assets", "pipeline-work", "import");

const DEFAULT_CHROMA = process.env.RAW_CHROMA_HEX || "fc03f8";
const DEFAULT_TOLERANCE = Number(process.env.RAW_CHROMA_TOLERANCE || 18) || 18;

async function main() {
  await mkdir(importDir, { recursive: true });
  const rows = IMPORT_MANIFEST.filter((row) => row?.source === "asset_atlas");
  const seenAssetIds = new Set();
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") throw new Error(`[import-raw] row ${i}: must be object`);
    if (typeof row.file !== "string" || !row.file.trim()) throw new Error(`[import-raw] row ${i}: missing file`);
    if (typeof row.assetId !== "string" || !row.assetId.trim()) throw new Error(`[import-raw] row ${i}: missing assetId`);
    const assetId = row.assetId.trim();
    if (seenAssetIds.has(assetId)) throw new Error(`[import-raw] duplicate assetId in manifest: ${assetId}`);
    seenAssetIds.add(assetId);

    const inputPath = join(rawDir, row.file);
    if (!existsSync(inputPath)) throw new Error(`[import-raw] missing raw file for ${assetId}: ${inputPath}`);

    const chromaHex = typeof row.chromaHex === "string" && row.chromaHex.trim() ? row.chromaHex.trim().replace(/^#/, "") : DEFAULT_CHROMA;
    const chromaTolerance =
      row.chromaTolerance != null && Number.isFinite(Number(row.chromaTolerance))
        ? Number(row.chromaTolerance)
        : DEFAULT_TOLERANCE;

    const sourceBuffer = await readFile(inputPath);
    const outBuffer = await chromaKeyBufferToPngBuffer(sourceBuffer, chromaHex, chromaTolerance);
    const outPath = join(importDir, `${assetId}.png`);
    await writeFile(outPath, outBuffer);
    imported++;
  }

  console.log(`[import-raw] imported ${imported} asset(s) -> assets/pipeline-work/import`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

