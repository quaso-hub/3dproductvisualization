import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {
  createFilterMedia,
  createCondenserFinPack,
  createAccessDoor,
  createDuctHanger,
  createDuctJoint,
  createVibrationIsolator,
  createFlexConnector,
  createMagnehelicGauge,
  createReturnGrilleHighDetail,
  createFlareNut,
} from '../hvac-bim-detail-helpers';
import { CALLOUT_SPECS, MODE_FOCUS_CLUSTERS } from './data';
import type {
  Bag,
  FocusTargetId,
  HvacScenario,
  HvacViewMode,
  PresentationState,
  SceneBundle,
} from './types';

type Point3 = { x: number; y: number; z: number };

type SceneMeshRole =
  | 'pressure-ribbon'
  | 'flow-arrow'
  | 'filter-pre'
  | 'filter-fine'
  | 'coil'
  | 'humidifier'
  | 'uv'
  | 'fan-duty'
  | 'fan-standby'
  | 'drain'
  | 'damper-housing'
  | 'damper-blade'
  | 'damper-actuator'
  | 'service-envelope'
  | 'alarm-panel'
  | 'sensor'
  | 'service-path';

interface BagTone {
  opacityBoost?: number;
  emissive?: number;
  emissiveIntensity?: number;
  groupX?: number;
  groupZ?: number;
}

const C = {
  bg: 0xf2f6fa,
  building: 0x5b9bd5,
  glass: 0xe8f2f8,
  slab: 0xe9eef2,
  equipment: 0x6b7f8e,
  equipmentDark: 0x425560,
  supply: 0x00bcd4,
  supplyHi: 0x00e5ff,
  return: 0xe57373,
  returnHi: 0xff5252,
  refrigerant: 0xffb74d,
  refrigerantHi: 0xffd54f,
  freshAir: 0x4db6ac,
  exhaust: 0xffa726,
  hepa: 0xfdd835,
  filterFine: 0xfff176,
  coil: 0x80deea,
  humidifier: 0x90caf9,
  uv: 0x7c4dff,
  drain: 0x90a4ae,
  sensor: 0x7e57c2,
  alarm: 0xff7043,
  safe: 0x66bb6a,
  warning: 0xffca28,
  steel: 0xa8b3bb,
  service: 0x22c55e,
};

const MODE_OPACITY: Record<string, Record<HvacViewMode, number>> = {
  building:    { full: 0.18, supply: 0.10, return: 0.14, refrigerant: 0.10, plan: 0.22, exploded: 0.12, catalog: 0.28 },
  ahu:         { full: 1,    supply: 1,    return: 0.94, refrigerant: 0.95, plan: 0.92, exploded: 1,    catalog: 1 },
  cdu:         { full: 0.94, supply: 0.16, return: 0.14, refrigerant: 1,    plan: 0.68, exploded: 0.96, catalog: 1 },
  laf:         { full: 1,    supply: 1,    return: 0.2,  refrigerant: 0.1,  plan: 0.92, exploded: 1,    catalog: 1 },
  supplyDuct:  { full: 0.94, supply: 1,    return: 0.08, refrigerant: 0.08, plan: 0.92, exploded: 0.95, catalog: 0.0 },
  returnDuct:  { full: 0.9,  supply: 0.1,  return: 1,    refrigerant: 0.08, plan: 0.9,  exploded: 0.95, catalog: 0.0 },
  grilles:     { full: 1,    supply: 0.12, return: 1,    refrigerant: 0.08, plan: 1,    exploded: 1,    catalog: 0.88 },
  refrigerant: { full: 0.9,  supply: 0.08, return: 0.08, refrigerant: 1,    plan: 0.88, exploded: 0.95, catalog: 0.0 },
  freshAir:    { full: 0.92, supply: 1,    return: 0.18, refrigerant: 0.1,  plan: 0.84, exploded: 0.95, catalog: 0.0 },
  exhaust:     { full: 0.9,  supply: 0.16, return: 0.95, refrigerant: 0.08, plan: 0.84, exploded: 0.95, catalog: 0.0 },
  controls:    { full: 0.95, supply: 0.66, return: 0.74, refrigerant: 0.5,  plan: 0.78, exploded: 1,    catalog: 0.0 },
  maintenance: { full: 0.32, supply: 0.14, return: 0.16, refrigerant: 0.16, plan: 0.36, exploded: 0.88, catalog: 0.0 },
  context:     { full: 0.88, supply: 0.88, return: 0.88, refrigerant: 0.42, plan: 0.72, exploded: 0.88, catalog: 1 },
};

const FOCUS_COLORS: Record<FocusTargetId, number> = {
  'pressure-cascade': C.safe,
  'ahu-treatment': C.service,
  'mixing-box': C.freshAir,
  'laf-canopy': C.supplyHi,
  'return-sweep': C.returnHi,
  'agss-exhaust': C.exhaust,
  'dx-circuit': C.refrigerantHi,
  'controls-bms': C.sensor,
  'service-access': C.safe,
};

const SCENARIO_FOCUS: Record<HvacScenario, FocusTargetId[]> = {
  normal: ['pressure-cascade'],
  'surgery-peak': ['laf-canopy', 'pressure-cascade'],
  purge: ['return-sweep', 'agss-exhaust', 'mixing-box'],
  setback: ['pressure-cascade', 'controls-bms'],
  fault: ['controls-bms', 'ahu-treatment', 'service-access'],
};

const EXPLODED_GROUP_OFFSETS: Record<string, { x: number; z: number }> = {
  building: { x: 0, z: 0 },
  ahu: { x: 0.16, z: 0.06 },
  cdu: { x: -0.14, z: 0.1 },
  supplyDuct: { x: 0.08, z: -0.04 },
  returnDuct: { x: -0.1, z: 0.04 },
  grilles: { x: -0.04, z: 0.06 },
  freshAir: { x: 0.12, z: -0.04 },
  exhaust: { x: 0.18, z: -0.12 },
  controls: { x: -0.1, z: 0.14 },
  maintenance: { x: -0.16, z: 0.18 },
  context: { x: 0, z: 0 },
  laf: { x: 0.06, z: 0.02 },
  refrigerant: { x: 0.14, z: 0.08 },
};

export const CAMERA_POSES: Record<HvacViewMode, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  full: { position: new THREE.Vector3(15.4, 11.4, 15.2), target: new THREE.Vector3(0.7, 1.9, -0.05) },
  supply: { position: new THREE.Vector3(8.8, 8.7, 12.2), target: new THREE.Vector3(1.9, 2.5, -0.05) },
  return: { position: new THREE.Vector3(-4.8, 7.4, 11.2), target: new THREE.Vector3(-0.2, 1.55, 0.1) },
  refrigerant: { position: new THREE.Vector3(11.6, 6.2, 3.9), target: new THREE.Vector3(6.2, 2.05, 0.05) },
  // Plan: tilt sedikit agar OrbitControls tidak gimbal-flip saat user drag
  plan: { position: new THREE.Vector3(0.4, 23.5, 0.6), target: new THREE.Vector3(0.4, 0, 0.4) },
  // Exploded: target Y dinaikkan untuk menampung CDU (turun ke 6.5) + camera mundur
  exploded: { position: new THREE.Vector3(17.6, 14.2, 16.8), target: new THREE.Vector3(1.4, 4.2, 0) },
  catalog: { position: new THREE.Vector3(12.4, 9.2, 11.8), target: new THREE.Vector3(1.2, 1.9, 0) },
};

const LABEL_BAG: Record<FocusTargetId, string> = {
  'pressure-cascade': 'building',
  'ahu-treatment': 'ahu',
  'mixing-box': 'freshAir',
  'laf-canopy': 'laf',
  'return-sweep': 'grilles',
  'agss-exhaust': 'exhaust',
  'dx-circuit': 'refrigerant',
  'controls-bms': 'controls',
  'service-access': 'maintenance',
};

const RAYCASTER = new THREE.Raycaster();

export function buildHvacScene(scene: THREE.Scene): SceneBundle {
  const bundle: SceneBundle = {
    bags: {},
    labels: [],
    focusObjects: [],
  };

  const grid = new THREE.GridHelper(34, 34, 0xbfd0da, 0xdbe6ec);
  grid.position.set(0.5, 0, 0);
  scene.add(grid);

  buildBuilding(scene, bundle);
  buildAHU(scene, bundle);
  buildCDU(scene, bundle);
  buildSupply(scene, bundle);
  buildReturn(scene, bundle);
  buildFreshAir(scene, bundle);
  buildLAF(scene, bundle);
  buildRefrigerant(scene, bundle);
  buildExhaust(scene, bundle);
  buildControls(scene, bundle);
  buildMaintenance(scene, bundle);
  buildContext(scene, bundle);

  // ── MISSING items from kritik_status (2026-05-24) ──
  buildCFMLabels(scene, bundle);
  buildDuctSizeAndElevationTags(scene, bundle);
  buildAGSSStackLabel(scene, bundle);

  registerLabels(bundle);
  return bundle;
}

export function pickFocusTarget(bundle: SceneBundle, camera: THREE.Camera, pointer: THREE.Vector2): FocusTargetId | null {
  RAYCASTER.setFromCamera(pointer, camera);
  const hits = RAYCASTER.intersectObjects(bundle.focusObjects, false);
  for (const hit of hits) {
    let current: THREE.Object3D | null = hit.object;
    while (current) {
      const focusTarget = current.userData.focusTarget as FocusTargetId | undefined;
      if (focusTarget) return focusTarget;
      current = current.parent;
    }
  }
  return null;
}

export function applyPresentation(bundle: SceneBundle, state: PresentationState): void {
  const activeFocus = state.selectedFocus ?? state.hoveredFocus;
  const modeCluster = activeFocus ? [] : (MODE_FOCUS_CLUSTERS[state.mode] ?? []);
  const scenarioCluster = (state.mode === 'catalog' || activeFocus) ? [] : SCENARIO_FOCUS[state.scenario];

  Object.values(bundle.bags).forEach((bag) => {
    const rawBaseOpacity = MODE_OPACITY[bag.key]?.[state.mode] ?? 1;

    // True zero: hide entire group including MeshBasicMaterial arrows and LineSegments
    if (rawBaseOpacity <= 0.005) {
      bag.group.visible = false;
      return;
    }

    const baseOpacity = rawBaseOpacity;
    const focusMatch = activeFocus ? bag.focusTargets.includes(activeFocus) : false;
    const clusterMatch = !activeFocus && bag.focusTargets.some((focusTarget) => modeCluster.includes(focusTarget));
    const scenarioMatch = !activeFocus && bag.focusTargets.some((focusTarget) => scenarioCluster.includes(focusTarget));

    const bagTone = resolveBagTone(state, bag.key);
    const roleTone = resolveRoleTone(state, bag.key);

    let opacity = clamp(baseOpacity + (bagTone.opacityBoost ?? 0) + (roleTone.opacityBoost ?? 0), 0.02, 1);
    let emissive = bagTone.emissive ?? roleTone.emissive ?? 0x000000;
    let emissiveIntensity = Math.max(bagTone.emissiveIntensity ?? 0, roleTone.emissiveIntensity ?? 0);

    if (focusMatch && activeFocus) {
      opacity = Math.max(baseOpacity, 0.98);
      emissive = FOCUS_COLORS[activeFocus];
      emissiveIntensity = state.selectedFocus ? 0.42 : 0.24;
    } else if (activeFocus) {
      opacity = Math.max(0.035, baseOpacity * (state.mode === 'full' ? 0.16 : 0.22));
    } else if (clusterMatch && modeCluster.length > 0) {
      opacity = Math.max(baseOpacity, 0.95);
      const firstTarget = bag.focusTargets.find((focusTarget) => modeCluster.includes(focusTarget));
      if (firstTarget) {
        emissive = FOCUS_COLORS[firstTarget];
        emissiveIntensity = 0.16;
      }
    } else if (scenarioMatch) {
      opacity = Math.max(baseOpacity, 0.88);
      const firstTarget = bag.focusTargets.find((focusTarget) => scenarioCluster.includes(focusTarget));
      if (firstTarget) {
        emissive = state.scenario === 'fault' ? C.alarm : FOCUS_COLORS[firstTarget];
        emissiveIntensity = state.scenario === 'fault' ? 0.24 : 0.08;
      }
    }

    bag.group.visible = opacity > 0.01;
    const offset = state.mode === 'exploded' ? (EXPLODED_GROUP_OFFSETS[bag.key] ?? { x: 0, z: 0 }) : { x: 0, z: 0 };
    bag.group.position.set(offset.x, bag.group.position.y, offset.z);
    bag.mats.forEach((material) => {
      material.visible = opacity > 0.01;
      material.transparent = opacity < 0.995;
      material.opacity = opacity;
      // emissive props only exist on MeshStandardMaterial; LineBasicMaterial entries skip
      const std = material as Partial<THREE.MeshStandardMaterial>;
      if (std.emissive && typeof std.emissive.setHex === 'function') {
        std.emissive.setHex(emissive);
        std.emissiveIntensity = emissiveIntensity;
      }
      material.needsUpdate = true;
    });
    applyRoleStateToBag(bag, state, opacity);
    animateGroupY(bag.group, state.mode === 'exploded' ? bag.explodedY : 0);
  });

  bundle.labels.forEach(({ spec, object }) => {
    object.visible = isCalloutVisible(spec, state);
  });
}

