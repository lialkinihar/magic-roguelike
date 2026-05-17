import { create } from "zustand";

const SOUND_KEY = "magic-roguelike-client-sfx";

export type ShellView = "start" | "play";

export type ShellModal = null | "settings" | "patch";

/** Как стартовать сессию после подключения WebSocket. */
export type PlayIntent = "fresh" | "resume";

export type ShellUiState = {
  view: ShellView;
  modal: ShellModal;
  /** Используется при переходе в «Игра»: первое сообщение fresh vs resume. */
  playIntent: PlayIntent;
  soundEnabled: boolean;
  setView: (v: ShellView) => void;
  setPlayIntent: (intent: PlayIntent) => void;
  openModal: (m: Exclude<ShellModal, null>) => void;
  closeModal: () => void;
  setSoundEnabled: (on: boolean) => void;
};

function readSound(): boolean {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    if (v === null) return true;
    return v === "1" || v === "true";
  } catch {
    return true;
  }
}

function writeSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export const useShellUiStore = create<ShellUiState>((set) => ({
  view: "start",
  modal: null,
  playIntent: "fresh",
  soundEnabled: readSound(),
  setView: (view) => set({ view }),
  setPlayIntent: (playIntent) => set({ playIntent }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  setSoundEnabled: (soundEnabled) => {
    writeSound(soundEnabled);
    set({ soundEnabled });
  },
}));
