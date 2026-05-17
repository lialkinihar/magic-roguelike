import { useEffect } from "react";

import "./App.css";
import { connectGameSocket } from "./net/gameSocket";
import { GameCanvas } from "./render/GameCanvas";
import { useGameShellStore } from "./stores/gameShellStore";
import { useShellUiStore } from "./stores/shellUiStore";
import { GameHudOverlay } from "./ui/gameHud/GameHudOverlay";
import { StartScreen } from "./ui/StartScreen";

function App() {
  const view = useShellUiStore((s) => s.view);
  const setView = useShellUiStore((s) => s.setView);
  const setPlayIntent = useShellUiStore((s) => s.setPlayIntent);
  const playIntent = useShellUiStore((s) => s.playIntent);

  useEffect(() => {
    if (view !== "play") return undefined;

    const disconnect = connectGameSocket({ intent: playIntent });

    return () => {
      disconnect();
      const s = useGameShellStore.getState();
      s.setSnapshot(null);
      s.setPlayerId(null);
      s.setConnection("offline");
      s.setError(null);
    };
  }, [view, playIntent]);

  if (view === "start") {
    return <StartScreen />;
  }

  return (
    <div className="app-root">
      <div className="app-play" aria-label="Игровое поле">
        <div className="app-play__viewport">
          <GameCanvas movementEnabled={view === "play"} />
        </div>
        <GameHudOverlay
          onMainMenu={() => {
            setPlayIntent("fresh");
            setView("start");
          }}
        />
      </div>
    </div>
  );
}

export default App;
