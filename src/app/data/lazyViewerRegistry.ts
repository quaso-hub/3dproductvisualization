/**
 * lazyViewerRegistry.ts — LAZY LOADED VIEWER REGISTRY
 * ─────────────────────────────────────────────────────────────
 * 
 * Modern code-splitting pattern untuk 3D viewers:
 * - Lazy load dengan React.lazy()
 * - Automatic chunk splitting per viewer
 * - Suspense boundary dengan loading states
 * - Preload on hover untuk instant display
 * - Error boundary untuk graceful failures
 *
 * Performance targets:
 * - Initial bundle < 200KB
 * - Each viewer chunk < 100KB
 * - Time to interactive < 3s on 3G
 * - First Contentful Paint < 1.5s
 *
 * ─────────────────────────────────────────────────────────────
 */

import { lazy, ComponentType } from 'react';
import type { Product } from './products';

// ─── Types ────────────────────────────────────────────────────

export interface LazyViewerConfig {
  /** Lazy-loaded assembled component */
  assembled: React.LazyExoticComponent<ComponentType<ViewerProps>>;
  /** Lazy-loaded exploded component */
  exploded: React.LazyExoticComponent<ComponentType<ViewerProps>>;
  /** Preload function - call on hover */
  preload: () => void;
  /** Chunk name for debugging */
  chunkName: string;
  /** Estimated chunk size (KB) */
  estimatedSize: number;
}

export interface ViewerProps {
  product: Product;
}

// ─── Lazy Import Helper ─────────────────────────────────────────

/**
 * Creates a lazy-loaded component with preload capability.
 * Each viewer gets its own chunk via webpackChunkName.
 */
function createLazyViewer<T extends ComponentType<ViewerProps>>(
  importFn: () => Promise<{ default: T }>,
  chunkName: string,
  estimatedSize: number,
): {
  component: React.LazyExoticComponent<T>;
  preload: () => void;
} {
  const component = lazy(importFn);
  
  // Preload function - triggers import without mounting
  let preloaded: Promise<{ default: T }> | null = null;
  const preload = () => {
    if (!preloaded) {
      preloaded = importFn();
    }
  };

  return { component, preload };
}

// ═══════════════════════════════════════════════════════════════
// LAZY VIEWER REGISTRY
// ═══════════════════════════════════════════════════════════════

