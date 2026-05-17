import {
  type RuneKey,
  parseServerMessage,
  serializeClientMessage,
  type PlayerCommand,
} from "@magic-roguelike/shared";

import { useGameShellStore } from "../stores/gameShellStore";
import { useShellUiStore } from "../stores/shellUiStore";

export function wsUrlFromEnv(): string {
  const v = import.meta.env.VITE_WS_URL as string | undefined;
  if (v?.trim()) return v.trim();
  if (import.meta.env.DEV) {
    if (typeof window === "undefined") return "ws://127.0.0.1:5173/game-ws";
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/game-ws`;
  }
  return "ws://127.0.0.1:3333";
}

/** HTTP origin того же хоста, что и WebSocket (для GET /save-status). */
export function httpOriginFromWsEnv(): string {
  const v = import.meta.env.VITE_WS_URL as string | undefined;
  if (v?.trim()) {
    const ws = v.trim();
    if (ws.startsWith("wss://")) return `https://${ws.slice(6)}`;
    if (ws.startsWith("ws://")) return `http://${ws.slice(5)}`;
    return "http://127.0.0.1:3333";
  }
  if (import.meta.env.DEV) {
    if (typeof window !== "undefined") return window.location.origin;
    return "http://127.0.0.1:5173";
  }
  return "http://127.0.0.1:3333";
}

export type GameSessionIntent = "fresh" | "resume";

let activeSocket: WebSocket | null = null;

/** Текущий cleanup от последнего connectGameSocket (закрыть сокет и снять активный указатель). */
let stopLatestConnection: (() => void) | null = null;

export function getGameSocket(): WebSocket | null {
  return activeSocket;
}

function wireSocket(ws: WebSocket, intent: GameSessionIntent): void {
  ws.addEventListener("open", () => {
    useGameShellStore.getState().setConnection("live");
    const boot =
      intent === "resume"
        ? ({ type: "resume_save", payload: {} } as const)
        : ({ type: "request_new_game", payload: {} } as const);
    ws.send(serializeClientMessage(boot));
  });

  ws.addEventListener("message", (ev) => {
    const parsed = parseServerMessage(String(ev.data));
    if (!parsed) return;
    if (parsed.type === "welcome") {
      useGameShellStore.getState().setPlayerId(parsed.payload.playerId);
    }
    if (parsed.type === "snapshot") {
      useGameShellStore.getState().setSnapshot(parsed.payload);
    }
  });

  ws.addEventListener("error", () => {
    useGameShellStore.getState().setConnection("error");
    useGameShellStore.getState().setError("Сервер недоступен (WebSocket). Запустите из корня: npm run dev");
  });

  ws.addEventListener("close", () => {
    if (activeSocket === ws) activeSocket = null;
    useGameShellStore.getState().setConnection("offline");
  });
}

/**
 * Одно активное подключение на вкладку. Повторный вызов закрывает предыдущий сокет.
 * Возвращает функцию disconnect.
 */
export function connectGameSocket(opts?: { intent?: GameSessionIntent }): () => void {
  stopLatestConnection?.();
  stopLatestConnection = null;

  const url = wsUrlFromEnv();
  const intent: GameSessionIntent = opts?.intent ?? "fresh";
  const store = useGameShellStore.getState();
  store.setConnection("connecting");
  store.setError(null);

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch (e) {
    store.setConnection("error");
    store.setError(e instanceof Error ? e.message : "WebSocket create failed");
    return () => undefined;
  }

  activeSocket = ws;
  wireSocket(ws, intent);

  const cleanup = () => {
    if (activeSocket === ws) activeSocket = null;
    stopLatestConnection = null;
    ws.close();
  };

  stopLatestConnection = cleanup;
  return cleanup;
}

/** Ручной переподключение из UI (сервер подняли позже). */
export function reconnectGameShell(): void {
  const intent = useShellUiStore.getState().playIntent;
  connectGameSocket({ intent });
}

export function sendPlayerCommand(ws: WebSocket | null, cmd: PlayerCommand): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(serializeClientMessage({ type: "command", payload: cmd }));
}

/** Тест контура симуляции: noop учитывается в snapshot.noopCount на следующих тиках. */
export function sendNoopFromShell(): void {
  const ws = getGameSocket();
  const pid = useGameShellStore.getState().playerId;
  if (!pid) return;
  sendPlayerCommand(ws, { playerId: pid, kind: "noop" });
}

/** Обновляет целевую точку перемещения на сервере (клик по земле). */
export function sendMoveTarget(targetX: number, targetZ: number): void {
  const ws = getGameSocket();
  const pid = useGameShellStore.getState().playerId;
  if (!pid) return;
  sendPlayerCommand(ws, {
    playerId: pid,
    kind: "move",
    data: { targetX, targetZ },
  });
}

/** Перевод комнаты из hub в активный забег. */
export function sendStartRun(): void {
  const ws = getGameSocket();
  const pid = useGameShellStore.getState().playerId;
  if (!pid) return;
  sendPlayerCommand(ws, {
    playerId: pid,
    kind: "start_run",
  });
}

export function sendRuneInput(rune: RuneKey): void {
  const ws = getGameSocket();
  const pid = useGameShellStore.getState().playerId;
  if (!pid) return;
  sendPlayerCommand(ws, {
    playerId: pid,
    kind: "rune_input",
    data: { rune },
  });
}

export function sendInvoke(): void {
  const ws = getGameSocket();
  const pid = useGameShellStore.getState().playerId;
  if (!pid) return;
  sendPlayerCommand(ws, {
    playerId: pid,
    kind: "invoke",
  });
}

export function sendCastInvoked(targetX: number, targetZ: number): void {
  const ws = getGameSocket();
  const pid = useGameShellStore.getState().playerId;
  if (!pid) return;
  sendPlayerCommand(ws, {
    playerId: pid,
    kind: "cast_invoked",
    data: { targetX, targetZ },
  });
}

/** Полная замена очереди рун (до 3), для кликов по пресетам в списке комбо. */
export function sendSetRuneQueue(runes: RuneKey[]): void {
  const ws = getGameSocket();
  const pid = useGameShellStore.getState().playerId;
  if (!pid || runes.length === 0 || runes.length > 3) return;
  sendPlayerCommand(ws, {
    playerId: pid,
    kind: "set_rune_queue",
    data: { runes },
  });
}

/** Пресет двойного комбо: 2 руны в очередь + Invoke (R), каст — Пробел. */
export function sendPresetDualCombo(seqLowerTwo: string): void {
  const runes = seqLowerTwo.split("").filter((c): c is RuneKey => c === "q" || c === "w" || c === "e");
  if (runes.length !== 2) return;
  sendSetRuneQueue(runes);
  sendInvoke();
}

/** Одним жестом: выставить QWE-пресет из справочника и выполнить Invoke (как набрать три руны + R). */
export function sendPresetInvokeCombo(seqLowerThree: string): void {
  const runes = seqLowerThree.split("").filter((c): c is RuneKey => c === "q" || c === "w" || c === "e");
  if (runes.length !== 3) return;
  sendSetRuneQueue(runes);
  sendInvoke();
}

export function sendPurchaseShopOffer(offerId: string): void {
  const ws = getGameSocket();
  const pid = useGameShellStore.getState().playerId;
  if (!pid) return;
  sendPlayerCommand(ws, {
    playerId: pid,
    kind: "purchase_shop_offer",
    data: { offerId },
  });
}
