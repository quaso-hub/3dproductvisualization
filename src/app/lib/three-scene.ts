/**
 * three-scene.ts
 * ─────────────────────────────────────────────────────────────
 * Shared Three.js engine: setup renderer, camera, lights,
 * OrbitControls, annotation helpers, cleanup.
 *
 * Import this instead of copying boilerplate into every viewer.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Layer } from '../data/products';

// ─── Types ───────────────────────────────────────────────────

export interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
}

export interface SceneOptions {
  container: HTMLDivElement;
  cameraStart: [number, number, number];
  /** min orbit distance (default 150) */
  minDistance?: number;
  /** max orbit distance (default 1000) */
  maxDistance?: number;
}

// ─── Scene Bootstrap ─────────────────────────────────────────

export function createScene(opts: SceneOptions): SceneRefs {
  const { container, cameraStart, minDistance = 150, maxDistance = 1000 } = opts;

  // Read actual size — container must already be in the DOM with real dimensions
  const w = container.clientWidth  || 800;
  const h = container.clientHeight || 600;

  /* ── Scene ── */
  const scene = new THREE.Scene();
  scene.background = null;

  /* ── Camera ── */
  const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 10000);
  const [cx, cy, cz] = cameraStart;
  camera.position.set(cx, cy, cz);
  camera.lookAt(0, 0, 0);

  /* ── Renderer (print-quality) ── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Canvas fills the container via CSS
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width   = '100%';
  canvas.style.height  = '100%';
  container.appendChild(canvas);

  /* ── OrbitControls ── */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.maxPolarAngle = Math.PI;

  /* ── ResizeObserver: sync renderer + camera to container size ── */
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width < 1 || height < 1) continue;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  });
  ro.observe(container);
  (renderer as THREE.WebGLRenderer & { _ro?: ResizeObserver })._ro = ro;

  /* ── 4-Point Catalog Lighting ── */
  addCatalogLights(scene);

  return { scene, camera, renderer, controls };
}

/** Standard 4-point medical catalog lighting. */
function addCatalogLights(scene: THREE.Scene) {
  // Ambient — base fill
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  // Key light — top-front with shadow
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(150, 350, 250);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 1500;
  key.shadow.camera.left = -300;
  key.shadow.camera.right = 300;
  key.shadow.camera.top = 400;
  key.shadow.camera.bottom = -400;
  key.shadow.bias = -0.0001;
  scene.add(key);

  // Fill — cool from left
  const fill = new THREE.DirectionalLight(0xe8f4ff, 1.0);
  fill.position.set(-200, 150, 100);
  scene.add(fill);

  // Rim — warm from back-right
  const rim = new THREE.DirectionalLight(0xfff8e8, 0.6);
  rim.position.set(200, 100, -150);
  scene.add(rim);

  // Top soft
  const top = new THREE.DirectionalLight(0xffffff, 0.4);
  top.position.set(0, 500, 0);
  scene.add(top);
}

// ─── Render Loop ─────────────────────────────────────────────

export function startRenderLoop(refs: SceneRefs): () => void {
  const { renderer, scene, camera, controls } = refs;
  let frameId: number;
  const tick = () => {
    frameId = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  };
  tick();
  return () => cancelAnimationFrame(frameId);
}

// ─── Cleanup ─────────────────────────────────────────────────

export function disposeScene(refs: SceneRefs, container: HTMLDivElement) {
  (refs.renderer as THREE.WebGLRenderer & { _ro?: ResizeObserver })._ro?.disconnect();
  refs.controls.dispose();
  refs.renderer.dispose();
  if (refs.renderer.domElement.parentNode === container) {
    container.removeChild(refs.renderer.domElement);
  }
}

// ─── Camera helpers ──────────────────────────────────────────

export function applyCameraPreset(
  refs: SceneRefs,
  position: [number, number, number],
  target: [number, number, number],
) {
  const [px, py, pz] = position;
  const [tx, ty, tz] = target;
  refs.camera.position.set(px, py, pz);
  refs.controls.target.set(tx, ty, tz);
  refs.controls.update();
}

// ─── Geometry helpers ────────────────────────────────────────

/** Scale real mm thickness for visual rendering.
 *  Very thin layers (coatings, foils) are invisible without scaling. */
