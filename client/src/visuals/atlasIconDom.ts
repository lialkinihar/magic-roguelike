import ASSETS_ATLAS_PNG_URL from "../../../assets/visuals/raster/assets-atlas.png?url";

import {
  ASSETS_ATLAS_HEIGHT,
  ASSETS_ATLAS_REGIONS,
  ASSETS_ATLAS_WIDTH,
} from "../../../assets/visuals/assets-atlas.gen.js";
import APP_MENU_BUTTON_SVG from "../../../assets/svg/app_menu_button.svg?url";
import APP_SHOP_BUTTON_SVG from "../../../assets/svg/app_shop_button.svg?url";

type AtlasReg = { x: number; y: number; w: number; h: number };

const atlasRegions = ASSETS_ATLAS_REGIONS as Record<string, AtlasReg>;

const atlasResizeObservers = new WeakMap<HTMLElement, ResizeObserver>();
const atlasInnerLayers = new WeakMap<HTMLElement, HTMLElement>();

const INLINE_SVG_BY_ID: Partial<Record<string, string>> = {
  app_menu_button: APP_MENU_BUTTON_SVG,
  app_shop_button: APP_SHOP_BUTTON_SVG,
};

/** Запасные символы, пока часть asset id отсутствует в атласе / реестре. */
const TEXT_FALLBACK: Partial<Record<string, string>> = {
  game_coin: "🪙",
  game_shop_heal: "🧪",
  game_shop_hp: "❤️",
  game_shop_speed: "💨",
  game_shop_aegis: "🛡️",
  game_shop_spellbook: "📕",
};

let atlasCssVarsInstalled = false;
let atlasTileRegionStylesInstalled = false;

function ensureAtlasCssVars(atlasImgUrl: string): void {
  if (typeof document === "undefined") return;
  if (!atlasCssVarsInstalled) {
    atlasCssVarsInstalled = true;
    const root = document.documentElement.style;
    root.setProperty("--assets-atlas-image", `url(${JSON.stringify(atlasImgUrl)})`);
    root.setProperty("--assets-atlas-w", `${ASSETS_ATLAS_WIDTH}px`);
    root.setProperty("--assets-atlas-h", `${ASSETS_ATLAS_HEIGHT}px`);
  }
  if (!atlasTileRegionStylesInstalled) {
    atlasTileRegionStylesInstalled = true;
    const rules: string[] = [];
    for (const [id, reg] of Object.entries(atlasRegions)) {
      if (!reg?.w || !reg?.h) continue;
      rules.push(
        `[data-asset-id=${JSON.stringify(id)}] > .visual-icon--atlas-tile{--tile-reg-w:${reg.w}px;--tile-reg-h:${reg.h}px;--tile-sprite-x:${reg.x}px;--tile-sprite-y:${reg.y}px;}`,
      );
    }
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-atlas-region-styles", "1");
    styleEl.textContent = rules.join("");
    document.head.appendChild(styleEl);
  }
}

function readAtlasFitBoxPx(el: HTMLElement): { w: number; h: number } {
  const ow = Math.round(el.offsetWidth);
  const oh = Math.round(el.offsetHeight);
  if (ow >= 2 && oh >= 2) return { w: ow, h: oh };
  const b = el.getBoundingClientRect();
  return {
    w: Math.max(1, Math.round(b.width)),
    h: Math.max(1, Math.round(b.height)),
  };
}

function applyAtlasRegionScale(outer: HTMLElement, inner: HTMLElement, reg: AtlasReg): boolean {
  const { w: elW, h: elH } = readAtlasFitBoxPx(outer);
  if (elW <= 1 || elH <= 1) return false;
  if (!reg?.w || !reg?.h) return false;
  const scale = Math.min(elW / reg.w, elH / reg.h);
  const fittedW = reg.w * scale;
  const fittedH = reg.h * scale;
  const offsetX = (elW - fittedW) / 2;
  const offsetY = (elH - fittedH) / 2;
  inner.style.setProperty("--atlas-tx", `${offsetX}px`);
  inner.style.setProperty("--atlas-ty", `${offsetY}px`);
  inner.style.setProperty("--atlas-scale", String(scale));
  return true;
}

function bindAtlasNode(outer: HTMLElement, reg: AtlasReg): void {
  if (typeof document === "undefined") return;
  if (atlasInnerLayers.has(outer)) return;
  const inner = outer.querySelector<HTMLElement>(".visual-icon--atlas-tile");
  if (!inner) return;
  atlasInnerLayers.set(outer, inner);
  scheduleAtlasScale(outer, inner, reg);
  if (typeof ResizeObserver !== "undefined" && !atlasResizeObservers.has(outer)) {
    const ro = new ResizeObserver(() => {
      const layer = atlasInnerLayers.get(outer);
      if (layer) applyAtlasRegionScale(outer, layer, reg);
    });
    ro.observe(outer);
    atlasResizeObservers.set(outer, ro);
  }
}

function scheduleAtlasScale(outer: HTMLElement, inner: HTMLElement, reg: AtlasReg): void {
  let tries = 0;
  const maxTries = 12;
  const tick = () => {
    tries += 1;
    const ok = applyAtlasRegionScale(outer, inner, reg);
    if (!ok && tries < maxTries) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function mountAtlasHost(host: HTMLElement, assetId: string, classNames: string[]): boolean {
  const reg = atlasRegions[assetId];
  if (!reg) return false;
  ensureAtlasCssVars(ASSETS_ATLAS_PNG_URL);
  host.replaceChildren();
  const outer = document.createElement("div");
  outer.setAttribute("role", "img");
  outer.setAttribute("aria-label", "");
  outer.draggable = false;
  outer.dataset.assetId = assetId;
  outer.className = ["visual-icon", "visual-icon--atlas", ...classNames].filter(Boolean).join(" ");
  const inner = document.createElement("span");
  inner.className = "visual-icon--atlas-tile";
  outer.appendChild(inner);
  host.appendChild(outer);
  bindAtlasNode(outer, reg);
  return true;
}

function mountInlineSvg(host: HTMLElement, assetId: string, classNames: string[]): boolean {
  const url = INLINE_SVG_BY_ID[assetId];
  if (!url) return false;
  host.replaceChildren();
  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  img.className = classNames.filter(Boolean).join(" ");
  host.appendChild(img);
  return true;
}

function mountTextFallback(host: HTMLElement, assetId: string, classNames: string[]): boolean {
  const text = TEXT_FALLBACK[assetId];
  if (!text) return false;
  host.replaceChildren();
  const span = document.createElement("span");
  span.className = classNames.filter(Boolean).join(" ");
  span.textContent = text;
  span.setAttribute("aria-hidden", "true");
  host.appendChild(span);
  return true;
}

/**
 * Приоритет: регион атласа → локальный svg → текстовый fallback.
 */
export function mountHudAtlasIcon(host: HTMLElement | null, assetId: string, classNames?: string[]): boolean {
  if (!host || typeof document === "undefined") return false;
  const cn = classNames ?? [];
  if (mountAtlasHost(host, assetId, cn)) return true;
  if (mountInlineSvg(host, assetId, cn)) return true;
  if (mountTextFallback(host, assetId, cn)) return true;
  host.replaceChildren();
  return false;
}

export function clearHudIconHost(host: HTMLElement | null): void {
  if (!host || typeof document === "undefined") return;
  host.replaceChildren();
}
