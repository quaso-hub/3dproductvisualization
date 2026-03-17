/**
 * PacsCabinetAssembled3D.tsx — ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * PACS Cabinet Stainless Steel SUS-304 — lemari penyimpanan
 * medis full-height, kedua pintu kaca tertutup.
 *
 * Dimensi: 1200 × 2000 × 400 mm
 * - Body SUS 304 brushed vertikal
 * - 2 pintu swing center-split, masing-masing 2 panel kaca
 * - 3 rak stainless interior (terlihat melalui kaca)
 * - Plinth/base 80mm, handle bar vertikal, cam-lock
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ─── Dimensi (scene units, 1 unit = 10mm) ───────────────────
const OW = 120;   // outer width  1200mm
const OH = 200;   // outer height 2000mm
const OD = 40;    // outer depth  400mm
const WT = 2;     // wall thickness 20mm

// Plinth (base)
const PLINTH_H = 8;       // plinth height 80mm
const PLINTH_INSET = 0.5; // plinth front face setback 5mm

// Door opening (front face)
const OPENING_W = OW - 2 * WT;             // 116
const OPENING_H = OH - WT - PLINTH_H;      // 190 (plinth top → top panel bottom)

// Individual door
const DOOR_W = 57;    // per door width (~570mm)
const DOOR_H = 188;   // door height (~1880mm, 1mm clearance top+bottom)
const DOOR_T = 2.8;   // door leaf thickness 28mm
const DOOR_Y = PLINTH_H + OPENING_H / 2;   // 103 (center Y)
const LEFT_DOOR_X  = -(OPENING_W / 4);     // -29
const RIGHT_DOOR_X =  (OPENING_W / 4);     // +29

// Door frame & glass
const DFRAME = 3;      // frame strip width around glass
const DIVIDER_H = 3;   // horizontal divider between upper/lower glass
const GLASS_W = DOOR_W - 2 * DFRAME;                        // 51
const GLASS_H = (DOOR_H - 2 * DFRAME - DIVIDER_H) / 2;     // 89.5
const GLASS_T = 1.2;

// Handle (vertical bar)
const HANDLE_LEN = 16.5;
const HANDLE_DIA = 1.5;

// Shelves
const SHELF_W = OPENING_W - 2;            // 114
const SHELF_D = OD - 2 * WT - 2;          // 34
const SHELF_T = 0.4;
const SHELF_LIP = 2;
const INTERIOR_FLOOR_Y = PLINTH_H + WT;   // 10
const INTERIOR_CEIL_Y  = OH - WT;         // 198
const INTERIOR_H = INTERIOR_CEIL_Y - INTERIOR_FLOOR_Y; // 188
// 3 shelves evenly spaced
const SHELF_YS = [
  INTERIOR_FLOOR_Y + INTERIOR_H * 1 / 4,  // ~57
  INTERIOR_FLOOR_Y + INTERIOR_H * 2 / 4,  // ~104
  INTERIOR_FLOOR_Y + INTERIOR_H * 3 / 4,  // ~151
];

// ─── Material factories ───────────────────────────────────────

function matSSBrushed() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4dc, roughness: 0.22, metalness: 0.95, envMapIntensity: 1.2,
  });
}

function matSSInterior() {
  return new THREE.MeshStandardMaterial({
    color: 0xd8e2ea, roughness: 0.12, metalness: 0.96, envMapIntensity: 1.5,
  });
}

function matSSPolished() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dce6, roughness: 0.08, metalness: 0.97, envMapIntensity: 1.4,
  });
}

function matGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0x9ed4e8, roughness: 0.02, metalness: 0.0,
    transparent: true, opacity: 0.38, side: THREE.DoubleSide, envMapIntensity: 1.2,
  });
}

function matRubber() {
  return new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.80, metalness: 0.0,
  });
}

function matPlinth() {
  return new THREE.MeshStandardMaterial({
    color: 0xc0ccd4, roughness: 0.25, metalness: 0.94, envMapIntensity: 1.1,
  });
}

// ─── Geometry helpers ─────────────────────────────────────────

function addBox(
  scene: THREE.Object3D,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  mat: THREE.Material,
  shadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  scene.add(mesh);
  return mesh;
}

function addCyl(
  scene: THREE.Object3D,
  rTop: number, rBot: number, h: number, seg: number,
  x: number, y: number, z: number,
  mat: THREE.Material,
  rotX = 0, rotZ = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rotX;
  mesh.rotation.z = rotZ;
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

// ─── Build one swing door ──────────────────────────────────

function buildDoor(scene: THREE.Scene, xCenter: number, isRightDoor: boolean) {
  const doorZ = OD / 2 - DOOR_T / 2;

  // Door leaf with 2 glass cutout holes (ExtrudeGeometry)
  const shape = new THREE.Shape();
  shape.moveTo(-DOOR_W / 2, -DOOR_H / 2);
  shape.lineTo( DOOR_W / 2, -DOOR_H / 2);
  shape.lineTo( DOOR_W / 2,  DOOR_H / 2);
  shape.lineTo(-DOOR_W / 2,  DOOR_H / 2);
  shape.closePath();

  // Upper glass hole
  const upperCY = (DIVIDER_H + GLASS_H) / 2;
  const upperHole = new THREE.Path();
  upperHole.moveTo(-GLASS_W / 2, upperCY - GLASS_H / 2);
  upperHole.lineTo( GLASS_W / 2, upperCY - GLASS_H / 2);
  upperHole.lineTo( GLASS_W / 2, upperCY + GLASS_H / 2);
  upperHole.lineTo(-GLASS_W / 2, upperCY + GLASS_H / 2);
  upperHole.closePath();
  shape.holes.push(upperHole);

  // Lower glass hole
  const lowerCY = -(DIVIDER_H + GLASS_H) / 2;
  const lowerHole = new THREE.Path();
  lowerHole.moveTo(-GLASS_W / 2, lowerCY - GLASS_H / 2);
  lowerHole.lineTo( GLASS_W / 2, lowerCY - GLASS_H / 2);
  lowerHole.lineTo( GLASS_W / 2, lowerCY + GLASS_H / 2);
  lowerHole.lineTo(-GLASS_W / 2, lowerCY + GLASS_H / 2);
  lowerHole.closePath();
  shape.holes.push(lowerHole);

  const doorGeo = new THREE.ExtrudeGeometry(shape, { depth: DOOR_T, bevelEnabled: false });
  doorGeo.translate(0, 0, -DOOR_T / 2);

  const doorMesh = new THREE.Mesh(doorGeo, matSSBrushed());
  doorMesh.position.set(xCenter, DOOR_Y, doorZ);
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  scene.add(doorMesh);

  // Edge lines
  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  doorEdges.position.copy(doorMesh.position);
  scene.add(doorEdges);

  // Glass panels (2 per door)
  const glassMat = matGlass();
  [upperCY, lowerCY].forEach(cy => {
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(GLASS_W, GLASS_H, GLASS_T),
      glassMat,
    );
    glass.position.set(xCenter, DOOR_Y + cy, doorZ);
    scene.add(glass);
  });

  // Horizontal divider bar (between upper and lower glass)
  addBox(scene, GLASS_W + 2, DIVIDER_H, DOOR_T * 0.8,
    xCenter, DOOR_Y, doorZ, matSSBrushed());

  // Handle — vertical bar at INNER edge of door
  const handleSign = isRightDoor ? -1 : 1;
  const handleX = xCenter + handleSign * (DOOR_W / 2 - 3);
  const handleY = DOOR_Y;
  const handleZ = OD / 2 + 2;

  // Handle brackets (2 mounting points)
  [-6, 6].forEach(dy => {
    addBox(scene, 1.5, 1.5, 2.5, handleX, handleY + dy, OD / 2 + 1, matSSPolished());
  });
  // Handle bar (vertical cylinder)
  addCyl(scene, HANDLE_DIA / 2, HANDLE_DIA / 2, HANDLE_LEN, 12,
    handleX, handleY, handleZ, matSSPolished(), 0, 0);

  // Cam-lock (right door only)
  if (isRightDoor) {
    const lockX = handleX;
    const lockY = handleY - HANDLE_LEN / 2 - 4;
    addBox(scene, 3, 4, 2, lockX, lockY, OD / 2 + 1, matSSPolished());
    addCyl(scene, 0.4, 0.4, 1.5, 8, lockX, lockY, OD / 2 + 2.2,
      matSSPolished(), Math.PI / 2, 0);
  }

  // Concealed hinges — 3 per door, at OUTER edge
  const hingeSign = isRightDoor ? 1 : -1;
  const hingeX = xCenter + hingeSign * (DOOR_W / 2);
  const hingeMat = matSSPolished();
  [DOOR_Y + DOOR_H / 2 - 10, DOOR_Y, DOOR_Y - DOOR_H / 2 + 10].forEach(hy => {
    addBox(scene, 1, 6, DOOR_T * 0.8, hingeX + hingeSign * 0.5, hy, doorZ, hingeMat, false);
  });
}

// ─── Scene builder ────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {

  // ── 0. PBR Environment ──────────────────────────────────────
  renderer.toneMappingExposure = 0.85;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  const ssMat = matSSBrushed();

  // ── 1. Body shell — 5 panels ────────────────────────────────
  // Top panel
  addBox(scene, OW, WT, OD, 0, OH - WT / 2, 0, ssMat);
  // Bottom panel
  addBox(scene, OW, WT, OD, 0, WT / 2, 0, ssMat);
  // Left side wall
  addBox(scene, WT, OH - 2 * WT, OD, -(OW / 2 - WT / 2), OH / 2, 0, ssMat);
  // Right side wall
  addBox(scene, WT, OH - 2 * WT, OD, (OW / 2 - WT / 2), OH / 2, 0, ssMat);
  // Back wall
  addBox(scene, OW - 2 * WT, OH - 2 * WT, WT, 0, OH / 2, -(OD / 2 - WT / 2), ssMat);

  // ── 2. Plinth detail ────────────────────────────────────────
  // Front plinth panel (below door opening, slightly recessed)
  addBox(scene, OPENING_W, PLINTH_H - WT, WT,
    0, WT + (PLINTH_H - WT) / 2, OD / 2 - WT / 2 - PLINTH_INSET, matPlinth());
  // Plinth ledge (horizontal strip at plinth top — visible divider)
  addBox(scene, OW, 0.5, 1.5, 0, PLINTH_H, OD / 2 - 0.5, matSSPolished(), false);
  // Bottom mounting lip
  addBox(scene, OW + 1.5, 0.6, OD + 1.5, 0, 0.3, 0, ssMat, false);

  // ── 3. Front frame around door opening ──────────────────────
  // Top beam (between top panel and door opening)
  const frameTopH = OPENING_H - DOOR_H;
  if (frameTopH > 0) {
    addBox(scene, OPENING_W, frameTopH, WT,
      0, OH - WT - frameTopH / 2, OD / 2 - WT / 2, ssMat);
  }

  // ── 4. Doors ────────────────────────────────────────────────
  buildDoor(scene, LEFT_DOOR_X, false);
  buildDoor(scene, RIGHT_DOOR_X, true);

  // Center meeting strip (where both doors meet)
  addBox(scene, 1, DOOR_H, DOOR_T + 0.5,
    0, DOOR_Y, OD / 2 - DOOR_T / 2, matSSBrushed(), false);

  // ── 5. Rubber gasket (thin dark strip around door frame) ────
  const gasketMat = matRubber();
  const gasketZ = OD / 2 - WT + 0.3;
  // Top gasket
  addBox(scene, OPENING_W, 0.8, 1, 0, PLINTH_H + OPENING_H - 0.4, gasketZ, gasketMat, false);
  // Bottom gasket
  addBox(scene, OPENING_W, 0.8, 1, 0, PLINTH_H + 0.4, gasketZ, gasketMat, false);
  // Left gasket
  addBox(scene, 0.8, OPENING_H - 1.6, 1, -(OPENING_W / 2) + 0.4, PLINTH_H + OPENING_H / 2, gasketZ, gasketMat, false);
  // Right gasket
  addBox(scene, 0.8, OPENING_H - 1.6, 1, (OPENING_W / 2) - 0.4, PLINTH_H + OPENING_H / 2, gasketZ, gasketMat, false);

  // ── 6. Interior ─────────────────────────────────────────────
  const intMat = matSSInterior();
  const innerW = OW - 2 * WT - 1;
  const innerH = OH - 2 * WT - 1;
  const innerD = OD - WT - 1;

  // Interior back wall
  addBox(scene, innerW, innerH, 0.5, 0, OH / 2, -(OD / 2 - WT - 0.5), intMat);
  // Interior left wall
  addBox(scene, 0.5, innerH, innerD, -(innerW / 2), OH / 2, -0.5, intMat);
  // Interior right wall
  addBox(scene, 0.5, innerH, innerD, (innerW / 2), OH / 2, -0.5, intMat);
  // Interior floor
  addBox(scene, innerW, 0.5, innerD, 0, INTERIOR_FLOOR_Y, -0.5, intMat);
  // Interior ceiling
  addBox(scene, innerW, 0.5, innerD, 0, INTERIOR_CEIL_Y - 0.5, -0.5, intMat);

  // ── 7. Shelves (3 levels, visible through glass) ────────────
  const shelfMat = matSSInterior();
  SHELF_YS.forEach(sy => {
    // Shelf plate
    addBox(scene, SHELF_W, SHELF_T, SHELF_D, 0, sy, -1, shelfMat);
    // Front lip (anti-slip rail)
    addBox(scene, SHELF_W, SHELF_LIP, SHELF_T,
      0, sy + SHELF_LIP / 2, OD / 2 - WT - SHELF_T / 2 - 1, shelfMat, false);
  });

  // ── 8. Annotations ─────────────────────────────────────────
  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(OW / 2 - 1, OH / 2, 0),                          label: 'Body SUS 304 (Brushed Vertikal)' },
      { anchor: new THREE.Vector3(RIGHT_DOOR_X, DOOR_Y + (DIVIDER_H + GLASS_H) / 2, OD / 2), label: 'Panel Kaca Clear ×4' },
      { anchor: new THREE.Vector3(LEFT_DOOR_X, DOOR_Y, OD / 2),                    label: 'Frame Pintu SUS 304' },
      { anchor: new THREE.Vector3(1, DOOR_Y, OD / 2 + 2),                          label: 'Handle Bar + Cam-Lock' },
      { anchor: new THREE.Vector3(0, SHELF_YS[1], 0),                              label: 'Rak SUS 304 ×3 Tingkat' },
      { anchor: new THREE.Vector3(0, PLINTH_H / 2, OD / 2),                        label: 'Plinth / Base' },
    ],
    OW / 2 + 50,
    [-5, OH + 5],
  );
}

// ─── React component ──────────────────────────────────────────

export function PacsCabinetAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 80,
      maxDistance: 1000,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      const p = product.cameraPresets[0];
      applyCameraPreset(refs, p.position, p.target);
    },
    deps: [product],
  });

  const goTo = (p: CameraPreset) => {
    if (refsRef.current) applyCameraPreset(refsRef.current, p.position, p.target);
    setActivePreset(p.name);
  };
  const dl = (name: string) =>
    refsRef.current && downloadPNG(
      refsRef.current.renderer,
      `${product.id}-assembled-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
    );
  const dlAll = () =>
    product.cameraPresets.forEach((p, i) =>
      setTimeout(() => { goTo(p); setTimeout(() => dl(p.name), 220); }, i * 520),
    );

  return (
    <div className="w-full h-full flex flex-col">
      <ViewerControls
        presets={product.cameraPresets}
        activePreset={activePreset}
        onPreset={goTo}
        onDownload={dl}
        onDownloadAll={dlAll}
      />
      <div className="flex-1 min-h-0">
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  );
}
