import { create } from "zustand";

import type { GameSnapshot } from "@magic-roguelike/shared";

export type ConnectionState = "offline" | "connecting" | "live" | "error";

export type GameShellState = {
  connection: ConnectionState;
  lastError: string | null;
  playerId: string | null;
  snapshot: GameSnapshot | null;
  /** Краткая подсказка боя/фазы (клиентская, сбрасывается по таймеру). */
  combatHudHint: string | null;
  setConnection: (c: ConnectionState) => void;
  setError: (msg: string | null) => void;
  setPlayerId: (id: string | null) => void;
  setSnapshot: (s: GameSnapshot | null) => void;
  setCombatHudHint: (msg: string | null) => void;
  flashCombatHudHint: (msg: string, durationMs?: number) => void;
};

let combatHintTimer: ReturnType<typeof setTimeout> | null = null;

export const useGameShellStore = create<GameShellState>((set, get) => ({
  connection: "offline",
  lastError: null,
  playerId: null,
  snapshot: null,
  combatHudHint: null,
  setConnection: (connection) => set({ connection }),
  setError: (lastError) => set({ lastError }),
  setPlayerId: (playerId) => set({ playerId }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setCombatHudHint: (combatHudHint) => set({ combatHudHint }),
  flashCombatHudHint: (msg, durationMs = 2600) => {
    if (combatHintTimer != null) clearTimeout(combatHintTimer);
    set({ combatHudHint: msg });
    combatHintTimer = setTimeout(() => {
      combatHintTimer = null;
      if (get().combatHudHint === msg) set({ combatHudHint: null });
    }, durationMs);
  },
}));
