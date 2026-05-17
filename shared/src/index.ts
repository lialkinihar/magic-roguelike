/**
 * Общая симуляция и протокол клиент ↔ сервер.
 * Не зависит от React, Three.js и Node ws.
 */

import { shopOfferPrice } from "./shopCatalog.js";
import {
  DUAL_SKILL_BY_SORTED_SEQ,
  INVOKE_SKILL_BY_SEQ,
  SKILL_BASE_COOLDOWN_SEC,
  SKILL_DEF_BY_ID,
  SKILLS_GLOBAL,
  isKnownSkillId,
} from "./skillsRegistry.js";

export {
  ALL_SKILL_COMBOS,
  DUAL_COMBOS,
  DUAL_COMBO_BY_SEQUENCE,
  DUAL_RUNE_COMBOS,
  DUAL_SKILL_BY_SORTED_SEQ,
  INVOKE_COMBO_BY_SEQUENCE,
  INVOKE_COMBOS,
  INVOKE_RUNE_COMBOS,
  RUNE_COMBO_SHEET,
  type RuneComboMeta,
  INVOKE_SKILL_BY_SEQ,
  INVOKE_SKILL_META_BY_ID,
  SINGLE_RUNE_COMBOS,
  SKILL_BASE_COOLDOWN_SEC,
  SKILL_DEF_BY_ID,
  SKILL_DESCRIPTION_BY_ID,
  SKILLS_CONFIG,
  SKILL_DESCRIPTIONS,
  SKILLS_GLOBAL,
  isKnownSkillId,
  skillHudTooltip,
  type InvokeComboMeta,
  type SkillComboDef,
  type SkillsConfig,
} from "./skillsRegistry.js";
export {
  SHOP_OFFERS,
  isShopOfferId,
  shopOfferPrice,
  type ShopOfferId,
  type ShopOfferMeta,
} from "./shopCatalog.js";

// --- Протокол (JSON-сообщения, фаза 0)

export type ClientToServerMessage =
  | { type: "ping" }
  | { type: "command"; payload: PlayerCommand }
  /** Сброс мира под текущих подключённых игроков (новая кампания в MVP). */
  | { type: "request_new_game"; payload?: Record<string, never> }
  /** Загрузить последнее сохранение комнаты с диска (solo / LAN доверенный). */
  | { type: "resume_save"; payload?: { slot?: number } };

export type ServerToClientMessage =
  | { type: "pong" }
  | { type: "snapshot"; payload: GameSnapshot }
  | { type: "welcome"; payload: { playerId: string } };

/** Команда от клиента — сервер валидирует и применяет на тике. */
export interface PlayerCommand {
  playerId: string;
  kind:
    | "noop"
    | "move"
    | "start_run"
    | "rune_input"
    | "invoke"
    | "cast_invoked"
    | "set_rune_queue"
    | "purchase_shop_offer";
  /** Для `move`: мировая целевая точка `targetX/targetZ` в плоскости XZ. */
  data?: Record<string, unknown>;
}

// --- Состояние мира (сериализуемое)

/** Базовая скорость бега героя (и мобов, см. [`createMonster`]) в усл. ед/с. */
export const PLAYER_MOVE_SPEED = 11;

/** Отступ координаты [`ARENA_HALF`] над половиной стороны квадратной арены до clamp позиций в [`stepSim`]. */
export const ARENA_PLAY_MARGIN = 0.35;

/**
 * Половина стороны карты по X/Z: играемая зона `[-ARENA_PLAY_HALF, ARENA_PLAY_HALF]` → квадрат **700×700**
 * (целевая геометрия; отдельно учитывается [`ARENA_PLAY_MARGIN`] при лимитах рендера/телепорта).
 */
export const ARENA_PLAY_HALF = 350;

/** Полуразмер арены в координатах мира (чуть больше [`ARENA_PLAY_HALF`]). */
export const ARENA_HALF = ARENA_PLAY_HALF + ARENA_PLAY_MARGIN;

/** Время пробега диаметра карты `2 × ARENA_PLAY_HALF` при постоянном [`PLAYER_MOVE_SPEED`]. */
export const MAP_CROSS_TIME_SEC = (2 * ARENA_PLAY_HALF) / PLAYER_MOVE_SPEED;

/** Масштаб координат мира относительно исходного лейаута при ARENA_HALF = 6. */
export const WORLD_LAYOUT_SCALE = ARENA_HALF / 6;

/** Спавн героя в хабе (после сброса забега). */
export const HUB_PLAYER_Z = -2.6 * WORLD_LAYOUT_SCALE;
/** Центр механизма по Z в покое (иконка симуляции). */
export const MECHANISM_ANCHOR_Z = -0.15 * WORLD_LAYOUT_SCALE;

/** Временная отладочная дальность каста/попадания для всех скиллов с наземной целью. */
export const SKILL_DEV_TEST_CAST_RANGE = 300;

/** Усиление скорости мобов на большой карте (оставлен экспорт для внешнего использования). */
export const MONSTER_NAV_SCALE = Math.min(8, ARENA_HALF / 14);
export const PLAYER_RADIUS = 0.28;
export const PLAYER_MAX_HP = 100;
export const MECHANISM_MAX_HP = 300;
export const RUN_ACTIVE_DURATION_SEC = 75;
export const PHASE_COOLDOWN_SEC = 2.25;
export const BASE_WAVE_INTERVAL_SEC = 5.2;
/** Задержка первой волны после «Старт» — время на обзор большой арены без мгновенного давления. */
export const FIRST_WAVE_DELAY_AFTER_RUN_START_SEC = 8;
export const SKILL_FROST_SHARD = "skill_frost_shard";
export const SKILL_CHAIN_LIGHTNING = "skill_chain_lightning";
export const SKILL_METEOR = "skill_meteor";
export const SKILL_FROST_SPEAR = "skill_frost_spear";
export const SKILL_THUNDERFROST_SPEAR = "skill_thunderfrost_spear";
export const SKILL_CRYO_METEOR = "skill_cryo_meteor";
export const SKILL_CHAIN_STORM = "skill_chain_storm";
export const SKILL_BALL_LIGHTNING = "skill_ball_lightning";
export const SKILL_GREAT_METEOR = "skill_great_meteor";
export const SKILL_FROST_NOVA = "skill_frost_nova";
export const SKILL_TELEPORT = "skill_teleport";
export const SKILL_LIGHTNING_ANCHOR = "skill_lightning_anchor";
export const SKILL_BLACK_HOLE = "skill_black_hole";
export const SKILL_COMET_OF_DESTRUCTION = "skill_comet_of_destruction";
export const MAX_RUNE_QUEUE = 3;
export const DEFAULT_SKILL_COOLDOWN_SEC = 8;
/** Общий КД всех двойных комбо после каста (см. `skills.config` global). */
export const DUAL_RUNE_SHARED_COOLDOWN_SEC = SKILLS_GLOBAL.dualRuneSharedCooldownSec ?? 6.5;

