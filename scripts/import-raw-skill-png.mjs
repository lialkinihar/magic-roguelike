/**
 * Импорт мастеров из assets/raw_png по import-manifest.json:
 * снятие хромакея → запись в assets/visuals/raster/skills-source/{skillId}.png
 *
 * Run: npm run icons:import-raw
 *
 * Переменные окружения (опционально):
 *   RAW_CHROMA_HEX (по умолчанию fc03f8)
 *   RAW_CHROMA_TOLERANCE (по умолчанию 18)
 *
 * В import-manifest.json у строки можно задать chromaHex (например "00ff00") и chromaTolerance — иначе берутся env/дефолты.
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { SKILLS_CONFIG } from "../skills.config.js";
import { chromaKeyBufferToPngBuffer } from "./chroma-key-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const rawDir = join(root, "assets", "raw_png");
const manifestPath = join(rawDir, "import-manifest.json");
const skillsSourceDir = join(root, "assets", "visuals", "raster", "skills-source");

const DEFAULT_CHROMA = process.env.RAW_CHROMA_HEX || "fc03f8";
const DEFAULT_TOLERANCE = Number(process.env.RAW_CHROMA_TOLERANCE || 18) || 18;

/** Мастера для полоски QWE в комбо (не `rune_q` — это иконки скиллов). Файлы: `frost_rune.png` и т.д. */
const COMBO_RUNE_GLYPH_IDS = ["frost_rune", "lightning_rune", "fire_rune"];

function allSkillIds() {
  const ids = new Set();
  for (const row of SKILLS_CONFIG.singleRuneCombos) ids.add(row.id);
  for (const row of SKILLS_CONFIG.dualRuneCombos) ids.add(row.id);
  for (const row of SKILLS_CONFIG.invokeCombos) ids.add(row.id);
  ids.add("invoke_seal");
  for (const id of COMBO_RUNE_GLYPH_IDS) ids.add(id);
  return ids;
}

async function main() {
  const allowed = allSkillIds();
  if (!existsSync(manifestPath)) {
    console.error("Missing", manifestPath);
    process.exit(1);
  }
  const text = await readFile(manifestPath, "utf8");
  /** @type {unknown} */
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    console.error("import-manifest.json must be a JSON array");
    process.exit(1);
  }

  await mkdir(skillsSourceDir, { recursive: true });

  let ok = 0;
  const seen = new Set();
  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    if (!row || typeof row !== "object") continue;
    const file = row.file;
    const skillId = row.skillId;
    if (typeof file !== "string" || typeof skillId !== "string") {
      console.warn(`[import-raw] skip row ${i}: need file + skillId strings`);
      continue;
    }
    if (!allowed.has(skillId)) {
      console.warn(`[import-raw] skip unknown skillId: ${skillId} (file ${file})`);
      continue;
    }
    if (seen.has(skillId)) console.warn(`[import-raw] duplicate skillId ${skillId}, overwriting`);
    seen.add(skillId);

    const inputPath = join(rawDir, file);
    if (!existsSync(inputPath)) {
      console.warn(`[import-raw] missing file: ${inputPath}`);
      continue;
    }

    let chromaHex = DEFAULT_CHROMA;
    if (typeof row.chromaHex === "string" && row.chromaHex.trim()) {
      chromaHex = row.chromaHex.trim().replace(/^#/, "");
    }
    let chromaTol = DEFAULT_TOLERANCE;
    if (row.chromaTolerance != null && Number.isFinite(Number(row.chromaTolerance))) {
      chromaTol = Number(row.chromaTolerance);
    }

    const buf = await readFile(inputPath);
    const outBuf = await chromaKeyBufferToPngBuffer(buf, chromaHex, chromaTol);
    const outPath = join(skillsSourceDir, `${skillId}.png`);
    await writeFile(outPath, outBuf);
    console.log("OK", file, "→", `skills-source/${skillId}.png`);
    ok++;
  }
  console.log(`Done: ${ok} file(s). Next: npm run icons:sprite`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
