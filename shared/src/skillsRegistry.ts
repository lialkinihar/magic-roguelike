/**
 * Производные структуры из `skills.config.js` — единый реестр для симуляции, HUD и legacy.
 */

import { SKILL_DESCRIPTIONS, SKILLS_CONFIG, type SkillComboDef } from "./skills.config.js";
import { HUD_SKILL_TOOLTIPS } from "./skillsUi.js";

export { SKILL_DESCRIPTIONS, SKILLS_CONFIG };
export type { SkillComboDef, SkillsConfig } from "./skills.config.js";

export const SKILLS_GLOBAL = SKILLS_CONFIG.global;

export const SINGLE_RUNE_COMBOS: readonly SkillComboDef[] = SKILLS_CONFIG.singleRuneCombos;
export const DUAL_RUNE_COMBOS: readonly SkillComboDef[] = SKILLS_CONFIG.dualRuneCombos;
export const INVOKE_RUNE_COMBOS: readonly SkillComboDef[] = SKILLS_CONFIG.invokeCombos;

export const ALL_SKILL_COMBOS: readonly SkillComboDef[] = [
  ...SINGLE_RUNE_COMBOS,
  ...DUAL_RUNE_COMBOS,
  ...INVOKE_RUNE_COMBOS,
];

export const SKILL_DEF_BY_ID: Readonly<Record<string, SkillComboDef>> = Object.freeze(
  Object.fromEntries(ALL_SKILL_COMBOS.map((c) => [c.id, c])),
);

/** Запись в справочнике комбо (HUD): seq в нижнем регистре, как очередь рун q/w/e. */
export type RuneComboMeta = {
  seq: string;
  skillId: string;
  name: string;
  assetId: string;
  /** 2 — двойное комбо, 3 — Invoke. */
  runeCount: 2 | 3;
};

/** @deprecated Используйте `RuneComboMeta` */
export type InvokeComboMeta = RuneComboMeta;

function comboMetaFromDef(c: SkillComboDef, runeCount: 2 | 3): RuneComboMeta {
  return {
    seq: c.sequence.toLowerCase(),
    skillId: c.id,
    name: c.name,
    assetId: c.asset,
    runeCount,
  };
}

export const DUAL_COMBOS: readonly RuneComboMeta[] = Object.freeze(
  DUAL_RUNE_COMBOS.map((c) => comboMetaFromDef(c, 2)),
);

export const INVOKE_COMBOS: readonly RuneComboMeta[] = Object.freeze(
  INVOKE_RUNE_COMBOS.map((c) => comboMetaFromDef(c, 3)),
);

/** Двойные + Invoke для единого списка (порядок: 2 руны, затем 3). */
export const RUNE_COMBO_SHEET: readonly RuneComboMeta[] = Object.freeze([...DUAL_COMBOS, ...INVOKE_COMBOS]);

/** Ключ двойного комбо: `qw` === `wq` (сортировка букв). */
export const DUAL_SKILL_BY_SORTED_SEQ: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    DUAL_RUNE_COMBOS.map((c) => {
      const sorted = c.sequence.toLowerCase().split("").sort().join("");
      return [sorted, c.id];
    }),
  ),
);

export const DUAL_COMBO_BY_SEQUENCE: Readonly<Record<string, SkillComboDef>> = Object.freeze(
  Object.fromEntries(DUAL_RUNE_COMBOS.map((c) => [c.sequence, c])),
);

const invokeBySeqLower: Record<string, string> = {};
const skillMetaById: Record<string, { name: string; assetId: string }> = {};

for (const c of INVOKE_RUNE_COMBOS) {
  invokeBySeqLower[c.sequence.toLowerCase()] = c.id;
}

for (const c of ALL_SKILL_COMBOS) {
  if (!skillMetaById[c.id]) {
    skillMetaById[c.id] = { name: c.name, assetId: c.asset };
  }
}

/** Ключ — `qqq` (нижний регистр), значение — id скилла. */
export const INVOKE_SKILL_BY_SEQ: Readonly<Record<string, string>> = Object.freeze(invokeBySeqLower);

/** Ключ — `QQQ` (как в `skills.config`). */
export const INVOKE_COMBO_BY_SEQUENCE: Readonly<Record<string, SkillComboDef>> = Object.freeze(
  Object.fromEntries(INVOKE_RUNE_COMBOS.map((c) => [c.sequence, c])),
);

export const INVOKE_SKILL_META_BY_ID: Readonly<Record<string, { name: string; assetId: string }>> =
  Object.freeze(skillMetaById);

const cooldownById: Record<string, number> = {};
for (const c of ALL_SKILL_COMBOS) {
  cooldownById[c.id] = c.cooldownSec;
}

export const SKILL_BASE_COOLDOWN_SEC: Readonly<Record<string, number>> = Object.freeze(cooldownById);

const descById: Record<string, string> = { ...SKILL_DESCRIPTIONS };
for (const c of ALL_SKILL_COMBOS) {
  if (c.desc) descById[c.id] = c.desc;
}
for (const [k, v] of Object.entries(HUD_SKILL_TOOLTIPS)) {
  descById[k] = v;
}

export const SKILL_DESCRIPTION_BY_ID: Readonly<Record<string, string>> = Object.freeze(descById);

export function skillHudTooltip(skillId: string): {
  title: string;
  description: string;
  baseCooldownSec: number;
  assetId?: string;
} {
  const def = SKILL_DEF_BY_ID[skillId];
  const meta = INVOKE_SKILL_META_BY_ID[skillId];
  return {
    title: def?.name ?? meta?.name ?? skillId.replace("skill_", "").replace(/_/g, " "),
    description: def?.desc ?? SKILL_DESCRIPTION_BY_ID[skillId] ?? "",
    baseCooldownSec: def?.cooldownSec ?? SKILL_BASE_COOLDOWN_SEC[skillId] ?? 8,
    assetId: def?.asset ?? meta?.assetId,
  };
}

export function isKnownSkillId(v: unknown): v is string {
  return typeof v === "string" && v in SKILL_DEF_BY_ID;
}
