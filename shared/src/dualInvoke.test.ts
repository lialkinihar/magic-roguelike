import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DUAL_RUNE_SHARED_COOLDOWN_SEC,
  RUN_ACTIVE_DURATION_SEC,
  createInitialState,
  emptyCommandQueue,
  resolveSkillFromRuneQueue,
  stepSim,
} from "./index.js";

const PID = "local";

function runActiveWithRunes(runes: ("q" | "w" | "e")[]): ReturnType<typeof createInitialState> {
  const st = createInitialState([PID]);
  st.phase = "run_active";
  st.artifactActiveRemainingSec = RUN_ACTIVE_DURATION_SEC;
  st.players[PID].runeQueue = [...runes];
  return st;
}

describe("dual invoke", () => {
  it("resolveSkillFromRuneQueue maps 2 runes regardless of order", () => {
    assert.equal(resolveSkillFromRuneQueue(["q", "w"]), "skill_thunderfrost_spear");
    assert.equal(resolveSkillFromRuneQueue(["w", "q"]), "skill_thunderfrost_spear");
    assert.equal(resolveSkillFromRuneQueue(["q", "q"]), "skill_frost_spear");
  });

  it("invoke with 2 runes arms dual skill", () => {
    let st = runActiveWithRunes(["w", "q"]);
    st = stepSim(st, 0.05, [{ playerId: PID, kind: "invoke" }]);
    assert.equal(st.players[PID].invokedSkillId, "skill_thunderfrost_spear");
    assert.deepEqual(st.players[PID].runeQueue, []);
  });

  it("cast dual applies shared cooldown, not per-skill cd", () => {
    let st = runActiveWithRunes(["q", "e"]);
    st = stepSim(st, 0.05, [{ playerId: PID, kind: "invoke" }]);
    st = stepSim(st, 0.05, [
      { playerId: PID, kind: "cast_invoked", data: { targetX: 12, targetZ: 4 } },
    ]);
    const pl = st.players[PID];
    assert.equal(pl.invokedSkillId, null);
    assert.ok(pl.dualSharedCooldownSec > DUAL_RUNE_SHARED_COOLDOWN_SEC - 0.2);
    assert.ok((pl.skillCooldownsSec.skill_cryo_meteor ?? 0) < 0.01);
  });

  it("blocks dual cast while shared cooldown active", () => {
    let st = runActiveWithRunes(["q", "q"]);
    st.players[PID].dualSharedCooldownSec = 3;
    st = stepSim(st, 0.05, [{ playerId: PID, kind: "invoke" }]);
    st = stepSim(st, 0.05, [
      { playerId: PID, kind: "cast_invoked", data: { targetX: 0, targetZ: 0 } },
    ]);
    assert.equal(st.players[PID].invokedSkillId, "skill_frost_spear");
    assert.ok(st.players[PID].dualSharedCooldownSec > 2.9);
  });

  it("invoke still requires exactly 2 or 3 runes", () => {
    let st = runActiveWithRunes(["q"]);
    st = stepSim(st, 0.05, [{ playerId: PID, kind: "invoke" }]);
    assert.equal(st.players[PID].invokedSkillId, null);
    assert.deepEqual(st.players[PID].runeQueue, ["q"]);
  });

  it("decays dual shared cooldown over time", () => {
    let st = createInitialState([PID]);
    st.phase = "run_active";
    st.artifactActiveRemainingSec = RUN_ACTIVE_DURATION_SEC;
    st.players[PID].dualSharedCooldownSec = 2;
    st = stepSim(st, 0.5, emptyCommandQueue());
    assert.ok(st.players[PID].dualSharedCooldownSec < 1.6);
  });
});
