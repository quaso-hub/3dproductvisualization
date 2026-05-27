/**
 * hvac-bim-modes.ts
 * ─────────────────────────────────────────────────────────────
 * V4 Simplified mode system: 4 airflow modes + 4 camera presets.
 * No explosion offsets, no floor plan, no AHU cutaway.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { SUPPLY_CYAN, RETURN_SALMON, REFRIG_AMBER, createHighlightMaterial, getDimmedMaterial } from './hvac-bim-materials';

/* ── Types ────────────────────────────────────────────────── */

export type HvacMode = 'all' | 'supply' | 'return' | 'refrig';

export interface ModeConfig {
  id: HvacMode;
  label: string;
  description: string;
  highlightGroups?: string[];
  highlightColor?: number;
  showParticles?: ('supply' | 'return' | 'refrig')[];
}

export interface CameraPresetConfig {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

/* ── Mode Definitions ─────────────────────────────────────── */

export const MODE_CONFIGS: Record<HvacMode, ModeConfig> = {
  all: {
    id: 'all',
    label: 'ALL',
    description: 'Full HVAC System — semua komponen',
    showParticles: ['supply', 'return', 'refrig'],
  },
  supply: {
    id: 'supply',
    label: 'Supply',
    description: 'Supply Air: AHU → Ducting → LAF → Laminar Flow',
    highlightGroups: ['grp_ahu', 'grp_supply_duct', 'grp_laf_units'],
    highlightColor: SUPPLY_CYAN,
    showParticles: ['supply'],
  },
  return: {
    id: 'return',
    label: 'Return',
    description: 'Return Air: Low-wall grilles → Return duct → AHU',
    highlightGroups: ['grp_return_duct', 'grp_ahu'],
    highlightColor: RETURN_SALMON,
    showParticles: ['return'],
  },
  refrig: {
    id: 'refrig',
    label: 'Refrig',
    description: 'Refrigerant: Outdoor Unit ↔ AHU Evaporator',
    highlightGroups: ['grp_refrigerant_pipes', 'grp_outdoor_unit', 'grp_ahu'],
    highlightColor: REFRIG_AMBER,
    showParticles: ['refrig'],
  },
};

/* ── Camera Presets (V4 Spec) ─────────────────────────────── */

export const CAMERA_PRESETS: CameraPresetConfig[] = [
  { id: 'overview', label: 'Overview', position: [14, 9, 14], target: [2, 2, 0] },
  { id: 'ahu',      label: 'AHU',      position: [12, 2.5, 4], target: [7.2, 0.6, 0] },
  { id: 'or',       label: 'OR Room',   position: [4, 3.5, 10], target: [0, 1.5, 0] },
  { id: 'top',      label: 'Top',       position: [2, 15, 1], target: [2, 0, 0] },
];

/* ── Material Registry ────────────────────────────────────── */

export interface MeshRegistryEntry {
  mesh: THREE.Mesh;
  groupName: string;
  originalMaterial: THREE.Material;
}

export function buildMeshRegistry(
  groups: Map<string, THREE.Group>,
): MeshRegistryEntry[] {
  const registry: MeshRegistryEntry[] = [];
  for (const [groupName, group] of groups) {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        registry.push({
          mesh,
          groupName,
          originalMaterial: mesh.material as THREE.Material,
        });
      }
    });
  }
  return registry;
}

/* ── Mode Transition ──────────────────────────────────────── */

export function applyMode(
  mode: HvacMode,
  groups: Map<string, THREE.Group>,
  registry: MeshRegistryEntry[],
): void {
  const config = MODE_CONFIGS[mode];
  const isSubsystem = !!(config.highlightGroups && config.highlightColor);

  if (isSubsystem) {
    const highlightSet = new Set(config.highlightGroups!);
    const dimMat = getDimmedMaterial();
    const hlCache = new Map<string, THREE.MeshStandardMaterial>();

    for (const entry of registry) {
      if (highlightSet.has(entry.groupName)) {
        let hlMat = hlCache.get(entry.groupName);
        if (!hlMat) {
          hlMat = createHighlightMaterial(
            entry.originalMaterial as THREE.MeshStandardMaterial,
            config.highlightColor!,
          );
          hlCache.set(entry.groupName, hlMat);
        }
        entry.mesh.material = hlMat;
      } else {
        entry.mesh.material = dimMat;
      }
    }
  } else {
    // Restore originals
    for (const entry of registry) {
      entry.mesh.material = entry.originalMaterial;
    }
  }

  // All groups visible in V4
  for (const [, group] of groups) {
    group.visible = true;
  }
}

/* ── Camera Lerp ──────────────────────────────────────────── */

export interface CameraLerpState {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  frame: number;
  totalFrames: number;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function tickCameraLerp(
  lerp: CameraLerpState,
  camera: THREE.Camera,
  controls: { target: THREE.Vector3 },
): boolean {
  lerp.frame++;
  const t = easeInOutCubic(Math.min(lerp.frame / lerp.totalFrames, 1));
  camera.position.lerpVectors(lerp.startPos, lerp.endPos, t);
  controls.target.lerpVectors(lerp.startTarget, lerp.endTarget, t);
  return lerp.frame < lerp.totalFrames;
}

export function createCameraLerpToPreset(
  preset: CameraPresetConfig,
  camera: THREE.Camera,
  controls: { target: THREE.Vector3 },
  frames = 40,
): CameraLerpState {
  return {
    startPos: camera.position.clone(),
    endPos: new THREE.Vector3(...preset.position),
    startTarget: controls.target.clone(),
    endTarget: new THREE.Vector3(...preset.target),
    frame: 0,
    totalFrames: frames,
  };
}