export function visualThickness(layer: Pick<Layer, 'thickness'>): number {
  if (layer.thickness < 1) return layer.thickness * 20; // coatings / foil
  if (layer.thickness < 5) return layer.thickness * 8;  // lead, thin sheets
  return layer.thickness;                                // normal — no scale
}

/** Standard PBR layer mesh + subtle edge lines, returned as a Group. */
export function buildLayerMesh(
  layer: Layer,
  w: number,
  h: number,
  t: number,
): THREE.Group {
  const group = new THREE.Group();

  const geo = new THREE.BoxGeometry(w, h, t);

  const mat = new THREE.MeshStandardMaterial({
    color: layer.color,
    roughness: layer.roughness,
    metalness: layer.metalness,
    side: THREE.DoubleSide,
    envMapIntensity: 1.0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Subtle edge definition
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.15, transparent: true });
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));

  return group;
}

// ─── Annotation helpers ──────────────────────────────────────

/**
 * Canvas-based text sprite — large & bold for print quality.
 * depthTest: false — always visible, never occluded by meshes.
 * scaleFactor: world-units width of the sprite (default 90).
 */
export function createAnnotationSprite(text: string, scaleFactor = 90): THREE.Sprite {
  const CW = 850, CH = 180;
  const canvas = document.createElement('canvas');
  canvas.width  = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d')!;

  // White pill background
  const rx = 18; // corner radius
  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.beginPath();
  ctx.moveTo(rx, 0);
  ctx.lineTo(CW - rx, 0);
  ctx.quadraticCurveTo(CW, 0, CW, rx);
  ctx.lineTo(CW, CH - rx);
  ctx.quadraticCurveTo(CW, CH, CW - rx, CH);
  ctx.lineTo(rx, CH);
  ctx.quadraticCurveTo(0, CH, 0, CH - rx);
  ctx.lineTo(0, rx);
  ctx.quadraticCurveTo(0, 0, rx, 0);
  ctx.closePath();
  ctx.fill();

  // Thin border
  ctx.strokeStyle = 'rgba(30,60,120,0.35)';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Bold text — minimum 60px per guide
  ctx.fillStyle = '#1a2e50';
  ctx.font = 'bold 68px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, CW / 2, CH / 2);

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,   // CRITICAL: never occluded
      depthWrite: false,
      transparent: true,
      sizeAttenuation: true,
    }),
  );
  // Aspect = CW/CH = 850/180 ≈ 4.7
  sprite.scale.set(scaleFactor, scaleFactor * (CH / CW), 1);
  return sprite;
}

/** Small filled circle dot at annotation anchor point. */
export function createAnnotationDot(pos: THREE.Vector3): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x1a3a6e, depthTest: false }),
  );
  mesh.position.copy(pos);
  mesh.renderOrder = 999;
  return mesh;
}

/** Straight leader line from anchor to label tip. */
export function createAnnotationLine(
  from: THREE.Vector3,
  to:   THREE.Vector3,
): THREE.Line {
  const mat = new THREE.LineBasicMaterial({
    color: 0x1a3a6e,
    linewidth: 2,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.85,
  });
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from, to]),
    mat,
  );
  line.renderOrder = 998;
  return line;
}

/**
 * All-in-one annotation: dot at `anchor`, elbow leader line to `labelPos`,
 * sprite centred at `labelPos`.
 * The elbow line goes: anchor → elbowX → labelPos (orthogonal leader).
 */
export function createAnnotationFull(
  scene: THREE.Scene,
  anchor: THREE.Vector3,
  labelPos: THREE.Vector3,
  text: string,
  spriteScale = 90,
): void {
  // Elbow point: same Y as labelPos, same X as anchor
  const elbow = new THREE.Vector3(anchor.x, labelPos.y, anchor.z);

  scene.add(createAnnotationDot(anchor));
  scene.add(createAnnotationLine(anchor, elbow));
  scene.add(createAnnotationLine(elbow, labelPos));

  const sprite = createAnnotationSprite(text, spriteScale);
  // Place sprite so its LEFT edge touches labelPos
  const halfW = sprite.scale.x / 2;
  sprite.position.set(labelPos.x + halfW, labelPos.y, labelPos.z);
  scene.add(sprite);
}

// ─── Download helpers ────────────────────────────────────────

export function downloadPNG(renderer: THREE.WebGLRenderer, filename: string) {
  const link = document.createElement('a');
  link.href = renderer.domElement.toDataURL('image/png');
  link.download = filename;
  link.click();
}
