import "./StartScreen.css";

import { useEffect, useState } from "react";

import { httpOriginFromWsEnv } from "../net/gameSocket";
import { useShellUiStore } from "../stores/shellUiStore";

export function StartScreen() {
  const openModal = useShellUiStore((s) => s.openModal);
  const closeModal = useShellUiStore((s) => s.closeModal);
  const modal = useShellUiStore((s) => s.modal);
  const soundEnabled = useShellUiStore((s) => s.soundEnabled);
  const setSoundEnabled = useShellUiStore((s) => s.setSoundEnabled);
  const setView = useShellUiStore((s) => s.setView);
  const setPlayIntent = useShellUiStore((s) => s.setPlayIntent);
  const [saveAvailable, setSaveAvailable] = useState(false);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, closeModal]);

  useEffect(() => {
    let cancelled = false;
    const url = `${httpOriginFromWsEnv()}/save-status`;
    fetch(url)
      .then((r) => r.json())
      .then((body: { hasSave?: boolean }) => {
        if (!cancelled) setSaveAvailable(!!body?.hasSave);
      })
      .catch(() => {
        if (!cancelled) setSaveAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="start-screen" role="presentation">
      <div className="start-screen__inner">
        <header className="start-screen__brand">
          <div className="start-screen__titleAccent" aria-hidden />
          <p className="start-screen__eyebrow">Выживание · большая карта</p>
          <h1 className="start-screen__heading">
            <span className="start-screen__titleLine">Magic</span>
            <span className="start-screen__titleLine start-screen__titleLine--muted">Roguelike</span>
          </h1>
          <p className="start-screen__tagline">Руны, Invoke и сотни врагов на одной карте</p>
        </header>

        <div className="start-screen__actions">
          {saveAvailable ? (
            <button
              type="button"
              className="start-screen__btn start-screen__btn--secondary"
              onClick={() => {
                setPlayIntent("resume");
                setView("play");
              }}
            >
              Продолжить
            </button>
          ) : null}
          <button
            type="button"
            className="start-screen__btn"
            onClick={() => {
              setPlayIntent("fresh");
              setView("play");
            }}
          >
            Новая игра
          </button>
          <button type="button" className="start-screen__btn start-screen__btn--ghost" onClick={() => openModal("settings")}>
            Настройки
          </button>
        </div>

        <p className="start-screen__devHint">
          Сетевая симуляция: из корня репозитория запустите <code className="start-screen__code">npm run dev</code> (сервер WebSocket{" "}
          <code className="start-screen__code">:3333</code> и Vite-клиент). Без этого после «Новая игра» тик сервера не пойдёт.
        </p>

        <p className="start-screen__hint">
          Прототип сцены: перемещение по плоскости — <strong>ПКМ</strong> по земле (команда на сервер). Для скиллов:{" "}
          <strong>Q/W/E</strong>, Invoke <strong>R</strong>, каст <strong>Пробел</strong>,{" "}
          <strong>Esc</strong> — пауза.
        </p>
      </div>

      <button type="button" className="start-screen__patchLink" onClick={() => openModal("patch")}>
        Патчноут
      </button>

      {modal === "settings" ? (
        <div
          className="start-screen__modalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-settings-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="start-screen__modalPanel">
            <h2 id="start-settings-title" className="start-screen__modalTitle">
              Настройки
            </h2>
            <label className="start-screen__settingsRow">
              <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
              <span>Звуковые эффекты</span>
            </label>
            <p className="start-screen__modalFootnote">Параметры сохраняются в браузере.</p>
            <div className="start-screen__modalActions">
              <button type="button" className="start-screen__modalPrimaryAction" onClick={() => closeModal()}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal === "patch" ? (
        <div
          className="start-screen__modalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-patch-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="start-screen__modalPanel start-screen__modalPanel--scrollable">
            <h2 id="start-patch-title" className="start-screen__modalTitle">
              Патчноут
            </h2>
            <div className="start-screen__modalBody">
              <p>
                <strong>Новый клиент (Vite · React · Three.js)</strong>
              </p>
              <ul>
                <li>Стартовый экран на React с общей элементальной темой.</li>
                <li>Симуляция на сервере по WebSocket; в dev режим показывает тики и пробную команду.</li>
              </ul>
            </div>
            <div className="start-screen__modalActions">
              <button type="button" className="start-screen__modalPrimaryAction" onClick={() => closeModal()}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
