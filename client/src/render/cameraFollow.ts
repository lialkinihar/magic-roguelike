import * as THREE from "three";

/** Радиус видимости на плоскости земли (y = 0) вокруг героя. */
export const CAMERA_GROUND_VISIBLE_RADIUS = 500;

const LOOK_Y = 0.25;
/** Соотношение высоты и отступа по Z — как у прежней камеры (1.38 / 1.62). */
const HEIGHT_TO_BACK = 1.38 / 1.62;

const _cam = new THREE.PerspectiveCamera(56, 1, 0.1, 20_000);
const _ray = new THREE.Raycaster();
const _ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();

function maxGroundRadiusFromPlayer(height: number, back: number, fovDeg: number, aspect: number): number {
  _cam.fov = fovDeg;
  _cam.aspect = aspect;
  _cam.updateProjectionMatrix();
  _cam.position.set(0, height, back);
  _cam.lookAt(0, LOOK_Y, 0);
  _cam.updateMatrixWorld();

  let maxR = 0;
  for (let ny = -1; ny <= 1; ny += 0.1) {
    for (let nx = -1; nx <= 1; nx += 0.1) {
      _ray.setFromCamera(new THREE.Vector2(nx, ny), _cam);
      if (_ray.ray.intersectPlane(_ground, _hit)) {
        maxR = Math.max(maxR, Math.hypot(_hit.x, _hit.z));
      }
    }
  }
  return maxR;
}

export type FollowCameraOffset = {
  height: number;
  back: number;
};

/**
 * Высота и отступ камеры по +Z от героя, чтобы на земле помещался круг ~`visibleRadius`.
 */
export function computeFollowCameraOffset(
  visibleRadius: number,
  fovDeg: number,
  aspect: number,
): FollowCameraOffset {
  const backUnit = 1.62;
  const heightUnit = backUnit * HEIGHT_TO_BACK;

  let lo = 0.01;
  let hi = 200;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const r = maxGroundRadiusFromPlayer(heightUnit * mid, backUnit * mid, fovDeg, aspect);
    if (r < visibleRadius) lo = mid;
    else hi = mid;
  }
  const scale = (lo + hi) / 2;
  return { height: heightUnit * scale, back: backUnit * scale };
}
