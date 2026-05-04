/**
 * Unified visuals for DOM + canvas: canonical SVG lives in ./assets/visuals/registry.js.
 *
 * - DOM: parse registry SVG into an inline <svg> (trusted strings only).
 * - Canvas: same string → Blob URL → HTMLImageElement → drawImage; keep Map cache.
 *
 * drawVisual: if id unknown or not preloaded → noop (returns false). Phase 2 will add
 * visualId on skills/entities and keep emoji/icon strings as fallback where needed.
 *
 * UI «avatar» vs world body: same registry; use kind "icon" vs "world" for tooling;
 * one logical entity may map to one assetId or split *_icon / *_world with shared palette later.
 */

import { VISUAL_ASSETS } from "./assets/visuals/registry.js";
import { VISUAL_RASTER_URLS } from "./assets/visuals/raster-icons.js";
import {
  SKILL_ICON_ATLAS_URL,
  SKILL_ICON_ATLAS_WIDTH,
  SKILL_ICON_ATLAS_HEIGHT,
  SKILL_ICON_ATLAS_REGIONS,
} from "./assets/visuals/skill-icons-atlas.gen.js";

/** @type {Map<string, HTMLImageElement | { readonly __skillAtlas: true }>} */
const imageCache = new Map();

const ATLAS_SLOT = Object.freeze({ __skillAtlas: true });

function isAtlasIcon(assetId) {
  return !!(SKILL_ICON_ATLAS_URL && SKILL_ICON_ATLAS_REGIONS[assetId]);
}

/** @type {HTMLImageElement | null} */
let atlasImage = null;
let atlasLoadPromise = null;

function ensureAtlasImage() {
  if (!SKILL_ICON_ATLAS_URL) return Promise.resolve();
  if (atlasImage?.complete && atlasImage.naturalWidth > 0) return Promise.resolve();
  if (!atlasLoadPromise) {
    atlasLoadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        atlasImage = img;
        resolve(undefined);
      };
      img.onerror = () => reject(new Error("Failed to load skill icon atlas"));
      img.src = SKILL_ICON_ATLAS_URL;
    });
  }
  return atlasLoadPromise;
}

/** All asset ids in registry — preload at boot for canvas drawVisual. */
export const ALL_VISUAL_IDS = Object.keys(VISUAL_ASSETS);

/** @deprecated use ALL_VISUAL_IDS */
export const DEMO_VISUAL_PRELOAD_IDS = ALL_VISUAL_IDS;

export function getVisualSvg(assetId) {
  if (isAtlasIcon(assetId)) return null;
  if (VISUAL_RASTER_URLS[assetId]) return null;
  const entry = VISUAL_ASSETS[assetId];
  return entry?.svg ?? null;
}

/** @param {string} assetId */
export function getRasterIconUrl(assetId) {
  if (isAtlasIcon(assetId)) return null;
  return VISUAL_RASTER_URLS[assetId] ?? null;
}

/**
 * @param {string} assetId
 * @param {{ className?: string, ariaHidden?: boolean }} [options]
 * @returns {SVGElement | HTMLImageElement | null}
 */
export function renderIconElement(assetId, options = {}) {
  if (isAtlasIcon(assetId)) {
    const reg = SKILL_ICON_ATLAS_REGIONS[assetId];
    const div = document.createElement("div");
    div.setAttribute("role", "img");
    div.setAttribute("aria-label", "");
    div.draggable = false;
    div.className = ["visual-icon", "visual-icon--atlas", options.className].filter(Boolean).join(" ");
    div.style.backgroundImage = `url("${SKILL_ICON_ATLAS_URL}")`;
    div.style.backgroundRepeat = "no-repeat";
    div.style.backgroundSize = `${SKILL_ICON_ATLAS_WIDTH}px ${SKILL_ICON_ATLAS_HEIGHT}px`;
    div.style.backgroundPosition = `-${reg.x}px -${reg.y}px`;
    if (options.ariaHidden !== undefined) div.setAttribute("aria-hidden", options.ariaHidden ? "true" : "false");
    return div;
  }
  const rasterUrl = VISUAL_RASTER_URLS[assetId];
  if (rasterUrl) {
    const img = document.createElement("img");
    img.src = rasterUrl;
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    const { className, ariaHidden } = options;
    if (className) img.setAttribute("class", className);
    if (ariaHidden !== undefined) img.setAttribute("aria-hidden", ariaHidden ? "true" : "false");
    return img;
  }
  const svg = getVisualSvg(assetId);
  if (!svg) return null;
  const el = svgStringToSvgElement(svg);
  if (!el) return null;
  const { className, ariaHidden } = options;
  if (className) el.setAttribute("class", className);
  if (ariaHidden !== undefined) el.setAttribute("aria-hidden", ariaHidden ? "true" : "false");
  el.setAttribute("focusable", "false");
  return el;
}