export type MonsterKind = "melee" | "ranged" | "elite";

/** Строка для HUD: экипированный артефакт (пока без игровой логики модификаторов). */
export interface ArtifactHudEntry {
  id: string;
  name: string;
  assetId: string;
}

export type ArtifactHudSlot = ArtifactHudEntry | null;

/** Клиентское отображение VFX без смены контрактов сообщений JSON. */
export type CastFxVisual =
  | "generic_ring"
  | "shard_beam"
  | "lightning_chain"
  | "meteor_zone"
  | "nova_ring"
  | "pull_field";

/** Демо-набор для HUD до появления меты; id не влияют на симуляцию. */
export const DEFAULT_ARTIFACT_SLOTS: [ArtifactHudSlot, ArtifactHudSlot, ArtifactHudSlot] = [
  { id: "artifact_seal_frost", name: "Печать холода", assetId: "game_skill_combo_qqq" },
  { id: "artifact_volt_coil", name: "Катушка Вольта", assetId: "game_skill_combo_wwe" },
  null,
];

export const DEFAULT_ARTIFACT_PASSIVES: readonly ArtifactHudEntry[] = [
  { id: "pass_spark_trail", name: "След искр", assetId: "game_skill_combo_qew" },
];

export interface PortalPoint {
  id: string;
  x: number;
  z: number;
}

/** Отступ портала мобов от линии clamp — у самого края большой арены, подальше от респа героя в хабе (z ≈ [`HUB_PLAYER_Z`] < 0). */
const MONSTER_PORTAL_EDGE_INSET = 7;

/** Четыре угла арены — входы волн; цикл `(wave + i) % length` раскидывает группы по разным углам. */
export const WORLD_PORTALS: readonly PortalPoint[] = [
  {
    id: "corner_sw",
    x: -(ARENA_PLAY_HALF - MONSTER_PORTAL_EDGE_INSET),
    z: ARENA_PLAY_HALF - MONSTER_PORTAL_EDGE_INSET,
  },
  {
    id: "corner_se",
    x: ARENA_PLAY_HALF - MONSTER_PORTAL_EDGE_INSET,
    z: ARENA_PLAY_HALF - MONSTER_PORTAL_EDGE_INSET,
  },
  {
    id: "corner_nw",
    x: -(ARENA_PLAY_HALF - MONSTER_PORTAL_EDGE_INSET),
    z: -(ARENA_PLAY_HALF - MONSTER_PORTAL_EDGE_INSET),
  },
  {
    id: "corner_ne",
    x: ARENA_PLAY_HALF - MONSTER_PORTAL_EDGE_INSET,
    z: -(ARENA_PLAY_HALF - MONSTER_PORTAL_EDGE_INSET),
  },
];

