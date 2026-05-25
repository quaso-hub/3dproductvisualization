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
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { Layer } from '../data/products';
import { isSharedMaterial } from './materials';

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
  /** Set scene.background color (hex number). Undefined = transparent (null). */
  sceneBackground?: number;
  /** Camera FOV override (default 35) */
  fov?: number;
  /** Camera target for initial lookAt (default [0,0,0]) */
  cameraTarget?: [number, number, number];
}

// ─── Scene Bootstrap ─────────────────────────────────────────

export function createScene(opts: SceneOptions): SceneRefs {
  const { container, cameraStart, minDistance = 150, maxDistance = 1000, localClippingEnabled = false, skipDefaultLights = false, sceneBackground, fov = 35, cameraTarget } = opts;

  // Read actual size — container must already be in the DOM with real dimensions
  const w = container.clientWidth  || 800;
  const h = container.clientHeight || 600;

  /* ── Scene ── */
  const scene = new THREE.Scene();
  // Default background: light grey white untuk visibility
  scene.background = sceneBackground !== undefined ? new THREE.Color(sceneBackground) : new THREE.Color(0xf5f7fa);

  /* ── Camera ── */
  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 10000);
  const [cx, cy, cz] = cameraStart;
  camera.position.set(cx, cy, cz);
  if (cameraTarget) camera.lookAt(...cameraTarget);
  else camera.lookAt(0, 0, 0);

  /* ── Renderer (print-quality with enhanced AA) ── */
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true, 
    preserveDrawingBuffer: true, 
    powerPreference: 'high-performance',
    stencil: false, // Performance: disable stencil buffer if not needed
  });
  
  // Limit pixel ratio for performance — cap lebih ketat di mobile (1.5x)
  // dibanding desktop (2x). Tanpa ini high-DPI mobile akan render 4x pixel
  // dan bottleneck di GPU saat switch product.
  const isMobile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h);

  // Enhanced shadow mapping — gate via memory (low-end mobile = no shadows)
  const lowMem = typeof navigator !== 'undefined' && (navigator as Navigator & { deviceMemory?: number }).deviceMemory != null && (navigator as Navigator & { deviceMemory?: number }).deviceMemory! < 4;
  renderer.shadowMap.enabled = !lowMem;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // GAME-DEV TRICK (Genshin Impact pattern, research 2026-05-22):
  // Static product viewer = render shadow once, reuse forever.
  // Saves 1.3-1.7ms per frame vs autoUpdate=true.
  // Trigger ulang: renderer.shadowMap.needsUpdate = true setelah geometry change.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true; // initial render
  
  // Color space and tone mapping
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  
  // Performance hints
  renderer.info.autoReset = false; // Manual reset for debugging
  
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

/** Professional 4-point medical catalog lighting with soft shadows.
 *
 * SHADOW DISCIPLINE (Session 8.5 — game-dev technique from Genshin Impact):
 * `shadowMap.autoUpdate = false` is set on the renderer in createScene().
 * Light shadows render once at scene init, then only re-render on demand.
 * Trigger via `refs.renderer.shadowMap.needsUpdate = true` after geometry change.
 * Single biggest performance win for static product viewers.
 */
function addCatalogLights(scene: THREE.Scene) {
  // Ambient — soft base fill
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  // Hemisphere light for natural sky/ground bounce
  const hemi = new THREE.HemisphereLight(0xf0f8ff, 0xe8e4e0, 0.3);
  scene.add(hemi);

  // Key light — top-front with high-quality soft shadow
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(150, 350, 250);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 1500;
  key.shadow.camera.left = -300;
  key.shadow.camera.right = 300;
  key.shadow.camera.top = 400;
  key.shadow.camera.bottom = -400;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.04;
  key.shadow.radius = 4;
  // Per-light autoUpdate also off for safety
  key.shadow.autoUpdate = false;
  key.shadow.needsUpdate = true;
  scene.add(key);

  // Fill — cool from left side
  const fill = new THREE.DirectionalLight(0xe8f4ff, 0.9);
  fill.position.set(-200, 150, 100);
  scene.add(fill);

  // Rim — warm from back-right for edge definition
  const rim = new THREE.DirectionalLight(0xfff8e8, 0.5);
  rim.position.set(200, 100, -150);
  scene.add(rim);

  // Top soft fill
  const top = new THREE.DirectionalLight(0xffffff, 0.3);
  top.position.set(0, 500, 0);
  scene.add(top);

  // Front fill (subtle) for medical equipment detail
  const frontFill = new THREE.DirectionalLight(0xffffff, 0.2);
  frontFill.position.set(0, 50, 300);
  scene.add(frontFill);
}

