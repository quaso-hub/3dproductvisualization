/**
 * data/index.ts — Barrel export
 * ─────────────────────────────────────────────────────────────
 * Re-export semua type definitions dan registry dari folder data/.
 * 
 * Import dari sini untuk clean imports:
 *   import { Product, ViewerType, VIEWER_TYPES, getViewerConfig } from '../data';
 * ─────────────────────────────────────────────────────────────
 */

// Type definitions
export type {
  Layer,
  CameraPreset,
  PanelDimensions,
  ProductSpec,
  ViewType,
  ProductCategory,
  Product,
  HVACModeKey,
  HVACMode,
  HVACComponentType,
  HVACComponent,
  HVACSpecs,
} from './products';

// Constants
export { VIEWER_TYPES } from './products';
export type { ViewerType } from './products';

// Lazy viewer registry (canonical) — eager `viewerRegistry.ts` removed 2026-05-24
// because it was unused and contributed dead code to the barrel chain.
export {
  LAZY_VIEWER_REGISTRY,
  getLazyViewerConfig,
  preloadViewer,
  getRegisteredViewerTypes,
} from './lazyViewerRegistry';
export type { LazyViewerConfig } from './lazyViewerRegistry';
