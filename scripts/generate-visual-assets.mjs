/**
 * Generates assets/visuals/visual-assets.js
 * Run: node scripts/generate-visual-assets.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "assets", "visuals", "visual-assets.js");
const sourceSkillsPath = join(__dirname, "..", "assets", "visuals", "source", "skills");

const G = {
  ice: "#6edbff",
  lightning: "#7ecbff",
  fire: "#ff8c42",
  arcane: "#c9a6ff",
  gold: "#ffd54a",
  nature: "#7dff9a",
  blood: "#ff4466",
  neutral: "#e8e8f0",
  chrome: "#c8d0e0",
};

function neon(paths, color) {
  return paths
    .map(
      (d) =>
        `<path d="${d}" stroke="${color}" stroke-width="1.5" opacity="0.28" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${color}" stroke-width="0.825" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join("");
}

function svg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g transform="scale(2)">${inner}</g></svg>`;
}

function validateSourceSvg(svgString, sourceFile) {
  const cleaned = svgString.trim();
  if (!cleaned.startsWith("<svg")) {
    throw new Error(`[visuals] ${sourceFile}: file must start with <svg ...>`);
  }
  if (!/viewBox="0 0 64 64"/.test(cleaned)) {
    throw new Error(`[visuals] ${sourceFile}: use viewBox="0 0 64 64"`);
  }
  if (/<script[\s>]/i.test(cleaned)) {
    throw new Error(`[visuals] ${sourceFile}: <script> is not allowed`);
  }
  return cleaned;
}

function loadSkillSourceSvg(skillId) {
  const sourceFile = join(sourceSkillsPath, `${skillId}.svg`);
  if (!existsSync(sourceFile)) return null;
  const content = readFileSync(sourceFile, "utf8");
  return validateSourceSvg(content, sourceFile);
}

const P = {
  snowflake: "M16 4v24M10 8l12 16M22 8L10 24M8 16h16",
  bolt: "M18 4L10 18h6l-2 10 12-16h-7l3-8",
  flame: "M16 26c-4-4-6-8-4-12 2-5 4-6 4-10 0 4 2 5 4 10 2 4 0 8-4 12z",
  coin: "M16 6a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12z",
  armor: "M16 6l6 3v8c0 4-2 7-6 9-4-2-6-5-6-9V9z",
  invokeRing:
    "M16 4a12 12 0 100 24 12 12 0 000-24zm0 3a9 9 0 100 18 9 9 0 000-18z M16 16m-3 0a3 3 0 106 0 3 3 0 00-6 0 M8 10l4 2M24 10l-4 2",
  book: "M8 8h8v16H8zm16 0h-8v16h8M8 8c0-2 2-4 4-4h8c2 0 4 2 4 4",
  scroll: "M10 8h12v16H10c-2 0-4-2-4-4V12c0-2 2-4 4-4zm4 0V6c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
  shop: "M6 12h20v14H6zm0-2l2-6h16l2 6M10 18h12",
  pause: "M11 8h3v16h-3zm7 0h3v16h-3",
  play: "M10 8l14 8-14 8z",
  home: "M8 20 L16 10 L24 20 V28 H8 Z M14 28 V22 H18 V28",
  potion: "M14 6h4v4c4 1 6 4 6 9a6 6 0 01-12 0c0-5 2-8 6-9V6z",
  leaf: "M22 22c-8 0-12-6-12-14 8 2 12 6 12 14z",
  heart: "M16 24c-6-4-10-8-10-12a5 5 0 0110-3 5 5 0 0110 3c0 4-4 8-10 12z",
  shield: "M16 5l8 3v8c0 5-3 9-8 11-5-2-8-6-8-11V8z",
  sword: "M12 24l-4 4 2-6 10-10 4 4M22 8l4 4",
  anchor: "M16 6v18M10 22h12M13 14c2-2 6-2 8 0",
  skull: "M13 14a5 5 0 1010 0 10 10 0 00-10 0zm1 8v4h6v-4",
  spiral: "M16 16m-8 0a8 8 0 1116 0 8 8 0 01-16 0",
  star: "M16 5l2 7 7 2-7 2-2 7-2-7-7-2 7-2z",
  prism: "M16 6l10 18H6z",
  person: "M16 10a3 3 0 100 6 3 3 0 000-6zm-6 14c0-4 4-6 6-6s6 2 6 6",
  volcano: "M8 28h16L16 10z",
  beam: "M6 16h20",
  mine: "M16 8l3 6 6 2-6 2-3 6-3-6-6-2 6-2z",
  ring: "M16 6a10 10 0 100 20 10 10 0 000-20z",
};

const ice = () => svg(neon([P.snowflake], G.ice));
const bolt = () => svg(neon([P.bolt], G.lightning));
const fire = () => svg(neon([P.flame], G.fire));

function duo(seq) {
  const s = seq.toUpperCase();
  if (s === "QQ") return ice();
  if (s === "WW") return bolt();
  if (s === "EE") return fire();
  if (s === "QW" || s === "WQ")
    return svg(`${neon(["M10 20c4-8 8-8 12 0"], G.ice)}${neon(["M14 8l8 16"], G.lightning)}`);
  if (s === "QE" || s === "EQ") return svg(`${neon([P.snowflake], G.ice)}${neon([P.flame], G.fire)}`);
  if (s === "WE" || s === "EW") return svg(`${neon([P.bolt], G.lightning)}${neon([P.flame], G.fire)}`);
  return ice();
}

function invoke(seq3) {
  const s = seq3.toUpperCase();
  const q = (s.match(/Q/g) || []).length;
  const w = (s.match(/W/g) || []).length;
  const e = (s.match(/E/g) || []).length;
  if (s === "QWE" || s === "QEW" || s === "WQE" || s === "WEQ" || s === "EQW" || s === "EWQ")
    return svg(neon([P.star], G.arcane));
  if (s === "WEE") return svg(neon([P.person], G.arcane));
  if (s === "WWW") return svg(neon([P.anchor], G.lightning));
  if (s === "EEW") return svg(neon([P.prism], G.ice));
  if (s === "WWE") return svg(neon([P.spiral], G.arcane));
  if (s === "WWQ") return svg(neon([P.shield], G.lightning));
  if (s === "WEW") return svg(neon([P.bolt, "M16 4v24"], G.lightning));
  if (s === "EWW") return svg(neon([P.volcano], G.fire));
  if (s === "WQW") return svg(neon([P.beam], G.lightning));
  if (s === "QEQ") return svg(neon([P.mine], G.ice));
  if (s === "QQQ") return svg(neon([P.ring], G.ice));
  if (e >= 2 && e >= q && e >= w) return fire();
  if (w >= 2 && w >= q && w >= e) return bolt();
  if (q >= 2 && q >= w && q >= e) return ice();
  if (e > q && e > w) return fire();
  if (w > q && w > e) return bolt();
  return ice();
}

function invokeById(comboId) {
  switch (comboId) {
    case "combo_qqq":
      return svg(
        `${neon([P.shield], G.ice)}${neon(["M16 8L14 6L18 6Z M13 10h6M15 10v9M17 10L20 6M20 6v11"], G.ice)}${neon([P.snowflake], G.ice)}`
      );
    case "combo_qqw":
      return svg(`${neon([P.ring], G.ice)}${neon([P.snowflake], G.ice)}`);
    case "combo_qqe":
      return svg(`${neon([P.mine, P.ring], G.ice)}${neon([P.star], G.arcane)}`);
    case "combo_qwq":
      return svg(
        `${neon(["M6 58L56 4L44 44Z", "M6 58L40 8L34 50Z"], G.ice)}${neon(["M28 38L34 20L36 36Z", "M38 34L44 16L46 32Z"], G.ice)}`
      );
    case "combo_qww":
      return svg(
        `${neon(["M16 8a8 6 0 1016 0 8 6 0 00-16 0z", "M16 4a12 10 0 1024 0 12 10 0 00-24 0z", "M16 2a14 12 0 1028 0 14 12 0 00-28 0z"], G.arcane)}${neon(["M4 10Q16 6 28 10", "M4 22Q16 26 28 22"], G.lightning)}`
      );
    case "combo_qwe":
      return svg(
        `${neon(["M12 18L12 38M8 22L16 22M10 38L14 42M14 16L18 12M16 24L20 20"], G.ice)}${neon(["M6 26L10 22M4 32L8 28"], G.lightning)}${neon(["M18 28L22 32M16 32L20 36"], G.fire)}${neon(["M24 34h20"], G.arcane)}${neon(["M48 18L48 38M44 22L52 22M46 38L50 42M48 14L48 10"], G.arcane)}`
      );
    case "combo_qeq":
      return svg(`${neon([P.mine], G.ice)}${neon([P.ring], G.ice)}`);
    case "combo_qew":
      return svg(`${neon([P.flame], G.fire)}${neon(["M8 24c4 2 12 2 16 0 4-2 8-2 12 0"], G.fire)}`);
    case "combo_qee":
      return svg(`${neon([P.prism, P.ring], G.ice)}${neon(["M16 8v16M8 16h16"], G.arcane)}`);
    case "combo_wqq":
      return svg(
        `${neon(["M8 22c0-3 2-5 5-5 1-3 4-5 8-5 4 0 7 2 8 6 3 0 5 2 5 5 0 3-2 5-5 5H13c-3 0-5-2-5-6"], G.ice)}${neon(["M12 26v4M16 26v4M20 26v4"], G.ice)}`
      );
    case "combo_wqw":
      return svg(`${neon([P.beam, P.ring], G.lightning)}${neon(["M16 6v6M6 16h6M20 16h6"], G.fire)}`);
    case "combo_wqe":
      return svg(`${neon([P.bolt], G.lightning)}${neon(["M8 16h10M18 16l-3-3M18 16l-3 3"], G.lightning)}`);
    case "combo_wwq":
      return svg(`${neon([P.shield], G.lightning)}${neon([P.ring], G.lightning)}`);
    case "combo_www":
      return svg(`${neon([P.anchor], G.lightning)}${neon([P.bolt], G.lightning)}`);
    case "combo_wwe":
      return svg(`${neon([P.spiral, P.ring], G.arcane)}${neon(["M16 6v4M16 22v4"], G.arcane)}`);
    case "combo_weq":
      return svg(
        `${neon(["M16 16L6 16M6 16l3-3M6 16l3 3", "M16 16L26 16M26 16l-3-3M26 16l-3 3", "M16 16L16 6M16 6l-3 3M16 6l3 3", "M16 16L16 26M16 26l-3-3M16 26l3-3"], G.arcane)}`
      );
    case "combo_wew":
      return svg(`${neon([P.bolt], G.lightning)}${neon(["M16 7v18M7 16h18"], G.lightning)}`);
    case "combo_wee":
      return svg(
        `${neon(["M10 6L8 4L12 4Z M10 6V28M7 9h6M8 28L10 32", "M11 7L14 3V26"], G.arcane)}${neon(["M22 6L20 4L24 4Z M22 6V28M19 9h6M20 28L22 32", "M23 7L26 3V26"], G.lightning)}`
      );
    case "combo_eqq":
      return svg(`${neon(["M6 12h20M6 18h20M6 24h20M6 12v12M12 12v12M18 12v12M26 12v12"], G.ice)}${neon([P.snowflake], G.ice)}`);
    case "combo_eqw":
      return svg(`${neon(["M8 16h8M16 16a6 6 0 100 12 6 6 0 000-12"], G.fire)}${neon(["M8 16L4 12"], G.fire)}`);
    case "combo_eqe":
      return svg(`${neon([P.flame], G.fire)}${neon(["M8 24c4-4 8-6 12-6M14 26c4-4 8-5 12-4"], G.fire)}`);
    case "combo_ewq":
      return svg(`${neon(["M6 12h16M8 16h18M10 20h16M26 16l-4-3M26 16l-4 3"], G.arcane)}`);
    case "combo_eww":
      return svg(`${neon([P.volcano], G.fire)}${neon(["M16 10v-4M13 12l-2-4M19 12l2-4"], G.fire)}`);
    case "combo_ewe":
      return svg(`${neon([P.ring], G.arcane)}${neon([P.snowflake], G.ice)}${neon([P.bolt], G.lightning)}${neon([P.flame], G.fire)}`);
    case "combo_eeq":
      return svg(`${neon([P.shield], G.fire)}${neon([P.flame], G.fire)}`);
    case "combo_eew":
      return svg(`${neon([P.prism], G.ice)}${neon(["M8 24l8-8 8 8"], G.arcane)}`);
    case "combo_eee":
      return svg(
        `${neon(["M52 6L22 38"], G.fire)}${neon(["M46 10c10 8 8 22-2 30-10 8-22 6-28-4-6-10-2-22 8-28 10-6 22-4 22 2z"], G.fire)}${neon(["M40 14c6 4 4 14-2 18-6 4-12 2-14-4-2-6 2-12 8-12 6 0 8 2 8-2z"], G.fire)}`
      );
    default:
      return invoke(comboId.replace("combo_", ""));
  }
}

function entry(kind, family, svgStr) {
  return { kind, family, svg: svgStr };
}

const ids = [
  "rune_q",
  "rune_w",
  "rune_e",
  "duo_qq",
  "duo_qw",
  "duo_qe",
  "duo_ww",
  "duo_we",
  "duo_ee",
  "combo_qqq",
  "combo_qqw",
  "combo_qqe",
  "combo_qwq",
  "combo_qww",
  "combo_qwe",
  "combo_qeq",
  "combo_qew",
  "combo_qee",
  "combo_wqq",
  "combo_wqw",
  "combo_wqe",
  "combo_wwq",
  "combo_www",
  "combo_wwe",
  "combo_weq",
  "combo_wew",
  "combo_wee",
  "combo_eqq",
  "combo_eqw",
  "combo_eqe",
  "combo_ewq",
  "combo_eww",
  "combo_ewe",
  "combo_eeq",
  "combo_eew",
  "combo_eee",
];

const skillAssets = {};
const fallbackSkillIds = [];
for (const id of ids) {
  const sourceSvg = loadSkillSourceSvg(id);
  let svgStr = sourceSvg;
  if (!svgStr) {
    fallbackSkillIds.push(id);
    if (id === "rune_q") svgStr = ice();
    else if (id === "rune_w") svgStr = bolt();
    else if (id === "rune_e") svgStr = fire();
    else if (id.startsWith("duo_")) svgStr = duo(id.slice(4));
    else if (id.startsWith("combo_")) svgStr = invokeById(id);
  }
  skillAssets[`game_skill_${id}`] = entry("icon", "game", svgStr);
}

const extra = {
  demo_orb: entry(
    "icon",
    "game",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><radialGradient id="demoOrbG" cx="35%" cy="30%"><stop offset="0%" stop-color="#e8f4ff"/><stop offset="55%" stop-color="#6bb3ff"/><stop offset="100%" stop-color="#1a4d99"/></radialGradient></defs><circle cx="16" cy="16" r="12" fill="url(#demoOrbG)" stroke="#0d2847" stroke-width="1.5"/><circle cx="12" cy="11" r="3" fill="#ffffff" opacity="0.45"/></svg>`
  ),
  demo_orb_world: entry(
    "world",
    "game",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><radialGradient id="demoOrbWorldG" cx="35%" cy="28%"><stop offset="0%" stop-color="#fff0dd"/><stop offset="50%" stop-color="#ff9933"/><stop offset="100%" stop-color="#8b2500"/></radialGradient></defs><circle cx="24" cy="24" r="18" fill="url(#demoOrbWorldG)" stroke="#4d1300" stroke-width="2"/><ellipse cx="18" cy="17" rx="5" ry="4" fill="#ffffff" opacity="0.35"/></svg>`
  ),
  app_shop_button: entry("icon", "app", svg(neon([P.shop], G.chrome))),
  app_pause: entry("icon", "app", svg(neon([P.pause], G.chrome))),
  app_play: entry("icon", "app", svg(neon([P.play], G.chrome))),
  app_main_menu: entry("icon", "app", svg(neon([P.home], G.chrome))),
  game_coin: entry("icon", "game", svg(neon([P.coin], G.gold))),
  game_armor: entry("icon", "game", svg(neon([P.armor], G.ice))),
  game_invoke_seal_circle: entry("icon", "game", svg(neon([P.invokeRing], G.arcane))),
  game_spell_list: entry("icon", "game", svg(neon([P.book], G.arcane))),
  game_artifact_empty_spell_scroll: entry("icon", "game", svg(neon([P.scroll], G.gold))),
  game_shop_heal: entry("icon", "game", svg(neon([P.potion], G.nature))),
  game_shop_hp: entry("icon", "game", svg(neon([P.heart], G.blood))),
  game_shop_speed: entry("icon", "game", svg(neon([P.leaf], G.nature))),
  game_shop_aegis: entry("icon", "game", svg(neon([P.shield], G.gold))),
  game_shop_spellbook: entry("icon", "game", svg(neon([P.scroll], G.arcane))),
  game_artifact_fury: entry("icon", "game", svg(neon([P.sword], G.fire))),
  game_artifact_guard: entry("icon", "game", svg(neon([P.shield], G.ice))),
  game_artifact_step: entry("icon", "game", svg(neon(["M10 22c6-8 12-8 12-4"], G.nature))),
  game_artifact_chain: entry("icon", "game", bolt()),
  game_artifact_nova: entry("icon", "game", fire()),
  game_artifact_heart: entry("icon", "game", svg(neon([P.heart], G.arcane))),
  game_buff_overcharge: entry("icon", "game", bolt()),
  game_buff_haste: entry("icon", "game", fire()),
  game_buff_armor_void: entry("icon", "game", svg(neon([P.shield], G.lightning))),
  game_buff_ice_shell: entry("icon", "game", ice()),
  game_buff_fire_shield: entry("icon", "game", fire()),
  game_buff_elemental_spin: entry("icon", "game", svg(neon([P.spiral], G.arcane))),
  game_status_stun: entry("icon", "game", ice()),
  game_status_fear: entry("icon", "game", svg(neon([P.skull], G.arcane))),
  game_world_anchor: entry("icon", "game", svg(neon([P.anchor], G.fire))),
  game_aegis_broken: entry("icon", "game", svg(neon([P.shield + " M8 8l16 16"], G.blood))),
};

const VISUAL_ASSETS = { ...extra, ...skillAssets };

function serialize() {
  const keys = Object.keys(VISUAL_ASSETS);
  const lines = keys.map((k) => {
    const e = VISUAL_ASSETS[k];
    const svgEsc = e.svg.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
    return `  ${JSON.stringify(k)}: {\n    kind: ${JSON.stringify(e.kind)},\n    family: ${JSON.stringify(e.family)},\n    svg: \`${svgEsc}\`,\n  }`;
  });
  return `/**\n * Auto-generated by scripts/generate-visual-assets.mjs\n */\nexport const VISUAL_ASSETS = {\n${lines.join(",\n")},\n};\n`;
}

writeFileSync(outPath, serialize());
console.log("OK", outPath, Object.keys(VISUAL_ASSETS).length, "assets");
if (fallbackSkillIds.length) {
  console.log(
    `[visuals] source icons missing for ${fallbackSkillIds.length}/${ids.length} skills (using fallback): ${fallbackSkillIds.join(", ")}`
  );
}