export type RectZone = {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

/** Непроходимые стены/постройки (MVP layout, корректируем по ходу). */
export const WORLD_WALLS: readonly RectZone[] = [
  {
    id: "wall_north",
    minX: -4.8 * WORLD_LAYOUT_SCALE,
    maxX: 4.8 * WORLD_LAYOUT_SCALE,
    minZ: -5.25 * WORLD_LAYOUT_SCALE,
    maxZ: -4.95 * WORLD_LAYOUT_SCALE,
  },
  {
    id: "wall_south",
    minX: -4.8 * WORLD_LAYOUT_SCALE,
    maxX: 4.8 * WORLD_LAYOUT_SCALE,
    minZ: 4.95 * WORLD_LAYOUT_SCALE,
    maxZ: 5.25 * WORLD_LAYOUT_SCALE,
  },
  {
    id: "wall_west",
    minX: -5.25 * WORLD_LAYOUT_SCALE,
    maxX: -4.95 * WORLD_LAYOUT_SCALE,
    minZ: -4.8 * WORLD_LAYOUT_SCALE,
    maxZ: 4.8 * WORLD_LAYOUT_SCALE,
  },
  {
    id: "wall_east",
    minX: 4.95 * WORLD_LAYOUT_SCALE,
    maxX: 5.25 * WORLD_LAYOUT_SCALE,
    minZ: -4.8 * WORLD_LAYOUT_SCALE,
    maxZ: 4.8 * WORLD_LAYOUT_SCALE,
  },
  {
    id: "hub_pillar",
    minX: -0.65 * WORLD_LAYOUT_SCALE,
    maxX: 0.65 * WORLD_LAYOUT_SCALE,
    minZ: -0.5 * WORLD_LAYOUT_SCALE,
    maxZ: 0.5 * WORLD_LAYOUT_SCALE,
  },
];

/** Пример непроходимой природной зоны — река. */
export const WORLD_BLOCK_ZONES: readonly RectZone[] = [
  {
    id: "river_strip",
    minX: -1.2 * WORLD_LAYOUT_SCALE,
    maxX: 1.2 * WORLD_LAYOUT_SCALE,
    minZ: 1.8 * WORLD_LAYOUT_SCALE,
    maxZ: 3.8 * WORLD_LAYOUT_SCALE,
  },
];

export type RunEndReason = "victory_timer" | "defeat_mechanism" | "defeat_players";

export interface PlayerBody {
  id: string;
  connected: boolean;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  /** Множитель скорости перемещения (лавка «Шаг ветра» и др.). */
  moveSpeedMultiplier?: number;
  moveTarget: { x: number; z: number } | null;
  skillCooldownsSec: Partial<Record<SkillId, number>>;
  /** Общий КД двойных комбо (все дуо делят один таймер). */
  dualSharedCooldownSec: number;
  runeQueue: RuneKey[];
  invokedSkillId: SkillId | null;
}

export type SkillId = string;

export type RuneKey = "q" | "w" | "e";

export interface GameState {
  /** Монотонный счётчик шагов симуляции */
  tick: number;
  /** Накопленное игровое время, секунды */
  timeSec: number;
  /** Мета-валюта лавки (сервер авторитетный). */
  coins: number;
  /** Сколько раз сервер принял валидную команду noop (контур клиент ↔ тик). */
  noopCount: number;
  /** Подключённые и отключённые игроки с позицией в мире. */
  players: Record<string, PlayerBody>;
  /** Три активных слота артефактов для HUD (данные с сервера, без применения модификаторов в MVP). */
  artifactSlots: [ArtifactHudSlot, ArtifactHudSlot, ArtifactHudSlot];
  /** Пассивные артефакты — только отображение в snapshot. */
  artifactPassives: readonly ArtifactHudEntry[];
  phase: RunPhase;
  phaseCooldownSec: number;
  artifactActiveRemainingSec: number;
  mechanism: MechanismState;
  monsters: MonsterState[];
  nextMonsterId: number;
  wave: number;
  waveSpawnCooldownSec: number;
  castEffects: SkillCastEffect[];
  nextCastEffectId: number;
  /** Причина конца забега (только в фазах победы/поражения до сброса в хаб). */
  runEndReason: RunEndReason | null;
}

export type RunPhase = "hub" | "run_active" | "run_victory" | "run_defeat";

export interface MechanismState {
  x: number;
  z: number;
  radius: number;
  hp: number;
  maxHp: number;
}

export interface MonsterState {
  id: string;
  kind: MonsterKind;
  x: number;
  z: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  aggroRadius: number;
  attackRange: number;
  attackDamage: number;
  attackCooldownSec: number;
  attackCooldownLeftSec: number;
}

export interface GameSnapshotPlayer {
  id: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  skillCooldownsSec: Partial<Record<SkillId, number>>;
  dualSharedCooldownSec: number;
  runeQueue: RuneKey[];
  invokedSkillId: SkillId | null;
}

/** Снимок для клиента (может быть подмножеством GameState). */
export interface GameSnapshot {
  tick: number;
  timeSec: number;
  coins: number;
  noopCount: number;
  players: GameSnapshotPlayer[];
  artifactSlots: [ArtifactHudSlot, ArtifactHudSlot, ArtifactHudSlot];
  artifactPassives: readonly ArtifactHudEntry[];
  phase: RunPhase;
  phaseCooldownSec: number;
  artifactActiveRemainingSec: number;
  mechanism: MechanismState;
  monsters: GameSnapshotMonster[];
  wave: number;
  waveSpawnCooldownSec: number;
  castEffects: GameSnapshotCastEffect[];
  runEndReason: RunEndReason | null;
}

export interface GameSnapshotMonster {
  id: string;
  kind: MonsterKind;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
}

export interface SkillCastEffect {
  id: number;
  skillId: SkillId;
  x: number;
  z: number;
  radius: number;
  ttlSec: number;
  maxTtlSec: number;
  visual?: CastFxVisual;
  /** Начало луча (shard / beam) в XZ. */
  originX?: number;
  originZ?: number;
  /** Цепь молний: позиции поражённых целей. */
  chainPath?: readonly { x: number; z: number }[];
}

export interface GameSnapshotCastEffect {
  id: number;
  skillId: SkillId;
  x: number;
  z: number;
  radius: number;
  ttlSec: number;
  maxTtlSec: number;
  visual?: CastFxVisual;
  originX?: number;
  originZ?: number;
  chainPath?: readonly { x: number; z: number }[];
}

export function createInitialState(playerIds: string[] = ["local"]): GameState {
  const players: GameState["players"] = {};
  for (const id of playerIds) {
    players[id] = {
      id,
      connected: true,
      x: 0,
      z: HUB_PLAYER_Z,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      moveTarget: null,
      skillCooldownsSec: {},
      dualSharedCooldownSec: 0,
      runeQueue: [],
      invokedSkillId: null,
    };
  }
  return {
    tick: 0,
    timeSec: 0,
    coins: 0,
    noopCount: 0,
    players,
    artifactSlots: [...DEFAULT_ARTIFACT_SLOTS] as [ArtifactHudSlot, ArtifactHudSlot, ArtifactHudSlot],
    artifactPassives: [...DEFAULT_ARTIFACT_PASSIVES],
    phase: "hub",
    phaseCooldownSec: 0,
    artifactActiveRemainingSec: 0,
    runEndReason: null,
    mechanism: {
      x: 0,
      z: MECHANISM_ANCHOR_Z,
      radius: 0.42 * WORLD_LAYOUT_SCALE,
      hp: MECHANISM_MAX_HP,
      maxHp: MECHANISM_MAX_HP,
    },
    monsters: [],
    nextMonsterId: 1,
    wave: 0,
    waveSpawnCooldownSec: BASE_WAVE_INTERVAL_SEC,
    castEffects: [],
    nextCastEffectId: 1,
  };
}

export function emptyCommandQueue(): PlayerCommand[] {
  return [];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function circleIntersectsRect(cx: number, cz: number, radius: number, rect: RectZone): boolean {
  const nx = clamp(cx, rect.minX, rect.maxX);
  const nz = clamp(cz, rect.minZ, rect.maxZ);
  const dx = cx - nx;
  const dz = cz - nz;
  return dx * dx + dz * dz < radius * radius;
}

function isBlockedAt(x: number, z: number, radius: number): boolean {
  for (const r of WORLD_WALLS) {
    if (circleIntersectsRect(x, z, radius, r)) return true;
  }
  for (const r of WORLD_BLOCK_ZONES) {
    if (circleIntersectsRect(x, z, radius, r)) return true;
  }
  return false;
}

function resolveMoveWithObstacles(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  radius: number,
): { x: number; z: number } {
  if (!isBlockedAt(toX, toZ, radius)) return { x: toX, z: toZ };
  if (!isBlockedAt(toX, fromZ, radius)) return { x: toX, z: fromZ };
  if (!isBlockedAt(fromX, toZ, radius)) return { x: fromX, z: toZ };
  return { x: fromX, z: fromZ };
}

function clonePlayers(players: GameState["players"]): GameState["players"] {
  const next: GameState["players"] = {};
  for (const k of Object.keys(players)) {
    const p = players[k];
    if (p) next[k] = { ...p };
  }
  return next;
}

function resetRunForHub(state: GameState): GameState {
  const players = clonePlayers(state.players);
  for (const p of Object.values(players)) {
    p.x = 0;
    p.z = HUB_PLAYER_Z;
    p.hp = p.maxHp;
    p.moveTarget = null;
    p.skillCooldownsSec = {};
    p.dualSharedCooldownSec = 0;
    p.runeQueue = [];
    p.invokedSkillId = null;
  }
  return {
    ...state,
    players,
    artifactSlots: state.artifactSlots,
    artifactPassives: state.artifactPassives,
    phase: "hub",
    phaseCooldownSec: 0,
    artifactActiveRemainingSec: 0,
    runEndReason: null,
    mechanism: {
      ...state.mechanism,
      hp: state.mechanism.maxHp,
    },
    monsters: [],
    wave: 0,
    waveSpawnCooldownSec: BASE_WAVE_INTERVAL_SEC,
    castEffects: [],
  };
}

function createMonster(kind: MonsterKind, id: number, x: number, z: number): MonsterState {
  const navHint = Math.sqrt(MONSTER_NAV_SCALE);
  const baseSpeed = PLAYER_MOVE_SPEED;
  const ar = Math.min(ARENA_PLAY_HALF, 12 * WORLD_LAYOUT_SCALE);
  if (kind === "ranged") {
    return {
      id: `m${id}`,
      kind,
      x,
      z,
      radius: 0.22 * Math.min(2.2, Math.sqrt(WORLD_LAYOUT_SCALE)),
      hp: 38,
      maxHp: 38,
      speed: baseSpeed,
      aggroRadius: ar,
      attackRange: Math.min(9, 2.8 * navHint),
      attackDamage: 6,
      attackCooldownSec: 1.4,
      attackCooldownLeftSec: 0,
    };
  }
  if (kind === "elite") {
    return {
      id: `m${id}`,
      kind,
      x,
      z,
      radius: 0.36 * Math.min(2.2, Math.sqrt(WORLD_LAYOUT_SCALE)),
      hp: 120,
      maxHp: 120,
      speed: baseSpeed,
      aggroRadius: Math.min(ARENA_PLAY_HALF, 14 * WORLD_LAYOUT_SCALE),
      attackRange: Math.min(3.2, 0.62 * navHint * 2.2),
      attackDamage: 16,
      attackCooldownSec: 1.1,
      attackCooldownLeftSec: 0,
    };
  }
  return {
    id: `m${id}`,
    kind: "melee",
    x,
    z,
    radius: 0.27 * Math.min(2.2, Math.sqrt(WORLD_LAYOUT_SCALE)),
    hp: 54,
    maxHp: 54,
    speed: baseSpeed,
    aggroRadius: Math.min(ARENA_PLAY_HALF, 11 * WORLD_LAYOUT_SCALE),
    attackRange: Math.min(2.8, 0.52 * navHint * 2.2),
    attackDamage: 9,
    attackCooldownSec: 0.9,
    attackCooldownLeftSec: 0,
  };
}

function cooldownBaseForSkill(skillId: string): number {
  return SKILL_BASE_COOLDOWN_SEC[skillId] ?? DEFAULT_SKILL_COOLDOWN_SEC;
}

function isRuneKey(v: unknown): v is RuneKey {
  return v === "q" || v === "w" || v === "e";
}

function resolveDualSkill(runes: RuneKey[]): SkillId | null {
  if (runes.length !== 2) return null;
  const sorted = [...runes].sort().join("");
  return DUAL_SKILL_BY_SORTED_SEQ[sorted] ?? null;
}

function resolveInvokedSkill(runes: RuneKey[]): SkillId | null {
  if (runes.length !== MAX_RUNE_QUEUE) return null;
  const seq = runes.join("");
  const id = INVOKE_SKILL_BY_SEQ[seq];
  return id ?? null;
}

export function isDualSkillId(skillId: string): boolean {
  const def = SKILL_DEF_BY_ID[skillId];
  return (def?.sequence?.length ?? 0) === 2;
}

export function resolveSkillFromRuneQueue(runes: RuneKey[]): SkillId | null {
  if (runes.length === 2) return resolveDualSkill(runes);
  if (runes.length === MAX_RUNE_QUEUE) return resolveInvokedSkill(runes);
  return null;
}

function distancePointToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const len2 = abx * abx + abz * abz;
  if (len2 <= 1e-8) return Math.hypot(px - ax, pz - az);
  const t = clamp((apx * abx + apz * abz) / len2, 0, 1);
  const cx = ax + abx * t;
  const cz = az + abz * t;
  return Math.hypot(px - cx, pz - cz);
}

function castSkillAtTarget(
  pl: PlayerBody,
  skillId: SkillId,
  targetX: number,
  targetZ: number,
  monsters: MonsterState[],
  castEffects: SkillCastEffect[],
  nextCastEffectIdRef: { value: number },
): void {
  const R = SKILL_DEV_TEST_CAST_RANGE;
  const pushFx = (o: {
    x: number;
    z: number;
    radius: number;
    ttlSec: number;
    visual?: CastFxVisual;
    originX?: number;
    originZ?: number;
    chainPath?: readonly { x: number; z: number }[];
  }): void => {
    castEffects.push({
      id: nextCastEffectIdRef.value,
      skillId,
      x: o.x,
      z: o.z,
      radius: o.radius,
      ttlSec: o.ttlSec,
      maxTtlSec: o.ttlSec,
      visual: o.visual,
      originX: o.originX,
      originZ: o.originZ,
      chainPath: o.chainPath,
    });
    nextCastEffectIdRef.value += 1;
  };

  if (
    skillId === SKILL_FROST_SHARD ||
    skillId === SKILL_FROST_SPEAR ||
    skillId === SKILL_THUNDERFROST_SPEAR ||
    skillId === "skill_arcane_bolt" ||
    skillId === "skill_lightning_strike" ||
    skillId === "skill_fireball"
  ) {
    const dx = targetX - pl.x;
    const dz = targetZ - pl.z;
    const d = Math.hypot(dx, dz);
    if (d <= 1e-6) return;
    const range = R;
    const width =
      skillId === SKILL_FROST_SPEAR || skillId === SKILL_THUNDERFROST_SPEAR
        ? 0.36
        : 0.28;
    const baseDamage =
      skillId === SKILL_FROST_SPEAR
        ? 28
        : skillId === SKILL_THUNDERFROST_SPEAR
          ? 26
          : 22;
    const endX = pl.x + (dx / d) * range;
    const endZ = pl.z + (dz / d) * range;
    let firstHit: MonsterState | null = null;
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const distSeg = distancePointToSegment(m.x, m.z, pl.x, pl.z, endX, endZ);
      if (distSeg <= m.radius + width) {
        m.hp = Math.max(0, m.hp - baseDamage);
        if (!firstHit) firstHit = m;
      }
    }
    if (skillId === SKILL_THUNDERFROST_SPEAR && firstHit) {
      const candidates = monsters
        .filter((m) => m.hp > 0 && m.id !== firstHit.id)
        .map((m) => ({ m, d: Math.hypot(m.x - firstHit.x, m.z - firstHit.z) }))
        .filter((x) => x.d <= R)
        .sort((a, b) => a.d - b.d);
      if (candidates[0]) {
        candidates[0].m.hp = Math.max(0, candidates[0].m.hp - 15);
      }
    }
    pushFx({
      x: endX,
      z: endZ,
      radius: Math.max(0.4, width * 2),
      ttlSec: 0.24,
      visual: "shard_beam",
      originX: pl.x,
      originZ: pl.z,
    });
    return;
  }

  if (
    skillId === SKILL_CHAIN_LIGHTNING ||
    skillId === SKILL_CHAIN_STORM ||
    skillId === SKILL_BALL_LIGHTNING
  ) {
    const alive = monsters.filter((m) => m.hp > 0);
    if (alive.length === 0) return;
    let current: MonsterState | null = alive
      .slice()
      .sort(
        (a, b) =>
          Math.hypot(a.x - targetX, a.z - targetZ) -
          Math.hypot(b.x - targetX, b.z - targetZ),
      )[0]!;
    const hit = new Set<string>();
    const chainPath: { x: number; z: number }[] = [];
    let damage = skillId === SKILL_CHAIN_STORM ? 24 : skillId === SKILL_BALL_LIGHTNING ? 20 : 18;
    const maxHops = skillId === SKILL_CHAIN_STORM ? 7 : skillId === SKILL_BALL_LIGHTNING ? 5 : 4;
    for (let hops = 0; hops < maxHops && current; hops += 1) {
      const from: MonsterState = current;
      chainPath.push({ x: from.x, z: from.z });
      if (!hit.has(from.id)) {
        from.hp = Math.max(0, from.hp - damage);
        hit.add(from.id);
      }
      if (skillId === SKILL_BALL_LIGHTNING) {
        for (const m of alive) {
          if (m.id === from.id || m.hp <= 0) continue;
          const aoe = Math.hypot(m.x - from.x, m.z - from.z);
          if (aoe <= R + m.radius) {
            m.hp = Math.max(0, m.hp - 8);
          }
        }
      }
      damage *= skillId === SKILL_CHAIN_STORM ? 0.88 : 0.82;
      const candidates: MonsterState[] = [];
      for (const m of alive) {
        if (hit.has(m.id) || m.hp <= 0) continue;
        const d = Math.hypot(m.x - from.x, m.z - from.z);
        if (d <= R) candidates.push(m);
      }
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x - from.x, a.z - from.z) -
          Math.hypot(b.x - from.x, b.z - from.z),
      );
      if (!candidates[0]) break;
      current = candidates[0];
    }
    const pathForVfx =
      chainPath.length > 0
        ? [{ x: targetX, z: targetZ }, ...chainPath]
        : [{ x: targetX, z: targetZ }, { x: targetX, z: targetZ }];
    pushFx({
      x: targetX,
      z: targetZ,
      radius: 0.85,
      ttlSec: 0.32,
      visual: "lightning_chain",
      chainPath: pathForVfx,
    });
    return;
  }

  if (
    skillId === SKILL_METEOR ||
    skillId === SKILL_CRYO_METEOR ||
    skillId === SKILL_GREAT_METEOR ||
    skillId === SKILL_COMET_OF_DESTRUCTION
  ) {
    const r = R;
    const dmg =
      skillId === SKILL_GREAT_METEOR
        ? 46
        : skillId === SKILL_COMET_OF_DESTRUCTION
          ? 58
          : 32;
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const d = Math.hypot(m.x - targetX, m.z - targetZ);
      if (d <= r + m.radius) {
        m.hp = Math.max(0, m.hp - dmg);
      }
      if (skillId === SKILL_CRYO_METEOR) {
        const outer = Math.hypot(m.x - targetX, m.z - targetZ);
        if (outer <= R + m.radius) {
          m.hp = Math.max(0, m.hp - 10);
        }
      }
    }
    pushFx({ x: targetX, z: targetZ, radius: r, ttlSec: 0.52, visual: "meteor_zone" });
    return;
  }

  if (skillId === SKILL_FROST_NOVA) {
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const d = Math.hypot(m.x - pl.x, m.z - pl.z);
      if (d <= R + m.radius) {
        m.hp = Math.max(0, m.hp - 24);
      }
    }
    pushFx({ x: pl.x, z: pl.z, radius: R, ttlSec: 0.34, visual: "nova_ring" });
    return;
  }

  if (skillId === SKILL_TELEPORT || skillId === "skill_cold_embrace") {
    const nx = clamp(targetX, -ARENA_HALF + 0.35, ARENA_HALF - 0.35);
    const nz = clamp(targetZ, -ARENA_HALF + 0.35, ARENA_HALF - 0.35);
    if (!isBlockedAt(nx, nz, PLAYER_RADIUS)) {
      pl.x = nx;
      pl.z = nz;
      pl.moveTarget = null;
    }
    pushFx({ x: pl.x, z: pl.z, radius: 0.7, ttlSec: 0.22, visual: "generic_ring" });
    return;
  }

  if (
    skillId === SKILL_LIGHTNING_ANCHOR ||
    skillId === SKILL_BLACK_HOLE ||
    skillId === "skill_ice_prison" ||
    skillId === "skill_ice_wall" ||
    skillId === "skill_glacier" ||
    skillId === "skill_thunder_clap" ||
    skillId === "skill_storm_field" ||
    skillId === "skill_overload" ||
    skillId === "skill_static_charges" ||
    skillId === "skill_electrostatic_field" ||
    skillId === "skill_flame_wall" ||
    skillId === "skill_flame_blast" ||
    skillId === "skill_damage_reflection" ||
    skillId === "skill_erupting_ground" ||
    skillId === "skill_incineration_aura"
  ) {
    const pullRadius = R;
    const pullStrength = skillId === SKILL_BLACK_HOLE ? 0.56 : skillId === "skill_glacier" ? 0.22 : 0.32;
    const baseDamage = skillId === SKILL_BLACK_HOLE ? 22 : skillId === "skill_flame_blast" ? 16 : 8;
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const dx = targetX - m.x;
      const dz = targetZ - m.z;
      const d = Math.hypot(dx, dz);
      if (d > pullRadius || d <= 1e-5) continue;
      const nx = dx / d;
      const nz = dz / d;
      m.x += nx * pullStrength;
      m.z += nz * pullStrength;
      if (d <= R) m.hp = Math.max(0, m.hp - baseDamage);
      m.attackCooldownLeftSec = Math.max(m.attackCooldownLeftSec, 0.2);
    }
    pushFx({
      x: targetX,
      z: targetZ,
      radius: pullRadius,
      ttlSec: skillId === SKILL_BLACK_HOLE ? 0.52 : 0.34,
      visual: "pull_field",
    });
  }
}

