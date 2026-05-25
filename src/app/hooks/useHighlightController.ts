/**
 * useHighlightController.ts
 * ─────────────────────────────────────────────────────────────────
 * React hook that creates + manages a HighlightController bound to
 * a SceneRefs instance. Call AFTER scene is built (in onInit callback)
 * with `attachHighlight(refs)`.
 *
 * Usage in a viewer:
 *
 * ```tsx
 * const { mountRef, refsRef } = useThreeScene({
 *   onInit: (refs) => {
 *     buildScene(refs.scene);
 *     attachHighlight(refs); // <- after scene is built
 *   },
 *   deps: [product],
 * });
 * const { attachHighlight } = useHighlightController();
 * ```
 *
 * Lifecycle:
 *   • Controller created on first attach()
 *   • scanScene() called to register meshes by userData.partId
 *   • dispose() called on unmount or deps change
 * ─────────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useRef } from 'react';
import { HighlightController } from '../lib/highlight-controller';
import type { SceneRefs } from '../lib/three-scene';

export interface UseHighlightControllerReturn {
  /**
   * Call this AFTER scene is fully built (in `onInit` of useThreeScene)
   * to enable highlight system.
   */
  attachHighlight: (refs: SceneRefs) => void;
  /**
   * Get the live controller (e.g., to call .pin() programmatically
   * from a spec panel hover). Null if not yet attached.
   */
  getController: () => HighlightController | null;
}

export function useHighlightController(): UseHighlightControllerReturn {
  const controllerRef = useRef<HighlightController | null>(null);

  const attachHighlight = useCallback((refs: SceneRefs) => {
    // Dispose any previous controller (when deps change)
    if (controllerRef.current) {
      controllerRef.current.dispose();
      controllerRef.current = null;
    }

    const ctrl = new HighlightController({
      scene: refs.scene,
      camera: refs.camera,
      domElement: refs.renderer.domElement,
      onChange: () => {
        // Trigger render via the existing on-demand render loop.
        // Three.js render loop polls `controls.update()` already; we
        // trigger a re-render by touching the controls listeners.
        // The controller's tween already calls onChange every frame,
        // so we dispatch a synthetic event the loop is listening to.
        refs.controls.dispatchEvent({ type: 'change' });
      },
    });

    // Run scan a tick later so labels (CSS2DObjects) are committed to DOM.
    queueMicrotask(() => {
      ctrl.scanScene();
    });

    controllerRef.current = ctrl;
  }, []);

  const getController = useCallback(() => controllerRef.current, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.dispose();
        controllerRef.current = null;
      }
    };
  }, []);

  return { attachHighlight, getController };
}
