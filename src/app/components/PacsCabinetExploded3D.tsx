/**
 * PacsCabinetExploded3D.tsx - TRUE EXPLODED VIEW
 * ------------------------------─
 * PACS Cabinet SUS-304 - komponen utama terpisah secara spasial:
 *   - Top panel    → diangkat ke atas (+Y)
 *   - Left door    → ditarik ke kiri (-X) dan sedikit ke depan (+Z)
 *   - Right door   → ditarik ke kanan (+X) dan sedikit ke depan (+Z)
 *   - Shelf rack   → ditarik ke depan (+Z)
 *   - Body shell   → tetap di tengah (tanpa top, tanpa front)
 *   - Dashed connector lines antar komponen
 * ------------------------------─
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { useHighlightController } from '../hooks/useHighlightController';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// -─ Dimensi (scene units, 1 unit = 10mm) ---------─
const OW = 120;
const OH = 200;
const OD = 40;
const WT = 2;

const PLINTH_H = 8;
const OPENING_W = OW - 2 * WT;         // 116
const OPENING_H = OH - WT - PLINTH_H;  // 190

const DOOR_W = 57;
const DOOR_H = 188;
const DOOR_T = 2.8;
const DOOR_Y = PLINTH_H + OPENING_H / 2;  // 103
const LEFT_DOOR_X  = -(OPENING_W / 4);     // -29
const RIGHT_DOOR_X =  (OPENING_W / 4);     // +29

const DFRAME = 3;
const DIVIDER_H = 3;
const GLASS_W = DOOR_W - 2 * DFRAME;
const GLASS_H = (DOOR_H - 2 * DFRAME - DIVIDER_H) / 2;
const GLASS_T = 1.2;

const HANDLE_LEN = 16.5;
const HANDLE_DIA = 1.5;

const SHELF_W = OPENING_W - 2;
const SHELF_D = OD - 2 * WT - 2;
const SHELF_T = 0.4;
const SHELF_LIP = 2;
const INTERIOR_FLOOR_Y = PLINTH_H + WT;
const INTERIOR_CEIL_Y  = OH - WT;
const INTERIOR_H = INTERIOR_CEIL_Y - INTERIOR_FLOOR_Y;
const SHELF_YS = [
  INTERIOR_FLOOR_Y + INTERIOR_H * 1 / 4,
  INTERIOR_FLOOR_Y + INTERIOR_H * 2 / 4,
  INTERIOR_FLOOR_Y + INTERIOR_H * 3 / 4,
];

// -─ Explosion gap ---------------------
const GAP = 35;

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
    transparent: true, opacity: 0.35, side: THREE.DoubleSide, envMapIntensity: 1.2,
  });
}

function matPlinth() {
  return new THREE.MeshStandardMaterial({
    color: 0xc0ccd4, roughness: 0.25, metalness: 0.94, envMapIntensity: 1.1,
  });
}

// -─ Geometry helpers --------------------─

function addBox(
  parent: THREE.Object3D,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  mat: THREE.Material,
  shadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  parent.add(mesh);
  return mesh;
}

function addCyl(
  parent: THREE.Object3D,
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
  parent.add(mesh);
  return mesh;
}

// -─ Dashed connector lines ----------------─

function addDashedLine(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineDashedMaterial({
    color: 0x8ca0b8,
    dashSize: 8,
    gapSize: 5,
    opacity: 0.32,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  line.renderOrder = 997;
  scene.add(line);
}

/** Connect 4 corners of body top to lifted top panel */
function addTopConnectors(
  scene: THREE.Scene,
  halfW: number, halfD: number,
  yBottom: number, yTop: number,
) {
  const corners: [number, number][] = [
    [-halfW, -halfD],
    [ halfW, -halfD],
    [ halfW,  halfD],
    [-halfW,  halfD],
  ];
  for (const [cx, cz] of corners) {
    addDashedLine(scene,
      new THREE.Vector3(cx, yBottom, cz),
      new THREE.Vector3(cx, yTop, cz),
    );
  }
}