// ─── Render Loop ─────────────────────────────────────────────

/**
 * On-demand render loop (2026 SOTA) — only renders when something changed.
 * Saves significant battery + GPU on technical viewers where 90% of user
 * time is staring at a static model.
 *
 * Triggers re-render on:
 *   - OrbitControls movement (damping resolves)
 *   - Window resize
 *   - External `invalidate()` call (returned from this fn)
 *
 * If onTick returns true (animation work was done), keeps rendering.
 */
export function startRenderLoop(
  refs: SceneRefs,
  onTick?: () => boolean | void,
): { stop: () => void; invalidate: () => void } {
  const { renderer, labelRenderer, scene, camera, controls } = refs;
  let frameId: number;
  let invalidated = 2; // render initial frames

  const invalidate = () => {
    invalidated = 2;
  };

  const onChange = () => invalidate();
  controls.addEventListener('change', onChange);
  window.addEventListener('resize', onChange);

  const tick = () => {
    frameId = requestAnimationFrame(tick);
    const moving = controls.update();
    const tickWantsRender = onTick?.() === true;
    if (moving || invalidated > 0 || tickWantsRender) {
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      if (invalidated > 0) invalidated--;
    }
  };
  tick();

  return {
    stop: () => {
      cancelAnimationFrame(frameId);
      controls.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    },
    invalidate,
  };
}

// ─── Cleanup ─────────────────────────────────────────────────

/**
 * Dispose scene properly — traverse and free GPU memory.
 * Without this, switching products leaks ~hundreds of geometries +
 * materials + shadow maps per switch → visible freeze + memory bloat.
 */
export function disposeScene(refs: SceneRefs, container: HTMLDivElement) {
  // Disconnect ResizeObserver
  (refs.renderer as THREE.WebGLRenderer & { _ro?: ResizeObserver })._ro?.disconnect();

  // Traverse scene and dispose all geometry + material + textures
  refs.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach((m) => {
        // B2 fix: skip shared singleton materials from `lib/materials.ts`.
        // Without this guard, every viewer unmount would dispose the cache,
        // causing "Cannot read properties of disposed material" on the next
        // viewer that uses the same material recipe.
        if (isSharedMaterial(m)) return;
        // Dispose textures held by per-scene material
        for (const key of Object.keys(m) as (keyof THREE.Material)[]) {
          const value = (m as unknown as Record<string, unknown>)[key];
          if (value && (value as { isTexture?: boolean }).isTexture) {
            (value as THREE.Texture).dispose();
          }
        }
        m.dispose();
      });
    }
    // Light shadow map texture
    const light = obj as THREE.Light & { shadow?: { map?: { dispose?: () => void } } };
    if (light.shadow?.map?.dispose) light.shadow.map.dispose();
  });

  // Dispose scene environment texture if any
  if (refs.scene.environment) {
    refs.scene.environment.dispose();
    refs.scene.environment = null;
  }

  refs.controls.dispose();
  refs.renderer.dispose();
  refs.renderer.forceContextLoss();

  if (refs.renderer.domElement.parentNode === container) {
    container.removeChild(refs.renderer.domElement);
  }
  if (refs.labelRenderer.domElement.parentNode === container) {
    container.removeChild(refs.labelRenderer.domElement);
  }
}

// --- Camera helpers -------------------------------------------------------

/** Apply preset instantly (for initial setup). */
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

