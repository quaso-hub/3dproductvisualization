/**
 * hooks/index.ts — Barrel export
 * ─────────────────────────────────────────────────────────────
 * Re-export semua custom hooks dari folder hooks/.
 * 
 * Import dari sini untuk clean imports:
 *   import { useThreeScene, useProductViewer } from '../hooks';
 * ─────────────────────────────────────────────────────────────
 */

export { useThreeScene } from './useThreeScene';
export type { UseThreeSceneOptions, UseThreeSceneReturn } from './useThreeScene';

export { useProductViewer } from './useProductViewer';
export type { UseProductViewerOptions, UseProductViewerReturn } from './useProductViewer';
