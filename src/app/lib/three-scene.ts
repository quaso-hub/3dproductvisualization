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
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Layer } from '../data/products';

// ─── Types ───────────────────────────────────────────────────

export interface SceneRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  labelRenderer: CSS2DRenderer;
}

export interface SceneOptions {
  container: HTMLDivElement;
  cameraStart: [number, number, number];
  /** min orbit distance (default 150) */
  minDistance?: number;
  /** max orbit distance (default 1000) */
  maxDistance?: number;
  /** Enable renderer.localClippingEnabled for material clipping planes (default false) */
  localClippingEnabled?: boolean;
  /** Skip default 4-point catalog lights — caller will add custom lighting (default false) */
  skipDefaultLights?: boolean;
}

// ─── Scene Bootstrap ─────────────────────────────────────────

export function createScene(opts: SceneOptions): SceneRefs {
  const { container, cameraStart, minDistance = 150, maxDistance = 1000, localClippingEnabled = false, skipDefaultLights = false } = opts;

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
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  if (localClippingEnabled) renderer.localClippingEnabled = true;

  // Canvas fills the container via CSS
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width   = '100%';
  canvas.style.height  = '100%';
  container.style.position = 'relative';
  container.appendChild(canvas);

  /* ── CSS2DRenderer overlay for dynamic labels ── */
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(w, h);
  Object.assign(labelRenderer.domElement.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    pointerEvents: 'none',
    overflow: 'hidden',
  });
  container.appendChild(labelRenderer.domElement);

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
      labelRenderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  });
  ro.observe(container);
  (renderer as THREE.WebGLRenderer & { _ro?: ResizeObserver })._ro = ro;

  /* ── 4-Point Catalog Lighting ── */
  if (!skipDefaultLights) addCatalogLights(scene);

  return { scene, camera, renderer, controls, labelRenderer };
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

export function startRenderLoop(
  refs: SceneRefs,
  onTick?: () => void,
): () => void {
  const { renderer, labelRenderer, scene, camera, controls } = refs;
  let frameId: number;
  const tick = () => {
    frameId = requestAnimationFrame(tick);
    controls.update();
    onTick?.();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
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
  if (refs.labelRenderer.domElement.parentNode === container) {
    container.removeChild(refs.labelRenderer.domElement);
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

// ─── Annotation helpers (CSS2DRenderer-based) ────────────────

/**
 * CSS2DObject label — clean, compact, always faces camera.
 * Uses individual font-* properties (NOT shorthand) to prevent
 * italic/bold inheritance from parent elements.
 */
export function createLabel(
  scene: THREE.Scene,
  position: THREE.Vector3,
  text: string,
): CSS2DObject {
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'background:rgba(255,255,255,0.84)',
    'backdrop-filter:blur(6px)',
    '-webkit-backdrop-filter:blur(6px)',
    'border:1px solid rgba(0,0,0,0.06)',
    'border-radius:4px',
    'padding:2px 8px',
    'font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif',
    'font-size:10px',
    'font-weight:400',
    'font-style:normal',
    'line-height:1.4',
    'letter-spacing:0.01em',
    'color:#334155',
    'white-space:nowrap',
    'pointer-events:none',
    'user-select:none',
  ].join(';');
  wrap.textContent = text;
  const obj = new CSS2DObject(wrap);
  obj.position.copy(position);
  scene.add(obj);
  return obj;
}

/**
 * Single-segment leader line — always rendered on top of all geometry.
 * depthTest:false + renderOrder:998 prevents clipping through meshes.
 */
export function createAnnotationLine(
  scene: THREE.Scene,
  from: THREE.Vector3,
  to: THREE.Vector3,
): void {
  const mat = new THREE.LineBasicMaterial({
    color: 0x94a3b8,
    opacity: 0.7,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, mat);
  line.renderOrder = 998;
  scene.add(line);
}

/** Small filled dot at the annotation anchor — always on top. */
export function createAnnotationDot(pos: THREE.Vector3): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6, depthTest: false, depthWrite: false }),
  );
  mesh.position.copy(pos);
  mesh.renderOrder = 999;
  return mesh;
}

