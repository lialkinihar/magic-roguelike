import * as THREE from "three";

/**
 * Два прохода: мир рендерится в WebGLRenderTarget («оффскрин» в смысле GPU, не DOM),
 * затем текстура показывается на экранный canvas ортографическим fullscreen-quad.
 *
 * Так Three готовится к постэффектам, масштабированию внутреннего разрешения и т.п.
 * См. OffscreenCanvas + Worker — отдельный путь для вынесения GL в воркер; здесь только RT.
 */
export class RenderTargetCompositor {
  readonly target: THREE.WebGLRenderTarget;
  private readonly blitScene = new THREE.Scene();
  private readonly blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly blitMaterial: THREE.MeshBasicMaterial;

  constructor(_renderer: THREE.WebGLRenderer, initialPixelWidth: number, initialPixelHeight: number) {
    const pw = Math.max(1, initialPixelWidth);
    const ph = Math.max(1, initialPixelHeight);
    /** MSAA на RT + последующий sample из текстуры даёт чёрный кадр на части драйверов (особенно при блите). */
    const samples = 0;

    this.target = new THREE.WebGLRenderTarget(pw, ph, {
      depthBuffer: true,
      stencilBuffer: false,
      samples,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.SRGBColorSpace,
    });

    this.blitMaterial = new THREE.MeshBasicMaterial({
      map: this.target.texture,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const blitGeo = new THREE.PlaneGeometry(2, 2);
    const blitMesh = new THREE.Mesh(blitGeo, this.blitMaterial);
    blitMesh.frustumCulled = false;
    this.blitScene.add(blitMesh);
  }

  /** Синхронизировать размер RT с уже выставленным drawing buffer renderer'а */
  syncToRendererDrawingBuffer(renderer: THREE.WebGLRenderer) {
    const w = renderer.domElement.width;
    const h = renderer.domElement.height;
    const same = this.target.width === w && this.target.height === h;
    if (!same) this.target.setSize(w, h);
  }

  /**
   * Сначала сцена в target, затем блит на нулевой render target (экран).
   */
  renderWorld(renderer: THREE.WebGLRenderer, worldScene: THREE.Scene, worldCamera: THREE.Camera) {
    this.syncToRendererDrawingBuffer(renderer);
    renderer.setRenderTarget(this.target);
    renderer.render(worldScene, worldCamera);
    renderer.setRenderTarget(null);
    renderer.render(this.blitScene, this.blitCamera);
  }

  dispose() {
    this.target.dispose();
    const mesh = this.blitScene.children[0] as THREE.Mesh | undefined;
    const geo = mesh?.geometry as THREE.BufferGeometry | undefined;
    geo?.dispose();
    this.blitMaterial.dispose();
  }
}
