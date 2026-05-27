/**
 * PacsCabinetAssembled3D.tsx - ASSEMBLED VIEW
 * ------------------------------─
 * PACS Cabinet Stainless Steel SUS-304 - lemari penyimpanan
 * medis full-height, kedua pintu kaca tertutup.
 *
 * Dimensi: 1200 × 2000 × 400 mm
 * - Body SUS 304 brushed vertikal
 * - 2 pintu swing center-split, masing-masing 2 panel kaca
 * - 3 rak stainless interior (terlihat melalui kaca)
 * - Plinth/base 80mm, handle bar vertikal, cam-lock
 * ------------------------------─
 */

import { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { useHighlightController } from '../hooks/useHighlightController';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// -─ Dimensi (scene units, 1 unit = 10mm) ---------─
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

// -─ Material factories -------------------─

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

// -─ Geometry helpers --------------------─

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

// -─ Build one swing door -----------------

interface DoorBuildResult {
  glassMeshes: THREE.Mesh[];
  handleMeshes: THREE.Mesh[];
  lockMeshes: THREE.Mesh[];
  hingeMeshes: THREE.Mesh[];
}

/**
 * buildDoor — builds one swing door entirely inside `pivotGroup`.
 *
 * All positions are expressed in pivot-local space:
 *   localX = worldX - pivotX
 *
 * This means rotating pivotGroup.rotation.y swings the door
 * correctly around its hinge edge (the pivot origin).
 */
function buildDoor(
  pivotGroup: THREE.Group,
  pivotX: number,
  xCenter: number,
  isRightDoor: boolean,
): DoorBuildResult {
  // Helper: convert world X to pivot-local X
  const lx = (wx: number) => wx - pivotX;

  const doorZ = OD / 2 - DOOR_T / 2;
  const result: DoorBuildResult = {
    glassMeshes: [],
    handleMeshes: [],
    lockMeshes: [],
    hingeMeshes: [],
  };

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
  doorMesh.position.set(lx(xCenter), DOOR_Y, doorZ);
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  pivotGroup.add(doorMesh);

  // Edge lines
  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  doorEdges.position.copy(doorMesh.position);
  pivotGroup.add(doorEdges);

  // Glass panels (2 per door) — inside pivot group
  const glassMat = matGlass();
  [upperCY, lowerCY].forEach(cy => {
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(GLASS_W, GLASS_H, GLASS_T),
      glassMat,
    );
    glass.position.set(lx(xCenter), DOOR_Y + cy, doorZ);
    pivotGroup.add(glass);
    result.glassMeshes.push(glass);
  });

  // Horizontal divider bar
  addBox(pivotGroup, GLASS_W + 2, DIVIDER_H, DOOR_T * 0.8,
    lx(xCenter), DOOR_Y, doorZ, matSSBrushed());

  // Handle - vertical bar at INNER edge of door
  const handleSign = isRightDoor ? -1 : 1;
  const handleX = xCenter + handleSign * (DOOR_W / 2 - 3);
  const handleY = DOOR_Y;
  const handleZ = OD / 2 + 2;

  // Handle brackets (2 mounting points)
  [-6, 6].forEach(dy => {
    const bracket = addBox(pivotGroup, 1.5, 1.5, 2.5, lx(handleX), handleY + dy, OD / 2 + 1, matSSPolished());
    result.handleMeshes.push(bracket);
  });
  // Handle bar (vertical cylinder)
  const handleBar = addCyl(pivotGroup, HANDLE_DIA / 2, HANDLE_DIA / 2, HANDLE_LEN, 12,
    lx(handleX), handleY, handleZ, matSSPolished(), 0, 0);
  result.handleMeshes.push(handleBar);

  // Cam-lock (right door only)
  if (isRightDoor) {
    const lockX = handleX;
    const lockY = handleY - HANDLE_LEN / 2 - 4;
    const lockBody = addBox(pivotGroup, 3, 4, 2, lx(lockX), lockY, OD / 2 + 1, matSSPolished());
    const lockCyl = addCyl(pivotGroup, 0.4, 0.4, 1.5, 8, lx(lockX), lockY, OD / 2 + 2.2,
      matSSPolished(), Math.PI / 2, 0);
    result.lockMeshes.push(lockBody, lockCyl);
  }

  // Concealed hinges - 3 per door, at OUTER edge
  const hingeSign = isRightDoor ? 1 : -1;
  const hingeX = xCenter + hingeSign * (DOOR_W / 2);
  const hingeMat = matSSPolished();
  [DOOR_Y + DOOR_H / 2 - 10, DOOR_Y, DOOR_Y - DOOR_H / 2 + 10].forEach(hy => {
    const hinge = addBox(pivotGroup, 1, 6, DOOR_T * 0.8,
      lx(hingeX) + hingeSign * 0.5, hy, doorZ, hingeMat, false);
    result.hingeMeshes.push(hinge);
  });

  return result;
}

