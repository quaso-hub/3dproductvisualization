/**
 * src/app/products/index.ts - PRODUCT REGISTRY (Clean)
 * ----------------------------------------
 * 
 * FINAL PRODUCT LIST (12 unique products):
 * 
 * WALL PANEL:
 * 1. Sandwich Panel - Radiasi (Pb 2mm)
 *    (Standard and Cleanroom variants are ARCHIVED - same viewer)
 * 
 * OTHER PRODUCTS:
 * 2. Curving R40 Aluminium Profile
 * 3. Hermetic Auto Sliding Door
 * 4. PB/Lead Door (Swing)
 * 5. Scrub Sink 2-Bay
 * 6. Pass Box
 * 7. PACS Cabinet
 * 8. Return Air Grille
 * 9. LAF System (Ceiling)
 * 10. Ceiling Panel System
 * 11. X-Ray Viewer Double Screen
 * 12. Surgical Control Panel Touchscreen
 * 13. HVAC System BIM (special viewer)
 * ----------------------------------------
 */

import type { Product } from '../data/products';

// Wall Panel Elements (only Sandwich Radiasi - the main product)
// sandwichStandard and cleanroom are ARCHIVED - keep files but don't display
import sandwichRadiasi  from './sandwich-radiasi';
// import sandwichStandard from './sandwich-standard'; // ARCHIVED - same viewer as radiasi
// import cleanroom        from './cleanroom'; // ARCHIVED - same viewer as radiasi

// Other Products
import curvingR40       from './curving';
import hermeticDoor    from './hermetic-door';
import pbLeadDoor       from './pb-lead-door';
import scrubSink        from './scrub-sink';
import passBox          from './pass-box';
import pacsCabinet      from './pacs-cabinet';
import returnAirGrille  from './return-air-grille';
import lafSystem        from './laf-system';
import ceilingPanel     from './ceiling-panel';
import xrayViewer       from './xray-viewer';
import surgicalControlPanel from './surgical-control-panel';
import hvacSystem       from './hvac-system';

/**
 * PRODUCTS ARRAY
 * 
 * Only includes UNIQUE products (no duplicates).
 * Surgical Panel = Surgical Control Panel (keep one).
 */
export const PRODUCTS: Product[] = [
  // ─── Wall Panel Element ───────────────────────────────
  // Only Sandwich Radiasi - the primary wall panel product
  // Other variants (standard, cleanroom) are archived
  sandwichRadiasi,
  
  // ─── Profiles & Accessories ───────────────────────────
  curvingR40,
  
  // ─── Doors ───────────────────────────────────────────
  hermeticDoor,
  pbLeadDoor,
  
  // ─── Fixtures ────────────────────────────────────────
  scrubSink,
  passBox,
  pacsCabinet,
  returnAirGrille,
  
  // ─── Ceiling Systems ──────────────────────────────────
  lafSystem,
  ceilingPanel,
  
  // ─── Medical Equipment ────────────────────────────────
  xrayViewer,
  surgicalControlPanel,
  
  // ─── BIM System (special viewer) ──────────────────────
  hvacSystem,
];

/** Cari produk berdasarkan id slug. */
export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Get all product IDs. */
export function getProductIds(): string[] {
  return PRODUCTS.map((p) => p.id);
}

/** Get products by category. */
export function getProductsByCategory(category: string): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}