/** Smooth animated camera transition (for mode/view switches). */
export function animateCameraTo(
  refs: SceneRefs,
  position: [number, number, number],
  target: [number, number, number],
  duration: number = 800,
): Promise<void> {
  return new Promise((resolve) => {
    const [px, py, pz] = position;
    const [tx, ty, tz] = target;
    
    const startPos = refs.camera.position.clone();
    const startTarget = refs.controls.target.clone();
    const endPos = new THREE.Vector3(px, py, pz);
    const endTarget = new THREE.Vector3(tx, ty, tz);
    
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      
      refs.camera.position.lerpVectors(startPos, endPos, eased);
      refs.controls.target.lerpVectors(startTarget, endTarget, eased);
      refs.controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };
    
    animate();
  });
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
 *
 * @param partId  Optional ID linking this label to a 3D mesh's
 *                `userData.partId` for bidirectional highlight sync
 *                (see lib/highlight-controller.ts).
 */
export function createLabel(
  scene: THREE.Scene,
  position: THREE.Vector3,
  text: string,
  partId?: string,
): CSS2DObject {
  const wrap = document.createElement('div');
  // MONO THEME: Monospace font, zero radius, monochrome
  wrap.style.cssText = [
    'background:rgba(255,255,255,0.92)',
    'border:1px solid rgba(0,0,0,0.12)',
    'border-radius:0',
    'padding:3px 10px',
    'font-family:"JetBrains Mono",ui-monospace,"SF Mono",monospace',
    'font-size:10px',
    'font-weight:500',
    'font-style:normal',
    'line-height:1.4',
    'letter-spacing:0.02em',
    'color:#1a1a1a',
    'text-transform:uppercase',
    'white-space:nowrap',
    'pointer-events:none',
    'user-select:none',
  ].join(';');
  wrap.textContent = text;
  if (partId) {
    wrap.dataset.partId = partId;
    wrap.classList.add('viz-label');
  }
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
  items: Array<{ anchor: THREE.Vector3; label: string; labelZ?: number; partId?: string }>,
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

  sorted.forEach(({ anchor, label, labelZ, partId }, i) => {
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

    // Label at column position (with optional partId for highlight sync)
    createLabel(scene, labelPos, label, partId);
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

// ============================================================
// HVAC GLB MODEL TYPES
// ============================================================

export interface GLTFLoadResult {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  dispose: () => void;
}

export interface GLBLoadOptions {
  position?: THREE.Vector3Like;
  rotation?: THREE.Euler;
  scale?: number | THREE.Vector3Like;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onProgress?: (event: ProgressEvent) => void;
}

export interface DuctSegmentOptions {
  color?: number;
  opacity?: number;
  roughness?: number;
  metalness?: number;
}

export interface PipeOptions extends DuctSegmentOptions {
  radius: number;
  insulationRadius?: number;
  insulationColor?: number;
}

// ============================================================
// GLTF / GLB MODEL LOADER — Untuk HVAC System BIM
// ============================================================

let _gltfLoader: GLTFLoader | null = null;

function getGLTFLoader(): GLTFLoader {
  if (_gltfLoader) return _gltfLoader;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
  );
  dracoLoader.setDecoderConfig({ type: 'wasm' });

  _gltfLoader = new GLTFLoader();
  _gltfLoader.setDRACOLoader(dracoLoader);
  return _gltfLoader;
}

export async function loadGLTFModel(
  url: string,
  scene: THREE.Scene,
  options: GLBLoadOptions = {}
): Promise<GLTFLoadResult> {
  const {
    position,
    rotation,
    scale = 1,
    castShadow = true,
    receiveShadow = true,
    onProgress,
  } = options;

  const loader = getGLTFLoader();

  return new Promise<GLTFLoadResult>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        if (position) model.position.set(position.x, position.y, position.z);
        if (rotation) model.rotation.copy(rotation);

        if (typeof scale === 'number') {
          model.scale.setScalar(scale);
        } else {
          model.scale.set(scale.x, scale.y, scale.z);
        }

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = castShadow;
            mesh.receiveShadow = receiveShadow;

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(fixGLBMaterial);
            } else if (mesh.material) {
              fixGLBMaterial(mesh.material as THREE.MeshStandardMaterial);
            }
          }
        });

        scene.add(model);

        const dispose = () => {
          scene.remove(model);
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.geometry.dispose();
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m) => m.dispose());
              } else {
                (mesh.material as THREE.Material).dispose();
              }
            }
          });
        };

        resolve({ scene: model, animations: gltf.animations, dispose });
      },
      onProgress,
      (error) => reject(new Error(`GLB load failed: ${url} — ${error}`))
    );
  });
}

