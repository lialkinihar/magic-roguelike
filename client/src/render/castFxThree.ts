import * as THREE from "three";

import type { GameSnapshotCastEffect } from "@magic-roguelike/shared";

export function disposeCastFxGroup(root: THREE.Group): void {
  while (root.children.length > 0) {
    const ch = root.children[0]!;
    root.remove(ch);
    disposeObject3D(ch);
  }
}

function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((ch) => {
    if (ch instanceof THREE.Line || ch instanceof THREE.LineSegments) {
      ch.geometry.dispose();
      (ch.material as THREE.Material).dispose();
    } else if (ch instanceof THREE.Mesh) {
      ch.geometry.dispose();
      (ch.material as THREE.Material).dispose();
    }
  });
}

/** Пересобирает содержимое группы под текущий fx (короткий TTL — ок по перформансу). */
export function rebuildCastFxGroup(root: THREE.Group, fx: GameSnapshotCastEffect): void {
  while (root.children.length > 0) {
    const ch = root.children[0]!;
    root.remove(ch);
    disposeObject3D(ch);
  }

  const ratio = fx.maxTtlSec > 1e-6 ? Math.max(0, Math.min(1, fx.ttlSec / fx.maxTtlSec)) : 0;
  const pulse = 0.35 + ratio * 0.65;
  const y = 0.07;
  const vis = fx.visual;

  if (vis === "shard_beam" && fx.originX != null && fx.originZ != null) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(fx.originX, y, fx.originZ),
      new THREE.Vector3(fx.x, y, fx.z),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xa8dcff,
      transparent: true,
      opacity: 0.25 + pulse * 0.55,
      depthWrite: false,
    });
    root.add(new THREE.Line(geom, mat));
    const head = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.16, 18),
      new THREE.MeshBasicMaterial({
        color: 0xc8ecff,
        transparent: true,
        opacity: 0.4 + pulse * 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    head.rotation.x = -Math.PI / 2;
    head.position.set(fx.x, 0.03, fx.z);
    root.add(head);
    return;
  }

  if (vis === "lightning_chain" && fx.chainPath && fx.chainPath.length > 1) {
    const pts = fx.chainPath.map((p) => new THREE.Vector3(p.x, y, p.z));
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0xd8f0ff,
      transparent: true,
      opacity: 0.55 + pulse * 0.35,
      depthWrite: false,
    });
    root.add(new THREE.Line(geom, mat));
    for (const p of fx.chainPath) {
      const spark = new THREE.Mesh(
        new THREE.RingGeometry(0.06, 0.12 + ratio * 0.06, 12),
        new THREE.MeshBasicMaterial({
          color: 0xfff6c8,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      spark.rotation.x = -Math.PI / 2;
      spark.position.set(p.x, 0.04, p.z);
      root.add(spark);
    }
    return;
  }

  if (vis === "meteor_zone") {
    const outer = fx.radius + 0.12 * pulse;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.15, outer * 0.72), outer, 48),
      new THREE.MeshBasicMaterial({
        color: 0xff9a4d,
        transparent: true,
        opacity: 0.32 + pulse * 0.4,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(fx.x, 0.02, fx.z);
    root.add(ring);
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.06, fx.radius * 0.92, 40),
      new THREE.MeshBasicMaterial({
        color: 0xffcc88,
        transparent: true,
        opacity: 0.12 + pulse * 0.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(fx.x, 0.025, fx.z);
    root.add(glow);
    return;
  }

  if (vis === "nova_ring") {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.12, fx.radius * 0.55), fx.radius, 44),
      new THREE.MeshBasicMaterial({
        color: 0x8fe8ff,
        transparent: true,
        opacity: 0.28 + pulse * 0.45,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(fx.x, 0.03, fx.z);
    root.add(ring);
    return;
  }

  if (vis === "pull_field") {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.2, fx.radius * 0.5), fx.radius, 40),
      new THREE.MeshBasicMaterial({
        color: 0xc4a8ff,
        transparent: true,
        opacity: 0.18 + pulse * 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(fx.x, 0.03, fx.z);
    root.add(ring);
    return;
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(Math.max(0.2, fx.radius * 0.45), Math.max(0.35, fx.radius), 32),
    new THREE.MeshBasicMaterial({
      color: 0x89b6ff,
      transparent: true,
      opacity: 0.12 + pulse * 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(fx.x, 0.03, fx.z);
  root.add(ring);
}
