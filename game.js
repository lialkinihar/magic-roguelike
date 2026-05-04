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
  const BASE_PLAYER_MOVE_SPEED = 430;
  const SHOP_COST_HEAL = 10;
  const SHOP_COST_HP = 30;
  const SHOP_COST_SPEED = 50;
  const SHOP_COST_AEGIS = 120;
  const REVIVE_DELAY_SEC = 2;
  const REVIVE_SLOWMO_FACTOR = 0.25;
  const REVIVE_INVULN_SEC = 4;
  const SHOP_UPGRADE_DEFS = [
    { key: "heal", icon: "🧪", name: "Хилка", desc: "Мгновенно лечит на 30 HP.", persistent: false },
    { key: "hp", icon: "❤️", name: "Буст HP", desc: "Увеличивает максимум HP на 10.", persistent: true },
    { key: "speed", icon: "💨", name: "Буст скорости", desc: "Увеличивает скорость движения на 10%.", persistent: true },
    { key: "aegis", icon: "🛡️", name: "Эгида феникса", desc: "Одноразовое воскрешение с полным HP при смертельном уроне.", persistent: true },
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
    { id: "artifact_fury", icon: "🗡️", name: "Пепельная ярость", desc: "+12% к урону всех заклинаний.", rarity: "Обычный", weight: 52, unique: false, tags: ["damage"], apply: (s) => {
      s.fireballDamage *= 1.12;
      s.iceSpearDamage *= 1.12;
      s.lightningDamage *= 1.12;
    } },
    { id: "artifact_guard", icon: "🛡️", name: "Опаловый панцирь", desc: "+25 к максимуму HP и мгновенное лечение на 25.", rarity: "Обычный", weight: 46, unique: false, tags: ["survival"], apply: (s) => {
      s.maxHp += 25;
      s.hp = Math.min(s.maxHp, s.hp + 25);
    } },
    { id: "artifact_step", icon: "👢", name: "Сапоги ветра", desc: "+10% к скорости передвижения.", rarity: "Обычный", weight: 42, unique: false, tags: ["utility"], apply: (s) => {
      s.moveSpeed *= 1.1;
    } },
    { id: "artifact_chain", icon: "⚡", name: "Грозовой узел", desc: "+20% к урону молний.", rarity: "Редкий", weight: 26, unique: false, tags: ["damage"], apply: (s) => {
      s.lightningDamage *= 1.2;
    } },
    { id: "artifact_nova", icon: "🔥", name: "Ядро огня", desc: "+18% к урону огня и +15% к радиусу взрыва.", rarity: "Редкий", weight: 24, unique: false, tags: ["damage"], apply: (s) => {
      s.fireballDamage *= 1.18;
      s.fireballBlastRadius *= 1.15;
    } },
    { id: "artifact_heart", icon: "💎", name: "Сердце феникса", desc: "Полностью восстанавливает HP и +15 к максимуму.", rarity: "Эпический", weight: 12, unique: true, tags: ["survival"], apply: (s) => {
      s.maxHp += 15;
      s.hp = s.maxHp;
    } },
  ];

  const MAIN_SKILL_KEYS = ["KeyQ", "KeyW", "KeyE", "KeyR"];
  const MAIN_KEY_LABELS = ["Q", "W", "E", "R"];
  const SKILL_RECENT_EMOJI = { ice: "❄️", lightning: "⚡", fire: "🔥" };
  /** Печать на кнопке Invoke (магический круг / печать) */
  const INVOKE_SEAL = "◉";

  const RUNE_TO_KEY = { ice: "Q", lightning: "W", fire: "E" };
  const KEY_TO_RUNE_ICON = { Q: "❄️", W: "⚡", E: "🔥" };
  const SORTED2 = (a, b) => [a, b].sort().join("");
  const SINGLE_RUNE_COMBOS = [
    { id: "rune_q", sequence: "Q", name: "Frost Shard", icon: "❄️", cooldownSec: 0, archetype: "single_ice", damage: 18 },
    { id: "rune_w", sequence: "W", name: "Chain Lightning", icon: "⚡", cooldownSec: 0, archetype: "single_lightning", damage: 20 },
    { id: "rune_e", sequence: "E", name: "Meteor", icon: "🔥", cooldownSec: 0, archetype: "single_fire", damage: 22 },
  ];
  const DUAL_RUNE_COMBOS = [
    { id: "duo_qq", sequence: "QQ", name: "Frost Lance", icon: "❄️", cooldownSec: 4, archetype: "duo_qq", damage: 28 },
    { id: "duo_qw", sequence: "QW", name: "Static Spike", icon: "⚡", cooldownSec: 5, archetype: "duo_qw", damage: 24 },
    { id: "duo_qe", sequence: "QE", name: "Steam Burst", icon: "🔥", cooldownSec: 5.5, archetype: "duo_qe", damage: 30 },
    { id: "duo_ww", sequence: "WW", name: "Storm Arc", icon: "⚡", cooldownSec: 5.5, archetype: "duo_ww", damage: 26 },
    { id: "duo_we", sequence: "WE", name: "Ball Lightning", icon: "⚡", cooldownSec: 6.5, archetype: "duo_we", damage: 33 },
    { id: "duo_ee", sequence: "EE", name: "Flame Wave", icon: "🔥", cooldownSec: 6, archetype: "duo_ee", damage: 31 },
  ];
  const INVOKE_COMBOS = [
    { id: "combo_qqq", sequence: "QQQ", name: "Ice Volley", icon: "❄️", cooldownSec: 9, archetype: "ice_volley", damage: 22 },
    { id: "combo_qqw", sequence: "QQW", name: "Stormfrost", icon: "❄️", cooldownSec: 8.5, archetype: "ice_chain", damage: 18 },
    { id: "combo_qqe", sequence: "QQE", name: "Thermal Shock", icon: "❄️", cooldownSec: 9.5, archetype: "ice_burst", damage: 24 },
    { id: "combo_qwq", sequence: "QWQ", name: "Static Spike", icon: "❄️", cooldownSec: 8, archetype: "ice_bolt", damage: 26 },
    { id: "combo_qww", sequence: "QWW", name: "Frost Storm", icon: "⚡", cooldownSec: 10, archetype: "cone_lightning", damage: 19 },
    { id: "combo_qwe", sequence: "QWE", name: "Elemental Prism", icon: "✨", cooldownSec: 10, archetype: "tri_burst", damage: 20 },
    { id: "combo_qeq", sequence: "QEQ", name: "Ice Mine", icon: "❄️", cooldownSec: 8.5, archetype: "mine_burst", damage: 28 },
    { id: "combo_qew", sequence: "QEW", name: "Closed Circuit", icon: "⚡", cooldownSec: 9.5, archetype: "zone_tick", damage: 16 },
    { id: "combo_qee", sequence: "QEE", name: "Steam Rift", icon: "🔥", cooldownSec: 10.5, archetype: "fire_burst", damage: 27 },

    { id: "combo_wqq", sequence: "WQQ", name: "Frost Surge", icon: "⚡", cooldownSec: 8.5, archetype: "chain_nova", damage: 18 },
    { id: "combo_wqw", sequence: "WQW", name: "Focus Beam", icon: "⚡", cooldownSec: 8, archetype: "lightning_bolt", damage: 30 },
    { id: "combo_wqe", sequence: "WQE", name: "Impulse Burst", icon: "⚡", cooldownSec: 9, archetype: "lightning_burst", damage: 24 },
    { id: "combo_wwq", sequence: "WWQ", name: "Polar Arc", icon: "⚡", cooldownSec: 9.5, archetype: "chain_ice", damage: 20 },
    { id: "combo_www", sequence: "WWW", name: "Storm Judgment", icon: "⚡", cooldownSec: 10, archetype: "lightning_nova", damage: 34 },
    { id: "combo_wwe", sequence: "WWE", name: "Plasma Chain", icon: "⚡", cooldownSec: 11, archetype: "chain_heavy", damage: 22 },
    { id: "combo_weq", sequence: "WEQ", name: "Supercool", icon: "⚡", cooldownSec: 9.5, archetype: "freeze_burst", damage: 23 },
    { id: "combo_wew", sequence: "WEW", name: "Overload", icon: "⚡", cooldownSec: 10, archetype: "delayed_burst", damage: 34 },
    { id: "combo_wee", sequence: "WEE", name: "Arc Torch", icon: "🔥", cooldownSec: 10.5, archetype: "fire_cone", damage: 20 },

    { id: "combo_eqq", sequence: "EQQ", name: "Crystallization", icon: "🔥", cooldownSec: 9, archetype: "fire_ice", damage: 24 },
    { id: "combo_eqw", sequence: "EQW", name: "Spark Blast", icon: "🔥", cooldownSec: 9.5, archetype: "fire_chain", damage: 25 },
    { id: "combo_eqe", sequence: "EQE", name: "Blazing Spike", icon: "🔥", cooldownSec: 8.5, archetype: "fire_bolt", damage: 31 },
    { id: "combo_ewq", sequence: "EWQ", name: "Storm Torch", icon: "🔥", cooldownSec: 10, archetype: "cone_mix", damage: 19 },
    { id: "combo_eww", sequence: "EWW", name: "Plasma Rain", icon: "⚡", cooldownSec: 11, archetype: "storm_area", damage: 23 },
    { id: "combo_ewe", sequence: "EWE", name: "Electro Flash", icon: "⚡", cooldownSec: 10, archetype: "player_nova", damage: 26 },
    { id: "combo_eeq", sequence: "EEQ", name: "Burning Front", icon: "🔥", cooldownSec: 10.5, archetype: "wide_cone", damage: 21 },
    { id: "combo_eew", sequence: "EEW", name: "Solar Discharge", icon: "🔥", cooldownSec: 10.5, archetype: "fire_chain_heavy", damage: 28 },
    { id: "combo_eee", sequence: "EEE", name: "Comet of Destruction", icon: "☄️", cooldownSec: 11, archetype: "fire_cone", damage: 24 },
  ];
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

  /** Огненный конус: длительность и геометрия */
  const FIRE_CONE_DURATION = 3.4;
  const FIRE_CONE_RANGE = 200;
  const FIRE_CONE_HALF_ANGLE = 0.52;
  const FIRE_CONE_TICK = 0.14;
  const FIRE_CONE_DMG = 9;

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
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      const seqIcons = def.sequence
        .split("")
        .map((k) => KEY_TO_RUNE_ICON[k] || k)
        .join("");
      el.innerHTML = `<div class="skill-invoke-cd-ring"><span class="skill-invoke-cd-seq" aria-hidden="true">${seqIcons}</span><span class="skill-invoke-cd-timer" aria-live="polite"></span></div>`;
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
      const left = state.invokeSpellCd[key] || 0;
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
    ult.innerHTML =
      '<span class="skill-emoji" aria-hidden="true">◇</span><span class="skill-key">Пробел</span><span class="skill-label">Пусто</span>';
    skillUltWrap.appendChild(ult);
    const slotEmoji = ["❄️", "⚡", "🔥", INVOKE_SEAL];
    const slotLabel = ["Ice Rune", "Lightning Rune", "Fire Rune", "Invoke"];
    for (let i = 0; i < 4; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "skill-slot skill-slot-main";
      btn.dataset.slot = String(i);
      btn.setAttribute("aria-keyshortcuts", MAIN_KEY_LABELS[i]);
      const em = `<span class="skill-emoji" aria-hidden="true">${slotEmoji[i]}</span>`;
      btn.innerHTML = `${em}<span class="skill-key">${MAIN_KEY_LABELS[i]}</span><span class="skill-label">${slotLabel[i]}</span>`;
      btn.addEventListener("click", () => activateHotbarSlot(i));
      skillSlotsWrap.appendChild(btn);
    }
  }

  function renderSkillRecentIcons() {
    if (!skillRecentWrap) return;
    skillRecentWrap.innerHTML = "";
    if (!state || !state.skillIconQueue) return;
    for (const k of state.skillIconQueue) {
      const span = document.createElement("span");
      span.className = "skill-recent-icon";
      span.setAttribute("role", "img");
      span.textContent = SKILL_RECENT_EMOJI[k] || "?";
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
      ult.innerHTML =
        '<span class="skill-emoji skill-combo" aria-hidden="true">—</span><span class="skill-key">Пробел</span><span class="skill-label">Пусто</span>';
      ult.setAttribute("aria-label", "Пробел, нет загруженного Invoke");
      return;
    }
    ult.disabled = false;
    ult.classList.add("skill-slot-ult--armed");
    const combo = matchInvokeCombo(pay.kinds);
    const comboName = combo ? combo.name : "Invoke";
    const comboIcons = pay.kinds
      .map((k) => `<span class="skill-combo-icon" aria-hidden="true">${SKILL_RECENT_EMOJI[k] || "?"}</span>`)
      .join("");
    ult.innerHTML = `<span class="skill-emoji skill-combo" aria-hidden="true">${comboIcons}</span><span class="skill-key">Пробел</span><span class="skill-label">${comboName}</span>`;
    ult.setAttribute("aria-label", `Пробел — активировать ${comboName} и очистить слот`);
  }

  function gameplayAcceptsInput() {
    return (
      state &&
      !state.gameOver &&
      !state.revivePending &&
      !paused &&
      !isArtifactChoiceOpen() &&
      titleScreen.classList.contains("hidden")
    );
  }

  function tryCastIce() {
    if (!gameplayAcceptsInput()) return;
    pushSkillRecentIcon("ice");
  }

  function tryCastLightning() {
    if (!gameplayAcceptsInput()) return;
    pushSkillRecentIcon("lightning");
  }

  function tryCastFire() {
    if (!gameplayAcceptsInput()) return;
    pushSkillRecentIcon("fire");
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
    const cdLeft = combo.cooldownSec > 0 ? state.invokeSpellCd[combo.id] || 0 : 0;
    if (cdLeft > 0) return;
    state.invokePayload = null;
    syncUltSlotFromState();
    if (combo.cooldownSec > 0) state.invokeSpellCd[combo.id] = combo.cooldownSec;
    castInvokeSpell(combo);
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
      const mi = MAIN_SKILL_KEYS.indexOf(e.code);
      if (mi >= 0) {
        activateHotbarSlot(mi);
        e.preventDefault();
      }
    },
    true
  );

  const titleScreen = document.getElementById("title-screen");
  const gameOverPanel = document.getElementById("game-over");
  const hpBar = document.getElementById("hp-bar");
  const hpText = document.getElementById("hp-text");
  const xpBar = document.getElementById("xp-bar");
  const elCoins = document.getElementById("coin-counter");
  const btnStart = document.getElementById("btn-start");
  const elLevel = document.getElementById("level");
  const elWaveLabel = document.getElementById("wave-label");
  const elKills = document.getElementById("kills");
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
  const shopScreen = document.getElementById("shop-screen");
  const shopCoins = document.getElementById("shop-coins");
  const btnShopClose = document.getElementById("btn-shop-close");
  const btnBuyHeal = document.getElementById("shop-buy-heal");
  const btnBuyHp = document.getElementById("shop-buy-hp");
  const btnBuySpeed = document.getElementById("shop-buy-speed");
  const btnBuyAegis = document.getElementById("shop-buy-aegis");
  const shopAegisStock = document.getElementById("shop-aegis-stock");
  const artifactChoiceScreen = document.getElementById("artifact-choice-screen");
  const artifactChoiceList = document.getElementById("artifact-choice-list");
  const purchasedUpgradesWrap = document.getElementById("purchased-upgrades");
  const btnCombos = document.getElementById("btn-combos");
  const combosPanel = document.getElementById("combos-panel");
  const combosList = document.getElementById("combos-list");
  const btnCombosClose = document.getElementById("btn-combos-close");

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

  function openPauseMenu() {
    if (!pauseScreen || !state || state.gameOver || isShopOpen() || isArtifactChoiceOpen()) return;
    paused = true;
    pauseScreen.classList.remove("hidden");
    pauseScreen.setAttribute("aria-hidden", "false");
  }

  function closePauseMenu() {
    if (!pauseScreen || !isPauseMenuOpen()) return;
    pauseScreen.classList.add("hidden");
    pauseScreen.setAttribute("aria-hidden", "true");
    paused = false;
  }

  function renderShopUi() {
    if (!state || !shopScreen) return;
    const c = state.stats.coins | 0;
    if (shopCoins) shopCoins.textContent = String(c);
    if (btnBuyHeal) btnBuyHeal.disabled = c < SHOP_COST_HEAL;
    if (btnBuyHp) btnBuyHp.disabled = c < SHOP_COST_HP;
    if (btnBuySpeed) btnBuySpeed.disabled = c < SHOP_COST_SPEED;
    if (btnBuyAegis) btnBuyAegis.disabled = c < SHOP_COST_AEGIS || !!state.aegisBought;
    if (shopAegisStock) shopAegisStock.textContent = state.aegisBought ? "0/1" : "1/1";
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
      const icon = isBrokenAegis ? "💥" : def.icon;
      el.innerHTML = `<span class="badge-icon" aria-hidden="true">${icon}</span><span class="badge-count">${count}</span>`;
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
      el.innerHTML = `<span class="badge-icon" aria-hidden="true">${def.icon || "✨"}</span><span class="badge-count">${count}</span>`;
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
    def.apply(state.stats);
    state.artifactsTaken.add(def.id);
    if (!state.artifactOwned) state.artifactOwned = {};
    state.artifactOwned[def.id] = (state.artifactOwned[def.id] || 0) + 1;
    closeArtifactChoice();
    updateHud();
  }

  function openArtifactChoice(choices) {
    if (!artifactChoiceScreen || !artifactChoiceList || !state) return;
    artifactChoiceList.innerHTML = "";
    for (const def of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "artifact-choice-btn";
      btn.innerHTML = `<span class="artifact-choice-main"><strong>${def.name}</strong><em>${def.desc}</em></span><span class="artifact-choice-rarity">${def.rarity}</span>`;
      btn.addEventListener("click", () => applyArtifactChoice(def));
      artifactChoiceList.appendChild(btn);
    }
    paused = true;
    artifactChoiceScreen.classList.remove("hidden");
    artifactChoiceScreen.setAttribute("aria-hidden", "false");
  }

  function renderCombosList() {
    if (!combosList) return;
    const all = [...SINGLE_RUNE_COMBOS, ...DUAL_RUNE_COMBOS, ...INVOKE_COMBOS];
    combosList.innerHTML = "";
    for (const c of all) {
      const el = document.createElement("div");
      el.className = "combo-entry";
      const cdText = c.cooldownSec > 0 ? `${c.cooldownSec}s CD` : "No CD";
      el.innerHTML = `<div class="combo-title"><span>${c.icon} ${c.sequence} — ${c.name}</span><span>${cdText}</span></div><div class="combo-meta">Damage: ${c.damage} • Type: ${c.archetype}</div>`;
      combosList.appendChild(el);
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
    s.hp = Math.min(s.maxHp, s.hp + 30);
    state.shopPurchased.heal++;
    renderShopUi();
    renderPurchasedUpgrades();
    updateHud();
  }

  function buyHpBoost() {
    if (!trySpendCoins(SHOP_COST_HP)) return;
    const s = state.stats;
    s.maxHp += 10;
    s.hp = Math.min(s.maxHp, s.hp + 10);
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
      if (titleScreen.classList.contains("hidden") === false) return;
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
    },
    true
  );

  if (btnResume) btnResume.addEventListener("click", closePauseMenu);
  if (btnShop) btnShop.addEventListener("click", openShop);
  if (btnShopClose) btnShopClose.addEventListener("click", closeShop);
  if (btnBuyHeal) btnBuyHeal.addEventListener("click", buyHeal);
  if (btnBuyHp) btnBuyHp.addEventListener("click", buyHpBoost);
  if (btnBuySpeed) btnBuySpeed.addEventListener("click", buySpeedBoost);
  if (btnBuyAegis) btnBuyAegis.addEventListener("click", buyAegis);
  if (btnCombos) btnCombos.addEventListener("click", toggleCombosPanel);
  if (btnCombosClose) btnCombosClose.addEventListener("click", closeCombosPanel);

  btnStart.addEventListener("click", startGame);
  document.getElementById("btn-restart").addEventListener("click", startGame);
  document.getElementById("btn-victory-restart").addEventListener("click", startGame);
  btnStart.disabled = false;

  function rand(a, b) {
    return a + Math.random() * (b - a);
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
    buildSkillBarSlots();
    buildInvokeCooldownRow();
    renderInvokeCooldownRow();
    rafId = requestAnimationFrame(tick);
  }

  let state = null;
  let lastT = 0;
  let paused = false;
  let rafId = 0;

  function defaultStats() {
    return {
      hp: 100,
      maxHp: 100,
      moveSpeed: BASE_PLAYER_MOVE_SPEED,
      pickupRadius: 110,
      fireballDamage: 22,
      fireballBlastRadius: 72,
      iceSpearDamage: 18,
      iceSpearPierce: 3,
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
      spawnAcc: 0,
      completed: 0,
      bossSpawned: false,
      hadEnemies: false,
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
    const eligible = ARTIFACT_DEFS.filter((a) => !(a.unique && state.artifactsTaken.has(a.id)));
    const picked = [];
    const used = new Set();
    while (picked.length < 3 && eligible.length > 0) {
      let total = 0;
      for (const a of eligible) {
        if (used.has(a.id)) continue;
        const waveBoost = a.rarity === "Редкий" ? state.wave.index * 2 : a.rarity === "Эпический" ? state.wave.index * 3 : 0;
        total += a.weight + waveBoost;
      }
      if (total <= 0) break;
      let roll = Math.random() * total;
      let selected = null;
      for (const a of eligible) {
        if (used.has(a.id)) continue;
        const w = a.weight + (a.rarity === "Редкий" ? state.wave.index * 2 : a.rarity === "Эпический" ? state.wave.index * 3 : 0);
        roll -= w;
        if (roll <= 0) {
          selected = a;
          break;
        }
      }
      if (!selected) break;
      used.add(selected.id);
      picked.push(selected);
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
      playerShots: [],
      enemyBullets: [],
      nextEnemyId: 1,
      stats: defaultStats(),
      wave: makeWaveState(),
      skillIconQueue: [],
      invokePayload: null,
      invokeSpellCd: createInvokeCooldownState(),
      fireCones: [],
      lightningStrikeFx: [],
      aegisReviveFx: null,
      revivePending: null,
      playerInvulnerability: 0,
      shopPurchased: { heal: 0, hp: 0, speed: 0, aegis: 0 },
      aegisBought: false,
      aegisBroken: false,
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
      baseSpeedMul *= 0.76;
      baseDmgMul *= 1.2;
    } else if (type === "runner") {
      baseHp *= 0.7;
      baseSpeedMul *= 1.45;
      baseDmgMul *= 0.92;
    } else if (type === "sniper") {
      baseHp *= 0.9;
      baseSpeedMul *= 0.94;
      baseDmgMul *= 1.32;
    }
    if (isElite) {
      baseHp *= 2.35;
      baseDmgMul *= 1.45;
      baseSpeedMul *= 1.15;
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
        speed: (68 + difficulty * 2.2 + t * 28) * baseSpeedMul,
        dmg: (6 + difficulty * 0.35) * baseDmgMul,
        touchCd: 0,
        shootCd: rand(0.15, 0.85),
        shootInterval: 0.85 + Math.random() * 0.45,
        bulletSpeed: 400,
        bulletDmg: (8 + difficulty * 0.38 + t * 2) * baseDmgMul,
        elite: isElite,
      });
    } else {
      const spd = (55 + difficulty * 3.5 + t * 55) * baseSpeedMul;
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
      });
    }
  }

  function spawnWaveEnemy() {
    const waveCfg = getWaveConfig(state.wave.index);
    const type = pickEnemyTypeForWave(waveCfg);
    if (type === "boss1" || type === "boss2") return;
    spawnEnemyByType(type, waveCfg, false);
    state.wave.hadEnemies = true;
  }

  function spawnHealthPickup(x, y) {
    if (state.healPickups.length >= HEALTH_PICKUP_CAP) return;
    const margin = BORDER_WALL + 14;
    x = Math.max(margin, Math.min(WORLD_W - margin, x + rand(-10, 10)));
    y = Math.max(margin, Math.min(WORLD_H - margin, y + rand(-10, 10)));
    if (circleHitsBlocks(x, y, 10)) return;
    const tm = state.stats.time;
    const heal = Math.min(55, Math.round(20 + tm * 0.32));
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
    state.enemies.push({
      kind: stage === 1 ? "boss1" : "boss2",
      stage,
      id: bossId,
      x,
      y,
      r,
      hp: stage === 1 ? 1800 : 3200,
      maxHp: stage === 1 ? 1800 : 3200,
      speed: stage === 1 ? 80 : 94,
      dmg: stage === 1 ? 16 : 24,
      touchCd: 0,
      shootCd: 0.45,
      shootInterval: stage === 1 ? 1.1 : 0.75,
      bulletSpeed: stage === 1 ? 420 : 520,
      bulletDmg: stage === 1 ? 12 : 18,
      elite: false,
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
    state.wave.spawnAcc = 0;
    state.wave.bossSpawned = false;
    state.wave.hadEnemies = false;
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
        e.hp -= dmg;
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
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.life <= 0 || pr.x < -100 || pr.x > WORLD_W + 100 || pr.y < -100 || pr.y > WORLD_H + 100) {
        if (pr.kind === "ball_lightning") {
          applyFireballBlast(pr.x, pr.y, pr.blastR * 0.72, pr.hopDmg * 0.55);
          if (!state.lightningStrikeFx) state.lightningStrikeFx = [];
          state.lightningStrikeFx.push({ x: pr.x, y: pr.y, life: 0.3 });
        }
        shots.splice(i, 1);
        continue;
      }
      const hitR = pr.kind === "fireball" || pr.kind === "ball_lightning" ? 6 : pr.kind === "lightning" ? 3 : 4;
      if (circleHitsBlocks(pr.x, pr.y, hitR)) {
        if (pr.kind === "fireball") applyFireballBlast(pr.x, pr.y, pr.blastR, pr.dmg);
        else if (pr.kind === "ball_lightning") {
          applyFireballBlast(pr.x, pr.y, pr.blastR, pr.hopDmg);
          if (!state.lightningStrikeFx) state.lightningStrikeFx = [];
          state.lightningStrikeFx.push({ x: pr.x, y: pr.y, life: 0.36 });
        }
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
      } else if (pr.kind === "lightning") {
        let hitEnemy = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + 5) {
            e.hp -= pr.dmg;
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
      } else if (pr.kind === "ice") {
        let removed = false;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (pr.hitIds.has(e.id)) continue;
          if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + 6) {
            pr.hitIds.add(e.id);
            e.hp -= pr.dmg;
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
      } else if (pr.kind === "ball_lightning") {
        let tgt = null;
        for (const e of state.enemies) {
          if (e.id === pr.targetId) {
            tgt = e;
            break;
          }
        }
        if (!tgt) {
          let best = null;
          let bd = 1e9;
          for (const e of state.enemies) {
            if (e.id === pr.lastAnchorId && state.enemies.length > 1) continue;
            const dd = Math.hypot(e.x - pr.x, e.y - pr.y);
            if (dd < bd) {
              bd = dd;
              best = e;
            }
          }
          if (!best) {
            bd = 1e9;
            for (const e of state.enemies) {
              const dd = Math.hypot(e.x - pr.x, e.y - pr.y);
              if (dd < bd) {
                bd = dd;
                best = e;
              }
            }
          }
          tgt = best;
          pr.targetId = best ? best.id : null;
        }
        if (!tgt) {
          pr._noTgtT = (pr._noTgtT || 0) + dt;
          if (pr._noTgtT > 0.35) {
            applyFireballBlast(pr.x, pr.y, pr.blastR * 0.72, pr.hopDmg * 0.6);
            if (!state.lightningStrikeFx) state.lightningStrikeFx = [];
            state.lightningStrikeFx.push({ x: pr.x, y: pr.y, life: 0.32 });
            shots.splice(i, 1);
            continue;
          }
        } else {
          pr._noTgtT = 0;
          const dx = tgt.x - pr.x;
          const dy = tgt.y - pr.y;
          const dist = Math.hypot(dx, dy) || 1e-4;
          const sp = pr.speed;
          pr.vx = (dx / dist) * sp;
          pr.vy = (dy / dist) * sp;
        }
        if (tgt && Math.hypot(pr.x - tgt.x, pr.y - tgt.y) < tgt.r + 16) {
          applyFireballBlast(tgt.x, tgt.y, pr.blastR, pr.hopDmg);
          if (!state.lightningStrikeFx) state.lightningStrikeFx = [];
          state.lightningStrikeFx.push({ x: tgt.x, y: tgt.y, life: 0.4 });
          pr.hopsLeft--;
          pr.lastAnchorId = tgt.id;
          pr.targetId = null;
          pr.x = tgt.x;
          pr.y = tgt.y;
          if (pr.hopsLeft <= 0) {
            shots.splice(i, 1);
            continue;
          }
        }
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

  function applyDamageEnemyIndex(j, dmg) {
    const e = state.enemies[j];
    if (!e || dmg <= 0) return;
    e.hp -= dmg;
    if (e.hp <= 0) {
      state.enemies.splice(j, 1);
      state.stats.kills++;
      onEnemyKilled(e);
    }
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

  function castIceVolleyInvoke(count = ICE_VOLLEY_COUNT, spreadMul = 1, dmgMul = 1, speedMul = 1, pierceBonus = 0) {
    const p = state.player;
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
        x: p.x + Math.cos(a) * 24,
        y: p.y + Math.sin(a) * 24,
        vx: Math.cos(a) * ICE_VOLLEY_SPEED * speedMul,
        vy: Math.sin(a) * ICE_VOLLEY_SPEED * speedMul,
        life: ICE_VOLLEY_LIFE,
        dmg,
        pierceLeft: pierce,
        hitIds: new Set(),
      });
    }
  }

  function castLightningNovaInvoke(targets = 5, dmgMul = 1, rangeMul = 1) {
    const p = state.player;
    const baseDmg = state.stats.lightningDamage * 2.4 * dmgMul;
    const sorted = state.enemies
      .map((e) => ({ e, d: Math.hypot(e.x - p.x, e.y - p.y) }))
      .filter((x) => x.d <= 450 * rangeMul)
      .sort((a, b) => a.d - b.d)
      .slice(0, Math.max(1, targets | 0));
    if (!state.lightningStrikeFx) state.lightningStrikeFx = [];
    for (const { e } of sorted) {
      const idx = state.enemies.indexOf(e);
      if (idx < 0) continue;
      applyDamageEnemyIndex(idx, baseDmg);
      state.lightningStrikeFx.push({ x: e.x, y: e.y, life: 0.35 });
    }
  }

  function castDirectedShot(kind, dmg, speed = 1, life = 1, extra = {}) {
    const p = state.player;
    const a = getPlayerAimAngle() + (extra.angleOffset || 0);
    if (kind === "fireball") {
      state.playerShots.push({
        kind: "fireball",
        x: p.x + Math.cos(a) * 24,
        y: p.y + Math.sin(a) * 24,
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
        x: p.x + Math.cos(a) * 22,
        y: p.y + Math.sin(a) * 22,
        vx: Math.cos(a) * 900 * speed,
        vy: Math.sin(a) * 900 * speed,
        life: 0.75 * life,
        dmg,
      });
      return;
    }
    castIceVolleyInvoke(1, 0, dmg / Math.max(1, state.stats.iceSpearDamage * 1.08), speed, extra.pierceBonus || 0);
  }

  function castBurstAtCursor(dmg, radius = 95) {
    const m = getWorldMouseXY();
    applyFireballBlast(m.x, m.y, radius, dmg);
    if (!state.lightningStrikeFx) state.lightningStrikeFx = [];
    state.lightningStrikeFx.push({ x: m.x, y: m.y, life: 0.32 });
  }

  /** Шаровая молния WE: шар скачет между врагами, на каждом приземлении AOE. */
  function castBallLightningInvoke(comboDamage) {
    const p = state.player;
    const hopDmg = Math.max(6, comboDamage * 0.52);
    const blastR = 78;
    const speed = 540;
    const hops = 5;
    const ax = Math.cos(getPlayerAimAngle());
    const ay = Math.sin(getPlayerAimAngle());
    let first = null;
    let bestS = Infinity;
    for (const e of state.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 560) continue;
      const inv = 1 / Math.max(dist, 1e-4);
      const dot = dx * inv * ax + dy * inv * ay;
      const score = dist * 1.1 - dot * 200;
      if (score < bestS) {
        bestS = score;
        first = e;
      }
    }
    const a = getPlayerAimAngle();
    const bx = p.x + Math.cos(a) * 30;
    const by = p.y + Math.sin(a) * 30;
    state.playerShots.push({
      kind: "ball_lightning",
      x: bx,
      y: by,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      speed,
      targetId: first ? first.id : null,
      lastAnchorId: null,
      hopsLeft: hops,
      hopDmg,
      blastR,
      life: 4.2,
    });
  }

  function castInvokeSpell(combo) {
    const d = combo.damage;
    switch (combo.archetype) {
      case "single_ice":
        castDirectedShot("ice", d, 1.15, 1.1, { pierceBonus: 1 });
        break;
      case "single_lightning":
        castLightningNovaInvoke(3, d / 26, 1.05);
        break;
      case "single_fire":
        castDirectedShot("fireball", d, 1.05, 1, { blastR: 76 });
        break;
      case "duo_qq":
        castIceVolleyInvoke(3, 0.32, d / 24, 1.2, 2);
        break;
      case "duo_qw":
        castDirectedShot("ice", d * 0.75, 1.15, 1.1, { pierceBonus: 1 });
        castLightningNovaInvoke(2, 0.65, 0.9);
        break;
      case "duo_qe":
        castBurstAtCursor(d, 95);
        castIceVolleyInvoke(2, 0.2, 0.7, 0.95, 0);
        break;
      case "duo_ww":
        castLightningNovaInvoke(4, d / 28, 1.05);
        break;
      case "duo_we":
        castBallLightningInvoke(d);
        break;
      case "duo_ee":
        castFireConeInvoke(d / 26, 0.85, 1.05, 1.2);
        break;
      case "ice_volley":
        castIceVolleyInvoke(10, 1, d / 22, 1.05, 0);
        break;
      case "ice_chain":
        castIceVolleyInvoke(4, 0.45, d / 20, 1, 1);
        castLightningNovaInvoke(2, 0.8, 0.8);
        break;
      case "ice_burst":
      case "mine_burst":
      case "freeze_burst":
        castBurstAtCursor(d, 92);
        castIceVolleyInvoke(3, 0.3, 0.7, 0.9, 0);
        break;
      case "ice_bolt":
        castDirectedShot("ice", d, 1.15, 1.1, { pierceBonus: 2 });
        break;
      case "cone_lightning":
        castFireConeInvoke(d / 24, 0.75, 1.05, 0.95);
        castLightningNovaInvoke(2, 0.7, 0.7);
        break;
      case "tri_burst":
        castDirectedShot("ice", d * 0.8, 1, 1, { angleOffset: -0.12 });
        castDirectedShot("lightning", d * 0.8, 1.1, 1, { angleOffset: 0 });
        castDirectedShot("fireball", d * 0.8, 1, 1, { angleOffset: 0.12, blastR: 68 });
        break;
      case "fire_burst":
      case "lightning_burst":
      case "storm_area":
      case "delayed_burst":
      case "zone_tick":
        castBurstAtCursor(d, 102);
        if (combo.archetype === "storm_area" || combo.archetype === "zone_tick") castLightningNovaInvoke(4, 0.8, 1);
        break;
      case "chain_nova":
        castLightningNovaInvoke(4, d / 26, 1);
        break;
      case "lightning_bolt":
        castDirectedShot("lightning", d, 1.3, 1.1);
        break;
      case "chain_ice":
        castLightningNovaInvoke(3, d / 25, 1);
        castIceVolleyInvoke(5, 0.55, 0.8, 1, 0);
        break;
      case "lightning_nova":
        castLightningNovaInvoke(5, d / 34, 1);
        break;
      case "chain_heavy":
        castLightningNovaInvoke(7, d / 26, 1.2);
        break;
      case "fire_ice":
        castDirectedShot("fireball", d * 0.85, 1, 1, { blastR: 86 });
        castIceVolleyInvoke(4, 0.5, 0.6, 0.95, 0);
        break;
      case "fire_chain":
      case "fire_chain_heavy":
        castDirectedShot("fireball", d * 0.8, 1, 1.1, { blastR: combo.archetype === "fire_chain_heavy" ? 92 : 78 });
        castLightningNovaInvoke(combo.archetype === "fire_chain_heavy" ? 3 : 2, 0.9, 1);
        break;
      case "fire_bolt":
        castDirectedShot("fireball", d, 1.15, 1.1, { blastR: 70 });
        break;
      case "cone_mix":
      case "wide_cone":
      case "fire_cone":
        castFireConeInvoke(d / 24, combo.archetype === "fire_cone" ? 1 : 0.78, combo.archetype === "wide_cone" ? 1.15 : 1, combo.archetype === "wide_cone" ? 1.32 : 1);
        if (combo.archetype === "cone_mix") castLightningNovaInvoke(2, 0.65, 0.8);
        break;
      case "player_nova": {
        const p = state.player;
        applyFireballBlast(p.x, p.y, 118, d);
        if (!state.lightningStrikeFx) state.lightningStrikeFx = [];
        state.lightningStrikeFx.push({ x: p.x, y: p.y, life: 0.35 });
        break;
      }
      default:
        break;
    }
  }

  function updateLightningStrikeFx(dt) {
    const fx = state.lightningStrikeFx;
    if (!fx || !fx.length) return;
    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].life -= dt;
      if (fx[i].life <= 0) fx.splice(i, 1);
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

  function invokeCooldownTick(dt) {
    if (!state.invokeSpellCd) return;
    for (const k of Object.keys(state.invokeSpellCd)) {
      state.invokeSpellCd[k] = Math.max(0, state.invokeSpellCd[k] - dt);
    }
    renderInvokeCooldownRow();
  }

  function playerInput(dt) {
    if (state.revivePending) return;
    const p = state.player;
    const s = state.stats.moveSpeed;
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
    if (state.revivePending || state.playerInvulnerability > 0) return;
    const p = state.player;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < p.r + e.r * 0.85 && e.touchCd <= 0) {
      state.stats.hp -= e.dmg;
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
      e.touchCd = Math.max(0, e.touchCd - dt);
      if (e.kind === "boss1" || e.kind === "boss2") {
        let dx = p.x - e.x;
        let dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const sp = e.speed * dt;
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
        let dx = p.x - e.x;
        let dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const sp = e.speed * dt;
        const ring = 360;
        if (d < ring - 50) {
          tryMoveEnemy(e, e.x - dx * sp, e.y - dy * sp);
        } else if (d > ring + 100) {
          tryMoveEnemy(e, e.x + dx * sp, e.y + dy * sp);
        } else {
          const tx = -dy;
          const ty = dx;
          const sd = Math.sin(state.stats.time * 2.2 + e.id * 0.7) > 0 ? 1 : -1;
          tryMoveEnemy(e, e.x + tx * sp * 0.62 * sd, e.y + ty * sp * 0.62 * sd);
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
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        const sp = e.speed * dt;
        tryMoveEnemy(e, e.x + (dx / len) * sp, e.y + (dy / len) * sp);
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
      if (Math.hypot(b.x - p.x, b.y - p.y) < p.r + 6) {
        if (state.revivePending || state.playerInvulnerability > 0) {
          bullets.splice(i, 1);
          continue;
        }
        state.stats.hp -= b.dmg;
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
    if (elCoins) elCoins.textContent = `🪙 ${s.coins | 0}`;
    renderPurchasedUpgrades();
    const runFrac = getWaveProgressFraction();
    xpBar.style.width = `${runFrac * 100}%`;
    elLevel.textContent = `Прогресс: ${Math.round(runFrac * 100)}%`;
    if (elWaveLabel) {
      const remaining = Math.max(0, Math.ceil(WAVE_DURATION_SEC - state.wave.timer));
      elWaveLabel.textContent = `Волна ${state.wave.index} / ${TOTAL_WAVES} • ${remaining}с`;
    }
    elKills.textContent = `Убийств: ${s.kills}`;
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

    for (const c of state.fireCones) {
      const ang = getPlayerAimAngle();
      const r = c.range;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, r, ang - c.halfAngle, ang + c.halfAngle);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 82, 28, 0.26)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 190, 110, 0.42)";
      ctx.lineWidth = 2;
      ctx.stroke();
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
    }

    for (const z of state.lightningStrikeFx || []) {
      const k = Math.min(1, Math.max(0, z.life / 0.35));
      ctx.strokeStyle = `rgba(254, 230, 130, ${0.4 + k * 0.45})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(z.x, z.y, 44 * (1 - k) + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 255, 210, ${0.12 + k * 0.28})`;
      ctx.beginPath();
      ctx.arc(z.x, z.y, 26 * (1 - k) + 6, 0, Math.PI * 2);
      ctx.fill();
    }

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
      } else if (pr.kind === "ball_lightning") {
        const pulse = 0.55 + 0.45 * Math.sin(state.stats.time * 22);
        ctx.fillStyle = "rgba(160, 100, 255, 0.28)";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 18 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(200, 230, 255, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 14 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 250, 200, 0.9)";
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 7 + pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.beginPath();
        ctx.arc(pr.x - 2, pr.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.fillStyle = "#a8f0ff";
        ctx.strokeStyle = "#4088cc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-14, 5);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-14, -5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
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
      ctx.beginPath();
      ctx.arc(p.x - 4, p.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x + 5, p.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();

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
    }

    ctx.restore();
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000) || 0;
    lastT = now;

    if (titleScreen.classList.contains("hidden") === false) {
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
        state.wave.spawnAcc += simDt * waveCfg.spawnRate;
        while (state.wave.spawnAcc >= 1) {
          state.wave.spawnAcc -= 1;
          spawnWaveEnemy();
        }
      }
      if (state.wave.timer >= WAVE_DURATION_SEC || (state.wave.hadEnemies && state.enemies.length === 0)) {
        finishWave();
      }
      updateEventSystem(simDt);

      playerInput(simDt);
      updateEnemies(simDt);
      updatePlayerShots(simDt);
      updateEnemyBullets(simDt);
      updateFireCones(simDt);
      updateLightningStrikeFx(simDt);
      updateAegisReviveFx(simDt);
      invokeCooldownTick(simDt);
      updateGems(simDt);
      updateHealPickups(simDt);
      updateArtifactPickups(simDt);
      updateReviveFlow(dt);
      updatePlayerInvulnerability(dt);
      updateHud();
    }

    if (state && !state.gameOver) updateSkillBar();

    draw();
    rafId = requestAnimationFrame(tick);
  }

  function startGame() {
    resizeCanvas();
    titleScreen.classList.add("hidden");
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
    state = resetWorld();
    renderSkillRecentIcons();
    syncUltSlotFromState();
    renderInvokeCooldownRow();
    lastT = performance.now();
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  boot();
})();