function isCalloutVisible(
  spec: (typeof CALLOUT_SPECS)[number],
  state: PresentationState,
): boolean {
  if (!spec.modes.includes(state.mode)) return false;
  // Catalog mode: only show anchor labels (room/system names), no interactive labels
  if (state.mode === 'catalog') return spec.trigger === 'always';
  switch (spec.trigger) {
    case 'always':
      return !state.hoveredFocus && !state.selectedFocus;
    case 'focused':
      return !state.hoveredFocus && !state.selectedFocus && (MODE_FOCUS_CLUSTERS[state.mode] ?? []).includes(spec.targetId);
    case 'hover':
      return !state.selectedFocus && state.hoveredFocus === spec.targetId;
    case 'selected':
      return state.selectedFocus === spec.targetId;
    default:
      return false;
  }
}

function animateGroupY(group: THREE.Group, targetY: number): void {
  const currentTarget = group.userData.groupYTarget as number | undefined;
  if (currentTarget === targetY && Math.abs(group.position.y - targetY) < 0.001) return;
  const start = group.position.y;
  const startTime = performance.now();
  const duration = 820;
  const token = ((group.userData.groupYToken as number | undefined) ?? 0) + 1;
  group.userData.groupYToken = token;
  group.userData.groupYTarget = targetY;
  const tick = () => {
    if (group.userData.groupYToken !== token) return;
    const t = Math.min((performance.now() - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    group.position.y = start + (targetY - start) * eased;
    if (t < 1) requestAnimationFrame(tick);
    else group.userData.groupYTarget = targetY;
  };
  requestAnimationFrame(tick);
}

function resolveBagTone(state: PresentationState, bagKey: string): BagTone {
  if (state.mode === 'catalog') return {};
  switch (state.scenario) {
    case 'surgery-peak':
      switch (bagKey) {
        case 'building':
          return { emissive: C.safe, emissiveIntensity: 0.12 };
        case 'ahu':
          return { opacityBoost: 0.04, emissive: C.supplyHi, emissiveIntensity: 0.16 };
        case 'supplyDuct':
        case 'freshAir':
          return { opacityBoost: 0.08, emissive: C.supply, emissiveIntensity: 0.14 };
        case 'laf':
          return { opacityBoost: 0.1, emissive: C.supplyHi, emissiveIntensity: 0.2 };
        case 'controls':
          return { opacityBoost: 0.04, emissive: C.sensor, emissiveIntensity: 0.08 };
        default:
          return {};
      }
    case 'purge':
      switch (bagKey) {
        case 'building':
          return { emissive: C.warning, emissiveIntensity: 0.15 };
        case 'returnDuct':
        case 'grilles':
        case 'exhaust':
          return { opacityBoost: 0.12, emissive: C.exhaust, emissiveIntensity: 0.2 };
        case 'freshAir':
          return { opacityBoost: 0.08, emissive: C.freshAir, emissiveIntensity: 0.12 };
        case 'supplyDuct':
          return { opacityBoost: -0.06, emissive: C.supply, emissiveIntensity: 0.04 };
        case 'controls':
          return { opacityBoost: 0.08, emissive: C.warning, emissiveIntensity: 0.12 };
        default:
          return {};
      }
    case 'setback':
      switch (bagKey) {
        case 'building':
          return { emissive: C.safe, emissiveIntensity: 0.08 };
        case 'supplyDuct':
        case 'freshAir':
        case 'laf':
          return { opacityBoost: -0.12, emissive: C.supply, emissiveIntensity: 0.05 };
        case 'ahu':
          return { opacityBoost: -0.05, emissive: C.equipmentDark, emissiveIntensity: 0.04 };
        case 'controls':
          return { opacityBoost: 0.06, emissive: C.sensor, emissiveIntensity: 0.08 };
        default:
          return {};
      }
    case 'fault':
      switch (bagKey) {
        case 'building':
          return { emissive: C.alarm, emissiveIntensity: 0.18 };
        case 'ahu':
          return { opacityBoost: 0.04, emissive: C.alarm, emissiveIntensity: 0.2 };
        case 'controls':
          return { opacityBoost: 0.1, emissive: C.alarm, emissiveIntensity: 0.32 };
        case 'supplyDuct':
        case 'freshAir':
          return { opacityBoost: -0.1, emissive: C.warning, emissiveIntensity: 0.08 };
        case 'returnDuct':
          return { opacityBoost: 0.04, emissive: C.returnHi, emissiveIntensity: 0.12 };
        case 'laf':
          return { opacityBoost: -0.04, emissive: C.warning, emissiveIntensity: 0.12 };
        default:
          return {};
      }
    case 'normal':
    default:
      return bagKey === 'building' ? { emissive: C.safe, emissiveIntensity: 0.06 } : {};
  }
}

function resolveRoleTone(state: PresentationState, bagKey: string): BagTone {
  if (state.mode === 'catalog') return {};
  if (state.mode === 'exploded') {
    switch (bagKey) {
      case 'maintenance':
        return { opacityBoost: 0.1, emissive: C.service, emissiveIntensity: 0.2 };
      case 'controls':
        return { opacityBoost: 0.08, emissive: C.sensor, emissiveIntensity: 0.12 };
      case 'ahu':
        return { opacityBoost: 0.04, emissive: C.service, emissiveIntensity: 0.12 };
      case 'cdu':
      case 'refrigerant':
        return { opacityBoost: 0.04, emissive: C.refrigerant, emissiveIntensity: 0.1 };
      case 'supplyDuct':
      case 'returnDuct':
      case 'exhaust':
      case 'freshAir':
        return { opacityBoost: 0.02, emissive: C.steel, emissiveIntensity: 0.03 };
      case 'building':
        return { opacityBoost: -0.02, emissive: C.safe, emissiveIntensity: 0.05 };
      default:
        return {};
    }
  }

  if (state.scenario === 'fault') {
    switch (bagKey) {
      case 'controls':
        return { emissive: C.alarm, emissiveIntensity: 0.34 };
      case 'ahu':
        return { emissive: C.alarm, emissiveIntensity: 0.24 };
      default:
        return {};
    }
  }

  return {};
}

function applyRoleStateToBag(bag: Bag, state: PresentationState, opacity: number): void {
  bag.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const role = object.userData.role as string | undefined;
    if (!role) return;

    object.visible = true; // reset before role processing — fix mode switching artifacts

    // Catalog mode: hide technical clutter for clean product-catalog look
    if (state.mode === 'catalog') {
      if (
        role === 'flow-arrow' || role === 'pressure-ribbon' ||
        role === 'service-envelope' || role === 'service-path' ||
        role.endsWith('-blade') || role.endsWith('-actuator')
      ) {
        object.visible = false;
        return;
      }
      return; // skip all other scenario-specific role tweaks in catalog mode
    }

    if (role === 'flow-arrow') {
      if (state.scenario === 'fault') {
        setMeshAppearance(object, { color: C.warning, emissive: C.alarm, emissiveIntensity: 0.12, opacity: Math.min(opacity, 0.72) });
      } else if (state.scenario === 'purge') {
        setMeshAppearance(object, { color: C.exhaust, emissive: C.exhaust, emissiveIntensity: 0.16, opacity: Math.min(opacity + 0.08, 0.9) });
      } else if (state.scenario === 'surgery-peak') {
        setMeshAppearance(object, { color: C.supplyHi, emissive: C.supplyHi, emissiveIntensity: 0.14, opacity: Math.min(opacity + 0.06, 0.92) });
      } else if (state.scenario === 'setback') {
        setMeshAppearance(object, { color: C.safe, emissive: C.safe, emissiveIntensity: 0.05, opacity: Math.min(opacity - 0.08, 0.7) });
      }
      return;
    }

    if (role === 'pressure-ribbon') {
      if (state.scenario === 'fault') {
        setMeshAppearance(object, { color: C.alarm, emissive: C.alarm, emissiveIntensity: 0.28, opacity: 0.34, scaleX: 1, scaleY: 1.08, scaleZ: 1 });
      } else if (state.scenario === 'purge') {
        setMeshAppearance(object, { color: C.warning, emissive: C.warning, emissiveIntensity: 0.22, opacity: 0.28, scaleX: 1.1, scaleY: 0.9, scaleZ: 1 });
      } else if (state.scenario === 'setback') {
        setMeshAppearance(object, { color: C.safe, emissive: C.safe, emissiveIntensity: 0.16, opacity: 0.22, scaleX: 0.92, scaleY: 0.85, scaleZ: 1 });
      } else if (state.scenario === 'surgery-peak') {
        setMeshAppearance(object, { color: C.safe, emissive: C.safe, emissiveIntensity: 0.22, opacity: 0.34, scaleX: 1.16, scaleY: 1.02, scaleZ: 1 });
      }
      return;
    }

    if (role === 'filter-pre' || role === 'filter-fine') {
      if (state.scenario === 'fault') {
        setMeshAppearance(object, { color: 0x8d6e63, emissive: C.warning, emissiveIntensity: 0.16, opacity: Math.min(opacity, role === 'filter-pre' ? 0.78 : 0.82) });
      } else if (state.scenario === 'setback') {
        setMeshAppearance(object, { color: 0xd4c46e, emissive: C.warning, emissiveIntensity: 0.06, opacity: Math.min(opacity - 0.04, 0.88) });
      }
      return;
    }

    if (role === 'fan-duty' || role === 'fan-standby') {
      const baseRotation = object.userData.baseRotation as { x: number; y: number; z: number } | undefined;
      if (state.scenario === 'fault') {
        setMeshAppearance(object, {
          color: role === 'fan-duty' ? C.alarm : C.safe,
          emissive: role === 'fan-duty' ? C.alarm : C.safe,
          emissiveIntensity: role === 'fan-duty' ? 0.22 : 0.12,
          opacity: role === 'fan-duty' ? Math.min(opacity, 0.78) : Math.min(opacity + 0.08, 0.96),
        });
        object.rotation.z = (baseRotation?.z ?? object.rotation.z) + (role === 'fan-duty' ? 0.18 : -0.1);
      } else if (state.scenario === 'surgery-peak') {
        setMeshAppearance(object, {
          color: role === 'fan-duty' ? C.supplyHi : C.safe,
          emissive: role === 'fan-duty' ? C.supplyHi : C.safe,
          emissiveIntensity: role === 'fan-duty' ? 0.18 : 0.08,
          opacity: role === 'fan-duty' ? Math.min(opacity + 0.04, 0.98) : Math.min(opacity, 0.82),
        });
        object.rotation.z = (baseRotation?.z ?? object.rotation.z) + (role === 'fan-duty' ? 0.04 : -0.04);
      } else if (state.scenario === 'purge') {
        setMeshAppearance(object, {
          color: C.warning,
          emissive: C.warning,
          emissiveIntensity: 0.14,
          opacity: Math.min(opacity + 0.04, 0.92),
        });
        object.rotation.z = (baseRotation?.z ?? object.rotation.z) + (role === 'fan-duty' ? 0.12 : -0.12);
      } else if (state.scenario === 'setback') {
        setMeshAppearance(object, {
          color: role === 'fan-duty' ? C.equipmentDark : C.safe,
          emissive: role === 'fan-duty' ? C.equipmentDark : C.safe,
          emissiveIntensity: role === 'fan-duty' ? 0.04 : 0.06,
          opacity: role === 'fan-duty' ? Math.min(opacity - 0.08, 0.84) : Math.min(opacity - 0.02, 0.9),
        });
        object.rotation.z = (baseRotation?.z ?? object.rotation.z) + (role === 'fan-duty' ? 0.02 : -0.02);
      }
      return;
    }

    if (role.endsWith('-housing') || role.endsWith('-blade') || role.endsWith('-actuator')) {
      const baseRotation = object.userData.baseRotation as { x: number; y: number; z: number } | undefined;
      if (state.scenario === 'fault') {
        setMeshAppearance(object, { color: role.endsWith('-blade') ? C.warning : C.equipmentDark, emissive: C.warning, emissiveIntensity: 0.08, opacity: Math.min(opacity, 0.88) });
        if (role.endsWith('-blade')) object.rotation.z = (baseRotation?.z ?? object.rotation.z) + 0.1;
      } else if (state.scenario === 'purge') {
        setMeshAppearance(object, { color: role.endsWith('-blade') ? C.exhaust : C.equipmentDark, emissive: C.exhaust, emissiveIntensity: 0.08, opacity: Math.min(opacity + 0.04, 0.96) });
        if (role.endsWith('-blade')) object.rotation.z = (baseRotation?.z ?? object.rotation.z) - 0.14;
      } else if (state.scenario === 'setback') {
        setMeshAppearance(object, { color: role.endsWith('-blade') ? C.safe : C.equipmentDark, emissive: C.safe, emissiveIntensity: 0.05, opacity: Math.min(opacity - 0.04, 0.84) });
        if (role.endsWith('-blade')) object.rotation.z = (baseRotation?.z ?? object.rotation.z) + 0.04;
      } else if (state.scenario === 'surgery-peak') {
        setMeshAppearance(object, { color: role.endsWith('-blade') ? C.supplyHi : C.equipmentDark, emissive: C.supplyHi, emissiveIntensity: 0.06, opacity: Math.min(opacity + 0.05, 0.98) });
        if (role.endsWith('-blade')) object.rotation.z = (baseRotation?.z ?? object.rotation.z) - 0.05;
      }
      return;
    }

    if (role === 'service-envelope' || role === 'service-path') {
      if (state.mode === 'exploded') {
        setMeshAppearance(object, { color: C.service, emissive: C.service, emissiveIntensity: 0.14, opacity: Math.max(opacity, 0.24) });
      }
      return;
    }

    if (role === 'alarm-panel' || role === 'sensor') {
      if (state.scenario === 'fault') {
        setMeshAppearance(object, { color: C.alarm, emissive: C.alarm, emissiveIntensity: 0.24, opacity: Math.min(opacity + 0.08, 0.96) });
      } else if (state.mode === 'exploded') {
        setMeshAppearance(object, { color: C.sensor, emissive: C.sensor, emissiveIntensity: 0.1, opacity: Math.min(opacity + 0.06, 0.94) });
      }
    }
  });
}

