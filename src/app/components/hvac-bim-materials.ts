/**
 * hvac-bim-materials.ts
 * ─────────────────────────────────────────────────────────────
 * V4 Material palette for HVAC System viewer.
 * Clean architectural style — light background, bold duct colors.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';

/* ── Subsystem Highlight Colors ───────────────────────────── */
export const SUPPLY_CYAN   = 0x00BCD4;
export const RETURN_SALMON = 0xEF9A9A;
export const REFRIG_AMBER  = 0xFFB300;

/* ── V4 Global Material Palette ──────────────────────────── */

export const MAT = {
  // Building
  wallGlass : new THREE.MeshStandardMaterial({ color: 0xB8D4E8, transparent: true, opacity: 0.12, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
  wallEdge  : new THREE.LineBasicMaterial({ color: 0x7799BB }),
  floor     : new THREE.MeshStandardMaterial({ color: 0xD8DDE2, roughness: 0.85, metalness: 0.0 }),
  ceiling   : new THREE.MeshStandardMaterial({ color: 0xE8EAEC, roughness: 0.8, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  roofSlab  : new THREE.MeshStandardMaterial({ color: 0xBDC3C7, roughness: 0.7, transparent: true, opacity: 0.35, depthWrite: false }),

  // AHU
  ahuCasing  : new THREE.MeshStandardMaterial({ color: 0x546E7A, roughness: 0.38, metalness: 0.55 }),
  ahuAccess  : new THREE.MeshStandardMaterial({ color: 0x607D8B, roughness: 0.42, metalness: 0.45 }),
  filterG4   : new THREE.MeshStandardMaterial({ color: 0xA5D6A7, roughness: 0.7, metalness: 0.0 }),
  filterF9   : new THREE.MeshStandardMaterial({ color: 0x90CAF9, roughness: 0.7, metalness: 0.0 }),
  evapCoil   : new THREE.MeshStandardMaterial({ color: 0x26C6DA, roughness: 0.25, metalness: 0.75 }),
  heater     : new THREE.MeshStandardMaterial({ color: 0xFF8A65, roughness: 0.35, metalness: 0.6, emissive: 0x6D1C00, emissiveIntensity: 0.3 }),
  fanHousing : new THREE.MeshStandardMaterial({ color: 0x455A64, roughness: 0.4, metalness: 0.6 }),
  fanBlade   : new THREE.MeshStandardMaterial({ color: 0x78909C, roughness: 0.3, metalness: 0.7 }),
  uvLamp     : new THREE.MeshStandardMaterial({ color: 0xCE93D8, emissive: 0x7B1FA2, emissiveIntensity: 1.8, transparent: true, opacity: 0.9 }),
  mechRoom   : new THREE.MeshStandardMaterial({ color: 0xCFD8DC, roughness: 0.8, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false }),
  magnehelic : new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.4, metalness: 0.3 }),

  // Ductwork
  supplyDuct : new THREE.MeshStandardMaterial({ color: 0x00BCD4, roughness: 0.55, metalness: 0.15 }),
  returnDuct : new THREE.MeshStandardMaterial({ color: 0xE57373, roughness: 0.55, metalness: 0.15 }),

  // Flanges
  flange     : new THREE.MeshStandardMaterial({ color: 0x8898A8, metalness: 0.65, roughness: 0.3 }),
  tape       : new THREE.MeshStandardMaterial({ color: 0xCCCCCC, metalness: 0.8, roughness: 0.1 }),

  // LAF
  lafPlenum  : new THREE.MeshStandardMaterial({ color: 0x8898A8, roughness: 0.4, metalness: 0.5 }),
  lafFilter  : new THREE.MeshStandardMaterial({ color: 0xECEFF1, roughness: 0.8, metalness: 0.0 }),
  lafDiffuser: new THREE.MeshStandardMaterial({ color: 0xF5F5F5, roughness: 0.7, metalness: 0.05 }),

  // Return grille
  grilleFrame: new THREE.MeshStandardMaterial({ color: 0x78909C, metalness: 0.55, roughness: 0.35 }),
  grillSlat  : new THREE.MeshStandardMaterial({ color: 0x8898A8, metalness: 0.5, roughness: 0.4 }),

  // Outdoor unit
  outerCasing: new THREE.MeshStandardMaterial({ color: 0x607D8B, roughness: 0.4, metalness: 0.4 }),
  outerFin   : new THREE.MeshStandardMaterial({ color: 0xB0BEC5, metalness: 0.75, roughness: 0.2, side: THREE.DoubleSide }),
  copper     : new THREE.MeshStandardMaterial({ color: 0xB87333, metalness: 0.88, roughness: 0.2 }),
  insulation : new THREE.MeshStandardMaterial({ color: 0x1A1A1A, roughness: 0.92, metalness: 0.0 }),

  // Control panel
  panel      : new THREE.MeshStandardMaterial({ color: 0x37474F, roughness: 0.45, metalness: 0.25 }),
  panelDoor  : new THREE.MeshStandardMaterial({ color: 0x455A64, roughness: 0.4, metalness: 0.2 }),
  hmi        : new THREE.MeshStandardMaterial({ color: 0x002244, emissive: 0x003366, emissiveIntensity: 0.8 }),

  // OR equipment
  tableMetal : new THREE.MeshStandardMaterial({ color: 0x90A4AE, metalness: 0.6, roughness: 0.3 }),
  tablePad   : new THREE.MeshStandardMaterial({ color: 0x37474F, roughness: 0.8 }),
  lampWhite  : new THREE.MeshStandardMaterial({ color: 0xECEFF1, roughness: 0.3, metalness: 0.2, emissive: 0xFFF8E1, emissiveIntensity: 0.8 }),
  pendantArm : new THREE.MeshStandardMaterial({ color: 0xB0BEC5, metalness: 0.65, roughness: 0.25 }),
} as const;

/* ── Highlight / Dim Helpers ──────────────────────────────── */

/** Create a highlighted clone: base material + emissive tint */
export function createHighlightMaterial(
  base: THREE.MeshStandardMaterial,
  highlightColor: number,
): THREE.MeshStandardMaterial {
  const mat = base.clone();
  mat.emissive = new THREE.Color(highlightColor);
  mat.emissiveIntensity = 0.22;
  mat.transparent = false;
  mat.opacity = 1.0;
  mat.depthWrite = true;
  return mat;
}

/** Shared dimmed material — very faint ghost */
let _dimmedMat: THREE.MeshStandardMaterial | null = null;
export function getDimmedMaterial(): THREE.MeshStandardMaterial {
  if (!_dimmedMat) {
    _dimmedMat = new THREE.MeshStandardMaterial({
      color: 0x455A64,
      roughness: 0.90,
      metalness: 0.0,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }
  return _dimmedMat;
}
