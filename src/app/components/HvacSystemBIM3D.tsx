/**
 * HvacSystemBIM3D.tsx
 * ─────────────────────────────────────────────────────────────
 * V3 Unified BIM-MEP Interactive Viewer for HVAC System.
 * 7 view modes (incl. AHU Cutaway), click-to-inspect,
 * 3 particle systems, animated fans, UV pulsing,
 * clipping plane cutaway, custom multi-light setup.
 * ─────────────────────────────────────────────────────────────
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { useThreeScene } from '../hooks/useThreeScene';
import { applyCameraPreset, downloadPNG } from '../lib/three-scene';
import type { SceneRefs } from '../lib/three-scene';
import { ViewerControls } from './ViewerControls';

import {
  buildBuilding,
  buildAHU, ahuCutPlane,
  buildSupplyDuctwork,
  buildReturnDuctwork,
  buildLAFUnits,
  buildReturnGrilles,
  buildOutdoorUnit,
  buildRefrigerantPiping,
  buildOREquipment,
  buildControlPanel,
  buildAirflowParticles,
} from './hvac-v3-index';

import {
  type HvacMode,
  MODE_CONFIGS,
  buildMeshRegistry,
  applyMode,
  createCameraLerp,
  tickCameraLerp,
  type CameraLerpState,
  type MeshRegistryEntry,
} from './hvac-bim-modes';

import { SUPPLY_CYAN, RETURN_SALMON, REFRIG_AMBER } from './hvac-bim-materials';

/* ── Types ────────────────────────────────────────────────── */

interface ComponentInfo {
  name: string;
  system: string;
  specs: Record<string, string>;
}

interface Props {
  product: Product;
}

/* ── Mode UI Labels & Colors ──────────────────────────────── */

const MODE_UI: Record<HvacMode, { label: string; shortLabel: string; color?: string; section: string }> = {
  assembled:    { label: 'Full System',  shortLabel: 'FULL',     section: 'view' },
  supply_air:   { label: 'Supply Air',   shortLabel: 'SUPPLY',   color: '#00BCD4', section: 'subsystem' },
  return_air:   { label: 'Return Air',   shortLabel: 'RETURN',   color: '#FF7043', section: 'subsystem' },
  refrigerant:  { label: 'Refrigerant',  shortLabel: 'REFRIG',   color: '#FF8F00', section: 'subsystem' },
  ahu_cutaway:  { label: 'AHU Cutaway',  shortLabel: 'AHU',      color: '#8844FF', section: 'subsystem' },
  floor_plan:   { label: 'Floor Plan',   shortLabel: 'PLAN',     section: 'drawing' },
  exploded:     { label: 'Exploded',     shortLabel: 'EXPLODE',  section: 'drawing' },
};

const MODES_ORDER: HvacMode[] = [
  'assembled', 'supply_air', 'return_air', 'refrigerant', 'ahu_cutaway', 'floor_plan', 'exploded',
];

/* ── Custom Lighting Setup ────────────────────────────────── */

