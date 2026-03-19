/**
 * HvacSystemBIM3D.tsx
 * ─────────────────────────────────────────────────────────────
 * Unified BIM-MEP Interactive Viewer for HVAC System.
 * 6 view modes, click-to-inspect, animated particles/fans,
 * color-coded subsystem highlighting.
 *
 * Replaces both HvacSystemAssembled3D + HvacSystemExploded3D.
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
  buildORRoom,
  buildORInterior,
  buildORCeiling,
  buildSupplyDuct,
  buildReturnDucts,
  buildReturnGrilles,
  buildRefrigerantPiping,
  buildRooftopGroup,
  createSupplyParticles,
} from './hvac-bim-geometry';

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
  assembled:   { label: 'Full System',  shortLabel: 'FULL',   section: 'view' },
  supply_air:  { label: 'Supply Air',   shortLabel: 'SUPPLY', color: '#00BCD4', section: 'subsystem' },
  return_air:  { label: 'Return Air',   shortLabel: 'RETURN', color: '#FF7043', section: 'subsystem' },
  refrigerant: { label: 'Refrigerant',  shortLabel: 'REFRIG', color: '#FF8F00', section: 'subsystem' },
  floor_plan:  { label: 'Floor Plan',   shortLabel: 'PLAN',   section: 'drawing' },
  exploded:    { label: 'Exploded',     shortLabel: 'EXPLODE',section: 'drawing' },
};

const MODES_ORDER: HvacMode[] = ['assembled', 'supply_air', 'return_air', 'refrigerant', 'floor_plan', 'exploded'];

/* ── Component ────────────────────────────────────────────── */

export function HvacSystemBIM3D({ product }: Props) {
  const [activeMode, setActiveMode] = useState<HvacMode>('assembled');
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(product.cameraPresets[0]?.name ?? null);

  // Scene object refs
  const groupMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const registryRef = useRef<MeshRegistryEntry[]>([]);
  const origPosRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const ahuFanRef = useRef<THREE.Object3D | null>(null);
  const oduFanRef = useRef<THREE.Object3D | null>(null);
  const particleUpdateRef = useRef<(() => void) | null>(null);
  const cameraLerpRef = useRef<CameraLerpState | null>(null);
  const interactiveMeshes = useRef<THREE.Mesh[]>([]);
  const activeModeRef = useRef<HvacMode>('assembled');
  const lodObjectsRef = useRef<THREE.LOD[]>([]);

  // Raycaster
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  /* ── onTick: per-frame animation ──────────────────────── */

  const onTick = useCallback(() => {
    const mode = activeModeRef.current;

    // Fan rotation (not in floor_plan)
    if (mode !== 'floor_plan') {
      if (ahuFanRef.current) ahuFanRef.current.rotation.z += 0.03;
      if (oduFanRef.current) oduFanRef.current.rotation.z += 0.05;
    }

    // Supply particles
    if (particleUpdateRef.current && (mode === 'assembled' || mode === 'supply_air')) {
      particleUpdateRef.current();
    }

    // Camera lerp
    const lerp = cameraLerpRef.current;
    if (lerp && refsRef.current) {
      const still = tickCameraLerp(lerp, refsRef.current.camera, refsRef.current.controls);
      if (!still) cameraLerpRef.current = null;
    }

    // LOD update — auto-switches detail tiers based on camera distance
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
      cameraTarget: [1, 2.5, 0] as [number, number, number],
      minDistance: 0.3,
      maxDistance: 25,
    },
    onInit: (refs: SceneRefs) => {
      const { scene, renderer, camera, controls } = refs;

      // Dark background
      scene.background = new THREE.Color(0x0B1520);

      // Environment map
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(0.04), 0.04).texture;
      pmrem.dispose();
      renderer.toneMappingExposure = 1.1;

      // Camera — near/far for close-up zoom
      camera.near = 0.05;
      camera.far = 50;
      camera.updateProjectionMatrix();
      controls.target.set(1, 2.5, 0);
      camera.position.set(12, 10, 12);
      controls.update();

      // ── Build all geometry ──
      const gMap = groupMapRef.current;
      const origPos = origPosRef.current;

      const orRoom = buildORRoom();
      gMap.set('grp_building', orRoom);
      scene.add(orRoom);

      const orInterior = buildORInterior();
      gMap.set('grp_or_interior', orInterior);
      scene.add(orInterior);

      const orCeiling = buildORCeiling();
      gMap.set('grp_or_ceiling', orCeiling);
      scene.add(orCeiling);

      const supplyDuct = buildSupplyDuct();
      gMap.set('grp_supply_duct', supplyDuct);
      scene.add(supplyDuct);

      const returnDucts = buildReturnDucts();
      gMap.set('grp_return_duct', returnDucts);
      scene.add(returnDucts);

      const returnGrilles = buildReturnGrilles();
      gMap.set('grp_return_grilles', returnGrilles);
      scene.add(returnGrilles);

      const { group: rooftop, ahuFanRef: aFan, oduFanRef: oFan } = buildRooftopGroup();
      gMap.set('grp_rooftop', rooftop);
      scene.add(rooftop);
      ahuFanRef.current = aFan;
      oduFanRef.current = oFan;

      const piping = buildRefrigerantPiping();
      gMap.set('grp_piping', piping);
      scene.add(piping);

      const { group: particles, update: particleUpdate } = createSupplyParticles();
      gMap.set('grp_particles', particles);
      scene.add(particles);
      particleUpdateRef.current = particleUpdate;

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
      // Also collect groups with specs and find their first mesh child
      for (const [, group] of gMap) {
        group.traverse((child) => {
          if (child.userData?.specs && !iMeshes.includes(child as THREE.Mesh)) {
            // For groups, add first mesh child
            child.traverse((sub) => {
              if ((sub as THREE.Mesh).isMesh && !iMeshes.includes(sub as THREE.Mesh)) {
                iMeshes.push(sub as THREE.Mesh);
              }
            });
          }
        });
      }
      interactiveMeshes.current = iMeshes;

      // Collect all LOD objects for per-frame update
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

    // Close info panel on mode change
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
      // Walk up parent chain to find userData.specs
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
    // Click on empty → close
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

            // Section dividers
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
            {/* Header */}
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
            {/* System badge */}
            <div className="px-3 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: systemColor(selectedComponent.system) }}
              >
                {selectedComponent.system}
              </span>
            </div>
            {/* Specs table */}
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
            { label: 'Copper', color: '#B87333' },
            { label: 'Insulation', color: '#2D3436' },
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