function setMeshAppearance(
  object: THREE.Mesh,
  appearance: {
    color?: number;
    emissive?: number;
    emissiveIntensity?: number;
    opacity?: number;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
  },
): void {
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  materials.forEach((material) => {
    if (!material) return;
    if ('color' in material && appearance.color !== undefined) {
      material.color.setHex(appearance.color);
    }
    if ('emissive' in material && appearance.emissive !== undefined) {
      material.emissive.setHex(appearance.emissive);
    }
    if ('emissiveIntensity' in material && appearance.emissiveIntensity !== undefined) {
      material.emissiveIntensity = appearance.emissiveIntensity;
    }
    if ('opacity' in material && appearance.opacity !== undefined) {
      material.opacity = appearance.opacity;
      material.transparent = appearance.opacity < 0.995;
    }
    material.needsUpdate = true;
  });
  if (appearance.scaleX !== undefined) object.scale.x = appearance.scaleX;
  if (appearance.scaleY !== undefined) object.scale.y = appearance.scaleY;
  if (appearance.scaleZ !== undefined) object.scale.z = appearance.scaleZ;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function registerLabels(bundle: SceneBundle): void {
  CALLOUT_SPECS.forEach((spec) => {
    const bag = bundle.bags[LABEL_BAG[spec.targetId]];
    if (!bag) return;
    const div = document.createElement('div');
    div.textContent = spec.text;
    div.style.cssText = [
      'pointer-events:none',
      'white-space:nowrap',
      'border-radius:0',
      'padding:4px 10px',
      'font-family:"JetBrains Mono", ui-monospace, monospace',
      `font-size:${spec.priority === 'anchor' ? '10px' : '9px'}`,
      `font-weight:${spec.priority === 'anchor' ? '600' : '500'}`,
      'text-transform:uppercase',
      'letter-spacing:0.02em',
      'color:#1a1a1a',
      'background:rgba(255,255,255,0.95)',
      `border-left:3px solid ${spec.accent}`,
    ].join(';');
    const label = new CSS2DObject(div);
    label.position.set(spec.position[0], spec.position[1], spec.position[2]);
    label.visible = false;
    bag.group.add(label);
    bundle.labels.push({ spec, object: label });
  });
}

function makeBag(scene: THREE.Scene, bundle: SceneBundle, key: string, explodedY: number, focusTargets: FocusTargetId[] = []): Bag {
  const group = new THREE.Group();
  group.name = key;
  scene.add(group);
  const bag: Bag = { key, group, mats: [], explodedY, focusTargets };
  bundle.bags[key] = bag;
  return bag;
}

function addMesh(
  bag: Bag,
  bundle: SceneBundle,
  geometry: THREE.BufferGeometry,
  color: number,
  focusTarget: FocusTargetId | null,
  opts: {
    roughness?: number;
    metalness?: number;
    transparent?: boolean;
    opacity?: number;
    emissive?: number;
    emissiveIntensity?: number;
    side?: THREE.Side;
    depthWrite?: boolean;
  } = {},
): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.58,
    metalness: opts.metalness ?? 0.12,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    emissive: new THREE.Color(opts.emissive ?? 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (focusTarget) {
    mesh.userData.focusTarget = focusTarget;
    bundle.focusObjects.push(mesh);
  }
  bag.group.add(mesh);
  bag.mats.push(material);
  return mesh;
}

function box(
  bag: Bag,
  bundle: SceneBundle,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
  focusTarget: FocusTargetId | null,
  opts: Parameters<typeof addMesh>[5] = {},
): THREE.Mesh {
  const mesh = addMesh(bag, bundle, new THREE.BoxGeometry(w, h, d), color, focusTarget, opts);
  mesh.position.set(x, y, z);
  return mesh;
}

function cylinderBetween(
  bag: Bag,
  bundle: SceneBundle,
  start: Point3,
  end: Point3,
  radius: number,
  color: number,
  focusTarget: FocusTargetId | null,
  opts: Parameters<typeof addMesh>[5] = {},
): THREE.Mesh | null {
  const a = new THREE.Vector3(start.x, start.y, start.z);
  const b = new THREE.Vector3(end.x, end.y, end.z);
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 0.001) return null;
  const mesh = addMesh(bag, bundle, new THREE.CylinderGeometry(radius, radius, len, 12), color, focusTarget, opts);
  mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

function addEdges(bag: Bag, geometry: THREE.BufferGeometry, color: number, position: Point3): void {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1.0 });
  const line = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), mat);
  line.position.set(position.x, position.y, position.z);
  line.userData.role = 'edges';
  // Register the edge material as a "MeshStandardMaterial-shaped" entry so the bag
  // opacity state machine fades edges with their bag. We coerce via Object.defineProperty
  // to avoid TypeScript noise — emissive/emissiveIntensity are no-ops on LineBasicMaterial
  // but `opacity` and `visible` are honored.
  bag.mats.push(mat as unknown as THREE.MeshStandardMaterial);
  bag.group.add(line);
}

function addArrow(bag: Bag, from: Point3, to: Point3, color: number, radius = 0.022, role: SceneMeshRole = 'flow-arrow'): void {
  const start = new THREE.Vector3(from.x, from.y, from.z);
  const end = new THREE.Vector3(to.x, to.y, to.z);
  const dir = end.clone().sub(start);
  const len = dir.length();
  if (len < 0.001) return;
  const shaftEnd = end.clone().addScaledVector(dir.clone().normalize(), -0.14);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, start.distanceTo(shaftEnd), 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
  );
  shaft.position.copy(start.clone().add(shaftEnd).multiplyScalar(0.5));
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  shaft.userData.role = role;
  bag.group.add(shaft);
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 2.2, 0.22, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.84 }),
  );
  head.position.copy(end.clone().addScaledVector(dir.clone().normalize(), -0.06));
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  head.userData.role = role;
  bag.group.add(head);
}

function setRole(object: THREE.Object3D, role: string): void {
  object.userData.role = role;
}

function addHanger(bag: Bag, bundle: SceneBundle, x: number, y: number, z: number, width: number, focusTarget: FocusTargetId | null, rodLength = 0.38): void {
  const rodOffset = width / 2 - 0.05;
  box(bag, bundle, x - rodOffset, y + rodLength / 2, z, 0.016, rodLength, 0.016, C.steel, focusTarget, { roughness: 0.65 });
  box(bag, bundle, x + rodOffset, y + rodLength / 2, z, 0.016, rodLength, 0.016, C.steel, focusTarget, { roughness: 0.65 });
  box(bag, bundle, x, y + 0.01, z, width + 0.08, 0.015, 0.03, 0x78909c, focusTarget, { roughness: 0.65 });
}

function addDamper(
  bag: Bag,
  bundle: SceneBundle,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  bladeAxis: 'x' | 'z',
  focusTarget: FocusTargetId | null,
  bladeColor = C.warning,
  role = 'damper',
): void {
  const housing = box(bag, bundle, x, y, z, w, h, d, C.equipmentDark, focusTarget, { roughness: 0.5, metalness: 0.25 });
  setRole(housing, `${role}-housing`);
  const blade = box(bag, bundle, x, y, z, w - 0.03, 0.02, d - 0.03, bladeColor, focusTarget, { roughness: 0.45, metalness: 0.2 });
  if (bladeAxis === 'x') blade.rotation.z = Math.PI / 8;
  else blade.rotation.x = Math.PI / 8;
  blade.userData.baseRotation = { x: blade.rotation.x, y: blade.rotation.y, z: blade.rotation.z };
  setRole(blade, `${role}-blade`);
  const actuator = box(bag, bundle, x, y + h / 2 + 0.06, z, 0.07, 0.06, 0.1, C.equipment, focusTarget, { roughness: 0.4 });
  setRole(actuator, `${role}-actuator`);
}

function addFireSmokeDamper(
  bag: Bag,
  bundle: SceneBundle,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  focusTarget: FocusTargetId | null,
  role = 'firedamper',
): void {
  const housing = box(bag, bundle, x, y, z, w, h, d, C.equipmentDark, focusTarget, { roughness: 0.45, metalness: 0.2 });
  setRole(housing, `${role}-housing`);
  const blade = box(bag, bundle, x, y, z, w - 0.05, h - 0.05, d - 0.05, 0xb91c1c, focusTarget, { roughness: 0.7, metalness: 0.15 });
  setRole(blade, `${role}-blade`);
  const actuator = box(bag, bundle, x, y + h / 2 + 0.05, z, 0.08, 0.05, 0.08, 0xef4444, focusTarget, { roughness: 0.45 });
  setRole(actuator, `${role}-actuator`);
}

