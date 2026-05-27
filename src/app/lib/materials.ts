/**
 * materials.ts — Singleton PBR material cache (Session 8.5)
 * ─────────────────────────────────────────────────────────────────
 * Game-dev trick (verified research 2026-05-22):
 *   Three.js cache compiled shader per-material instance.
 *   Share = compile sekali, bind sekali per drawcall.
 *
 * Aturan: 1 scene = 3-5 unique materials total.
 * Cross-viewer reuse: pickup material yang sama saat user pindah produk
 * → shader compile cache hit → faster initial render.
 *
 * Source recipes: docs/research/2026-05-22-game-dev-tricks-web3d.md §3.6
 *                 + .opencode/skills/viz-pbr-materials-2026/SKILL.md
 *
 * USAGE: import { mat } from '../lib/materials';
 *        const m = new THREE.Mesh(geo, mat.ssPolished);
 *
 * NOTE: Materials di-share, JANGAN call .dispose() di useEffect cleanup
 * per-viewer. Material hidup selama app session. dispose() hanya saat
 * full app unmount (rare).
 * ─────────────────────────────────────────────────────────────────
 */
import * as THREE from 'three';

// ── Stainless Steel polished (medical scrub sink, AHU casing, hardware) ──
const ssPolished = new THREE.MeshPhysicalMaterial({
  color: 0xeaf0f4,
  roughness: 0.18,
  metalness: 1.0,
  clearcoat: 0.3,
  clearcoatRoughness: 0.15,
  envMapIntensity: 1.4,
});

// ── Stainless Steel matte/brushed (cabinet panels, hardware secondary) ──
const ssMatte = new THREE.MeshStandardMaterial({
  color: 0xc8d4dc,
  roughness: 0.35,
  metalness: 1.0,
  envMapIntensity: 1.0,
});

// ── Brushed SS hardware (anisotropy hint via lower roughness uniform) ──
const ssBrushed = new THREE.MeshPhysicalMaterial({
  color: 0xc2cad2,
  roughness: 0.4,
  metalness: 1.0,
  clearcoat: 0.2,
  clearcoatRoughness: 0.3,
  envMapIntensity: 1.1,
});

// ── Chrome (faucets, handles, valves) ──
const chrome = new THREE.MeshPhysicalMaterial({
  color: 0xeef4f8,
  roughness: 0.08,
  metalness: 1.0,
  clearcoat: 0.4,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.7,
});

// ── Lead (Pb sheet) ──
const lead = new THREE.MeshStandardMaterial({
  color: 0x707680,
  roughness: 0.55,
  metalness: 0.45,
  envMapIntensity: 0.7,
});

// ── Pb Lead Glass (X-ray viewer window) ──
// Greenish-amber tint (Schott RD50 / Mavig spec — NOT cyan)
const leadGlass = new THREE.MeshPhysicalMaterial({
  color: 0xc8d4b0,
  roughness: 0.05,
  metalness: 0,
  transmission: 0.7,
  thickness: 0.6,
  ior: 1.55,
  transparent: true,
  opacity: 0.55,
  side: THREE.DoubleSide,
  envMapIntensity: 1.2,
  clearcoat: 0.3,
  clearcoatRoughness: 0.1,
});

// ── Powder coat door white (RAL 9010 / 7035) ──
const powderCoatWhite = new THREE.MeshPhysicalMaterial({
  color: 0xe2e8ec,
  roughness: 0.62,
  metalness: 0.05,
  clearcoat: 0.4,
  clearcoatRoughness: 0.25,
  envMapIntensity: 0.65,
});

// ── Mirror (medical anti-fog laminate) ──
const mirror = new THREE.MeshPhysicalMaterial({
  color: 0xb0e0f0,
  roughness: 0.04,
  metalness: 0,
  transparent: true,
  opacity: 0.92,
  side: THREE.DoubleSide,
  envMapIntensity: 1.6,
  clearcoat: 0.6,
  clearcoatRoughness: 0.05,
});

// ── Frame steel (door frames, jambs, structural — partial metallic) ──
const frameSteel = new THREE.MeshPhysicalMaterial({
  color: 0xb8c4ce,
  roughness: 0.3,
  metalness: 1.0,
  clearcoat: 0.25,
  clearcoatRoughness: 0.3,
  envMapIntensity: 0.95,
});

// ── EPDM rubber (gaskets, drop seals, foot pedal) ──
const rubber = new THREE.MeshStandardMaterial({
  color: 0x1e2228,
  roughness: 0.92,
  metalness: 0,
});