function svgStringToSvgElement(svgString) {
  const doc = new DOMParser().parseFromString(svgString.trim(), "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") return null;
  return /** @type {SVGElement} */ (document.importNode(root, true));
}

function svgStringToImage(svgString) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode SVG as image"));
    };
    img.src = url;
  });
}

async function ensureImageCached(assetId) {
  if (imageCache.has(assetId)) return;
  if (isAtlasIcon(assetId)) {
    await ensureAtlasImage();
    imageCache.set(assetId, ATLAS_SLOT);
    return;
  }
  const rasterUrl = VISUAL_RASTER_URLS[assetId];
  if (rasterUrl) {
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        imageCache.set(assetId, img);
        resolve(undefined);
      };
      img.onerror = () => reject(new Error(`Failed to load raster "${assetId}"`));
      img.src = rasterUrl;
    });
    return;
  }
  const svg = getVisualSvg(assetId);
  if (!svg) return;
  const img = await svgStringToImage(svg);
  imageCache.set(assetId, img);
}

/**
 * @param {string[]} assetIds
 */
export async function preloadVisualsForCanvas(assetIds) {
  const unique = [...new Set(assetIds)];
  await Promise.all(
    unique.map(async (id) => {
      try {
        await ensureImageCached(id);
      } catch (e) {
        console.warn(`[visuals] preload failed for "${id}"`, e);
      }
    })
  );
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} assetId
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {boolean}
 */
export function drawVisual(ctx, assetId, x, y, w, h) {
  const cached = imageCache.get(assetId);
  if (cached === ATLAS_SLOT) {
    const reg = SKILL_ICON_ATLAS_REGIONS[assetId];
    if (!atlasImage?.complete || atlasImage.naturalWidth === 0 || !reg) return false;
    ctx.drawImage(atlasImage, reg.x, reg.y, reg.w, reg.h, x, y, w, h);
    return true;
  }
  const img = cached;
  if (!img || !img.complete || img.naturalWidth === 0) return false;
  ctx.drawImage(img, x, y, w, h);
  return true;
}

/** Q/W/E keys in invoke sequences → registry ids */
export const KEY_TO_RUNE_VISUAL_ID = {
  Q: "game_skill_rune_q",
  W: "game_skill_rune_w",
  E: "game_skill_rune_e",
};

/** Q/W/E для полоски комбинации (отдельные мастера `frost_rune` / … в атласе) */
export const KEY_TO_COMBO_RUNE_VISUAL_ID = {
  Q: "game_combo_rune_frost",
  W: "game_combo_rune_lightning",
  E: "game_combo_rune_fire",
};

export const INVOKE_SEAL_VISUAL_ID = "game_invoke_seal_circle";

/** ice / lightning / fire → rune art for recent-icons + ult preview */
export const RUNE_KIND_TO_VISUAL_ID = {
  ice: "game_skill_rune_q",
  lightning: "game_skill_rune_w",
  fire: "game_skill_rune_e",
};

/**
 * Serialize one inline icon for trusted innerHTML (registry SVG only).
 * @param {string} assetId
 * @param {string} [extraClass]
 */
export function visualIconOuterHtml(assetId, extraClass = "") {
  if (!assetId || typeof document === "undefined") return "";
  const el = renderIconElement(assetId, {
    className: ["visual-icon", extraClass].filter(Boolean).join(" "),
    ariaHidden: true,
  });
  if (!el) return "";
  const wrap = document.createElement("span");
  wrap.appendChild(el);
  return wrap.innerHTML;
}
