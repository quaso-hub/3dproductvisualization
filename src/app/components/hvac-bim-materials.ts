/**
 * hvac-bim-materials.ts
 * ─────────────────────────────────────────────────────────────
 * Material library for HVAC System BIM-MEP 3D viewer.
 * 15 realistic PBR materials + highlight/dim helpers.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';

/* ── Subsystem Highlight Colors ───────────────────────────── */
export const SUPPLY_CYAN   = 0x00BCD4;
export const RETURN_SALMON = 0xFF7043;
export const REFRIG_AMBER  = 0xFF8F00;

/* ── Realistic Material Factories ─────────────────────────── */

/** Ghost wall — semi-transparent HPL white */
export const matWall = () => new THREE.MeshStandardMaterial({
  color: 0xECEFF1, roughness: 0.75, metalness: 0.0,
  transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
});

/** Medical vinyl floor */
export const matFloor = () => new THREE.MeshStandardMaterial({
  color: 0xF5F5F0, roughness: 0.40, metalness: 0.0,
});

/** Ceiling HPL white */
export const matCeiling = () => new THREE.MeshStandardMaterial({
  color: 0xF1F3F4, roughness: 0.72, metalness: 0.0,
  transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
});

/** Rooftop concrete slab */
export const matRooftopSlab = () => new THREE.MeshStandardMaterial({
  color: 0xC8C8C0, roughness: 0.85, metalness: 0.0,
  transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
});

/** AHU Double Skin body — RAL 7035 */
export const matAHUBody = () => new THREE.MeshStandardMaterial({
  color: 0x8D9BAB, roughness: 0.50, metalness: 0.30,
});

/** Outdoor unit body */
export const matOutdoorUnit = () => new THREE.MeshStandardMaterial({
  color: 0xD4D8DC, roughness: 0.55, metalness: 0.15,
});

/** Supply duct PIU — light cyan tint (MEP standard) */
export const matDuctSupply = () => new THREE.MeshStandardMaterial({
  color: 0xB0D8E8, roughness: 0.65, metalness: 0.05,
});

/** Return duct — light salmon tint (MEP standard) */
export const matDuctReturn = () => new THREE.MeshStandardMaterial({
  color: 0xE8C0B0, roughness: 0.65, metalness: 0.05,
});

/** Insulation black foam (Harmaflek) */
export const matInsulation = () => new THREE.MeshStandardMaterial({
  color: 0x2D3436, roughness: 0.90, metalness: 0.0,
});

/** Copper pipe ASTM B280 */
export const matCopper = () => new THREE.MeshStandardMaterial({
  color: 0xB87333, roughness: 0.25, metalness: 0.85,
});

/** Stainless steel SUS 304 */
export const matStainless = () => new THREE.MeshStandardMaterial({
  color: 0xB0BAC4, roughness: 0.18, metalness: 0.94,
});

/** Control panel body — blue-grey */
export const matControlPanel = () => new THREE.MeshStandardMaterial({
  color: 0x607D8B, roughness: 0.40, metalness: 0.10,
});

/** Galvanised steel */
export const matGalvanised = () => new THREE.MeshStandardMaterial({
  color: 0xB4BEC8, roughness: 0.35, metalness: 0.80,
});

/** LAF perforated face */
export const matLAFFace = () => new THREE.MeshStandardMaterial({
  color: 0xF0F2F5, roughness: 0.70, metalness: 0.0,
});

/** Filter media (light grey fibrous) */
export const matFilterMedia = () => new THREE.MeshStandardMaterial({
  color: 0xCED4DA, roughness: 0.80, metalness: 0.0,
  transparent: true, opacity: 0.75,
});

/** Coil fin aluminium */
export const matCoilFin = () => new THREE.MeshStandardMaterial({
  color: 0xC0D0E0, roughness: 0.20, metalness: 0.80,
});

/** Fan blade dark grey */
export const matFanBlade = () => new THREE.MeshStandardMaterial({
  color: 0x505860, roughness: 0.45, metalness: 0.30,
});

/** AHU grille slat */
export const matSlat = () => new THREE.MeshStandardMaterial({
  color: 0x7B8A99, roughness: 0.40, metalness: 0.50,
});

/** HEPA filter media */
export const matHEPA = () => new THREE.MeshStandardMaterial({
  color: 0xF2ECE0, roughness: 0.92, metalness: 0.0,
});

/** LED panel (emissive) */
export const matLED = () => new THREE.MeshStandardMaterial({
  color: 0xF8F8FF, roughness: 0.50, metalness: 0.10,
  emissive: 0xE8EDFF, emissiveIntensity: 2.0,
});

/** OR equipment (table, pendant) — light medical grey */
export const matOREquipment = () => new THREE.MeshStandardMaterial({
  color: 0xD0D4D8, roughness: 0.45, metalness: 0.20,
});

/** Rubber gasket — EPDM/neoprene black */
export const matRubberGasket = () => new THREE.MeshStandardMaterial({
  color: 0x1A1A1A, roughness: 0.95, metalness: 0.0,
});

/** Aluminium foil tape — highly reflective silver */
export const matAluminiumFoilTape = () => new THREE.MeshStandardMaterial({
  color: 0xE8E8E8, roughness: 0.05, metalness: 0.95,
});

/** Brass valve/fitting body */
export const matBrassValve = () => new THREE.MeshStandardMaterial({
  color: 0xC5A54E, roughness: 0.30, metalness: 0.85,
});

/** Wire mesh (for fan guards, screens) */
export const matWireMesh = () => new THREE.MeshStandardMaterial({
  color: 0xA0A8B0, roughness: 0.35, metalness: 0.70,
  wireframe: true,
});

/* ── Highlight / Dim Helpers ──────────────────────────────── */

/** Create a highlighted clone: base material + emissive tint */
export function createHighlightMaterial(
  base: THREE.MeshStandardMaterial,
  highlightColor: number,
): THREE.MeshStandardMaterial {
  const mat = base.clone();
  mat.emissive = new THREE.Color(highlightColor);
  mat.emissiveIntensity = 0.35;
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