/**
 * Full annotation set: scatter anchors + labels at a clean label column.
 *
 * For each item:
 *   anchor  = exact 3D point on the geometry (dot goes here)
 *   labelX  = world X of the label column (all labels share this X)
 *   labelZ  = world Z of the label (usually same as anchor.z or explicit)
 *
 * Labels are evenly distributed in Y over the geometry's height range,
 * sorted by anchor.y so the tallest anchor → top label.
 * A two-segment elbow line (anchor → knee → label) keeps lines clean
 * from any camera angle — the vertical segment is always visible.
 *
 * @param items    Array of { anchor, label, labelZ? }
 * @param labelX   World X of the label column
 * @param yRange   [yMin, yMax] — spread labels across this Y span
 * @param scene    THREE.Scene to add objects to
 */
export function placeAnnotations(
  scene: THREE.Scene,
  items: Array<{ anchor: THREE.Vector3; label: string; labelZ?: number }>,
  labelX: number,
  yRange: [number, number],
): void {
  if (items.length === 0) return;

  // Sort by anchor Y — top anchors get top labels
  const sorted = [...items].sort((a, b) => b.anchor.y - a.anchor.y);
  const n = sorted.length;
  const [yMin, yMax] = yRange;
  const span = yMax - yMin;

  // Compute initial evenly-distributed Y positions
  const labelYs: number[] = sorted.map((_, i) =>
    n === 1 ? (yMin + yMax) / 2 : yMax - (i / (n - 1)) * span,
  );

  // Enforce minimum gap between adjacent labels (prevents crowding)
  const MIN_GAP = Math.max(8, span / (n + 2));
  // Bottom-up pass: push overlapping labels downward
  for (let i = 1; i < n; i++) {
    if (labelYs[i - 1] - labelYs[i] < MIN_GAP) {
      labelYs[i] = labelYs[i - 1] - MIN_GAP;
    }
  }
  // Top-down pass: push back upward if pushed below yMin
  for (let i = n - 2; i >= 0; i--) {
    if (labelYs[i] - labelYs[i + 1] < MIN_GAP) {
      labelYs[i] = labelYs[i + 1] + MIN_GAP;
    }
  }

  sorted.forEach(({ anchor, label, labelZ }, i) => {
    const labelY = labelYs[i];

    const lz = labelZ ?? anchor.z;
    const labelPos = new THREE.Vector3(labelX, labelY, lz);

    // Elbow knee: same X as anchor, same Y as label
    const knee = new THREE.Vector3(labelX - 12, labelY, lz);

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      opacity: 0.65,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    // Segment 1: anchor dot → knee (diagonal)
    const seg1 = new THREE.BufferGeometry().setFromPoints([anchor, knee]);
    const l1 = new THREE.Line(seg1, lineMat);
    l1.renderOrder = 998;
    scene.add(l1);

    // Segment 2: knee → label position (horizontal, clean)
    const seg2 = new THREE.BufferGeometry().setFromPoints([knee, labelPos]);
    const l2 = new THREE.Line(seg2, lineMat);
    l2.renderOrder = 998;
    scene.add(l2);

    // Dot at anchor
    scene.add(createAnnotationDot(anchor));

    // Label at column position
    createLabel(scene, labelPos, label);
  });
}

/**
 * Spread annotation label Y positions so no two labels are closer
 * than `minSpacing` units. Mutates labelPos.y in-place.
 * Used for simple (non-elbow) annotation layouts.
 */
export function spreadAnnotationLabels(
  items: Array<{ anchor: THREE.Vector3; labelPos: THREE.Vector3 }>,
  minSpacing = 18,
): void {
  if (items.length < 2) return;
  items.sort((a, b) => a.labelPos.y - b.labelPos.y);
  for (let i = 1; i < items.length; i++) {
    if (items[i].labelPos.y - items[i - 1].labelPos.y < minSpacing)
      items[i].labelPos.y = items[i - 1].labelPos.y + minSpacing;
  }
  for (let i = items.length - 2; i >= 0; i--) {
    if (items[i + 1].labelPos.y - items[i].labelPos.y < minSpacing)
      items[i].labelPos.y = items[i + 1].labelPos.y - minSpacing;
  }
}

// ─── Download helpers ────────────────────────────────────────

export function downloadPNG(renderer: THREE.WebGLRenderer, filename: string) {
  const link = document.createElement('a');
  link.href = renderer.domElement.toDataURL('image/png');
  link.download = filename;
  link.click();
}
