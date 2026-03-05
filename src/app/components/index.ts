/**
 * components/index.ts — Barrel export
 * ─────────────────────────────────────────────────────────────
 * Re-export semua komponen publik dari folder components/.
 * Gunakan import ini dari luar folder:
 *
 *   import { Sidebar, ProductViewer, ViewerControls } from '../components';
 *
 * Komponen internal (viewer 3D) juga di-export untuk kemudahan
 * penambahan viewer baru di masa depan.
 * ─────────────────────────────────────────────────────────────
 */

export { Sidebar }          from './Sidebar';
export { ProductViewer }    from './ProductViewer';
export { ViewerControls }   from './ViewerControls';
export { AssembledPanel3D } from './AssembledPanel3D';
export { ExplodedPanel3D }  from './ExplodedPanel3D';
export { CurvingAssembled3D } from './CurvingAssembled3D';
export { CurvingExploded3D }  from './CurvingExploded3D';