/** `move` обновляет целевую точку; шаг симуляции ведёт игрока к target с постоянной скоростью. */
export function stepSim(state: GameState, dtSec: number, commands: PlayerCommand[]): GameState {
  let noopDelta = 0;
  let coins = typeof state.coins === "number" && Number.isFinite(state.coins) ? state.coins : 0;
  let runEndReason: RunEndReason | null = state.runEndReason ?? null;
  let players = clonePlayers(state.players);
  let monsters = state.monsters.map((m) => ({ ...m }));
  const lim = ARENA_PLAY_HALF;
  let phase = state.phase;
  let phaseCooldownSec = Math.max(0, state.phaseCooldownSec - dtSec);
  let artifactActiveRemainingSec = Math.max(0, state.artifactActiveRemainingSec);
  let mechanism = { ...state.mechanism };
  let nextMonsterId = state.nextMonsterId;
  let wave = state.wave;
  let waveSpawnCooldownSec = Math.max(0, state.waveSpawnCooldownSec - dtSec);
  let castEffects = state.castEffects
    .map((fx) => ({ ...fx, ttlSec: Math.max(0, fx.ttlSec - dtSec) }))
    .filter((fx) => fx.ttlSec > 0);
  const nextCastEffectIdRef = { value: state.nextCastEffectId };
  const lim2 = lim;

  for (const p of Object.values(players)) {
    for (const k of Object.keys(p.skillCooldownsSec) as SkillId[]) {
      const v = p.skillCooldownsSec[k] ?? 0;
      p.skillCooldownsSec[k] = Math.max(0, v - dtSec);
    }
    p.dualSharedCooldownSec = Math.max(0, p.dualSharedCooldownSec - dtSec);
  }

  for (const cmd of commands) {
    const pl = players[cmd.playerId];
    if (!pl?.connected) continue;

    if (cmd.kind === "noop") noopDelta += 1;

    if (cmd.kind === "move") {
      if (phase !== "run_active") continue;
      const tx = Number(cmd.data?.targetX);
      const tz = Number(cmd.data?.targetZ);
      if (!Number.isFinite(tx) || !Number.isFinite(tz)) continue;
      pl.moveTarget = { x: clamp(tx, -lim, lim), z: clamp(tz, -lim, lim) };
    }

    if (cmd.kind === "start_run" && phase === "hub") {
      phase = "run_active";
      phaseCooldownSec = 0;
      artifactActiveRemainingSec = RUN_ACTIVE_DURATION_SEC;
      mechanism.hp = mechanism.maxHp;
      monsters = [];
      castEffects = [];
      wave = 0;
      waveSpawnCooldownSec = FIRST_WAVE_DELAY_AFTER_RUN_START_SEC;
      for (const p of Object.values(players)) {
        p.x = 0;
        p.z = HUB_PLAYER_Z;
        p.hp = p.maxHp;
        p.moveTarget = null;
        p.skillCooldownsSec = {};
        p.dualSharedCooldownSec = 0;
        p.runeQueue = [];
        p.invokedSkillId = null;
      }
    }

    if (cmd.kind === "rune_input") {
      if (phase !== "run_active") continue;
      const rune = cmd.data?.rune;
      if (!isRuneKey(rune)) continue;
      pl.runeQueue = [...pl.runeQueue, rune].slice(-MAX_RUNE_QUEUE);
      continue;
    }

    if (cmd.kind === "set_rune_queue") {
      if (phase !== "run_active") continue;
      const raw = cmd.data?.runes as unknown;
      if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_RUNE_QUEUE) continue;
      const queued: RuneKey[] = [];
      let invalid = false;
      for (const r of raw) {
        if (!isRuneKey(r)) {
          invalid = true;
          break;
        }
        queued.push(r);
      }
      if (invalid) continue;
      pl.runeQueue = queued.slice(-MAX_RUNE_QUEUE);
      continue;
    }

    if (cmd.kind === "invoke") {
      if (phase !== "run_active") continue;
      const qlen = pl.runeQueue.length;
      if (qlen !== 2 && qlen !== MAX_RUNE_QUEUE) continue;
      const taken = [...pl.runeQueue];
      pl.runeQueue = [];
      pl.invokedSkillId =
        qlen === 2 ? resolveDualSkill(taken) : resolveInvokedSkill(taken);
      continue;
    }

    if (cmd.kind === "cast_invoked") {
      if (phase !== "run_active") continue;
      const tx = Number(cmd.data?.targetX);
      const tz = Number(cmd.data?.targetZ);
      if (!Number.isFinite(tx) || !Number.isFinite(tz)) continue;
      const skillId = pl.invokedSkillId;
      if (!isKnownSkillId(skillId)) continue;
      const dual = isDualSkillId(skillId);
      if (dual) {
        if (pl.dualSharedCooldownSec > 1e-6) continue;
      } else {
        const cd = pl.skillCooldownsSec[skillId] ?? 0;
        if (cd > 1e-6) continue;
      }

      const targetX = clamp(tx, -lim2, lim2);
      const targetZ = clamp(tz, -lim2, lim2);
      if (dual) {
        pl.dualSharedCooldownSec = DUAL_RUNE_SHARED_COOLDOWN_SEC;
      } else {
        pl.skillCooldownsSec[skillId] = cooldownBaseForSkill(skillId);
      }
      castSkillAtTarget(pl, skillId, targetX, targetZ, monsters, castEffects, nextCastEffectIdRef);
      pl.invokedSkillId = null;
      pl.runeQueue = [];
      continue;
    }

    if (cmd.kind === "purchase_shop_offer") {
      if (phase !== "hub") continue;
      const offerId = String(cmd.data?.offerId ?? "");
      const price = shopOfferPrice(offerId);
      if (price === undefined || coins < price) continue;
      coins -= price;
      if (offerId === "shop-buy-heal") {
        pl.hp = Math.min(pl.maxHp, pl.hp + 30);
      } else if (offerId === "shop-buy-hp") {
        pl.maxHp += 10;
        pl.hp += 10;
      } else if (offerId === "shop-buy-speed") {
        const mult = pl.moveSpeedMultiplier ?? 1;
        pl.moveSpeedMultiplier = Math.min(2.5, mult * 1.1);
      }
      /* aegis / spellbook — пока только трата монет (игровая логика позже). */
      continue;
    }
  }

  if (phase === "run_active") {
    artifactActiveRemainingSec = Math.max(0, artifactActiveRemainingSec - dtSec);
    for (const body of Object.values(players)) {
      if (!body?.connected) continue;
      const target = body.moveTarget;
      if (!target) continue;

      const stepDist = PLAYER_MOVE_SPEED * (body.moveSpeedMultiplier ?? 1) * dtSec;
      const toX = target.x - body.x;
      const toZ = target.z - body.z;
      const dist = Math.hypot(toX, toZ);
      if (dist < 1e-4) {
        body.moveTarget = null;
        continue;
      }

      const step = Math.min(stepDist, dist);
      const nx = toX / dist;
      const nz = toZ / dist;
      const desiredX = clamp(body.x + nx * step, -lim, lim);
      const desiredZ = clamp(body.z + nz * step, -lim, lim);
      const resolved = resolveMoveWithObstacles(body.x, body.z, desiredX, desiredZ, PLAYER_RADIUS);
      const moved = Math.hypot(resolved.x - body.x, resolved.z - body.z) > 1e-5;
      body.x = resolved.x;
      body.z = resolved.z;
      if (!moved) {
        body.moveTarget = null;
        continue;
      }

      if (step >= dist - 1e-5) {
        body.moveTarget = null;
      }
    }
  } else {
    for (const body of Object.values(players)) body.moveTarget = null;
  }

  if (phase === "run_active") {
    if (waveSpawnCooldownSec <= 0) {
      wave += 1;
      const spawnCount = Math.min(2 + wave, 9);
      for (let i = 0; i < spawnCount; i += 1) {
        const portal = WORLD_PORTALS[(wave + i) % WORLD_PORTALS.length]!;
        const kind: MonsterKind =
          wave % 5 === 0 && i === 0
            ? "elite"
            : i % 3 === 1
              ? "ranged"
              : "melee";
        const clusterSpread = Math.max(3.5, WORLD_LAYOUT_SCALE * 0.5);
        const spread = (i - (spawnCount - 1) * 0.5) * clusterSpread;
        const mz = clamp(portal.z + spread, -lim, lim);
        const mx = clamp(portal.x - spread * 0.65, -lim, lim);
        if (isBlockedAt(mx, mz, 0.26)) continue;
        monsters.push(createMonster(kind, nextMonsterId, mx, mz));
        nextMonsterId += 1;
      }
      waveSpawnCooldownSec = Math.max(2.35, BASE_WAVE_INTERVAL_SEC - wave * 0.16);
    }

    const livingPlayers = Object.values(players).filter((p) => p.connected && p.hp > 0);
    for (const m of monsters) {
      m.attackCooldownLeftSec = Math.max(0, m.attackCooldownLeftSec - dtSec);
      if (livingPlayers.length === 0) continue;

      let nearestPlayer = livingPlayers[0]!;
      let nearestDist = Math.hypot(nearestPlayer.x - m.x, nearestPlayer.z - m.z);
      for (const p of livingPlayers) {
        const d = Math.hypot(p.x - m.x, p.z - m.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestPlayer = p;
        }
      }

      const targetPlayer = nearestDist <= m.aggroRadius ? nearestPlayer : null;
      const tx = targetPlayer ? targetPlayer.x : mechanism.x;
      const tz = targetPlayer ? targetPlayer.z : mechanism.z;
      const targetRadius = targetPlayer ? PLAYER_RADIUS : mechanism.radius;
      const toX = tx - m.x;
      const toZ = tz - m.z;
      const dist = Math.hypot(toX, toZ);
      const attackDistance = m.attackRange + targetRadius + m.radius;

      if (dist <= attackDistance && m.attackCooldownLeftSec <= 0) {
        if (targetPlayer) {
          targetPlayer.hp = Math.max(0, targetPlayer.hp - m.attackDamage);
        } else {
          mechanism.hp = Math.max(0, mechanism.hp - m.attackDamage);
        }
        m.attackCooldownLeftSec = m.attackCooldownSec;
        continue;
      }

      if (dist < 1e-4) continue;
      const step = m.speed * dtSec;
      const nx = toX / dist;
      const nz = toZ / dist;
      const desiredX = clamp(m.x + nx * step, -lim, lim);
      const desiredZ = clamp(m.z + nz * step, -lim, lim);
      const resolved = resolveMoveWithObstacles(m.x, m.z, desiredX, desiredZ, m.radius);
      m.x = resolved.x;
      m.z = resolved.z;
    }

    for (let i = 0; i < monsters.length; i += 1) {
      const a = monsters[i]!;
      for (let j = i + 1; j < monsters.length; j += 1) {
        const b = monsters[j]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const minD = a.radius + b.radius + 0.04;
        if (d <= 1e-6 || d >= minD) continue;
        const push = (minD - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        const ax = clamp(a.x - nx * push, -lim, lim);
        const az = clamp(a.z - nz * push, -lim, lim);
        const bx = clamp(b.x + nx * push, -lim, lim);
        const bz = clamp(b.z + nz * push, -lim, lim);
        if (!isBlockedAt(ax, az, a.radius)) {
          a.x = ax;
          a.z = az;
        }
        if (!isBlockedAt(bx, bz, b.radius)) {
          b.x = bx;
          b.z = bz;
        }
      }
    }

    let killCoins = 0;
    monsters = monsters.filter((m) => {
      if (m.hp <= 0) {
        killCoins += 2;
        return false;
      }
      return true;
    });
    coins += killCoins;
  } else {
    monsters = [];
    wave = 0;
    waveSpawnCooldownSec = BASE_WAVE_INTERVAL_SEC;
  }

  const anyLivingPlayer = Object.values(players).some((p) => p.connected && p.hp > 0);
  if (phase === "run_active") {
    if (mechanism.hp <= 0 || !anyLivingPlayer) {
      phase = "run_defeat";
      phaseCooldownSec = PHASE_COOLDOWN_SEC;
      runEndReason = mechanism.hp <= 0 ? "defeat_mechanism" : "defeat_players";
    } else if (artifactActiveRemainingSec <= 0) {
      phase = "run_victory";
      phaseCooldownSec = PHASE_COOLDOWN_SEC;
      runEndReason = "victory_timer";
    }
  } else if ((phase === "run_victory" || phase === "run_defeat") && phaseCooldownSec <= 0) {
    return resetRunForHub({
      ...state,
      players,
      phase,
      phaseCooldownSec,
      artifactActiveRemainingSec,
      mechanism,
      monsters,
      nextMonsterId,
      wave,
      waveSpawnCooldownSec,
    });
  }

  return {
    ...state,
    tick: state.tick + 1,
    timeSec: state.timeSec + dtSec,
    coins,
    noopCount: state.noopCount + noopDelta,
    players,
    phase,
    phaseCooldownSec,
    artifactActiveRemainingSec,
    mechanism,
    monsters,
    nextMonsterId,
    wave,
    waveSpawnCooldownSec,
    castEffects,
    nextCastEffectId: nextCastEffectIdRef.value,
    runEndReason,
  };
}

