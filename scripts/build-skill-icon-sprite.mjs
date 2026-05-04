/**
 * Мастера 500×500 (или любой квадрат) из assets/visuals/raster/skills-source/*.png
 * → даунскейл 64×64 → один атлас + skill-icons-atlas.gen.js
 *
 * Run: npm run icons:sprite
 */
import { existsSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { SKILLS_CONFIG } from "../skills.config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceDir = join(root, "assets", "visuals", "raster", "skills-source");
const outAtlas = join(root, "assets", "visuals", "raster", "skill-icons-atlas.png");
const outGen = join(root, "assets", "visuals", "skill-icons-atlas.gen.js");

const CELL = Number(process.env.ICON_ATLAS_CELL || 64) || 64;
const INVOKE_SEAL_VISUAL = "game_invoke_seal_circle";

/** skills-source/*.png basename → atlas / registry visualId (глифы Q/W/E в строке комбо) */
const COMBO_RUNE_GLYPH_MAP = new Map([
  ["frost_rune", "game_combo_rune_frost"],
  ["lightning_rune", "game_combo_rune_lightning"],
  ["fire_rune", "game_combo_rune_fire"],
]);

/** @type {Map<string, string>} id → visualId */
const idToVisual = new Map();
for (const row of SKILLS_CONFIG.singleRuneCombos) idToVisual.set(row.id, row.visualId);
for (const row of SKILLS_CONFIG.dualRuneCombos) idToVisual.set(row.id, row.visualId);
for (const row of SKILLS_CONFIG.invokeCombos) idToVisual.set(row.id, row.visualId);
for (const [fileId, visualId] of COMBO_RUNE_GLYPH_MAP) idToVisual.set(fileId, visualId);

const ORDER = [
  ...SKILLS_CONFIG.singleRuneCombos.map((r) => r.id),
  ...COMBO_RUNE_GLYPH_MAP.keys(),
  ...SKILLS_CONFIG.dualRuneCombos.map((r) => r.id),
  ...SKILLS_CONFIG.invokeCombos.map((r) => r.id),
  "invoke_seal",
];

function placeholderGen() {
  return `/**
 * Автогенерация: npm run icons:sprite (scripts/build-skill-icon-sprite.mjs).
 * Нет PNG в raster/skills-source/ — атлас выключен.
 */
export const SKILL_ICON_ATLAS_URL = null;
export const SKILL_ICON_ATLAS_WIDTH = 0;
export const SKILL_ICON_ATLAS_HEIGHT = 0;
export const SKILL_ICON_ATLAS_CELL = ${CELL};
/** @type {Record<string, { x: number; y: number; w: number; h: number }>} */
export const SKILL_ICON_ATLAS_REGIONS = {};
`;
}

function presentIdsInOrder() {
  if (!existsSync(sourceDir)) return [];
  const names = new Set(readdirSync(sourceDir).filter((n) => n.endsWith(".png")));
  const out = [];
  for (const id of ORDER) {
    if (names.has(`${id}.png`)) out.push(id);
  }
  for (const n of names) {
    const id = n.slice(0, -4);
    if (!out.includes(id) && id !== "invoke_seal" && !COMBO_RUNE_GLYPH_MAP.has(id)) {
      console.warn(`[sprite] skip unknown file (not in skill list): ${n}`);
    }
  }
  return out;
}

const ids = presentIdsInOrder();

if (ids.length === 0) {
  if (existsSync(outAtlas)) {
    try {
      unlinkSync(outAtlas);
    } catch {
      /* ignore */
    }
  }
  writeFileSync(outGen, placeholderGen(), "utf8");
  console.log("[sprite] no PNG in skills-source/, atlas disabled");
  process.exit(0);
}

const tiles = [];
for (const id of ids) {
  const path = join(sourceDir, `${id}.png`);
  const buf = await sharp(path)
    .resize(CELL, CELL, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .png()
    .toBuffer();
  const visualId = id === "invoke_seal" ? INVOKE_SEAL_VISUAL : idToVisual.get(id);
  if (!visualId) {
    console.warn(`[sprite] skip ${id}: no visualId`);
    continue;
  }
  tiles.push({ id, visualId, buf });
}

if (tiles.length === 0) {
  writeFileSync(outGen, placeholderGen(), "utf8");
  console.log("[sprite] nothing to pack");
  process.exit(0);
}

const n = tiles.length;
const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
const rows = Math.ceil(n / cols);
const W = cols * CELL;
const H = rows * CELL;

const composites = tiles.map((t, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  return { input: t.buf, left: col * CELL, top: row * CELL };
});

await sharp({
  create: {
    width: W,
    height: H,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png({ compressionLevel: 9 })
  .toFile(outAtlas);

/** @type {Record<string, { x: number; y: number; w: number; h: number }>} */
const regions = {};
tiles.forEach((t, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  regions[t.visualId] = { x: col * CELL, y: row * CELL, w: CELL, h: CELL };
});

const regionLines = Object.keys(regions)
  .sort()
  .map((k) => {
    const r = regions[k];
    return `    ${JSON.stringify(k)}: { x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h} },`;
  })
  .join("\n");

const gen = `/**
 * Автогенерация: npm run icons:sprite — не править вручную.
 */
export const SKILL_ICON_ATLAS_URL = ${JSON.stringify("/assets/visuals/raster/skill-icons-atlas.png")};
export const SKILL_ICON_ATLAS_WIDTH = ${W};
export const SKILL_ICON_ATLAS_HEIGHT = ${H};
export const SKILL_ICON_ATLAS_CELL = ${CELL};
/** @type {Record<string, { x: number; y: number; w: number; h: number }>} */
export const SKILL_ICON_ATLAS_REGIONS = {
${regionLines}
};
`;

writeFileSync(outGen, gen, "utf8");
console.log("OK", outAtlas, `${tiles.length} icons`, `${W}×${H}`);
console.log("OK", outGen);