/** Connect door on body to its exploded position */
function addDoorConnectors(
  scene: THREE.Scene,
  bodyX: number, explodedX: number,
  halfH: number, yCenter: number,
  bodyZ: number, explodedZ: number,
) {
  const ys = [yCenter - halfH, yCenter + halfH];
  const zs = [bodyZ - DOOR_T / 2, bodyZ + DOOR_T / 2];
  for (const y of ys) {
    for (const z of zs) {
      addDashedLine(scene,
        new THREE.Vector3(bodyX, y, z),
        new THREE.Vector3(explodedX, y, explodedZ + (z - bodyZ)),
      );
    }
  }
}

/** Connect body interior to exploded shelf position */
function addShelfConnectors(
  scene: THREE.Scene,
  halfW: number, shelfY: number,
  bodyZ: number, explodedZ: number,
) {
  const xs = [-halfW, halfW];
  for (const x of xs) {
    addDashedLine(scene,
      new THREE.Vector3(x, shelfY, bodyZ),
      new THREE.Vector3(x, shelfY, explodedZ),
    );
  }
}

// -─ Build one door assembly (flat, at exploded position) --

function buildDoorAssembly(parent: THREE.Object3D, xCenter: number, zCenter: number, isRightDoor: boolean) {
  // Door leaf with 2 glass cutout holes
  const shape = new THREE.Shape();
  shape.moveTo(-DOOR_W / 2, -DOOR_H / 2);
  shape.lineTo( DOOR_W / 2, -DOOR_H / 2);
  shape.lineTo( DOOR_W / 2,  DOOR_H / 2);
  shape.lineTo(-DOOR_W / 2,  DOOR_H / 2);
  shape.closePath();

  const upperCY = (DIVIDER_H + GLASS_H) / 2;
  const lowerCY = -(DIVIDER_H + GLASS_H) / 2;

  // Upper glass hole
  const upperHole = new THREE.Path();
  upperHole.moveTo(-GLASS_W / 2, upperCY - GLASS_H / 2);
  upperHole.lineTo( GLASS_W / 2, upperCY - GLASS_H / 2);
  upperHole.lineTo( GLASS_W / 2, upperCY + GLASS_H / 2);
  upperHole.lineTo(-GLASS_W / 2, upperCY + GLASS_H / 2);
  upperHole.closePath();
  shape.holes.push(upperHole);

  // Lower glass hole
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
  doorMesh.position.set(xCenter, DOOR_Y, zCenter);
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  parent.add(doorMesh);

  // Edge lines
  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  doorEdges.position.copy(doorMesh.position);
  parent.add(doorEdges);

  // Glass panels
  const glassMat = matGlass();
  [upperCY, lowerCY].forEach(cy => {
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(GLASS_W, GLASS_H, GLASS_T),
      glassMat,
    );
    glass.position.set(xCenter, DOOR_Y + cy, zCenter);
    parent.add(glass);
  });

  // Horizontal divider bar
  addBox(parent, GLASS_W + 2, DIVIDER_H, DOOR_T * 0.8,
    xCenter, DOOR_Y, zCenter, matSSBrushed());

  // Handle at inner edge
  const handleSign = isRightDoor ? -1 : 1;
  const handleX = xCenter + handleSign * (DOOR_W / 2 - 3);
  [-6, 6].forEach(dy => {
    addBox(parent, 1.5, 1.5, 2.5, handleX, DOOR_Y + dy, zCenter + 1, matSSPolished());
  });
  addCyl(parent, HANDLE_DIA / 2, HANDLE_DIA / 2, HANDLE_LEN, 12,
    handleX, DOOR_Y, zCenter + 2, matSSPolished(), 0, 0);

  // Cam-lock (right door only)
  if (isRightDoor) {
    addBox(parent, 3, 4, 2, handleX, DOOR_Y - HANDLE_LEN / 2 - 4, zCenter + 1, matSSPolished());
  }

  // Concealed hinges at outer edge
  const hingeSign = isRightDoor ? 1 : -1;
  const hingeX = xCenter + hingeSign * (DOOR_W / 2);
  [DOOR_Y + DOOR_H / 2 - 10, DOOR_Y, DOOR_Y - DOOR_H / 2 + 10].forEach(hy => {
    addBox(parent, 1, 6, DOOR_T * 0.8, hingeX + hingeSign * 0.5, hy, zCenter, matSSPolished(), false);
  });
}

