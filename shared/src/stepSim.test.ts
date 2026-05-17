import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAYER_MAX_HP,
  RUN_ACTIVE_DURATION_SEC,
  createInitialState,
  emptyCommandQueue,
  stepSim,
} from "./index.js";

test("stepSim: mechanism destroyed sets defeat_mechanism", () => {
  const st = createInitialState(["p1"]);
  st.phase = "run_active";
  st.artifactActiveRemainingSec = RUN_ACTIVE_DURATION_SEC * 0.5;
  st.mechanism.hp = 0;
  const next = stepSim(st, 0.05, emptyCommandQueue());
  assert.equal(next.phase, "run_defeat");
  assert.equal(next.runEndReason, "defeat_mechanism");
});

test("stepSim: no living players sets defeat_players", () => {
  const st = createInitialState(["p1"]);
  st.phase = "run_active";
  st.artifactActiveRemainingSec = 40;
  const pl = st.players.p1!;
  pl.hp = 0;
  const next = stepSim(st, 0.05, emptyCommandQueue());
  assert.equal(next.phase, "run_defeat");
  assert.equal(next.runEndReason, "defeat_players");
});

test("stepSim: timer expiry sets victory_timer", () => {
  const st = createInitialState(["p1"]);
  st.phase = "run_active";
  st.artifactActiveRemainingSec = 0;
  st.mechanism.hp = st.mechanism.maxHp;
  const next = stepSim(st, 0.05, emptyCommandQueue());
  assert.equal(next.phase, "run_victory");
  assert.equal(next.runEndReason, "victory_timer");
});

test("stepSim: defeat prioritizes mechanism over empty players list edge", () => {
  const st = createInitialState(["p1"]);
  st.phase = "run_active";
  st.artifactActiveRemainingSec = 30;
  st.mechanism.hp = 0;
  const pl = st.players.p1!;
  pl.hp = 0;
  const next = stepSim(st, 0.05, emptyCommandQueue());
  assert.equal(next.runEndReason, "defeat_mechanism");
});

test("stepSim: run_end phases preserve runEndReason", () => {
  const st = createInitialState(["p1"]);
  st.phase = "run_victory";
  st.phaseCooldownSec = 1;
  st.runEndReason = "victory_timer";
  st.artifactActiveRemainingSec = 0;
  const next = stepSim(st, 0.05, emptyCommandQueue());
  assert.equal(next.phase, "run_victory");
  assert.equal(next.runEndReason, "victory_timer");
});

test("stepSim: hub reset clears runEndReason after cooldown", () => {
  let st = createInitialState(["p1"]);
  st.phase = "run_victory";
  st.phaseCooldownSec = 0.02;
  st.runEndReason = "victory_timer";
  st = stepSim(st, 0.05, emptyCommandQueue());
  assert.equal(st.phase, "hub");
  assert.equal(st.runEndReason, null);
  assert.equal(st.players.p1?.hp, PLAYER_MAX_HP);
});
