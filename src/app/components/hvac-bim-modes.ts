/**
 * hvac-bim-modes.ts
 * ─────────────────────────────────────────────────────────────
 * Mode configuration + transition logic for HVAC BIM viewer.
 * 6 view modes: Full System, Supply Air, Return Air,
 * Refrigerant, Floor Plan, Exploded.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { SUPPLY_CYAN, RETURN_SALMON, REFRIG_AMBER, createHighlightMaterial, getDimmedMaterial } from './hvac-bim-materials';

/* ── Types ────────────────────────────────────────────────── */

export type HvacMode =
  | 'assembled'
  | 'supply_air'
  | 'return_air'
  | 'refrigerant'
  | 'floor_plan'
  | 'exploded'
  | 'ahu_cutaway';

export interface ModeConfig {
  id: HvacMode;
  label: string;
  description: string;
  camera: { position: [number, number, number]; target: [number, number, number] };
  highlightGroups?: string[];
  highlightColor?: number;
  dimOpacity?: number;
  hiddenGroups?: string[];
  showParticles?: boolean;
}

/* ── Mode Definitions ─────────────────────────────────────── */

export const MODE_CONFIGS: Record<HvacMode, ModeConfig> = {
  assembled: {
    id: 'assembled',
    label: 'Full System',
    description: 'Sistem HVAC OR lengkap — semua komponen terinstall',
    camera: { position: [12, 10, 12], target: [1, 2.5, 0] },
    showParticles: true,
  },

  supply_air: {
    id: 'supply_air',
    label: 'Supply Air',
    description: 'Jalur supply: AHU → Ducting → LAF → Laminar Flow ke OR',
    camera: { position: [10, 8, 10], target: [1, 3, 0] },
    highlightGroups: ['grp_rooftop', 'grp_supply_duct', 'grp_or_ceiling'],
    highlightColor: SUPPLY_CYAN,
    dimOpacity: 0.08,
    showParticles: true,
  },

  return_air: {
    id: 'return_air',
    label: 'Return Air',
    description: 'Jalur return: Low-wall grilles → Return duct → AHU',
    camera: { position: [10, 6, 12], target: [0, 1.5, 0] },
    highlightGroups: ['grp_return_grilles', 'grp_return_duct', 'grp_rooftop'],
    highlightColor: RETURN_SALMON,
    dimOpacity: 0.08,
  },

  refrigerant: {
    id: 'refrigerant',
    label: 'Refrigerant',
    description: 'Sirkuit refrigerant: Outdoor Unit ↔ AHU Evaporator',
    camera: { position: [12, 10, 8], target: [4, 4, 0] },
    highlightGroups: ['grp_piping', 'grp_rooftop'],
    highlightColor: REFRIG_AMBER,
    dimOpacity: 0.08,
  },

  floor_plan: {
    id: 'floor_plan',
    label: 'Floor Plan',
    description: 'Denah OR tampak atas — posisi equipment & ducting',
    camera: { position: [0, 20, 0.1], target: [0, 0, 0] },
    hiddenGroups: ['grp_rooftop', 'grp_piping', 'grp_supply_duct', 'grp_return_duct', 'grp_particles'],
  },

  exploded: {
    id: 'exploded',
    label: 'Exploded',
    description: 'Layer terpisah — semua subsistem dipisah vertikal',
    camera: { position: [14, 14, 14], target: [0, 3, 0] },
  },

  ahu_cutaway: {
    id: 'ahu_cutaway',
    label: 'AHU Cutaway',
    description: 'Detail internal AHU — filter, coil, fan, UV-C lamp terlihat',
    camera: { position: [10, 1.5, 3], target: [7.5, 0.6, 0] },
    highlightGroups: ['grp_ahu'],
    highlightColor: SUPPLY_CYAN,
    dimOpacity: 0.12,
  },
};

/* ── Explosion Offsets ────────────────────────────────────── */

const EXPLODE_OFFSETS: Record<string, [number, number, number]> = {
  grp_or_interior:   [0, -4.0, 0],   // turun jauh
  grp_building:      [0,  0.0, 0],   // reference
  grp_return_grilles:[0, -2.5, 0],   // turun sedikit
  grp_or_ceiling:    [0, +2.0, 0],   // naik sedikit
  grp_return_duct:   [0, +3.5, 0],   // naik medium
  grp_supply_duct:   [0, +5.0, 0],   // naik
  grp_piping:        [0, +6.5, 0],   // naik lebih
  grp_rooftop:       [0, +8.0, 0],   // naik paling jauh
  grp_particles:     [0, +99, 0],    // hide offscreen
};

/* ── Material Registry for Mode Transitions ───────────────── */

export interface MeshRegistryEntry {
  mesh: THREE.Mesh;
  groupName: string;
  originalMaterial: THREE.Material;
}

/**
 * Snapshot all mesh materials at init time.
 * Returns a flat array for fast iteration during mode transitions.
 */
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

/**
 * Apply a mode to the scene.
 * Swaps materials, sets visibility, applies explosion offsets.
 */
export function applyMode(
  mode: HvacMode,
  groups: Map<string, THREE.Group>,
  registry: MeshRegistryEntry[],
  originalPositions: Map<string, THREE.Vector3>,
): void {
  const config = MODE_CONFIGS[mode];
  const isSubsystem = !!(config.highlightGroups && config.highlightColor);

  // ── Material swap ──
  if (isSubsystem) {
    const highlightSet = new Set(config.highlightGroups!);
    const dimMat = getDimmedMaterial();

    // Cache highlight material clones per group (reuse within group)
    const hlCache = new Map<string, THREE.MeshStandardMaterial>();

    for (const entry of registry) {
      if (highlightSet.has(entry.groupName)) {
        // Highlighted: clone original + emissive tint
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
        // Dimmed
        entry.mesh.material = dimMat;
      }
    }
  } else {
    // Restore originals
    for (const entry of registry) {
      entry.mesh.material = entry.originalMaterial;
    }
  }

  // ── Visibility (for floor_plan hidden groups) ──
  for (const [name, group] of groups) {
    if (config.hiddenGroups?.includes(name)) {
      group.visible = false;
    } else {
      group.visible = true;
    }
  }

  // ── Explosion offsets ──
  if (mode === 'exploded') {
    for (const [name, group] of groups) {
      const offset = EXPLODE_OFFSETS[name];
      const orig = originalPositions.get(name);
      if (offset && orig) {
        group.position.set(
          orig.x + offset[0],
          orig.y + offset[1],
          orig.z + offset[2],
        );
      }
    }
  } else {
    // Reset to original positions
    for (const [name, group] of groups) {
      const orig = originalPositions.get(name);
      if (orig) {
        group.position.copy(orig);
      }
    }
  }

  // ── Particles visibility ──
  const particleGroup = groups.get('grp_particles');
  if (particleGroup) {
    particleGroup.visible = !!config.showParticles;
  }
}

/* ── Camera Lerp State ────────────────────────────────────── */

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

/**
 * Tick camera lerp — call from onTick. Returns true if still active.
 */
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

/**
 * Create a camera lerp state from current to mode target.
 */
export function createCameraLerp(
  mode: HvacMode,
  camera: THREE.Camera,
  controls: { target: THREE.Vector3 },
  frames: number = 40,
): CameraLerpState {
  const cfg = MODE_CONFIGS[mode];
  return {
    startPos: camera.position.clone(),
    endPos: new THREE.Vector3(...cfg.camera.position),
    startTarget: controls.target.clone(),
    endTarget: new THREE.Vector3(...cfg.camera.target),
    frame: 0,
    totalFrames: frames,
  };
}