export function stateToSnapshot(state: GameState): GameSnapshot {
  const players: GameSnapshotPlayer[] = [];
  for (const p of Object.values(state.players)) {
    if (p.connected) {
      players.push({
        id: p.id,
        x: p.x,
        z: p.z,
        hp: p.hp,
        maxHp: p.maxHp,
        skillCooldownsSec: p.skillCooldownsSec,
        dualSharedCooldownSec: p.dualSharedCooldownSec ?? 0,
        runeQueue: p.runeQueue,
        invokedSkillId: p.invokedSkillId,
      });
    }
  }
  const monsters: GameSnapshotMonster[] = state.monsters.map((m) => ({
    id: m.id,
    kind: m.kind,
    x: m.x,
    z: m.z,
    hp: m.hp,
    maxHp: m.maxHp,
  }));
  return {
    tick: state.tick,
    timeSec: state.timeSec,
    coins: typeof state.coins === "number" && Number.isFinite(state.coins) ? state.coins : 0,
    noopCount: state.noopCount,
    players,
    artifactSlots: [...state.artifactSlots] as [ArtifactHudSlot, ArtifactHudSlot, ArtifactHudSlot],
    artifactPassives: [...state.artifactPassives],
    phase: state.phase,
    phaseCooldownSec: state.phaseCooldownSec,
    artifactActiveRemainingSec: state.artifactActiveRemainingSec,
    mechanism: state.mechanism,
    monsters,
    wave: state.wave,
    waveSpawnCooldownSec: state.waveSpawnCooldownSec,
    castEffects: state.castEffects.map((fx) => ({ ...fx })),
    runEndReason: state.runEndReason ?? null,
  };
}

