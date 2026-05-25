/**
 * highlight-controller.ts — Bidirectional label↔3D part highlight.
 *
 * Architecture (research §2026-05-24-highlight-dim-pattern):
 *   • Each highlightable Mesh: `mesh.userData.partId = string`
 *   • Each CSS2D label wrapper div: `data-part-id="<string>"`
 *   • One controller per scene (created by useHighlightController hook)
 *   • Public state: { hoveredId, pinnedId } — declarative
 *   • Apply visuals via material clone + tween (NO postprocessing)
 *
 * Performance:
 *   • Single rAF tween loop (not one-per-mesh)
 *   • Material cloned ONCE per highlightable mesh on first highlight
 *     (originals untouched; sentinel-shared materials stay shared)
 *   • Throttled raycast (33ms = ~30fps) on pointermove
 *   • Reduced-motion → instant snap, no tween
 *
 * Memory:
 *   • Cloned material disposed when controller.dispose() runs
 *   • Original userData.material is NOT mutated; only cloned copies are
 *
 * ─────────────────────────────────────────────────────────────────────
 */
import * as THREE from 'three';
import {
  DURATION,
  EASE,
  HIGHLIGHT,
  DIM,
  prefersReducedMotion,
  isCoarsePointer,
} from './viz-interaction-tokens';
import { isSharedMaterial } from './materials';

/* ── Types ─────────────────────────────────────────────────── */

export type HighlightState = 'idle' | 'hover' | 'pinned' | 'dim';

export interface HighlightControllerOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** DOM element to attach pointer events. Usually canvas or container. */
  domElement: HTMLElement;
  /** Called when state changes — used by hook to invalidate render loop. */
  onChange?: () => void;
}

/* ── Internal mesh tracking ─────────────────────────────────── */

interface TrackedMesh {
  mesh: THREE.Mesh;
  partId: string;
  /** Original (possibly shared) material. NEVER mutated. */
  originalMaterial: THREE.Material | THREE.Material[];
  /** Cloned material for this mesh — created lazily on first highlight. */
  clonedMaterial: THREE.Material | THREE.Material[] | null;
  /** Original scale before highlight. */
  originalScale: THREE.Vector3;
  /** Current target state. */
  targetState: HighlightState;
  /** Tween progress (0-1). */
  progress: number;
}

/* ── Controller ────────────────────────────────────────────── */

export class HighlightController {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly domElement: HTMLElement;
  private readonly onChange?: () => void;

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNDC = new THREE.Vector2();

  /** All meshes registered with userData.partId. Keyed by partId for O(1) lookup. */
  private partsByMeshId = new Map<string, TrackedMesh[]>();
  /** Flat list (for raycasting). */
  private allMeshes: THREE.Mesh[] = [];
  /** All label wrapper divs keyed by partId (via data-part-id). */
  private labelsByPartId = new Map<string, HTMLElement[]>();

  private hoveredId: string | null = null;
  private pinnedId: string | null = null;

  private rafHandle: number | null = null;
  private lastRaycastTime = 0;
  private disposed = false;

  /** True if user-agent prefers reduced motion (no tweens). */
  private readonly reducedMotion: boolean;
  /** True if device is touch-only (no hover). */
  private readonly coarsePointer: boolean;

  constructor(opts: HighlightControllerOptions) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.domElement = opts.domElement;
    this.onChange = opts.onChange;
    this.reducedMotion = prefersReducedMotion();
    this.coarsePointer = isCoarsePointer();