function addGhostBox(
  bag: Bag,
  bundle: SceneBundle,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
  focusTarget: FocusTargetId | null,
  opacity: number,
  role: SceneMeshRole = 'service-envelope',
): void {
  const mesh = box(bag, bundle, x, y, z, w, h, d, color, focusTarget, {
    transparent: true,
    opacity,
    roughness: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  setRole(mesh, role);
}

/* ── Architectural detail helpers ─────────────────────────── */

function addFloorGrid(
  bag: Bag, bundle: SceneBundle,
  cx: number, cz: number,
  width: number, depth: number,
  tileSize: number, color: number,
): void {
  const lineW = 0.012;
  const y = 0.003;
  for (let x = cx - width / 2 + tileSize; x < cx + width / 2 - 0.01; x += tileSize) {
    box(bag, bundle, x, y, cz, lineW, 0.003, depth, color, 'pressure-cascade', { roughness: 1, metalness: 0 });
  }
  for (let z = cz - depth / 2 + tileSize; z < cz + depth / 2 - 0.01; z += tileSize) {
    box(bag, bundle, cx, y, z, width, 0.003, lineW, color, 'pressure-cascade', { roughness: 1, metalness: 0 });
  }
}

function addCovedStrips(bag: Bag, bundle: SceneBundle, cx: number, cz: number, w: number, d: number, color: number): void {
  const h = 0.1;
  const t = 0.02;
  box(bag, bundle, cx + w / 2 - t / 2, h / 2, cz, t, h, d, color, 'pressure-cascade', { roughness: 0.7 });
  box(bag, bundle, cx - w / 2 + t / 2, h / 2, cz, t, h, d, color, 'pressure-cascade', { roughness: 0.7 });
  box(bag, bundle, cx, h / 2, cz + d / 2 - t / 2, w, h, t, color, 'pressure-cascade', { roughness: 0.7 });
  box(bag, bundle, cx, h / 2, cz - d / 2 + t / 2, w, h, t, color, 'pressure-cascade', { roughness: 0.7 });
}

function addWallPanelJoints(
  bag: Bag, bundle: SceneBundle,
  cx: number, cy: number, cz: number,
  w: number, h: number, d: number,
  panelW: number, color: number,
): void {
  const lineT = 0.008;
  const off = 0.003;
  for (let x = cx - w / 2 + panelW; x < cx + w / 2 - 0.01; x += panelW) {
    box(bag, bundle, x, cy, cz + d / 2 + off, lineT, h, lineT, color, 'pressure-cascade', { roughness: 0.5 });
    box(bag, bundle, x, cy, cz - d / 2 - off, lineT, h, lineT, color, 'pressure-cascade', { roughness: 0.5 });
  }
  for (let z = cz - d / 2 + panelW; z < cz + d / 2 - 0.01; z += panelW) {
    box(bag, bundle, cx + w / 2 + off, cy, z, lineT, h, lineT, color, 'pressure-cascade', { roughness: 0.5 });
    box(bag, bundle, cx - w / 2 - off, cy, z, lineT, h, lineT, color, 'pressure-cascade', { roughness: 0.5 });
  }
  box(bag, bundle, cx, cy, cz + d / 2 + off, w, lineT, lineT, color, 'pressure-cascade', { roughness: 0.5 });
  box(bag, bundle, cx, cy, cz - d / 2 - off, w, lineT, lineT, color, 'pressure-cascade', { roughness: 0.5 });
  box(bag, bundle, cx + w / 2 + off, cy, cz, lineT, lineT, d, color, 'pressure-cascade', { roughness: 0.5 });
  box(bag, bundle, cx - w / 2 - off, cy, cz, lineT, lineT, d, color, 'pressure-cascade', { roughness: 0.5 });
}

function addDoorFrame(
  bag: Bag, bundle: SceneBundle,
  x: number, z: number,
  width: number, height: number,
  frameDepth: number, axis: 'x' | 'z', color: number,
): void {
  const ft = 0.04;
  if (axis === 'z') {
    box(bag, bundle, x - width / 2, height / 2, z, ft, height, frameDepth, color, 'pressure-cascade', { roughness: 0.3, metalness: 0.5 });
    box(bag, bundle, x + width / 2, height / 2, z, ft, height, frameDepth, color, 'pressure-cascade', { roughness: 0.3, metalness: 0.5 });
    box(bag, bundle, x, height + ft / 2, z, width + ft * 2, ft, frameDepth, color, 'pressure-cascade', { roughness: 0.3, metalness: 0.5 });
  } else {
    box(bag, bundle, x, height / 2, z - width / 2, frameDepth, height, ft, color, 'pressure-cascade', { roughness: 0.3, metalness: 0.5 });
    box(bag, bundle, x, height / 2, z + width / 2, frameDepth, height, ft, color, 'pressure-cascade', { roughness: 0.3, metalness: 0.5 });
    box(bag, bundle, x, height + ft / 2, z, frameDepth, ft, width + ft * 2, color, 'pressure-cascade', { roughness: 0.3, metalness: 0.5 });
  }
}

function addCeilingGrid(
  bag: Bag, bundle: SceneBundle,
  cx: number, cz: number,
  width: number, depth: number,
  tileSize: number, y: number, color: number,
): void {
  const barW = 0.025;
  const barH = 0.035;
  for (let x = cx - width / 2; x <= cx + width / 2 + 0.01; x += tileSize) {
    box(bag, bundle, x, y - barH / 2, cz, barW, barH, depth, color, 'pressure-cascade', { roughness: 0.4, metalness: 0.3 });
  }
  for (let z = cz - depth / 2; z <= cz + depth / 2 + 0.01; z += tileSize) {
    box(bag, bundle, cx, y - barH / 2, z, width, barH, barW, color, 'pressure-cascade', { roughness: 0.4, metalness: 0.3 });
  }
}

function buildBuilding(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'building', 0, ['pressure-cascade']);

  const orGeo = new THREE.BoxGeometry(6, 3, 6);
  const orShell = addMesh(bag, bundle, orGeo, C.glass, 'pressure-cascade', {
    transparent: true,
    opacity: 0.14,
    roughness: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  orShell.position.set(0, 1.5, 0);
  addEdges(bag, orGeo, 0x4a8fc8, { x: 0, y: 1.5, z: 0 });

  const mechGeo = new THREE.BoxGeometry(4.3, 3.25, 4.3);
  const mechShell = addMesh(bag, bundle, mechGeo, C.glass, 'pressure-cascade', {
    transparent: true,
    opacity: 0.10,
    roughness: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  mechShell.position.set(6.45, 1.62, 0);
  addEdges(bag, mechGeo, 0x4a8fc8, { x: 6.45, y: 1.62, z: 0 });

  const anteGeo = new THREE.BoxGeometry(1.7, 3, 2.2);
  const anteShell = addMesh(bag, bundle, anteGeo, 0xd5ecff, 'pressure-cascade', {
    transparent: true,
    opacity: 0.12,
    roughness: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  anteShell.position.set(-4.15, 1.5, 0);
  addEdges(bag, anteGeo, 0x7bb8ef, { x: -4.15, y: 1.5, z: 0 });

  const corridorGeo = new THREE.BoxGeometry(2.1, 3, 2.5);
  const corridorShell = addMesh(bag, bundle, corridorGeo, C.glass, 'pressure-cascade', {
    transparent: true,
    opacity: 0.08,
    roughness: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  corridorShell.position.set(-6.3, 1.5, 0);
  addEdges(bag, corridorGeo, 0x8aa8b8, { x: -6.3, y: 1.5, z: 0 });

  const prepGeo = new THREE.BoxGeometry(1.5, 3, 2.4);
  const prepShell = addMesh(bag, bundle, prepGeo, C.glass, 'pressure-cascade', {
    transparent: true,
    opacity: 0.08,
    roughness: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  prepShell.position.set(-2.6, 1.5, 3.35);
  addEdges(bag, prepGeo, 0x9db5c4, { x: -2.6, y: 1.5, z: 3.35 });

  // ── Floors (registered in bag.mats for opacity state machine) ──
  const orFloor = addMesh(bag, bundle, new THREE.PlaneGeometry(6, 6), 0xdfe6ec, 'pressure-cascade', { roughness: 0.85, metalness: 0.05 });
  orFloor.rotation.x = -Math.PI / 2;
  orFloor.position.set(0, 0.001, 0);
  orFloor.receiveShadow = true;

  const mechFloor = addMesh(bag, bundle, new THREE.PlaneGeometry(4.3, 4.3), 0xcdd5db, 'pressure-cascade', { roughness: 0.92, metalness: 0.02 });
  mechFloor.rotation.x = -Math.PI / 2;
  mechFloor.position.set(6.45, 0.001, 0);
  mechFloor.receiveShadow = true;

  // ── Floor tile grid (OR room — 600mm hospital vinyl tiles) ──
  addFloorGrid(bag, bundle, 0, 0, 6, 6, 0.6, 0xb8c5cf);

  // ── Coved base strips (OR room — infection control perimeter) ──
  addCovedStrips(bag, bundle, 0, 0, 6, 6, 0xc8d4dc);

  // ── Wall panel joints (OR room — 1200mm cleanroom sandwich panels) ──
  addWallPanelJoints(bag, bundle, 0, 1.5, 0, 6, 3, 6, 1.2, 0x8faab8);

  // ── Door frames ──
  addDoorFrame(bag, bundle, -3.0, 0, 0.9, 2.1, 0.15, 'z', C.steel);   // OR → Anteroom
  addDoorFrame(bag, bundle, -5.3, 0, 0.9, 2.1, 0.15, 'z', C.steel);   // Anteroom → Corridor
  addDoorFrame(bag, bundle, -1.85, 2.15, 0.9, 2.1, 0.15, 'x', C.steel); // OR → Prep

  // ── Ceiling T-bar grid (OR room — 600mm exposed grid) ──
  addCeilingGrid(bag, bundle, 0, 0, 6, 6, 0.6, 3.0, 0xd0d8de);

  // ── Plenum + roof pad ──
  const plenum = addMesh(bag, bundle, new THREE.BoxGeometry(6.2, 0.08, 6.15), 0xdce8ef, 'pressure-cascade', {
    transparent: true, opacity: 0.18, depthWrite: false,
  });
  plenum.position.set(0, 3.04, 0);

  const roofPad = addMesh(bag, bundle, new THREE.BoxGeometry(4.6, 0.05, 4.6), 0xcfd8dc, 'pressure-cascade', { roughness: 1 });
  roofPad.position.set(6.45, 3.24, 0);

  const pressureRibbon = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 0.14),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
  );
  pressureRibbon.position.set(-4.2, 2.85, -0.92);
  bag.group.add(pressureRibbon);
  setRole(pressureRibbon, 'pressure-ribbon');

  // ── Pressure cascade arrows on floor (the #1 hospital BIM tell) ──
  // Real OR sequence: OR (+25 Pa) → Anteroom (+5 Pa) → Corridor (0 Pa)
  // Arrows on floor showing airflow direction across thresholds with Pa values.
  // Color: red (positive zone), grey (neutral), blue (negative).
  // OR → Anteroom (positive cascade)
  addArrow(bag, { x: -2.4, y: 0.04, z: -1.5 }, { x: -3.6, y: 0.04, z: -1.5 }, 0xc62828, 0.04, 'pressure-arrow');
  // Anteroom → Corridor (positive)
  addArrow(bag, { x: -4.7, y: 0.04, z: -1.0 }, { x: -5.9, y: 0.04, z: -1.0 }, 0xc62828, 0.04, 'pressure-arrow');
  // OR → Prep (slightly positive)
  addArrow(bag, { x: -1.85, y: 0.04, z: 1.6 }, { x: -1.85, y: 0.04, z: 2.6 }, 0xef6c00, 0.035, 'pressure-arrow');

  addArrow(bag, { x: -0.9, y: 1.24, z: -2.72 }, { x: -3.52, y: 1.24, z: -2.72 }, C.safe, 0.028);
  addArrow(bag, { x: -4.84, y: 1.24, z: -2.72 }, { x: -6.02, y: 1.24, z: -2.72 }, C.warning, 0.025);
  addArrow(bag, { x: 0, y: 1.75, z: 0 }, { x: 0, y: 0.55, z: 0 }, C.supply, 0.024);
}

function buildAHU(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'ahu', 8.6, ['ahu-treatment']);
  const ax = 6.35;
  const ay = 0.95;
  const az = 0;
  const len = 2.86;
  const height = 1.64;
  const depth = 1.32;
  const focusTarget: FocusTargetId = 'ahu-treatment';

  // ── AHU base frame ──
  box(bag, bundle, ax, ay - 0.86, az, 3.04, 0.08, 1.5, 0x607d8b, focusTarget, { roughness: 0.88 });
  box(bag, bundle, ax - 1.18, ay - 0.78, az, 0.12, 0.14, 1.24, 0x546e7a, focusTarget, { roughness: 0.7 });
  box(bag, bundle, ax + 1.18, ay - 0.78, az, 0.12, 0.14, 1.24, 0x546e7a, focusTarget, { roughness: 0.7 });

  // ── Vibration isolators at 4 corners ──
  for (const [ix, iz] of [[-1.08, -0.5], [-1.08, 0.5], [1.08, -0.5], [1.08, 0.5]] as [number, number][]) {
    const iso = createVibrationIsolator();
    iso.position.set(ax + ix, ay - 0.92, az + iz);
    bag.group.add(iso);
  }

  // ── AHU casing — BoxGeometry biasa (chamfer tidak terlihat di scale ini) ──
  const casing = addMesh(bag, bundle, new THREE.BoxGeometry(len, height, depth), C.equipment, focusTarget, {
    roughness: 0.46, metalness: 0.5,
  });
  casing.position.set(ax, ay, az);
  // Edge outline for crisp definition
  addEdges(bag, new THREE.BoxGeometry(len, height, depth), C.equipmentDark, { x: ax, y: ay, z: az });

  // ── Panel ribs on front face ──
  [-1.02, -0.4, 0.18, 0.72, 1.12].forEach((offset) => {
    box(bag, bundle, ax + offset, ay, az - depth / 2 + 0.03, 0.02, height - 0.08, 0.03, C.equipmentDark, focusTarget, { roughness: 0.8 });
  });

  // ── Access doors (filter section + fan section) ──
  const filterDoor = createAccessDoor(0.48, height - 0.12);
  filterDoor.position.set(ax - 0.76, ay, az - depth / 2 - 0.002);
  bag.group.add(filterDoor);
  const fanDoor = createAccessDoor(0.48, height - 0.12);
  fanDoor.position.set(ax + 0.88, ay, az - depth / 2 - 0.002);
  bag.group.add(fanDoor);

  // ── Pre-filter G4 (pleated media) ──
  const preFilterDetail = createFilterMedia(0.22, height - 0.16, 0.12, 12, (height - 0.16) * 0.7, 0xe8e0d0);
  preFilterDetail.position.set(ax - 1.08, ay, az - depth / 2 + 0.05);
  bag.group.add(preFilterDetail);
  const preFilter = box(bag, bundle, ax - 1.08, ay, az - depth / 2 + 0.05, 0.22, height - 0.16, 0.12, C.filterFine, focusTarget, { transparent: true, opacity: 0.35, roughness: 0.9, depthWrite: false });
  setRole(preFilter, 'filter-pre');

  // ── Fine filter F7 (pleated media) ──
  const fineFilterDetail = createFilterMedia(0.24, height - 0.18, 0.14, 16, (height - 0.18) * 0.75, 0xfff9e0);
  fineFilterDetail.position.set(ax - 0.47, ay, az - depth / 2 + 0.06);
  bag.group.add(fineFilterDetail);
  const fineFilter = box(bag, bundle, ax - 0.47, ay, az - depth / 2 + 0.06, 0.24, height - 0.18, 0.14, C.hepa, focusTarget, { transparent: true, opacity: 0.3, roughness: 0.9, depthWrite: false });
  setRole(fineFilter, 'filter-fine');

  // ── Evaporator coil (fin pack with copper tubes) ──
  const finPack = createCondenserFinPack(0.36, height - 0.2, 0.18, 350);
  finPack.position.set(ax + 0.08, ay + 0.02, az - depth / 2 + 0.08);
  bag.group.add(finPack);
  const coil = box(bag, bundle, ax + 0.08, ay + 0.02, az - depth / 2 + 0.08, 0.36, height - 0.2, 0.18, C.coil, focusTarget, { transparent: true, opacity: 0.25, roughness: 0.42, depthWrite: false });
  setRole(coil, 'coil');

  // ── Magnehelic gauges on front face (upstream + downstream dP) ──
  const gauge1 = createMagnehelicGauge(0.07);
  gauge1.position.set(ax - 1.08, ay + 0.5, az - depth / 2 - 0.016);
  bag.group.add(gauge1);
  const gauge2 = createMagnehelicGauge(0.07);
  gauge2.position.set(ax - 0.47, ay + 0.5, az - depth / 2 - 0.016);
  bag.group.add(gauge2);
  const humidifier = box(bag, bundle, ax + 0.48, ay + 0.28, az, 0.18, 0.66, depth - 0.24, C.humidifier, focusTarget, { transparent: true, opacity: 0.74, roughness: 0.3 });
  setRole(humidifier, 'humidifier');

  for (const z of [-0.18, 0, 0.18]) {
    cylinderBetween(bag, bundle, { x: ax + 0.52, y: ay + 0.58, z }, { x: ax + 0.52, y: ay - 0.14, z }, 0.014, C.uv, focusTarget, {
      emissive: C.uv,
      emissiveIntensity: 0.2,
      roughness: 0.34,
    });
    const uv = bag.group.children[bag.group.children.length - 1] as THREE.Mesh;
    setRole(uv, 'uv');
  }

  // ── Centrifugal fans (N+1 redundancy with InstancedMesh blades) ──
  // Performance: 24 blades total → 2 InstancedMesh (1 per fan), bukan 24 mesh
  // separate. Drawcall 24→2, vertex count tetap 12 unique blade × 2 fans
  // tapi raycast/render path lebih murah.
  [-0.18, 0.22].forEach((zOffset, index) => {
    const fanX = ax + 1.02;
    const fanY = ay + 0.02;
    const fanColor = index === 0 ? 0x2f4550 : 0x607d8b;
    const fanRole = index === 0 ? 'fan-duty' : 'fan-standby';

    // Fan housing — BoxGeometry biasa (kotak 0.72×0.72×0.14, no chamfer needed at this scale)
    const housing = addMesh(
      bag, bundle,
      new THREE.BoxGeometry(0.72, 0.72, 0.14),
      fanColor, focusTarget,
      { roughness: 0.5, metalness: 0.55 },
    );
    housing.position.set(fanX, fanY, zOffset - 0.07);

    // Inlet ring (Torus, lower segments 32→16)
    const inletRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.025, 6, 16),
      new THREE.MeshStandardMaterial({ color: fanColor, roughness: 0.4, metalness: 0.7 }),
    );
    inletRing.rotation.y = Math.PI / 2;
    inletRing.position.set(fanX - 0.08, fanY, zOffset);
    bag.group.add(inletRing);

    // Hub (center cylinder, lower segments 20→12)
    const hub = addMesh(
      bag, bundle,
      new THREE.CylinderGeometry(0.05, 0.05, 0.16, 12),
      fanColor, focusTarget,
      { roughness: 0.4, metalness: 0.7 },
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.set(fanX, fanY, zOffset);
    hub.userData.baseRotation = { x: hub.rotation.x, y: hub.rotation.y, z: hub.rotation.z };
    setRole(hub, fanRole);

    // 12 blades via InstancedMesh — 1 BufferGeometry shared, 12 instances
    const bladeColor = index === 0 ? 0x4a5d6c : 0x7a909d;
    const bladeMat = new THREE.MeshStandardMaterial({
      color: bladeColor,
      roughness: 0.45,
      metalness: 0.6,
      side: THREE.DoubleSide,
    });
    // Single blade geometry shape
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.07, 0);
    bladeShape.quadraticCurveTo(0.18, 0.04, 0.28, 0.02);
    bladeShape.lineTo(0.28, -0.005);
    bladeShape.quadraticCurveTo(0.18, 0.025, 0.07, -0.012);
    bladeShape.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.13, bevelEnabled: false });
    bladeGeo.translate(0, 0, -0.065);

    const bladeCount = 12;
    const instanced = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let bi = 0; bi < bladeCount; bi++) {
      const angle = (bi / bladeCount) * Math.PI * 2;
      dummy.position.set(fanX, fanY, zOffset);
      dummy.rotation.set(0, 0, angle);
      dummy.updateMatrix();
      instanced.setMatrixAt(bi, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
    bag.group.add(instanced);
  });

  const drain = box(bag, bundle, ax + 0.08, ay - 0.68, az, 0.52, 0.06, 0.88, C.drain, focusTarget, { roughness: 0.85 });
  setRole(drain, 'drain');
  cylinderBetween(bag, bundle, { x: ax + 0.42, y: ay - 0.68, z: -0.46 }, { x: ax + 0.42, y: ay - 1.08, z: -0.46 }, 0.02, C.drain, focusTarget);
  cylinderBetween(bag, bundle, { x: ax + 0.42, y: ay - 1.08, z: -0.46 }, { x: ax + 0.56, y: ay - 1.08, z: -0.46 }, 0.02, C.drain, focusTarget);
  cylinderBetween(bag, bundle, { x: ax + 0.56, y: ay - 1.08, z: -0.46 }, { x: ax + 0.56, y: ay - 0.92, z: -0.46 }, 0.02, C.drain, focusTarget);

  [-1.08, -0.42, 0.18, 0.74].forEach((offset) => {
    box(bag, bundle, ax + offset, ay, az - depth / 2 - 0.01, 0.5, height - 0.1, 0.02, C.equipmentDark, focusTarget, {
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  });

  const returnStub = box(bag, bundle, ax - len / 2 - 0.08, ay + 0.2, az, 0.14, 0.38, 0.58, C.return, focusTarget, { roughness: 0.45 });
  setRole(returnStub, 'service-path');
  const supplyStub = box(bag, bundle, ax + len / 2 - 0.08, ay + 0.44, az, 0.22, 0.2, 0.42, C.supply, focusTarget, { roughness: 0.42 });
  setRole(supplyStub, 'service-path');

  // ── Flex connectors at AHU inlet/outlet ──
  const flexReturn = createFlexConnector(0.38, 0.58, 0.12);
  flexReturn.position.set(ax - len / 2 - 0.2, ay + 0.2, az);
  flexReturn.rotation.y = Math.PI / 2;
  bag.group.add(flexReturn);
  const flexSupply = createFlexConnector(0.2, 0.42, 0.12);
  flexSupply.position.set(ax + len / 2 + 0.08, ay + 0.44, az);
  flexSupply.rotation.y = Math.PI / 2;
  bag.group.add(flexSupply);

  for (const offset of [-1.1, -0.48]) {
    cylinderBetween(bag, bundle, { x: ax + offset, y: ay + 0.58, z: depth / 2 + 0.02 }, { x: ax + offset, y: ay + 0.88, z: depth / 2 + 0.02 }, 0.012, C.alarm, focusTarget, { roughness: 0.45 });
  }

  const alarm1 = box(bag, bundle, ax - 1.23, ay + 0.78, depth / 2 + 0.03, 0.14, 0.12, 0.06, C.warning, focusTarget, { roughness: 0.45 });
  setRole(alarm1, 'alarm-panel');
  const alarm2 = box(bag, bundle, ax - 0.6, ay + 0.78, depth / 2 + 0.03, 0.14, 0.12, 0.06, C.warning, focusTarget, { roughness: 0.45 });
  setRole(alarm2, 'alarm-panel');
}

function buildCDU(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'cdu', 6.8, ['dx-circuit']);
  const focusTarget: FocusTargetId = 'dx-circuit';
  const cx = 6.58;
  const cy = 3.66;
  const cz = 0;

  box(bag, bundle, cx, cy - 0.34, cz, 1.34, 0.06, 1.14, 0x607d8b, focusTarget, { roughness: 0.9 });
  box(bag, bundle, cx, cy, cz, 1.1, 0.64, 0.96, C.equipment, focusTarget, { roughness: 0.42, metalness: 0.55 });
  addEdges(bag, new THREE.BoxGeometry(1.1, 0.64, 0.96), C.equipmentDark, { x: cx, y: cy, z: cz });

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.33, 24), new THREE.MeshStandardMaterial({ color: C.equipmentDark, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, cy + 0.32, cz);
  bag.group.add(ring);

  // ── Condenser fin pack (visible through housing) ──
  const cduFins = createCondenserFinPack(0.9, 0.48, 0.7, 450);
  cduFins.position.set(cx, cy, cz);
  bag.group.add(cduFins);

  // ── Fin guard louvers (semi-transparent, replacing solid boxes) ──
  for (let i = 0; i < 4; i += 1) {
    box(bag, bundle, cx - 0.36 + i * 0.24, cy, cz, 0.04, 0.5, 0.86, 0xa7b7c4, focusTarget, { roughness: 0.35, metalness: 0.72, transparent: true, opacity: 0.6 });
  }

  // ── Service valves with flare nuts ──
  const nut1 = createFlareNut(0.014);
  nut1.position.set(cx + 0.6, cy - 0.08, cz + 0.26);
  bag.group.add(nut1);
  box(bag, bundle, cx + 0.6, cy - 0.08, cz + 0.26, 0.08, 0.09, 0.08, C.refrigerant, focusTarget, { roughness: 0.35 });
  const nut2 = createFlareNut(0.014);
  nut2.position.set(cx - 0.58, cy - 0.08, cz - 0.26);
  bag.group.add(nut2);
  box(bag, bundle, cx - 0.58, cy - 0.08, cz - 0.26, 0.08, 0.09, 0.08, C.refrigerant, focusTarget, { roughness: 0.35 });
}

function buildSupply(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'supplyDuct', 5.8, ['laf-canopy']);
  const focusTarget: FocusTargetId = 'laf-canopy';
  const mainY = 2.94;
  const ductW = 0.58;
  const ductH = 0.3;

  box(bag, bundle, 6.35, 2.36, 0, ductW, 1.66, ductH, C.supply, focusTarget, { roughness: 0.42 });
  box(bag, bundle, 6.35, mainY, 0, ductW + 0.06, 0.028, ductH + 0.06, C.equipmentDark, focusTarget);
  box(bag, bundle, 6.35, mainY, 0, ductW + 0.05, ductW + 0.05, ductW + 0.05, C.supply, focusTarget);
  box(bag, bundle, 3.05, mainY, 0, 6.6, ductH, ductW, C.supply, focusTarget, { roughness: 0.42 });

  // ── Sound attenuator (BIM tell — slightly raised above supply duct) ──
  // 2026 hospital BIM: square box with internal acoustic lining ~0.6m long,
  // mounted parallel to supply duct main run. Positioned ABOVE main duct
  // (y=3.32) untuk menghindari z-fighting dengan supply duct (y=mainY=2.94).
  // Visible saat camera di Supply Air mode.
  const attY = mainY + 0.42;
  const attBoxOuter = box(bag, bundle, 4.5, attY, 0, 0.6, ductH + 0.08, ductW + 0.08, C.equipment, focusTarget, { roughness: 0.55, metalness: 0.45 });
  setRole(attBoxOuter, 'service-path');
  // Inner acoustic lining (cream fiberglass, transparent, depth-write off untuk z-fight free)
  box(bag, bundle, 4.5, attY, 0, 0.58, ductH + 0.04, ductW + 0.04, 0xe6dcc8, focusTarget, {
    roughness: 0.95, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false,
  });
  // Connector flexible coupling (small dark band) ke duct utama
  box(bag, bundle, 4.5, mainY + 0.15, 0, 0.18, 0.32, ductW, 0x37474f, focusTarget, { roughness: 0.7 });
  // SOUND tag marker
  box(bag, bundle, 4.5, attY + 0.22, ductH / 2 + 0.08, 0.16, 0.06, 0.02, C.warning, focusTarget, { roughness: 0.6 });

  // ── Duct joints with SMACNA flanges + foil tape ──
  [5.85, 4.45, 3.1, 1.8, 0.4].forEach((x) => {
    const joint = createDuctJoint(ductW, ductH);
    joint.position.set(x, mainY, 0);
    bag.group.add(joint);
  });

  // ── Detailed duct hangers (threaded rods + clamps + galv strap) ──
  const roofY = 3.2;
  [5.12, 3.12, 1.1].forEach((x) => {
    const hanger = createDuctHanger(ductW, ductH, roofY, mainY);
    hanger.position.set(x, 0, 0);
    bag.group.add(hanger);
  });
  addDamper(bag, bundle, 5.48, mainY, 0, ductW + 0.08, ductH + 0.08, 0.1, 'x', 'mixing-box', C.warning, 'fresh-damper');
  addFireSmokeDamper(bag, bundle, 1.42, mainY, 0, ductW + 0.09, ductH + 0.08, 0.12, 'mixing-box', 'relief-damper');

  box(bag, bundle, 0, mainY, 0, ductW + 0.05, ductW + 0.05, ductW + 0.05, C.supply, focusTarget);
  box(bag, bundle, 0, 2.78, 0, ductW, 0.32, ductH, C.supply, focusTarget, { roughness: 0.42 });
  box(bag, bundle, 0, 2.64, 0, 1.02, 0.06, 0.68, C.supply, focusTarget, { transparent: true, opacity: 0.88 });
  box(bag, bundle, 0, 2.59, 0, 1.64, 0.05, 1.24, C.supply, focusTarget, { transparent: true, opacity: 0.82 });
  box(bag, bundle, 0, 2.54, 0, 2.44, 0.04, 1.9, C.supply, focusTarget, { transparent: true, opacity: 0.76 });

  addArrow(bag, { x: 6.35, y: 2.9, z: 0.45 }, { x: 3.8, y: 2.9, z: 0.45 }, C.supply, 0.022, 'flow-arrow');
  addArrow(bag, { x: 3.05, y: 2.9, z: 0.45 }, { x: 0.5, y: 2.9, z: 0.45 }, C.supply, 0.022, 'flow-arrow');
}
function buildReturn(scene: THREE.Scene, bundle: SceneBundle): void {
  const ductBag = makeBag(scene, bundle, 'returnDuct', 4.8, ['return-sweep']);
  const grilleBag = makeBag(scene, bundle, 'grilles', -0.85, ['return-sweep']);
  const ductFocus: FocusTargetId = 'return-sweep';
  const mainY = 2.58;
  const mainW = 0.46;
  const mainH = 0.24;
  const riser = 0.16;

  [-2.9, 2.9].forEach((x) => {
    box(ductBag, bundle, x, 1.62, 0, riser, 2.04, riser, C.return, ductFocus, { roughness: 0.45 });
    box(ductBag, bundle, x, mainY, 0, mainW + 0.04, mainW + 0.04, mainW + 0.04, C.return, ductFocus);
    // Horizontal collecting duct along wall at grille height (connects all 3 grilles)
    box(ductBag, bundle, x, 0.55, 0, 0.14, 0.14, 3.8, C.return, ductFocus, { roughness: 0.45 });
  });

  box(ductBag, bundle, 1.2, mainY, 0, 8.2, mainH, mainW, C.return, ductFocus, { roughness: 0.45 });
  // ── Duct joints with SMACNA flanges ──
  [4.9, 3.4, 1.9, 0.4, -1.1].forEach((x) => {
    const joint = createDuctJoint(mainW, mainH);
    joint.position.set(x, mainY, 0);
    ductBag.group.add(joint);
  });

  addDamper(ductBag, bundle, 2.4, mainY, 0, mainW + 0.08, mainH + 0.08, 0.1, 'x', ductFocus, C.returnHi, 'return-damper');
  addFireSmokeDamper(ductBag, bundle, -0.9, mainY, 0, mainW + 0.08, mainH + 0.08, 0.12, 'return-sweep', 'return-fire-damper');
  box(ductBag, bundle, 5.22, mainY, 0, mainW + 0.04, mainW + 0.04, mainW + 0.04, C.return, ductFocus);
  box(ductBag, bundle, 5.22, 1.78, 0, mainH, 1.6, mainW, C.return, ductFocus, { roughness: 0.45 });

  const grilles = [
    { x: -3.0, y: 0.55, z: -1.75 },
    { x: -3.0, y: 0.55, z: 0 },
    { x: -3.0, y: 0.55, z: 1.75 },
    { x: 3.0, y: 0.55, z: -1.75 },
    { x: 3.0, y: 0.55, z: 0 },
    { x: 3.0, y: 0.55, z: 1.75 },
  ];
  grilles.forEach(({ x, y, z }) => {
    // High-detail grille (InstancedMesh bar grid + SS frame + screws + gasket)
    const grille = createReturnGrilleHighDetail(0.62, 0.44, 0.016);
    grille.position.set(x, y, z);
    // Rotate to face inward (grilles on wall — face toward room center)
    if (x < 0) grille.rotation.y = Math.PI / 2;
    else grille.rotation.y = -Math.PI / 2;
    grilleBag.group.add(grille);
    // Keep a simple backing box for raycast hit area
    box(grilleBag, bundle, x, y, z, 0.055, 0.44, 0.62, 0xcfd8dc, ductFocus, { transparent: true, opacity: 0.15, roughness: 0.65 });
  });

  [-1.25, 0, 1.25].forEach((z) => {
    addArrow(grilleBag, { x: -0.4, y: 0.35, z }, { x: -2.65, y: 0.35, z }, C.return, 0.018, 'flow-arrow');
    addArrow(grilleBag, { x: 0.4, y: 0.35, z }, { x: 2.65, y: 0.35, z }, C.return, 0.018, 'flow-arrow');
  });
}

function buildFreshAir(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'freshAir', 5.2, ['mixing-box']);
  const focusTarget: FocusTargetId = 'mixing-box';

  box(bag, bundle, 8.68, 2.12, -1.66, 0.08, 0.38, 0.52, C.freshAir, focusTarget, { roughness: 0.68 });
  for (let i = 0; i < 5; i += 1) {
    box(bag, bundle, 8.68, 1.96 + i * 0.075, -1.66, 0.06, 0.012, 0.48, C.freshAir, focusTarget, { roughness: 0.72 });
  }
  box(bag, bundle, 8.8, 2.26, -1.66, 0.24, 0.14, 0.68, C.freshAir, focusTarget, { roughness: 0.7 });
  box(bag, bundle, 7.22, 2.12, -1.66, 2.9, 0.24, 0.32, C.freshAir, focusTarget, { roughness: 0.46 });
  addDamper(bag, bundle, 6.42, 2.12, -1.66, 0.36, 0.3, 0.12, 'z', focusTarget, C.warning, 'fresh-damper');
  // Belimo-style damper actuator (small motor on shaft, white box w/ orange band)
  box(bag, bundle, 6.42, 2.32, -1.66, 0.14, 0.10, 0.10, 0xfafafa, focusTarget, { roughness: 0.42 });
  box(bag, bundle, 6.42, 2.36, -1.66, 0.14, 0.02, 0.10, C.warning, focusTarget, { roughness: 0.55 });
  // Shaft from actuator into damper
  cylinderBetween(bag, bundle, { x: 6.42, y: 2.27, z: -1.66 }, { x: 6.42, y: 2.18, z: -1.66 }, 0.012, 0x94a3b8, focusTarget, { roughness: 0.5 });

  box(bag, bundle, 5.95, 2.12, -1.66, 0.34, 0.3, 0.32, C.freshAir, focusTarget, { roughness: 0.46 });
  box(bag, bundle, 5.95, 1.96, -0.78, 0.34, 0.24, 1.86, C.freshAir, focusTarget, { roughness: 0.46 });

  box(bag, bundle, 5.1, 1.2, 0.35, 0.58, 0.24, 0.34, C.return, focusTarget, { roughness: 0.46 });
  addDamper(bag, bundle, 5.1, 1.2, 0.35, 0.34, 0.3, 0.12, 'z', focusTarget, C.returnHi, 'return-damper');
  // Belimo actuator on return damper
  box(bag, bundle, 5.1, 1.4, 0.35, 0.14, 0.10, 0.10, 0xfafafa, focusTarget, { roughness: 0.42 });
  box(bag, bundle, 5.1, 1.44, 0.35, 0.14, 0.02, 0.10, C.returnHi, focusTarget, { roughness: 0.55 });
  cylinderBetween(bag, bundle, { x: 5.1, y: 1.35, z: 0.35 }, { x: 5.1, y: 1.26, z: 0.35 }, 0.012, 0x94a3b8, focusTarget, { roughness: 0.5 });
  cylinderBetween(bag, bundle, { x: 5.95, y: 1.96, z: 0.88 }, { x: 7.75, y: 3.4, z: 1.55 }, 0.045, 0x94a3b8, focusTarget, { roughness: 0.5 });
  box(bag, bundle, 7.92, 3.46, 1.62, 0.22, 0.16, 0.38, 0x94a3b8, focusTarget, { roughness: 0.55 });

  addDamper(bag, bundle, 7.22, 3.22, 1.28, 0.36, 0.28, 0.12, 'x', focusTarget, C.warning, 'fresh-damper');
  addFireSmokeDamper(bag, bundle, 6.52, 1.96, -0.78, 0.38, 0.28, 0.12, focusTarget, 'relief-damper');
}

function buildLAF(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'laf', 3.9, ['laf-canopy']);
  const focusTarget: FocusTargetId = 'laf-canopy';
  const lx = 0;
  const ly = 2.84;
  const lz = 0;

  // ── Outer casing (BoxGeometry — large flat slab, chamfer wasted at this scale) ──
  const cw = 2.68;
  const cd = 1.98;
  const ch = 0.24;
  const casing = addMesh(bag, bundle, new THREE.BoxGeometry(cw, ch, cd), C.equipment, focusTarget, {
    roughness: 0.44, metalness: 0.45,
  });
  casing.position.set(lx, ly, lz);
  addEdges(bag, new THREE.BoxGeometry(cw, ch, cd), C.equipmentDark, { x: lx, y: ly, z: lz });

  // ── HEPA filter media (12 pleats running along X, repeating laterally) ──
  // ALIGNMENT FIX: ExtrudeGeometry default extrudes along +Z. Profile is
  // sawtooth along X with pleat depth in Y. After translate(0,0,-(depth/2))
  // geometry centered, pleats run X-direction with Y variation showing
  // ridges from underneath the canopy. Previously rotateX(PI/2) flipped
  // extrude axis to Y making pleats stack vertically (wrong).
  const pleatCount = 12;
  const pleatProfile = new THREE.Shape();
  const pw = (cw - 0.12) / pleatCount;
  const pleatD = 0.05;
  for (let i = 0; i <= pleatCount; i++) {
    const x = i * pw - (cw - 0.12) / 2;
    const y = i % 2 === 0 ? 0 : pleatD;
    if (i === 0) pleatProfile.moveTo(x, y);
    else pleatProfile.lineTo(x, y);
  }
  pleatProfile.lineTo((cw - 0.12) / 2, -0.02);
  pleatProfile.lineTo(-(cw - 0.12) / 2, -0.02);
  pleatProfile.closePath();

  const pleatGeo = new THREE.ExtrudeGeometry(pleatProfile, {
    depth: cd - 0.12,
    bevelEnabled: false,
  });
  // No rotateX — keep extrude direction along +Z (depth), pleats vary along X
  pleatGeo.translate(0, 0, -(cd - 0.12) / 2); // center along Z
  const pleated = addMesh(bag, bundle, pleatGeo, C.hepa, focusTarget, {
    roughness: 0.96, metalness: 0,
  });
  // Position at canopy bottom (Y=ly-0.14), pleats hang down 5cm visible from below
  pleated.position.set(lx, ly - 0.14, lz);

  // Frame around HEPA pleats — BoxGeometry with hole via 4 thin strips
  // (lebih murah dari ExtrudeGeometry hole approach)
  const fbW = 0.04;
  const fbX = (cw - fbW) / 2;
  const fbZ = (cd - fbW) / 2;
  const frameMat = { roughness: 0.5, metalness: 0.55 };
  // Top + bottom strips
  addMesh(bag, bundle, new THREE.BoxGeometry(cw, 0.04, fbW), C.equipmentDark, focusTarget, frameMat).position.set(lx, ly - 0.18, lz - fbZ);
  addMesh(bag, bundle, new THREE.BoxGeometry(cw, 0.04, fbW), C.equipmentDark, focusTarget, frameMat).position.set(lx, ly - 0.18, lz + fbZ);
  // Left + right strips
  addMesh(bag, bundle, new THREE.BoxGeometry(fbW, 0.04, cd), C.equipmentDark, focusTarget, frameMat).position.set(lx - fbX, ly - 0.18, lz);
  addMesh(bag, bundle, new THREE.BoxGeometry(fbW, 0.04, cd), C.equipmentDark, focusTarget, frameMat).position.set(lx + fbX, ly - 0.18, lz);

  // ── Downward laminar flow arrows ──
  [[-0.8, -0.6], [0, -0.6], [0.8, -0.6], [-0.8, 0], [0, 0], [0.8, 0], [-0.8, 0.6], [0, 0.6], [0.8, 0.6]].forEach(([dx, dz]) => {
    addArrow(bag, { x: lx + dx, y: ly - 0.13, z: lz + dz }, { x: lx + dx, y: 1.05, z: lz + dz }, C.supply, 0.018, 'flow-arrow');
  });

  // Floor footprint highlight (subtle glow on OR floor)
  box(bag, bundle, lx, 0.01, lz, 2.98, 0.01, 2.14, C.supplyHi, focusTarget, { transparent: true, opacity: 0.12, depthWrite: false });
}

function buildRefrigerant(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'refrigerant', 7.8, ['dx-circuit']);
  const focusTarget: FocusTargetId = 'dx-circuit';

  const liquid = { x: 6.92, y: 3.34, z: 0.28 };
  const suction = { x: 6.24, y: 3.34, z: -0.3 };

  cylinderBetween(bag, bundle, liquid, { x: 6.92, y: 1.8, z: 0.28 }, 0.024, C.refrigerant, focusTarget, { roughness: 0.35, metalness: 0.72 });
  cylinderBetween(bag, bundle, liquid, { x: 6.92, y: 1.8, z: 0.28 }, 0.04, 0x1e293b, focusTarget, { transparent: true, opacity: 0.82, roughness: 0.9 });
  cylinderBetween(bag, bundle, suction, { x: 6.24, y: 1.8, z: -0.3 }, 0.032, C.refrigerant, focusTarget, { roughness: 0.35, metalness: 0.72 });
  cylinderBetween(bag, bundle, suction, { x: 6.24, y: 1.8, z: -0.3 }, 0.05, 0x111827, focusTarget, { transparent: true, opacity: 0.82, roughness: 0.95 });

  cylinderBetween(bag, bundle, { x: 6.24, y: 2.2, z: -0.3 }, { x: 6.08, y: 2.0, z: -0.3 }, 0.032, C.refrigerant, focusTarget, { roughness: 0.35, metalness: 0.72 });
  cylinderBetween(bag, bundle, { x: 6.08, y: 2.0, z: -0.3 }, { x: 6.24, y: 1.8, z: -0.3 }, 0.032, C.refrigerant, focusTarget, { roughness: 0.35, metalness: 0.72 });

  box(bag, bundle, 6.92, 2.3, 0.28, 0.06, 0.08, 0.06, C.refrigerant, focusTarget, { roughness: 0.45 });
  box(bag, bundle, 6.24, 2.22, -0.3, 0.06, 0.08, 0.06, C.refrigerant, focusTarget, { roughness: 0.45 });
  box(bag, bundle, 6.02, 1.78, -0.3, 0.08, 0.08, 0.08, C.refrigerant, focusTarget, { roughness: 0.4 });

  for (const y of [2.7, 2.1, 1.5]) {
    box(bag, bundle, 6.56, y, -0.3, 0.18, 0.04, 0.06, C.steel, 'service-access', { roughness: 0.55 });
  }

  // ── Oil trap loop at base of vertical suction riser ──
  // 2026 SOTA hospital VRF tell: 180° U-loop at bottom of suction risers
  // collects oil pooling, prevents compressor starvation. Engineers will
  // immediately notice if missing on a hospital schematic.
  // U-loop: down → forward → up, forming small inverted-U at riser base
  cylinderBetween(bag, bundle, { x: 6.24, y: 1.8, z: -0.3 }, { x: 6.24, y: 1.6, z: -0.3 }, 0.032, C.refrigerant, focusTarget, { roughness: 0.35, metalness: 0.72 });
  cylinderBetween(bag, bundle, { x: 6.24, y: 1.6, z: -0.3 }, { x: 6.24, y: 1.5, z: -0.42 }, 0.032, C.refrigerant, focusTarget, { roughness: 0.35, metalness: 0.72 });
  cylinderBetween(bag, bundle, { x: 6.24, y: 1.5, z: -0.42 }, { x: 6.36, y: 1.5, z: -0.42 }, 0.032, C.refrigerant, focusTarget, { roughness: 0.35, metalness: 0.72 });
  cylinderBetween(bag, bundle, { x: 6.36, y: 1.5, z: -0.42 }, { x: 6.36, y: 1.6, z: -0.3 }, 0.032, C.refrigerant, focusTarget, { roughness: 0.35, metalness: 0.72 });
  cylinderBetween(bag, bundle, { x: 6.36, y: 1.6, z: -0.3 }, { x: 6.36, y: 1.8, z: -0.3 }, 0.032, C.refrigerant, focusTarget, { roughness: 0.35, metalness: 0.72 });
  // Trap label tag (small box marker)
  box(bag, bundle, 6.30, 1.45, -0.36, 0.08, 0.04, 0.04, C.warning, focusTarget, { roughness: 0.6 });
}
function buildExhaust(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'exhaust', 6.8, ['agss-exhaust']);
  const focusTarget: FocusTargetId = 'agss-exhaust';
  const pipeR = 0.028;

  const pickup = box(bag, bundle, 0.92, 1.04, -0.25, 0.18, 0.12, 0.18, C.exhaust, focusTarget, { roughness: 0.5 });
  setRole(pickup, 'service-path');
  cylinderBetween(bag, bundle, { x: 0.98, y: 1.08, z: -0.25 }, { x: 2.24, y: 1.08, z: -0.25 }, pipeR, C.exhaust, focusTarget, { roughness: 0.42, metalness: 0.25 });
  cylinderBetween(bag, bundle, { x: 2.24, y: 1.08, z: -0.25 }, { x: 2.24, y: 2.84, z: -2.48 }, pipeR, C.exhaust, focusTarget, { roughness: 0.42, metalness: 0.25 });
  const agssFan = box(bag, bundle, 2.58, 2.84, -2.48, 0.38, 0.24, 0.24, C.equipmentDark, focusTarget, { roughness: 0.45 });
  setRole(agssFan, 'fan-housing');
  const agssImpeller = box(bag, bundle, 2.58, 2.84, -2.48, 0.16, 0.04, 0.22, C.exhaust, focusTarget, { roughness: 0.45 });
  setRole(agssImpeller, 'fan-duty');
  agssImpeller.userData.baseRotation = { x: 0, y: 0, z: 0 };

  cylinderBetween(bag, bundle, { x: 2.76, y: 2.84, z: -2.48 }, { x: 8.98, y: 2.84, z: -2.48 }, pipeR, C.exhaust, focusTarget, { roughness: 0.42, metalness: 0.25 });
  cylinderBetween(bag, bundle, { x: 8.98, y: 2.84, z: -2.48 }, { x: 8.98, y: 4.72, z: -2.48 }, pipeR, C.exhaust, focusTarget, { roughness: 0.42, metalness: 0.25 });
  const outlet = box(bag, bundle, 8.98, 4.82, -2.48, 0.12, 0.2, 0.12, C.exhaust, focusTarget, { roughness: 0.45 });
  setRole(outlet, 'service-path');

  const hood = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.28, 8),
    new THREE.MeshStandardMaterial({ color: C.exhaust, roughness: 0.5, metalness: 0.2 }),
  );
  hood.position.set(8.98, 5.06, -2.48);
  bag.group.add(hood);
}

