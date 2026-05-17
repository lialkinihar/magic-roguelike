/**
 * Авторитетный игровой сервер: WebSocket + фиксированный тик симуляции из @magic-roguelike/shared.
 */
import http from "node:http";
import process from "node:process";

import {
  HUB_PLAYER_Z,
  PLAYER_MAX_HP,
  createInitialState,
  deserializeGameStateFromSave,
  emptyCommandQueue,
  normalizeLoadedGameState,
  parseClientMessage,
  type ClientToServerMessage,
  serializeGameStateForSave,
  serializeServerMessage,
  stepSim,
  type GameState,
  type PlayerBody,
  type PlayerCommand,
  stateToSnapshot,
} from "@magic-roguelike/shared";
import type { RawData } from "ws";
import { WebSocket, WebSocketServer } from "ws";

import { RoomPersistence } from "./persistRoom.js";

const GAME_WS_PORT = Number(process.env.GAME_WS_PORT ?? "3333");
const TICK_HZ = 20;
const DT = 1 / TICK_HZ;

function reconcileResumeState(loaded: GameState, socketIds: string[]): GameState {
  const sortedSockets = [...socketIds].sort();
  const templates = Object.keys(loaded.players)
    .sort()
    .map((id) => loaded.players[id])
    .filter((p): p is PlayerBody => !!p);
  const players: Record<string, PlayerBody> = {};
  for (let i = 0; i < sortedSockets.length; i++) {
    const sockId = sortedSockets[i]!;
    const tmpl = templates[i] ?? templates[0];
    if (tmpl) {
      players[sockId] = { ...tmpl, id: sockId, connected: true };
    } else {
      players[sockId] = {
        id: sockId,
        connected: true,
        x: 0,
        z: HUB_PLAYER_Z,
        hp: PLAYER_MAX_HP,
        maxHp: PLAYER_MAX_HP,
        moveTarget: null,
        skillCooldownsSec: {},
        runeQueue: [],
        invokedSkillId: null,
      };
    }
  }
  return normalizeLoadedGameState({ ...loaded, players });
}

class GameRoom {
  state: GameState;
  pendingCommands: PlayerCommand[] = [];
  clientIds = new WeakMap<WebSocket, string>();
  sockets = new Map<string, WebSocket>();

  constructor() {
    this.state = createInitialState([]);
  }

  enqueueCommand(cmd: PlayerCommand) {
    this.pendingCommands.push(cmd);
  }

  broadcastSnapshot() {
    const snapshot = stateToSnapshot(this.state);
    const msg = serializeServerMessage({ type: "snapshot", payload: snapshot });
    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }

  tickBroadcast(persist: RoomPersistence) {
    const cmds = this.pendingCommands;
    this.pendingCommands = emptyCommandQueue();
    const phaseBefore = this.state.phase;
    this.state = stepSim(this.state, DT, cmds);

    const serialized = () => serializeGameStateForSave(this.state);
    if (phaseBefore !== this.state.phase) {
      persist.saveImmediate(serialized());
    } else {
      persist.scheduleSave(serialized);
    }

    this.broadcastSnapshot();
  }

  applyFreshWorld() {
    const ids = [...this.sockets.keys()].sort();
    this.state = createInitialState(ids.length ? ids : ["p1"]);
    for (const id of Object.keys(this.state.players)) {
      const pl = this.state.players[id];
      if (pl) pl.connected = this.sockets.has(id);
    }
  }

  applyResumeFromDisk(persist: RoomPersistence): boolean {
    const raw = persist.loadCheckpointRaw();
    if (!raw) return false;
    const loaded = deserializeGameStateFromSave(raw);
    if (!loaded) return false;
    const ids = [...this.sockets.keys()].sort();
    this.state = reconcileResumeState(loaded, ids.length ? ids : Object.keys(loaded.players).sort());
    for (const id of Object.keys(this.state.players)) {
      const pl = this.state.players[id];
      if (pl) pl.connected = this.sockets.has(id);
    }
    return true;
  }

  addSocket(ws: WebSocket, playerId: string) {
    this.clientIds.set(ws, playerId);
    this.sockets.set(playerId, ws);
    this.state.players[playerId] = {
      id: playerId,
      connected: true,
      x: 0,
      z: HUB_PLAYER_Z,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      moveTarget: null,
      skillCooldownsSec: {},
      runeQueue: [],
      invokedSkillId: null,
    };
    ws.send(serializeServerMessage({ type: "welcome", payload: { playerId } }));
    ws.send(serializeServerMessage({ type: "snapshot", payload: stateToSnapshot(this.state) }));
  }

  removeSocket(ws: WebSocket) {
    const id = this.clientIds.get(ws);
    this.clientIds.delete(ws);
    if (id) {
      this.sockets.delete(id);
      const pl = this.state.players[id];
      if (pl) pl.connected = false;
    }
  }
}

const persist = new RoomPersistence(RoomPersistence.defaultDbPath());
const ROOM = new GameRoom();
let playerSerial = 0;

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const httpServer = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET" && req.url?.split("?")[0] === "/save-status") {
    let hasSave = false;
    const raw = persist.loadCheckpointRaw();
    if (raw) {
      hasSave = deserializeGameStateFromSave(raw) !== null;
    }
    const body = JSON.stringify({ hasSave });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() });
    res.end(body);
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("magic-roguelike game server (WebSocket). GET /save-status — наличие сохранения.");
});

const wss = new WebSocketServer({ server: httpServer });

function routeMessage(ws: WebSocket, parsed: ClientToServerMessage | null, raw: RawData) {
  if (!parsed) {
    console.warn("[server] bad message:", String(raw).slice(0, 120));
    return;
  }
  if (parsed.type === "ping") {
    ws.send(serializeServerMessage({ type: "pong" }));
    return;
  }
  if (parsed.type === "request_new_game") {
    ROOM.applyFreshWorld();
    persist.saveImmediate(serializeGameStateForSave(ROOM.state));
    ROOM.broadcastSnapshot();
    return;
  }
  if (parsed.type === "resume_save") {
    const ok = ROOM.applyResumeFromDisk(persist);
    if (!ok) {
      ROOM.applyFreshWorld();
      persist.saveImmediate(serializeGameStateForSave(ROOM.state));
    }
    ROOM.broadcastSnapshot();
    return;
  }
  if (parsed.type === "command") {
    const playerId = ROOM.clientIds.get(ws);
    if (!playerId) return;
    ROOM.enqueueCommand({ ...parsed.payload, playerId });
  }
}

wss.on("connection", (ws) => {
  playerSerial += 1;
  const playerId = `p${playerSerial}`;
  ROOM.addSocket(ws, playerId);

  ws.on("message", (raw: RawData) => {
    const text =
      typeof raw === "string" ? raw : raw instanceof Buffer ? raw.toString("utf8") : "";
    routeMessage(ws, parseClientMessage(text), raw);
  });

  ws.on("close", () => {
    ROOM.removeSocket(ws);
  });
});

setInterval(() => {
  ROOM.tickBroadcast(persist);
}, DT * 1000);

function shutdown() {
  try {
    persist.saveImmediate(serializeGameStateForSave(ROOM.state));
  } catch (e) {
    console.warn("[server] persist flush:", e);
  }
  persist.close();
  httpServer.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

httpServer.listen(GAME_WS_PORT, () => {
  console.info(`[server] listening ws://localhost:${GAME_WS_PORT} · HTTP save-status same port`);
});
