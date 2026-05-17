import * as THREE from "three";

import { ENTITY_BODY_HEIGHT, ENTITY_BODY_SIZE_XZ } from "./entityConstants";
import { createWorldHpBarMesh, type WorldHpBarMeshHandle } from "./worldHpBarMesh";

export { ENTITY_BODY_HEIGHT, ENTITY_BODY_SIZE_XZ } from "./entityConstants";

const BODY_HALF_Y = ENTITY_BODY_HEIGHT / 2;

export type EntityVisual = {
  root: THREE.Group;
  hpBar: WorldHpBarMeshHandle;
};

export function createSharedEntityBodyGeometry(): THREE.BoxGeometry {
  return new THREE.BoxGeometry(ENTITY_BODY_SIZE_XZ, ENTITY_BODY_HEIGHT, ENTITY_BODY_SIZE_XZ);
}

export function createEntityVisual(
  geometry: THREE.BoxGeometry,
  material: THREE.Material,
  hpFillRgb: string,
): EntityVisual {
  const root = new THREE.Group();
  root.rotation.set(0, 0, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = BODY_HALF_Y;
  mesh.rotation.set(0, 0, 0);
  root.add(mesh);

  const hpBar = createWorldHpBarMesh(hpFillRgb);
  root.add(hpBar.root);

  return { root, hpBar };
}

export function setEntityWorldPosition(root: THREE.Group, x: number, z: number): void {
  root.position.set(x, 0, z);
}