function buildControls(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'controls', 3.2, ['controls-bms']);
  const focusTarget: FocusTargetId = 'controls-bms';

  // ── Room DP sensor (OR wall, corridor side) — white box + LCD face ──
  const dpSensor = box(bag, bundle, -3.25, 1.62, 1.05, 0.18, 0.18, 0.18, 0xfafafa, focusTarget, {
    roughness: 0.42, metalness: 0,
  });
  setRole(dpSensor, 'sensor');
  // LCD face (mimic emissive screen)
  box(bag, bundle, -3.25, 1.62, 1.16, 0.13, 0.10, 0.005, 0xa8e6cf, focusTarget, {
    emissive: 0x4ade80, emissiveIntensity: 0.5, roughness: 0.2,
  });
  // Probe tube to wall (DP differential)
  cylinderBetween(bag, bundle, { x: -3.25, y: 1.68, z: 1.2 }, { x: -3.25, y: 1.92, z: 1.2 }, 0.01, C.sensor, focusTarget, { roughness: 0.45 });

  // ── Particle counter (ceiling-mounted, OR center-side) ──
  const partCounter = box(bag, bundle, -1.15, 2.2, 2.2, 0.16, 0.18, 0.16, 0xfafafa, focusTarget, {
    roughness: 0.42, metalness: 0,
  });
  setRole(partCounter, 'sensor');
  box(bag, bundle, -1.15, 2.2, 2.31, 0.11, 0.11, 0.005, 0xa8d4f8, focusTarget, {
    emissive: 0x60a5fa, emissiveIntensity: 0.55, roughness: 0.2,
  });
  // Sample inlet probe
  cylinderBetween(bag, bundle, { x: -1.15, y: 2.32, z: 2.2 }, { x: -1.15, y: 2.54, z: 2.2 }, 0.012, C.sensor, focusTarget, { roughness: 0.45 });

  // ── T+RH combo (return air grille position) ──
  const trhSensor = box(bag, bundle, 0.7, 2.38, 1.52, 0.16, 0.16, 0.18, 0xfafafa, focusTarget, {
    roughness: 0.42, metalness: 0,
  });
  setRole(trhSensor, 'sensor');
  box(bag, bundle, 0.7, 2.38, 1.62, 0.11, 0.10, 0.005, 0xfde68a, focusTarget, {
    emissive: 0xfacc15, emissiveIntensity: 0.55, roughness: 0.2,
  });

  // ── Filter DP across HEPA bank (AHU front face — gauge-mounted) ──
  // Magnehelic-style gauge: small disc on AHU near filter pre + post
  const dpHepaPre = addMesh(bag, bundle, new THREE.CylinderGeometry(0.07, 0.07, 0.04, 18), 0xfafafa, focusTarget, {
    roughness: 0.4, metalness: 0,
  });
  dpHepaPre.position.set(5.2, 0.95, 1.55);
  dpHepaPre.rotation.x = Math.PI / 2;
  setRole(dpHepaPre, 'sensor');

  // ── Alarm panel ──
  const alarm = box(bag, bundle, 4.42, 2.15, 0.72, 0.16, 0.16, 0.16, C.alarm, focusTarget, {
    roughness: 0.4,
    emissive: C.alarm,
    emissiveIntensity: 0.18,
  });
  setRole(alarm, 'alarm-panel');

  // ── BMS Surgical Control Panel (touchscreen on wall) ──
  const panel = box(bag, bundle, -4.55, 1.52, -0.95, 0.48, 0.74, 0.12, C.equipmentDark, focusTarget, { roughness: 0.45 });
  setRole(panel, 'sensor');
  const screen = box(bag, bundle, -4.55, 1.52, -0.88, 0.38, 0.64, 0.02, C.safe, focusTarget, { transparent: true, opacity: 0.75, roughness: 0.3 });
  setRole(screen, 'sensor');
}

