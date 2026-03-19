/**
 * useThreeScene.ts
 * ─────────────────────────────────────────────────────────────
 * Custom hook yang mengelola lifecycle Three.js scene:
 *   • Mount renderer ke container div
 *   • ResizeObserver — defer init hingga container punya ukuran nyata
 *   • Render loop (RAF)
 *   • Cleanup penuh saat unmount atau dependency berubah
 *
 * Usage:
 * ```tsx
 * const { mountRef, refsRef } = useThreeScene({
 *   cameraStart: product.assembledCameraStart,
 *   onInit: (refs, scene) => {
 *     // bangun objek 3D di sini
 *   },
 *   deps: [product],
 * });
 * ```
 *
 * `onInit` dipanggil tepat sekali setelah container memiliki dimensi
 * nyata. Jika `deps` berubah, effect di-re-run: scene lama di-dispose,
 * scene baru dibangun.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';
import type { SceneOptions, SceneRefs } from '../lib/three-scene';
import {
  createScene,
  startRenderLoop,
  disposeScene,
} from '../lib/three-scene';

interface UseThreeSceneOptions {
  /** Opsi kamera & orbit (cameraStart wajib). */
  sceneOptions: Omit<SceneOptions, 'container'>;
  /**
   * Callback dipanggil tepat SATU kali setelah scene siap.
   * Bangun semua mesh / anotasi di sini.
   * @param refs  — SceneRefs (scene, camera, renderer, controls)
   */
  onInit: (refs: SceneRefs) => void;
  /**
   * Optional per-frame callback, dipanggil setiap RAF tick
   * sebelum render. Gunakan untuk animasi (fan rotation, particles, dll).
   */
  onTick?: () => void;
  /**
   * Array dependency — setiap kali nilai berubah,
   * scene di-dispose lalu di-rebuild.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[];
}

interface UseThreeSceneReturn {
  /** Attach ke `<div ref={mountRef} className="w-full h-full" />` */
  mountRef: React.RefObject<HTMLDivElement | null>;
  /** Akses SceneRefs dari luar hook (untuk preset kamera, download, dll.) */
  refsRef: React.RefObject<SceneRefs | null>;
}

export function useThreeScene({
  sceneOptions,
  onInit,
  onTick,
  deps,
}: UseThreeSceneOptions): UseThreeSceneReturn {
  const mountRef = useRef<HTMLDivElement>(null);
  const refsRef  = useRef<SceneRefs | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let initialized = false;
    let stopRender: (() => void) | undefined;

    // ro must be declared before init() so the closure captures the correct reference
    // eslint-disable-next-line prefer-const
    let ro: ResizeObserver;

    const init = () => {
      if (initialized || container.clientWidth < 1 || container.clientHeight < 1) return;
      initialized = true;
      ro.disconnect();

      const refs = createScene({ container, ...sceneOptions });
      refsRef.current = refs;

      onInit(refs);

      stopRender = startRenderLoop(refs, onTick);
    };

    ro = new ResizeObserver(init);
    ro.observe(container);
    // Coba langsung kalau container sudah punya ukuran saat mount
    init();

    return () => {
      ro.disconnect();
      stopRender?.();
      if (refsRef.current) {
        disposeScene(refsRef.current, container);
        refsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { mountRef, refsRef };
}