export const LAZY_VIEWER_REGISTRY: Record<string, LazyViewerConfig> = {
  // ─── PANEL (default) ────────────────────────────────────────
  panel: {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-panel-assembled" */
      '../components/AssembledPanel3D'
    ).then(m => ({ default: m.AssembledPanel3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-panel-exploded" */
      '../components/ExplodedPanel3D'
    ).then(m => ({ default: m.ExplodedPanel3D }))),
    preload: () => {
      import('../components/AssembledPanel3D');
      import('../components/ExplodedPanel3D');
    },
    chunkName: 'panel',
    estimatedSize: 45,
  },

  // ─── CURVING R40 ────────────────────────────────────────────
  curving: {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-curving-assembled" */
      '../components/CurvingAssembled3D'
    ).then(m => ({ default: m.CurvingAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-curving-exploded" */
      '../components/CurvingExploded3D'
    ).then(m => ({ default: m.CurvingExploded3D }))),
    preload: () => {
      import('../components/CurvingAssembled3D');
      import('../components/CurvingExploded3D');
    },
    chunkName: 'curving',
    estimatedSize: 52,
  },

  // ─── HERMETIC DOOR ──────────────────────────────────────────
  'hermetic-door': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-hermetic-assembled" */
      '../components/HermeticDoorAssembled3D'
    ).then(m => ({ default: m.HermeticDoorAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-hermetic-exploded" */
      '../components/HermeticDoorExploded3D'
    ).then(m => ({ default: m.HermeticDoorExploded3D }))),
    preload: () => {
      import('../components/HermeticDoorAssembled3D');
      import('../components/HermeticDoorExploded3D');
    },
    chunkName: 'hermetic-door',
    estimatedSize: 68,
  },

  // ─── PB LEAD DOOR ───────────────────────────────────────────
  'pb-lead-door': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-pblead-assembled" */
      '../components/PbLeadDoorAssembled3D'
    ).then(m => ({ default: m.PbLeadDoorAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-pblead-exploded" */
      '../components/PbLeadDoorExploded3D'
    ).then(m => ({ default: m.PbLeadDoorExploded3D }))),
    preload: () => {
      import('../components/PbLeadDoorAssembled3D');
      import('../components/PbLeadDoorExploded3D');
    },
    chunkName: 'pb-lead-door',
    estimatedSize: 72,
  },

  // ─── SCRUB SINK ─────────────────────────────────────────────
  'scrub-sink': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-scrub-assembled" */
      '../components/ScrubSinkAssembled3D'
    ).then(m => ({ default: m.ScrubSinkAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-scrub-exploded" */
      '../components/ScrubSinkExploded3D'
    ).then(m => ({ default: m.ScrubSinkExploded3D }))),
    preload: () => {
      import('../components/ScrubSinkAssembled3D');
      import('../components/ScrubSinkExploded3D');
    },
    chunkName: 'scrub-sink',
    estimatedSize: 65,
  },

  // ─── PASS BOX ───────────────────────────────────────────────
  'pass-box': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-passbox-assembled" */
      '../components/PassBoxAssembled3D'
    ).then(m => ({ default: m.PassBoxAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-passbox-exploded" */
      '../components/PassBoxExploded3D'
    ).then(m => ({ default: m.PassBoxExploded3D }))),
    preload: () => {
      import('../components/PassBoxAssembled3D');
      import('../components/PassBoxExploded3D');
    },
    chunkName: 'pass-box',
    estimatedSize: 62,
  },

  // ─── PACS CABINET ───────────────────────────────────────────
  'pacs-cabinet': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-pacs-assembled" */
      '../components/PacsCabinetAssembled3D'
    ).then(m => ({ default: m.PacsCabinetAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-pacs-exploded" */
      '../components/PacsCabinetExploded3D'
    ).then(m => ({ default: m.PacsCabinetExploded3D }))),
    preload: () => {
      import('../components/PacsCabinetAssembled3D');
      import('../components/PacsCabinetExploded3D');
    },
    chunkName: 'pacs-cabinet',
    estimatedSize: 58,
  },

  // ─── RETURN AIR GRILLE ──────────────────────────────────────
  'return-air-grille': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-rag-assembled" */
      '../components/ReturnAirGrilleAssembled3D'
    ).then(m => ({ default: m.ReturnAirGrilleAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-rag-exploded" */
      '../components/ReturnAirGrilleExploded3D'
    ).then(m => ({ default: m.ReturnAirGrilleExploded3D }))),
    preload: () => {
      import('../components/ReturnAirGrilleAssembled3D');
      import('../components/ReturnAirGrilleExploded3D');
    },
    chunkName: 'return-air-grille',
    estimatedSize: 48,
  },

  // ─── LAF SYSTEM ─────────────────────────────────────────────
  'laf-system': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-laf-assembled" */
      '../components/LafSystemAssembled3D'
    ).then(m => ({ default: m.LafSystemAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-laf-exploded" */
      '../components/LafSystemExploded3D'
    ).then(m => ({ default: m.LafSystemExploded3D }))),
    preload: () => {
      import('../components/LafSystemAssembled3D');
      import('../components/LafSystemExploded3D');
    },
    chunkName: 'laf-system',
    estimatedSize: 78,
  },

  // ─── CEILING PANEL ──────────────────────────────────────────
  'ceiling-panel': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-ceiling-assembled" */
      '../components/CeilingPanelAssembled3D'
    ).then(m => ({ default: m.CeilingPanelAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-ceiling-exploded" */
      '../components/CeilingPanelExploded3D'
    ).then(m => ({ default: m.CeilingPanelExploded3D }))),
    preload: () => {
      import('../components/CeilingPanelAssembled3D');
      import('../components/CeilingPanelExploded3D');
    },
    chunkName: 'ceiling-panel',
    estimatedSize: 72,
  },

  // ─── X-RAY VIEWER ───────────────────────────────────────────
  'xray-viewer': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-xray-assembled" */
      '../components/XrayViewerAssembled3D'
    ).then(m => ({ default: m.XrayViewerAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-xray-exploded" */
      '../components/XrayViewerExploded3D'
    ).then(m => ({ default: m.XrayViewerExploded3D }))),
    preload: () => {
      import('../components/XrayViewerAssembled3D');
      import('../components/XrayViewerExploded3D');
    },
    chunkName: 'xray-viewer',
    estimatedSize: 55,
  },

  // ─── SURGICAL CONTROL PANEL ────────────────────────────────
  'surgical-control-panel': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-surgical-assembled" */
      '../components/SurgicalControlPanelAssembled3D'
    ).then(m => ({ default: m.SurgicalControlPanelAssembled3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-surgical-exploded" */
      '../components/SurgicalControlPanelExploded3D'
    ).then(m => ({ default: m.SurgicalControlPanelExploded3D }))),
    preload: () => {
      import('../components/SurgicalControlPanelAssembled3D');
      import('../components/SurgicalControlPanelExploded3D');
    },
    chunkName: 'surgical-control-panel',
    estimatedSize: 85,
  },

  // ─── HVAC SYSTEM (complex, larger chunk) ───────────────────
  'hvac-system': {
    assembled: lazy(() => import(
      /* webpackChunkName: "viewer-hvac" */
      '../components/HvacSystemBIM3D'
    ).then(m => ({ default: m.HvacSystemBIM3D }))),
    exploded: lazy(() => import(
      /* webpackChunkName: "viewer-hvac" */
      '../components/HvacSystemBIM3D'
    ).then(m => ({ default: m.HvacSystemBIM3D }))),
    preload: () => {
      import('../components/HvacSystemBIM3D');
    },
    chunkName: 'hvac-system',
    estimatedSize: 120,
  },
};

// ─── Helper Functions ──────────────────────────────────────────

/**
 * Get lazy viewer config by viewerType.
 * Falls back to 'panel' if not found.
 */
export function getLazyViewerConfig(viewerType?: string): LazyViewerConfig {
  return LAZY_VIEWER_REGISTRY[viewerType || 'panel'] || LAZY_VIEWER_REGISTRY.panel;
}

/**
 * Preload a viewer by viewerType.
 * Call this on hover/focus for instant display.
 */
export function preloadViewer(viewerType: string): void {
  const config = LAZY_VIEWER_REGISTRY[viewerType];
  if (config) {
    config.preload();
  }
}

/**
 * Preload multiple viewers (e.g., next in list).
 * Used for predictive prefetching.
 */
export function preloadViewers(viewerTypes: string[]): void {
  viewerTypes.forEach((type) => {
    const config = LAZY_VIEWER_REGISTRY[type];
    if (config) {
      config.preload();
    }
  });
}

/**
 * Get total estimated size for given viewerTypes.
 * Useful for budgeting and performance monitoring.
 */
export function getEstimatedBundleSize(viewerTypes: string[]): number {
  return viewerTypes.reduce((sum, type) => {
    const config = LAZY_VIEWER_REGISTRY[type];
    return sum + (config?.estimatedSize || 0);
  }, 0);
}

/**
 * Get all registered viewer types.
 */
export function getRegisteredViewerTypes(): string[] {
  return Object.keys(LAZY_VIEWER_REGISTRY);
}