function buildMaintenance(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'maintenance', 7.4, ['service-access']);

  addGhostBox(bag, bundle, 5.0, 1.5, 1.06, 2.8, 2.2, 1.0, 0x34d399, 'service-access', 0.12, 'service-envelope');
  addGhostBox(bag, bundle, 5.86, 1.56, -0.18, 0.58, 1.36, 0.72, 0x34d399, 'service-access', 0.12, 'service-envelope');
  addGhostBox(bag, bundle, -0.1, 3.2, -1.25, 4.6, 0.14, 1.0, 0xf59e0b, 'service-access', 0.11, 'service-path');

  box(bag, bundle, -0.2, 3.26, 1.15, 4.2, 0.06, 0.32, C.steel, 'service-access', { roughness: 0.62 });
  box(bag, bundle, -1.75, 3.02, 1.15, 0.08, 0.54, 0.08, C.steel, 'service-access', { roughness: 0.62 });
  box(bag, bundle, 1.35, 3.02, 1.15, 0.08, 0.54, 0.08, C.steel, 'service-access', { roughness: 0.62 });

  addArrow(bag, { x: 5.2, y: 1.6, z: 0.95 }, { x: 3.95, y: 1.6, z: 0.95 }, C.safe, 0.02, 'service-path');
  addArrow(bag, { x: 5.85, y: 1.68, z: -0.18 }, { x: 4.95, y: 1.68, z: -0.18 }, C.safe, 0.018, 'service-path');
}

