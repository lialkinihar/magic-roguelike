import * as THREE from "three";

/**
 * Читает CSS-переменную с :root как цвет для Three.js.
 */
export function readCssColor(varName: string, fallbackHex: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallbackHex;
  try {
    return new THREE.Color(raw).getHex();
  } catch {
    return fallbackHex;
  }
}
