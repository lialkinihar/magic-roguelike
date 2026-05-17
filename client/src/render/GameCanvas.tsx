import { useEffect, useRef } from "react";
import * as THREE from "three";

import {
  ARENA_HALF,
  HUB_PLAYER_Z,
  WORLD_LAYOUT_SCALE,
  WORLD_PORTALS,
  WORLD_BLOCK_ZONES,
  WORLD_WALLS,
  getSkillGroundTargetMaxRange,
  type MonsterKind,
  type GameSnapshot,
} from "@magic-roguelike/shared";

import { setHudCastAimXZ } from "../game/hudCastAimXZ";
import { sendCastInvoked, sendInvoke, sendMoveTarget, sendRuneInput } from "../net/gameSocket";
import { useGameShellStore } from "../stores/gameShellStore";
import { disposeCastFxGroup, rebuildCastFxGroup } from "./castFxThree";
import { readCssColor } from "./readCssColor";
import { CAMERA_GROUND_VISIBLE_RADIUS, computeFollowCameraOffset } from "./cameraFollow";
import {
  createEntityVisual,
  createSharedEntityBodyGeometry,
  ENTITY_BODY_HEIGHT,
  setEntityWorldPosition,
  type EntityVisual,
} from "./entityVisual";
import { RenderTargetCompositor } from "./renderTargetCompositor";
import { createWorldHpBarMesh } from "./worldHpBarMesh";

/**
 * Изолированный Three.js: свой canvas, свой rAF; мир рисуется оффскрин в WebGLRenderTarget, затем блитится на экран.
 */
type GameCanvasProps = {
  movementEnabled: boolean;
};