/** Макс. дистанция «указатель → герой» для наземных скиллов (`SKILL_DEV_TEST_CAST_RANGE`). */
export function getSkillGroundTargetMaxRange(skillId: string): number | null {
  if (!skillId) return null;
  return SKILL_DEV_TEST_CAST_RANGE;
}

/** Версия формата JSON-сейва комнаты (SQLite blob на сервере). */
export const GAME_SAVE_FORMAT_VERSION = 2;
/** Последняя версия, с которой совместима [`deserializeGameStateFromSave`]. */
export const GAME_SAVE_FORMAT_MIN_VERSION = 1;

export interface PersistedGameEnvelope {
  formatVersion: number;
  state: GameState;
}

/** Сериализация полного состояния симуляции для записи на диск. */
export function serializeGameStateForSave(state: GameState): string {
  return JSON.stringify({
    formatVersion: GAME_SAVE_FORMAT_VERSION,
    state,
  } satisfies PersistedGameEnvelope);
}

/** Заполняет поля по умолчанию после загрузки из JSON. */
export function normalizeLoadedGameState(state: GameState): GameState {
  const nextPlayers: GameState["players"] = {};
  for (const [id, p] of Object.entries(state.players)) {
    if (!p) continue;
    nextPlayers[id] = {
      ...p,
      moveSpeedMultiplier: p.moveSpeedMultiplier ?? 1,
      dualSharedCooldownSec:
        typeof p.dualSharedCooldownSec === "number" && Number.isFinite(p.dualSharedCooldownSec)
          ? Math.max(0, p.dualSharedCooldownSec)
          : 0,
    };
  }
  const rer =
    state.runEndReason === "victory_timer" ||
    state.runEndReason === "defeat_mechanism" ||
    state.runEndReason === "defeat_players"
      ? state.runEndReason
      : null;
  return {
    ...state,
    coins: typeof state.coins === "number" && Number.isFinite(state.coins) ? state.coins : 0,
    players: nextPlayers,
    runEndReason: rer,
  };
}