// -─ Scene builder ----------------------

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {

  // - 0. PBR Environment -------------------
  renderer.toneMappingExposure = 0.85;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  const ssMat = matSSBrushed();

  // - 1. Body shell (NO top panel, NO front) ---------
  const bodyGroup = new THREE.Group();
  bodyGroup.userData.partId = 'body';
  scene.add(bodyGroup);

  // Bottom panel
  addBox(bodyGroup, OW, WT, OD, 0, WT / 2, 0, ssMat);
  // Left side wall
  addBox(bodyGroup, WT, OH - 2 * WT, OD, -(OW / 2 - WT / 2), OH / 2, 0, ssMat);
  // Right side wall
  addBox(bodyGroup, WT, OH - 2 * WT, OD, (OW / 2 - WT / 2), OH / 2, 0, ssMat);
  // Back wall
  addBox(bodyGroup, OW - 2 * WT, OH - 2 * WT, WT, 0, OH / 2, -(OD / 2 - WT / 2), ssMat);

  // Plinth (separate partId so it can be highlighted independently)
  const plinthGroup = new THREE.Group();
  plinthGroup.userData.partId = 'plinth';
  scene.add(plinthGroup);

  // Plinth front panel
  addBox(plinthGroup, OPENING_W, PLINTH_H - WT, WT,
    0, WT + (PLINTH_H - WT) / 2, OD / 2 - WT / 2 - 0.5, matPlinth());
  // Bottom mounting lip
  addBox(plinthGroup, OW + 1.5, 0.6, OD + 1.5, 0, 0.3, 0, ssMat, false);

  // Interior walls (logically part of body shell)
  const intMat = matSSInterior();
  const innerW = OW - 2 * WT - 1;
  const innerH = OH - 2 * WT - 1;
  const innerD = OD - WT - 1;
  addBox(bodyGroup, innerW, innerH, 0.5, 0, OH / 2, -(OD / 2 - WT - 0.5), intMat);
  addBox(bodyGroup, 0.5, innerH, innerD, -(innerW / 2), OH / 2, -0.5, intMat);
  addBox(bodyGroup, 0.5, innerH, innerD, (innerW / 2), OH / 2, -0.5, intMat);
  addBox(bodyGroup, innerW, 0.5, innerD, 0, INTERIOR_FLOOR_Y, -0.5, intMat);

  // - 2. Top panel - lifted by GAP -------------─
  const topGroup = new THREE.Group();
  topGroup.userData.partId = 'top';
  scene.add(topGroup);

  const topY = OH - WT / 2 + GAP;
  addBox(topGroup, OW, WT, OD, 0, topY, 0, ssMat);

  // Top panel edge lines
  const topGeo = new THREE.BoxGeometry(OW, WT, OD);
  const topEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(topGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  topEdges.position.set(0, topY, 0);
  topGroup.add(topEdges);

  // Connectors: body → top panel
  addTopConnectors(scene, OW / 2, OD / 2, OH - WT, topY - WT / 2);

  // - 3. Left door - pulled left and forward ---------
  const leftDoorGroup = new THREE.Group();
  leftDoorGroup.userData.partId = 'left-door';
  scene.add(leftDoorGroup);

  const leftDoorExX = LEFT_DOOR_X - GAP;
  const leftDoorExZ = OD / 2 + GAP * 0.6;
  buildDoorAssembly(leftDoorGroup, leftDoorExX, leftDoorExZ, false);

  // Connectors: body left edge → left door
  addDoorConnectors(scene,
    LEFT_DOOR_X, leftDoorExX,
    DOOR_H / 2, DOOR_Y,
    OD / 2 - DOOR_T / 2, leftDoorExZ,
  );

  // - 4. Right door - pulled right and forward --------
  const rightDoorGroup = new THREE.Group();
  rightDoorGroup.userData.partId = 'right-door';
  scene.add(rightDoorGroup);

  const rightDoorExX = RIGHT_DOOR_X + GAP;
  const rightDoorExZ = OD / 2 + GAP * 0.6;
  buildDoorAssembly(rightDoorGroup, rightDoorExX, rightDoorExZ, true);

  // Connectors: body right edge → right door
  addDoorConnectors(scene,
    RIGHT_DOOR_X, rightDoorExX,
    DOOR_H / 2, DOOR_Y,
    OD / 2 - DOOR_T / 2, rightDoorExZ,
  );

  // - 5. Shelves - pulled forward --------------─
  const shelvesGroup = new THREE.Group();
  shelvesGroup.userData.partId = 'shelves';
  scene.add(shelvesGroup);

  const shelfExZ = GAP;
  const shelfMat = matSSInterior();
  SHELF_YS.forEach(sy => {
    addBox(shelvesGroup, SHELF_W, SHELF_T, SHELF_D, 0, sy, shelfExZ, shelfMat);
    addBox(shelvesGroup, SHELF_W, SHELF_LIP, SHELF_T,
      0, sy + SHELF_LIP / 2, shelfExZ + SHELF_D / 2 - SHELF_T / 2, shelfMat, false);
  });

  // Shelf edge lines (middle shelf only, for visual clarity)
  const shelfGeo = new THREE.BoxGeometry(SHELF_W, SHELF_T, SHELF_D);
  const shelfEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(shelfGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  shelfEdges.position.set(0, SHELF_YS[1], shelfExZ);
  shelvesGroup.add(shelfEdges);

  // Connectors: body interior → shelves
  addShelfConnectors(scene, SHELF_W / 2, SHELF_YS[0], 0, shelfExZ);
  addShelfConnectors(scene, SHELF_W / 2, SHELF_YS[2], 0, shelfExZ);

  // - 6. Annotations --------------------─
  placeAnnotations(
    scene,
    [
      { partId: 'top',
        anchor: new THREE.Vector3(0, topY, 0),                            label: 'Top Panel SUS 304' },
      { partId: 'left-door',
        anchor: new THREE.Vector3(leftDoorExX, DOOR_Y, leftDoorExZ),      label: 'Pintu Kiri (Frame + Kaca ×2)' },
      { partId: 'right-door',
        anchor: new THREE.Vector3(rightDoorExX, DOOR_Y, rightDoorExZ),    label: 'Pintu Kanan + Cam-Lock' },
      { partId: 'shelves',
        anchor: new THREE.Vector3(0, SHELF_YS[1], shelfExZ),              label: 'Rak SUS 304 ×3' },
      { partId: 'body',
        anchor: new THREE.Vector3(OW / 2 - 1, OH / 2, 0),                label: 'Body Shell (Brushed Vertikal)' },
      { partId: 'plinth',
        anchor: new THREE.Vector3(0, PLINTH_H / 2, OD / 2),              label: 'Plinth / Base' },
    ],
    OW / 2 + GAP + 40,
    [-10, topY + 10],
  );
}

// -─ React component ---------------------

export function PacsCabinetExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[5]?.name ?? product.cameraPresets[0]?.name ?? '',
  );

  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 80,
      maxDistance: 1000,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      const p = product.cameraPresets[5] ?? product.cameraPresets[0];
      applyCameraPreset(refs, p.position, p.target);
      attachHighlight(refs);
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
      `${product.id}-exploded-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
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
