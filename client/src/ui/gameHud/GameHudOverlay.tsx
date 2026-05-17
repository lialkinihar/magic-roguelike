import "./gameHud.css";

import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_ARTIFACT_PASSIVES,
  DEFAULT_ARTIFACT_SLOTS,
  DUAL_COMBOS,
  DUAL_RUNE_SHARED_COOLDOWN_SEC,
  INVOKE_COMBOS,
  isDualSkillId,
  MECHANISM_MAX_HP,
  RUN_ACTIVE_DURATION_SEC,
  INVOKE_SKILL_META_BY_ID,
  SKILL_DESCRIPTION_BY_ID,
  skillHudTooltip,
  type RuneComboMeta,
  type RuneKey,
} from "@magic-roguelike/shared";

import { hudCastAimXZ } from "../../game/hudCastAimXZ";
import {
  reconnectGameShell,
  sendCastInvoked,
  sendInvoke,
  sendNoopFromShell,
  sendPresetDualCombo,
  sendPresetInvokeCombo,
  sendPurchaseShopOffer,
  sendRuneInput,
  sendStartRun,
  wsUrlFromEnv,
} from "../../net/gameSocket";
import { useGameShellStore } from "../../stores/gameShellStore";
import { AtlasIconMount } from "../../visuals/AtlasIconMount";
import { cn } from "../../lib/cn";
import { MAIN_KEY_LABELS, MAIN_SLOT_LABELS, MAIN_SLOT_VISUAL_IDS, SHOP_OFFERS } from "./constants";
import type { HudBarStyle } from "./barVars";
import { HudSkillTooltip } from "./HudSkillTooltip";
import { RuneSeqIcons } from "./RuneSeqIcons";
import { ShopOfferRow } from "./ShopOfferRow";

function recentRuneVisualId(rune: "q" | "w" | "e"): string {
  if (rune === "q") return "game_combo_rune_frost";
  if (rune === "w") return "game_combo_rune_lightning";
  return "game_combo_rune_fire";
}

function sortedRuneKeys(runes: readonly RuneKey[]): string {
  return [...runes].sort().join("");
}

function runeQueueMatchesCombo(queue: readonly RuneKey[], combo: RuneComboMeta): boolean {
  if (queue.length !== combo.runeCount) return false;
  if (combo.runeCount === 2) {
    return sortedRuneKeys(queue) === sortedRuneKeys(combo.seq.split("") as RuneKey[]);
  }
  return queue.join("") === combo.seq;
}

export type GameHudOverlayProps = {
  onMainMenu: () => void;
};

/**
 * Полноэкранный игровой HUD: собственная разметка и стили (gameHud.css), иконки из атласа репозитория.
 */
