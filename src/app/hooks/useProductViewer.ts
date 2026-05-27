/**
 * useProductViewer.ts
 * ─────────────────────────────────────────────────────────────
 * Custom hook yang mengabstraksi boilerplate Three.js viewer.
 * 
 * MENGGANTIKAN POLA INI di setiap viewer:
 * ```tsx
 * const [activePreset, setActivePreset] = useState(...);
 * const { mountRef, refsRef } = useThreeScene({ ... });
 * const goToPreset = (p) => { ... };
 * const download = (name) => { ... };
 * ```
 * 
 * MENJADI:
 * ```tsx
 * const { containerRef, controls, goToPreset, download } = useProductViewer(product);
 * ```
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useCallback } from 'react';
import type { Product, CameraPreset } from '../data/products';
import { useThreeScene } from './useThreeScene';
import { applyCameraPreset, downloadPNG } from '../lib/three-scene';

interface UseProductViewerOptions {
  /** Opsi tambahan untuk scene */
  sceneOptions?: Parameters<typeof useThreeScene>[0]['sceneOptions'];
  /** Callback untuk membangun scene - dipanggil sekali setelah scene siap */
  onInit: Parameters<typeof useThreeScene>[0]['onInit'];
  /** Callback opsional per-frame (untuk animasi) */
  onTick?: Parameters<typeof useThreeScene>[0]['onTick'];
}

interface UseProductViewerReturn {
  /** Attach ke `<div ref={containerRef} className="w-full h-full" />` */
  containerRef: ReturnType<typeof useThreeScene>['mountRef'];
  /** Akses ke SceneRefs (untuk operasi lanjutan) */
  refsRef: ReturnType<typeof useThreeScene>['refsRef'];
  /** Nama preset yang sedang aktif */
  activePreset: string;
  /** Fungsi untuk mengubah preset kamera */
  goToPreset: (preset: CameraPreset) => void;
  /** Fungsi untuk download PNG preset saat ini */
  download: (presetName: string) => void;
  /** Fungsi untuk download semua preset */
  downloadAll: () => void;
}

/**
 * Hook untuk mengelola product viewer dengan boilerplate minimal.
 * 
 * USAGE:
 * ```tsx
 * function MyViewer({ product }: Props) {
 *   const { containerRef, activePreset, goToPreset, download, downloadAll } = useProductViewer({
 *     product,
 *     onInit: (refs) => {
 *       // Bangun scene di sini
 *       buildMyGeometry(refs.scene, product);
 *     },
 *   });
 *   
 *   return (
 *     <div className="...">
 *       <ViewerControls
 *         presets={product.cameraPresets}
 *         activePreset={activePreset}
 *         onPreset={goToPreset}
 *         onDownload={download}
 *         onDownloadAll={downloadAll}
 *       />
 *       <div ref={containerRef} className="w-full h-full" />
 *     </div>
 *   );
 * }
 * ```
 */
export function useProductViewer({
  product,
  ...options
}: UseProductViewerOptions & { product: Product }): UseProductViewerReturn {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? ''
  );

  const { mountRef: containerRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      ...options.sceneOptions,
    },
    onInit: options.onInit,
    onTick: options.onTick,
    deps: [product],
  });

  const goToPreset = useCallback((preset: CameraPreset) => {
    if (refsRef.current) {
      applyCameraPreset(refsRef.current, preset.position, preset.target);
    }
    setActivePreset(preset.name);
  }, [refsRef]);

  const download = useCallback((presetName: string) => {
    if (refsRef.current) {
      const filename = `${product.id}-${presetName.toLowerCase().replace(/\s+/g, '-')}.png`;
      downloadPNG(refsRef.current.renderer, filename);
    }
  }, [refsRef, product.id]);

  const downloadAll = useCallback(() => {
    product.cameraPresets.forEach((preset, i) => {
      setTimeout(() => {
        goToPreset(preset);
        setTimeout(() => download(preset.name), 200);
      }, i * 500);
    });
  }, [product.cameraPresets, goToPreset, download]);

  return {
    containerRef,
    refsRef,
    activePreset,
    goToPreset,
    download,
    downloadAll,
  };
}