// -─ Door animation constants -----------
// Pivot = outer hinge edge X for each door
const LEFT_HINGE_X  = -(OW / 2 - WT);   // -58  (left wall inner face)
const RIGHT_HINGE_X =  (OW / 2 - WT);   //  58  (right wall inner face)
const DOOR_OPEN_ANGLE = Math.PI / 2;     // 90° swing

// -─ Scene builder ----------------------

interface SceneExtras {
  leftPivot: THREE.Group;
  rightPivot: THREE.Group;
}

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer): SceneExtras {

  // - 0. PBR Environment -------------------
  renderer.toneMappingExposure = 0.85;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  const ssMat = matSSBrushed();

  // - 1. Body shell - 5 panels ----------------
  const bodyShellGroup = new THREE.Group();
  bodyShellGroup.userData.partId = 'body-shell';
  scene.add(bodyShellGroup);
  // Top panel
  addBox(bodyShellGroup, OW, WT, OD, 0, OH - WT / 2, 0, ssMat);
  // Bottom panel
  addBox(bodyShellGroup, OW, WT, OD, 0, WT / 2, 0, ssMat);
  // Left side wall
  addBox(bodyShellGroup, WT, OH - 2 * WT, OD, -(OW / 2 - WT / 2), OH / 2, 0, ssMat);
  // Right side wall
  addBox(bodyShellGroup, WT, OH - 2 * WT, OD, (OW / 2 - WT / 2), OH / 2, 0, ssMat);
  // Back wall
  addBox(bodyShellGroup, OW - 2 * WT, OH - 2 * WT, WT, 0, OH / 2, -(OD / 2 - WT / 2), ssMat);

  // - 2. Plinth detail --------------------
  const plinthGroup = new THREE.Group();
  plinthGroup.userData.partId = 'plinth';
  scene.add(plinthGroup);
  // Front plinth panel (below door opening, slightly recessed)
  addBox(plinthGroup, OPENING_W, PLINTH_H - WT, WT,
    0, WT + (PLINTH_H - WT) / 2, OD / 2 - WT / 2 - PLINTH_INSET, matPlinth());
  // Plinth ledge (horizontal strip at plinth top - visible divider)
  addBox(plinthGroup, OW, 0.5, 1.5, 0, PLINTH_H, OD / 2 - 0.5, matSSPolished(), false);
  // Bottom mounting lip
  addBox(plinthGroup, OW + 1.5, 0.6, OD + 1.5, 0, 0.3, 0, ssMat, false);

  // - 3. Front frame around door opening -----------
  // Top beam (between top panel and door opening)
  const frameTopH = OPENING_H - DOOR_H;
  if (frameTopH > 0) {
    const frontFrameGroup = new THREE.Group();
    frontFrameGroup.userData.partId = 'front-frame';
    scene.add(frontFrameGroup);
    addBox(frontFrameGroup, OPENING_W, frameTopH, WT,
      0, OH - WT - frameTopH / 2, OD / 2 - WT / 2, ssMat);
  }

  // - 4. Doors with pivot groups for swing animation --------
  //
  // Each pivot group is placed at the hinge edge (world X).
  // buildDoor receives the pivot group and pivotX so it can
  // express all positions in pivot-local space (worldX - pivotX).
  // Rotating pivot.rotation.y swings the door around its hinge.

  // Left door pivot — hinge on left wall inner face
  // Opens outward: rotation.y goes from 0 → +DOOR_OPEN_ANGLE
  const leftPivot = new THREE.Group();
  leftPivot.position.set(LEFT_HINGE_X, 0, 0);
  leftPivot.userData.partId = 'door-left-pivot';
  scene.add(leftPivot);
  const leftBuild = buildDoor(leftPivot, LEFT_HINGE_X, LEFT_DOOR_X, false);

  // Right door pivot — hinge on right wall inner face
  // Opens outward: rotation.y goes from 0 → -DOOR_OPEN_ANGLE
  const rightPivot = new THREE.Group();
  rightPivot.position.set(RIGHT_HINGE_X, 0, 0);
  rightPivot.userData.partId = 'door-right-pivot';
  scene.add(rightPivot);
  const rightBuild = buildDoor(rightPivot, RIGHT_HINGE_X, RIGHT_DOOR_X, true);

  // Tag meshes with partId directly — they stay inside pivot groups
  // so they rotate correctly with the door animation.
  // The highlight controller traverses userData.partId on any object.
  [...leftBuild.glassMeshes, ...rightBuild.glassMeshes].forEach(g => {
    g.userData.partId = 'glass-panels';
  });
  [...leftBuild.handleMeshes, ...rightBuild.handleMeshes].forEach(h => {
    h.userData.partId = 'handles';
  });
  rightBuild.lockMeshes.forEach(l => {
    l.userData.partId = 'cam-lock';
  });
  [...leftBuild.hingeMeshes, ...rightBuild.hingeMeshes].forEach(h => {
    h.userData.partId = 'hinges';
  });

  // Center meeting strip (where both doors meet)
  const meetingStripGroup = new THREE.Group();
  meetingStripGroup.userData.partId = 'meeting-strip';
  scene.add(meetingStripGroup);
  addBox(meetingStripGroup, 1, DOOR_H, DOOR_T + 0.5,
    0, DOOR_Y, OD / 2 - DOOR_T / 2, matSSBrushed(), false);

  // - 5. Rubber gasket (thin dark strip around door frame) --
  const gasketGroup = new THREE.Group();
  gasketGroup.userData.partId = 'gasket';
  scene.add(gasketGroup);
  const gasketMat = matRubber();
  const gasketZ = OD / 2 - WT + 0.3;
  // Top gasket
  addBox(gasketGroup, OPENING_W, 0.8, 1, 0, PLINTH_H + OPENING_H - 0.4, gasketZ, gasketMat, false);
  // Bottom gasket
  addBox(gasketGroup, OPENING_W, 0.8, 1, 0, PLINTH_H + 0.4, gasketZ, gasketMat, false);
  // Left gasket
  addBox(gasketGroup, 0.8, OPENING_H - 1.6, 1, -(OPENING_W / 2) + 0.4, PLINTH_H + OPENING_H / 2, gasketZ, gasketMat, false);
  // Right gasket
  addBox(gasketGroup, 0.8, OPENING_H - 1.6, 1, (OPENING_W / 2) - 0.4, PLINTH_H + OPENING_H / 2, gasketZ, gasketMat, false);

  // - 6. Interior ----------------------─
  const interiorGroup = new THREE.Group();
  interiorGroup.userData.partId = 'interior';
  scene.add(interiorGroup);
  const intMat = matSSInterior();
  const innerW = OW - 2 * WT - 1;
  const innerH = OH - 2 * WT - 1;
  const innerD = OD - WT - 1;

  // Interior back wall
  addBox(interiorGroup, innerW, innerH, 0.5, 0, OH / 2, -(OD / 2 - WT - 0.5), intMat);
  // Interior left wall
  addBox(interiorGroup, 0.5, innerH, innerD, -(innerW / 2), OH / 2, -0.5, intMat);
  // Interior right wall
  addBox(interiorGroup, 0.5, innerH, innerD, (innerW / 2), OH / 2, -0.5, intMat);
  // Interior floor
  addBox(interiorGroup, innerW, 0.5, innerD, 0, INTERIOR_FLOOR_Y, -0.5, intMat);
  // Interior ceiling
  addBox(interiorGroup, innerW, 0.5, innerD, 0, INTERIOR_CEIL_Y - 0.5, -0.5, intMat);

  // - 7. Shelves (3 levels, visible through glass) ------
  const shelvesGroup = new THREE.Group();
  shelvesGroup.userData.partId = 'shelves';
  scene.add(shelvesGroup);
  const shelfMat = matSSInterior();
  SHELF_YS.forEach(sy => {
    // Shelf plate
    addBox(shelvesGroup, SHELF_W, SHELF_T, SHELF_D, 0, sy, -1, shelfMat);
    // Front lip (anti-slip rail)
    addBox(shelvesGroup, SHELF_W, SHELF_LIP, SHELF_T,
      0, sy + SHELF_LIP / 2, OD / 2 - WT - SHELF_T / 2 - 1, shelfMat, false);
  });

  // - 8. Annotations --------------------─
  placeAnnotations(
    scene,
    [
      { partId: 'body-shell',    anchor: new THREE.Vector3(OW / 2 - 1, OH / 2, 0),                          label: 'Body SUS 304 (Brushed Vertikal)' },
      { partId: 'glass-panels',  anchor: new THREE.Vector3(RIGHT_DOOR_X, DOOR_Y + (DIVIDER_H + GLASS_H) / 2, OD / 2), label: 'Panel Kaca Clear ×4' },
      { partId: 'door-left',     anchor: new THREE.Vector3(LEFT_DOOR_X, DOOR_Y, OD / 2),                    label: 'Frame Pintu SUS 304' },
      { partId: 'handles',       anchor: new THREE.Vector3(1, DOOR_Y, OD / 2 + 2),                          label: 'Handle Bar + Cam-Lock' },
      { partId: 'shelves',       anchor: new THREE.Vector3(0, SHELF_YS[1], 0),                              label: 'Rak SUS 304 ×3 Tingkat' },
      { partId: 'plinth',        anchor: new THREE.Vector3(0, PLINTH_H / 2, OD / 2),                        label: 'Plinth / Base' },
    ],
    OW / 2 + 50,
    [-5, OH + 5],
  );

  return { leftPivot, rightPivot };
}