/** Разбор сохранённого JSON; `null` если версия или структура не подходят. */
export function deserializeGameStateFromSave(raw: string): GameState | null {
  try {
    const v = JSON.parse(raw) as PersistedGameEnvelope;
    if (!v || typeof v !== "object") return null;
    if (
      typeof v.formatVersion !== "number" ||
      v.formatVersion < GAME_SAVE_FORMAT_MIN_VERSION ||
      v.formatVersion > GAME_SAVE_FORMAT_VERSION
    ) {
      return null;
    }
    if (!v.state || typeof v.state !== "object") return null;
    const st = v.state as GameState;
    if (typeof st.tick !== "number" || typeof st.timeSec !== "number") return null;
    if (!st.players || typeof st.players !== "object") return null;
    return normalizeLoadedGameState(st);
  } catch {
    return null;
  }
}

export function serializeServerMessage(msg: ServerToClientMessage): string {
  return JSON.stringify(msg);
}

export function serializeClientMessage(msg: ClientToServerMessage): string {
  return JSON.stringify(msg);
}

export function parseServerMessage(raw: string): ServerToClientMessage | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || !("type" in v)) return null;
    const t = (v as { type: unknown }).type;
    if (t === "pong") return { type: "pong" };
    if (t === "welcome" && "payload" in v) {
      return { type: "welcome", payload: (v as { payload: { playerId: string } }).payload };
    }
    if (t === "snapshot" && "payload" in v) {
      return { type: "snapshot", payload: (v as { payload: GameSnapshot }).payload };
    }
    return null;
  } catch {
    return null;
  }
}

export function parseClientMessage(raw: string): ClientToServerMessage | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || !("type" in v)) return null;
    const t = (v as { type: unknown }).type;
    if (t === "ping") return { type: "ping" };
    if (t === "request_new_game") return { type: "request_new_game", payload: {} };
    if (t === "resume_save") {
      const payload = "payload" in v ? ((v as { payload?: { slot?: number } }).payload ?? {}) : {};
      return { type: "resume_save", payload };
    }
    if (t === "command" && "payload" in v && (v as { payload: unknown }).payload) {
      return { type: "command", payload: (v as { payload: PlayerCommand }).payload };
    }
    return null;
  } catch {
    return null;
  }
}
