/** Точка каста в XZ синхронизируется канвасом без ре-рендера HUD. */
export const hudCastAimXZ = { x: 0, z: 0 };

export function setHudCastAimXZ(x: number, z: number): void {
  hudCastAimXZ.x = x;
  hudCastAimXZ.z = z;
}