export function GameCanvas({ movementEnabled }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<GameSnapshot | null>(useGameShellStore.getState().snapshot);
  const playerIdRef = useRef<string | null>(useGameShellStore.getState().playerId);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let disposed = false;

    try {
    const cw = Math.max(1, el.clientWidth);
    const ch = Math.max(1, el.clientHeight);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0x0a0d14, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    /** Большая арена + тёмные albedo без IBL — без подъёма экспозиции сцена читается как «чёрная дыра». */
    renderer.toneMappingExposure = 1.42;
    const pr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(cw, ch);
    el.appendChild(renderer.domElement);

    const compositor = new RenderTargetCompositor(renderer, renderer.domElement.width, renderer.domElement.height);

    const worldScene = new THREE.Scene();
    worldScene.background = new THREE.Color(readCssColor("--gl-bg", 0x0a0d14));

    const camFov = 56;
    let followOffset = computeFollowCameraOffset(CAMERA_GROUND_VISIBLE_RADIUS, camFov, cw / ch);
    const camFar = Math.max(800, followOffset.height + followOffset.back + CAMERA_GROUND_VISIBLE_RADIUS * 2);
    const cam = new THREE.PerspectiveCamera(camFov, cw / ch, 0.1, camFar);
    cam.position.set(0, followOffset.height, followOffset.back);
    cam.lookAt(0, 0, 0);

    const ambientHex = readCssColor("--gl-ambient", 0x3d4a62);
    const sunHex = readCssColor("--gl-sun", 0xc4b8a8);

    /** Визуальный масштаб маркеров (симуляция в метрах арены; без множителя кубик теряется на полу). */
    const vizScale = Math.min(6.5, Math.max(1.6, WORLD_LAYOUT_SCALE / 2.15));

    worldScene.add(new THREE.AmbientLight(ambientHex, 0.72));
    const hemi = new THREE.HemisphereLight(0xc8d6f0, 0x2a3544, 0.62);
    hemi.position.set(0, 1, 0);
    worldScene.add(hemi);
    const light = new THREE.DirectionalLight(sunHex, 2.35);
    light.position.set(ARENA_HALF * 0.45, ARENA_HALF * 1.35, ARENA_HALF * 0.55);
    light.target.position.set(0, 0, 0);
    worldScene.add(light);
    worldScene.add(light.target);

    const groundHex = readCssColor("--gl-ground", 0x1a232e);
    const cubeHex = readCssColor("--gl-cube", 0x5c6d8c);

    const groundSize = ARENA_HALF * 2;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize),
      new THREE.MeshStandardMaterial({
        color: groundHex,
        roughness: 0.92,
        metalness: 0,
        envMapIntensity: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    worldScene.add(ground);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x30384a,
      roughness: 0.85,
      metalness: 0.05,
    });
    const walls: THREE.Mesh[] = [];
    for (const wall of WORLD_WALLS) {
      const w = wall.maxX - wall.minX;
      const d = wall.maxZ - wall.minZ;
      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.85, d),
        wallMaterial,
      );
      wallMesh.position.set((wall.minX + wall.maxX) * 0.5, 0.425, (wall.minZ + wall.maxZ) * 0.5);
      walls.push(wallMesh);
      worldScene.add(wallMesh);
    }

    const riverMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b5f7f,
      roughness: 0.55,
      metalness: 0.1,
    });
    const rivers: THREE.Mesh[] = [];
    for (const zone of WORLD_BLOCK_ZONES) {
      const w = zone.maxX - zone.minX;
      const d = zone.maxZ - zone.minZ;
      const riverMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        riverMaterial,
      );
      riverMesh.rotation.x = -Math.PI / 2;
      riverMesh.position.set((zone.minX + zone.maxX) * 0.5, 0.01, (zone.minZ + zone.maxZ) * 0.5);
      rivers.push(riverMesh);
      worldScene.add(riverMesh);
    }

    const portalMaterial = new THREE.MeshStandardMaterial({
      color: 0x8865d8,
      roughness: 0.35,
      metalness: 0.2,
      transparent: true,
      opacity: 0.82,
    });
    const portalMeshes: THREE.Mesh[] = [];
    for (const portal of WORLD_PORTALS) {
      const portalMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 * vizScale, 0.36 * vizScale, 0.12 * vizScale, 20),
        portalMaterial,
      );
      portalMesh.position.set(portal.x, 0.06 * vizScale, portal.z);
      portalMeshes.push(portalMesh);
      worldScene.add(portalMesh);
    }

    const entityGeo = createSharedEntityBodyGeometry();
    const entityMat = new THREE.MeshStandardMaterial({
      color: cubeHex,
      metalness: 0.22,
      roughness: 0.62,
    });
    const heroVisual = createEntityVisual(entityGeo, entityMat, "#5db8a8");
    worldScene.add(heroVisual.root);

    const mechH = 0.54 * vizScale;
    const mechanismGroup = new THREE.Group();
    const mechanism = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42 * vizScale, 0.52 * vizScale, mechH, 18),
      new THREE.MeshStandardMaterial({
        color: 0x9a8ad2,
        roughness: 0.45,
        metalness: 0.28,
      }),
    );
    mechanism.position.y = mechH * 0.5;
    mechanismGroup.add(mechanism);
    const mechHpBar = createWorldHpBarMesh("#b8a6e8", mechH + 0.45);
    mechanismGroup.add(mechHpBar.root);
    worldScene.add(mechanismGroup);

    const monsterHpFill: Record<MonsterKind, string> = {
      melee: "#e07070",
      ranged: "#e89850",
      elite: "#c080ff",
    };
    const monsterVisuals = new Map<string, EntityVisual>();
    const castFxRoots = new Map<number, THREE.Group>();

    const heroLookY = ENTITY_BODY_HEIGHT * 0.5;

    let rafId = 0;

    snapshotRef.current = useGameShellStore.getState().snapshot;
    playerIdRef.current = useGameShellStore.getState().playerId;
    const unsub = useGameShellStore.subscribe((st) => {
      snapshotRef.current = st.snapshot;
      playerIdRef.current = st.playerId;
    });

    const resize = () => {
      const nextCw = Math.max(1, el.clientWidth);
      const nextCh = Math.max(1, el.clientHeight);
      renderer.setSize(nextCw, nextCh);
      const aspect = renderer.domElement.width / renderer.domElement.height;
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
      followOffset = computeFollowCameraOffset(CAMERA_GROUND_VISIBLE_RADIUS, camFov, aspect);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const aimPoint = new THREE.Vector3(0, 0, HUB_PLAYER_Z);

    const onContextMenu = (e: MouseEvent) => {
      if (!movementEnabled) return;
      e.preventDefault();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!movementEnabled || e.button !== 2) return;
      const ph = snapshotRef.current?.phase;
      if (ph !== "run_active") {
        useGameShellStore.getState().flashCombatHudHint(
          "ПКМ-движение доступно только в фазе забега — нажмите «Старт».",
        );
        e.preventDefault();
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cam);
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        aimPoint.copy(hitPoint);
        sendMoveTarget(hitPoint.x, hitPoint.z);
      }
      e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cam);
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        aimPoint.copy(hitPoint);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!movementEnabled || e.ctrlKey || e.metaKey || e.altKey) return;
      const ph = snapshotRef.current?.phase;
      const runOnly = () => {
        if (ph !== "run_active") {
          useGameShellStore.getState().flashCombatHudHint("Руны и каст — только в фазе забега («Старт»).");
          return false;
        }
        return true;
      };
      if (e.code === "KeyQ") {
        if (!runOnly()) return;
        sendRuneInput("q");
        e.preventDefault();
      } else if (e.code === "KeyW") {
        if (!runOnly()) return;
        sendRuneInput("w");
        e.preventDefault();
      } else if (e.code === "KeyE") {
        if (!runOnly()) return;
        sendRuneInput("e");
        e.preventDefault();
      } else if (e.code === "KeyR") {
        if (!runOnly()) return;
        sendInvoke();
        e.preventDefault();
      } else if (e.code === "Space") {
        if (!runOnly()) return;
        const snap = snapshotRef.current;
        const pid = playerIdRef.current;
        const hero = pid ? snap?.players?.find((p) => p.id === pid) : undefined;
        const sid = hero?.invokedSkillId;
        if (sid) {
          const maxR = getSkillGroundTargetMaxRange(sid);
          if (maxR != null && hero) {
            const dist = Math.hypot(aimPoint.x - hero.x, aimPoint.z - hero.z);
            if (dist > maxR + 0.08) {
              useGameShellStore
                .getState()
                .flashCombatHudHint(
                  `Указатель дальше дистанции луча (~${maxR.toFixed(1)}) — удар у конца луча.`,
                  2200,
                );
            }
          }
        }
        sendCastInvoked(aimPoint.x, aimPoint.z);
        e.preventDefault();
      }
    };
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    window.addEventListener("keydown", onKeyDown);

    const animate = () => {
      if (disposed) return;
      const snap = snapshotRef.current;
      const pid = playerIdRef.current;
      const hero = pid ? snap?.players?.find((p) => p.id === pid) : undefined;
      if (hero) {
        setEntityWorldPosition(heroVisual.root, hero.x, hero.z);
        heroVisual.root.visible = true;
        heroVisual.hpBar.setRatio(hero.hp, hero.maxHp);
      } else {
        heroVisual.root.visible = false;
      }
      if (snap?.mechanism) {
        mechanismGroup.position.set(snap.mechanism.x, 0, snap.mechanism.z);
        mechanismGroup.visible = true;
        mechHpBar.setRatio(snap.mechanism.hp, snap.mechanism.maxHp);
      } else {
        mechanismGroup.visible = false;
      }

      const seen = new Set<string>();
      for (const m of snap?.monsters ?? []) {
        let visual = monsterVisuals.get(m.id);
        if (!visual) {
          visual = createEntityVisual(entityGeo, entityMat, monsterHpFill[m.kind]);
          monsterVisuals.set(m.id, visual);
          worldScene.add(visual.root);
        }
        setEntityWorldPosition(visual.root, m.x, m.z);
        visual.root.visible = true;
        visual.hpBar.setRatio(m.hp, m.maxHp);
        seen.add(m.id);
      }
      for (const [id, visual] of monsterVisuals) {
        if (seen.has(id)) continue;
        worldScene.remove(visual.root);
        monsterVisuals.delete(id);
      }

      const activeFx = new Set<number>();
      for (const fx of snap?.castEffects ?? []) {
        let root = castFxRoots.get(fx.id);
        if (!root) {
          root = new THREE.Group();
          castFxRoots.set(fx.id, root);
          worldScene.add(root);
        }
        rebuildCastFxGroup(root, fx);
        activeFx.add(fx.id);
      }
      for (const [id, root] of castFxRoots) {
        if (activeFx.has(id)) continue;
        worldScene.remove(root);
        disposeCastFxGroup(root);
        castFxRoots.delete(id);
      }

      const tx = heroVisual.root.position.x;
      const tz = heroVisual.root.position.z;
      cam.position.set(tx, followOffset.height, tz + followOffset.back);
      cam.lookAt(tx, heroLookY, tz);

      setHudCastAimXZ(aimPoint.x, aimPoint.z);

      compositor.renderWorld(renderer, worldScene, cam);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      unsub();
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyDown);
      worldScene.clear();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      for (const wall of walls) wall.geometry.dispose();
      wallMaterial.dispose();
      for (const river of rivers) river.geometry.dispose();
      riverMaterial.dispose();
      for (const portal of portalMeshes) portal.geometry.dispose();
      portalMaterial.dispose();
      entityGeo.dispose();
      entityMat.dispose();
      mechanism.geometry.dispose();
      (mechanism.material as THREE.Material).dispose();
      monsterVisuals.clear();

      for (const root of castFxRoots.values()) {
        disposeCastFxGroup(root);
      }
      castFxRoots.clear();
      compositor.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
    } catch (err) {
      console.error("[GameCanvas] init failed", err);
      el.replaceChildren();
      const msg = document.createElement("p");
      msg.style.cssText =
        "margin:0;padding:24px;font:14px system-ui,sans-serif;color:#e8e2f5;background:#0a0d14;";
      msg.textContent =
        err instanceof Error ? `Ошибка 3D-сцены: ${err.message}` : "Ошибка 3D-сцены";
      el.appendChild(msg);
      return () => {
        disposed = true;
      };
    }
  }, [movementEnabled]);

  return <div ref={hostRef} className="game-canvas-host" />;
}
