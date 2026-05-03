import { SKILLS_CONFIG } from "./skills.config.js";
import {
  ALL_VISUAL_IDS,
  INVOKE_SEAL_VISUAL_ID,
  KEY_TO_RUNE_VISUAL_ID,
  preloadVisualsForCanvas,
  renderIconElement,
  RUNE_KIND_TO_VISUAL_ID,
  visualIconOuterHtml,
  drawVisual,
} from "./icons.js";

(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const WORLD_W = 9600;
  const WORLD_H = 5400;
  const BORDER_WALL = 56;
  const SHOOTER_FIRE_RANGE = 400;
  const HEALTH_PICKUP_DROP_CHANCE = 0.02;
  /** Не больше столько хилок одновременно на карте */
  const HEALTH_PICKUP_CAP = 5;
  const TOTAL_WAVES = 10;
  const WAVE_DURATION_SEC = 60;
  const EVENT_WAVES = [2, 4, 6];
  const EVENT_CHANNEL_SEC = 3;
  const EVENT_SUMMON_DELAY_SEC = 2;
  const WAVE_HEAL_PERCENT = 0.3;
  const BASE_PLAYER_MOVE_SPEED = 340;
  const GLOBAL_PACE = {
    enemySpeedMul: 0.82,
    spawnRateMul: 0.86,
  };
  const PLAYER_BASE_MAX_HP = 1000;
  /** Множитель HP обычных врагов к старой формуле (игрок был ~100 HP). */
  const ENEMY_HP_GLOBAL_MUL = 10;
  const SHOP_COST_HEAL = 10;
  const SHOP_COST_HP = 30;
  const SHOP_COST_SPEED = 50;
  const SHOP_COST_AEGIS = 120;
  const SHOP_COST_SPELLBOOK = 140;
  const REVIVE_DELAY_SEC = 2;
  const REVIVE_SLOWMO_FACTOR = 0.25;
  const REVIVE_INVULN_SEC = 4;
  const SHOP_UPGRADE_DEFS = [
    { key: "heal", icon: "🧪", visualId: "game_shop_heal", name: "Хилка", desc: "Мгновенно лечит на 300 HP.", persistent: false },
    { key: "hp", icon: "❤️", visualId: "game_shop_hp", name: "Буст HP", desc: "Увеличивает максимум HP на 100.", persistent: true },
    { key: "speed", icon: "💨", visualId: "game_shop_speed", name: "Буст скорости", desc: "Увеличивает скорость движения на 10%.", persistent: true },
    { key: "aegis", icon: "🛡️", visualId: "game_shop_aegis", name: "Эгида феникса", desc: "Одноразовое воскрешение с полным HP при смертельном уроне.", persistent: true },
    { key: "spellbook", icon: "📕", visualId: "game_shop_spellbook", name: "Пустой свиток заклинаний", desc: "Открывает дополнительный слот под Invoke-комбо.", persistent: true },
  ];
  const WAVE_CONFIGS = [
    { enemyPool: ["melee"], spawnRate: 0.9, hpMul: 1.0, dmgMul: 1.0, speedMul: 1.0, rewardGold: 18 },
    { enemyPool: ["melee", "runner"], spawnRate: 1.0, hpMul: 1.1, dmgMul: 1.05, speedMul: 1.05, rewardGold: 24 },
    { enemyPool: ["melee", "runner", "shooter"], spawnRate: 1.1, hpMul: 1.22, dmgMul: 1.1, speedMul: 1.08, rewardGold: 30 },
    { enemyPool: ["melee", "runner", "shooter", "tank"], spawnRate: 1.2, hpMul: 1.34, dmgMul: 1.16, speedMul: 1.11, rewardGold: 38 },
    { enemyPool: ["boss1"], spawnRate: 0, hpMul: 1.0, dmgMul: 1.0, speedMul: 1.0, rewardGold: 62 },
    { enemyPool: ["melee", "runner", "shooter", "tank", "sniper"], spawnRate: 1.36, hpMul: 1.5, dmgMul: 1.24, speedMul: 1.15, rewardGold: 50 },
    { enemyPool: ["melee", "runner", "shooter", "tank", "sniper"], spawnRate: 1.46, hpMul: 1.62, dmgMul: 1.3, speedMul: 1.18, rewardGold: 58 },
    { enemyPool: ["melee", "runner", "shooter", "tank", "sniper"], spawnRate: 1.6, hpMul: 1.77, dmgMul: 1.37, speedMul: 1.22, rewardGold: 66 },
    { enemyPool: ["melee", "runner", "shooter", "tank", "sniper"], spawnRate: 1.74, hpMul: 1.95, dmgMul: 1.45, speedMul: 1.25, rewardGold: 74 },
    { enemyPool: ["boss2"], spawnRate: 0, hpMul: 1.0, dmgMul: 1.0, speedMul: 1.0, rewardGold: 120 },
  ];
  const ARTIFACT_DEFS = [
    { id: "artifact_fury", icon: "🗡️", visualId: "game_artifact_fury", name: "Пепельная ярость", desc: "+12% к урону всех заклинаний.", rarity: "Обычный", weight: 52, unique: false, tags: ["damage"], apply: (s) => {
      s.fireballDamage *= 1.12;
      s.iceSpearDamage *= 1.12;
      s.lightningDamage *= 1.12;
    } },
    { id: "artifact_guard", icon: "🛡️", visualId: "game_artifact_guard", name: "Опаловый панцирь", desc: "+250 к максимуму HP и мгновенное лечение на 250.", rarity: "Обычный", weight: 46, unique: false, tags: ["survival"], apply: (s) => {
      s.maxHp += 250;
      s.hp = Math.min(s.maxHp, s.hp + 250);
    } },
    { id: "artifact_step", icon: "👢", visualId: "game_artifact_step", name: "Сапоги ветра", desc: "+10% к скорости передвижения.", rarity: "Обычный", weight: 42, unique: false, tags: ["utility"], apply: (s) => {
      s.moveSpeed *= 1.1;
    } },
    { id: "artifact_chain", icon: "⚡", visualId: "game_artifact_chain", name: "Грозовой узел", desc: "+20% к урону молний.", rarity: "Редкий", weight: 26, unique: false, tags: ["damage"], apply: (s) => {
      s.lightningDamage *= 1.2;
    } },
    { id: "artifact_nova", icon: "🔥", visualId: "game_artifact_nova", name: "Ядро огня", desc: "+18% к урону огня и +15% к радиусу взрыва.", rarity: "Редкий", weight: 24, unique: false, tags: ["damage"], apply: (s) => {
      s.fireballDamage *= 1.18;
      s.fireballBlastRadius *= 1.15;
    } },
    { id: "artifact_heart", icon: "💎", visualId: "game_artifact_heart", name: "Сердце феникса", desc: "Полностью восстанавливает HP и +150 к максимуму.", rarity: "Эпический", weight: 12, unique: true, tags: ["survival"], apply: (s) => {
      s.maxHp += 150;
      s.hp = s.maxHp;
    } },
  ];

  const SKILLS_CFG = SKILLS_CONFIG;
  const SKILLS_GLOBAL_CFG = SKILLS_CFG.global || {};
  const MAIN_SKILL_KEYS = ["KeyQ", "KeyW", "KeyE", "KeyR"];
  const MAIN_KEY_LABELS = ["Q", "W", "E", "R"];
  const RUNE_TO_KEY = { ice: "Q", lightning: "W", fire: "E" };
  const SLOT_KEY_VISUAL_IDS = [
    "game_skill_rune_q",
    "game_skill_rune_w",
    "game_skill_rune_e",
    INVOKE_SEAL_VISUAL_ID,
  ];
  const SORTED2 = (a, b) => [a, b].sort().join("");
  const SINGLE_RUNE_COMBOS = SKILLS_CFG.singleRuneCombos || [];
  const DUAL_RUNE_COMBOS = SKILLS_CFG.dualRuneCombos || [];
  const INVOKE_COMBOS = SKILLS_CFG.invokeCombos || [];
  const BASE_RUNE_CAST_TIME_SEC = SKILLS_GLOBAL_CFG.baseRuneCastTimeSec || 0.3;
  const RUNE_CAST_MOVE_SPEED_MULT = 0.8;
  const DUAL_SHARED_CD_SEC = SKILLS_GLOBAL_CFG.dualRuneSharedCooldownSec || 6.5;
  const INVOKE_COMBO_BY_SEQUENCE = Object.fromEntries(INVOKE_COMBOS.map((c) => [c.sequence, c]));
  const SINGLE_COMBO_BY_SEQUENCE = Object.fromEntries(SINGLE_RUNE_COMBOS.map((c) => [c.sequence, c]));
  const DUAL_COMBO_BY_SEQUENCE = Object.fromEntries(
    DUAL_RUNE_COMBOS.map((c) => {
      const seq = c.sequence;
      const key = seq.length === 2 ? SORTED2(seq[0], seq[1]) : seq;
      return [key, c];
    })
  );
  const COOLDOWN_COMBOS = [...DUAL_RUNE_COMBOS, ...INVOKE_COMBOS];
  const ALL_SKILL_DEF_BY_ID = Object.fromEntries(
    [...SINGLE_RUNE_COMBOS, ...DUAL_RUNE_COMBOS, ...INVOKE_COMBOS].map((c) => [c.id, c])
  );

  function makeUltBadDef(seq) {
    return {
      id: "ult_bad",
      icon: "◉",
      visualId: INVOKE_SEAL_VISUAL_ID,
      name: "Неизвестная комбинация",
      sequence: seq || "—",
      cooldownSec: 0,
      damage: "—",
      runeTier: "—",
      functionType: "—",
      archetype: "—",
      desc: "Эта последовательность не даёт заклинания. Нажмите Пробел, чтобы сбросить слот.",
    };
  }

  const TOOLTIP_ULT_EMPTY = {
    id: "ult_empty",
    icon: "◇",
    visualId: INVOKE_SEAL_VISUAL_ID,
    name: "Пробел — Invoke",
    sequence: "—",
    cooldownSec: 0,
    damage: "—",
    runeTier: "—",
    functionType: "Система",
    archetype: "invoke_cast",
    desc: "Сначала наберите руны Q/W/E, затем нажмите R, чтобы загрузить их в этот слот. Пробел применяет заклинание по текущей загрузке.",
  };

  const TOOLTIP_HOTBAR_INVOKE_R = {
    id: "hotbar_r",
    icon: "◉",
    visualId: INVOKE_SEAL_VISUAL_ID,
    name: "Загрузить в Invoke",
    sequence: "R",
    cooldownSec: 0,
    damage: "—",
    runeTier: "—",
    functionType: "Система",
    archetype: "invoke_loader",
    desc: "После рун Q/W/E нажмите R, чтобы поместить очередь в слот Пробела. Повторный R заменяет загрузку новой очередью.",
  };

  const TOOLTIP_ARTIFACT_LOCKED = {
    id: "artifact_locked",
    icon: "🔒",
    name: "Слот закрыт",
    sequence: "—",
    cooldownSec: 0,
    damage: "—",
    runeTier: "—",
    functionType: "Артефакт",
    archetype: "spellbook_slot",
    desc: "Купите «Пустой свиток заклинаний» в лавке, чтобы открыть этот слот и назначить на него Invoke-комбо (Ctrl+цифра при загруженном Invoke).",
  };

  const TOOLTIP_ARTIFACT_EMPTY = {
    id: "artifact_empty",
    icon: "📕",
    visualId: "game_artifact_empty_spell_scroll",
    name: "Свободный слот свитка",
    sequence: "—",
    cooldownSec: 0,
    damage: "—",
    runeTier: "—",
    functionType: "Артефакт",
    archetype: "spellbook_slot",
    desc: "Загрузите комбо через Q/W/E и R, затем зажмите Ctrl и нажмите номер слота, чтобы сохранить заклинание для быстрого вызова.",
  };

  function validateSkillsConfig() {
    const seen = new Set();
    for (const c of [...SINGLE_RUNE_COMBOS, ...DUAL_RUNE_COMBOS, ...INVOKE_COMBOS]) {
      if (!c || !c.sequence || !c.archetype) throw new Error("Invalid skill config entry");
      if (seen.has(c.sequence)) throw new Error(`Duplicate sequence in skills config: ${c.sequence}`);
      seen.add(c.sequence);
      if (typeof c.runeTier !== "number" || !c.functionType) throw new Error(`Missing rune metadata for ${c.sequence}`);
      if (c.sequence.length === 1 && (c.runeTier !== 1 || c.cooldownSec > 0)) throw new Error(`Invalid tier contract for ${c.sequence}`);
      if (c.sequence.length === 2 && (c.runeTier !== 2 || c.cooldownSec <= 0)) throw new Error(`Invalid tier contract for ${c.sequence}`);
      if (c.sequence.length === 3 && c.runeTier !== 3) throw new Error(`Invalid tier contract for ${c.sequence}`);
    }
  }

  /** Огненный конус: длительность и геометрия */
  const FIRE_CONE_DURATION = 3.4;
  const FIRE_CONE_RANGE = 200;
  const FIRE_CONE_HALF_ANGLE = 0.52;
  const FIRE_CONE_TICK = 0.14;
  const FIRE_CONE_DMG = 9;
  const BEAM_CHANNEL_DURATION = 5;
  const BEAM_CHANNEL_RANGE = 980;
  const BEAM_CHANNEL_WIDTH = 56;
  const BEAM_CHANNEL_TICK = 0.1;
  const BEAM_CHANNEL_TURN_RATE = 2.2;
  const METEOR_FALL_TIME = 0.42;
  const BASE_METEOR_RADIUS = 42;
  const BASE_ICE_PIERCE = 5;
  const BASE_LIGHTNING_BOUNCES = 7;
  const BASE_LIGHTNING_BOUNCE_RADIUS = 220;

  const ICE_VOLLEY_COUNT = 10;
  const ICE_VOLLEY_SPREAD = 0.38;
  const ICE_VOLLEY_SPEED = 820;
  const ICE_VOLLEY_LIFE = 2.8;

  let viewW = Math.max(320, window.innerWidth | 0);
  let viewH = Math.max(240, window.innerHeight | 0);

  function resizeCanvas() {
    viewW = Math.max(320, window.innerWidth | 0);
    viewH = Math.max(240, window.innerHeight | 0);
    canvas.width = viewW;
    canvas.height = viewH;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let mouseLeftHeld = false;
  let mouseCanvasX = 0;
  let mouseCanvasY = 0;
  let moveTarget = null;

  function pointerToCanvasPx(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, r.width);
    const scaleY = canvas.height / Math.max(1, r.height);
    return {
      x: (clientX - r.left) * scaleX,
      y: (clientY - r.top) * scaleY,
    };
  }

  canvas.addEventListener("mousemove", (e) => {
    const p = pointerToCanvasPx(e.clientX, e.clientY);
    mouseCanvasX = p.x;
    mouseCanvasY = p.y;
    if (mouseLeftHeld) setMoveTargetFromMouse();
  });
  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    mouseLeftHeld = true;
    const p = pointerToCanvasPx(e.clientX, e.clientY);
    mouseCanvasX = p.x;
    mouseCanvasY = p.y;
    setMoveTargetFromMouse();
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button !== 0) return;
    mouseLeftHeld = false;
  });
  window.addEventListener("blur", () => {
    mouseLeftHeld = false;
  });

  function buildInvokeCooldownRow() {
    const row = document.getElementById("skill-invoke-cd-row");
    if (!row) return;
    row.innerHTML = "";
    row.setAttribute("aria-label", "Перезарядка комбо Invoke");
    for (const def of COOLDOWN_COMBOS) {
      const el = document.createElement("div");
      el.className = "skill-invoke-cd-item";
      el.dataset.cdKey = def.id;
      el.dataset.toolSkillId = def.id;
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      const seqIcons = formatSkillSequenceIconsHtml(def.sequence);
      el.innerHTML = `<div class="skill-invoke-cd-ring"><span class="skill-invoke-cd-seq rune-seq-icons" aria-hidden="true">${seqIcons}</span><span class="skill-invoke-cd-timer" aria-live="polite"></span></div>`;
      row.appendChild(el);
    }
  }

  function renderInvokeCooldownRow() {
    const row = document.getElementById("skill-invoke-cd-row");
    if (!row) return;
    if (!state || !state.invokeSpellCd) {
      row.classList.remove("skill-invoke-cd-row--visible");
      row.setAttribute("aria-hidden", "true");
      for (const el of row.querySelectorAll(".skill-invoke-cd-item")) {
        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
        const tEl = el.querySelector(".skill-invoke-cd-timer");
        if (tEl) tEl.textContent = "";
        el.classList.remove("skill-invoke-cd-item--cooling");
      }
      return;
    }
    let anyOnCd = false;
    for (const el of row.querySelectorAll(".skill-invoke-cd-item")) {
      const key = el.dataset.cdKey;
      const tEl = el.querySelector(".skill-invoke-cd-timer");
      if (!key || !tEl) continue;
      const def = COOLDOWN_COMBOS.find((c) => c.id === key);
      const left = def && def.sequence.length === 2 ? state.dualSharedCd || 0 : state.invokeSpellCd[key] || 0;
      if (left <= 0.001) {
        tEl.textContent = "";
        el.classList.remove("skill-invoke-cd-item--cooling");
        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
      } else {
        tEl.textContent = `${left.toFixed(1)}с`;
        el.classList.add("skill-invoke-cd-item--cooling");
        el.hidden = false;
        el.setAttribute("aria-hidden", "false");
        anyOnCd = true;
      }
    }
    row.classList.toggle("skill-invoke-cd-row--visible", anyOnCd);
    row.setAttribute("aria-hidden", anyOnCd ? "false" : "true");
  }

  function buildSkillBarSlots() {
    if (!skillSlotsWrap || !skillRecentWrap || !skillUltWrap) return;
    skillUltWrap.innerHTML = "";
    skillRecentWrap.innerHTML = "";
    skillSlotsWrap.innerHTML = "";
    const ult = document.createElement("button");
    ult.type = "button";
    ult.id = "skill-slot-ult";
    ult.className = "skill-slot skill-slot-ult";
    ult.disabled = true;
    ult.dataset.slot = "4";
    ult.setAttribute("aria-keyshortcuts", "Space");
    ult.setAttribute("aria-label", "Пробел, нет загруженного Invoke");
    ult.removeAttribute("data-tool-skill-id");
    ult.dataset.toolTipKind = "ult-empty";
    ult.removeAttribute("data-tool-tip-seq");
    const emptyMark = document.createElement("span");
    emptyMark.className = "skill-emoji skill-emoji--empty";
    emptyMark.setAttribute("aria-hidden", "true");
    emptyMark.textContent = "—";
    ult.appendChild(emptyMark);
    const ultKey = document.createElement("span");
    ultKey.className = "skill-key";
    ultKey.textContent = "Пробел";
    ult.appendChild(ultKey);
    const ultLab = document.createElement("span");
    ultLab.className = "skill-label";
    ultLab.textContent = "Пусто";
    ult.appendChild(ultLab);
    skillUltWrap.appendChild(ult);
    const slotLabel = ["Ice Rune", "Lightning Rune", "Fire Rune", "Invoke"];
    const slotSkillIds = ["rune_q", "rune_w", "rune_e", ""];
    for (let i = 0; i < 4; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-slot skill-slot-main";
      btn.dataset.slot = String(i);
      btn.setAttribute("aria-keyshortcuts", MAIN_KEY_LABELS[i]);
      if (i < 3) {
        btn.dataset.toolSkillId = slotSkillIds[i];
        btn.removeAttribute("data-tool-tip-kind");
      } else {
        btn.removeAttribute("data-tool-skill-id");
        btn.dataset.toolTipKind = "invoke-r";
      }
      const em = document.createElement("span");
      em.className = "skill-emoji";
      em.setAttribute("aria-hidden", "true");
      const svgEl = renderIconElement(SLOT_KEY_VISUAL_IDS[i], { className: "visual-icon visual-icon--skill-main" });
      if (svgEl) em.appendChild(svgEl);
      btn.appendChild(em);
      const keyEl = document.createElement("span");
      keyEl.className = "skill-key";
      keyEl.textContent = MAIN_KEY_LABELS[i];
      btn.appendChild(keyEl);
      const labEl = document.createElement("span");
      labEl.className = "skill-label";
      labEl.textContent = slotLabel[i];
      btn.appendChild(labEl);
      btn.addEventListener("click", () => activateHotbarSlot(i));
      skillSlotsWrap.appendChild(btn);
    }
  }

  function skillKindToTooltipId(kind) {
    if (kind === "ice") return "rune_q";
    if (kind === "lightning") return "rune_w";
    if (kind === "fire") return "rune_e";
    return "";
  }

  function renderSkillRecentIcons() {
    if (!skillRecentWrap) return;
    skillRecentWrap.innerHTML = "";
    if (!state || !state.skillIconQueue) return;
    for (const k of state.skillIconQueue) {
      const span = document.createElement("span");
      span.className = "skill-recent-icon";
      span.setAttribute("role", "img");
      const vid = RUNE_KIND_TO_VISUAL_ID[k];
      const svgEl = vid && renderIconElement(vid, { className: "visual-icon visual-icon--skill-recent" });
      if (svgEl) span.appendChild(svgEl);
      else span.textContent = "?";
      const sid = skillKindToTooltipId(k);
      if (sid) span.dataset.toolSkillId = sid;
      skillRecentWrap.appendChild(span);
    }
  }

  function pushSkillRecentIcon(kind) {
    if (!state || state.gameOver) return;
    state.skillIconQueue.push(kind);
    if (state.skillIconQueue.length > 3) state.skillIconQueue.shift();
    renderSkillRecentIcons();
  }

  function syncUltSlotFromState() {
    const ult = document.getElementById("skill-slot-ult");
    if (!ult || !state) return;
    const pay = state.invokePayload;
    if (!pay) {
      ult.disabled = true;
      ult.classList.remove("skill-slot-ult--armed");
      ult.removeAttribute("data-tool-skill-id");
      ult.dataset.toolTipKind = "ult-empty";
      ult.removeAttribute("data-tool-tip-seq");
      ult.innerHTML = "";
      const row = document.createElement("span");
      row.className = "skill-emoji skill-combo skill-emoji--empty";
      row.setAttribute("aria-hidden", "true");
      row.textContent = "—";
      ult.appendChild(row);
      const keyEl = document.createElement("span");
      keyEl.className = "skill-key";
      keyEl.textContent = "Пробел";
      ult.appendChild(keyEl);
      const labEl = document.createElement("span");
      labEl.className = "skill-label";
      labEl.textContent = "Пусто";
      ult.appendChild(labEl);
      ult.setAttribute("aria-label", "Пробел, нет загруженного Invoke");
      return;
    }
    ult.disabled = false;
    ult.classList.add("skill-slot-ult--armed");
    const combo = matchInvokeCombo(pay.kinds);
    if (combo) {
      ult.dataset.toolSkillId = combo.id;
      ult.removeAttribute("data-tool-tip-kind");
      ult.removeAttribute("data-tool-tip-seq");
    } else {
      ult.removeAttribute("data-tool-skill-id");
      ult.dataset.toolTipKind = "ult-bad";
      ult.dataset.toolTipSeq = pay.kinds.map((k) => RUNE_TO_KEY[k] || "").join("");
    }
    const comboName = combo ? combo.name : "Invoke";
    ult.innerHTML = "";
    const comboWrap = document.createElement("span");
    comboWrap.className = "skill-emoji skill-combo";
    comboWrap.setAttribute("aria-hidden", "true");
    for (const rk of pay.kinds) {
      const wrap = document.createElement("span");
      wrap.className = "skill-combo-icon";
      const vid = RUNE_KIND_TO_VISUAL_ID[rk];
      const svgEl = vid && renderIconElement(vid, { className: "visual-icon visual-icon--ult-rune" });
      if (svgEl) wrap.appendChild(svgEl);
      else wrap.textContent = "?";
      comboWrap.appendChild(wrap);
    }
    ult.appendChild(comboWrap);
    const keyEl2 = document.createElement("span");
    keyEl2.className = "skill-key";
    keyEl2.textContent = "Пробел";
    ult.appendChild(keyEl2);
    const labEl2 = document.createElement("span");
    labEl2.className = "skill-label";
    labEl2.textContent = comboName;
    ult.appendChild(labEl2);
    ult.setAttribute("aria-label", `Пробел — активировать ${comboName} и очистить слот`);
  }

  function hasActiveChannelSkill() {
    return !!(state && (state.beamChannel || state.elementalSpin || state.armamentRecollection));
  }

  function gameplayAcceptsInput() {
    return (
      state &&
      !state.gameOver &&
      !state.revivePending &&
      !state.pendingRuneCast &&
      !hasActiveChannelSkill() &&
      !(state.activeShield && (state.activeShield.type === "invuln" || state.activeShield.type === "ice_shell")) &&
      !paused &&
      !isArtifactChoiceOpen() &&
      startScreen.classList.contains("hidden")
    );
  }

  function tryCastIce() {
    if (!gameplayAcceptsInput()) return;
    queueRuneAndStartBaseCast("ice");
  }

  function tryCastLightning() {
    if (!gameplayAcceptsInput()) return;
    queueRuneAndStartBaseCast("lightning");
  }

  function tryCastFire() {
    if (!gameplayAcceptsInput()) return;
    queueRuneAndStartBaseCast("fire");
  }

  function getSingleComboForKind(kind) {
    const key = RUNE_TO_KEY[kind];
    if (!key) return null;
    return SINGLE_COMBO_BY_SEQUENCE[key] || null;
  }

  function queueRuneAndStartBaseCast(kind) {
    if (!state) return;
    if (state.pendingRuneCast) return;
    const key = RUNE_TO_KEY[kind];
    const slotIndex = key === "Q" ? 0 : key === "W" ? 1 : 2;
    state.pendingRuneCast = { kind, slotIndex, timer: BASE_RUNE_CAST_TIME_SEC, total: BASE_RUNE_CAST_TIME_SEC, aimPoint: getWorldMouseXY() };
  }

  function updatePendingRuneCast(dt) {
    if (!state || !state.pendingRuneCast) return;
    const p = state.pendingRuneCast;
    p.timer -= dt;
    if (p.timer > 0) return;
    const combo = getSingleComboForKind(p.kind);
    pushSkillRecentIcon(p.kind);
    const castCtx = { aimPoint: p.aimPoint ? { x: p.aimPoint.x, y: p.aimPoint.y } : null };
    state.pendingRuneCast = null;
    if (!combo) return;
    castInvokeSpell(combo, 1, castCtx);
  }

  /** Снимает стек рун Q/W/E в слот Пробела. Повторный R заменяет уже загруженный Invoke новым составом очереди. Пустой R ничего не меняет. */
  function tryCastInvoke() {
    if (!gameplayAcceptsInput()) return;
    if (!state.skillIconQueue.length) return;
    state.invokePayload = { kinds: state.skillIconQueue.slice() };
    state.skillIconQueue.length = 0;
    renderSkillRecentIcons();
    syncUltSlotFromState();
  }

  /** Пробел: 1 руна (без КД), 2 руны (6 независимых комбо), 3 руны (полные Invoke-комбо). */
  function tryCastSpaceInvoke() {
    if (!gameplayAcceptsInput()) return;
    const pay = state.invokePayload;
    if (!pay) return;
    const combo = matchInvokeCombo(pay.kinds);
    if (!combo) {
      state.invokePayload = null;
      syncUltSlotFromState();
      return;
    }
    const overchargeActive = state.stats.time < (state.overchargeUntil || 0);
    const cdLeft =
      combo.sequence.length === 2
        ? overchargeActive
          ? 0
          : state.dualSharedCd || 0
        : combo.cooldownSec > 0
          ? state.invokeSpellCd[combo.id] || 0
          : 0;
    if (cdLeft > 0) return;
    state.invokePayload = null;
    syncUltSlotFromState();
    if (combo.sequence.length === 2) {
      if (!overchargeActive) state.dualSharedCd = DUAL_SHARED_CD_SEC;
    } else if (combo.cooldownSec > 0) {
      state.invokeSpellCd[combo.id] = combo.cooldownSec;
    }
    castInvokeSpell(combo, 1, { aimPoint: getWorldMouseXY() });
    renderInvokeCooldownRow();
  }

  function assignInvokeToArtifactSlot(slotIndex) {
    if (!state || !state.invokePayload) return;
    if (slotIndex < 0 || slotIndex >= 3) return;
    if (slotIndex >= Math.min(3, state.booksOwned || 0)) return;
    const combo = matchInvokeCombo(state.invokePayload.kinds);
    if (!combo) return;
    const slot = state.artifactSlots[slotIndex];
    slot.artifactId = "spellbook";
    slot.selectedSequence = combo.sequence;
    renderArtifactSlots();
  }

  function triggerArtifactSlot(slotIndex) {
    if (!state || slotIndex < 0 || slotIndex >= 3) return;
    if (slotIndex >= Math.min(3, state.booksOwned || 0)) return;
    const slot = state.artifactSlots[slotIndex];
    if (!slot || !slot.selectedSequence) return;
    if (slot.cooldown > 0) return;
    const combo = INVOKE_COMBO_BY_SEQUENCE[slot.selectedSequence];
    if (!combo) return;
    const penalty = getSlotPenalty();
    const overchargeActive = state.stats.time < (state.overchargeUntil || 0);
    const baseCd = combo.sequence.length === 2 ? DUAL_SHARED_CD_SEC : combo.cooldownSec;
    slot.cooldown = combo.sequence.length === 2 && overchargeActive ? 0 : baseCd * penalty.cdMul;
    castInvokeSpell(combo, penalty.powerMul, { aimPoint: getWorldMouseXY() });
    renderArtifactSlots();
    renderInvokeCooldownRow();
  }

  function activateHotbarSlot(slotIndex) {
    switch (slotIndex) {
      case 0:
        tryCastIce();
        break;
      case 1:
        tryCastLightning();
        break;
      case 2:
        tryCastFire();
        break;
      case 3:
        tryCastInvoke();
        break;
      case 4:
        tryCastSpaceInvoke();
        break;
      default:
        break;
    }
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.repeat) return;
      if (!gameplayAcceptsInput()) return;
      if (e.code === "Space") {
        activateHotbarSlot(4);
        e.preventDefault();
        return;
      }
      if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") {
        const slotIdx = Number(e.code.slice(-1)) - 1;
        if (e.ctrlKey && state?.invokePayload) {
          assignInvokeToArtifactSlot(slotIdx);
        } else {
          triggerArtifactSlot(slotIdx);
        }
        e.preventDefault();
        return;
      }
      const mi = MAIN_SKILL_KEYS.indexOf(e.code);
      if (mi >= 0) {
        activateHotbarSlot(mi);
        e.preventDefault();
      }
    },
    true
  );

  const startScreen = document.getElementById("start-screen");
  const btnContinue = document.getElementById("btn-continue");
  const btnNewGame = document.getElementById("btn-new-game");
  const btnSettings = document.getElementById("btn-settings");
  const btnPatchNotes = document.getElementById("btn-patch-notes");
  const settingsModal = document.getElementById("settings-modal");
  const patchModal = document.getElementById("patch-modal");
  const btnSettingsClose = document.getElementById("btn-settings-close");
  const btnPatchClose = document.getElementById("btn-patch-close");
  const settingsSound = document.getElementById("settings-sound");
  const gameOverPanel = document.getElementById("game-over");
  const hpBar = document.getElementById("hp-bar");
  const armorBar = document.getElementById("armor-bar");
  const hpText = document.getElementById("hp-text");
  const armorText = document.getElementById("armor-text");
  const xpBar = document.getElementById("xp-bar");
  const elCoins = document.getElementById("coin-counter");
  const elLevel = document.getElementById("level");
  const elWaveLabel = document.getElementById("wave-label");
  const elKills = document.getElementById("kills");
  const elBuffsHud = document.getElementById("buffs-hud");
  const waveRewardToastWrap = document.getElementById("wave-reward-toast-wrap");
  const goStats = document.getElementById("go-stats");
  const victoryScreen = document.getElementById("victory-screen");
  const victoryStats = document.getElementById("victory-stats");
  const skillBar = document.getElementById("skill-bar");
  const skillUltWrap = document.getElementById("skill-slot-ult-wrap");
  const skillRecentWrap = document.getElementById("skill-recent-icons");
  const skillSlotsWrap = document.getElementById("skill-slots");
  const pauseScreen = document.getElementById("pause-screen");
  const btnResume = document.getElementById("btn-resume");
  const btnShop = document.getElementById("btn-shop");
  const btnPause = document.getElementById("btn-pause");
  const btnExitMenu = document.getElementById("btn-exit-menu");
  const exitConfirmModal = document.getElementById("exit-confirm-modal");
  const btnExitCancel = document.getElementById("btn-exit-cancel");
  const btnExitConfirm = document.getElementById("btn-exit-confirm");
  const shopScreen = document.getElementById("shop-screen");
  const shopCoins = document.getElementById("shop-coins");
  const btnShopClose = document.getElementById("btn-shop-close");
  const btnBuyHeal = document.getElementById("shop-buy-heal");
  const btnBuyHp = document.getElementById("shop-buy-hp");
  const btnBuySpeed = document.getElementById("shop-buy-speed");
  const btnBuyAegis = document.getElementById("shop-buy-aegis");
  const btnBuySpellbook = document.getElementById("shop-buy-spellbook");
  const shopAegisStock = document.getElementById("shop-aegis-stock");
  const artifactChoiceScreen = document.getElementById("artifact-choice-screen");
  const artifactChoiceList = document.getElementById("artifact-choice-list");
  const purchasedUpgradesWrap = document.getElementById("purchased-upgrades");
  const btnCombos = document.getElementById("btn-combos");
  const combosPanel = document.getElementById("combos-panel");
  const combosList = document.getElementById("combos-list");
  const btnCombosClose = document.getElementById("btn-combos-close");
  const artifactSlotButtons = [1, 2, 3].map((i) => document.getElementById(`artifact-slot-${i}`));

  let skillTooltipEl = null;
  let skillTooltipHoverEl = null;

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Q/W/E → иконки рун (`game_skill_rune_*`, растр/атлас или SVG); R → печать Invoke; иначе — символ. */
  function formatSkillSequenceIconsHtml(sequence) {
    if (sequence == null || sequence === "" || sequence === "—") {
      return `<span class="rune-seq-dash">—</span>`;
    }
    let html = "";
    for (const ch of String(sequence)) {
      const vid = KEY_TO_RUNE_VISUAL_ID[ch];
      if (vid) {
        html += `<span class="rune-seq-icon" aria-hidden="true">${visualIconOuterHtml(vid, "rune-seq-visual")}</span>`;
      } else if (ch === "R") {
        html += `<span class="rune-seq-icon rune-seq-invoke" aria-hidden="true">${visualIconOuterHtml(
          INVOKE_SEAL_VISUAL_ID,
          "rune-seq-visual"
        )}</span>`;
      } else {
        html += `<span class="rune-seq-other">${escapeHtml(ch)}</span>`;
      }
    }
    return html;
  }

  function formatCooldownLineForTooltip(def) {
    const seq = def.sequence;
    if (typeof seq === "string" && seq.length === 2 && /^[QWE]{2}$/.test(seq)) {
      return `Общее КД дуо: ${DUAL_SHARED_CD_SEC} с (перегрузка снимает)`;
    }
    if (def.cooldownSec > 0) return `${def.cooldownSec} с`;
    return "Нет";
  }

  function formatSkillTooltipInner(def) {
    if (!def) return "";
    const dmgText = def.damage != null && def.damage !== "" ? String(def.damage) : "—";
    const tierText = def.runeTier != null ? String(def.runeTier) : "—";
    const headIcon = def.visualId
      ? visualIconOuterHtml(def.visualId, "skill-tooltip-icon-svg")
      : `<span class="skill-tooltip-icon-fallback">${escapeHtml(def.icon || "")}</span>`;
    return (
      `<div class="skill-tooltip-head"><span class="skill-tooltip-icon" aria-hidden="true">${headIcon}</span>` +
      `<strong>${escapeHtml(def.name)}</strong></div>` +
      `<div class="skill-tooltip-seq">Комбо: <span class="skill-tooltip-seq-icons rune-seq-icons">${formatSkillSequenceIconsHtml(def.sequence)}</span></div>` +
      `<dl class="skill-tooltip-dl">` +
      `<div><dt>Урон (база)</dt><dd>${escapeHtml(dmgText)}</dd></div>` +
      `<div><dt>Кулдаун</dt><dd>${escapeHtml(formatCooldownLineForTooltip(def))}</dd></div>` +
      `<div><dt>Ступень руны</dt><dd>${escapeHtml(tierText)}</dd></div>` +
      `</dl>` +
      `<p class="skill-tooltip-desc">${escapeHtml(def.desc || "")}</p>`
    );
  }

  function ensureSkillTooltipEl() {
    if (skillTooltipEl) return skillTooltipEl;
    skillTooltipEl = document.createElement("div");
    skillTooltipEl.id = "skill-tooltip";
    skillTooltipEl.className = "skill-tooltip hidden";
    skillTooltipEl.setAttribute("role", "tooltip");
    skillTooltipEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(skillTooltipEl);
    return skillTooltipEl;
  }

  function hideSkillTooltip() {
    if (!skillTooltipEl) return;
    skillTooltipEl.classList.add("hidden");
    skillTooltipEl.setAttribute("aria-hidden", "true");
    skillTooltipHoverEl = null;
  }

  function positionSkillTooltip(clientX, clientY) {
    if (!skillTooltipEl || skillTooltipEl.classList.contains("hidden")) return;
    const pad = 14;
    const tw = skillTooltipEl.offsetWidth;
    const th = skillTooltipEl.offsetHeight;
    let x = clientX + pad;
    let y = clientY + pad;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (x + tw > vw - 8) x = Math.max(8, clientX - tw - pad);
    if (y + th > vh - 8) y = Math.max(8, clientY - th - pad);
    skillTooltipEl.style.left = `${Math.round(x)}px`;
    skillTooltipEl.style.top = `${Math.round(y)}px`;
  }

  function showSkillTooltipForDef(def, clientX, clientY) {
    const el = ensureSkillTooltipEl();
    if (!def) {
      hideSkillTooltip();
      return;
    }
    el.innerHTML = formatSkillTooltipInner(def);
    el.classList.remove("hidden");
    el.setAttribute("aria-hidden", "false");
    positionSkillTooltip(clientX, clientY);
    requestAnimationFrame(() => positionSkillTooltip(clientX, clientY));
  }

  function getTooltipDefFromElement(el) {
    if (!el || !el.dataset) return null;
    const id = el.dataset.toolSkillId;
    if (id && ALL_SKILL_DEF_BY_ID[id]) return ALL_SKILL_DEF_BY_ID[id];
    const kind = el.dataset.toolTipKind;
    if (kind === "ult-empty") return TOOLTIP_ULT_EMPTY;
    if (kind === "ult-bad") return makeUltBadDef(el.dataset.toolTipSeq || "");
    if (kind === "invoke-r") return TOOLTIP_HOTBAR_INVOKE_R;
    if (kind === "artifact-locked") return TOOLTIP_ARTIFACT_LOCKED;
    if (kind === "artifact-empty") return TOOLTIP_ARTIFACT_EMPTY;
    return null;
  }

  function initSkillBarTooltips() {
    if (!skillBar || skillBar.dataset.tooltipsBound === "1") return;
    skillBar.dataset.tooltipsBound = "1";
    skillBar.addEventListener(
      "pointermove",
      (e) => {
        const host = e.target.closest("[data-tool-skill-id], [data-tool-tip-kind]");
        const sid = host && host.dataset.toolSkillId;
        const tipKind = host && host.dataset.toolTipKind;
        if (!host || !(sid || tipKind)) {
          hideSkillTooltip();
          return;
        }
        const def = getTooltipDefFromElement(host);
        if (!def) {
          hideSkillTooltip();
          return;
        }
        if (skillTooltipHoverEl !== host) {
          showSkillTooltipForDef(def, e.clientX, e.clientY);
          skillTooltipHoverEl = host;
        } else positionSkillTooltip(e.clientX, e.clientY);
      },
      true
    );
    skillBar.addEventListener("pointerleave", (e) => {
      if (e.relatedTarget && skillBar.contains(e.relatedTarget)) return;
      hideSkillTooltip();
    });
  }

  if (skillUltWrap) {
    skillUltWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("#skill-slot-ult");
      if (!btn || btn.disabled || !gameplayAcceptsInput()) return;
      activateHotbarSlot(4);
    });
  }

  function isPauseMenuOpen() {
    return pauseScreen && !pauseScreen.classList.contains("hidden");
  }

  function isShopOpen() {
    return shopScreen && !shopScreen.classList.contains("hidden");
  }

  function isArtifactChoiceOpen() {
    return artifactChoiceScreen && !artifactChoiceScreen.classList.contains("hidden");
  }

  function isCombosOpen() {
    return combosPanel && !combosPanel.classList.contains("hidden");
  }

  function syncPauseToggleButton() {
    if (!btnPause) return;
    const resumeUi = isPauseMenuOpen();
    btnPause.innerHTML = "";
    const vid = resumeUi ? "app_play" : "app_pause";
    const svgEl = renderIconElement(vid, { className: "visual-icon visual-icon--corner-btn" });
    if (svgEl) btnPause.appendChild(svgEl);
    btnPause.setAttribute("aria-label", resumeUi ? "Продолжить (Esc)" : "Пауза (Esc)");
    btnPause.classList.toggle("btn-pause--resume-icon", resumeUi);
  }

  function mountStaticChromeIcons() {
    const mountSlot = (elId, assetId, className) => {
      const slot = document.getElementById(elId);
      if (!slot || slot.dataset.visualMounted === "1") return;
      const svg = renderIconElement(assetId, { className });
      if (!svg) return;
      slot.appendChild(svg);
      slot.dataset.visualMounted = "1";
    };
    mountSlot("coin-icon-slot", "game_coin", "visual-icon hud-inline-svg");
    mountSlot("armor-icon-slot", "game_armor", "visual-icon hud-inline-svg");
    if (btnShop) {
      btnShop.innerHTML = "";
      const s = renderIconElement("app_shop_button", { className: "visual-icon visual-icon--corner-btn" });
      if (s) btnShop.appendChild(s);
    }
    if (btnCombos) {
      btnCombos.innerHTML = "";
      const s = renderIconElement("game_spell_list", { className: "visual-icon visual-icon--combos-btn" });
      if (s) btnCombos.appendChild(s);
    }
    for (const btn of document.querySelectorAll(".shop-item-btn[data-shop-visual]")) {
      const vid = btn.getAttribute("data-shop-visual");
      const slot = btn.querySelector(".shop-item-icon");
      if (!vid || !slot) continue;
      slot.innerHTML = "";
      const svg = renderIconElement(vid, { className: "visual-icon shop-item-visual" });
      if (svg) slot.appendChild(svg);
    }
    for (const slot of document.querySelectorAll(".shop-coin-slot")) {
      if (slot.querySelector("svg")) continue;
      const svg = renderIconElement("game_coin", { className: "visual-icon shop-inline-coin" });
      if (svg) slot.appendChild(svg);
    }
    syncPauseToggleButton();
    if (btnExitMenu) {
      btnExitMenu.innerHTML = "";
      const sx = renderIconElement("app_main_menu", { className: "visual-icon visual-icon--corner-btn" });
      if (sx) btnExitMenu.appendChild(sx);
    }
  }

  function isExitConfirmOpen() {
    return exitConfirmModal && !exitConfirmModal.classList.contains("hidden");
  }

  function closeExitConfirmModal() {
    if (!exitConfirmModal) return;
    exitConfirmModal.classList.add("hidden");
    exitConfirmModal.setAttribute("aria-hidden", "true");
  }

  function showExitConfirmModal() {
    if (!exitConfirmModal) return;
    exitConfirmModal.classList.remove("hidden");
    exitConfirmModal.setAttribute("aria-hidden", "false");
  }

  /** Пауза + диалог: выход в меню (прогресс сохраняется через persistRunSave в openPauseMenu). */
  function openExitToMenuFromGame() {
    if (!state || state.gameOver) return;
    if (!startScreen || startScreen.classList.contains("hidden") === false) return;
    if (isArtifactChoiceOpen()) return;
    if (isShopOpen()) closeShop();
    if (isCombosOpen()) closeCombosPanel();
    hideSkillTooltip();
    openPauseMenu();
    showExitConfirmModal();
  }

  function confirmExitToMainMenu() {
    closeExitConfirmModal();
    returnToMainMenu();
  }

  function openPauseMenu() {
    if (!pauseScreen || !state || state.gameOver || isShopOpen() || isArtifactChoiceOpen()) return;
    paused = true;
    persistRunSave(state);
    pauseScreen.classList.remove("hidden");
    pauseScreen.setAttribute("aria-hidden", "false");
    syncPauseToggleButton();
  }

  function closePauseMenu() {
    if (!pauseScreen || !isPauseMenuOpen()) return;
    pauseScreen.classList.add("hidden");
    pauseScreen.setAttribute("aria-hidden", "true");
    paused = false;
    syncPauseToggleButton();
  }

  const RUN_SAVE_KEY = "magicRoguelike_run_v1";
  const SETTINGS_KEY = "magicRoguelike_settings_v1";

  function stringifyRun(obj) {
    try {
      return JSON.stringify(obj, (key, value) => {
        if (value instanceof Set) return { __type: "Set", arr: [...value] };
        return value;
      });
    } catch (err) {
      return null;
    }
  }

  function parseSavedRun(str) {
    return JSON.parse(str, (key, value) => {
      if (value && typeof value === "object" && value.__type === "Set" && Array.isArray(value.arr)) return new Set(value.arr);
      return value;
    });
  }

  function clearRunSave() {
    try {
      localStorage.removeItem(RUN_SAVE_KEY);
    } catch (err) {}
  }

  function persistRunSave(s) {
    if (!s || s.gameOver || s.victory) return;
    try {
      const raw = stringifyRun(s);
      if (raw) localStorage.setItem(RUN_SAVE_KEY, raw);
    } catch (err) {}
  }

  function hasValidSavedRun() {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    if (!raw) return false;
    try {
      const s = parseSavedRun(raw);
      return !!(s && s.player && s.stats && !s.gameOver && !s.victory);
    } catch (err) {
      clearRunSave();
      return false;
    }
  }

  function refreshContinueButton() {
    if (!btnContinue) return;
    const ok = hasValidSavedRun();
    btnContinue.classList.toggle("hidden", !ok);
    btnContinue.setAttribute("aria-hidden", ok ? "false" : "true");
    btnContinue.disabled = false;
  }

  let runAutosaveAcc = 0;

  function loadSettingsToUi() {
    if (!settingsSound) return;
    try {
      const r = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      settingsSound.checked = r.sound !== false;
    } catch (err) {
      settingsSound.checked = true;
    }
  }

  function saveSettingsFromUi() {
    if (!settingsSound) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sound: settingsSound.checked }));
    } catch (err) {}
  }

  function openSettingsModal() {
    if (!settingsModal) return;
    loadSettingsToUi();
    settingsModal.classList.remove("hidden");
    settingsModal.setAttribute("aria-hidden", "false");
  }

  function closeSettingsModal() {
    if (!settingsModal) return;
    saveSettingsFromUi();
    settingsModal.classList.add("hidden");
    settingsModal.setAttribute("aria-hidden", "true");
  }

  function openPatchModal() {
    if (!patchModal) return;
    patchModal.classList.remove("hidden");
    patchModal.setAttribute("aria-hidden", "false");
  }

  function closePatchModal() {
    if (!patchModal) return;
    patchModal.classList.add("hidden");
    patchModal.setAttribute("aria-hidden", "true");
  }

  /** То же, что Esc во время игры: закрыть комбо/лавку или переключить паузу. */
  function togglePauseOrDismissOverlays() {
    if (!startScreen || startScreen.classList.contains("hidden") === false) return;
    if (!state || state.gameOver) return;
    if (isExitConfirmOpen()) {
      closeExitConfirmModal();
      return;
    }
    if (isCombosOpen()) {
      closeCombosPanel();
      return;
    }
    if (isShopOpen()) {
      closeShop();
      return;
    }
    if (isPauseMenuOpen()) closePauseMenu();
    else openPauseMenu();
  }

  function renderShopUi() {
    if (!state || !shopScreen) return;
    const c = state.stats.coins | 0;
    if (shopCoins) shopCoins.textContent = String(c);
    if (btnBuyHeal) btnBuyHeal.disabled = c < SHOP_COST_HEAL;
    if (btnBuyHp) btnBuyHp.disabled = c < SHOP_COST_HP;
    if (btnBuySpeed) btnBuySpeed.disabled = c < SHOP_COST_SPEED;
    if (btnBuyAegis) btnBuyAegis.disabled = c < SHOP_COST_AEGIS || !!state.aegisBought;
    if (btnBuySpellbook) btnBuySpellbook.disabled = c < SHOP_COST_SPELLBOOK || (state.shopPurchased.spellbook || 0) >= 1;
    if (shopAegisStock) shopAegisStock.textContent = state.aegisBought ? "0/1" : "1/1";
  }

  function getActiveBookCount() {
    if (!state || !state.artifactSlots) return 0;
    let n = 0;
    for (const s of state.artifactSlots) {
      if (s.artifactId === "spellbook" && s.selectedSequence) n++;
    }
    return n;
  }

  function getSlotPenalty() {
    const active = Math.max(0, Math.min(3, getActiveBookCount()));
    return SKILLS_GLOBAL_CFG.slotPenaltyByActiveBooks?.[active] || { cdMul: 1, powerMul: 1 };
  }

  function renderArtifactSlots() {
    if (!artifactSlotButtons || !state) return;
    const unlockedSlots = Math.min(3, state.booksOwned || 0);
    for (let i = 0; i < artifactSlotButtons.length; i++) {
      const btn = artifactSlotButtons[i];
      if (!btn) continue;
      const slot = state.artifactSlots[i];
      btn.classList.remove("artifact-slot--locked", "artifact-slot--ready", "artifact-slot--cooldown");
      const hasBook = i < unlockedSlots;
      if (!hasBook) {
        btn.classList.add("artifact-slot--locked");
        btn.removeAttribute("data-tool-skill-id");
        btn.dataset.toolTipKind = "artifact-locked";
        btn.removeAttribute("data-tool-tip-seq");
        btn.innerHTML = "";
        btn.textContent = String(i + 1);
        continue;
      }
      if (!slot.artifactId) slot.artifactId = "spellbook";
      btn.innerHTML = "";
      const stack = document.createElement("span");
      stack.className = "artifact-slot-stack";
      const scrollSvg = renderIconElement("game_artifact_empty_spell_scroll", {
        className: "artifact-slot-scroll visual-icon",
      });
      if (scrollSvg) stack.appendChild(scrollSvg);
      if (!slot.selectedSequence) {
        btn.removeAttribute("data-tool-skill-id");
        btn.dataset.toolTipKind = "artifact-empty";
        const num = document.createElement("span");
        num.className = "artifact-slot-num";
        num.textContent = String(i + 1);
        stack.appendChild(num);
        btn.appendChild(stack);
        btn.classList.add("artifact-slot--ready");
      } else {
        btn.removeAttribute("data-tool-tip-kind");
        const bookCombo = INVOKE_COMBO_BY_SEQUENCE[slot.selectedSequence];
        if (bookCombo) btn.dataset.toolSkillId = bookCombo.id;
        else btn.removeAttribute("data-tool-skill-id");
        const overlay = document.createElement("span");
        overlay.className = "artifact-slot-overlay";
        if (bookCombo && bookCombo.visualId) {
          const oSvg = renderIconElement(bookCombo.visualId, {
            className: "artifact-slot-combo visual-icon",
          });
          if (oSvg) overlay.appendChild(oSvg);
        }
        stack.appendChild(overlay);
        btn.appendChild(stack);
      }
      if (slot.cooldown > 0.01) {
        btn.classList.add("artifact-slot--cooldown");
        const cdEl = document.createElement("span");
        cdEl.className = "artifact-slot-cd";
        cdEl.textContent = `${slot.cooldown.toFixed(1)}с`;
        btn.appendChild(cdEl);
      }
    }
  }

  function renderPurchasedUpgrades() {
    if (!purchasedUpgradesWrap || !state) return;
    purchasedUpgradesWrap.innerHTML = "";
    const purchased = state.shopPurchased || {};
    for (const def of SHOP_UPGRADE_DEFS) {
      if (!def.persistent) continue;
      const count = purchased[def.key] || 0;
      if (count <= 0) continue;
      const el = document.createElement("div");
      el.className = "upgrade-badge";
      const isBrokenAegis = def.key === "aegis" && state.aegisBroken;
      if (isBrokenAegis) el.classList.add("upgrade-badge--broken");
      const tooltip = isBrokenAegis ? `${def.name}: сломана после воскрешения.` : `${def.name}: ${def.desc}`;
      el.title = tooltip;
      el.dataset.tooltip = tooltip;
      const vid = isBrokenAegis ? "game_aegis_broken" : def.visualId;
      const iconHtml = vid ? visualIconOuterHtml(vid, "badge-visual") : `<span>${escapeHtml(def.icon)}</span>`;
      el.innerHTML = `<span class="badge-icon" aria-hidden="true">${iconHtml}</span><span class="badge-count">${count}</span>`;
      purchasedUpgradesWrap.appendChild(el);
    }
    const artifactOwned = state.artifactOwned || {};
    for (const [artifactId, count] of Object.entries(artifactOwned)) {
      if (!count) continue;
      const def = ARTIFACT_DEFS.find((a) => a.id === artifactId);
      if (!def) continue;
      const el = document.createElement("div");
      el.className = "upgrade-badge";
      const tooltip = `${def.name}: ${def.desc}`;
      el.title = tooltip;
      el.dataset.tooltip = tooltip;
      const iconHtml = def.visualId
        ? visualIconOuterHtml(def.visualId, "badge-visual")
        : `<span>${escapeHtml(def.icon || "✨")}</span>`;
      el.innerHTML = `<span class="badge-icon" aria-hidden="true">${iconHtml}</span><span class="badge-count">${count}</span>`;
      purchasedUpgradesWrap.appendChild(el);
    }
    if ((state.booksOwned || 0) > 0) {
      const el = document.createElement("div");
      el.className = "upgrade-badge";
      el.title = "Пустые свитки заклинаний";
      el.dataset.tooltip = "Пустые свитки заклинаний";
      el.innerHTML = `<span class="badge-icon" aria-hidden="true">${visualIconOuterHtml(
        "game_artifact_empty_spell_scroll",
        "badge-visual"
      )}</span><span class="badge-count">${state.booksOwned}</span>`;
      purchasedUpgradesWrap.appendChild(el);
    }
  }

  function openShop() {
    if (!state || state.gameOver || state.victory || !shopScreen) return;
    if (isPauseMenuOpen()) closePauseMenu();
    paused = true;
    shopScreen.classList.remove("hidden");
    shopScreen.setAttribute("aria-hidden", "false");
    renderShopUi();
  }

  function closeShop() {
    if (!shopScreen || !isShopOpen()) return;
    shopScreen.classList.add("hidden");
    shopScreen.setAttribute("aria-hidden", "true");
    paused = false;
  }

  function formatTime(secTotal) {
    const m = (secTotal / 60) | 0;
    const sec = (secTotal % 60) | 0;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  function showWaveRewardToast(text) {
    if (!waveRewardToastWrap) return;
    const el = document.createElement("div");
    el.className = "wave-reward-toast";
    el.textContent = text;
    waveRewardToastWrap.appendChild(el);
    setTimeout(() => {
      if (el.parentNode === waveRewardToastWrap) waveRewardToastWrap.removeChild(el);
    }, 2800);
  }

  function closeArtifactChoice() {
    if (!artifactChoiceScreen || !isArtifactChoiceOpen()) return;
    artifactChoiceScreen.classList.add("hidden");
    artifactChoiceScreen.setAttribute("aria-hidden", "true");
    paused = false;
  }

  function applyArtifactChoice(def) {
    if (!state || !def) return;
    if (def.kind === "spellbook") {
      state.booksOwned += 1;
      showWaveRewardToast("Получен пустой свиток заклинаний");
    } else {
      def.apply(state.stats);
      state.artifactsTaken.add(def.id);
      if (!state.artifactOwned) state.artifactOwned = {};
      state.artifactOwned[def.id] = (state.artifactOwned[def.id] || 0) + 1;
    }
    closeArtifactChoice();
    updateHud();
    renderArtifactSlots();
  }

  function openArtifactChoice(choices) {
    if (!artifactChoiceScreen || !artifactChoiceList || !state) return;
    artifactChoiceList.innerHTML = "";
    for (const def of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "artifact-choice-btn";
      const left = document.createElement("span");
      left.className = "artifact-choice-left";
      if (def.kind === "spellbook") {
        const iconSlot = document.createElement("span");
        iconSlot.className = "artifact-choice-icon";
        const svg = renderIconElement("game_shop_spellbook", { className: "visual-icon" });
        if (svg) iconSlot.appendChild(svg);
        left.appendChild(iconSlot);
      } else if (def.visualId) {
        const iconSlot = document.createElement("span");
        iconSlot.className = "artifact-choice-icon";
        const svg = renderIconElement(def.visualId, { className: "visual-icon" });
        if (svg) iconSlot.appendChild(svg);
        left.appendChild(iconSlot);
      }
      const main = document.createElement("span");
      main.className = "artifact-choice-main";
      main.innerHTML = `<strong>${escapeHtml(def.name)}</strong><em>${escapeHtml(def.desc)}</em>`;
      left.appendChild(main);
      const rare = document.createElement("span");
      rare.className = "artifact-choice-rarity";
      rare.textContent = def.rarity || "Выбор";
      btn.appendChild(left);
      btn.appendChild(rare);
      btn.addEventListener("click", () => applyArtifactChoice(def));
      artifactChoiceList.appendChild(btn);
    }
    paused = true;
    artifactChoiceScreen.classList.remove("hidden");
    artifactChoiceScreen.setAttribute("aria-hidden", "false");
  }

  function renderCombosList() {
    if (!combosList) return;
    const all = [...DUAL_RUNE_COMBOS, ...INVOKE_COMBOS];
    combosList.innerHTML = "";
    for (const c of all) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "combo-tile";
      tile.dataset.toolSkillId = c.id;
      tile.setAttribute("aria-label", `${c.name}, комбо ${c.sequence}`);
      const tileIcon = c.visualId
        ? visualIconOuterHtml(c.visualId, "combo-tile-visual")
        : `<span>${escapeHtml(c.icon)}</span>`;
      tile.innerHTML =
        `<span class="combo-tile-icon" aria-hidden="true">${tileIcon}</span>` +
        `<span class="combo-tile-seq rune-seq-icons" aria-hidden="true">${formatSkillSequenceIconsHtml(c.sequence)}</span>`;
      combosList.appendChild(tile);
    }
  }

  function openCombosPanel() {
    if (!combosPanel) return;
    renderCombosList();
    combosPanel.classList.remove("hidden");
    combosPanel.setAttribute("aria-hidden", "false");
  }

  function closeCombosPanel() {
    if (!combosPanel || !isCombosOpen()) return;
    combosPanel.classList.add("hidden");
    combosPanel.setAttribute("aria-hidden", "true");
  }

  function toggleCombosPanel() {
    if (isCombosOpen()) closeCombosPanel();
    else openCombosPanel();
  }

  function trySpendCoins(cost) {
    if (!state) return false;
    if (state.stats.coins < cost) return false;
    state.stats.coins -= cost;
    return true;
  }

  function buyHeal() {
    if (!trySpendCoins(SHOP_COST_HEAL)) return;
    const s = state.stats;
    s.hp = Math.min(s.maxHp, s.hp + 300);
    state.shopPurchased.heal++;
    renderShopUi();
    renderPurchasedUpgrades();
    updateHud();
  }

  function buyHpBoost() {
    if (!trySpendCoins(SHOP_COST_HP)) return;
    const s = state.stats;
    s.maxHp += 100;
    s.hp = Math.min(s.maxHp, s.hp + 100);
    state.shopPurchased.hp++;
    renderShopUi();
    renderPurchasedUpgrades();
    updateHud();
  }

  function buySpeedBoost() {
    if (!trySpendCoins(SHOP_COST_SPEED)) return;
    state.stats.moveSpeed *= 1.1;
    state.shopPurchased.speed++;
    renderShopUi();
    renderPurchasedUpgrades();
    updateHud();
  }

  function buyAegis() {
    if (!state || state.aegisBought) return;
    if (!trySpendCoins(SHOP_COST_AEGIS)) return;
    state.aegisBought = true;
    state.aegisBroken = false;
    state.shopPurchased.aegis = 1;
    renderShopUi();
    renderPurchasedUpgrades();
    updateHud();
  }

  function buySpellbook() {
    if (!state) return;
    if ((state.shopPurchased.spellbook || 0) >= 1) return;
    if (!trySpendCoins(SHOP_COST_SPELLBOOK)) return;
    state.shopPurchased.spellbook = 1;
    state.booksOwned += 1;
    renderShopUi();
    renderPurchasedUpgrades();
    renderArtifactSlots();
    updateHud();
  }

  function tryConsumeAegisOnFatalHit() {
    if (!state || !state.aegisBought || state.aegisBroken) return false;
    state.aegisBroken = true;
    state.stats.hp = 0;
    const p = state.player;
    state.revivePending = { x: p.x, y: p.y, timer: 0 };
    state.playerInvulnerability = 0;
    moveTarget = null;
    renderPurchasedUpgrades();
    updateHud();
    return true;
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.repeat) return;

      if (exitConfirmModal && !exitConfirmModal.classList.contains("hidden")) {
        if (e.code === "Escape") {
          e.preventDefault();
          closeExitConfirmModal();
        }
        return;
      }

      if (settingsModal && !settingsModal.classList.contains("hidden")) {
        if (e.code === "Escape") {
          e.preventDefault();
          closeSettingsModal();
        }
        return;
      }
      if (patchModal && !patchModal.classList.contains("hidden")) {
        if (e.code === "Escape") {
          e.preventDefault();
          closePatchModal();
        }
        return;
      }

      if (!startScreen || startScreen.classList.contains("hidden") === false) return;
      if (!state || state.gameOver) return;
      if (e.code === "KeyM") {
        e.preventDefault();
        if (isShopOpen()) closeShop();
        else openShop();
        return;
      }
      if (e.code === "KeyK") {
        e.preventDefault();
        toggleCombosPanel();
        return;
      }
      if (e.code === "Escape") {
        e.preventDefault();
        togglePauseOrDismissOverlays();
      }
    },
    true
  );

  if (btnResume) btnResume.addEventListener("click", closePauseMenu);
  if (btnPause) btnPause.addEventListener("click", togglePauseOrDismissOverlays);
  if (btnExitMenu) btnExitMenu.addEventListener("click", openExitToMenuFromGame);
  if (btnExitCancel) btnExitCancel.addEventListener("click", closeExitConfirmModal);
  if (btnExitConfirm) btnExitConfirm.addEventListener("click", confirmExitToMainMenu);
  if (exitConfirmModal) {
    exitConfirmModal.addEventListener("click", (e) => {
      if (e.target === exitConfirmModal) closeExitConfirmModal();
    });
  }
  if (btnShop) btnShop.addEventListener("click", openShop);
  if (btnShopClose) btnShopClose.addEventListener("click", closeShop);
  if (btnBuyHeal) btnBuyHeal.addEventListener("click", buyHeal);
  if (btnBuyHp) btnBuyHp.addEventListener("click", buyHpBoost);
  if (btnBuySpeed) btnBuySpeed.addEventListener("click", buySpeedBoost);
  if (btnBuyAegis) btnBuyAegis.addEventListener("click", buyAegis);
  if (btnBuySpellbook) btnBuySpellbook.addEventListener("click", buySpellbook);
  if (btnCombos) btnCombos.addEventListener("click", toggleCombosPanel);
  if (btnCombosClose) btnCombosClose.addEventListener("click", closeCombosPanel);
  artifactSlotButtons.forEach((btn, idx) => {
    if (!btn) return;
    btn.addEventListener("click", () => triggerArtifactSlot(idx));
  });

  if (btnContinue) btnContinue.addEventListener("click", () => resumeGame({ pauseAfterLoad: true }));
  if (btnNewGame) btnNewGame.addEventListener("click", startGame);
  if (btnSettings) btnSettings.addEventListener("click", openSettingsModal);
  if (btnPatchNotes) btnPatchNotes.addEventListener("click", openPatchModal);
  if (btnSettingsClose) btnSettingsClose.addEventListener("click", closeSettingsModal);
  if (btnPatchClose) btnPatchClose.addEventListener("click", closePatchModal);
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }
  if (patchModal) {
    patchModal.addEventListener("click", (e) => {
      if (e.target === patchModal) closePatchModal();
    });
  }

  document.getElementById("btn-restart").addEventListener("click", startGame);
  const btnMainMenu = document.getElementById("btn-main-menu");
  if (btnMainMenu) btnMainMenu.addEventListener("click", returnToMainMenu);
  document.getElementById("btn-victory-restart").addEventListener("click", startGame);
  const btnVictoryMainMenu = document.getElementById("btn-victory-main-menu");
  if (btnVictoryMainMenu) btnVictoryMainMenu.addEventListener("click", returnToMainMenu);

  window.addEventListener("beforeunload", () => {
    if (state && !state.gameOver && !state.victory) persistRunSave(state);
  });

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function spawnDamageFloater(worldX, worldY, amount, targetKind) {
    if (!state || amount <= 0) return;
    const n = Math.max(1, Math.round(amount));
    if (!state.damageFloaters) state.damageFloaters = [];
    state.damageFloaters.push({
      x: worldX + rand(-6, 6),
      y: worldY + rand(-5, 5),
      text: String(n),
      life: 0.78,
      maxLife: 0.78,
      vy: targetKind === "player" ? -52 : -44,
      kind: targetKind,
    });
  }

  function updateDamageFloaters(dt) {
    if (!state?.damageFloaters?.length) return;
    for (let i = state.damageFloaters.length - 1; i >= 0; i--) {
      const f = state.damageFloaters[i];
      f.life -= dt;
      f.y += f.vy * dt;
      if (f.life <= 0) state.damageFloaters.splice(i, 1);
    }
  }

  function drawDamageFloaters(ctx) {
    if (!state?.damageFloaters?.length) return;
    ctx.save();
    ctx.font = "bold 14px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of state.damageFloaters) {
      const k = f.life / Math.max(0.001, f.maxLife);
      ctx.globalAlpha = Math.min(1, k * 1.25);
      const fill = f.kind === "player" ? "#ff7a7a" : "#ffd27a";
      ctx.strokeStyle = "rgba(10, 8, 20, 0.7)";
      ctx.lineWidth = 3.2;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = fill;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function circleRectOverlap(cx, cy, cr, b) {
    const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
    const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  function circleHitsBlocks(cx, cy, cr) {
    if (!state || !state.blocks) return false;
    for (const b of state.blocks) {
      if (circleRectOverlap(cx, cy, cr, b)) return true;
    }
    for (const wall of state.iceWalls || []) {
      for (const seg of wall.segments || []) {
        if (distancePointToSegment(cx, cy, seg.x1, seg.y1, seg.x2, seg.y2) <= cr + seg.thickness * 0.5) return true;
      }
    }
    return false;
  }

  function buildObstacleZones() {
    const ww = WORLD_W;
    const wh = WORLD_H;
    const safe = { x: ww / 2 - 420, y: wh / 2 - 420, w: 840, h: 840 };
    function overlapsSafe(b) {
      return !(b.x + b.w <= safe.x || b.x >= safe.x + safe.w || b.y + b.h <= safe.y || b.y >= safe.y + safe.h);
    }
    const blocks = [];
    const W = BORDER_WALL;
    blocks.push({ x: 0, y: 0, w: ww, h: W });
    blocks.push({ x: 0, y: wh - W, w: ww, h: W });
    blocks.push({ x: 0, y: 0, w: W, h: wh });
    blocks.push({ x: ww - W, y: 0, w: W, h: wh });

    let guard = 0;
    while (blocks.length < 38 && guard < 500) {
      guard++;
      const roll = Math.random();
      let b;
      if (roll < 0.38) {
        b = { x: rand(80, ww - 520), y: rand(80, wh - 140), w: rand(220, 480), h: rand(50, 110) };
      } else if (roll < 0.76) {
        b = { x: rand(80, ww - 140), y: rand(80, wh - 520), w: rand(50, 110), h: rand(220, 480) };
      } else {
        const s = rand(100, 260);
        b = { x: rand(80, ww - s - 80), y: rand(80, wh - s - 80), w: s, h: s };
      }
      if (overlapsSafe(b)) continue;
      blocks.push(b);
    }
    return blocks;
  }

  async function boot() {
    await preloadVisualsForCanvas(ALL_VISUAL_IDS);
    mountStaticChromeIcons();
    validateSkillsConfig();
    loadSettingsToUi();
    buildSkillBarSlots();
    initSkillBarTooltips();
    buildInvokeCooldownRow();
    renderInvokeCooldownRow();
    refreshContinueButton();
    rafId = requestAnimationFrame(tick);
  }

  let state = null;
  let lastT = 0;
  let paused = false;
  let rafId = 0;

  function defaultStats() {
    return {
      hp: PLAYER_BASE_MAX_HP,
      maxHp: PLAYER_BASE_MAX_HP,
      moveSpeed: BASE_PLAYER_MOVE_SPEED,
      pickupRadius: 110,
      fireballDamage: 22,
      fireballBlastRadius: 72,
      iceSpearDamage: 18,
      iceSpearPierce: BASE_ICE_PIERCE,
      lightningDamage: 16,
      coins: 0,
      time: 0,
      kills: 0,
      spawnAcc: 0,
      takenIds: new Set(),
    };
  }

  function makeWaveState() {
    return {
      index: 1,
      timer: 0,
      completed: 0,
      bossSpawned: false,
      hadEnemies: false,
      portals: [],
    };
  }

  function getWaveConfig(index) {
    return WAVE_CONFIGS[Math.max(0, Math.min(TOTAL_WAVES - 1, index - 1))];
  }

  function pickEnemyTypeForWave(waveCfg) {
    if (!waveCfg || !waveCfg.enemyPool || !waveCfg.enemyPool.length) return "melee";
    return waveCfg.enemyPool[(Math.random() * waveCfg.enemyPool.length) | 0];
  }

  function rollArtifactChoices() {
    if (!state) return [];
    const eligible = ARTIFACT_DEFS.filter((a) => !(a.unique && state.artifactsTaken.has(a.id))).map((a) => ({
      kind: "artifact",
      key: a.id,
      weight: a.weight,
      data: a,
    }));
    eligible.push({
      kind: "spellbook",
      key: "spellbook",
      weight: 18 + state.wave.index * 1.2,
      data: {
        kind: "spellbook",
        name: "Пустой свиток заклинаний",
        desc: "Открывает или усиливает слот активного артефакта под Invoke-комбо.",
        rarity: "Особый",
      },
    });
    const picked = [];
    const used = new Set();
    while (picked.length < 3 && eligible.length > 0) {
      let total = 0;
      for (const item of eligible) {
        if (used.has(item.key)) continue;
        const a = item.data;
        const waveBoost =
          item.kind === "artifact" ? (a.rarity === "Редкий" ? state.wave.index * 2 : a.rarity === "Эпический" ? state.wave.index * 3 : 0) : 0;
        total += item.weight + waveBoost;
      }
      if (total <= 0) break;
      let roll = Math.random() * total;
      let selected = null;
      for (const item of eligible) {
        if (used.has(item.key)) continue;
        const a = item.data;
        const w =
          item.weight +
          (item.kind === "artifact" ? (a.rarity === "Редкий" ? state.wave.index * 2 : a.rarity === "Эпический" ? state.wave.index * 3 : 0) : 0);
        roll -= w;
        if (roll <= 0) {
          selected = item;
          break;
        }
      }
      if (!selected) break;
      used.add(selected.key);
      picked.push(selected.data);
    }
    return picked;
  }

  function resetWorld() {
    return {
      player: { x: WORLD_W * 0.5, y: WORLD_H * 0.5, r: 14 },
      blocks: buildObstacleZones(),
      enemies: [],
      gems: [],
      healPickups: [],
      artifactPickups: [],
      mines: [],
      volcanoes: [],
      rollingMeteor: null,
      firePuddles: [],
      iceWalls: [],
      playerShots: [],
      enemyBullets: [],
      nextEnemyId: 1,
      stats: defaultStats(),
      wave: makeWaveState(),
      skillIconQueue: [],
      invokePayload: null,
      invokeSpellCd: createInvokeCooldownState(),
      fireCones: [],
      aegisReviveFx: null,
      revivePending: null,
      playerInvulnerability: 0,
      shopPurchased: { heal: 0, hp: 0, speed: 0, aegis: 0, spellbook: 0 },
      aegisBought: false,
      aegisBroken: false,
      booksOwned: 0,
      artifactSlots: [
        { artifactId: null, selectedSequence: null, cooldown: 0 },
        { artifactId: null, selectedSequence: null, cooldown: 0 },
        { artifactId: null, selectedSequence: null, cooldown: 0 },
      ],
      pendingRuneCast: null,
      dualSharedCd: 0,
      activeShield: null,
      cloneActiveShield: null,
      iceResonator: null,
      worldAnchor: null,
      eewCone: null,
      weeClone: null,
      invokeHasteUntil: 0,
      fireTrail: null,
      overchargeUntil: 0,
      fearAura: null,
      elementalSpin: null,
      armamentRecollection: null,
      hailStorm: null,
      windGust: null,
      beamChannel: null,
      lightningDash: null,
      blackHole: null,
      vfx: [],
      damageFloaters: [],
      events: {
        active: null,
        spawnedOn: new Set(),
      },
      artifactsTaken: new Set(),
      artifactOwned: {},
      pendingArtifactChoices: null,
      gameOver: false,
      victory: false,
    };
  }

  function spawnEnemyByType(type, waveCfg, isElite = false, spawnPos = null) {
    const p = state.player;
    const waveIndex = state.wave.index;
    const difficulty = 1 + waveIndex * 0.18;
    const isShooter = type === "shooter" || type === "sniper";
    const er = isShooter ? 14 : 10 + Math.min(6, difficulty * 0.15);
    let x = p.x;
    let y = p.y;
    if (spawnPos && Number.isFinite(spawnPos.x) && Number.isFinite(spawnPos.y)) {
      x = spawnPos.x;
      y = spawnPos.y;
      const margin = BORDER_WALL + er + 8;
      x = Math.max(margin, Math.min(WORLD_W - margin, x));
      y = Math.max(margin, Math.min(WORLD_H - margin, y));
      if (circleHitsBlocks(x, y, er + 2)) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const ang = rand(0, Math.PI * 2);
          const dist = 20 + attempt * 10;
          const tx = x + Math.cos(ang) * dist;
          const ty = y + Math.sin(ang) * dist;
          if (!circleHitsBlocks(tx, ty, er + 2)) {
            x = tx;
            y = ty;
            break;
          }
        }
      }
    } else {
      for (let attempt = 0; attempt < 14; attempt++) {
        const ang = rand(0, Math.PI * 2);
        const dist = rand(480, 820);
        x = p.x + Math.cos(ang) * dist;
        y = p.y + Math.sin(ang) * dist;
        const margin = BORDER_WALL + er + 8;
        x = Math.max(margin, Math.min(WORLD_W - margin, x));
        y = Math.max(margin, Math.min(WORLD_H - margin, y));
        if (!circleHitsBlocks(x, y, er + 2)) break;
      }
    }
    const tm = state.stats.time;
    const t = Math.min(1, tm / 120);
    const hpCurve = 12 * Math.pow(t, 1.25) + waveIndex * 6;
    let baseHp = (17 + difficulty * 1.45 + hpCurve) * waveCfg.hpMul;
    let baseDmgMul = waveCfg.dmgMul;
    let baseSpeedMul = waveCfg.speedMul;
    if (type === "tank") {
      baseHp *= 1.85;
      baseSpeedMul *= 0.72;
      baseDmgMul *= 1.2;
    } else if (type === "runner") {
      baseHp *= 0.7;
      baseSpeedMul *= 1.32;
      baseDmgMul *= 0.92;
    } else if (type === "sniper") {
      baseHp *= 0.9;
      baseSpeedMul *= 0.9;
      baseDmgMul *= 1.32;
    }
    if (isElite) {
      baseHp *= 2.35;
      baseDmgMul *= 1.45;
      baseSpeedMul *= 1.08;
    }
    baseHp *= ENEMY_HP_GLOBAL_MUL;
    if (waveIndex < 6) {
      const cap = PLAYER_BASE_MAX_HP * (0.34 + waveIndex * 0.15);
      baseHp = Math.min(baseHp, cap);
    }
    const id = state.nextEnemyId++;

    if (isShooter) {
      state.enemies.push({
        kind: type,
        id,
        x,
        y,
        r: er,
        hp: baseHp * 0.92,
        maxHp: baseHp * 0.92,
        speed: (68 + difficulty * 2.2 + t * 28) * baseSpeedMul * GLOBAL_PACE.enemySpeedMul,
        dmg: (6 + difficulty * 0.35) * baseDmgMul,
        touchCd: 0,
        shootCd: rand(0.15, 0.85),
        shootInterval: 0.85 + Math.random() * 0.45,
        bulletSpeed: 400,
        bulletDmg: (8 + difficulty * 0.38 + t * 2) * baseDmgMul,
        elite: isElite,
        statuses: {},
      });
    } else {
      const spd = (55 + difficulty * 3.5 + t * 55) * baseSpeedMul * GLOBAL_PACE.enemySpeedMul;
      state.enemies.push({
        kind: type,
        id,
        x,
        y,
        r: er,
        hp: baseHp,
        maxHp: baseHp,
        speed: spd,
        dmg: (8 + difficulty * 0.4) * baseDmgMul,
        touchCd: 0,
        elite: isElite,
        statuses: {},
      });
    }
  }

  function spawnWaveEnemy(fromPos = null) {
    const waveCfg = getWaveConfig(state.wave.index);
    const type = pickEnemyTypeForWave(waveCfg);
    if (type === "boss1" || type === "boss2") return;
    spawnEnemyByType(type, waveCfg, false, fromPos);
    state.wave.hadEnemies = true;
  }

  function getWavePortalCount(waveIndex) {
    if (waveIndex <= 2) return 1;
    if (waveIndex <= 4) return 2;
    if (waveIndex <= 6) return 3;
    if (waveIndex <= 8) return 4;
    return 5;
  }

  function ensureWavePortals() {
    if (!state || state.wave.portals.length > 0) return;
    const count = getWavePortalCount(state.wave.index);
    const p = state.player;
    for (let i = 0; i < count; i++) {
      let x = p.x;
      let y = p.y;
      for (let attempt = 0; attempt < 24; attempt++) {
        const ang = rand(0, Math.PI * 2);
        const dist = rand(560, 980);
        x = p.x + Math.cos(ang) * dist;
        y = p.y + Math.sin(ang) * dist;
        const margin = BORDER_WALL + 36;
        x = Math.max(margin, Math.min(WORLD_W - margin, x));
        y = Math.max(margin, Math.min(WORLD_H - margin, y));
        if (!circleHitsBlocks(x, y, 22)) break;
      }
      state.wave.portals.push({ x, y, warmup: SKILLS_GLOBAL_CFG.portal?.warmupSec || 1.2, spawnAcc: 0 });
    }
  }

  function updateWavePortals(dt) {
    if (!state || !state.wave.portals.length) return;
    const portalCfg = SKILLS_GLOBAL_CFG.portal || {};
    const phaseSec = state.wave.timer;
    const openingSec = portalCfg.openingSec || 15;
    const midSec = portalCfg.midSec || 45;
    const baseRate =
      phaseSec < openingSec
        ? portalCfg.spawnRateByPhase?.opening || 0.55
        : phaseSec < midSec
          ? portalCfg.spawnRateByPhase?.mid || 1.0
          : portalCfg.spawnRateByPhase?.closing || 0.7;
    const waveCfg = getWaveConfig(state.wave.index);
    const cap = (portalCfg.activeEnemyCapBase || 28) + state.wave.index * (portalCfg.activeEnemyCapPerWave || 3);
    for (const portal of state.wave.portals) {
      if (portal.warmup > 0) {
        portal.warmup -= dt;
        continue;
      }
      if (state.enemies.length >= cap) continue;
      portal.spawnAcc += dt * baseRate * (waveCfg.spawnRate || 1) * GLOBAL_PACE.spawnRateMul;
      while (portal.spawnAcc >= 1 && state.enemies.length < cap) {
        portal.spawnAcc -= 1;
        spawnWaveEnemy({ x: portal.x, y: portal.y });
      }
    }
  }

  function spawnHealthPickup(x, y) {
    if (state.healPickups.length >= HEALTH_PICKUP_CAP) return;
    const margin = BORDER_WALL + 14;
    x = Math.max(margin, Math.min(WORLD_W - margin, x + rand(-10, 10)));
    y = Math.max(margin, Math.min(WORLD_H - margin, y + rand(-10, 10)));
    if (circleHitsBlocks(x, y, 10)) return;
    const tm = state.stats.time;
    const heal = Math.min(550, Math.round(200 + tm * 3.2));
    state.healPickups.push({
      x,
      y,
      v: rand(3, 9),
      r: 8,
      heal,
    });
  }

  function dropGem(ex, ey, amount) {
    for (let i = 0; i < amount; i++) {
      state.gems.push({
        x: ex + rand(-8, 8),
        y: ey + rand(-8, 8),
        v: rand(4, 10),
        r: 5,
        xp: 0,
      });
    }
  }

  function spawnArtifactPickup(x, y, choices) {
    if (!choices || !choices.length) return;
    const margin = BORDER_WALL + 14;
    const px = Math.max(margin, Math.min(WORLD_W - margin, x + rand(-8, 8)));
    const py = Math.max(margin, Math.min(WORLD_H - margin, y + rand(-8, 8)));
    if (circleHitsBlocks(px, py, 12)) return;
    state.artifactPickups.push({
      x: px,
      y: py,
      r: 10,
      choices,
      phase: rand(0, Math.PI * 2),
    });
  }

  function spawnBoss(stage) {
    const p = state.player;
    const bossId = state.nextEnemyId++;
    const ang = rand(0, Math.PI * 2);
    const dist = rand(360, 560);
    let x = p.x + Math.cos(ang) * dist;
    let y = p.y + Math.sin(ang) * dist;
    const r = stage === 1 ? 28 : 36;
    const margin = BORDER_WALL + r + 12;
    x = Math.max(margin, Math.min(WORLD_W - margin, x));
    y = Math.max(margin, Math.min(WORLD_H - margin, y));
    const bossHp1 = Math.round(PLAYER_BASE_MAX_HP * 3.6);
    const bossHp2 = Math.round(PLAYER_BASE_MAX_HP * 6.4);
    state.enemies.push({
      kind: stage === 1 ? "boss1" : "boss2",
      stage,
      id: bossId,
      x,
      y,
      r,
      hp: stage === 1 ? bossHp1 : bossHp2,
      maxHp: stage === 1 ? bossHp1 : bossHp2,
      speed: stage === 1 ? 80 : 94,
      dmg: stage === 1 ? 16 : 24,
      touchCd: 0,
      shootCd: 0.45,
      shootInterval: stage === 1 ? 1.1 : 0.75,
      bulletSpeed: stage === 1 ? 420 : 520,
      bulletDmg: stage === 1 ? 12 : 18,
      elite: false,
      statuses: {},
    });
  }

  function onEnemyKilled(e) {
    const gemAmount = e.kind === "boss1" ? 22 : e.kind === "boss2" ? 40 : e.elite ? 12 : 1 + ((Math.random() * 2) | 0);
    dropGem(e.x, e.y, gemAmount);
    if (Math.random() < HEALTH_PICKUP_DROP_CHANCE) spawnHealthPickup(e.x, e.y);
    if (e.elite && state.pendingArtifactChoices) {
      spawnArtifactPickup(e.x, e.y, state.pendingArtifactChoices);
      state.pendingArtifactChoices = null;
    }
    if (e.kind === "boss1" || e.kind === "boss2") {
      state.wave.bossSpawned = false;
      finishWave();
    }
    if (e.kind === "boss2") {
      state.victory = true;
    }
  }

  function getWaveProgressFraction() {
    if (!state) return 0;
    const phase = (state.wave.index - 1 + Math.min(1, state.wave.timer / WAVE_DURATION_SEC)) / TOTAL_WAVES;
    return Math.max(0, Math.min(1, phase));
  }

  function finishWave() {
    if (!state || state.wave.completed >= state.wave.index) return;
    const waveCfg = getWaveConfig(state.wave.index);
    state.wave.completed = state.wave.index;
    const heal = Math.round(state.stats.maxHp * WAVE_HEAL_PERCENT);
    state.stats.hp = Math.min(state.stats.maxHp, state.stats.hp + heal);
    state.stats.coins += waveCfg.rewardGold;
    showWaveRewardToast(`Волна ${state.wave.index}: +${heal} HP, +${waveCfg.rewardGold} золота`);
    if (state.wave.index >= TOTAL_WAVES) return;
    state.wave.index++;
    state.wave.timer = 0;
    state.wave.bossSpawned = false;
    state.wave.hadEnemies = false;
    state.wave.portals = [];
  }

  function ensureWaveBossSpawn() {
    if (!state) return;
    if (state.wave.bossSpawned) return;
    if (state.wave.index === 5) {
      spawnBoss(1);
      state.wave.bossSpawned = true;
      state.wave.hadEnemies = true;
    } else if (state.wave.index === 10) {
      spawnBoss(2);
      state.wave.bossSpawned = true;
      state.wave.hadEnemies = true;
    }
  }

  function spawnEventMarker(waveIndex) {
    if (!state || state.events.active) return;
    const p = state.player;
    let x = p.x;
    let y = p.y;
    for (let attempt = 0; attempt < 20; attempt++) {
      const ang = rand(0, Math.PI * 2);
      const dist = rand(280, 560);
      x = p.x + Math.cos(ang) * dist;
      y = p.y + Math.sin(ang) * dist;
      const margin = BORDER_WALL + 38;
      x = Math.max(margin, Math.min(WORLD_W - margin, x));
      y = Math.max(margin, Math.min(WORLD_H - margin, y));
      if (!circleHitsBlocks(x, y, 42)) break;
    }
    state.events.active = { waveIndex, x, y, r: 52, progress: 0, state: "idle", timer: 0 };
    state.events.spawnedOn.add(waveIndex);
  }

  function updateEventSystem(dt) {
    if (!state) return;
    if (EVENT_WAVES.includes(state.wave.index) && !state.events.spawnedOn.has(state.wave.index) && !state.events.active) {
      spawnEventMarker(state.wave.index);
    }
    const ev = state.events.active;
    if (!ev) return;
    if (ev.state === "summoned") return;
    const p = state.player;
    const inside = Math.hypot(p.x - ev.x, p.y - ev.y) <= ev.r - p.r * 0.3;
    if (ev.state === "idle") {
      const delta = dt / EVENT_CHANNEL_SEC;
      ev.progress = Math.max(0, Math.min(1, ev.progress + (inside ? delta : -delta)));
      if (ev.progress >= 1) {
        ev.state = "charging";
        ev.timer = EVENT_SUMMON_DELAY_SEC;
      }
      return;
    }
    if (ev.state === "charging") {
      ev.timer -= dt;
      if (ev.timer <= 0) {
        const waveCfg = getWaveConfig(state.wave.index);
        spawnEnemyByType("tank", waveCfg, true, { x: ev.x, y: ev.y });
        state.pendingArtifactChoices = rollArtifactChoices();
        state.events.active = null;
      }
    }
  }

  function applyFireballBlast(cx, cy, radius, dmg) {
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (Math.hypot(cx - e.x, cy - e.y) < radius + e.r) {
        spawnDamageFloater(e.x, e.y - e.r - 6, dmg, "enemy");
        e.hp -= dmg;
        onIceResonatorDamageTrigger(e.x, e.y, dmg);
        if (e.hp <= 0) {
          state.enemies.splice(j, 1);
          state.stats.kills++;
          onEnemyKilled(e);
        }
      }
    }
  }

  function updatePlayerShots(dt) {
    const shots = state.playerShots;
    for (let i = shots.length - 1; i >= 0; i--) {
      const pr = shots[i];
      if (pr.kind === "fire_yoyo") {
        if (pr.phase === "out") {
          pr.x += pr.vx * dt;
          pr.y += pr.vy * dt;
          const dxRange = pr.x - pr.startX;
          const dyRange = pr.y - pr.startY;
          if (Math.hypot(dxRange, dyRange) >= pr.maxRange) {
            pr.phase = "return";
            pr.phaseHitIds.clear();
          }
        } else {
          const p = state.player;
          const dx = p.x - pr.x;
          const dy = p.y - pr.y;
          const len = Math.hypot(dx, dy) || 1;
          const step = pr.returnSpeed * dt;
          if (len <= step + p.r * 0.7) {
            shots.splice(i, 1);
            continue;
          }
          pr.x += (dx / len) * step;
          pr.y += (dy / len) * step;
        }
      } else {
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
      }
      pr.life -= dt;
      const coneEew = state.eewCone;
      if (coneEew && !pr.eewBuffed && pointInEewCone(pr.x, pr.y, coneEew)) {
        pr.eewBuffed = true;
        const mul = 1.15;
        pr.dmg *= mul;
        if (pr.kind === "fireball") {
          pr.vx *= mul;
          pr.vy *= mul;
          pr.life *= mul;
          if (typeof pr.blastR === "number") pr.blastR *= mul;
        } else if (pr.kind === "lightning" || pr.kind === "ice" || pr.kind === "volcano_shot") {
          pr.vx *= mul;
          pr.vy *= mul;
          pr.life *= mul;
          if (typeof pr.maxRange === "number") pr.maxRange *= mul;
        } else if (pr.kind === "wall_seed") {
          pr.vx *= mul;
          pr.vy *= mul;
          if (typeof pr.maxRange === "number") pr.maxRange *= mul;
        } else if (pr.kind === "fire_yoyo") {
          pr.returnSpeed *= mul;
          pr.maxRange *= mul;
        }
      }
      if (pr.kind === "wall_seed") {
        const dxRange = pr.x - pr.startX;
        const dyRange = pr.y - pr.startY;
        if (Math.hypot(dxRange, dyRange) >= pr.maxRange) {
          spawnHorseshoeIceWall(pr.x, pr.y, Math.atan2(pr.vy, pr.vx), 10);
          shots.splice(i, 1);
          continue;
        }
      }
      if (pr.kind === "volcano_shot") {
        const dxRange = pr.x - pr.originX;
        const dyRange = pr.y - pr.originY;
        if (Math.hypot(dxRange, dyRange) >= pr.maxRange) {
          shots.splice(i, 1);
          continue;
        }
      }
      if (pr.life <= 0 || pr.x < -100 || pr.x > WORLD_W + 100 || pr.y < -100 || pr.y > WORLD_H + 100) {
        shots.splice(i, 1);
        continue;
      }
      const hitR = pr.kind === "fireball" ? 6 : pr.kind === "volcano_shot" ? 5 : pr.kind === "lightning" ? 3 : pr.kind === "wall_seed" ? 6 : pr.kind === "fire_yoyo" ? pr.hitR : 4;
      if (circleHitsBlocks(pr.x, pr.y, hitR)) {
        if (pr.kind === "fire_yoyo") {
          if (pr.phase === "out") {
            pr.phase = "return";
            pr.phaseHitIds.clear();
            continue;
          }
          shots.splice(i, 1);
          continue;
        }
        if (pr.kind === "wall_seed") spawnHorseshoeIceWall(pr.x, pr.y, Math.atan2(pr.vy, pr.vx), 10);
        if (pr.kind === "fireball") applyFireballBlast(pr.x, pr.y, pr.blastR, pr.dmg);
        shots.splice(i, 1);
        continue;
      }
      if (pr.kind === "fireball") {
        let detonated = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + 8) {
            applyFireballBlast(e.x, e.y, pr.blastR, pr.dmg);
            detonated = true;
            break;
          }
        }
        if (detonated) shots.splice(i, 1);
      } else if (pr.kind === "volcano_shot") {
        let hitEnemy = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + 7) {
            spawnDamageFloater(e.x, e.y - e.r - 6, pr.dmg, "enemy");
            e.hp -= pr.dmg;
            onIceResonatorDamageTrigger(e.x, e.y, pr.dmg);
            if (e.hp <= 0) {
              state.enemies.splice(j, 1);
              state.stats.kills++;
              onEnemyKilled(e);
            }
            shots.splice(i, 1);
            hitEnemy = true;
            break;
          }
        }
        if (hitEnemy) continue;
      } else if (pr.kind === "lightning") {
        let hitEnemy = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + 5) {
            if (pr.onHitChain && !pr.onHitChain.done) {
              castLightningNovaInvoke(pr.onHitChain.targets, 1, 1, {
                fromX: e.x,
                fromY: e.y,
                damage: pr.onHitChain.damage,
                jumpRadius: pr.onHitChain.jumpRadius,
              });
              pr.onHitChain.done = true;
            }
            spawnDamageFloater(e.x, e.y - e.r - 6, pr.dmg, "enemy");
            e.hp -= pr.dmg;
            onIceResonatorDamageTrigger(e.x, e.y, pr.dmg);
            if (e.hp <= 0) {
              state.enemies.splice(j, 1);
              state.stats.kills++;
              onEnemyKilled(e);
            }
            shots.splice(i, 1);
            hitEnemy = true;
            break;
          }
        }
        if (hitEnemy) continue;
      } else if (pr.kind === "wall_seed") {
        let hitEnemy = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + 8) {
            spawnHorseshoeIceWall(e.x, e.y, Math.atan2(pr.vy, pr.vx), 10);
            shots.splice(i, 1);
            hitEnemy = true;
            break;
          }
        }
        if (hitEnemy) continue;
      } else if (pr.kind === "fire_yoyo") {
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (pr.phaseHitIds.has(e.id)) continue;
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + pr.hitR) {
            pr.phaseHitIds.add(e.id);
            spawnDamageFloater(e.x, e.y - e.r - 6, pr.dmg, "enemy");
            e.hp -= pr.dmg;
            onIceResonatorDamageTrigger(e.x, e.y, pr.dmg);
            if (e.hp <= 0) {
              state.enemies.splice(j, 1);
              state.stats.kills++;
              onEnemyKilled(e);
            }
          }
        }
      } else if (pr.kind === "ice") {
        let removed = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (pr.hitIds.has(e.id)) continue;
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + 6) {
            pr.hitIds.add(e.id);
            if (pr.onHitChain && !pr.onHitChain.done) {
              castLightningNovaInvoke(pr.onHitChain.targets, 1, 1, {
                fromX: e.x,
                fromY: e.y,
                damage: pr.onHitChain.damage,
                jumpRadius: pr.onHitChain.jumpRadius,
              });
              pr.onHitChain.done = true;
            }
            spawnDamageFloater(e.x, e.y - e.r - 6, pr.dmg, "enemy");
            e.hp -= pr.dmg;
            onIceResonatorDamageTrigger(e.x, e.y, pr.dmg);
            pr.pierceLeft--;
            if (e.hp <= 0) {
              state.enemies.splice(j, 1);
              state.stats.kills++;
              onEnemyKilled(e);
            }
            if (pr.pierceLeft <= 0) {
              shots.splice(i, 1);
              removed = true;
              break;
            }
          }
        }
        if (!removed && pr.pierceLeft <= 0) shots.splice(i, 1);
      }
    }
  }

  function getCamera() {
    const p = state.player;
    const vw = viewW;
    const vh = viewH;
    const maxCamX = Math.max(0, WORLD_W - vw);
    const maxCamY = Math.max(0, WORLD_H - vh);
    return {
      camX: Math.max(0, Math.min(maxCamX, p.x - vw / 2)),
      camY: Math.max(0, Math.min(maxCamY, p.y - vh / 2)),
      vw,
      vh,
    };
  }

  function getWorldMouseXY() {
    const { camX, camY } = getCamera();
    return { x: mouseCanvasX + camX, y: mouseCanvasY + camY };
  }

  function getPlayerAimAngle() {
    const p = state.player;
    const m = getWorldMouseXY();
    return Math.atan2(m.y - p.y, m.x - p.x);
  }

  function getAimAngleToPoint(point) {
    if (!point) return getPlayerAimAngle();
    const p = state.player;
    return Math.atan2(point.y - p.y, point.x - p.x);
  }

  function setMoveTargetFromMouse() {
    if (!state) return;
    const m = getWorldMouseXY();
    moveTarget = { x: m.x, y: m.y };
  }

  function createInvokeCooldownState() {
    const cd = {};
    for (const c of COOLDOWN_COMBOS) cd[c.id] = 0;
    return cd;
  }

  function matchInvokeCombo(kinds) {
    if (!kinds || kinds.length < 1 || kinds.length > 3) return null;
    const seq = kinds.map((k) => RUNE_TO_KEY[k] || "").join("");
    if (kinds.length === 1) return SINGLE_COMBO_BY_SEQUENCE[seq] || null;
    if (kinds.length === 2) {
      const sorted = SORTED2(seq[0], seq[1]);
      return DUAL_COMBO_BY_SEQUENCE[sorted] || null;
    }
    return INVOKE_COMBO_BY_SEQUENCE[seq] || null;
  }

  const CAST_MAX_DIST_FROM_PLAYER = 700;
  const ICE_RESONATOR_RADIUS = 500;
  const ICE_RESONATOR_DURATION = 7;
  const ANCHOR_CAPTURE_RADIUS = 600;
  const ANCHOR_RING_DIST = 200;
  const ANCHOR_DURATION = 7;
  const ANCHOR_SLOW_MUL = 0.5;
  const EEW_MOON_DURATION = 10;
  /** Серп: большой круг вперёд; вырез «съедает» толстую внутреннюю часть — остаётся узкая дуга у внешнего края. */
  const EEW_MOON_R_LARGE = 128;
  const EEW_MOON_R_SMALL = 124;
  const EEW_MOON_LARGE_CENTER_FWD = 92;
  const EEW_MOON_BITE_CENTER_FWD = 32;

  function clampCastPointFromPlayer(px, py, tx, ty) {
    const dx = tx - px;
    const dy = ty - py;
    const len = Math.hypot(dx, dy) || 1;
    if (len <= CAST_MAX_DIST_FROM_PLAYER) return { x: tx, y: ty };
    const k = CAST_MAX_DIST_FROM_PLAYER / len;
    return { x: px + dx * k, y: py + dy * k };
  }

  function clearIceResonator() {
    state.iceResonator = null;
  }

  function spawnIceResonatorAt(wx, wy) {
    clearIceResonator();
    state.iceResonator = { x: wx, y: wy, tLeft: ICE_RESONATOR_DURATION };
  }

  function clearWorldAnchor() {
    state.worldAnchor = null;
  }

  function spawnWorldAnchor(ax, ay) {
    clearWorldAnchor();
    const norm = [];
    const bosses = [];
    for (const e of state.enemies) {
      if (Math.hypot(e.x - ax, e.y - ay) > ANCHOR_CAPTURE_RADIUS + e.r) continue;
      const bossLike = e.kind === "boss1" || e.kind === "boss2" || e.elite;
      if (bossLike) bosses.push(e.id);
      else norm.push(e.id);
    }
    state.worldAnchor = {
      x: ax,
      y: ay,
      tLeft: ANCHOR_DURATION,
      normIds: new Set(norm),
      bossIds: new Set(bosses),
    };
  }

  function clearEewCone() {
    state.eewCone = null;
  }

  function spawnEewCone(originX = null, originY = null) {
    const p = state.player;
    const bx = Number.isFinite(originX) ? originX : p.x;
    const by = Number.isFinite(originY) ? originY : p.y;
    const m = getWorldMouseXY();
    const dx = m.x - bx;
    const dy = m.y - by;
    const len = Math.hypot(dx, dy) || 1;
    const fx = dx / len;
    const fy = dy / len;
    clearEewCone();
    state.eewCone = {
      ox: bx,
      oy: by,
      fx,
      fy,
      lcX: bx + fx * EEW_MOON_LARGE_CENTER_FWD,
      lcY: by + fy * EEW_MOON_LARGE_CENTER_FWD,
      scX: bx + fx * EEW_MOON_BITE_CENTER_FWD,
      scY: by + fy * EEW_MOON_BITE_CENTER_FWD,
      rLarge: EEW_MOON_R_LARGE,
      rSmall: EEW_MOON_R_SMALL,
      tLeft: EEW_MOON_DURATION,
    };
  }

  /** Пересечение окружностей; null если почти совпадают или не пересекаются. */
  function circleCircleIntersect(x0, y0, r0, x1, y1, r1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    if (d < 1e-5 || d > r0 + r1 + 1e-4 || d < Math.abs(r0 - r1) - 1e-4) return null;
    const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
    const h2 = r0 * r0 - a * a;
    if (h2 < -1e-5) return null;
    const h = Math.sqrt(Math.max(0, h2));
    const mx = x0 + (dx * a) / d;
    const my = y0 + (dy * a) / d;
    const rx = (-dy * h) / d;
    const ry = (dx * h) / d;
    return [
      [mx + rx, my + ry],
      [mx - rx, my - ry],
    ];
  }

  function eewMoonAngle(ccx, ccy, px, py) {
    return Math.atan2(py - ccy, px - ccx);
  }

  function eewShortAngularDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  /** Точка внутри узкого серпа: большой диск минус маленький + лёгкое ограничение сзади по касту. */
  function pointInEewCone(wx, wy, dome) {
    if (!dome) return false;
    if (dome.rLarge == null || dome.rSmall == null || dome.scX == null) {
      if (dome.radius != null && dome.cx != null) {
        const vx = wx - dome.cx;
        const vy = wy - dome.cy;
        if (vx * vx + vy * vy > (dome.radius + 8) * (dome.radius + 8)) return false;
        const halfPlane = vx * dome.fx + vy * dome.fy;
        return halfPlane >= -10;
      }
      return false;
    }
    const dL = Math.hypot(wx - dome.lcX, wy - dome.lcY);
    if (dL > dome.rLarge + 10) return false;
    const dS = Math.hypot(wx - dome.scX, wy - dome.scY);
    if (dS < dome.rSmall - 8) return false;
    const vx = wx - dome.ox;
    const vy = wy - dome.oy;
    if (vx * dome.fx + vy * dome.fy < -35) return false;
    return true;
  }

  function spawnWeeClone() {
    const p = state.player;
    const hpMax = Math.max(1, Math.floor(state.stats.hp * 0.5));
    state.weeClone = {
      x: p.x,
      y: p.y,
      r: p.r,
      hp: hpMax,
      maxHp: hpMax,
      tLeft: 10,
    };
  }

  function clearWeeClone() {
    state.weeClone = null;
    state.cloneActiveShield = null;
  }

  function resolveWeeCloneTarget(clonePos, worldCastPoint, maxCastRange) {
    const dx = worldCastPoint.x - clonePos.x;
    const dy = worldCastPoint.y - clonePos.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d <= maxCastRange) return { x: worldCastPoint.x, y: worldCastPoint.y };
    const k = maxCastRange / d;
    return { x: clonePos.x + dx * k, y: clonePos.y + dy * k };
  }

  function getEnemyChasePoint(ex, ey) {
    const p = state.player;
    const clo = state.weeClone;
    if (!clo || clo.hp <= 0) return { x: p.x, y: p.y };
    const dP = Math.hypot(p.x - ex, p.y - ey);
    const dC = Math.hypot(clo.x - ex, clo.y - ey);
    if (dC < dP) return { x: clo.x, y: clo.y };
    if (dP < dC) return { x: p.x, y: p.y };
    return { x: clo.x, y: clo.y };
  }

  let _iceResonatorApplying = false;

  function onIceResonatorDamageTrigger(hitX, hitY, dmgForV) {
    const ir = state.iceResonator;
    if (!ir || _iceResonatorApplying) return;
    if (dmgForV <= 0) return;
    if (Math.hypot(hitX - ir.x, hitY - ir.y) > ICE_RESONATOR_RADIUS) return;
    const V = dmgForV * 0.2;
    if (V <= 0) return;
    _iceResonatorApplying = true;
    try {
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (Math.hypot(e.x - ir.x, e.y - ir.y) > ICE_RESONATOR_RADIUS + e.r) continue;
        spawnDamageFloater(e.x, e.y - e.r - 6, V, "enemy");
        e.hp -= V;
        if (e.hp <= 0) {
          const dead = state.enemies[j];
          state.enemies.splice(j, 1);
          state.stats.kills++;
          onEnemyKilled(dead);
        }
      }
      spawnPulseWave(ir.x, ir.y, Math.min(ICE_RESONATOR_RADIUS, 420), 0.22, "rgba(180, 230, 255, 0.28)", 1.2);
    } finally {
      _iceResonatorApplying = false;
    }
  }

  function updateIceResonator(dt) {
    const ir = state.iceResonator;
    if (!ir) return;
    ir.tLeft -= dt;
    if (ir.tLeft <= 0) clearIceResonator();
  }

  function updateWorldAnchor(dt) {
    const a = state.worldAnchor;
    if (!a) return;
    a.tLeft -= dt;
    if (a.tLeft <= 0) {
      clearWorldAnchor();
      return;
    }
    const ax = a.x;
    const ay = a.y;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - ax, e.y - ay);
      if (d > ANCHOR_CAPTURE_RADIUS + e.r) {
        a.normIds.delete(e.id);
        a.bossIds.delete(e.id);
      }
    }
  }

  function applyAnchorPhysicsToEnemy(e, dt) {
    const a = state.worldAnchor;
    if (!a) return false;
    const d0 = Math.hypot(e.x - a.x, e.y - a.y);
    if (d0 > ANCHOR_CAPTURE_RADIUS + e.r) return false;
    const isNorm = a.normIds.has(e.id);
    const isBoss = a.bossIds.has(e.id);
    if (!isNorm && !isBoss) return false;
    const slow = ANCHOR_SLOW_MUL;
    if (isBoss) {
      return slow;
    }
    let nx = e.x;
    let ny = e.y;
    const dx = nx - a.x;
    const dy = ny - a.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > ANCHOR_RING_DIST) {
      const pull = Math.min(e.speed * dt * 1.35, d - ANCHOR_RING_DIST);
      nx -= (dx / d) * pull;
      ny -= (dy / d) * pull;
    }
    tryMoveEnemy(e, nx, ny);
    const d2 = Math.hypot(e.x - a.x, e.y - a.y) || 1;
    if (d2 > ANCHOR_RING_DIST) {
      const k = ANCHOR_RING_DIST / d2;
      e.x = a.x + (e.x - a.x) * k;
      e.y = a.y + (e.y - a.y) * k;
    }
    return slow;
  }

  function updateEewCone(dt) {
    const c = state.eewCone;
    if (!c) return;
    c.tLeft -= dt;
    if (c.tLeft <= 0) clearEewCone();
  }

  function updateWeeClone(dt) {
    const w = state.weeClone;
    if (!w) return;
    w.tLeft -= dt;
    if (w.tLeft <= 0 || w.hp <= 0) clearWeeClone();
  }

  const MIRROR_SKIP_ARCHETYPES = new Set([
    "tri_burst",
    "lightning_burst",
    "lightning_bolt",
    "player_nova",
    "delayed_burst",
    "ice_volley",
    "mirror_clone",
    "ice_resonator",
    "lightning_anchor",
    "projectile_prism",
    "armament_recollection",
  ]);

  function tryMirrorCloneInvoke(combo, powerMul, castCtx) {
    if (castCtx?.mirrorClone) return;
    const clo = state.weeClone;
    if (!clo || clo.hp <= 0) return;
    if (MIRROR_SKIP_ARCHETYPES.has(combo.archetype)) return;
    const aim = castCtx?.aimPoint ? { x: castCtx.aimPoint.x, y: castCtx.aimPoint.y } : getWorldMouseXY();
    castInvokeSpell(combo, powerMul * 0.4, { aimPoint: aim, origin: { x: clo.x, y: clo.y }, mirrorClone: true });
  }

  function applyDamageEnemyIndex(j, dmg) {
    const e = state.enemies[j];
    if (!e || dmg <= 0) return;
    spawnDamageFloater(e.x, e.y - e.r - 6, dmg, "enemy");
    e.hp -= dmg;
    onIceResonatorDamageTrigger(e.x, e.y, dmg);
    if (e.hp <= 0) {
      state.enemies.splice(j, 1);
      state.stats.kills++;
      onEnemyKilled(e);
    }
  }

  /** DoT тика Armament: не через «прямой» урон щитами/бронёй как разовый хит. */
  function applyPlayerArmamentDoTTick(amt) {
    if (!state || amt <= 0) return;
    if ((state.playerInvulnerability || 0) > 0) return;
    const p = state.player;
    spawnDamageFloater(p.x, p.y - p.r - 10, amt, "player");
    state.stats.hp -= amt;
    if (state.stats.hp <= 0 && !tryConsumeAegisOnFatalHit()) {
      state.stats.hp = 0;
      state.gameOver = true;
    }
  }

  function applyEnemyArmamentDoTTick(j, amt) {
    if (amt <= 0) return;
    const e = state.enemies[j];
    if (!e) return;
    spawnDamageFloater(e.x, e.y - e.r - 6, amt, "enemy");
    e.hp -= amt;
    onIceResonatorDamageTrigger(e.x, e.y, amt);
    if (e.hp <= 0) {
      const dead = state.enemies[j];
      state.enemies.splice(j, 1);
      state.stats.kills++;
      onEnemyKilled(dead);
    }
  }

  function finalizeArmamentRoseMiniMines(ar) {
    if (!state || !ar?.roseSlots?.length) return;
    const dmg = Math.max(6, Math.round(state.stats.fireballDamage * 0.2));
    const blast = BASE_METEOR_RADIUS * 0.38;
    for (const s of ar.roseSlots) {
      state.mines.push({
        x: s.x,
        y: s.y,
        triggerRadius: 16,
        blastRadius: blast,
        dmg,
        kind: "rose",
        fuseLeft: 10,
        roseAng: s.ang,
      });
    }
  }

  function clearArmamentRecollectionWithMines() {
    const ar = state.armamentRecollection;
    if (ar) finalizeArmamentRoseMiniMines(ar);
    state.armamentRecollection = null;
  }

  function castFireConeInvoke(dmgMul = 1, durationMul = 1, rangeMul = 1, halfAngleMul = 1) {
    const dmg = (FIRE_CONE_DMG + state.stats.fireballDamage * 0.12) * dmgMul;
    state.fireCones.push({
      tLeft: FIRE_CONE_DURATION * durationMul,
      range: FIRE_CONE_RANGE * rangeMul,
      halfAngle: FIRE_CONE_HALF_ANGLE * halfAngleMul,
      tickAcc: 0,
      tickEvery: FIRE_CONE_TICK,
      dmg,
    });
  }

  function applyFireConeDamageTick(cone) {
    const p = state.player;
    const ang = getPlayerAimAngle();
    const cosHalf = Math.cos(cone.halfAngle);
    const fx = Math.cos(ang);
    const fy = Math.sin(ang);
    const ox = p.x;
    const oy = p.y;
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      const dx = e.x - ox;
      const dy = e.y - oy;
      const dist = Math.hypot(dx, dy);
      if (dist > cone.range + e.r + 8) continue;
      if (dist < 1e-4) {
        applyDamageEnemyIndex(j, cone.dmg);
        continue;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = nx * fx + ny * fy;
      if (dot >= cosHalf) applyDamageEnemyIndex(j, cone.dmg);
    }
  }

  function updateFireCones(dt) {
    if (!state.fireCones.length) return;
    for (let i = state.fireCones.length - 1; i >= 0; i--) {
      const c = state.fireCones[i];
      c.tLeft -= dt;
      c.tickAcc += dt;
      while (c.tickAcc >= c.tickEvery) {
        c.tickAcc -= c.tickEvery;
        applyFireConeDamageTick(c);
      }
      if (c.tLeft <= 0) state.fireCones.splice(i, 1);
    }
  }

  function castIceVolleyInvoke(count = ICE_VOLLEY_COUNT, spreadMul = 1, dmgMul = 1, speedMul = 1, pierceBonus = 0, originX = null, originY = null) {
    const p = state.player;
    const ox0 = Number.isFinite(originX) ? originX : p.x;
    const oy0 = Number.isFinite(originY) ? originY : p.y;
    const ang = getPlayerAimAngle();
    const dmg = state.stats.iceSpearDamage * 1.08 * dmgMul;
    const pierce = Math.min(8, Math.max(1, Math.round(state.stats.iceSpearPierce) + pierceBonus));
    const n = Math.max(1, count | 0);
    const spread = ICE_VOLLEY_SPREAD * spreadMul;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread;
      const a = ang + t;
      state.playerShots.push({
        kind: "ice",
        x: ox0 + Math.cos(a) * 24,
        y: oy0 + Math.sin(a) * 24,
        vx: Math.cos(a) * ICE_VOLLEY_SPEED * speedMul,
        vy: Math.sin(a) * ICE_VOLLEY_SPEED * speedMul,
        life: ICE_VOLLEY_LIFE,
        dmg,
        pierceLeft: pierce,
        hitIds: new Set(),
      });
    }
  }

  function castLightningNovaInvoke(targets = 5, dmgMul = 1, rangeMul = 1, options = {}) {
    const p = state.player;
    const baseDmg = typeof options.damage === "number" ? options.damage : state.stats.lightningDamage * 2.4 * dmgMul;
    const jumpRadius = (options.jumpRadius || BASE_LIGHTNING_BOUNCE_RADIUS) * rangeMul;
    const remaining = state.enemies.slice();
    const chainLen = Math.max(1, targets | 0);
    const chain = [];
    let fromX = options.fromX ?? p.x;
    let fromY = options.fromY ?? p.y;
    for (let i = 0; i < chainLen && remaining.length; i++) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let j = 0; j < remaining.length; j++) {
        const e = remaining[j];
        const d = Math.hypot(e.x - fromX, e.y - fromY);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = j;
        }
      }
      if (bestIdx < 0 || bestDist > jumpRadius) break;
      const next = remaining.splice(bestIdx, 1)[0];
      chain.push(next);
      fromX = next.x;
      fromY = next.y;
    }
    let prevX = options.fromX ?? p.x;
    let prevY = options.fromY ?? p.y;
    for (const e of chain) {
      const idx = state.enemies.indexOf(e);
      if (idx < 0) continue;
      applyDamageEnemyIndex(idx, baseDmg);
      spawnBeamLine(prevX, prevY, e.x, e.y, 0.11, "rgba(240,220,150,0.8)");
      if (options.splashRadius > 0 && options.splashDamage > 0) {
        applyFireballBlast(e.x, e.y, options.splashRadius, options.splashDamage);
        state.vfx.push({ kind: "meteorShockwave", x: e.x, y: e.y, radius: options.splashRadius, life: 0.16, maxLife: 0.16 });
      }
      spawnImpactRing(e.x, e.y, 24, 0.12, "rgba(255,240,170,0.75)");
      prevX = e.x;
      prevY = e.y;
    }
  }

  function castDirectedLightningChain(angle, damage, totalBounces, jumpRadius = BASE_LIGHTNING_BOUNCE_RADIUS, extra = {}) {
    const p = state.player;
    const ox0 = Number.isFinite(extra.originX) ? extra.originX : p.x;
    const oy0 = Number.isFinite(extra.originY) ? extra.originY : p.y;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    let first = null;
    let bestT = Infinity;
    for (const e of state.enemies) {
      const rx = e.x - ox0;
      const ry = e.y - oy0;
      const t = rx * ux + ry * uy;
      if (t <= 0 || t > jumpRadius) continue;
      const px = ox0 + ux * t;
      const py = oy0 + uy * t;
      const perp = Math.hypot(e.x - px, e.y - py);
      if (perp <= e.r + 8 && t < bestT) {
        bestT = t;
        first = e;
      }
    }
    const endX = first ? first.x : ox0 + ux * jumpRadius;
    const endY = first ? first.y : oy0 + uy * jumpRadius;
    spawnBeamLine(ox0, oy0, endX, endY, 0.11, "rgba(240,220,150,0.8)");
    if (!first) return;
    const firstIdx = state.enemies.indexOf(first);
    if (firstIdx >= 0) applyDamageEnemyIndex(firstIdx, damage);
    if (extra.splashRadius > 0 && extra.splashDamage > 0) {
      applyFireballBlast(first.x, first.y, extra.splashRadius, extra.splashDamage);
      state.vfx.push({ kind: "meteorShockwave", x: first.x, y: first.y, radius: extra.splashRadius, life: 0.16, maxLife: 0.16 });
    }
    if (totalBounces > 1) {
      castLightningNovaInvoke(totalBounces - 1, 1, 1, {
        fromX: first.x,
        fromY: first.y,
        damage,
        jumpRadius,
        splashRadius: extra.splashRadius || 0,
        splashDamage: extra.splashDamage || 0,
      });
    }
  }

  function spawnIceSpearShot(x, y, angle, dmg, speedMul = 1, lifeMul = 1, pierce = BASE_ICE_PIERCE, sizeMul = 1) {
    state.playerShots.push({
      kind: "ice",
      x: x + Math.cos(angle) * 24,
      y: y + Math.sin(angle) * 24,
      vx: Math.cos(angle) * ICE_VOLLEY_SPEED * speedMul,
      vy: Math.sin(angle) * ICE_VOLLEY_SPEED * speedMul,
      life: ICE_VOLLEY_LIFE * lifeMul,
      dmg,
      pierceLeft: Math.max(1, pierce | 0),
      hitIds: new Set(),
      sizeMul,
    });
  }

  function spawnIceShardsRadial(x, y, count, dmg, speedMul = 1, pierce = 1, lifeMul = 1) {
    const n = Math.max(1, count | 0);
    const baseSpeed = ICE_VOLLEY_SPEED * speedMul;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      state.playerShots.push({
        kind: "ice",
        x: x + Math.cos(a) * 10,
        y: y + Math.sin(a) * 10,
        vx: Math.cos(a) * baseSpeed,
        vy: Math.sin(a) * baseSpeed,
        life: ICE_VOLLEY_LIFE * lifeMul,
        dmg,
        pierceLeft: Math.max(1, pierce | 0),
        hitIds: new Set(),
      });
    }
  }

  function castDirectedShot(kind, dmg, speed = 1, life = 1, extra = {}) {
    const p = state.player;
    const ox0 = Number.isFinite(extra.originX) ? extra.originX : p.x;
    const oy0 = Number.isFinite(extra.originY) ? extra.originY : p.y;
    const baseAngle = typeof extra.baseAngle === "number" ? extra.baseAngle : getPlayerAimAngle();
    const a = baseAngle + (extra.angleOffset || 0);
    if (kind === "fireball") {
      state.playerShots.push({
        kind: "fireball",
        x: ox0 + Math.cos(a) * 24,
        y: oy0 + Math.sin(a) * 24,
        vx: Math.cos(a) * 620 * speed,
        vy: Math.sin(a) * 620 * speed,
        life: 1.2 * life,
        dmg,
        blastR: extra.blastR || 76,
      });
      return;
    }
    if (kind === "lightning") {
      state.playerShots.push({
        kind: "lightning",
        x: ox0 + Math.cos(a) * 22,
        y: oy0 + Math.sin(a) * 22,
        vx: Math.cos(a) * 900 * speed,
        vy: Math.sin(a) * 900 * speed,
        life: 0.75 * life,
        dmg,
      });
      return;
    }
    castIceVolleyInvoke(1, 0, dmg / Math.max(1, state.stats.iceSpearDamage * 1.08), speed, extra.pierceBonus || 0, ox0, oy0);
  }

  function castBurstAtCursor(dmg, radius = 95) {
    const m = getWorldMouseXY();
    applyFireballBlast(m.x, m.y, radius, dmg);
    spawnImpactRing(m.x, m.y, radius, 0.22, "rgba(255,200,120,0.65)");
  }

  function spawnMeteorStrikeAt(x, y, dmg, radius = 78, extra = {}) {
    if (!state?.vfx) return;
    const startX = x + rand(-170, 170);
    const startY = y - rand(380, 520);
    state.vfx.push({
      kind: "meteor",
      x: startX,
      y: startY,
      startX,
      startY,
      targetX: x,
      targetY: y,
      duration: METEOR_FALL_TIME,
      t: 0,
      dmg,
      radius,
      trail: [],
      shardCount: extra.shardCount || 0,
      shardDmg: extra.shardDmg || 0,
      shardSpeedMul: extra.shardSpeedMul || 1,
      shardPierce: extra.shardPierce || 1,
      shardLifeMul: extra.shardLifeMul || 1,
      shockwaveDamageMul: extra.shockwaveDamageMul ?? 0.5,
      shockwaveRadiusMul: extra.shockwaveRadiusMul ?? 3,
      visualStyle: extra.visualStyle || "meteor",
    });
  }

  function spawnCastTelegraph(x, y, radius, life = 0.25, color = "rgba(180,220,255,0.5)") {
    if (!state?.vfx) return;
    state.vfx.push({ kind: "telegraph", x, y, radius, life, maxLife: life, color });
  }

  function spawnImpactRing(x, y, radius, life = 0.35, color = "rgba(255,210,120,0.7)") {
    if (!state?.vfx) return;
    state.vfx.push({ kind: "ring", x, y, radius, life, maxLife: life, color });
  }

  function spawnBeamLine(x1, y1, x2, y2, life = 0.12, color = "rgba(220,200,255,0.8)") {
    if (!state?.vfx) return;
    state.vfx.push({ kind: "beam", x1, y1, x2, y2, life, maxLife: life, color });
  }

  function spawnPulseWave(x, y, maxRadius, duration, color, lineWidth = 2) {
    if (!state?.vfx) return;
    state.vfx.push({ kind: "pulseWave", x, y, maxRadius, life: duration, maxLife: duration, color, lineWidth });
  }

  function placeMineAt(x, y, dmg, blastRadius = BASE_METEOR_RADIUS * 0.72) {
    if (!state) return;
    state.mines.push({
      x,
      y,
      triggerRadius: 26,
      blastRadius,
      dmg,
    });
  }

  function placeFirePuddleAt(x, y, dps, radius = 210, duration = 5, tickEvery = 0.25) {
    if (!state) return;
    state.firePuddles.push({
      x,
      y,
      radius,
      dps,
      duration,
      t: duration,
      expandSec: 0.45,
      tickEvery,
      tickAcc: 0,
    });
  }

  function spawnHorseshoeIceWall(x, y, angle, duration = 10) {
    if (!state) return;
    const thickness = state.player.r * 2;
    const radius = 129;
    const arcSteps = 14;
    const arcCenterX = -26;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const toWorld = (lx, ly) => ({ x: x + lx * ca - ly * sa, y: y + lx * sa + ly * ca });
    const points = [];
    const aStart = Math.PI * 0.78;
    const aEnd = Math.PI * 1.22;
    for (let i = 0; i <= arcSteps; i++) {
      const t = i / arcSteps;
      const a = aStart + (aEnd - aStart) * t;
      const lx = arcCenterX + Math.cos(a) * radius;
      const ly = Math.sin(a) * radius;
      points.push(toWorld(lx, ly));
    }
    const segments = [];
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      segments.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, thickness });
    }
    const wall = {
      x,
      y,
      angle,
      t: duration,
      total: duration,
      thickness,
      segments,
    };
    state.iceWalls.push(wall);
    for (const e of state.enemies) {
      let touching = false;
      for (const seg of wall.segments) {
        if (distancePointToSegment(e.x, e.y, seg.x1, seg.y1, seg.x2, seg.y2) <= e.r + thickness * 0.5) {
          touching = true;
          break;
        }
      }
      if (!touching) continue;
      const dx = x - e.x;
      const dy = y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      tryMoveEnemy(e, e.x + (dx / len) * 64, e.y + (dy / len) * 64);
    }
  }

  function spawnSpiralGroundSpikes(cx, cy, baseAngle, count = 24, stepDelay = 0.2, maxRadius = 620, spikeRadius = 36, dmg = 34) {
    if (!state?.vfx) return;
    const n = Math.max(1, count | 0);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const a = baseAngle + t * Math.PI * 4.2;
      const r = 36 + t * (maxRadius - 36);
      state.vfx.push({
        kind: "groundSpike",
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        r: spikeRadius,
        dmg,
        delay: i * stepDelay,
        life: 0.42,
        maxLife: 0.42,
        hitDone: false,
      });
    }
  }

  function spawnGroundSpikeWaveBurst(cx, cy, waveCount = 3, spikesPerWave = 12, maxRadius = 250, waveDelay = 0.18, spikeRadius = 36, dmg = 34) {
    if (!state?.vfx) return;
    const waves = Math.max(1, waveCount | 0);
    const baseN = Math.max(3, spikesPerWave | 0);
    const waveStep = maxRadius / waves;
    for (let w = 1; w <= waves; w++) {
      const wr = (maxRadius * w) / waves;
      const n = Math.max(baseN, Math.round(baseN * (1 + (w - 1) * 0.55)));
      const base = (w % 2) * (Math.PI / n);
      const pushDist = w < waves ? waveStep : waveStep * 0.6;
      for (let i = 0; i < n; i++) {
        const a = base + (Math.PI * 2 * i) / n;
        state.vfx.push({
          kind: "groundSpike",
          x: cx + Math.cos(a) * wr,
          y: cy + Math.sin(a) * wr,
          r: spikeRadius,
          dmg,
          delay: (w - 1) * waveDelay,
          originX: cx,
          originY: cy,
          pushDist,
          life: 0.42,
          maxLife: 0.42,
          hitDone: false,
        });
      }
    }
  }

  function spawnAuraFx(target, radius, life, color, icon = null) {
    if (!state?.vfx) return;
    state.vfx.push({ kind: "aura", target, radius, life, maxLife: life, color, icon });
  }

  function applyEnemyStatus(e, status, duration) {
    if (!e) return;
    if (!e.statuses) e.statuses = {};
    if (status === "fear" && (e.statuses.fearImmune || 0) > 0) return;
    e.statuses[status] = Math.max(e.statuses[status] || 0, duration);
    if (status === "fear") e.statuses.fearImmune = Math.max(e.statuses.fearImmune || 0, duration + 15);
  }

  function applyStatusInRadius(x, y, radius, status, duration) {
    for (const e of state.enemies) {
      if (Math.hypot(e.x - x, e.y - y) <= radius + e.r) applyEnemyStatus(e, status, duration);
    }
  }

  function distancePointToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLen2 = abx * abx + aby * aby;
    if (abLen2 <= 1e-6) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
    const cx = ax + abx * t;
    const cy = ay + aby * t;
    return Math.hypot(px - cx, py - cy);
  }

  function startLightningDash(targetX, targetY, dmg) {
    if (!state) return;
    const p = state.player;
    const dx = targetX - p.x;
    const dy = targetY - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const maxDist = 780;
    const dist = Math.min(maxDist, len);
    const ux = dx / len;
    const uy = dy / len;
    state.lightningDash = {
      phase: "charge",
      chargeT: 0.2,
      totalCharge: 0.2,
      ux,
      uy,
      remain: dist,
      speed: state.stats.moveSpeed * 3,
      dmg,
      hitIds: new Set(),
    };
  }

  function startBeamChannel(dmg) {
    if (!state || state.elementalSpin) return false;
    const p = state.player;
    state.beamChannel = {
      t: BEAM_CHANNEL_DURATION,
      total: BEAM_CHANNEL_DURATION,
      angle: getPlayerAimAngle(),
      dmgPerTick: dmg / 2.5,
      tickEvery: BEAM_CHANNEL_TICK,
      tickAcc: 0,
      range: BEAM_CHANNEL_RANGE,
      width: BEAM_CHANNEL_WIDTH,
    };
    return true;
  }

  function startElementalSpin() {
    if (!state || state.beamChannel) return false;
    state.elementalSpin = {
      t: 5,
      total: 5,
      startedAt: state.stats.time,
      tickEvery: 0.1,
      tickAcc: 0,
    };
    return true;
  }

  function castInvokeSpell(combo, powerMul = 1, castCtx = null) {
    const d = combo.damage * powerMul;
    const p = state.player;
    const aimPoint = castCtx?.aimPoint || getWorldMouseXY();
    const aimAngle = getAimAngleToPoint(aimPoint);
    const ox = castCtx?.origin?.x ?? p.x;
    const oy = castCtx?.origin?.y ?? p.y;
    if (combo.sequence === "QQQ") {
      if (castCtx?.mirrorClone) {
        state.cloneActiveShield = { type: "ice_shell", t: 2.4, absorbedDamage: 0 };
        spawnPulseWave(ox, oy, 96, 2.45, "rgba(170, 235, 255, 0.55)", 2.4);
      } else {
        state.activeShield = { type: "ice_shell", t: 2.4, absorbedDamage: 0 };
        spawnPulseWave(p.x, p.y, 96, 2.45, "rgba(170, 235, 255, 0.55)", 2.4);
      }
    } else if (combo.sequence === "WWQ") {
      const armor = Math.max(1, state.stats.maxHp * 0.5);
      if (castCtx?.mirrorClone) {
        state.cloneActiveShield = { type: "absorb", armor, maxArmor: armor };
        spawnPulseWave(ox, oy, 88, 4.25, "rgba(190, 200, 255, 0.36)", 2.2);
      } else {
        state.activeShield = { type: "absorb", armor, maxArmor: armor };
        spawnPulseWave(p.x, p.y, 88, 4.25, "rgba(190, 200, 255, 0.36)", 2.2);
      }
    }
    switch (combo.archetype) {
      case "single_ice":
        spawnIceSpearShot(ox, oy, aimAngle, d, 1.15, 0.42, BASE_ICE_PIERCE, 1);
        break;
      case "single_lightning":
        castDirectedLightningChain(aimAngle, d, BASE_LIGHTNING_BOUNCES, BASE_LIGHTNING_BOUNCE_RADIUS, { originX: ox, originY: oy });
        break;
      case "single_fire":
        spawnMeteorStrikeAt(aimPoint.x, aimPoint.y, d, BASE_METEOR_RADIUS, { shockwaveDamageMul: 0.5, shockwaveRadiusMul: 3 });
        break;
      case "duo_qq":
        spawnIceSpearShot(ox, oy, aimAngle, d, 1.2, 0.6, BASE_ICE_PIERCE + 3, 1.68);
        break;
      case "duo_qw":
        spawnIceSpearShot(ox, oy, aimAngle, state.stats.iceSpearDamage, 1.15, 0.42, BASE_ICE_PIERCE, 1);
        state.playerShots[state.playerShots.length - 1].onHitChain = {
          targets: BASE_LIGHTNING_BOUNCES,
          damage: state.stats.lightningDamage,
          jumpRadius: BASE_LIGHTNING_BOUNCE_RADIUS,
          done: false,
        };
        break;
      case "duo_qe":
        spawnMeteorStrikeAt(aimPoint.x, aimPoint.y, state.stats.fireballDamage, BASE_METEOR_RADIUS, {
          shardCount: 5,
          shardDmg: state.stats.iceSpearDamage,
          shardSpeedMul: 1.15,
          shardPierce: BASE_ICE_PIERCE,
          shardLifeMul: 0.42,
          shockwaveDamageMul: 0.5,
          shockwaveRadiusMul: 3,
        });
        break;
      case "duo_ww":
        castDirectedLightningChain(aimAngle, d, 15, BASE_LIGHTNING_BOUNCE_RADIUS * 1.5, { originX: ox, originY: oy });
        break;
      case "duo_we":
        castDirectedLightningChain(aimAngle, state.stats.lightningDamage, BASE_LIGHTNING_BOUNCES, BASE_LIGHTNING_BOUNCE_RADIUS, {
          splashRadius: BASE_METEOR_RADIUS * 3,
          splashDamage: state.stats.fireballDamage * 0.5,
          originX: ox,
          originY: oy,
        });
        break;
      case "duo_ee":
        spawnMeteorStrikeAt(aimPoint.x, aimPoint.y, d, BASE_METEOR_RADIUS * 2, { shockwaveDamageMul: 0.5, shockwaveRadiusMul: 3 });
        break;
      case "ice_volley":
        spawnPulseWave(p.x, p.y, 96, 0.55, "rgba(170, 240, 255, 0.5)", 2.2);
        spawnPulseWave(p.x, p.y, 132, 0.45, "rgba(200, 248, 255, 0.32)", 1.6);
        break;
      case "ice_chain": {
        const R = 320;
        spawnPulseWave(p.x, p.y, R, 0.52, "rgba(150, 230, 255, 0.5)", 2.6);
        applyFireballBlast(p.x, p.y, R * 0.38, d);
        applyStatusInRadius(p.x, p.y, R, "stun", 1.8);
        break;
      }
      case "armament_recollection": {
        const waveSec = 3;
        const vineSec = 2;
        const postWrapDelay = 1;
        const R = 800;
        const ox = Number.isFinite(castCtx?.origin?.x) ? castCtx.origin.x : p.x;
        const oy = Number.isFinite(castCtx?.origin?.y) ? castCtx.origin.y : p.y;
        spawnPulseWave(ox, oy, R, waveSec, "rgba(185, 245, 255, 0.5)", 4.6);
        spawnPulseWave(ox, oy, R + 40, waveSec, "rgba(200, 240, 255, 0.16)", 12);
        state.armamentRecollection = {
          t: 0,
          waveSec,
          vineSec,
          postWrapDelay,
          waveRadiusMax: R,
          originX: ox,
          originY: oy,
          waveHitIds: new Set(),
          targetIds: [],
          roseSlots: null,
          drainTickEvery: 0.1,
          drainHpPerTick: 10,
          drainTickAcc: 0,
        };
        break;
      }
      case "mine_burst":
        placeMineAt(aimPoint.x, aimPoint.y, d * 1.05, BASE_METEOR_RADIUS * 0.72);
        break;
      case "freeze_burst":
        spawnPulseWave(p.x, p.y, 340, 0.48, "rgba(200, 220, 255, 0.42)", 3);
        for (const e of state.enemies) {
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist > 300 + e.r) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          const pushDist = 320;
          const tx = e.x + nx * pushDist;
          const ty = e.y + ny * pushDist;
          tryMoveEnemy(e, tx, ty);
        }
        break;
      case "ice_bolt": {
        spawnGroundSpikeWaveBurst(p.x, p.y, 3, 12, 250, 0.18, 36, d * 0.35);
        spawnPulseWave(p.x, p.y, 210, 0.42, "rgba(170, 240, 255, 0.38)", 2);
        break;
      }
      case "cone_lightning":
        state.fearAura = {
          t: 3,
          total: 3,
          radius: 180,
          fearDuration: 5,
          expandSec: 0.45,
          tickEvery: 0.2,
          tickAcc: 0,
        };
        applyStatusInRadius(p.x, p.y, 180, "fear", 5);
        break;
      case "tri_burst": {
        const maxR = 900;
        const dx = aimPoint.x - p.x;
        const dy = aimPoint.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const t = Math.min(1, maxR / len);
        spawnPulseWave(p.x, p.y, 44, 0.22, "rgba(230, 220, 255, 0.65)", 2);
        p.x += dx * t;
        p.y += dy * t;
        const m = BORDER_WALL + p.r;
        p.x = Math.max(m, Math.min(WORLD_W - m, p.x));
        p.y = Math.max(m, Math.min(WORLD_H - m, p.y));
        spawnPulseWave(p.x, p.y, 56, 0.28, "rgba(200, 240, 255, 0.6)", 2.6);
        applyFireballBlast(p.x, p.y, 72, d * 0.35);
        break;
      }
      case "zone_tick":
        placeFirePuddleAt(aimPoint.x, aimPoint.y, d * 1.2, 210, 5, 0.25);
        break;
      case "storm_area":
        state.volcanoes.push({
          x: aimPoint.x,
          y: aimPoint.y,
          ammo: 20,
          fireInterval: 0.5,
          fireCd: 0,
          range: 1000,
          projSpeed: 680,
          projLife: 1.4,
          dmg: d,
        });
        spawnPulseWave(aimPoint.x, aimPoint.y, 130, 0.35, "rgba(255, 120, 70, 0.4)", 2.2);
        break;
      case "delayed_burst":
        state.dualSharedCd = 0;
        state.overchargeUntil = state.stats.time + 10;
        for (const slot of state.artifactSlots || []) {
          if (!slot || !slot.selectedSequence) continue;
          if (slot.selectedSequence.length === 2) slot.cooldown = 0;
        }
        spawnPulseWave(p.x, p.y, 96, 0.38, "rgba(255, 230, 140, 0.55)", 2.2);
        break;
      case "fire_burst":
        spawnPulseWave(p.x, p.y, 320, 0.48, "rgba(255, 150, 80, 0.52)", 2.6);
        applyFireballBlast(p.x, p.y, 300, d);
        break;
      case "lightning_burst": {
        startLightningDash(aimPoint.x, aimPoint.y, d);
        break;
      }
      case "chain_nova":
        state.hailStorm = {
          x: aimPoint.x,
          y: aimPoint.y,
          radius: 260,
          dropTotal: 400,
          spawned: 0,
          activeDrops: 0,
          spawnAcc: 0,
          spawnRate: 55,
          dropDamage: d * 0.23,
          impactRadius: 44,
        };
        break;
      case "lightning_bolt": {
        startBeamChannel(d);
        break;
      }
      case "chain_ice":
        spawnPulseWave(p.x, p.y, 96, 0.42, "rgba(180, 200, 255, 0.45)", 2);
        break;
      case "lightning_nova":
        spawnPulseWave(ox, oy, 170, 0.48, "rgba(255, 220, 130, 0.45)", 2.2);
        castLightningNovaInvoke(12, d / 30, 1.1, { fromX: ox, fromY: oy });
        break;
      case "chain_heavy":
        state.blackHole = {
          x: aimPoint.x,
          y: aimPoint.y,
          radius: 320,
          outerRadius: 320 * 1.5,
          coreRadius: 320 * 0.33,
          t: 6,
          total: 6,
          pullMul: 0.25,
          dotTickEvery: 1,
          dotTickAcc: 0,
          dotDamage: d * 0.45,
        };
        break;
      case "fire_ice": {
        state.playerShots.push({
          kind: "wall_seed",
          x: ox + Math.cos(aimAngle) * 24,
          y: oy + Math.sin(aimAngle) * 24,
          vx: Math.cos(aimAngle) * 780,
          vy: Math.sin(aimAngle) * 780,
          life: 1.5,
          startX: ox + Math.cos(aimAngle) * 24,
          startY: oy + Math.sin(aimAngle) * 24,
          maxRange: 800,
          dmg: 0,
        });
        break;
      }
      case "fire_chain": {
        const sx = ox + Math.cos(aimAngle) * (p.r + 10);
        const sy = oy + Math.sin(aimAngle) * (p.r + 10);
        state.playerShots.push({
          kind: "fire_yoyo",
          x: sx,
          y: sy,
          startX: sx,
          startY: sy,
          vx: Math.cos(aimAngle) * 760,
          vy: Math.sin(aimAngle) * 760,
          life: 2.8,
          maxRange: 800,
          returnSpeed: 860,
          phase: "out",
          hitR: p.r * 3,
          dmg: d,
          phaseHitIds: new Set(),
        });
        break;
      }
      case "fire_chain_heavy":
        spawnMeteorStrikeAt(aimPoint.x, aimPoint.y, d * 1.15, BASE_METEOR_RADIUS * 2.2, { shockwaveDamageMul: 0.52, shockwaveRadiusMul: 2.8 });
        applyStatusInRadius(aimPoint.x, aimPoint.y, 220, "stun", 1.1);
        break;
      case "fire_bolt":
        state.invokeHasteUntil = state.stats.time + 5;
        state.fireTrail = {
          t: 5,
          dps: d * 0.9,
          radius: Math.max(32, p.r * 2.2),
          puddleDuration: 2,
          tickEvery: 0.25,
          spacing: Math.max(26, p.r * 1.6),
          lastX: p.x,
          lastY: p.y,
        };
        spawnPulseWave(p.x, p.y, 70, 0.45, "rgba(255, 170, 100, 0.45)", 2.2);
        break;
      case "cone_mix": {
        const fx = Math.cos(aimAngle);
        const fy = Math.sin(aimAngle);
        state.windGust = {
          x: p.x + fx * 26,
          y: p.y + fy * 26,
          fx,
          fy,
          rx: -fy,
          ry: fx,
          length: 756,
          width: 220,
          pushSpeed: 440,
          t: 2.5,
          total: 2.5,
        };
        break;
      }
      case "wide_cone":
        if (castCtx?.mirrorClone) {
          state.cloneActiveShield = {
            type: "fire",
            t: 10,
            radius: 100,
            dps: d * 0.9,
            tickEvery: 0.25,
            tickAcc: 0,
          };
        } else {
          state.activeShield = {
            type: "fire",
            t: 10,
            radius: 100,
            dps: d * 0.9,
            tickEvery: 0.25,
            tickAcc: 0,
          };
        }
        break;
      case "fire_cone":
        if (combo.sequence === "EEE") {
          const dirX = Math.cos(aimAngle);
          const dirY = Math.sin(aimAngle);
          const radius = BASE_METEOR_RADIUS * 3;
          state.rollingMeteor = {
            phase: "fall",
            x: aimPoint.x + rand(-120, 120),
            y: aimPoint.y - rand(360, 520),
            startX: aimPoint.x + rand(-120, 120),
            startY: aimPoint.y - rand(360, 520),
            targetX: aimPoint.x,
            targetY: aimPoint.y,
            t: 0,
            duration: METEOR_FALL_TIME,
            radius,
            dmg: d * 1.35,
            shockwaveMul: 0.45,
            shockwaveRadiusMul: 2.2,
            rollDistLeft: 400,
            rollSpeed: 540,
            dirX,
            dirY,
            trailAcc: 0,
            trailStep: 28,
            hitIds: new Set(),
          };
        } else {
          spawnPulseWave(ox, oy, 250, 0.52, "rgba(255, 200, 120, 0.42)", 2.6);
          castLightningNovaInvoke(10, d / 26, 0.92, { fromX: ox, fromY: oy });
          applyStatusInRadius(ox, oy, 260, "stun", 0.5);
        }
        break;
      case "player_nova": {
        if (startElementalSpin()) {
          spawnPulseWave(p.x, p.y, 90, 0.3, "rgba(255, 200, 120, 0.36)", 2.2);
        }
        break;
      }
      case "ice_resonator": {
        const m = clampCastPointFromPlayer(ox, oy, aimPoint.x, aimPoint.y);
        spawnIceResonatorAt(m.x, m.y);
        spawnPulseWave(m.x, m.y, 52, 0.38, "rgba(170, 230, 255, 0.55)", 2.2);
        break;
      }
      case "lightning_anchor": {
        const m = clampCastPointFromPlayer(ox, oy, aimPoint.x, aimPoint.y);
        spawnWorldAnchor(m.x, m.y);
        spawnPulseWave(m.x, m.y, 72, 0.42, "rgba(190, 200, 255, 0.48)", 2.2);
        break;
      }
      case "mirror_clone":
        spawnWeeClone();
        spawnPulseWave(ox, oy, 80, 0.4, "rgba(220, 200, 255, 0.5)", 2.4);
        break;
      case "projectile_prism":
        spawnEewCone(ox, oy);
        spawnPulseWave(ox, oy, 50, 0.3, "rgba(160, 210, 255, 0.42)", 2);
        break;
      default:
        break;
    }
    tryMirrorCloneInvoke(combo, powerMul, castCtx);
  }

  function updateVfx(dt) {
    if (!state?.vfx?.length) return;
    for (let i = state.vfx.length - 1; i >= 0; i--) {
      const fx = state.vfx[i];
      if (fx.kind === "groundSpike") {
        if ((fx.delay || 0) > 0) {
          fx.delay -= dt;
          continue;
        }
        if (!fx.hitDone) {
          const rr = fx.r || 36;
          for (const e of state.enemies) {
            if (Math.hypot(fx.x - e.x, fx.y - e.y) > rr + e.r) continue;
            const spDmg = fx.dmg || 0;
            if (spDmg > 0) spawnDamageFloater(e.x, e.y - e.r - 6, spDmg, "enemy");
            e.hp -= spDmg;
            onIceResonatorDamageTrigger(e.x, e.y, spDmg);
            if ((fx.pushDist || 0) > 0 && e.kind !== "boss1" && e.kind !== "boss2" && !e.elite) {
              const dx = e.x - (fx.originX ?? fx.x);
              const dy = e.y - (fx.originY ?? fx.y);
              const len = Math.hypot(dx, dy) || 1;
              const nx = dx / len;
              const ny = dy / len;
              const tx = e.x + nx * fx.pushDist;
              const ty = e.y + ny * fx.pushDist;
              if (!circleHitsBlocks(tx, e.y, e.r)) e.x = tx;
              if (!circleHitsBlocks(e.x, ty, e.r)) e.y = ty;
            }
          }
          for (let j = state.enemies.length - 1; j >= 0; j--) {
            if (state.enemies[j].hp <= 0) {
              const dead = state.enemies[j];
              state.enemies.splice(j, 1);
              state.stats.kills++;
              onEnemyKilled(dead);
            }
          }
          fx.hitDone = true;
        }
      }
      if (fx.kind === "meteor") {
        fx.t += dt;
        const k = Math.max(0, Math.min(1, fx.t / Math.max(0.001, fx.duration || METEOR_FALL_TIME)));
        fx.x = fx.startX + (fx.targetX - fx.startX) * k;
        fx.y = fx.startY + (fx.targetY - fx.startY) * k;
        if (!fx.trail) fx.trail = [];
        fx.trail.push({ x: fx.x, y: fx.y, a: 0.85 });
        if (fx.trail.length > 8) fx.trail.shift();
        for (const tp of fx.trail) tp.a *= 0.78;
        if (k >= 1) {
          applyFireballBlast(fx.targetX, fx.targetY, fx.radius || 76, fx.dmg || 0);
          const shockwaveRadius = (fx.radius || 76) * (fx.shockwaveRadiusMul || 3);
          const shockwaveDamage = (fx.dmg || 0) * (fx.shockwaveDamageMul ?? 0.5);
          if (shockwaveDamage > 0) applyFireballBlast(fx.targetX, fx.targetY, shockwaveRadius, shockwaveDamage);
          if (fx.shardCount > 0 && fx.shardDmg > 0) {
            spawnIceShardsRadial(
              fx.targetX,
              fx.targetY,
              fx.shardCount,
              fx.shardDmg,
              fx.shardSpeedMul || 1,
              fx.shardPierce || BASE_ICE_PIERCE,
              fx.shardLifeMul || 0.42
            );
          }
          state.vfx.push({
            kind: "meteorShockwave",
            x: fx.targetX,
            y: fx.targetY,
            radius: shockwaveRadius,
            life: 0.2,
            maxLife: 0.2,
          });
          state.vfx.splice(i, 1);
          continue;
        }
        continue;
      }
      if (fx.kind === "hailDrop") {
        fx.t += dt;
        const k = Math.max(0, Math.min(1, fx.t / Math.max(0.001, fx.duration || 0.45)));
        fx.x = fx.targetX;
        fx.y = (fx.startY ?? fx.targetY) + (fx.targetY - (fx.startY ?? fx.targetY)) * k;
        if (k >= 1) {
          for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e = state.enemies[j];
            if (Math.hypot(fx.targetX - e.x, fx.targetY - e.y) > (fx.impactRadius || 20) + e.r) continue;
            const hd = fx.dmg || 0;
            if (hd > 0) spawnDamageFloater(e.x, e.y - e.r - 6, hd, "enemy");
            e.hp -= hd;
            onIceResonatorDamageTrigger(e.x, e.y, hd);
            if (e.hp <= 0) {
              state.enemies.splice(j, 1);
              state.stats.kills++;
              onEnemyKilled(e);
            }
          }
          state.vfx.push({
            kind: "meteorShockwave",
            x: fx.targetX,
            y: fx.targetY,
            radius: (fx.impactRadius || 20) * 1.4,
            life: 0.12,
            maxLife: 0.12,
          });
          if (state.hailStorm) state.hailStorm.activeDrops = Math.max(0, (state.hailStorm.activeDrops || 0) - 1);
          state.vfx.splice(i, 1);
          continue;
        }
        continue;
      }
      fx.life -= dt;
      if (fx.life <= 0) state.vfx.splice(i, 1);
    }
  }

  function updateMines(dt) {
    if (!state?.mines?.length) return;
    const p = state.player;
    for (let i = state.mines.length - 1; i >= 0; i--) {
      const m = state.mines[i];
      let detonate = false;
      for (const e of state.enemies) {
        if (Math.hypot(e.x - m.x, e.y - m.y) <= m.triggerRadius + e.r) {
          detonate = true;
          break;
        }
      }
      if (!detonate && m.kind === "rose" && p) {
        if (Math.hypot(p.x - m.x, p.y - m.y) <= m.triggerRadius + p.r) detonate = true;
      }
      if (!detonate && m.kind === "rose" && Number.isFinite(m.fuseLeft)) {
        m.fuseLeft -= dt;
        if (m.fuseLeft <= 0) detonate = true;
      }
      if (!detonate) continue;
      applyFireballBlast(m.x, m.y, m.blastRadius, m.dmg);
      state.vfx.push({
        kind: "meteorShockwave",
        x: m.x,
        y: m.y,
        radius: m.blastRadius * 3,
        life: 0.2,
        maxLife: 0.2,
      });
      state.mines.splice(i, 1);
    }
  }

  function updateVolcanoes(dt) {
    if (!state?.volcanoes?.length) return;
    for (let i = state.volcanoes.length - 1; i >= 0; i--) {
      const v = state.volcanoes[i];
      if (v.ammo <= 0) {
        state.volcanoes.splice(i, 1);
        continue;
      }
      v.fireCd -= dt;
      while (v.fireCd <= 0 && v.ammo > 0) {
        if (!state.enemies.length) break;
        let target = null;
        let best = v.range;
        for (const e of state.enemies) {
          const dist = Math.hypot(e.x - v.x, e.y - v.y);
          if (dist < best) {
            best = dist;
            target = e;
          }
        }
        if (!target) break;
        const dx = target.x - v.x;
        const dy = target.y - v.y;
        const len = Math.hypot(dx, dy) || 1;
        state.playerShots.push({
          kind: "volcano_shot",
          x: v.x + (dx / len) * 18,
          y: v.y + (dy / len) * 18,
          vx: (dx / len) * v.projSpeed,
          vy: (dy / len) * v.projSpeed,
          life: v.projLife,
          dmg: v.dmg,
          originX: v.x,
          originY: v.y,
          maxRange: v.range,
        });
        v.ammo--;
        v.fireCd += v.fireInterval;
      }
    }
  }

  function updateRollingMeteor(dt) {
    if (!state?.rollingMeteor) return;
    const m = state.rollingMeteor;
    if (m.phase === "fall") {
      m.t += dt;
      const k = Math.max(0, Math.min(1, m.t / Math.max(0.001, m.duration || METEOR_FALL_TIME)));
      m.x = m.startX + (m.targetX - m.startX) * k;
      m.y = m.startY + (m.targetY - m.startY) * k;
      if (k >= 1) {
        applyFireballBlast(m.targetX, m.targetY, m.radius, m.dmg);
        const waveR = m.radius * m.shockwaveRadiusMul;
        const waveD = m.dmg * m.shockwaveMul;
        applyFireballBlast(m.targetX, m.targetY, waveR, waveD);
        state.vfx.push({ kind: "meteorShockwave", x: m.targetX, y: m.targetY, radius: waveR, life: 0.2, maxLife: 0.2 });
        m.phase = "roll";
        m.x = m.targetX;
        m.y = m.targetY;
      }
      return;
    }
    const step = Math.min(m.rollDistLeft, m.rollSpeed * dt);
    if (step <= 0) {
      state.rollingMeteor = null;
      return;
    }
    const nx = m.x + m.dirX * step;
    const ny = m.y + m.dirY * step;
    if (circleHitsBlocks(nx, ny, m.radius * 0.45)) {
      state.rollingMeteor = null;
      return;
    }
    m.x = nx;
    m.y = ny;
    m.rollDistLeft -= step;
    m.trailAcc += step;
    while (m.trailAcc >= m.trailStep) {
      m.trailAcc -= m.trailStep;
      placeFirePuddleAt(m.x - m.dirX * 10, m.y - m.dirY * 10, m.dmg * 0.32, 72, 2.4, 0.25);
    }
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (m.hitIds.has(e.id)) continue;
      if (Math.hypot(e.x - m.x, e.y - m.y) > e.r + m.radius * 0.7) continue;
      m.hitIds.add(e.id);
      const rd = m.dmg * 0.7;
      spawnDamageFloater(e.x, e.y - e.r - 6, rd, "enemy");
      e.hp -= rd;
      onIceResonatorDamageTrigger(e.x, e.y, rd);
      if (e.hp <= 0) {
        state.enemies.splice(i, 1);
        state.stats.kills++;
        onEnemyKilled(e);
      }
    }
    if (m.rollDistLeft <= 0) state.rollingMeteor = null;
  }

  function updateFirePuddles(dt) {
    if (!state?.firePuddles?.length) return;
    for (let i = state.firePuddles.length - 1; i >= 0; i--) {
      const p = state.firePuddles[i];
      p.t -= dt;
      p.tickAcc += dt;
      while (p.tickAcc >= p.tickEvery) {
        p.tickAcc -= p.tickEvery;
        const tickDmg = p.dps * p.tickEvery;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (Math.hypot(e.x - p.x, e.y - p.y) > p.radius + e.r) continue;
          if (tickDmg > 0) spawnDamageFloater(e.x, e.y - e.r - 6, tickDmg, "enemy");
          e.hp -= tickDmg;
          onIceResonatorDamageTrigger(e.x, e.y, tickDmg);
          if (e.hp <= 0) {
            state.enemies.splice(j, 1);
            state.stats.kills++;
            onEnemyKilled(e);
          }
        }
      }
      if (p.t <= 0) state.firePuddles.splice(i, 1);
    }
  }

  function updateFireTrail(dt) {
    if (!state?.fireTrail) return;
    const tr = state.fireTrail;
    tr.t -= dt;
    if (tr.t <= 0) {
      state.fireTrail = null;
      return;
    }
    const p = state.player;
    const dx = p.x - tr.lastX;
    const dy = p.y - tr.lastY;
    const dist = Math.hypot(dx, dy);
    if (dist < tr.spacing) return;
    const steps = Math.floor(dist / tr.spacing);
    const ux = dx / Math.max(0.001, dist);
    const uy = dy / Math.max(0.001, dist);
    for (let i = 1; i <= steps; i++) {
      const px = tr.lastX + ux * tr.spacing * i;
      const py = tr.lastY + uy * tr.spacing * i;
      placeFirePuddleAt(px, py, tr.dps, tr.radius, tr.puddleDuration, tr.tickEvery);
    }
    tr.lastX += ux * tr.spacing * steps;
    tr.lastY += uy * tr.spacing * steps;
  }

  function updateIceWalls(dt) {
    if (!state?.iceWalls?.length) return;
    for (let i = state.iceWalls.length - 1; i >= 0; i--) {
      const w = state.iceWalls[i];
      w.t -= dt;
      if (w.t <= 0) state.iceWalls.splice(i, 1);
    }
  }

  function updateAegisReviveFx(dt) {
    if (!state || !state.aegisReviveFx) return;
    state.aegisReviveFx.t += dt;
    if (state.aegisReviveFx.t >= state.aegisReviveFx.duration) state.aegisReviveFx = null;
  }

  function updateReviveFlow(dtReal) {
    if (!state || !state.revivePending) return;
    state.revivePending.timer += dtReal;
    if (state.revivePending.timer < REVIVE_DELAY_SEC) return;
    const p = state.player;
    p.x = state.revivePending.x;
    p.y = state.revivePending.y;
    state.stats.hp = state.stats.maxHp;
    state.playerInvulnerability = REVIVE_INVULN_SEC;
    state.aegisReviveFx = { x: p.x, y: p.y, t: 0, duration: 0.9 };
    state.revivePending = null;
  }

  function updatePlayerInvulnerability(dtReal) {
    if (!state) return;
    state.playerInvulnerability = Math.max(0, (state.playerInvulnerability || 0) - dtReal);
  }

  function applyShieldedDamage(incoming = 0) {
    if (!state || !state.activeShield) return incoming;
    if (state.activeShield.type === "invuln") return 0;
    if (state.activeShield.type === "ice_shell") {
      state.activeShield.absorbedDamage = (state.activeShield.absorbedDamage || 0) + Math.max(0, incoming || 0);
      return 0;
    }
    if (state.activeShield.type === "fire") return Math.max(0, incoming * 0.5);
    if (state.activeShield.type === "absorb") {
      const left = Math.max(0, state.activeShield.armor || 0);
      const dmg = Math.max(0, incoming || 0);
      const absorbed = Math.min(left, dmg);
      state.activeShield.armor = Math.max(0, left - absorbed);
      const remain = dmg - absorbed;
      if (state.activeShield.armor <= 0) state.activeShield = null;
      return remain;
    }
    return incoming;
  }

  function applyShieldedDamageToClone(incoming = 0) {
    if (!state?.cloneActiveShield || !state.weeClone) return incoming;
    const sh = state.cloneActiveShield;
    if (sh.type === "invuln") return 0;
    if (sh.type === "ice_shell") {
      sh.absorbedDamage = (sh.absorbedDamage || 0) + Math.max(0, incoming || 0);
      return 0;
    }
    if (sh.type === "fire") return Math.max(0, incoming * 0.5);
    if (sh.type === "absorb") {
      const left = Math.max(0, sh.armor || 0);
      const dmg = Math.max(0, incoming || 0);
      const absorbed = Math.min(left, dmg);
      sh.armor = Math.max(0, left - absorbed);
      const remain = dmg - absorbed;
      if (sh.armor <= 0) state.cloneActiveShield = null;
      return remain;
    }
    return incoming;
  }

  function detonateIceShell(shield, centerX = null, centerY = null) {
    if (!state || !shield || shield.type !== "ice_shell") return;
    const p = state.player;
    const cx = Number.isFinite(centerX) ? centerX : p.x;
    const cy = Number.isFinite(centerY) ? centerY : p.y;
    const waveRadius = 200;
    const dmg = Math.max(0, shield.absorbedDamage || 0);
    spawnPulseWave(cx, cy, waveRadius, 0.42, "rgba(190, 245, 255, 0.62)", 3.2);
    for (const e of state.enemies) {
      const dx = e.x - cx;
      const dy = e.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > waveRadius + e.r) continue;
      if (dmg > 0) {
        spawnDamageFloater(e.x, e.y - e.r - 6, dmg, "enemy");
        e.hp -= dmg;
        onIceResonatorDamageTrigger(e.x, e.y, dmg);
      }
      if (e.kind !== "boss1" && e.kind !== "boss2" && !e.elite) {
        const nx = dist > 1e-4 ? dx / dist : Math.cos(Math.random() * Math.PI * 2);
        const ny = dist > 1e-4 ? dy / dist : Math.sin(Math.random() * Math.PI * 2);
        e.x = cx + nx * waveRadius;
        e.y = cy + ny * waveRadius;
      }
    }
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      if (state.enemies[i].hp <= 0) {
        const dead = state.enemies[i];
        state.enemies.splice(i, 1);
        state.stats.kills++;
        onEnemyKilled(dead);
      }
    }
  }

  function invokeCooldownTick(dt) {
    if (!state.invokeSpellCd) return;
    for (const k of Object.keys(state.invokeSpellCd)) {
      state.invokeSpellCd[k] = Math.max(0, state.invokeSpellCd[k] - dt);
    }
    state.dualSharedCd = Math.max(0, (state.dualSharedCd || 0) - dt);
    for (const slot of state.artifactSlots || []) {
      slot.cooldown = Math.max(0, (slot.cooldown || 0) - dt);
    }
    if (state.activeShield && typeof state.activeShield.t === "number") {
      state.activeShield.t -= dt;
      if (state.activeShield.t <= 0) {
        const expiredShield = state.activeShield;
        state.activeShield = null;
        if (expiredShield.type === "ice_shell") detonateIceShell(expiredShield);
      }
    }
    if (state.cloneActiveShield && state.weeClone && typeof state.cloneActiveShield.t === "number") {
      state.cloneActiveShield.t -= dt;
      if (state.cloneActiveShield.t <= 0) {
        const expiredC = state.cloneActiveShield;
        state.cloneActiveShield = null;
        if (expiredC.type === "ice_shell" && state.weeClone)
          detonateIceShell(expiredC, state.weeClone.x, state.weeClone.y);
      }
    }
    renderInvokeCooldownRow();
    renderArtifactSlots();
  }

  function updateFearAura(dt) {
    if (!state || !state.fearAura) return;
    const a = state.fearAura;
    a.t -= dt;
    a.tickAcc += dt;
    while (a.tickAcc >= a.tickEvery) {
      a.tickAcc -= a.tickEvery;
      applyStatusInRadius(state.player.x, state.player.y, a.radius, "fear", a.fearDuration);
    }
    if (a.t <= 0) state.fearAura = null;
  }

  function updateFireShieldAura(dt) {
    const tickFireShieldAt = (cx, cy, sh) => {
      sh.tickAcc = (sh.tickAcc || 0) + dt;
      while (sh.tickAcc >= sh.tickEvery) {
        sh.tickAcc -= sh.tickEvery;
        const tickDmg = (sh.dps || 0) * sh.tickEvery;
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const e = state.enemies[i];
          if (Math.hypot(e.x - cx, e.y - cy) > (sh.radius || 100) + e.r) continue;
          if (tickDmg > 0) spawnDamageFloater(e.x, e.y - e.r - 6, tickDmg, "enemy");
          e.hp -= tickDmg;
          onIceResonatorDamageTrigger(e.x, e.y, tickDmg);
          if (e.hp <= 0) {
            state.enemies.splice(i, 1);
            state.stats.kills++;
            onEnemyKilled(e);
          }
        }
      }
    };
    if (state?.activeShield && state.activeShield.type === "fire") {
      tickFireShieldAt(state.player.x, state.player.y, state.activeShield);
    }
    if (state?.cloneActiveShield && state.cloneActiveShield.type === "fire" && state.weeClone) {
      tickFireShieldAt(state.weeClone.x, state.weeClone.y, state.cloneActiveShield);
    }
  }

  function updateArmamentRecollection(dt) {
    const ar = state.armamentRecollection;
    if (!ar) return;
    ar.t += dt;
    const { waveSec, vineSec, postWrapDelay, waveRadiusMax, originX, originY, targetIds } = ar;
    const vineEnd = waveSec + vineSec;
    const drainStart = vineEnd + postWrapDelay;
    const perTick = ar.drainHpPerTick ?? 10;
    const every = ar.drainTickEvery ?? 0.1;

    if (ar.t >= waveSec && !ar.roseSlots) {
      const n = 56;
      const maxR = waveRadiusMax * 0.94;
      const golden = Math.PI * (3 - Math.sqrt(5));
      ar.roseSlots = [];
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const r = Math.sqrt(t) * maxR;
        const theta = i * golden;
        ar.roseSlots.push({
          x: originX + Math.cos(theta) * r,
          y: originY + Math.sin(theta) * r * 0.94,
          ang: theta,
        });
      }
    }

    if (ar.t <= waveSec) {
      const waveR = (ar.t / waveSec) * waveRadiusMax;
      for (const e of state.enemies) {
        if (ar.waveHitIds.has(e.id)) continue;
        const dist = Math.hypot(e.x - originX, e.y - originY);
        if (dist > waveR + e.r) continue;
        ar.waveHitIds.add(e.id);
        ar.targetIds.push(e.id);
        applyEnemyStatus(e, "stun", 1e5);
      }
    }

    if (ar.t < drainStart) return;

    if (!ar.targetIds.length) {
      clearArmamentRecollectionWithMines();
      return;
    }

    ar.drainTickAcc = (ar.drainTickAcc || 0) + dt;
    while (ar.drainTickAcc >= every) {
      ar.drainTickAcc -= every;
      if (state.gameOver) {
        clearArmamentRecollectionWithMines();
        return;
      }
      applyPlayerArmamentDoTTick(perTick);
      if (state.gameOver) {
        clearArmamentRecollectionWithMines();
        return;
      }
      for (const eid of targetIds) {
        const j = state.enemies.findIndex((en) => en.id === eid);
        if (j >= 0) applyEnemyArmamentDoTTick(j, perTick);
      }
      if (state.gameOver) {
        clearArmamentRecollectionWithMines();
        return;
      }
      const anyEnemyLeft = targetIds.some((id) => state.enemies.some((en) => en.id === id));
      if (!anyEnemyLeft) {
        clearArmamentRecollectionWithMines();
        return;
      }
    }
  }

  function drawIceRoseAt(ctx, cx, cy, bloom, facing, fadeMul = 1) {
    const b = Math.max(0, Math.min(1, bloom));
    const ease = 1 - (1 - b) * (1 - b);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(facing);
    const layers = 3;
    for (let ring = 0; ring < layers; ring++) {
      const nPet = 9 - ring * 2;
      const spread = (0.42 + ring * 0.14) * ease;
      const petW = (10 + ring * 3.5) * spread;
      const petLen = (20 - ring * 5.5) * spread;
      for (let i = 0; i < nPet; i++) {
        const a = (i / nPet) * Math.PI * 2 + ring * 0.22;
        ctx.save();
        ctx.rotate(a);
        ctx.globalAlpha = (0.35 + 0.35 * ease) * fadeMul;
        ctx.fillStyle = ring === 0 ? "rgba(235, 252, 255, 0.92)" : "rgba(210, 242, 255, 0.78)";
        ctx.beginPath();
        ctx.ellipse(0, -petLen * 0.42, petW, petLen * 0.48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(150, 200, 235, ${(0.45 + 0.35 * ease) * fadeMul})`;
        ctx.lineWidth = 1.15;
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalAlpha = (0.55 + 0.4 * ease) * fadeMul;
    ctx.fillStyle = "rgba(248, 254, 255, 0.95)";
    ctx.beginPath();
    ctx.arc(0, 0, 4.5 * ease + 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(140, 190, 225, ${0.55 * fadeMul})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawArmamentVinePath(ctx, px, py, tx, ty, eid, t) {
    const len = Math.hypot(tx - px, ty - py) || 1;
    const nx = (tx - px) / len;
    const ny = (ty - py) / len;
    const pxp = -ny;
    const pyp = nx;
    const segs = Math.max(8, Math.ceil(len / 42));
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let s = 1; s <= segs; s++) {
      const u = s / segs;
      const bx = px + (tx - px) * u;
      const by = py + (ty - py) * u;
      const wig = Math.sin(u * 13 + eid * 0.31 + t * 12) * (6 + 5 * (1 - u));
      ctx.lineTo(bx + pxp * wig, by + pyp * wig);
    }
    ctx.strokeStyle = "rgba(215, 252, 255, 0.9)";
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.beginPath();
    for (let s = 1; s < segs; s++) {
      const u = s / segs;
      const bx = px + (tx - px) * u;
      const by = py + (ty - py) * u;
      const wig = Math.sin(u * 13 + eid * 0.31 + t * 12) * (6 + 5 * (1 - u));
      const qx = bx + pxp * wig;
      const qy = by + pyp * wig;
      const tu = Math.atan2(ty - py, tx - px);
      const thLen = 5 + (s % 3) * 2;
      ctx.moveTo(qx, qy);
      ctx.lineTo(qx + Math.cos(tu + Math.PI * 0.55) * thLen, qy + Math.sin(tu + Math.PI * 0.55) * thLen);
    }
    ctx.strokeStyle = "rgba(160, 210, 240, 0.82)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function drawArmamentRecollectionLayer(ctx, p) {
    const ar = state.armamentRecollection;
    if (!ar) return;
    const { waveSec, vineSec, postWrapDelay, waveRadiusMax, originX, originY, targetIds } = ar;
    const t = ar.t;
    const vineEnd = waveSec + vineSec;
    const drainStart = vineEnd + postWrapDelay;
    const px = p.x;
    const py = p.y;
    const pulse = 0.5 + 0.5 * Math.sin(state.stats.time * 9);

    if (t <= waveSec) {
      const wk = Math.min(1, t / waveSec);
      const wr = wk * waveRadiusMax;
      const g = ctx.createRadialGradient(originX, originY, 0, originX, originY, wr);
      g.addColorStop(0, `rgba(220, 250, 255, ${0.06 + 0.06 * pulse})`);
      g.addColorStop(0.55, `rgba(190, 235, 255, ${0.04 * (1 - wk * 0.4)})`);
      g.addColorStop(1, "rgba(160, 210, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(originX, originY, wr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(210, 248, 255, ${0.14 + 0.1 * (1 - wk)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(originX, originY, wr, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(200, 245, 255, ${0.32 + 0.12 * pulse})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(px, py, p.r + 9 + Math.sin(state.stats.time * 7) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(170, 220, 255, ${0.18 + 0.08 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, p.r + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(200, 240, 255, ${0.06 + 0.04 * pulse})`;
    ctx.beginPath();
    ctx.arc(px, py, p.r + 3, 0, Math.PI * 2);
    ctx.fill();

    if (ar.roseSlots && t >= waveSec) {
      const vineT = Math.max(0, t - waveSec);
      const n = ar.roseSlots.length;
      for (let i = 0; i < n; i++) {
        const slot = ar.roseSlots[i];
        let bloomEase = 1;
        if (t < vineEnd) {
          const phaseOff = (i / n) * Math.max(0.15, vineSec - 0.3);
          const stagger = Math.min(1, Math.max(0, (vineT - phaseOff) / 0.32));
          bloomEase = 1 - (1 - stagger) * (1 - stagger);
        }
        drawIceRoseAt(ctx, slot.x, slot.y, bloomEase, slot.ang + Math.PI * 0.5 + bloomEase * 0.07, 1);
      }
    }

    if (t >= waveSec && t < vineEnd) {
      const vineT = t - waveSec;
      const vk = vineT / vineSec;
      for (const eid of targetIds) {
        const e = state.enemies.find((en) => en.id === eid);
        if (!e) continue;
        const tx = px + (e.x - px) * vk;
        const ty = py + (e.y - py) * vk;
        drawArmamentVinePath(ctx, px, py, tx, ty, eid, t);
      }
    }

    if (t >= vineEnd) {
      for (const eid of targetIds) {
        const e = state.enemies.find((en) => en.id === eid);
        if (!e) continue;
        drawArmamentVinePath(ctx, px, py, e.x, e.y, eid, t);
      }
    }

    if (t >= vineEnd && targetIds.length) {
      const wrapK = t < drainStart ? (t - vineEnd) / postWrapDelay : 1;
      const dotPulse = t >= drainStart ? 0.55 + 0.45 * Math.sin((t - drainStart) * 24) : 1;
      for (const eid of targetIds) {
        const e = state.enemies.find((en) => en.id === eid);
        if (!e) continue;
        const coils = 3;
        ctx.strokeStyle = `rgba(200, 245, 255, ${0.22 + 0.2 * wrapK * dotPulse})`;
        ctx.lineWidth = 1.8;
        for (let c = 0; c < coils; c++) {
          const off = (c / coils) * Math.PI * 2 + eid * 0.15;
          ctx.beginPath();
          const r0 = e.r + 4 + c * 5;
          for (let a = 0; a <= 28; a++) {
            const ang = off + (a / 28) * Math.PI * 2.3;
            const rr = r0 + Math.sin(a * 0.9 + t * 5) * 3 * wrapK;
            const ex = e.x + Math.cos(ang) * rr;
            const ey = e.y + Math.sin(ang) * rr * 0.88;
            if (a === 0) ctx.moveTo(ex, ey);
            else ctx.lineTo(ex, ey);
          }
          ctx.stroke();
        }
        if (t >= drainStart) {
          ctx.strokeStyle = `rgba(230, 252, 255, ${0.12 + 0.14 * dotPulse})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (t >= drainStart) {
        const dp = 0.45 + 0.35 * Math.sin((t - drainStart) * 22);
        ctx.strokeStyle = `rgba(255, 240, 250, ${0.25 + 0.2 * dp})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, p.r + 11, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function updateElementalSpin(dt) {
    if (!state?.elementalSpin) return;
    const es = state.elementalSpin;
    es.t -= dt;
    es.tickAcc += dt;
    const p = state.player;
    while (es.tickAcc >= es.tickEvery) {
      es.tickAcc -= es.tickEvery;
      const a = Math.random() * Math.PI * 2;
      const roll = Math.random();
      if (roll < 1 / 3) {
        spawnIceSpearShot(p.x, p.y, a, state.stats.iceSpearDamage, 1.15, 0.42, BASE_ICE_PIERCE, 1);
      } else if (roll < 2 / 3) {
        castDirectedLightningChain(a, state.stats.lightningDamage, BASE_LIGHTNING_BOUNCES, BASE_LIGHTNING_BOUNCE_RADIUS);
      } else {
        state.playerShots.push({
          kind: "volcano_shot",
          x: p.x + Math.cos(a) * 18,
          y: p.y + Math.sin(a) * 18,
          vx: Math.cos(a) * 680,
          vy: Math.sin(a) * 680,
          life: 1.4,
          dmg: state.stats.fireballDamage,
          originX: p.x,
          originY: p.y,
          maxRange: 1000,
        });
      }
    }
    if (es.t <= 0) state.elementalSpin = null;
  }

  function updateHailStorm(dt) {
    if (!state?.hailStorm) return;
    const h = state.hailStorm;
    h.spawnAcc += dt * h.spawnRate;
    while (h.spawned < h.dropTotal && h.spawnAcc >= 1) {
      h.spawnAcc -= 1;
      h.spawned++;
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * h.radius;
      const tx = h.x + Math.cos(a) * rr;
      const ty = h.y + Math.sin(a) * rr;
      state.vfx.push({
        kind: "hailDrop",
        x: tx + rand(-10, 10),
        startY: ty - rand(260, 420),
        targetX: tx,
        targetY: ty,
        t: 0,
        duration: 0.42 + Math.random() * 0.12,
        dmg: h.dropDamage,
        impactRadius: h.impactRadius,
      });
      h.activeDrops++;
    }
    if (h.spawned >= h.dropTotal && h.activeDrops <= 0) state.hailStorm = null;
  }

  function updateWindGust(dt) {
    if (!state?.windGust) return;
    const g = state.windGust;
    g.t -= dt;
    const halfW = g.width * 0.5;
    for (const e of state.enemies) {
      const dx = e.x - g.x;
      const dy = e.y - g.y;
      const front = dx * g.fx + dy * g.fy;
      if (front < -e.r || front > g.length + e.r) continue;
      const side = dx * g.rx + dy * g.ry;
      if (Math.abs(side) > halfW + e.r) continue;
      const nx = e.x + g.fx * g.pushSpeed * dt;
      const ny = e.y + g.fy * g.pushSpeed * dt;
      tryMoveEnemy(e, nx, ny);
    }
    if (g.t <= 0) state.windGust = null;
  }

  function updateLightningDash(dt) {
    if (!state || !state.lightningDash) return;
    const d = state.lightningDash;
    const p = state.player;
    if (d.phase === "charge") {
      d.chargeT -= dt;
      if (d.chargeT <= 0) d.phase = "dash";
      return;
    }
    const move = Math.min(d.remain, d.speed * dt);
    if (move <= 0) {
      state.lightningDash = null;
      return;
    }
    const nx = p.x + d.ux * move;
    const ny = p.y + d.uy * move;
    if (!circleHitsBlocks(nx, ny, p.r)) {
      p.x = nx;
      p.y = ny;
      d.remain -= move;
    } else {
      d.remain = 0;
    }
    const m = BORDER_WALL + p.r;
    p.x = Math.max(m, Math.min(WORLD_W - m, p.x));
    p.y = Math.max(m, Math.min(WORLD_H - m, p.y));
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (d.hitIds.has(e.id)) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > p.r + e.r + 10) continue;
      d.hitIds.add(e.id);
      spawnDamageFloater(e.x, e.y - e.r - 6, d.dmg, "enemy");
      e.hp -= d.dmg;
      onIceResonatorDamageTrigger(e.x, e.y, d.dmg);
      applyEnemyStatus(e, "stun", 0.5);
      if (e.hp <= 0) {
        state.enemies.splice(i, 1);
        state.stats.kills++;
        onEnemyKilled(e);
      }
    }
    if (d.remain <= 0) {
      spawnPulseWave(p.x, p.y, 72, 0.26, "rgba(255, 240, 180, 0.55)", 2.2);
      state.lightningDash = null;
    }
  }

  function updateBeamChannel(dt) {
    if (!state || !state.beamChannel) return;
    const b = state.beamChannel;
    b.t -= dt;
    const target = getPlayerAimAngle();
    let delta = target - b.angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const maxTurn = BEAM_CHANNEL_TURN_RATE * dt;
    if (delta > maxTurn) delta = maxTurn;
    if (delta < -maxTurn) delta = -maxTurn;
    b.angle += delta;
    b.tickAcc += dt;
    const p = state.player;
    const bx = p.x + Math.cos(b.angle) * b.range;
    const by = p.y + Math.sin(b.angle) * b.range;
    while (b.tickAcc >= b.tickEvery) {
      b.tickAcc -= b.tickEvery;
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const d = distancePointToSegment(e.x, e.y, p.x, p.y, bx, by);
        if (d > b.width * 0.5 + e.r) continue;
        if (b.dmgPerTick > 0) spawnDamageFloater(e.x, e.y - e.r - 6, b.dmgPerTick, "enemy");
        e.hp -= b.dmgPerTick;
        onIceResonatorDamageTrigger(e.x, e.y, b.dmgPerTick);
        if (e.hp <= 0) {
          state.enemies.splice(i, 1);
          state.stats.kills++;
          onEnemyKilled(e);
        }
      }
    }
    if (b.t <= 0) state.beamChannel = null;
  }

  function updateBlackHole(dt) {
    if (!state || !state.blackHole) return;
    const bh = state.blackHole;
    bh.t -= dt;
    bh.dotTickAcc += dt;
    let doDotTick = false;
    if (bh.dotTickAcc >= bh.dotTickEvery) {
      bh.dotTickAcc -= bh.dotTickEvery;
      doDotTick = true;
    }
    for (const e of state.enemies) {
      const dx = bh.x - e.x;
      const dy = bh.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > bh.outerRadius + e.r) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const step = e.speed * bh.pullMul * dt;
      const tx = e.x + nx * step;
      const ty = e.y + ny * step;
      tryMoveEnemy(e, tx, ty);
      if (dist <= bh.radius + e.r) {
        applyEnemyStatus(e, "stun", 0.12);
      }
      if (doDotTick && dist <= bh.coreRadius + e.r) {
        if (bh.dotDamage > 0) spawnDamageFloater(e.x, e.y - e.r - 6, bh.dotDamage, "enemy");
        e.hp -= bh.dotDamage;
        onIceResonatorDamageTrigger(e.x, e.y, bh.dotDamage);
      }
    }
    if (doDotTick) {
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        if (e.hp > 0) continue;
        state.enemies.splice(i, 1);
        state.stats.kills++;
        onEnemyKilled(e);
      }
    }
    if (bh.t <= 0) state.blackHole = null;
  }

  function playerInput(dt) {
    if (state.revivePending) return;
    if (state.lightningDash) return;
    if (state.armamentRecollection) return;
    if (state.beamChannel) return;
    if (state.activeShield && (state.activeShield.type === "invuln" || state.activeShield.type === "ice_shell")) return;
    const p = state.player;
    const hasteMul = state.stats.time < (state.invokeHasteUntil || 0) ? 1.5 : 1;
    const spinMul = state.elementalSpin ? 1.2 : 1;
    const s = state.stats.moveSpeed * (state.pendingRuneCast ? RUNE_CAST_MOVE_SPEED_MULT : 1) * hasteMul * spinMul;
    let dx = 0;
    let dy = 0;
    if (mouseLeftHeld) {
      setMoveTargetFromMouse();
      const { camX, camY } = getCamera();
      const wx = mouseCanvasX + camX;
      const wy = mouseCanvasY + camY;
      let mx = wx - p.x;
      let my = wy - p.y;
      const mlen = Math.hypot(mx, my);
      if (mlen > 6) {
        mx /= mlen;
        my /= mlen;
        dx = mx;
        dy = my;
      }
    } else if (moveTarget) {
      let mx = moveTarget.x - p.x;
      let my = moveTarget.y - p.y;
      const mlen = Math.hypot(mx, my);
      if (mlen <= 7) {
        moveTarget = null;
      } else {
        mx /= mlen;
        my /= mlen;
        dx = mx;
        dy = my;
      }
    }
    const step = s * dt;
    const nx = p.x + dx * step;
    if (!circleHitsBlocks(nx, p.y, p.r)) p.x = nx;
    const ny = p.y + dy * step;
    if (!circleHitsBlocks(p.x, ny, p.r)) p.y = ny;
    const m = BORDER_WALL + p.r;
    p.x = Math.max(m, Math.min(WORLD_W - m, p.x));
    p.y = Math.max(m, Math.min(WORLD_H - m, p.y));
  }

  function tryMoveEnemy(e, nx, ny) {
    if (!circleHitsBlocks(nx, e.y, e.r)) e.x = nx;
    if (!circleHitsBlocks(e.x, ny, e.r)) e.y = ny;
  }

  function enemyTouchPlayer(e) {
    if (state.lightningDash && state.lightningDash.phase === "dash") return;
    if (state.revivePending || state.playerInvulnerability > 0) return;
    const p = state.player;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < p.r + e.r * 0.85 && e.touchCd <= 0) {
      onIceResonatorDamageTrigger(p.x, p.y, e.dmg);
      const damageTaken = applyShieldedDamage(e.dmg);
      if (damageTaken > 0) {
        spawnDamageFloater(p.x, p.y - p.r - 10, damageTaken, "player");
        state.stats.hp -= damageTaken;
      }
      e.touchCd = 0.6;
      if (state.stats.hp <= 0) {
        if (!tryConsumeAegisOnFatalHit()) {
          state.stats.hp = 0;
          state.gameOver = true;
        }
      }
    }
  }

  function updateEnemies(dt) {
    const p = state.player;
    for (const e of state.enemies) {
      if (!e.statuses) e.statuses = {};
      for (const key of Object.keys(e.statuses)) {
        e.statuses[key] = Math.max(0, e.statuses[key] - dt);
      }
      e.touchCd = Math.max(0, e.touchCd - dt);
      if (e.statuses.stun > 0) {
        enemyTouchPlayer(e);
        continue;
      }
      if (e.statuses.fear > 0 && e.kind !== "boss1" && e.kind !== "boss2") {
        const dxFear = p.x - e.x;
        const dyFear = p.y - e.y;
        const lenFear = Math.hypot(dxFear, dyFear) || 1;
        const spFear = e.speed * dt;
        tryMoveEnemy(e, e.x - (dxFear / lenFear) * spFear, e.y - (dyFear / lenFear) * spFear);
        continue;
      }
      let sp = e.speed * dt;
      const anchorMul = applyAnchorPhysicsToEnemy(e, dt);
      if (anchorMul !== false) sp *= anchorMul;
      const tgt = getEnemyChasePoint(e.x, e.y);
      const tx = tgt.x;
      const ty = tgt.y;
      if (e.kind === "boss1" || e.kind === "boss2") {
        let dx = tx - e.x;
        let dy = ty - e.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        tryMoveEnemy(e, e.x + dx * sp, e.y + dy * sp);
        e.shootCd -= dt;
        if (d <= SHOOTER_FIRE_RANGE * 1.25 && e.shootCd <= 0) {
          e.shootCd = e.shootInterval;
          const bs = e.bulletSpeed;
          state.enemyBullets.push({
            x: e.x + dx * (e.r + 8),
            y: e.y + dy * (e.r + 8),
            vx: dx * bs,
            vy: dy * bs,
            life: 3.8,
            dmg: e.bulletDmg,
          });
        }
        enemyTouchPlayer(e);
      } else if (e.kind === "shooter" || e.kind === "sniper") {
        let dx = tx - e.x;
        let dy = ty - e.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const ring = 360;
        if (d < ring - 50) {
          tryMoveEnemy(e, e.x - dx * sp, e.y - dy * sp);
        } else if (d > ring + 100) {
          tryMoveEnemy(e, e.x + dx * sp, e.y + dy * sp);
        } else {
          const tnx = -dy;
          const tny = dx;
          const sd = Math.sin(state.stats.time * 2.2 + e.id * 0.7) > 0 ? 1 : -1;
          tryMoveEnemy(e, e.x + tnx * sp * 0.62 * sd, e.y + tny * sp * 0.62 * sd);
        }
        e.shootCd -= dt;
        const fireRange = e.kind === "sniper" ? SHOOTER_FIRE_RANGE + 140 : SHOOTER_FIRE_RANGE;
        if (d <= fireRange && e.shootCd <= 0) {
          e.shootCd = e.shootInterval;
          const bs = e.bulletSpeed;
          state.enemyBullets.push({
            x: e.x + dx * 24,
            y: e.y + dy * 24,
            vx: dx * bs,
            vy: dy * bs,
            life: 3.4,
            dmg: e.bulletDmg,
          });
        }
        enemyTouchPlayer(e);
      } else {
        const dx = tx - e.x;
        const dy = ty - e.y;
        const len = Math.hypot(dx, dy) || 1;
        if (e.statuses.fear > 0) {
          tryMoveEnemy(e, e.x - (dx / len) * sp, e.y - (dy / len) * sp);
        } else {
          tryMoveEnemy(e, e.x + (dx / len) * sp, e.y + (dy / len) * sp);
        }
        enemyTouchPlayer(e);
      }
    }
  }

  function updateEnemyBullets(dt) {
    const p = state.player;
    const bullets = state.enemyBullets;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -120 || b.x > WORLD_W + 120 || b.y < -120 || b.y > WORLD_H + 120) {
        bullets.splice(i, 1);
        continue;
      }
      if (circleHitsBlocks(b.x, b.y, 4)) {
        bullets.splice(i, 1);
        continue;
      }
      if (b.fromEewReflect) {
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 7) {
            applyDamageEnemyIndex(j, b.dmg);
            bullets.splice(i, 1);
            break;
          }
        }
        continue;
      }
      const cone = state.eewCone;
      if (cone && pointInEewCone(b.x, b.y, cone)) {
        const spd = Math.hypot(b.vx, b.vy) || 1;
        const remDist = spd * Math.max(0.001, b.life);
        let tdx = 0;
        let tdy = 0;
        let bestD = Infinity;
        for (const e of state.enemies) {
          const dd = Math.hypot(e.x - b.x, e.y - b.y);
          if (dd < bestD) {
            bestD = dd;
            tdx = e.x - b.x;
            tdy = e.y - b.y;
          }
        }
        if (!state.enemies.length || bestD === Infinity) {
          tdx = -b.vx;
          tdy = -b.vy;
        }
        const vlen = Math.hypot(tdx, tdy) || 1;
        b.vx = (tdx / vlen) * spd;
        b.vy = (tdy / vlen) * spd;
        b.fromEewReflect = true;
        if (!b.eewBuffed) {
          b.dmg *= 1.15;
          b.eewBuffed = true;
        }
        b.life = remDist / Math.max(0.001, spd);
        continue;
      }
      const clo = state.weeClone;
      const dPlayer = Math.hypot(b.x - p.x, b.y - p.y);
      const hitPlayer = dPlayer < p.r + 6;
      const dClone = clo && clo.hp > 0 ? Math.hypot(b.x - clo.x, b.y - clo.y) : Infinity;
      const hitClone = clo && clo.hp > 0 && dClone < clo.r + 6;
      let target = null;
      if (hitPlayer && hitClone) target = dClone <= dPlayer ? "clone" : "player";
      else if (hitClone) target = "clone";
      else if (hitPlayer) target = "player";
      if (target === "clone") {
        if (state.lightningDash && state.lightningDash.phase === "dash") {
          bullets.splice(i, 1);
          continue;
        }
        onIceResonatorDamageTrigger(clo.x, clo.y, b.dmg);
        const toHp = applyShieldedDamageToClone(b.dmg);
        if (toHp > 0) {
          spawnDamageFloater(clo.x, clo.y - clo.r - 10, toHp, "player");
          clo.hp -= toHp;
        }
        bullets.splice(i, 1);
        if (clo.hp <= 0) clearWeeClone();
        continue;
      }
      if (target === "player") {
        if (state.lightningDash && state.lightningDash.phase === "dash") {
          bullets.splice(i, 1);
          continue;
        }
        if (state.revivePending || state.playerInvulnerability > 0) {
          bullets.splice(i, 1);
          continue;
        }
        onIceResonatorDamageTrigger(p.x, p.y, b.dmg);
        const damageTaken = applyShieldedDamage(b.dmg);
        if (damageTaken > 0) {
          spawnDamageFloater(p.x, p.y - p.r - 10, damageTaken, "player");
          state.stats.hp -= damageTaken;
        }
        bullets.splice(i, 1);
        if (state.stats.hp <= 0) {
          if (!tryConsumeAegisOnFatalHit()) {
            state.stats.hp = 0;
            state.gameOver = true;
          }
        }
      }
    }
  }

  function updateSkillBar() {
    if (!state || !skillSlotsWrap || !skillBar || skillBar.classList.contains("hidden")) return;
    const main = skillSlotsWrap.querySelectorAll(".skill-slot-main");
    if (main.length !== 4) return;
    const labels = ["Ice Rune", "Lightning Rune", "Fire Rune", "Invoke"];
    for (let i = 0; i < 4; i++) {
      const el = main[i];
      const lbl = el.querySelector(".skill-label");
      if (lbl) lbl.textContent = labels[i];
      el.disabled = false;
      el.classList.remove("on-cd");
      el.classList.remove("skill-slot-casting");
      el.style.removeProperty("--cast-progress");
    }
    if (hasActiveChannelSkill()) {
      for (let i = 0; i < main.length; i++) main[i].disabled = true;
    }
    if (state.pendingRuneCast && state.pendingRuneCast.slotIndex >= 0 && state.pendingRuneCast.slotIndex <= 2) {
      const castBtn = main[state.pendingRuneCast.slotIndex];
      if (castBtn) {
        const total = Math.max(0.001, state.pendingRuneCast.total || BASE_RUNE_CAST_TIME_SEC);
        const progress = Math.max(0, Math.min(1, state.pendingRuneCast.timer / total));
        castBtn.classList.add("skill-slot-casting");
        castBtn.style.setProperty("--cast-progress", `${progress}`);
      }
    }
    const invokeMain = main[3];
    if (invokeMain && state.invokePayload) {
      const combo = matchInvokeCombo(state.invokePayload.kinds);
      if (combo) {
        const cdLeft = combo.sequence.length === 2 ? state.dualSharedCd || 0 : state.invokeSpellCd[combo.id] || 0;
        if (cdLeft > 0.01) {
          invokeMain.classList.add("on-cd");
          invokeMain.title = `${combo.sequence}: ${cdLeft.toFixed(1)}с`;
        } else {
          invokeMain.title = combo.sequence;
        }
      }
    }
  }

  function updateGems(dt) {
    const p = state.player;
    const pr = state.stats.pickupRadius;
    for (let i = state.gems.length - 1; i >= 0; i--) {
      const g = state.gems[i];
      g.y += g.v * dt;
      g.v *= 0.92;
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < pr + g.r) {
        const norm = Math.max(0, Math.min(1, 1 - d / Math.max(1, pr + g.r)));
        const pull = (640 + 1600 * norm) * dt;
        if (d > 1e-4) {
          const nx = dx / d;
          const ny = dy / d;
          g.x += nx * pull;
          g.y += ny * pull;
        }
        if (d < pr * 0.45 + g.r + p.r) {
          g.x = p.x;
          g.y = p.y;
        }
      }
      if (d < p.r + g.r) {
        state.stats.coins += Math.max(1, g.xp | 0);
        state.gems.splice(i, 1);
      }
    }
  }

  function updateHealPickups(dt) {
    const p = state.player;
    const pr = state.stats.pickupRadius;
    for (let i = state.healPickups.length - 1; i >= 0; i--) {
      const h = state.healPickups[i];
      h.y += h.v * dt;
      h.v *= 0.92;
      const dx = p.x - h.x;
      const dy = p.y - h.y;
      const d = Math.hypot(dx, dy);
      if (d < pr + h.r) {
        const norm = Math.max(0, Math.min(1, 1 - d / Math.max(1, pr + h.r)));
        const pull = (620 + 1500 * norm) * dt;
        if (d > 1e-4) {
          const nx = dx / d;
          const ny = dy / d;
          h.x += nx * pull;
          h.y += ny * pull;
        }
        if (d < pr * 0.45 + h.r + p.r) {
          h.x = p.x;
          h.y = p.y;
        }
      }
      if (d < p.r + h.r) {
        const s = state.stats;
        s.hp = Math.min(s.maxHp, s.hp + h.heal);
        state.healPickups.splice(i, 1);
      }
    }
  }

  function updateArtifactPickups(dt) {
    const p = state.player;
    for (let i = state.artifactPickups.length - 1; i >= 0; i--) {
      const a = state.artifactPickups[i];
      a.phase += dt * 2.6;
      if (Math.hypot(a.x - p.x, a.y - p.y) < p.r + a.r + 4) {
        const choices = a.choices;
        state.artifactPickups.splice(i, 1);
        openArtifactChoice(choices);
      }
    }
  }

  function updateHud() {
    const s = state.stats;
    hpBar.style.width = `${(100 * s.hp) / s.maxHp}%`;
    if (hpText) hpText.textContent = `${Math.round(s.hp)} / ${Math.round(s.maxHp)}`;
    const shield = state.activeShield && state.activeShield.type === "absorb" ? state.activeShield : null;
    if (armorBar) {
      const frac = shield ? Math.max(0, Math.min(1, (shield.armor || 0) / Math.max(1, s.maxHp || 1))) : 0;
      armorBar.style.width = `${frac * 100}%`;
      armorBar.style.display = shield ? "block" : "none";
    }
    if (armorText) {
      const armorVal = document.getElementById("armor-value");
      if (shield) {
        if (armorVal) armorVal.textContent = String(Math.ceil(shield.armor || 0));
        armorText.classList.remove("hidden");
      } else {
        armorText.classList.add("hidden");
      }
    }
    const coinValEl = document.getElementById("coin-value");
    if (coinValEl) coinValEl.textContent = String(s.coins | 0);
    else if (elCoins) elCoins.textContent = String(s.coins | 0);
    renderPurchasedUpgrades();
    renderArtifactSlots();
    const runFrac = getWaveProgressFraction();
    xpBar.style.width = `${runFrac * 100}%`;
    elLevel.textContent = `Прогресс: ${Math.round(runFrac * 100)}%`;
    if (elWaveLabel) {
      const remaining = Math.max(0, Math.ceil(WAVE_DURATION_SEC - state.wave.timer));
      elWaveLabel.textContent = `Волна ${state.wave.index} / ${TOTAL_WAVES} • ${remaining}с`;
    }
    elKills.textContent = `Убийств: ${s.kills}`;
    if (elBuffsHud) {
      const buffs = [];
      const overchargeLeft = Math.max(0, (state.overchargeUntil || 0) - state.stats.time);
      if (overchargeLeft > 0) {
        buffs.push({
          visualId: "game_buff_overcharge",
          name: "Перегрузка",
          time: overchargeLeft,
          kind: "offense",
        });
      }
      const hasteLeft = Math.max(0, (state.invokeHasteUntil || 0) - state.stats.time);
      if (hasteLeft > 0) {
        buffs.push({
          visualId: "game_buff_haste",
          name: "Форсаж",
          time: hasteLeft,
          kind: "mobility",
        });
      }
      if (state.activeShield) {
        if (state.activeShield.type === "absorb") {
          buffs.push({
            visualId: "game_buff_armor_void",
            name: `Броня ${Math.ceil(state.activeShield.armor || 0)}`,
            time: null,
            kind: "defense",
          });
        } else if (state.activeShield.type === "ice_shell") {
          buffs.push({
            visualId: "game_buff_ice_shell",
            name: "Ледяной панцирь",
            time: Math.max(0, state.activeShield.t || 0),
            kind: "defense",
          });
        } else if (state.activeShield.type === "fire") {
          buffs.push({
            visualId: "game_buff_fire_shield",
            name: "Огненный щит",
            time: Math.max(0, state.activeShield.t || 0),
            kind: "defense",
          });
        }
      }
      if (state.elementalSpin) {
        buffs.push({
          visualId: "game_buff_elemental_spin",
          name: "Элементальный вихрь",
          time: Math.max(0, state.elementalSpin.t || 0),
          kind: "offense",
        });
      }
      buffs.sort((a, b) => {
        const at = typeof a.time === "number" ? a.time : 999;
        const bt = typeof b.time === "number" ? b.time : 999;
        return at - bt;
      });
      elBuffsHud.innerHTML = buffs
        .map((b) => {
          const timeText = typeof b.time === "number" ? `${b.time.toFixed(1)}с` : "активен";
          const iconHtml = visualIconOuterHtml(b.visualId, "buff-chip-icon");
          return `<span class="buff-chip buff-chip--${b.kind}"><span class="buff-chip-main">${iconHtml}<span class="buff-chip-name">${escapeHtml(
            b.name
          )}</span></span><span class="buff-chip__time">${timeText}</span></span>`;
        })
        .join("");
    }
  }

  function drawChannelBarAtPlayer(px, py, radius, progress, fillColor, strokeColor, yOffset = 12) {
    const k = Math.max(0, Math.min(1, progress || 0));
    const barW = 58;
    const barH = 6;
    const barX = px - barW * 0.5;
    const barY = py + radius + yOffset;
    ctx.fillStyle = "rgba(25, 18, 40, 0.85)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * k, barH - 2);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);
  }

  function draw() {
    const p = state.player;
    const { camX, camY, vw, vh } = getCamera();

    ctx.fillStyle = "#120a1c";
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(-camX, -camY);

    ctx.strokeStyle = "rgba(80, 50, 120, 0.1)";
    ctx.lineWidth = 1;
    const gx0 = Math.floor(camX / 48) * 48;
    const gy0 = Math.floor(camY / 48) * 48;
    for (let x = gx0; x < camX + vw + 48; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, camY);
      ctx.lineTo(x, camY + vh);
      ctx.stroke();
    }
    for (let y = gy0; y < camY + vh + 48; y += 48) {
      ctx.beginPath();
      ctx.moveTo(camX, y);
      ctx.lineTo(camX + vw, y);
      ctx.stroke();
    }

    for (const b of state.blocks) {
      ctx.fillStyle = "#151025";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(90, 70, 130, 0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    }

    for (const wall of state.iceWalls || []) {
      const k = Math.max(0, Math.min(1, wall.t / Math.max(0.001, wall.total || 10)));
      for (const seg of wall.segments || []) {
        ctx.strokeStyle = `rgba(170, 235, 255, ${0.55 + 0.25 * k})`;
        ctx.lineWidth = seg.thickness;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(120, 180, 235, ${0.72 + 0.2 * k})`;
        ctx.lineWidth = Math.max(3, seg.thickness * 0.22);
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    }

    if (state.windGust) {
      const g = state.windGust;
      const k = Math.max(0, Math.min(1, g.t / Math.max(0.001, g.total || 2.5)));
      const s0x = g.x + g.rx * (g.width * 0.5);
      const s0y = g.y + g.ry * (g.width * 0.5);
      const s1x = g.x - g.rx * (g.width * 0.5);
      const s1y = g.y - g.ry * (g.width * 0.5);
      const e0x = s0x + g.fx * g.length;
      const e0y = s0y + g.fy * g.length;
      const e1x = s1x + g.fx * g.length;
      const e1y = s1y + g.fy * g.length;
      ctx.strokeStyle = `rgba(170, 225, 255, ${0.48 + 0.2 * k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s0x, s0y);
      ctx.lineTo(e0x, e0y);
      ctx.moveTo(s1x, s1y);
      ctx.lineTo(e1x, e1y);
      ctx.stroke();

      const waveCount = 5;
      const phase = state.stats.time * 8;
      ctx.strokeStyle = `rgba(205, 245, 255, ${0.3 + 0.25 * k})`;
      ctx.lineWidth = 1.4;
      for (let w = 0; w < waveCount; w++) {
        const tAcross = (w + 1) / (waveCount + 1);
        const midX = g.x + g.rx * (g.width * (0.5 - tAcross));
        const midY = g.y + g.ry * (g.width * (0.5 - tAcross));
        const samples = 16;
        ctx.beginPath();
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const along = g.length * t;
          const wave = Math.sin((t * 7.5 + phase + w * 0.9)) * 8;
          const px = midX + g.fx * along + g.rx * wave;
          const py = midY + g.fy * along + g.ry * wave;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    if (state.hailStorm) {
      const hs = state.hailStorm;
      const frac = hs.dropTotal > 0 ? hs.spawned / hs.dropTotal : 1;
      ctx.strokeStyle = "rgba(185, 230, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, hs.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(145, 200, 245, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, hs.radius * (0.35 + 0.6 * frac), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const g of state.gems) {
      ctx.fillStyle = "#b7791f";
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(g.x, g.y, Math.max(2, g.r - 0.9), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ffdf7a";
      ctx.beginPath();
      ctx.arc(g.x - 1.2, g.y - 1.4, 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(120, 78, 20, 0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(g.x - 1.3, g.y - 1.1);
      ctx.lineTo(g.x + 1.3, g.y + 1.1);
      ctx.stroke();
    }

    if (moveTarget) {
      const t = state.stats.time;
      const pulse = 0.65 + Math.sin(t * 7.5) * 0.25;
      const r = 6 + pulse * 2.2;
      ctx.strokeStyle = `rgba(120, 220, 255, ${0.22 + pulse * 0.16})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(moveTarget.x, moveTarget.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(180, 240, 255, 0.45)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(moveTarget.x - 4, moveTarget.y);
      ctx.lineTo(moveTarget.x + 4, moveTarget.y);
      ctx.moveTo(moveTarget.x, moveTarget.y - 4);
      ctx.lineTo(moveTarget.x, moveTarget.y + 4);
      ctx.stroke();
    }

    for (const portal of state.wave?.portals || []) {
      const warmK = Math.max(0, portal.warmup || 0);
      const baseR = 22;
      ctx.strokeStyle = warmK > 0 ? "rgba(250, 220, 120, 0.8)" : "rgba(158, 114, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, baseR + Math.sin(state.stats.time * 4 + portal.x * 0.01) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = warmK > 0 ? "rgba(250, 180, 80, 0.25)" : "rgba(120, 70, 220, 0.25)";
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, baseR - 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    for (const h of state.healPickups) {
      ctx.translate(h.x, h.y);
      const arm = h.r + 6;
      const thick = 3.5;
      const half = thick / 2;
      ctx.shadowColor = "rgba(34, 197, 94, 0.45)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(-half, -arm, thick, arm * 2);
      ctx.fillRect(-arm, -half, arm * 2, thick);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(-half + 0.6, -arm + 0.6, thick - 1.2, arm * 2 - 1.2);
      ctx.fillRect(-arm + 0.6, -half + 0.6, arm * 2 - 1.2, thick - 1.2);
      ctx.strokeStyle = "#bbf7d0";
      ctx.lineWidth = 1;
      ctx.strokeRect(-half + 0.5, -arm + 0.5, thick - 1, arm * 2 - 1);
      ctx.strokeRect(-arm + 0.5, -half + 0.5, arm * 2 - 1, thick - 1);
      ctx.translate(-h.x, -h.y);
    }
    ctx.restore();

    for (const a of state.artifactPickups) {
      const bob = Math.sin(a.phase) * 2.5;
      ctx.fillStyle = "rgba(92, 56, 168, 0.95)";
      ctx.beginPath();
      ctx.arc(a.x, a.y + bob, a.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(196, 166, 255, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(a.x, a.y + bob, a.r + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(236, 219, 255, 0.95)";
      ctx.font = "bold 12px Segoe UI";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", a.x, a.y + bob + 0.5);
    }

    for (const m of state.mines || []) {
      if (m.kind === "rose") {
        const ang = Number.isFinite(m.roseAng) ? m.roseAng : 0;
        drawIceRoseAt(ctx, m.x, m.y, 1, ang + Math.PI * 0.5, 1);
        ctx.strokeStyle = "rgba(200, 240, 255, 0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.triggerRadius, 0, Math.PI * 2);
        ctx.stroke();
        if (Number.isFinite(m.fuseLeft) && m.fuseLeft <= 3) {
          const u = 1 - Math.max(0, m.fuseLeft) / 3;
          ctx.strokeStyle = `rgba(255, 210, 220, ${0.2 + 0.35 * u})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.triggerRadius + 3 + u * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        continue;
      }
      ctx.strokeStyle = "rgba(255, 190, 120, 0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.triggerRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 150, 90, 0.28)";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.triggerRadius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 220, 170, 0.95)";
      ctx.font = "bold 10px Segoe UI";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✶", m.x, m.y + 0.5);
    }

    if (state.events && state.events.active) {
      const ev = state.events.active;
      if (ev.state !== "done") {
        ctx.strokeStyle = "rgba(165, 220, 255, 0.7)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ev.x, ev.y, ev.r, 0, Math.PI * 2);
        ctx.stroke();
        const fill = ev.progress || 0;
        if (fill > 0) {
          ctx.fillStyle = "rgba(100, 200, 255, 0.28)";
          ctx.beginPath();
          ctx.moveTo(ev.x, ev.y);
          ctx.arc(ev.x, ev.y, ev.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255, 80, 80, 0.8)";
        ctx.beginPath();
        ctx.arc(ev.x, ev.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const e of state.enemies) {
      const frac = Math.max(0, e.hp / e.maxHp);
      if (e.kind === "boss1" || e.kind === "boss2") {
        const pulse = 0.8 + Math.sin(state.stats.time * (e.kind === "boss1" ? 3.2 : 4.2)) * 0.2;
        ctx.fillStyle = e.kind === "boss1" ? "#7c3aed" : "#dc2626";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.kind === "boss1" ? "rgba(196, 181, 253, 0.85)" : "rgba(254, 202, 202, 0.82)";
        ctx.beginPath();
        ctx.arc(e.x, e.y, Math.max(7, e.r * pulse * 0.55), 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === "shooter" || e.kind === "sniper") {
        const ang = Math.atan2(p.y - e.y, p.x - e.x);
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(ang);
        ctx.fillStyle = e.kind === "sniper" ? "#2a1a44" : "#3a2020";
        ctx.beginPath();
        ctx.moveTo(e.r * 1.45, 0);
        ctx.lineTo(-e.r * 0.95, e.r * 0.9);
        ctx.lineTo(-e.r * 0.55, 0);
        ctx.lineTo(-e.r * 0.95, -e.r * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = e.kind === "sniper" ? "#66b8ff" : "#ff7733";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      } else if (e.kind === "runner") {
        ctx.fillStyle = "#1f3d20";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r - 1, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === "tank") {
        ctx.fillStyle = "#3a2510";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d08a3c";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#4a1830";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c04060";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#200810";
      ctx.fillRect(e.x - e.r, e.y - e.r - 6, e.r * 2, 3);
      ctx.fillStyle = "#ff4466";
      ctx.fillRect(e.x - e.r, e.y - e.r - 6, e.r * 2 * frac, 3);
      const stunT = (e.statuses?.stun || 0) > 0;
      const fearT = (e.statuses?.fear || 0) > 0;
      if (stunT || fearT) {
        const sid = stunT ? "game_status_stun" : "game_status_fear";
        const iw = 18;
        const ih = 18;
        const ok = drawVisual(ctx, sid, e.x - iw / 2, e.y - e.r - 22, iw, ih);
        if (!ok) {
          ctx.font = "bold 11px Segoe UI";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(240,240,255,0.95)";
          ctx.fillText(stunT ? "!" : "?", e.x, e.y - e.r - 14);
        }
      }
    }

    for (const fx of state.vfx || []) {
      const k = Math.max(0, Math.min(1, fx.life / Math.max(0.001, fx.maxLife || 1)));
      if (fx.kind === "telegraph") {
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = 0.35 + 0.55 * k;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (fx.kind === "ring") {
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = 0.2 + 0.65 * k;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius * (1 - 0.2 * (1 - k)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (fx.kind === "pulseWave") {
        const pk = Math.max(0, Math.min(1, 1 - fx.life / Math.max(0.001, fx.maxLife || 0.5)));
        const pr = fx.maxRadius * pk;
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = 0.62 * (1 - pk * 0.85);
        ctx.lineWidth = (fx.lineWidth || 2) * (1 + pk * 0.25);
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, pr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (fx.kind === "groundSpike") {
        if ((fx.delay || 0) > 0) continue;
        const sk = Math.max(0, Math.min(1, fx.life / Math.max(0.001, fx.maxLife || 0.42)));
        const h = 30 * (1 - sk) + 4;
        const w = 10;
        ctx.save();
        ctx.translate(fx.x, fx.y);
        ctx.fillStyle = `rgba(175, 235, 255, ${0.38 + 0.5 * (1 - sk)})`;
        ctx.strokeStyle = "rgba(100, 170, 230, 0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.lineTo(-w, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (fx.kind === "hailDrop") {
        ctx.save();
        ctx.translate(fx.x, fx.y);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "rgba(195, 238, 255, 0.96)";
        ctx.strokeStyle = "rgba(120, 185, 235, 0.95)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-7, 3);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-7, -3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (fx.kind === "meteor") {
        const mk = Math.max(0, Math.min(1, 1 - fx.t / Math.max(0.001, fx.duration || METEOR_FALL_TIME)));
        const visMul = Math.max(0.55, (fx.radius || BASE_METEOR_RADIUS) / BASE_METEOR_RADIUS);
        const trail = fx.trail || [];
        const isIcicle = fx.visualStyle === "icicle";
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i].a * 0.42;
          if (a <= 0.01) continue;
          ctx.strokeStyle = isIcicle ? `rgba(170,230,255,${a})` : `rgba(255,160,90,${a})`;
          ctx.lineWidth = (2 + i * 0.5) * visMul;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }
        if (isIcicle) {
          const len = (24 + (1 - mk) * 10) * visMul;
          const halfW = (5 + (1 - mk) * 2) * visMul;
          const ang = Math.atan2(fx.targetY - fx.startY, fx.targetX - fx.startX);
          ctx.save();
          ctx.translate(fx.x, fx.y);
          ctx.rotate(ang);
          ctx.shadowColor = "rgba(130,200,255,0.95)";
          ctx.shadowBlur = 14 * visMul;
          ctx.fillStyle = "rgba(185,240,255,0.96)";
          ctx.beginPath();
          ctx.moveTo(len * 0.55, 0);
          ctx.lineTo(-len * 0.45, halfW);
          ctx.lineTo(-len * 0.25, 0);
          ctx.lineTo(-len * 0.45, -halfW);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(105,170,235,0.95)";
          ctx.lineWidth = 1.6 * visMul;
          ctx.stroke();
          ctx.restore();
        } else {
          const r = (7 + (1 - mk) * 4) * visMul;
          ctx.fillStyle = "rgba(255,180,120,0.95)";
          ctx.shadowColor = "rgba(255,130,70,0.95)";
          ctx.shadowBlur = 16 * visMul;
          ctx.beginPath();
          ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      } else if (fx.kind === "meteorShockwave") {
        const sk = Math.max(0, Math.min(1, 1 - fx.life / Math.max(0.001, fx.maxLife || 0.2)));
        ctx.strokeStyle = `rgba(255,232,190,${0.82 * (1 - sk)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, (fx.radius || 76) * sk, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.kind === "beam") {
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = 0.2 + 0.7 * k;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx.x1, fx.y1);
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        } else if (fx.kind === "aura" && fx.target === "player") {
        const ax = state.player.x;
        const ay = state.player.y;
        ctx.fillStyle = fx.color;
        ctx.globalAlpha = 0.12 + 0.26 * k;
        ctx.beginPath();
        ctx.arc(ax, ay, fx.radius + (1 - k) * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (fx.visualId) {
          drawVisual(ctx, fx.visualId, ax - 8, ay - fx.radius - 20, 16, 16);
        } else if (fx.icon) {
          ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * k})`;
          ctx.font = "bold 12px Segoe UI";
          ctx.textAlign = "center";
          ctx.fillText(fx.icon, ax, ay - fx.radius - 10);
        }
      }
    }

    drawArmamentRecollectionLayer(ctx, p);

    if (state.revivePending) {
      const rv = state.revivePending;
      const k = Math.max(0, 1 - rv.timer / REVIVE_DELAY_SEC);
      const pulse = 0.6 + 0.4 * Math.sin(state.stats.time * 11);

      ctx.fillStyle = "rgba(46, 34, 24, 0.92)";
      ctx.fillRect(rv.x - 10, rv.y - 14, 20, 24);
      ctx.fillStyle = "#6e4c2c";
      ctx.fillRect(rv.x - 12, rv.y + 10, 24, 6);
      ctx.strokeStyle = "rgba(210, 184, 126, 0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(rv.x - 9.5, rv.y - 13.5, 19, 23);

      ctx.fillStyle = `rgba(255, 230, 170, ${0.12 + 0.2 * pulse})`;
      ctx.beginPath();
      ctx.arc(rv.x, rv.y, 22 + pulse * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 215, 140, ${0.35 + 0.4 * k})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(rv.x, rv.y, 28 + pulse * 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (state.aegisReviveFx) {
      const fx = state.aegisReviveFx;
      const k = Math.max(0, 1 - fx.t / fx.duration);
      const pulse = 0.6 + 0.4 * Math.sin(fx.t * 26);
      ctx.strokeStyle = `rgba(255, 225, 150, ${0.35 + 0.5 * k})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 20 + (1 - k) * 42 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(120, 220, 255, ${0.25 + 0.45 * k})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 10 + (1 - k) * 26, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 240, 190, ${0.12 + 0.22 * k})`;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 16 + (1 - k) * 18, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of state.enemyBullets) {
      ctx.fillStyle = "#d43c3c";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffb3b3";
      ctx.beginPath();
      ctx.arc(b.x - 1, b.y - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const pr of state.playerShots) {
      if (pr.kind === "fireball") {
        ctx.fillStyle = "rgba(255, 120, 40, 0.35)";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffcc66";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (pr.kind === "volcano_shot") {
        ctx.fillStyle = "rgba(255, 105, 45, 0.45)";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffd18b";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (pr.kind === "lightning") {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.fillStyle = "#fde047";
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-2, -5);
        ctx.lineTo(2, 0);
        ctx.lineTo(-2, 5);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (pr.kind === "wall_seed") {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.fillStyle = "rgba(185, 240, 255, 0.95)";
        ctx.strokeStyle = "rgba(110, 175, 235, 0.9)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-10, 4);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else if (pr.kind === "fire_yoyo") {
        const pp = state.player;
        ctx.strokeStyle = "rgba(255, 185, 110, 0.75)";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(pp.x, pp.y);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 235, 180, 0.5)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pp.x, pp.y);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();

        ctx.fillStyle = pr.phase === "out" ? "rgba(255, 130, 70, 0.42)" : "rgba(255, 95, 55, 0.45)";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.hitR * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff9f43";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.hitR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffd39a";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.hitR - 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        const spearScale = pr.sizeMul || 1;
        if (spearScale !== 1) ctx.scale(spearScale, spearScale);
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-14, 5);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-14, -5);
        ctx.closePath();
        if (spearScale > 1.2) {
          ctx.strokeStyle = "rgba(120, 220, 255, 0.28)";
          ctx.lineWidth = 9;
          ctx.stroke();
          ctx.strokeStyle = "rgba(200, 248, 255, 0.45)";
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(-14, 5);
          ctx.lineTo(-10, 0);
          ctx.lineTo(-14, -5);
          ctx.closePath();
        }
        ctx.fillStyle = "#a8f0ff";
        ctx.fill();
        ctx.strokeStyle = "#4088cc";
        ctx.lineWidth = spearScale > 1.2 ? 2.8 : 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    if (state.beamChannel && !state.revivePending) {
      const b = state.beamChannel;
      const ex = p.x + Math.cos(b.angle) * b.range;
      const ey = p.y + Math.sin(b.angle) * b.range;
      ctx.strokeStyle = "rgba(255, 245, 200, 0.88)";
      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 235, 0.95)";
      ctx.lineWidth = Math.max(8, b.width * 0.24);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 200, 120, 0.75)";
      ctx.lineWidth = Math.max(3, b.width * 0.1);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const k = Math.max(0, Math.min(1, b.t / Math.max(0.001, b.total || BEAM_CHANNEL_DURATION)));
      drawChannelBarAtPlayer(p.x, p.y, p.r, k, "rgba(255, 235, 170, 0.95)", "rgba(180, 150, 230, 0.75)", 12);
    }

    if (state.elementalSpin && !state.revivePending) {
      const es = state.elementalSpin;
      const k = Math.max(0, Math.min(1, es.t / Math.max(0.001, es.total || 5)));
      drawChannelBarAtPlayer(p.x, p.y, p.r, k, "rgba(255, 185, 120, 0.95)", "rgba(220, 150, 100, 0.8)", 20);
    }

    if (state.fearAura && !state.revivePending) {
      const a = state.fearAura;
      const elapsed = a.total - a.t;
      const expandK = Math.max(0, Math.min(1, elapsed / Math.max(0.001, a.expandSec || 0.45)));
      const r = expandK < 1 ? a.radius * expandK : a.radius;
      const auraAlpha = expandK < 1 ? 0.12 + 0.16 * expandK : 0.28;
      ctx.fillStyle = `rgba(170, 145, 225, ${auraAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.lightningDash && !state.revivePending) {
      const d = state.lightningDash;
      const chargeK = d.phase === "charge" ? 1 - Math.max(0, d.chargeT) / Math.max(0.001, d.totalCharge || 0.2) : 1;
      const rr = 24 + chargeK * 10;
      ctx.strokeStyle = "rgba(255, 235, 170, 0.85)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 220, 120, 0.2)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.blackHole && !state.revivePending) {
      const bh = state.blackHole;
      const t = 1 - Math.max(0, bh.t) / Math.max(0.001, bh.total || 1);
      const pulse = 0.8 + 0.2 * Math.sin(state.stats.time * 9);
      const innerR = bh.coreRadius * (0.9 + 0.12 * pulse);
      const outerR = bh.outerRadius * (0.96 + 0.04 * pulse);
      ctx.fillStyle = "rgba(18, 10, 30, 0.72)";
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(8, 5, 16, 0.65)";
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, innerR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(170, 120, 255, ${0.45 - t * 0.2})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(120, 90, 180, ${0.28 - t * 0.1})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, outerR, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const fp of state.firePuddles || []) {
      const k = Math.max(0, Math.min(1, fp.t / Math.max(0.001, fp.duration || 1)));
      const elapsed = (fp.duration || 0) - fp.t;
      const expandK = Math.max(0, Math.min(1, elapsed / Math.max(0.001, fp.expandSec || 0.45)));
      const pulse = 0.75 + 0.25 * Math.sin(state.stats.time * 7 + fp.x * 0.01);
      const rr = fp.radius * expandK * (0.94 + pulse * 0.06);
      ctx.fillStyle = `rgba(255, 95, 55, ${0.22 + 0.18 * k})`;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const v of state.volcanoes || []) {
      const pulse = 0.75 + 0.25 * Math.sin(state.stats.time * 8 + v.x * 0.013);
      ctx.fillStyle = "rgba(60, 26, 18, 0.96)";
      ctx.beginPath();
      ctx.moveTo(v.x, v.y - 22);
      ctx.lineTo(v.x - 20, v.y + 18);
      ctx.lineTo(v.x + 20, v.y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 70, 45, 0.9)";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 120, 60, ${0.55 + 0.2 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(v.x - 7, v.y - 10);
      ctx.lineTo(v.x + 7, v.y - 10);
      ctx.lineTo(v.x + 4, v.y - 2 - pulse * 1.5);
      ctx.lineTo(v.x - 4, v.y - 2 - pulse * 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 230, 160, 0.95)";
      ctx.font = "bold 10px Segoe UI";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`${v.ammo}`, v.x, v.y - 22);
    }

    if (state.rollingMeteor) {
      const rm = state.rollingMeteor;
      const r = rm.radius * 0.7;
      ctx.fillStyle = "rgba(255, 145, 80, 0.9)";
      ctx.shadowColor = "rgba(255, 95, 45, 0.95)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(rm.x, rm.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255, 220, 150, 0.85)";
      ctx.beginPath();
      ctx.arc(rm.x - r * 0.25, rm.y - r * 0.2, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.iceResonator) {
      const ir = state.iceResonator;
      const pulse = 0.55 + 0.45 * Math.sin(state.stats.time * 5);
      ctx.strokeStyle = `rgba(160, 220, 255, ${0.2 + 0.14 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.beginPath();
      ctx.arc(ir.x, ir.y, ICE_RESONATOR_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(200, 245, 255, ${0.14 + 0.1 * pulse})`;
      ctx.beginPath();
      ctx.arc(ir.x, ir.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.worldAnchor) {
      const a = state.worldAnchor;
      const chainPhase = state.stats.time * 5.5;
      for (const e of state.enemies) {
        if (!a.normIds.has(e.id) && !a.bossIds.has(e.id)) continue;
        const dx = e.x - a.x;
        const dy = e.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = dx / len;
        const ny = dy / len;
        const px = -ny;
        const py = nx;
        const segLen = 14;
        const nSeg = Math.max(2, Math.ceil(len / segLen));
        ctx.strokeStyle = "rgba(140, 155, 220, 0.35)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        for (let s = 1; s <= nSeg; s++) {
          const t0 = s / nSeg;
          const wx = a.x + nx * len * t0;
          const wy = a.y + ny * len * t0;
          const wobble = Math.sin(chainPhase + s * 0.9) * 3.2;
          ctx.lineTo(wx + px * wobble, wy + py * wobble);
        }
        ctx.stroke();
        ctx.strokeStyle = "rgba(210, 215, 255, 0.55)";
        ctx.lineWidth = 1.35;
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        for (let s = 1; s <= nSeg; s++) {
          const t0 = s / nSeg;
          const wx = a.x + nx * len * t0;
          const wy = a.y + ny * len * t0;
          const wobble = Math.sin(chainPhase + s * 0.9) * 3.2;
          ctx.lineTo(wx + px * wobble, wy + py * wobble);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = "rgba(160, 175, 255, 0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, ANCHOR_CAPTURE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(230, 200, 120, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(a.x, a.y, ANCHOR_RING_DIST, 0, Math.PI * 2);
      ctx.stroke();
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const aw = 30;
      const ah = 30;
      const drewAnchor = drawVisual(ctx, "game_world_anchor", a.x - aw / 2, a.y - ah / 2, aw, ah);
      if (!drewAnchor) {
        ctx.font = "28px Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif";
        ctx.shadowColor = "rgba(40, 55, 120, 0.55)";
        ctx.shadowBlur = 8;
        ctx.fillText("⚓", a.x, a.y + 1);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
    if (state.eewCone) {
      const c = state.eewCone;
      const pulse = 0.86 + 0.14 * Math.sin(state.stats.time * 3.6);
      const base = Math.atan2(c.fy, c.fx);
      ctx.beginPath();
      if (c.lcX != null && c.rLarge != null && c.rSmall != null) {
        const H = circleCircleIntersect(c.lcX, c.lcY, c.rLarge, c.scX, c.scY, c.rSmall);
        if (H && H.length === 2) {
          const h0 = H[0];
          const h1 = H[1];
          const angL0 = eewMoonAngle(c.lcX, c.lcY, h0[0], h0[1]);
          const angL1 = eewMoonAngle(c.lcX, c.lcY, h1[0], h1[1]);
          const dMinor = eewShortAngularDelta(angL0, angL1);
          const dMajor = dMinor >= 0 ? dMinor - Math.PI * 2 : dMinor + Math.PI * 2;
          const midFwdSc = (sweep) => {
            const mid = angL0 + sweep * 0.5;
            const px = c.lcX + c.rLarge * Math.cos(mid) - c.ox;
            const py = c.lcY + c.rLarge * Math.sin(mid) - c.oy;
            return px * c.fx + py * c.fy;
          };
          const sweepOut = midFwdSc(dMinor) >= midFwdSc(dMajor) ? dMinor : dMajor;
          const angS0 = eewMoonAngle(c.scX, c.scY, h0[0], h0[1]);
          const angS1 = eewMoonAngle(c.scX, c.scY, h1[0], h1[1]);
          let sweepIn = eewShortAngularDelta(angS1, angS0);
          const sweepInAlt = sweepIn >= 0 ? sweepIn - Math.PI * 2 : sweepIn + Math.PI * 2;
          if (Math.sign(sweepOut) === Math.sign(sweepIn) || Math.abs(sweepIn) >= Math.PI - 0.05) {
            sweepIn = sweepInAlt;
          }
          const STEP = 24;
          ctx.moveTo(h0[0], h0[1]);
          for (let i = 1; i <= STEP; i++) {
            const ang = angL0 + sweepOut * (i / STEP);
            ctx.lineTo(c.lcX + c.rLarge * Math.cos(ang), c.lcY + c.rLarge * Math.sin(ang));
          }
          for (let i = STEP; i >= 0; i--) {
            const ang = angS1 + sweepIn * ((STEP - i) / STEP);
            ctx.lineTo(c.scX + c.rSmall * Math.cos(ang), c.scY + c.rSmall * Math.sin(ang));
          }
          ctx.closePath();
        } else {
          ctx.arc(c.lcX, c.lcY, c.rLarge, base - 0.38, base + 0.38);
          ctx.closePath();
        }
      } else if (c.cx != null && c.radius != null) {
        const a0 = base - Math.PI / 2;
        const a1 = base + Math.PI / 2;
        ctx.arc(c.cx, c.cy, c.radius, a0, a1);
        ctx.closePath();
      }
      if (c.lcX != null) {
        const gcx = c.lcX + Math.cos(base) * c.rLarge * 0.42;
        const gcy = c.lcY + Math.sin(base) * c.rLarge * 0.42;
        const grad = ctx.createRadialGradient(gcx, gcy, 4, c.lcX, c.lcY, c.rLarge * 1.15);
        grad.addColorStop(0, `rgba(230, 252, 255, ${0.26 * pulse})`);
        grad.addColorStop(0.4, `rgba(170, 218, 255, ${0.14 * pulse})`);
        grad.addColorStop(0.78, `rgba(120, 180, 235, ${0.06 * pulse})`);
        grad.addColorStop(1, `rgba(85, 140, 210, ${0.02 * pulse})`);
        ctx.fillStyle = grad;
      } else {
        const gcx = c.cx + Math.cos(base) * c.radius * 0.52;
        const gcy = c.cy + Math.sin(base) * c.radius * 0.52;
        const grad = ctx.createRadialGradient(gcx, gcy, 6, c.cx, c.cy, c.radius * 1.08);
        grad.addColorStop(0, `rgba(220, 248, 255, ${0.28 * pulse})`);
        grad.addColorStop(0.35, `rgba(165, 215, 255, ${0.16 * pulse})`);
        grad.addColorStop(0.72, `rgba(125, 185, 240, ${0.08 * pulse})`);
        grad.addColorStop(1, `rgba(95, 150, 220, ${0.03 * pulse})`);
        ctx.fillStyle = grad;
      }
      ctx.fill();
      ctx.strokeStyle = `rgba(200, 242, 255, ${0.48 + 0.14 * pulse})`;
      ctx.lineWidth = 1.85;
      ctx.stroke();
    }
    if (state.weeClone && state.weeClone.hp > 0) {
      const w = state.weeClone;
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = "#7a62b8";
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(230, 210, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
      if (state.cloneActiveShield && state.cloneActiveShield.type === "fire") {
        const sh = state.cloneActiveShield;
        const pulse = 0.7 + 0.3 * Math.sin(state.stats.time * 6.5);
        const rr = (sh.radius || 100) * (0.96 + 0.05 * pulse);
        const grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, rr);
        grad.addColorStop(0, "rgba(255, 120, 70, 0.12)");
        grad.addColorStop(0.7, "rgba(255, 95, 55, 0.08)");
        grad.addColorStop(1, "rgba(255, 85, 40, 0.02)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(w.x, w.y, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (state.cloneActiveShield && state.cloneActiveShield.type === "absorb") {
        const sk = Math.max(0, Math.min(1, (state.cloneActiveShield.armor || 0) / Math.max(1, state.cloneActiveShield.maxArmor || 1)));
        ctx.strokeStyle = `rgba(170, 225, 255, ${0.3 + 0.4 * sk})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (!state.revivePending) {
      ctx.fillStyle = "#2a5080";
      ctx.beginPath();
      ctx.arc(p.x + 3, p.y + 4, p.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6ab0ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#203050";
      if (state.elementalSpin) {
        const spinA = (state.stats.time - (state.elementalSpin.startedAt || state.stats.time)) * Math.PI * 2;
        const c = Math.cos(spinA);
        const s = Math.sin(spinA);
        const e1x = -4 * c - -3 * s;
        const e1y = -4 * s + -3 * c;
        const e2x = 5 * c - -3 * s;
        const e2y = 5 * s + -3 * c;
        ctx.beginPath();
        ctx.arc(p.x + e1x, p.y + e1y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x + e2x, p.y + e2y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x - 4, p.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x + 5, p.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (state.elementalSpin) {
        const spinA = state.stats.time * Math.PI * 2;
        ctx.strokeStyle = "rgba(255, 210, 150, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 6, spinA, spinA + Math.PI * 1.2);
        ctx.stroke();
      }

      if (state.playerInvulnerability > 0) {
        const invK = Math.max(0, Math.min(1, state.playerInvulnerability / REVIVE_INVULN_SEC));
        const pulse = 0.5 + 0.5 * Math.sin(state.stats.time * 12);
        ctx.strokeStyle = `rgba(120, 220, 255, ${0.3 + invK * 0.45})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 10 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(120, 220, 255, ${0.08 + invK * 0.1})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 8, 0, Math.PI * 2);
        ctx.fill();
      }
      if (state.activeShield && state.activeShield.type === "fire") {
        const sh = state.activeShield;
        const pulse = 0.7 + 0.3 * Math.sin(state.stats.time * 6.5);
        const rr = (sh.radius || 100) * (0.96 + 0.05 * pulse);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        grad.addColorStop(0, "rgba(255, 120, 70, 0.16)");
        grad.addColorStop(0.7, "rgba(255, 95, 55, 0.11)");
        grad.addColorStop(1, "rgba(255, 85, 40, 0.02)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (state.activeShield && state.activeShield.type === "absorb") {
        const sk = Math.max(0, Math.min(1, (state.activeShield.armor || 0) / Math.max(1, state.activeShield.maxArmor || 1)));
        ctx.strokeStyle = `rgba(170, 225, 255, ${0.35 + 0.45 * sk})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (state.stats.time < (state.overchargeUntil || 0)) {
        const pulse = 0.7 + 0.3 * Math.sin(state.stats.time * 11);
        ctx.fillStyle = `rgba(255, 90, 90, ${0.2 + 0.12 * pulse})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (state.pendingRuneCast) {
        const total = Math.max(0.001, state.pendingRuneCast.total || BASE_RUNE_CAST_TIME_SEC);
        const k = Math.max(0, Math.min(1, state.pendingRuneCast.timer / total));
        const w = 44;
        const h = 5;
        const x = p.x - w * 0.5;
        const y = p.y + p.r + 10;
        ctx.fillStyle = "rgba(18, 14, 28, 0.85)";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "rgba(170, 220, 255, 0.95)";
        ctx.fillRect(x, y, w * k, h);
        ctx.strokeStyle = "rgba(220, 235, 255, 0.45)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      }
    }

    drawDamageFloaters(ctx);
    ctx.restore();
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000) || 0;
    lastT = now;

    if (!startScreen || startScreen.classList.contains("hidden") === false) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (!state) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (state.gameOver) {
      gameOverPanel.classList.remove("hidden");
      goStats.innerHTML = `Время: ${formatTime(state.stats.time)}<br>Волна смерти: ${state.wave.index}<br>Убийств: ${state.stats.kills}<br>Монет: ${state.stats.coins}`;
      if (skillBar) skillBar.classList.add("hidden");
      if (shopScreen) {
        shopScreen.classList.add("hidden");
        shopScreen.setAttribute("aria-hidden", "true");
      }
      closeCombosPanel();
      if (victoryScreen) victoryScreen.classList.add("hidden");
      if (pauseScreen) {
        pauseScreen.classList.add("hidden");
        pauseScreen.setAttribute("aria-hidden", "true");
      }
      if (artifactChoiceScreen) {
        artifactChoiceScreen.classList.add("hidden");
        artifactChoiceScreen.setAttribute("aria-hidden", "true");
      }
      paused = false;
      clearRunSave();
      refreshContinueButton();
      state = null;
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (state.victory) {
      if (victoryScreen) {
        victoryScreen.classList.remove("hidden");
        if (victoryStats) {
          victoryStats.innerHTML = `Время: ${formatTime(state.stats.time)}<br>Убийств: ${state.stats.kills}<br>Монет: ${state.stats.coins}`;
        }
      }
      if (skillBar) skillBar.classList.add("hidden");
      if (shopScreen) {
        shopScreen.classList.add("hidden");
        shopScreen.setAttribute("aria-hidden", "true");
      }
      closeCombosPanel();
      gameOverPanel.classList.add("hidden");
      if (pauseScreen) {
        pauseScreen.classList.add("hidden");
        pauseScreen.setAttribute("aria-hidden", "true");
      }
      if (artifactChoiceScreen) {
        artifactChoiceScreen.classList.add("hidden");
        artifactChoiceScreen.setAttribute("aria-hidden", "true");
      }
      paused = false;
      clearRunSave();
      refreshContinueButton();
      state = null;
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (!paused) {
      const simDt = state.revivePending ? dt * REVIVE_SLOWMO_FACTOR : dt;
      state.stats.time += simDt;
      state.wave.timer += simDt;
      const waveCfg = getWaveConfig(state.wave.index);
      const isBossWave = state.wave.index === 5 || state.wave.index === 10;
      if (isBossWave) {
        ensureWaveBossSpawn();
      } else {
        ensureWavePortals();
        updateWavePortals(simDt);
      }
      if (state.wave.timer >= WAVE_DURATION_SEC || (state.wave.hadEnemies && state.enemies.length === 0)) {
        finishWave();
      }
      updateEventSystem(simDt);

      playerInput(simDt);
      updateEnemies(simDt);
      updatePlayerShots(simDt);
      updateEnemyBullets(simDt);
      updateMines(simDt);
      updateVolcanoes(simDt);
      updateRollingMeteor(simDt);
      updateFireTrail(simDt);
      updateFirePuddles(simDt);
      updateIceWalls(simDt);
      updateFireCones(simDt);
      updateVfx(simDt);
      updateDamageFloaters(simDt);
      updateAegisReviveFx(simDt);
      updateFearAura(simDt);
      updateFireShieldAura(simDt);
      updateElementalSpin(simDt);
      updateArmamentRecollection(simDt);
      updateHailStorm(simDt);
      updateWindGust(simDt);
      updateLightningDash(simDt);
      updateBeamChannel(simDt);
      updateBlackHole(simDt);
      updateIceResonator(simDt);
      updateWorldAnchor(simDt);
      updateEewCone(simDt);
      updateWeeClone(simDt);
      invokeCooldownTick(simDt);
      updatePendingRuneCast(simDt);
      updateGems(simDt);
      updateHealPickups(simDt);
      updateArtifactPickups(simDt);
      updateReviveFlow(dt);
      updatePlayerInvulnerability(dt);
      updateHud();

      runAutosaveAcc += simDt;
      if (runAutosaveAcc >= 14) {
        runAutosaveAcc = 0;
        persistRunSave(state);
      }
    }

    if (state && !state.gameOver) updateSkillBar();

    draw();
    rafId = requestAnimationFrame(tick);
  }

  function returnToMainMenu() {
    hideSkillTooltip();
    closeExitConfirmModal();
    if (gameOverPanel) gameOverPanel.classList.add("hidden");
    if (victoryScreen) victoryScreen.classList.add("hidden");
    closeCombosPanel();
    if (shopScreen) {
      shopScreen.classList.add("hidden");
      shopScreen.setAttribute("aria-hidden", "true");
    }
    if (pauseScreen) {
      pauseScreen.classList.add("hidden");
      pauseScreen.setAttribute("aria-hidden", "true");
    }
    if (artifactChoiceScreen) {
      artifactChoiceScreen.classList.add("hidden");
      artifactChoiceScreen.setAttribute("aria-hidden", "true");
    }
    if (skillBar) skillBar.classList.add("hidden");
    if (waveRewardToastWrap) waveRewardToastWrap.innerHTML = "";
    paused = false;
    mouseLeftHeld = false;
    moveTarget = null;
    state = null;
    if (startScreen) {
      startScreen.classList.remove("hidden");
      startScreen.setAttribute("aria-hidden", "false");
    }
    refreshContinueButton();
    syncPauseToggleButton();
  }

  function resumeGame(opts) {
    opts = opts || {};
    const pauseAfterLoad = !!opts.pauseAfterLoad;
    closeExitConfirmModal();

    const raw = localStorage.getItem(RUN_SAVE_KEY);
    if (!raw) {
      refreshContinueButton();
      return;
    }
    let s;
    try {
      s = parseSavedRun(raw);
    } catch (err) {
      clearRunSave();
      refreshContinueButton();
      return;
    }
    if (!s || !s.player || !s.stats || s.gameOver || s.victory) {
      clearRunSave();
      refreshContinueButton();
      return;
    }

    resizeCanvas();
    if (startScreen) {
      startScreen.classList.add("hidden");
      startScreen.setAttribute("aria-hidden", "true");
    }
    gameOverPanel.classList.add("hidden");
    if (shopScreen) {
      shopScreen.classList.add("hidden");
      shopScreen.setAttribute("aria-hidden", "true");
    }
    closeCombosPanel();
    if (victoryScreen) victoryScreen.classList.add("hidden");
    if (artifactChoiceScreen) {
      artifactChoiceScreen.classList.add("hidden");
      artifactChoiceScreen.setAttribute("aria-hidden", "true");
    }
    if (skillBar) skillBar.classList.remove("hidden");
    if (waveRewardToastWrap) waveRewardToastWrap.innerHTML = "";

    paused = pauseAfterLoad;
    if (pauseScreen) {
      if (pauseAfterLoad) {
        pauseScreen.classList.remove("hidden");
        pauseScreen.setAttribute("aria-hidden", "false");
      } else {
        pauseScreen.classList.add("hidden");
        pauseScreen.setAttribute("aria-hidden", "true");
      }
    }
    mouseLeftHeld = false;
    moveTarget = null;
    runAutosaveAcc = 0;
    state = s;
    renderSkillRecentIcons();
    renderArtifactSlots();
    syncUltSlotFromState();
    renderInvokeCooldownRow();
    renderPurchasedUpgrades();
    updateHud();
    persistRunSave(state);
    lastT = performance.now();
    syncPauseToggleButton();
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function startGame() {
    closeExitConfirmModal();
    clearRunSave();
    refreshContinueButton();

    resizeCanvas();
    if (startScreen) {
      startScreen.classList.add("hidden");
      startScreen.setAttribute("aria-hidden", "true");
    }
    gameOverPanel.classList.add("hidden");
    if (shopScreen) {
      shopScreen.classList.add("hidden");
      shopScreen.setAttribute("aria-hidden", "true");
    }
    closeCombosPanel();
    if (victoryScreen) victoryScreen.classList.add("hidden");
    if (pauseScreen) {
      pauseScreen.classList.add("hidden");
      pauseScreen.setAttribute("aria-hidden", "true");
    }
    if (artifactChoiceScreen) {
      artifactChoiceScreen.classList.add("hidden");
      artifactChoiceScreen.setAttribute("aria-hidden", "true");
    }
    if (skillBar) skillBar.classList.remove("hidden");
    if (waveRewardToastWrap) waveRewardToastWrap.innerHTML = "";

    paused = false;
    mouseLeftHeld = false;
    moveTarget = null;
    runAutosaveAcc = 0;
    state = resetWorld();
    persistRunSave(state);
    renderSkillRecentIcons();
    renderArtifactSlots();
    syncUltSlotFromState();
    renderInvokeCooldownRow();
    renderPurchasedUpgrades();
    updateHud();
    lastT = performance.now();
    syncPauseToggleButton();
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  boot();
})();