// -─ React component ---------------------

export function PacsCabinetAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );
  const [doorsOpen, setDoorsOpen] = useState(false);
  const { attachHighlight } = useHighlightController();

  // Refs to pivot groups — populated in onInit, used in onTick
  const leftPivotRef  = useRef<THREE.Group | null>(null);
  const rightPivotRef = useRef<THREE.Group | null>(null);

  // onTick: lerp door rotation toward target angle, return true while moving
  const onTick = useCallback(() => {
    const lp = leftPivotRef.current;
    const rp = rightPivotRef.current;
    if (!lp || !rp) return false;

    const targetL =  doorsOpen ?  DOOR_OPEN_ANGLE : 0;   // left opens +Y (outward left)
    const targetR =  doorsOpen ? -DOOR_OPEN_ANGLE : 0;   // right opens -Y (outward right)
    const SPEED = 0.08;

    const prevL = lp.rotation.y;
    const prevR = rp.rotation.y;

    lp.rotation.y += (targetL - lp.rotation.y) * SPEED;
    rp.rotation.y += (targetR - rp.rotation.y) * SPEED;

    // Still animating if delta > threshold
    const moving =
      Math.abs(lp.rotation.y - targetL) > 0.001 ||
      Math.abs(rp.rotation.y - targetR) > 0.001;

    // Snap to target when close enough
    if (!moving) {
      lp.rotation.y = targetL;
      rp.rotation.y = targetR;
    }

    return moving || lp.rotation.y !== prevL || rp.rotation.y !== prevR;
  }, [doorsOpen]);

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 80,
      maxDistance: 1000,
    },
    onInit: (refs) => {
      const extras = buildScene(refs.scene, refs.renderer);
      leftPivotRef.current  = extras.leftPivot;
      rightPivotRef.current = extras.rightPivot;
      const p = product.cameraPresets[0];
      applyCameraPreset(refs, p.position, p.target);
      attachHighlight(refs);
    },
    onTick,
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
      {/* Door toggle button */}
      <div className="flex justify-center py-1 bg-white/80 border-b border-gray-100">
        <button
          onClick={() => setDoorsOpen(v => !v)}
          className="px-4 py-1.5 text-xs font-medium rounded-full border transition-colors
            bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400
            hover:text-blue-700 active:scale-95"
        >
          {doorsOpen ? '🚪 Tutup Pintu' : '🚪 Buka Pintu'}
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  );
}