// ── Wall (drywall — matte) ──
const wall = new THREE.MeshStandardMaterial({
  color: 0xe8eef2,
  roughness: 0.92,
  metalness: 0,
});

// ── Plexiglass / acrylic ──
const plexiglass = new THREE.MeshPhysicalMaterial({
  color: 0xeaf3f8,
  roughness: 0.04,
  metalness: 0,
  transmission: 0.85,
  thickness: 0.5,
  ior: 1.49,
  transparent: true,
  opacity: 0.4,
  side: THREE.DoubleSide,
});

// ── Basin interior (shadowed SS + double sided) ──
const basinInterior = new THREE.MeshPhysicalMaterial({
  color: 0xa8b4c2,
  roughness: 0.22,
  metalness: 1.0,
  clearcoat: 0.25,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.0,
  side: THREE.DoubleSide,
});

// ── Drain / waste (plumbing chrome darker) ──
const waste = new THREE.MeshStandardMaterial({
  color: 0x6c7680,
  roughness: 0.32,
  metalness: 1.0,
  envMapIntensity: 1.0,
});

// ── Floor (matte light grey, receive shadow) ──
const floor = new THREE.MeshStandardMaterial({
  color: 0xeef0f3,
  roughness: 0.85,
  metalness: 0,
});

// ── Equipment (HVAC AHU/CDU/LAF body — partial metallic painted steel) ──
const equipment = new THREE.MeshStandardMaterial({
  color: 0x8a98a4,
  roughness: 0.46,
  metalness: 0.5,
  envMapIntensity: 0.95,
});

const equipmentDark = new THREE.MeshStandardMaterial({
  color: 0x425560,
  roughness: 0.5,
  metalness: 0.55,
  envMapIntensity: 0.8,
});

// ── Emissive accents ──
const ledStripCyan = new THREE.MeshStandardMaterial({
  color: 0xb8f7ff,
  roughness: 0.2,
  metalness: 0,
  emissive: new THREE.Color(0x60e8ff),
  emissiveIntensity: 1.1,
});

const uvTubePurple = new THREE.MeshStandardMaterial({
  color: 0xc8b4ff,
  roughness: 0.3,
  metalness: 0,
  emissive: new THREE.Color(0x9060ff),
  emissiveIntensity: 0.6,
});

const sensorLedRed = new THREE.MeshStandardMaterial({
  color: 0xff4444,
  emissive: new THREE.Color(0xff2020),
  emissiveIntensity: 1.0,
  roughness: 0.3,
  metalness: 0,
});

// ── Black detail (keyway, screws, dark plastic) ──
const blackDetail = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  roughness: 0.55,
  metalness: 0.25,
});

// ── Export all as `mat` namespace ──
export const mat = {
  ssPolished,
  ssMatte,
  ssBrushed,
  chrome,
  lead,
  leadGlass,
  powderCoatWhite,
  mirror,
  frameSteel,
  rubber,
  wall,
  plexiglass,
  basinInterior,
  waste,
  floor,
  equipment,
  equipmentDark,
  ledStripCyan,
  uvTubePurple,
  sensorLedRed,
  blackDetail,
};

// ── Sentinel tag — read by `disposeScene` in three-scene.ts ──
// Without this, the per-viewer scene-traverse dispose loop will dispose
// these singletons on the FIRST viewer unmount, causing "Cannot read
// properties of disposed material" on the next viewer that uses them.
// Symbol property is non-enumerable to avoid leaking into shader uniforms.
export const SHARED_MATERIAL_SENTINEL = Symbol.for('viz.sharedMaterial');
Object.values(mat).forEach((m) => {
  Object.defineProperty(m, SHARED_MATERIAL_SENTINEL, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  // Same for any internal default texture the material allocates lazily
  // — they'll inherit the dispose-skip via material guard below.
});

/**
 * Type guard for `disposeScene` (`three-scene.ts`) to skip disposing
 * any material that was registered in the shared cache.
 */
export function isSharedMaterial(m: unknown): boolean {
  return Boolean(
    m &&
      typeof m === 'object' &&
      (m as Record<symbol, unknown>)[SHARED_MATERIAL_SENTINEL] === true,
  );
}

/**
 * Optional: dispose all materials (call only when app fully unmounts).
 * Per-viewer dispose: SKIP — materials shared cross-viewer.
 */
export function disposeAllMaterials(): void {
  Object.values(mat).forEach((m) => m.dispose());
}
