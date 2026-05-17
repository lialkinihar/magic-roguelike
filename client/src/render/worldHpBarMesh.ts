import * as THREE from "three";

import { ENTITY_BODY_HEIGHT, ENTITY_BODY_SIZE_XZ } from "./entityConstants";

const BAR_PAD_Y = 0.35;
const BAR_W = ENTITY_BODY_SIZE_XZ * 1.35;
const BAR_D = ENTITY_BODY_SIZE_XZ * 0.22;

export type WorldHpBarMeshHandle = {
  root: THREE.Group;
  setRatio: (hp: number, maxHp: number) => void;
};

function parseFillColor(fill: string | number): number {
  if (typeof fill === "number") return fill;
  const hex = fill.startsWith("#") ? fill.slice(1) : fill;
  return Number.parseInt(hex, 16);
}

/** Полоска HP в мире (WebGL), строго над `baseY` (верх тела по умолчанию). */
export function createWorldHpBarMesh(
  fillColor: string | number,
  baseY = ENTITY_BODY_HEIGHT + BAR_PAD_Y,
): WorldHpBarMeshHandle {
  const root = new THREE.Group();
  root.position.set(0, baseY, 0);

  const bgMat = new THREE.MeshBasicMaterial({ color: 0x0a0e12 });
  const fillMat = new THREE.MeshBasicMaterial({ color: parseFillColor(fillColor) });

  const bg = new THREE.Mesh(new THREE.BoxGeometry(BAR_W, 0.12, BAR_D), bgMat);
  root.add(bg);

  const fillGeo = new THREE.BoxGeometry(BAR_W * 0.9, 0.08, BAR_D * 0.85);
  fillGeo.translate((BAR_W * 0.9) / 2, 0, 0);
  const fillMesh = new THREE.Mesh(fillGeo, fillMat);
  fillMesh.position.set((-BAR_W * 0.9) / 2, 0.03, 0);
  root.add(fillMesh);

  return {
    root,
    setRatio(hp: number, maxHp: number) {
      const mx = Math.max(1, maxHp);
      const r = Math.max(0, Math.min(1, hp / mx));
      fillMesh.scale.x = r;
    },
  };
}