export function GameHudOverlay({ onMainMenu }: GameHudOverlayProps) {
  const [shopOpen, setShopOpen] = useState(false);
  const [combosOpen, setCombosOpen] = useState(false);

  const connection = useGameShellStore((s) => s.connection);
  const snapshot = useGameShellStore((s) => s.snapshot);
  const playerId = useGameShellStore((s) => s.playerId);
  const netError = useGameShellStore((s) => s.lastError);
  const combatHudHint = useGameShellStore((s) => s.combatHudHint);

  const connectionLabel =
    connection === "live"
      ? "Сервер"
      : connection === "connecting"
        ? "Подключение…"
        : connection === "error"
          ? "Ошибка"
          : "Нет связи";

  const wsHint = wsUrlFromEnv();

  const openShop = useCallback(() => setShopOpen(true), []);
  const closeShop = useCallback(() => setShopOpen(false), []);

  const canSendNoop = connection === "live" && !!playerId;
  const simTimeLabel = snapshot ? `${snapshot.timeSec.toFixed(1)} с` : "… с";

  const heroPos =
    playerId && snapshot ? snapshot.players.find((p) => p.id === playerId) : undefined;
  const posLabel = heroPos ? `x ${heroPos.x.toFixed(2)} · z ${heroPos.z.toFixed(2)}` : "pos —";
  const runeSeq = (heroPos?.runeQueue ?? []).map((r) => r.toUpperCase()).join("");
  const invokedMeta = heroPos?.invokedSkillId ? INVOKE_SKILL_META_BY_ID[heroPos.invokedSkillId] : undefined;
  const invokedTip = heroPos?.invokedSkillId ? skillHudTooltip(heroPos.invokedSkillId) : null;
  const invokeLabel = invokedMeta?.name ?? (heroPos?.invokedSkillId ? heroPos.invokedSkillId.replace("skill_", "").replaceAll("_", " ") : "not invoked");
  const phase = snapshot?.phase ?? "hub";
  const canStartRun = connection === "live" && phase === "hub";
  const canUseSkills = connection === "live" && phase === "run_active" && !!playerId;
  const canShop = connection === "live" && phase === "hub" && !!playerId;
  const ultArmed = !!(canUseSkills && heroPos?.invokedSkillId);
  const dualSharedCdLeft = heroPos?.dualSharedCooldownSec ?? 0;
  const cooldownStrip = useMemo(() => {
    const rows: [string, number][] = [];
    if (dualSharedCdLeft > 0.015) {
      rows.push(["__dual_shared__", dualSharedCdLeft]);
    }
    if (heroPos?.skillCooldownsSec) {
      for (const [skillId, left] of Object.entries(heroPos.skillCooldownsSec)) {
        if (typeof left === "number" && left > 0.015) rows.push([skillId, left]);
      }
    }
    return rows.sort(([a], [b]) => a.localeCompare(b));
  }, [heroPos?.skillCooldownsSec, dualSharedCdLeft]);

  const hpFill = heroPos ? heroPos.hp / Math.max(1, heroPos.maxHp) : 0.72;
  const hpStyle: HudBarStyle = { "--hp-fill": hpFill };
  const armorStyle: HudBarStyle = { "--armor-fill": 0 };
  const runProgress =
    snapshot && phase === "run_active"
      ? Math.max(0, Math.min(1, 1 - snapshot.artifactActiveRemainingSec / RUN_ACTIVE_DURATION_SEC))
      : 0;
  const xpStyle: HudBarStyle = { "--xp-fill": runProgress };
  const mechMax = snapshot?.mechanism?.maxHp ?? MECHANISM_MAX_HP;
  const mechFill = snapshot?.mechanism ? snapshot.mechanism.hp / Math.max(1, mechMax) : 1;
  const mechStyle: HudBarStyle = { "--mech-fill": mechFill };
  const coinsTotal = snapshot?.coins ?? 0;

  const artifactSlots = snapshot?.artifactSlots ?? DEFAULT_ARTIFACT_SLOTS;
  const artifactPassives = snapshot?.artifactPassives ?? DEFAULT_ARTIFACT_PASSIVES;

  const runEndOverlay =
    phase === "run_victory" || phase === "run_defeat" ? (
      <div className="game-hud__runEndOverlay" role="status" aria-live="assertive">
        <div className="game-hud__runEndCard">
          <h2 className="game-hud__runEndTitle">{phase === "run_victory" ? "Победа" : "Поражение"}</h2>
          <p className="game-hud__runEndSub">
            {phase === "run_victory"
              ? "Таймер артефакта истёк — защита успешна."
              : snapshot?.runEndReason === "defeat_mechanism"
                ? "Механизм уничтожен."
                : snapshot?.runEndReason === "defeat_players"
                  ? "Все герои погибли."
                  : "Забег завершён."}
          </p>
        </div>
      </div>
    ) : null;

  return (
    <div className="game-hud" role="application" aria-label="Игровой интерфейс">
      <div className="game-hud__coinBadge" aria-live="polite">
        <span className="game-hud__coinIconSlot">
          <AtlasIconMount assetId="game_coin" className="visual-icon hud-inline-svg" />
        </span>
        <span>{coinsTotal}</span>
      </div>

      <div className="game-hud__upgradesRail" aria-label="Купленные улучшения" />

      <div className="game-hud__cornerActions">
        <button type="button" className="game-hud__iconButton" aria-label="Открыть магазин" onClick={openShop}>
          <AtlasIconMount assetId="app_shop_button" className="visual-icon visual-icon--corner-btn" />
        </button>
        <button type="button" className="game-hud__iconButton" aria-label="Выйти в главное меню" onClick={onMainMenu}>
          <AtlasIconMount assetId="app_menu_button" className="visual-icon visual-icon--corner-btn" />
        </button>
      </div>

      <div className="game-hud__topHud">
        <div className="game-hud__barTrack game-hud__hpTrack">
          <div className="game-hud__hpFill" style={hpStyle} />
          <div className="game-hud__armorFill" aria-hidden style={armorStyle} />
          <span className="game-hud__hpCaption">
            {heroPos ? `${Math.round(heroPos.hp)} / ${Math.round(heroPos.maxHp)}` : "72 / 100"}
          </span>
          <span className="game-hud__armorCaption" data-visible="false">
            <span className="game-hud__coinIconSlot" />
            <span>0</span>
          </span>
        </div>

        <div
          className="game-hud__barTrack game-hud__mechTrack"
          aria-label="Прочность механизма"
          data-visible={phase === "run_active" || phase === "run_victory" || phase === "run_defeat" ? "true" : "false"}
        >
          <div className="game-hud__mechFill" style={mechStyle} />
          <span className="game-hud__mechCaption">
            Механизм {snapshot?.mechanism ? `${Math.round(snapshot.mechanism.hp)} / ${Math.round(mechMax)}` : "—"}
          </span>
        </div>

        <div className="game-hud__barTrack game-hud__xpTrack" aria-label="Прогресс активной фазы артефакта">
          <div className="game-hud__xpFill" style={xpStyle} />
          <span className="game-hud__bossChip game-hud__bossChip--mid" aria-hidden>
            Босс
          </span>
          <span className="game-hud__bossChip game-hud__bossChip--end" aria-hidden>
            Босс
          </span>
        </div>

        <div className="game-hud__statsRow">
          <span>
            Фаза:{" "}
            {phase === "hub"
              ? "Хаб"
              : phase === "run_active"
                ? "Забег"
                : phase === "run_victory"
                  ? "Победа"
                  : "Поражение"}
          </span>
          <span>Волна: {snapshot?.wave ?? 0}</span>
          <span>Мобов: {snapshot?.monsters?.length ?? 0}</span>
          <span>
            Таймер:{" "}
            {phase === "run_active" ? `${(snapshot?.artifactActiveRemainingSec ?? 0).toFixed(1)}` : "—"}
          </span>
        </div>

        <div className="game-hud__simStrip" aria-live="polite" aria-label="Состояние симуляции с сервера">
          <span
            className={cn("game-hud__simLed", `game-hud__simLed--${connection}`)}
            aria-hidden
            title={`${connection} · ${wsHint}`}
          />
          <span className={cn("game-hud__simStatus", connection !== "live" && "game-hud__simStatus--warn")}>
            {connectionLabel}
          </span>
          <span className="game-hud__simSep" aria-hidden>
            │
          </span>
          <span className="game-hud__simMetric">тик {snapshot?.tick ?? "—"}</span>
          <span className="game-hud__simMetric">{simTimeLabel}</span>
          <span className="game-hud__simMetric">noop {snapshot?.noopCount ?? "—"}</span>
          <span className="game-hud__simMetric game-hud__simMetric--muted">{posLabel}</span>
          <span className="game-hud__simMetric game-hud__simMetric--muted">
            phase {phase}
          </span>
          {phase === "hub" && (
            <button
              type="button"
              className="game-hud__simStartBtn"
              disabled={!canStartRun}
              onClick={() => sendStartRun()}
              title="Запустить активную фазу артефакта"
            >
              Старт
            </button>
          )}
          {(connection === "offline" || connection === "error") && (
            <button type="button" className="game-hud__simReconnectBtn" onClick={() => reconnectGameShell()} title={`Пробовать снова: ${wsHint}`}>
              Повторить
            </button>
          )}
          <button
            type="button"
            className="game-hud__simNoopBtn"
            disabled={!canSendNoop}
            title={canSendNoop ? "Отправить тестовую команду на сервер" : "Нужно соединение с сервером (npm run dev в корне)"}
            onClick={() => sendNoopFromShell()}
          >
            noop
          </button>
        </div>
        {connection !== "live" ? (
          <p className="game-hud__simExplain" role="status">
            {connection === "connecting"
              ? `Подключение к ${wsHint}…`
              : connection === "error"
                ? (netError ?? "Ошибка WebSocket.")
                : (netError ??
                  `Сервер симуляции не запущен. В корне проекта выполните: npm run dev (WebSocket обычно ${wsHint}; адрес задаётся VITE_WS_URL в client/.env.local при необходимости).`)}
          </p>
        ) : null}

        <div className="game-hud__buffs" aria-live="polite" aria-label="Активные эффекты" />
      </div>

      {runEndOverlay}

      <div className="game-hud__toastRail" aria-live="polite" aria-atomic="true" />

      <div className="game-hud__combatHintRail" aria-live="polite">
        {combatHudHint ? (
          <p className="game-hud__combatHint" role="status">
            {combatHudHint}
          </p>
        ) : null}
        {connection === "live" && phase === "hub" ? (
          <p className="game-hud__phaseHint">Фаза: хаб — нажмите «Старт», чтобы начать забег (движение ПКМ и скиллы только в бою).</p>
        ) : null}
      </div>

      <div className="game-hud__skillDock">
        <div className="game-hud__skillDockInner">
          <div className="game-hud__artifactColumn" aria-label="Артефакты из снимка сервера">
            {artifactSlots.map((slot, i) =>
              slot ? (
                <HudSkillTooltip
                  key={`${slot.id}-${i}`}
                  title={slot.name}
                  lines={["Активный артефакт (отображение из snapshot; модификаторы — позже)."]}
                >
                  <div className="game-hud__artifactTile" role="img" aria-label={`${slot.name}, слот ${i + 1}`}>
                    <AtlasIconMount assetId={slot.assetId} className="visual-icon visual-icon--artifact" />
                  </div>
                </HudSkillTooltip>
              ) : (
                <div
                  key={`empty-${i}`}
                  className="game-hud__artifactTile game-hud__artifactTile--empty"
                  aria-label={`Пустой слот артефакта ${i + 1}`}
                >
                  <span className="game-hud__artifactNum">{i + 1}</span>
                </div>
              ),
            )}
            {artifactPassives.length > 0 ? (
              <div className="game-hud__artifactPassives" aria-label="Пассивные артефакты">
                {artifactPassives.map((p) => (
                  <HudSkillTooltip
                    key={p.id}
                    title={p.name}
                    lines={["Пассивный артефакт (только отображение в MVP)."]}
                  >
                    <span className="game-hud__passiveChip" role="img" aria-label={p.name}>
                      <AtlasIconMount assetId={p.assetId} className="visual-icon visual-icon--passive" />
                    </span>
                  </HudSkillTooltip>
                ))}
              </div>
            ) : null}
          </div>

          <div className="game-hud__skillDockCore">
            <div
              className={cn("game-hud__invokeCooldownRow", cooldownStrip.length > 0 && "game-hud__invokeCooldownRow--active")}
              aria-hidden={cooldownStrip.length === 0}
            >
              <div className="game-hud__invokeCooldownRowInner" role="list" aria-label="Перезарядка заклинаний">
                {cooldownStrip.map(([skillId, left]) => {
                  const tip = skillHudTooltip(skillId);
                  const icon =
                    skillId === "__dual_shared__"
                      ? "game_skill_duo_qw"
                      : tip.assetId ?? "game_skill_invoke";
                  const title =
                    skillId === "__dual_shared__" ? "Общий КД дуо" : tip.title;
                  return (
                    <span key={skillId} className="game-hud__invokeCooldownItem" role="listitem" title={title}>
                      <span className="game-hud__invokeCdIcon" aria-hidden>
                        <AtlasIconMount assetId={icon} className="visual-icon visual-icon--skill-main" />
                      </span>
                      <span className="game-hud__invokeCdBadge">{left.toFixed(1)}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="game-hud__skillPlate">
          <div className="game-hud__ultSlotWrap">
            <HudSkillTooltip
              title={invokedTip?.title ?? "Каст (Пробел)"}
              lines={
                invokedTip
                  ? [invokedTip.description]
                  : [
                      "Наберите 2 или 3 руны (Q/W/E) и нажмите Invoke (R). Каст — в точку прицела на земле (Пробел).",
                    ]
              }
              footer={
                invokedTip
                  ? heroPos?.invokedSkillId && isDualSkillId(heroPos.invokedSkillId)
                    ? `После каста — общий КД дуо ${DUAL_RUNE_SHARED_COOLDOWN_SEC.toFixed(1)} с.`
                    : `После успешного каста симуляция применит КД порядка ${invokedTip.baseCooldownSec.toFixed(1)} с.`
                  : undefined
              }
            >
              <button
                type="button"
                className={cn(
                  "game-hud__ultButton",
                  !heroPos?.invokedSkillId && "game-hud__ultButton--empty",
                  ultArmed && "game-hud__ultButton--enabled",
                )}
                disabled={!ultArmed}
                onClick={() => {
                  if (!ultArmed) return;
                  sendCastInvoked(hudCastAimXZ.x, hudCastAimXZ.z);
                }}
              >
                <span className="game-hud__ultEmoji" aria-hidden>
                  {invokedMeta ? (
                    <AtlasIconMount assetId={invokedMeta.assetId} className="visual-icon visual-icon--skill-main" />
                  ) : (
                    "—"
                  )}
                </span>
                <span className="game-hud__keycap">Пробел</span>
                <span className="game-hud__slotTitle">{invokedMeta?.name ?? "Пусто"}</span>
              </button>
            </HudSkillTooltip>
          </div>

          <div className="game-hud__recentRow" aria-live="polite" aria-label="Последние навыки">
            {(heroPos?.runeQueue ?? []).map((rune, idx) => (
              <span key={`${rune}-${idx}`} className="game-hud__recentOrb" aria-hidden>
                <AtlasIconMount
                  assetId={recentRuneVisualId(rune)}
                  className="visual-icon visual-icon--skill-recent"
                />
              </span>
            ))}
          </div>

          <div className="game-hud__mainSlots">
            {MAIN_SLOT_VISUAL_IDS.map((vid, i) => {
              const runeKey: RuneKey | null = i === 0 ? "q" : i === 1 ? "w" : i === 2 ? "e" : null;
              const runeLine =
                runeKey === "q"
                  ? SKILL_DESCRIPTION_BY_ID.RUNE_TOOLTIP_Q
                  : runeKey === "w"
                    ? SKILL_DESCRIPTION_BY_ID.RUNE_TOOLTIP_W
                    : runeKey === "e"
                      ? SKILL_DESCRIPTION_BY_ID.RUNE_TOOLTIP_E
                      : null;
              const slotBody =
                runeLine != null && runeKey != null
                  ? (() => {
                      const rk: RuneKey = runeKey;
                      return {
                        tipTitle: MAIN_SLOT_LABELS[i],
                        lines: [runeLine],
                        footer: "Очередь 2 или 3 рун, затем Invoke (R).",
                        onActivate: () => {
                          if (canUseSkills) sendRuneInput(rk);
                        },
                      };
                    })()
                  : {
                      tipTitle: MAIN_SLOT_LABELS[i],
                      lines: [SKILL_DESCRIPTION_BY_ID.INVOKE_TOOLTIP_R],
                      footer: undefined,
                      onActivate: () => {
                        if (canUseSkills) sendInvoke();
                      },
                    };
              const slotShortcut = MAIN_KEY_LABELS[i];
              return (
                <HudSkillTooltip
                  key={vid}
                  title={slotBody.tipTitle}
                  lines={slotBody.lines}
                  footer={slotBody.footer}
                >
                  <button
                    type="button"
                    className="game-hud__skillButton"
                    aria-label={`${MAIN_SLOT_LABELS[i]} (${MAIN_KEY_LABELS[i]})`}
                    aria-keyshortcuts={slotShortcut}
                    disabled={!canUseSkills}
                    onClick={slotBody.onActivate}
                  >
                    <span className="game-hud__skillEmojiSlot" aria-hidden>
                      <AtlasIconMount assetId={vid} className="visual-icon visual-icon--skill-main" />
                    </span>
                    <span className="game-hud__keycap">{MAIN_KEY_LABELS[i]}</span>
                    <span className="game-hud__slotTitle">{MAIN_SLOT_LABELS[i]}</span>
                  </button>
                </HudSkillTooltip>
              );
            })}
          </div>
          <div className="game-hud__invokeInfo">
            <span>Runes: {runeSeq || "—"}</span>
            <span>Invoke: {invokeLabel}</span>
            <span>Cast: Space</span>
          </div>
            </div>
          </div>

          <div className="game-hud__skillDockFab">
            <HudSkillTooltip
              title="Справочник комбо"
              lines={[SKILL_DESCRIPTION_BY_ID.COMBOS_PANEL_TOOLTIP]}
              wrapperClassName="game-hud__tip-wrapper--fab"
            >
              <button
                type="button"
                className="game-hud__combosFab"
                aria-label="Открыть список комбинаций"
                aria-expanded={combosOpen}
                onClick={() => setCombosOpen((v) => !v)}
              >
                <AtlasIconMount assetId="game_skill_invoke" className="visual-icon visual-icon--combos-btn" />
              </button>
            </HudSkillTooltip>
          </div>
        </div>
      </div>

      <aside
        className={cn("game-hud__comboSheet", !combosOpen && "game-hud__comboSheetHidden")}
        aria-hidden={combosOpen ? "false" : "true"}
      >
        <div className="game-hud__comboHead">
          <h3>Комбо рун</h3>
          <button type="button" className="game-hud__comboDismiss" aria-label="Закрыть список комбинаций" onClick={() => setCombosOpen(false)}>
            ✕
          </button>
        </div>
        <div className="game-hud__comboGrid">
          <h4 className="game-hud__comboSectionTitle">Двойные (2 руны)</h4>
          {DUAL_COMBOS.map((c) => {
            const comboTip = skillHudTooltip(c.skillId);
            const onDualSharedCd = dualSharedCdLeft > 0.02;
            const onComboCd = onDualSharedCd;
            const queue = heroPos?.runeQueue ?? [];
            const isActive =
              runeQueueMatchesCombo(queue, c) || heroPos?.invokedSkillId === c.skillId;
            return (
              <HudSkillTooltip
                key={`dual-${c.seq}`}
                title={comboTip.title}
                lines={[comboTip.description]}
                footer={`Общий КД дуо: ${DUAL_RUNE_SHARED_COOLDOWN_SEC.toFixed(1)} с · сейчас: ${dualSharedCdLeft.toFixed(1)} с · клик: Invoke + прицел`}
                wrapperClassName="game-hud__tip-wrapper--block"
              >
                <button
                  type="button"
                  className={cn(
                    "game-hud__comboTile",
                    isActive && "game-hud__comboTile--active",
                    onComboCd && "game-hud__comboTile--cooldown",
                  )}
                  disabled={!canUseSkills || onComboCd}
                  aria-label={`Выбрать комбо ${c.seq.toUpperCase()}: ${c.name}`}
                  onClick={() => {
                    if (!canUseSkills || onComboCd) return;
                    sendPresetDualCombo(c.seq);
                  }}
                >
                  <span className="game-hud__comboIconSlot" aria-hidden>
                    <AtlasIconMount assetId={c.assetId} className="visual-icon combo-tile-visual" />
                  </span>
                  <span className="game-hud__comboMeta">
                    <RuneSeqIcons sequence={c.seq.toUpperCase()} />
                    <span className="game-hud__comboName">{c.name}</span>
                  </span>
                  {onComboCd ? (
                    <span className="game-hud__comboCooldownBadge">{dualSharedCdLeft.toFixed(1)}</span>
                  ) : null}
                </button>
              </HudSkillTooltip>
            );
          })}
          <h4 className="game-hud__comboSectionTitle">Invoke (3 руны)</h4>
          {INVOKE_COMBOS.map((c) => {
            const comboTip = skillHudTooltip(c.skillId);
            const cdLeft = heroPos?.skillCooldownsSec?.[c.skillId] ?? 0;
            const onComboCd = cdLeft > 0.02;
            return (
              <HudSkillTooltip
                key={`invoke-${c.seq}`}
                title={comboTip.title}
                lines={[comboTip.description]}
                footer={`Базовое КД: ${comboTip.baseCooldownSec.toFixed(1)} с · сейчас: ${cdLeft.toFixed(1)} с · клик: Invoke`}
                wrapperClassName="game-hud__tip-wrapper--block"
              >
                <button
                  type="button"
                  className={cn(
                    "game-hud__comboTile",
                    heroPos?.invokedSkillId === c.skillId && "game-hud__comboTile--active",
                    onComboCd && "game-hud__comboTile--cooldown",
                  )}
                  disabled={!canUseSkills || onComboCd}
                  aria-label={`Выбрать комбо ${c.seq.toUpperCase()}: ${c.name}`}
                  onClick={() => {
                    if (!canUseSkills || onComboCd) return;
                    sendPresetInvokeCombo(c.seq);
                  }}
                >
                  <span className="game-hud__comboIconSlot" aria-hidden>
                    <AtlasIconMount assetId={c.assetId} className="visual-icon combo-tile-visual" />
                  </span>
                  <span className="game-hud__comboMeta">
                    <RuneSeqIcons sequence={c.seq.toUpperCase()} />
                    <span className="game-hud__comboName">{c.name}</span>
                  </span>
                  {onComboCd ? <span className="game-hud__comboCooldownBadge">{cdLeft.toFixed(1)}</span> : null}
                </button>
              </HudSkillTooltip>
            );
          })}
        </div>
      </aside>

      {shopOpen ? <button type="button" className="game-hud__scrim" aria-label="Закрыть магазин" onClick={closeShop} /> : null}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-hud-shop-title"
        className={cn("game-hud__shop", !shopOpen && "game-hud__shopHidden")}
      >
        <h2 id="game-hud-shop-title">Лавка странника</h2>
        <p className="game-hud__shopHint">
          Монеты: <strong>{coinsTotal}</strong>
        </p>
        <div className="game-hud__shopList">
          {SHOP_OFFERS.map((offer) => (
            <ShopOfferRow
              key={offer.id}
              offer={offer}
              disabled={!canShop}
              onPurchase={() => {
                if (!canShop) return;
                sendPurchaseShopOffer(offer.id);
              }}
            />
          ))}
        </div>
        <button type="button" className="game-hud__shopDismiss" onClick={closeShop}>
          Закрыть
        </button>
      </div>
    </div>
  );
}