function buildContext(scene: THREE.Scene, bundle: SceneBundle): void {
  const bag = makeBag(scene, bundle, 'context', 1.2, ['laf-canopy']);
  const ft: FocusTargetId = 'laf-canopy';

  // ── Operating table ───────────────────────────────────────
  // Base pedestal (hydraulic column)
  cylinderBetween(bag, bundle, { x: 0, y: 0.02, z: 0 }, { x: 0, y: 0.58, z: 0 }, 0.12, C.equipmentDark, ft, { roughness: 0.4, metalness: 0.6 });
  // Base plate (cross-shaped foot)
  box(bag, bundle, 0, 0.02, 0, 0.7, 0.04, 0.3, C.equipmentDark, ft, { roughness: 0.55 });
  box(bag, bundle, 0, 0.02, 0, 0.3, 0.04, 0.7, C.equipmentDark, ft, { roughness: 0.55 });
  // Tabletop frame (stainless steel)
  box(bag, bundle, 0, 0.82, 0, 0.58, 0.06, 2.0, C.steel, ft, { roughness: 0.3, metalness: 0.55 });
  // Side rails (left + right)
  box(bag, bundle, -0.28, 0.88, 0, 0.025, 0.04, 1.8, C.steel, ft, { roughness: 0.25, metalness: 0.7 });
  box(bag, bundle, 0.28, 0.88, 0, 0.025, 0.04, 1.8, C.steel, ft, { roughness: 0.25, metalness: 0.7 });
  // Mattress pad (dark green medical)
  box(bag, bundle, 0, 0.89, 0, 0.5, 0.04, 1.85, 0x2d4a3e, ft, { roughness: 0.92, metalness: 0 });
  // Head section (slightly raised)
  box(bag, bundle, 0, 0.94, -0.82, 0.46, 0.06, 0.36, 0x2d4a3e, ft, { roughness: 0.92, metalness: 0 });

  // ── Main surgical light (ceiling-mounted, centered) ───────
  // Ceiling plate
  cylinderBetween(bag, bundle, { x: 0, y: 3.0, z: -0.3 }, { x: 0, y: 2.96, z: -0.3 }, 0.08, C.steel, ft, { roughness: 0.3, metalness: 0.7 });
  // Vertical arm
  cylinderBetween(bag, bundle, { x: 0, y: 2.96, z: -0.3 }, { x: 0, y: 2.28, z: -0.3 }, 0.035, C.steel, ft, { roughness: 0.35, metalness: 0.7 });
  // Horizontal arm
  box(bag, bundle, 0, 2.28, -0.64, 0.06, 0.06, 0.72, C.steel, ft, { roughness: 0.3, metalness: 0.72 });
  // Light head (large disc with emissive underside)
  const mainLamp = addMesh(bag, bundle, new THREE.CylinderGeometry(0.38, 0.38, 0.07, 28), 0xf0f0f0, ft, {
    roughness: 0.25, metalness: 0.35, emissive: 0xfff8e0, emissiveIntensity: 0.5,
  });
  mainLamp.position.set(0, 2.24, -1.0);

  // ── Satellite surgical light (offset, smaller) ────────────
  cylinderBetween(bag, bundle, { x: -1.1, y: 3.0, z: 0.6 }, { x: -1.1, y: 2.68, z: 0.6 }, 0.06, C.steel, ft, { roughness: 0.3, metalness: 0.7 });
  cylinderBetween(bag, bundle, { x: -1.1, y: 2.68, z: 0.6 }, { x: -1.1, y: 2.22, z: 0.6 }, 0.03, C.steel, ft, { roughness: 0.35, metalness: 0.7 });
  box(bag, bundle, -1.1, 2.22, 0.28, 0.05, 0.05, 0.68, C.steel, ft, { roughness: 0.3, metalness: 0.72 });
  const satLamp = addMesh(bag, bundle, new THREE.CylinderGeometry(0.28, 0.28, 0.06, 24), 0xf0f0f0, ft, {
    roughness: 0.25, metalness: 0.35, emissive: 0xfff8e0, emissiveIntensity: 0.42,
  });
  satLamp.position.set(-1.1, 2.18, -0.06);

  // ── Anesthesia / monitor station (back-left corner) ───────
  // Cart body
  box(bag, bundle, -2.2, 0.55, -1.8, 0.52, 1.1, 0.44, C.equipment, ft, { roughness: 0.45, metalness: 0.3 });
  // 4 caster wheels
  for (const [dx, dz] of [[-0.2, -0.16], [0.2, -0.16], [-0.2, 0.16], [0.2, 0.16]] as [number, number][]) {
    cylinderBetween(bag, bundle, { x: -2.2 + dx, y: 0.0, z: -1.8 + dz }, { x: -2.2 + dx, y: 0.04, z: -1.8 + dz }, 0.03, 0x444444, ft, { roughness: 0.6 });
  }
  // Monitor screen (emissive display)
  box(bag, bundle, -2.2, 1.32, -1.8, 0.42, 0.32, 0.04, 0x1a2a3a, ft, { roughness: 0.1, metalness: 0.1, emissive: 0x1a3a5a, emissiveIntensity: 0.35 });
  // Monitor bracket / arm
  box(bag, bundle, -2.2, 1.18, -1.8, 0.06, 0.14, 0.06, C.steel, ft, { roughness: 0.35, metalness: 0.6 });
  // IV pole
  cylinderBetween(bag, bundle, { x: -2.45, y: 1.1, z: -1.8 }, { x: -2.45, y: 2.1, z: -1.8 }, 0.015, C.steel, ft, { roughness: 0.3, metalness: 0.75 });
  // IV hook cross-bar
  box(bag, bundle, -2.45, 2.1, -1.8, 0.18, 0.015, 0.015, C.steel, ft, { roughness: 0.3, metalness: 0.75 });

  // ── Gas pendant (ceiling-mounted, right side) ─────────────
  // Ceiling plate
  box(bag, bundle, 1.6, 2.98, -1.9, 0.18, 0.04, 0.18, C.steel, ft, { roughness: 0.3, metalness: 0.65 });
  // Pendant arm
  cylinderBetween(bag, bundle, { x: 1.6, y: 2.94, z: -1.9 }, { x: 1.6, y: 2.2, z: -1.9 }, 0.04, C.steel, ft, { roughness: 0.35, metalness: 0.65 });
  // Service head (outlet box)
  box(bag, bundle, 1.6, 2.14, -1.9, 0.22, 0.16, 0.14, C.equipment, ft, { roughness: 0.4, metalness: 0.35 });
  // Gas outlet indicators (colored spots — O2 green, N2O blue, Air yellow, Vacuum white)
  box(bag, bundle, 1.52, 2.14, -1.83, 0.03, 0.03, 0.01, 0x22c55e, ft, { roughness: 0.5 }); // O2
  box(bag, bundle, 1.60, 2.14, -1.83, 0.03, 0.03, 0.01, 0x3b82f6, ft, { roughness: 0.5 }); // N2O
  box(bag, bundle, 1.68, 2.14, -1.83, 0.03, 0.03, 0.01, 0xeab308, ft, { roughness: 0.5 }); // Air
  box(bag, bundle, 1.56, 2.08, -1.83, 0.03, 0.03, 0.01, 0xe8e8e8, ft, { roughness: 0.5 }); // Vacuum
  box(bag, bundle, 1.64, 2.08, -1.83, 0.03, 0.03, 0.01, 0x9333ea, ft, { roughness: 0.5 }); // AGSS

  // ── Mayo stand / instrument table (near table, right) ─────
  // Pole
  cylinderBetween(bag, bundle, { x: 0.85, y: 0.02, z: -0.6 }, { x: 0.85, y: 0.92, z: -0.6 }, 0.02, C.steel, ft, { roughness: 0.3, metalness: 0.7 });
  // Base (T-foot)
  box(bag, bundle, 0.85, 0.02, -0.6, 0.36, 0.025, 0.22, C.steel, ft, { roughness: 0.4, metalness: 0.55 });
  // Tray
  box(bag, bundle, 0.85, 0.94, -0.6, 0.4, 0.015, 0.3, C.steel, ft, { roughness: 0.2, metalness: 0.65 });
}