    this.attachEvents();
  }

  /* ── Registration ─────────────────────────────────────── */

  /**
   * Walk the scene and register every Mesh that has `userData.partId`.
   * Call this AFTER your viewer's buildScene() finishes adding objects.
   */
  scanScene(): void {
    this.partsByMeshId.clear();
    this.allMeshes = [];

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const partId: string | undefined = mesh.userData?.partId;
      if (!partId || typeof partId !== 'string') return;

      const existing = this.partsByMeshId.get(partId) ?? [];
      existing.push({
        mesh,
        partId,
        originalMaterial: mesh.material,
        clonedMaterial: null,
        originalScale: mesh.scale.clone(),
        targetState: 'idle',
        progress: 0,
      });
      this.partsByMeshId.set(partId, existing);
      this.allMeshes.push(mesh);
    });

    this.scanLabels();
  }

  /**
   * Walk DOM under labelRenderer and index labels by data-part-id.
   * Adds the .viz-label class for CSS targeting.
   */
  private scanLabels(): void {
    this.labelsByPartId.clear();
    // Labels live anywhere — search the document for [data-part-id].
    const labelEls = document.querySelectorAll<HTMLElement>('[data-part-id]');
    labelEls.forEach((el) => {
      const id = el.dataset.partId;
      if (!id) return;
      el.classList.add('viz-label');
      const arr = this.labelsByPartId.get(id) ?? [];
      arr.push(el);
      this.labelsByPartId.set(id, arr);
      // Allow pointer events on labels (CSS2DRenderer wrapper has
      // pointer-events:none; per-label override needed for clickability).
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
      this.attachLabelEvents(el, id);
    });
  }

  /** Allow late-added labels to register. */
  registerLabel(el: HTMLElement, partId: string): void {
    if (!el || this.disposed) return;
    el.dataset.partId = partId;
    el.classList.add('viz-label');
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'pointer';
    const arr = this.labelsByPartId.get(partId) ?? [];
    arr.push(el);
    this.labelsByPartId.set(partId, arr);
    this.attachLabelEvents(el, partId);
  }

  /* ── Event handlers ───────────────────────────────────── */

  private onPointerMove = (e: PointerEvent): void => {
    if (this.disposed || this.coarsePointer) return; // mobile uses tap-only
    const now = performance.now();
    if (now - this.lastRaycastTime < DURATION.raycastThrottle) return;
    this.lastRaycastTime = now;

    const rect = this.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hits = this.raycaster.intersectObjects(this.allMeshes, false);
    const hit = hits[0];
    const partId = (hit?.object as THREE.Mesh | undefined)?.userData?.partId as
      | string
      | undefined;

    this.setHover(partId ?? null);

    // Cursor feedback
    if (partId) this.domElement.classList.add('viz-canvas-hover');
    else this.domElement.classList.remove('viz-canvas-hover');
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.disposed) return;
    const rect = this.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hits = this.raycaster.intersectObjects(this.allMeshes, false);
    const hit = hits[0];
    const partId = (hit?.object as THREE.Mesh | undefined)?.userData?.partId as
      | string
      | undefined;

    if (partId) {
      // Toggle pin if already pinned, else pin
      this.togglePin(partId);
      e.stopPropagation();
    } else {
      // Click on empty canvas → clear pin
      if (this.pinnedId) this.clearPin();
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.disposed) return;
    if (e.key === 'Escape' && this.pinnedId) {
      this.clearPin();
      e.preventDefault();
    }
  };

  private attachEvents(): void {
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);
  }

  private attachLabelEvents(el: HTMLElement, partId: string): void {
    if (!this.coarsePointer) {
      el.addEventListener('pointerenter', () => this.setHover(partId));
      el.addEventListener('pointerleave', () => this.setHover(null));
    }
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePin(partId);
    });
  }

  /* ── Public API ───────────────────────────────────────── */

  setHover(partId: string | null): void {
    if (this.pinnedId) return; // pinned overrides hover
    if (this.hoveredId === partId) return;
    this.hoveredId = partId;
    this.applyVisuals();
    this.onChange?.();
  }

  pin(partId: string): void {
    this.pinnedId = partId;
    this.hoveredId = null;
    this.applyVisuals();
    this.onChange?.();
  }

  togglePin(partId: string): void {
    if (this.pinnedId === partId) this.clearPin();
    else this.pin(partId);
  }

  clearPin(): void {
    this.pinnedId = null;
    this.applyVisuals();
    this.onChange?.();
  }

  /** Read-only state for external UI (e.g., spec panel highlight). */
  getActiveId(): string | null {
    return this.pinnedId ?? this.hoveredId;
  }

  /* ── Apply visuals (material + scale + label class) ───── */

  private applyVisuals(): void {
    const activeId = this.getActiveId();

    // Update each tracked mesh
    this.partsByMeshId.forEach((tracked, partId) => {
      const desired: HighlightState =
        activeId === null ? 'idle'
        : partId === activeId ? (this.pinnedId ? 'pinned' : 'hover')
        : 'dim';
      tracked.forEach((t) => {
        if (t.targetState !== desired) {
          t.targetState = desired;
          t.progress = 0; // restart tween
          if (this.reducedMotion) {
            t.progress = 1; // snap immediately
            this.applyMeshState(t);
          }
        }
      });
    });

    // Update labels
    this.labelsByPartId.forEach((els, partId) => {
      const desired: HighlightState =
        activeId === null ? 'idle'
        : partId === activeId ? (this.pinnedId ? 'pinned' : 'hover')
        : 'dim';
      els.forEach((el) => {
        if (desired === 'idle') el.removeAttribute('data-highlight-state');
        else el.setAttribute('data-highlight-state', desired);
      });
    });

    if (!this.reducedMotion && !this.rafHandle) {
      this.startTween();
    }
  }

  private startTween(): void {
    let last = performance.now();
    const tick = (now: number) => {
      if (this.disposed) return;
      const dt = Math.min(now - last, 33);
      last = now;
      let stillAnimating = false;
      this.partsByMeshId.forEach((tracked) => {
        tracked.forEach((t) => {
          if (t.progress < 1) {
            t.progress = Math.min(1, t.progress + dt / DURATION.highlight);
            this.applyMeshState(t);
            stillAnimating = true;
          }
        });
      });
      this.onChange?.();
      if (stillAnimating) {
        this.rafHandle = requestAnimationFrame(tick);
      } else {
        this.rafHandle = null;
      }
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  /** Apply current progress + state to one tracked mesh. */
  private applyMeshState(t: TrackedMesh): void {
    const eased = EASE.outCubic(t.progress);

    // Resolve target visual numbers per state
    let targetEmissive = 0;
    let targetScale = 1;
    let targetOpacity = 1;
    if (t.targetState === 'hover' || t.targetState === 'pinned') {
      targetEmissive = HIGHLIGHT.emissiveIntensity;
      targetScale = HIGHLIGHT.scale;
      targetOpacity = 1;
    } else if (t.targetState === 'dim') {
      targetEmissive = 0;
      targetScale = 1;
      targetOpacity = DIM.opacity;
    }

    // Lazily clone material on first non-idle apply
    if (
      (t.targetState !== 'idle' || targetOpacity < 1 || targetEmissive > 0) &&
      !t.clonedMaterial
    ) {
      t.clonedMaterial = this.cloneMaterial(t.originalMaterial);
      t.mesh.material = t.clonedMaterial as THREE.Material;
    }

    // Restore original on idle when fully tweened down
    if (
      t.targetState === 'idle' &&
      t.progress >= 1 &&
      t.clonedMaterial
    ) {
      t.mesh.material = t.originalMaterial as THREE.Material;
      this.disposeClonedMaterial(t.clonedMaterial);
      t.clonedMaterial = null;
    }

    const mat = t.clonedMaterial ?? t.originalMaterial;
    const mats: THREE.Material[] = Array.isArray(mat) ? mat : [mat];
    mats.forEach((m) => {
      const std = m as THREE.MeshStandardMaterial;
      // Tween from current to target
      if ('emissiveIntensity' in std) {
        std.emissiveIntensity =
          (std.emissiveIntensity ?? 0) * (1 - eased) + targetEmissive * eased;
      }
      // Opacity must be transparent-aware
      if (targetOpacity < 1 || (m as THREE.Material).transparent) {
        m.transparent = true;
        m.opacity = m.opacity * (1 - eased) + targetOpacity * eased;
      } else if (t.targetState === 'idle' && t.progress >= 1) {
        m.opacity = 1;
      }
    });

    // Scale tween
    const s = 1 * (1 - eased) + targetScale * eased;
    t.mesh.scale.set(
      t.originalScale.x * s,
      t.originalScale.y * s,
      t.originalScale.z * s,
    );
  }

  private cloneMaterial(
    src: THREE.Material | THREE.Material[],
  ): THREE.Material | THREE.Material[] {
    if (Array.isArray(src)) return src.map((m) => m.clone());
    return src.clone();
  }

  private disposeClonedMaterial(m: THREE.Material | THREE.Material[]): void {
    const arr = Array.isArray(m) ? m : [m];
    arr.forEach((mat) => {
      if (isSharedMaterial(mat)) return;
      mat.dispose();
    });
  }

  /* ── Cleanup ──────────────────────────────────────────── */

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = null;
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('keydown', this.onKeyDown);
    this.domElement.classList.remove('viz-canvas-hover');

    // Restore each mesh + dispose cloned materials
    this.partsByMeshId.forEach((tracked) => {
      tracked.forEach((t) => {
        if (t.clonedMaterial) {
          t.mesh.material = t.originalMaterial as THREE.Material;
          this.disposeClonedMaterial(t.clonedMaterial);
        }
        t.mesh.scale.copy(t.originalScale);
      });
    });
    this.partsByMeshId.clear();
    this.allMeshes = [];
    this.labelsByPartId.clear();
  }
}
