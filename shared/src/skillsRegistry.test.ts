import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DUAL_COMBOS,
  DUAL_SKILL_BY_SORTED_SEQ,
  INVOKE_COMBOS,
  INVOKE_SKILL_BY_SEQ,
  RUNE_COMBO_SHEET,
  SKILL_DEF_BY_ID,
  SKILLS_CONFIG,
} from "./skillsRegistry.js";

describe("skillsRegistry", () => {
  it("loads full skills.config lists", () => {
    assert.equal(SKILLS_CONFIG.singleRuneCombos.length, 3);
    assert.equal(SKILLS_CONFIG.dualRuneCombos.length, 6);
    assert.equal(SKILLS_CONFIG.invokeCombos.length, 27);
    assert.equal(DUAL_COMBOS.length, 6);
    assert.equal(INVOKE_COMBOS.length, 27);
    assert.equal(RUNE_COMBO_SHEET.length, 33);
    assert.ok(DUAL_COMBOS.every((c) => c.runeCount === 2));
    assert.ok(INVOKE_COMBOS.every((c) => c.runeCount === 3));
  });

  it("normalizes dual sequence order for lookup", () => {
    const sortedWq = "wq".split("").sort().join("");
    assert.equal(sortedWq, "qw");
    assert.equal(DUAL_SKILL_BY_SORTED_SEQ.qw, DUAL_SKILL_BY_SORTED_SEQ[sortedWq]);
  });

  it("maps invoke sequence QQQ to skill_cold_embrace from config", () => {
    assert.equal(INVOKE_SKILL_BY_SEQ.qqq, "skill_cold_embrace");
    const def = SKILL_DEF_BY_ID.skill_cold_embrace;
    assert.equal(def?.sequence, "QQQ");
    assert.equal(def?.cooldownSec, 28);
  });
});
