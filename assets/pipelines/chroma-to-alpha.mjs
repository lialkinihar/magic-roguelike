import { readdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chromaKeyBufferToPngBuffer } from "./lib/chroma-key-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const importDir = join(root, "assets", "pipeline-work", "import");
const hex = (process.env.PIPELINE_CHROMA_HEX || process.env.RAW_CHROMA_HEX || "fc03f8").replace(/^#/, "");
const tolerance = Number(process.env.PIPELINE_CHROMA_TOLERANCE || process.env.RAW_CHROMA_TOLERANCE || 18) || 18;

async function main() {
  if (!existsSync(importDir)) throw new Error(`Missing import dir: ${importDir}`);
  const files = (await readdir(importDir)).filter((name) => name.endsWith(".png"));
  for (const file of files) {
    const path = join(importDir, file);
    const out = await chromaKeyBufferToPngBuffer(await readFile(path), hex, tolerance);
    await writeFile(path, out);
  }
  console.log(`[chroma] processed ${files.length} file(s) in assets/pipeline-work/import`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
