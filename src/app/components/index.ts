/**
 * components/index.ts — Barrel export (Clean)
 * ─────────────────────────────────────────────────────────────
 * Re-export semua komponen publik dari folder components/.
 * 
 * IMPORTANT: Only export components that actually exist!
 * ─────────────────────────────────────────────────────────────
 */

// Main components (public API)
export { Sidebar } from './Sidebar';
export { ViewerControls } from './ViewerControls';
export { ViewerSkeleton } from './ViewerSkeleton';
export { ViewerErrorBoundary } from './ViewerErrorBoundary';
export { ProductViewerLazy } from './ProductViewerLazy';

// ─── Viewer Components ─────────────────────────────────────────
// Only export viewers that are registered and working

// Panel viewers (default)
export { AssembledPanel3D } from './AssembledPanel3D';
export { ExplodedPanel3D } from './ExplodedPanel3D';

// Curving viewers
export { CurvingAssembled3D } from './CurvingAssembled3D';
export { CurvingExploded3D } from './CurvingExploded3D';

// Hermetic Door viewers
export { HermeticDoorAssembled3D } from './HermeticDoorAssembled3D';
export { HermeticDoorExploded3D } from './HermeticDoorExploded3D';
export { HermeticDoorLegend } from './HermeticDoorLegend';

// PB Lead Door viewers
export { PbLeadDoorAssembled3D } from './PbLeadDoorAssembled3D';
export { PbLeadDoorExploded3D } from './PbLeadDoorExploded3D';

// Scrub Sink viewers
export { ScrubSinkAssembled3D } from './ScrubSinkAssembled3D';
export { ScrubSinkExploded3D } from './ScrubSinkExploded3D';

// Pass Box viewers
export { PassBoxAssembled3D } from './PassBoxAssembled3D';
export { PassBoxExploded3D } from './PassBoxExploded3D';

// PACS Cabinet viewers
export { PacsCabinetAssembled3D } from './PacsCabinetAssembled3D';
export { PacsCabinetExploded3D } from './PacsCabinetExploded3D';

// Return Air Grille viewers
export { ReturnAirGrilleAssembled3D } from './ReturnAirGrilleAssembled3D';
export { ReturnAirGrilleExploded3D } from './ReturnAirGrilleExploded3D';

// LAF System viewers
export { LafSystemAssembled3D } from './LafSystemAssembled3D';
export { LafSystemExploded3D } from './LafSystemExploded3D';

// Ceiling Panel viewers
export { CeilingPanelAssembled3D } from './CeilingPanelAssembled3D';
export { CeilingPanelExploded3D } from './CeilingPanelExploded3D';

// X-Ray Viewer
export { XrayViewerAssembled3D } from './XrayViewerAssembled3D';
export { XrayViewerExploded3D } from './XrayViewerExploded3D';

// Surgical Control Panel (NEW - with UI CanvasTexture)
export { SurgicalControlPanelAssembled3D } from './SurgicalControlPanelAssembled3D';
export { SurgicalControlPanelExploded3D } from './SurgicalControlPanelExploded3D';

// HVAC System viewer (special - has internal modes)
export { HvacSystemBIM3D } from './HvacSystemBIM3D';

// Note: SurgicalPanelAssembled3D and SurgicalPanelExploded3D are DEPRECATED
// Use SurgicalControlPanel* instead