function fixGLBMaterial(mat: THREE.MeshStandardMaterial): void {
  if (!mat) return;
  if (!mat.transparent) {
    mat.side = THREE.FrontSide;
  }
  mat.shadowSide = THREE.BackSide;
}

export async function loadGLTFModelWithFallback(
  url: string,
  scene: THREE.Scene,
  options: GLBLoadOptions & {
    fallbackSize?: THREE.Vector3Like;
    fallbackLabel?: string;
    fallbackColor?: number;
  } = {}
): Promise<GLTFLoadResult | null> {
  const {
    fallbackSize = { x: 1, y: 1, z: 1 },
    fallbackLabel = 'Model Loading...',
    fallbackColor = 0x888888,
    ...loadOptions
  } = options;

  try {
    return await loadGLTFModel(url, scene, loadOptions);
  } catch (err) {
    console.warn(`[HVAC] GLB not found: ${url}. Using placeholder.`, err);

    const geo = new THREE.BoxGeometry(
      fallbackSize.x, fallbackSize.y, fallbackSize.z
    );
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: fallbackColor, linewidth: 1 });
    const wireframe = new THREE.LineSegments(edges, mat);

    if (loadOptions.position) {
      wireframe.position.set(
        loadOptions.position.x,
        loadOptions.position.y,
        loadOptions.position.z
      );
    }

    const solidMat = new THREE.MeshStandardMaterial({
      color: fallbackColor,
      transparent: true,
      opacity: 0.15,
      roughness: 0.8,
    });
    const solidMesh = new THREE.Mesh(geo.clone(), solidMat);
    if (loadOptions.position) {
      solidMesh.position.copy(wireframe.position);
    }

    const group = new THREE.Group();
    group.add(wireframe, solidMesh);
    scene.add(group);

    console.info(`[HVAC Placeholder] ${fallbackLabel} at ${url}`);

    return {
      scene: group,
      animations: [],
      dispose: () => {
        scene.remove(group);
        geo.dispose();
        edges.dispose();
        mat.dispose();
        solidMat.dispose();
      },
    };
  }
}

// ============================================================
// SMOOTH GEOMETRY BUILDERS — Untuk HVAC Ducting & Piping
// ============================================================

export function createSmoothRectDuct(
  path: THREE.Vector3[],
  w: number,
  h: number,
  options: DuctSegmentOptions = {}
): THREE.Mesh {
  const {
    color = 0x00bcd4,
    opacity = 1.0,
    roughness = 0.6,
    metalness = 0.1,
  } = options;

  const r = Math.min(w, h) * 0.08;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.5);
  const steps = Math.max(path.length * 6, 20);

  const geo = new THREE.ExtrudeGeometry(shape, {
    extrudePath: curve,
    steps,
    bevelEnabled: false,
  });

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createSmoothPipe(
  path: THREE.Vector3[],
  options: PipeOptions
): THREE.Group {
  const {
    radius,
    insulationRadius,
    color = 0xb87333,
    insulationColor = 0x1a1a1a,
    opacity = 1.0,
    roughness = 0.3,
    metalness = 0.7,
  } = options;

  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.5);
  const tubularSegments = Math.max(path.length * 8, 32);
  const radialSegments = 8;

  const pipeGeo = new THREE.TubeGeometry(
    curve, tubularSegments, radius, radialSegments, false
  );
  const pipeMat = new THREE.MeshStandardMaterial({
    color, roughness, metalness,
    transparent: opacity < 1, opacity,
  });
  const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
  pipeMesh.castShadow = true;
  group.add(pipeMesh);

  if (insulationRadius && insulationRadius > radius) {
    const insulGeo = new THREE.TubeGeometry(
      curve, tubularSegments, insulationRadius, radialSegments, false
    );
    const insulMat = new THREE.MeshStandardMaterial({
      color: insulationColor,
      roughness: 0.85,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
      side: THREE.BackSide,
    });
    group.add(new THREE.Mesh(insulGeo, insulMat));

    const insulOuterMat = insulMat.clone();
    insulOuterMat.side = THREE.FrontSide;
    insulOuterMat.opacity = 0.92;
    group.add(new THREE.Mesh(insulGeo.clone(), insulOuterMat));
  }

  return group;
}