// ─────────────────────────────────────────────────────────────
// MISSING ITEM 1: CFM inline labels on duct flow arrows
// Adds CSS2DObject labels showing CFM values directly on the
// supply, return, and AGSS exhaust duct paths.
// ─────────────────────────────────────────────────────────────

function addInlineLabel(
  parent: THREE.Group,
  text: string,
  pos: THREE.Vector3,
  accent: string,
  fontSize = '9px',
): void {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = [
    'pointer-events:none',
    'white-space:nowrap',
    'border-radius:2px',
    'padding:2px 6px',
    'font-family:"JetBrains Mono", ui-monospace, monospace',
    `font-size:${fontSize}`,
    'font-weight:600',
    'letter-spacing:0.02em',
    `color:${accent}`,
    'background:rgba(255,255,255,0.88)',
    `border:1px solid ${accent}40`,
  ].join(';');
  const label = new CSS2DObject(div);
  label.position.copy(pos);
  parent.add(label);
}

function buildCFMLabels(scene: THREE.Scene, bundle: SceneBundle): void {
  const supplyBag = bundle.bags['supplyDuct'];
  const returnBag = bundle.bags['returnDuct'];
  const exhaustBag = bundle.bags['exhaust'];

  if (supplyBag) {
    // Supply main duct CFM — mid-span
    addInlineLabel(supplyBag.group, '3200 CFM', new THREE.Vector3(3.8, 3.18, 0.52), '#00bcd4');
    // Supply riser CFM
    addInlineLabel(supplyBag.group, '3200 CFM', new THREE.Vector3(6.35, 2.1, 0.52), '#00bcd4', '8px');
  }

  if (returnBag) {
    // Return main duct CFM — mid-span
    addInlineLabel(returnBag.group, '2450 CFM', new THREE.Vector3(1.5, 2.82, 0.52), '#e57373');
    // Return riser CFM
    addInlineLabel(returnBag.group, '1225 CFM ×2', new THREE.Vector3(-2.9, 1.8, 0.28), '#e57373', '8px');
  }

  if (exhaustBag) {
    // AGSS exhaust CFM
    addInlineLabel(exhaustBag.group, '420 CFM', new THREE.Vector3(5.0, 3.08, -2.48), '#ffa726');
  }
}

// ─────────────────────────────────────────────────────────────
// MISSING ITEM 2: Duct size + elevation tags on geometry
// Adds CSS2DObject labels showing duct dimensions and elevation
// at key points (AHU outlet, mid-span, LAF inlet, return risers).
// ─────────────────────────────────────────────────────────────

function buildDuctSizeAndElevationTags(scene: THREE.Scene, bundle: SceneBundle): void {
  const supplyBag = bundle.bags['supplyDuct'];
  const returnBag = bundle.bags['returnDuct'];

  if (supplyBag) {
    // Supply duct size at AHU outlet
    addInlineLabel(supplyBag.group, '580×300', new THREE.Vector3(6.35, 3.12, 0.34), '#00bcd4', '8px');
    // Elevation tag at mid-span
    addInlineLabel(supplyBag.group, 'EL +2.94m', new THREE.Vector3(4.5, 3.12, 0.34), '#64748b', '8px');
    // Duct size at LAF transition
    addInlineLabel(supplyBag.group, '580→2400', new THREE.Vector3(0, 2.82, 0.34), '#00bcd4', '8px');
  }

  if (returnBag) {
    // Return main duct size
    addInlineLabel(returnBag.group, '460×240', new THREE.Vector3(1.5, 2.78, 0.34), '#e57373', '8px');
    // Return riser size
    addInlineLabel(returnBag.group, '160×160 riser', new THREE.Vector3(-2.9, 2.1, 0.28), '#e57373', '7px');
    // Elevation at return main
    addInlineLabel(returnBag.group, 'EL +2.58m', new THREE.Vector3(4.5, 2.78, 0.34), '#64748b', '8px');
  }
}

// ─────────────────────────────────────────────────────────────
// MISSING ITEM 3: AGSS dedicated exhaust stack label
// The AGSS exhaust path already exists (buildExhaust), but it
// lacks explicit labeling as a dedicated AGSS stack. This adds
// a prominent CSS2DObject label and a "NO RECIRCULATION" badge
// to make the AGSS path unmistakable during Q&A.
// ─────────────────────────────────────────────────────────────

function buildAGSSStackLabel(scene: THREE.Scene, bundle: SceneBundle): void {
  const exhaustBag = bundle.bags['exhaust'];
  if (!exhaustBag) return;

  // AGSS stack label at rooftop discharge point
  addInlineLabel(
    exhaustBag.group,
    'AGSS STACK — NO RECIRCULATION',
    new THREE.Vector3(8.98, 5.28, -2.48),
    '#ffa726',
    '10px',
  );

  // Stack height marker
  addInlineLabel(
    exhaustBag.group,
    'DISCHARGE +4.82m',
    new THREE.Vector3(8.98, 4.5, -2.28),
    '#64748b',
    '8px',
  );

  // AGSS pickup label at OR ceiling
  addInlineLabel(
    exhaustBag.group,
    'AGSS PICKUP (OR CEILING)',
    new THREE.Vector3(0.92, 1.32, -0.25),
    '#ffa726',
    '8px',
  );
}