function setupV3Lighting(scene: THREE.Scene): void {
  // Ambient (global fill)
  scene.add(new THREE.AmbientLight(0xCCDDEE, 0.45));

  // Sun (directional, with shadows)
  const sun = new THREE.DirectionalLight(0xFFEEDD, 1.2);
  sun.position.set(8, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 30;
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.bias = -0.0001;
  scene.add(sun);

  // AHU interior fill light (warm white)
  const ahuLight = new THREE.PointLight(0xCCEEFF, 0.8, 4.0);
  ahuLight.position.set(7.5, 0.6, 0);
  scene.add(ahuLight);

  // OR room ceiling light
  const orLight = new THREE.PointLight(0xFFFFEE, 0.9, 6.0);
  orLight.position.set(0, 2.9, 0);
  scene.add(orLight);

  // UV ambient glow
  const uvAmbient = new THREE.PointLight(0x8844FF, 0.3, 2.0);
  uvAmbient.position.set(7.8, 0.7, 1.3);
  scene.add(uvAmbient);

  // Rooftop light (industrial)
  const roofLight = new THREE.DirectionalLight(0xEEFFFF, 0.6);
  roofLight.position.set(3, 8, 3);
  scene.add(roofLight);

  // Fill light (from left-below, soften shadows)
  const fill = new THREE.DirectionalLight(0xDDEEFF, 0.35);
  fill.position.set(-6, 3, -6);
  scene.add(fill);
}

/* ── Component ────────────────────────────────────────────── */

export function HvacSystemBIM3D({ product }: Props) {
  const [activeMode, setActiveMode] = useState<HvacMode>('assembled');
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(product.cameraPresets[0]?.name ?? null);

  // Scene object refs
  const groupMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const registryRef = useRef<MeshRegistryEntry[]>([]);
  const origPosRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const fanGroupRef = useRef<THREE.Group | null>(null);
  const uvLightsRef = useRef<THREE.PointLight[]>([]);
  const heaterMeshesRef = useRef<THREE.Mesh[]>([]);
  const supplyParticlesRef = useRef<THREE.Points | null>(null);
  const returnParticlesRef = useRef<THREE.Points | null>(null);
  const refrigParticlesRef = useRef<THREE.Points | null>(null);
  const cameraLerpRef = useRef<CameraLerpState | null>(null);
  const interactiveMeshes = useRef<THREE.Mesh[]>([]);
  const activeModeRef = useRef<HvacMode>('assembled');
  const lodObjectsRef = useRef<THREE.LOD[]>([]);
  const clockRef = useRef(new THREE.Clock());

  // Raycaster
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  /* ── onTick: per-frame animation ──────────────────────── */

  const onTick = useCallback(() => {
    const mode = activeModeRef.current;
    const time = clockRef.current.getElapsedTime();

    // Fan rotation (AHU centrifugal fan)
    if (mode !== 'floor_plan' && fanGroupRef.current) {
      fanGroupRef.current.rotation.z += 0.03;
    }

    // UV lamp pulsing
    for (const uvLight of uvLightsRef.current) {
      uvLight.intensity = 1.2 + Math.sin(time * 8) * 0.2;
    }

    // Heater glow pulsing
    for (const mesh of heaterMeshesRef.current) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.0 + Math.sin(time * 3) * 0.3;
    }

    // Supply particles
    if (supplyParticlesRef.current?.userData.update &&
        (mode === 'assembled' || mode === 'supply_air')) {
      supplyParticlesRef.current.userData.update(time);
      supplyParticlesRef.current.visible = true;
    } else if (supplyParticlesRef.current) {
      supplyParticlesRef.current.visible = false;
    }

    // Return particles
    if (returnParticlesRef.current?.userData.update &&
        (mode === 'assembled' || mode === 'return_air')) {
      returnParticlesRef.current.userData.update(time);
      returnParticlesRef.current.visible = true;
    } else if (returnParticlesRef.current) {
      returnParticlesRef.current.visible = false;
    }

    // Refrigerant particles
    if (refrigParticlesRef.current?.userData.update &&
        (mode === 'assembled' || mode === 'refrigerant')) {
      refrigParticlesRef.current.userData.update(time);
      refrigParticlesRef.current.visible = true;
    } else if (refrigParticlesRef.current) {
      refrigParticlesRef.current.visible = false;
    }

    // Camera lerp
    const lerp = cameraLerpRef.current;
    if (lerp && refsRef.current) {
      const still = tickCameraLerp(lerp, refsRef.current.camera, refsRef.current.controls);
      if (!still) cameraLerpRef.current = null;
    }

    // LOD update
    if (refsRef.current) {
      const cam = refsRef.current.camera;
      for (const lod of lodObjectsRef.current) {
        lod.update(cam);
      }
    }
  }, []);

  /* ── Scene Init ───────────────────────────────────────── */

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: [12, 10, 12] as [number, number, number],
      cameraTarget: [3, 2, 3] as [number, number, number],
      minDistance: 0.3,
      maxDistance: 30,
      localClippingEnabled: true,
      skipDefaultLights: true,
    },
    onInit: (refs: SceneRefs) => {
      const { scene, renderer, camera, controls } = refs;

      // Dark background
      scene.background = new THREE.Color(0x0B1520);

      // Environment map
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(0.04), 0.04).texture;
      pmrem.dispose();
      renderer.toneMappingExposure = 1.15;

      // Camera setup
      camera.near = 0.05;
      camera.far = 50;
      camera.updateProjectionMatrix();
      controls.target.set(3, 2, 3);
      camera.position.set(12, 10, 12);
      controls.update();

      // Custom V3 lighting
      setupV3Lighting(scene);

      // ── Build all V3 geometry ──
      const gMap = groupMapRef.current;
      const origPos = origPosRef.current;

      // Building shell (OR room + interstitial + mechanical room + roof)
      const building = buildBuilding();
      gMap.set('grp_building', building);
      scene.add(building);

      // AHU (hero component with clipping plane)
      const { group: ahu, uvLights, fanGroup, heaterMeshes } = buildAHU();
      gMap.set('grp_ahu', ahu);
      scene.add(ahu);
      uvLightsRef.current = uvLights;
      fanGroupRef.current = fanGroup;
      heaterMeshesRef.current = heaterMeshes;

      // Supply ductwork
      const supplyDuct = buildSupplyDuctwork();
      gMap.set('grp_supply_duct', supplyDuct);
      scene.add(supplyDuct);

      // Return ductwork
      const returnDuct = buildReturnDuctwork();
      gMap.set('grp_return_duct', returnDuct);
      scene.add(returnDuct);

      // LAF ceiling units
      const lafUnits = buildLAFUnits();
      gMap.set('grp_laf_units', lafUnits);
      scene.add(lafUnits);

      // Return grilles
      const returnGrilles = buildReturnGrilles();
      gMap.set('grp_return_grilles', returnGrilles);
      scene.add(returnGrilles);

      // Outdoor unit (rooftop)
      const odu = buildOutdoorUnit();
      gMap.set('grp_outdoor_unit', odu);
      scene.add(odu);

      // Refrigerant piping
      const piping = buildRefrigerantPiping();
      gMap.set('grp_refrigerant_pipes', piping);
      scene.add(piping);

      // OR equipment
      const orEquip = buildOREquipment();
      gMap.set('grp_or_equipment', orEquip);
      scene.add(orEquip);

      // Control panel
      const ctrlPanel = buildControlPanel();
      gMap.set('grp_control_panel', ctrlPanel);
      scene.add(ctrlPanel);

      // Particle systems (3 independent)
      const supplyP = buildAirflowParticles(
        [[7.2, 1.8, 0], [3.0, 4.2, 0], [-1.5, 3.1, 0], [-1.5, 3.0, 0], [-1.5, 0, 0]],
        SUPPLY_CYAN, 100, 0.007,
      );
      scene.add(supplyP);
      supplyParticlesRef.current = supplyP;

      const returnP = buildAirflowParticles(
        [[-2.8, 0.6, 0], [-2.8, 2.5, 0], [0, 2.5, 0], [7.2, 1.5, 0]],
        RETURN_SALMON, 80, 0.006,
      );
      scene.add(returnP);
      returnParticlesRef.current = returnP;

      const refrigP = buildAirflowParticles(
        [[4.0, 5.2, 4.0], [6.0, 4.0, 2.0], [7.5, 0.8, 0.5]],
        REFRIG_AMBER, 60, 0.004,
      );
      scene.add(refrigP);
      refrigParticlesRef.current = refrigP;

      // Snapshot original positions
      for (const [name, group] of gMap) {
        origPos.set(name, group.position.clone());
      }

      // Build mesh registry for mode transitions
      registryRef.current = buildMeshRegistry(gMap);

      // Collect interactive meshes (those with userData.specs)
      const iMeshes: THREE.Mesh[] = [];
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh && obj.userData?.specs) {
          iMeshes.push(obj as THREE.Mesh);
        }
      });
      for (const [, group] of gMap) {
        group.traverse((child) => {
          if (child.userData?.specs && !iMeshes.includes(child as THREE.Mesh)) {
            child.traverse((sub) => {
              if ((sub as THREE.Mesh).isMesh && !iMeshes.includes(sub as THREE.Mesh)) {
                iMeshes.push(sub as THREE.Mesh);
              }
            });
          }
        });
      }
      interactiveMeshes.current = iMeshes;

      // Collect LOD objects
      const lods: THREE.LOD[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.LOD) lods.push(obj);
      });
      lodObjectsRef.current = lods;
    },
    onTick,
    deps: [product.id],
  });

  /* ── Mode Change Handler ──────────────────────────────── */

  const handleModeChange = useCallback((mode: HvacMode) => {
    activeModeRef.current = mode;
    setActiveMode(mode);

    const groups = groupMapRef.current;
    const registry = registryRef.current;
    const origPos = origPosRef.current;

    if (groups.size === 0 || registry.length === 0) return;

    // Apply mode (materials, visibility, positions)
    applyMode(mode, groups, registry, origPos);

    // Camera lerp
    if (refsRef.current) {
      cameraLerpRef.current = createCameraLerp(mode, refsRef.current.camera, refsRef.current.controls, 45);
    }

    setSelectedComponent(null);
  }, [refsRef]);

  /* ── Raycaster: Click to Inspect ──────────────────────── */

  const handleCanvasClick = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const refs = refsRef.current;
    if (!refs) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(pointer.current, refs.camera);
    const hits = raycaster.current.intersectObjects(interactiveMeshes.current, false);

    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        if (obj.userData?.specs) {
          setSelectedComponent({
            name: obj.userData.name || obj.name,
            system: obj.userData.system || '',
            specs: obj.userData.specs,
          });
          return;
        }
        obj = obj.parent;
      }
    }
    setSelectedComponent(null);
  }, [refsRef]);

  /* ── Camera Preset Handler ────────────────────────────── */

  const handlePreset = useCallback((preset: CameraPreset) => {
    if (!refsRef.current) return;
    applyCameraPreset(refsRef.current, preset.position, preset.target);
    setActivePreset(preset.name);
  }, [refsRef]);

  const handleDownload = useCallback(() => {
    if (!refsRef.current) return;
    downloadPNG(refsRef.current.renderer, `hvac-system-${activeMode}.png`);
  }, [refsRef, activeMode]);

  const handleDownloadAll = useCallback(() => {
    if (!refsRef.current) return;
    for (const preset of product.cameraPresets) {
      applyCameraPreset(refsRef.current, preset.position, preset.target);
      refsRef.current.controls.update();
      refsRef.current.renderer.render(refsRef.current.scene, refsRef.current.camera);
      downloadPNG(refsRef.current.renderer, `hvac-${preset.name}.png`);
    }
  }, [refsRef, product.cameraPresets]);

  /* ── System Badge Color ───────────────────────────────── */

  const systemColor = (sys: string) => {
    switch (sys) {
      case 'supply': return '#00BCD4';
      case 'return': return '#FF7043';
      case 'refrigerant': return '#FF8F00';
      case 'control': return '#FFD600';
      default: return '#90A4AE';
    }
  };

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="w-full h-full relative flex flex-col">
      {/* ViewerControls bar */}
      <ViewerControls
        presets={product.cameraPresets}
        activePreset={activePreset}
        onPreset={handlePreset}
        onDownload={handleDownload}
        onDownloadAll={handleDownloadAll}
      />

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={mountRef}
          className="w-full h-full"
          onPointerDown={handleCanvasClick}
          style={{ cursor: 'crosshair' }}
        />

        {/* ── Mode Panel (Left) ── */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5 bg-slate-900/85 backdrop-blur-sm rounded-lg p-1.5 shadow-xl border border-slate-700/50"
          style={{ minWidth: '80px' }}
        >
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-0.5">View Mode</p>

          {MODES_ORDER.map((modeId, idx) => {
            const ui = MODE_UI[modeId];
            const isActive = activeMode === modeId;

            const prevSection = idx > 0 ? MODE_UI[MODES_ORDER[idx - 1]].section : '';
            const showDivider = idx > 0 && ui.section !== prevSection;

            return (
              <div key={modeId}>
                {showDivider && (
                  <div className="border-t border-slate-600/50 my-1" />
                )}
                {showDivider && (
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-0.5">
                    {ui.section === 'subsystem' ? 'Subsistem' : 'Gambar'}
                  </p>
                )}
                <button
                  onClick={() => handleModeChange(modeId)}
                  className={[
                    'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-all text-[11px] font-medium',
                    isActive
                      ? 'bg-blue-600/30 text-white border-l-2 border-blue-400'
                      : 'text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent',
                  ].join(' ')}
                >
                  {ui.color && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ui.color }}
                    />
                  )}
                  <span>{ui.label}</span>
                </button>
              </div>
            );
          })}

          <div className="border-t border-slate-600/50 mt-1 pt-1">
            <p className="text-[8px] text-slate-500 px-1 leading-tight">
              Drag: putar<br />Scroll: zoom<br />Klik: detail
            </p>
          </div>
        </div>

        {/* ── Info Panel (Right, on click) ── */}
        {selectedComponent && (
          <div className="absolute right-2 top-4 z-10 w-64 bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/50 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: systemColor(selectedComponent.system) }}
              />
              <span className="text-sm font-semibold text-white flex-1 min-w-0 truncate">
                {selectedComponent.name}
              </span>
              <button
                onClick={() => setSelectedComponent(null)}
                className="text-slate-400 hover:text-white text-xs p-0.5"
              >
                &times;
              </button>
            </div>
            <div className="px-3 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: systemColor(selectedComponent.system) }}
              >
                {selectedComponent.system}
              </span>
            </div>
            <div className="px-3 pb-2">
              <table className="w-full text-[11px]">
                <tbody>
                  {Object.entries(selectedComponent.specs).map(([key, val], i) => (
                    <tr key={key} className={i % 2 === 0 ? 'bg-slate-800/50' : ''}>
                      <td className="py-0.5 px-1 text-slate-400 font-medium whitespace-nowrap">{key}</td>
                      <td className="py-0.5 px-1 text-slate-200">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Legend Bar (Bottom) ── */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-lg border border-slate-700/40">
          {[
            { label: 'Supply', color: '#00BCD4' },
            { label: 'Return', color: '#FF7043' },
            { label: 'Refrigerant', color: '#FF8F00' },
            { label: 'UV-C', color: '#8844FF' },
            { label: 'Copper', color: '#B87333' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-slate-300">{item.label}</span>
            </div>
          ))}
          <span className="text-[9px] text-slate-500 ml-2 border-l border-slate-600 pl-2">
            {MODE_CONFIGS[activeMode].description}
          </span>
        </div>
      </div>
    </div>
  );
}