export function createTurningVanes(
  elbowCenter: THREE.Vector3,
  normal: THREE.Vector3,
  ductW: number,
  ductH: number,
  count = 3
): THREE.Group {
  const group = new THREE.Group();
  const vaneColor = 0xb0b8c1;

  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    const radius = ductW * 0.3 * (0.5 + t);

    const curve = new THREE.ArcCurve(0, 0, radius, -Math.PI / 2, 0, false);
    const pts = curve.getPoints(16);
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y)));

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: ductH,
      bevelEnabled: false,
    });
    const mat = new THREE.MeshStandardMaterial({
      color: vaneColor, roughness: 0.5, metalness: 0.6,
      side: THREE.DoubleSide,
    });
    const vane = new THREE.Mesh(geo, mat);
    vane.position.copy(elbowCenter);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.normalize());
    vane.quaternion.copy(quaternion);

    group.add(vane);
  }

  return group;
}

export function createVibrationIsolator(
  position: THREE.Vector3,
  radius = 0.05,
  height = 0.08
): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(position);

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7 });
  const basePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 0.01, 12),
    baseMat
  );
  basePlate.position.y = 0;
  group.add(basePlate);

  const springPts: THREE.Vector3[] = [];
  const coils = 4;
  const steps = coils * 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI * 2 * coils;
    springPts.push(new THREE.Vector3(
      Math.cos(angle) * radius * 0.6,
      t * height * 0.7,
      Math.sin(angle) * radius * 0.6
    ));
  }
  const springCurve = new THREE.CatmullRomCurve3(springPts);
  const springGeo = new THREE.TubeGeometry(springCurve, steps, 0.006, 6, false);
  const springMat = new THREE.MeshStandardMaterial({
    color: 0x5a9fd4, roughness: 0.4, metalness: 0.8,
  });
  const spring = new THREE.Mesh(springGeo, springMat);
  spring.position.y = 0.01;
  group.add(spring);

  const topPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 0.01, 12),
    baseMat.clone()
  );
  topPlate.position.y = height;
  group.add(topPlate);

  return group;
}

export function createDuctHanger(
  position: THREE.Vector3,
  ductWidth: number,
  dropHeight: number
): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(position);

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x8a9ba8, roughness: 0.5, metalness: 0.8,
  });

  const anchor = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.01, 0.05),
    steelMat
  );
  group.add(anchor);

  const rodGeo = new THREE.CylinderGeometry(0.006, 0.006, dropHeight, 6);
  const rodL = new THREE.Mesh(rodGeo, steelMat);
  rodL.position.set(-ductWidth / 2 + 0.02, -dropHeight / 2, 0);
  const rodR = rodL.clone();
  rodR.position.x = ductWidth / 2 - 0.02;
  group.add(rodL, rodR);

  const strap = new THREE.Mesh(
    new THREE.BoxGeometry(ductWidth + 0.04, 0.008, 0.02),
    steelMat
  );
  strap.position.y = -dropHeight;
  group.add(strap);

  return group;
}

export function createDuctTransition(
  startW: number, startH: number,
  endW: number, endH: number,
  length: number,
  color: number = 0x00bcd4
): THREE.Mesh {
  const geo = new THREE.BufferGeometry();

  const hw1 = startW / 2, hh1 = startH / 2;
  const hw2 = endW / 2, hh2 = endH / 2;

  const vertices = new Float32Array([
    -hw1, -hh1, 0,   hw1, -hh1, 0,   hw1, hh1, 0,   -hw1, hh1, 0,
    -hw2, -hh2, length,   hw2, -hh2, length,   hw2, hh2, length,   -hw2, hh2, length,
  ]);

  const indices = [
    0, 1, 2,  0, 2, 3,
    5, 4, 7,  5, 7, 6,
    0, 4, 5,  0, 5, 1,
    3, 2, 6,  3, 6, 7,
    4, 0, 3,  4, 3, 7,
    1, 5, 6,  1, 6, 2,
  ];

  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.5, metalness: 0.1,
    transparent: true, opacity: 0.85,
  });

  return new THREE.Mesh(geo, mat);
}
