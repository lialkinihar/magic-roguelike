import assert from "node:assert/strict";
import test from "node:test";

import {
  GAME_SAVE_FORMAT_VERSION,
  createInitialState,
  deserializeGameStateFromSave,
  serializeGameStateForSave,
} from "./index.js";

test("serialize / deserialize roundtrip", () => {
  const st = createInitialState(["p1"]);
  st.coins = 42;
  st.phase = "run_defeat";
  st.runEndReason = "defeat_mechanism";
  const raw = serializeGameStateForSave(st);
  const back = deserializeGameStateFromSave(raw);
  assert.ok(back);
  assert.equal(back!.coins, 42);
  assert.equal(back!.players.p1?.id, "p1");
  assert.equal(back!.players.p1?.hp, st.players.p1?.hp);
  assert.equal(back!.runEndReason, "defeat_mechanism");
});

test("deserialize format v1 adds runEndReason null", () => {
  const st = createInitialState(["p1"]);
  const legacy = JSON.parse(JSON.stringify(st)) as Record<string, unknown>;
  delete legacy.runEndReason;
  const raw = JSON.stringify({ formatVersion: 1, state: legacy });
  const back = deserializeGameStateFromSave(raw);
  assert.ok(back);
  assert.equal(back!.runEndReason, null);
});

test("serialized envelope uses current format version", () => {
  const st = createInitialState(["p1"]);
  const env = JSON.parse(serializeGameStateForSave(st)) as { formatVersion: number };
  assert.equal(env.formatVersion, GAME_SAVE_FORMAT_VERSION);
});

test("reject unknown format version", () => {
  const bad = JSON.stringify({
    formatVersion: 999999,
    state: createInitialState(["p1"]),
  });
  assert.equal(deserializeGameStateFromSave(bad), null);
});
