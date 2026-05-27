/**
 * PassBoxExploded3D.tsx - TRUE EXPLODED VIEW
 * ------------------------------─
 * Pass Box SUS-304 - komponen utama terpisah secara spasial:
 *   • Front door → ditarik ke depan (+Z)
 *   • Back door  → ditarik ke belakang (-Z)
 *   • Top panel  → diangkat ke atas (+Y)
 *   • Body shell → tetap di tengah (tanpa tutup atas)
 *   • Dashed connector lines antar komponen
 *   • Interior terlihat jelas tanpa halangan
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
const OW = 80;
const OH = 80;
const OD = 50;
const WT = 3;

const FRAME_W = OW - WT * 2;  // 74
const FRAME_H = OH - WT * 2;  // 74

const DOOR_W = FRAME_W - 2;   // 72
const DOOR_H = FRAME_H - 2;   // 72
const DOOR_T = 4;

const GLASS_W = 40;
const GLASS_H = 40;
const GLASS_T = 1.2;

const GASKET_W = 1.2;

// -─ Explosion gap ---------------------
const GAP = 30;  // 300mm gap between separated components

// -─ Material factories -------------------─

function matSSBrushed() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4dc, roughness: 0.22, metalness: 0.92, envMapIntensity: 1.2,
  });
}

function matSSMirror() {
  return new THREE.MeshStandardMaterial({
    color: 0xd8e2ea, roughness: 0.04, metalness: 0.97, envMapIntensity: 1.5,
  });
}

function matSSPolished() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dce6, roughness: 0.10, metalness: 0.95, envMapIntensity: 1.3,
  });
}

function matGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0x9ed4e8, roughness: 0.02, metalness: 0.0,
    transparent: true, opacity: 0.35, side: THREE.DoubleSide, envMapIntensity: 1.2,
  });
}

function matRubber() {
  return new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.85, metalness: 0.0,
  });
}

function matUVLamp() {
  return new THREE.MeshStandardMaterial({
    color: 0xb8f7ff, roughness: 0.20, metalness: 0.0,
    emissive: new THREE.Color(0x60e8ff), emissiveIntensity: 1.2,
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

/** Connect 4 corners of a rectangular face at two Z positions */
function addCornerConnectors(
  scene: THREE.Scene,
  halfW: number, halfH: number,
  yCenter: number,
  z1: number, z2: number,
) {
  const corners: [number, number][] = [
    [-halfW, -halfH],
    [ halfW, -halfH],
    [ halfW,  halfH],
    [-halfW,  halfH],
  ];
  for (const [cx, cy] of corners) {
    addDashedLine(
      scene,
      new THREE.Vector3(cx, yCenter + cy, z1),
      new THREE.Vector3(cx, yCenter + cy, z2),
    );
  }
}

/** Connect 4 corners between body top face and lifted top panel */
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
    addDashedLine(
      scene,
      new THREE.Vector3(cx, yBottom, cz),
      new THREE.Vector3(cx, yTop, cz),
    );
  }
}

// -─ Build a door assembly (flat, no rotation) -------

function buildDoorAssembly(parent: THREE.Object3D, centerZ: number) {
  // Door leaf with glass cutout
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-DOOR_W / 2, -DOOR_H / 2);
  doorShape.lineTo( DOOR_W / 2, -DOOR_H / 2);
  doorShape.lineTo( DOOR_W / 2,  DOOR_H / 2);
  doorShape.lineTo(-DOOR_W / 2,  DOOR_H / 2);
  doorShape.closePath();

  const glassHole = new THREE.Path();
  glassHole.moveTo(-GLASS_W / 2, -GLASS_H / 2);
  glassHole.lineTo( GLASS_W / 2, -GLASS_H / 2);
  glassHole.lineTo( GLASS_W / 2,  GLASS_H / 2);
  glassHole.lineTo(-GLASS_W / 2,  GLASS_H / 2);
  glassHole.closePath();
  doorShape.holes.push(glassHole);

  const doorGeo = new THREE.ExtrudeGeometry(doorShape, { depth: DOOR_T, bevelEnabled: false });
  doorGeo.translate(0, 0, -DOOR_T / 2);

  const doorMesh = new THREE.Mesh(doorGeo, matSSBrushed());
  doorMesh.position.set(0, OH / 2, centerZ);
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  parent.add(doorMesh);

  // Edge lines
  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  doorEdges.position.copy(doorMesh.position);
  parent.add(doorEdges);

  // Glass window
  const glassMesh = new THREE.Mesh(
    new THREE.BoxGeometry(GLASS_W, GLASS_H, GLASS_T),
    matGlass(),
  );
  glassMesh.position.set(0, OH / 2, centerZ);
  parent.add(glassMesh);

  // Glass frame
  const gfW = 2.0;
  const gfD = DOOR_T * 0.6;
  const gfMat = matSSPolished();
  [
    { pos: [0, OH / 2 + GLASS_H / 2 + gfW / 2, centerZ] as [number, number, number], size: [GLASS_W + gfW * 2, gfW, gfD] as [number, number, number] },
    { pos: [0, OH / 2 - GLASS_H / 2 - gfW / 2, centerZ] as [number, number, number], size: [GLASS_W + gfW * 2, gfW, gfD] as [number, number, number] },
    { pos: [-GLASS_W / 2 - gfW / 2, OH / 2, centerZ] as [number, number, number], size: [gfW, GLASS_H, gfD] as [number, number, number] },
    { pos: [GLASS_W / 2 + gfW / 2, OH / 2, centerZ] as [number, number, number], size: [gfW, GLASS_H, gfD] as [number, number, number] },
  ].forEach(({ pos, size }) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), gfMat);
    m.position.set(...pos);
    parent.add(m);
  });

  // Rubber gasket (on door face)
  const gasketMat = matRubber();
  addBox(parent, FRAME_W, GASKET_W, 2, 0, OH / 2 + FRAME_H / 2 - GASKET_W / 2, centerZ, gasketMat, false);
  addBox(parent, FRAME_W, GASKET_W, 2, 0, OH / 2 - FRAME_H / 2 + GASKET_W / 2, centerZ, gasketMat, false);
  addBox(parent, GASKET_W, FRAME_H - GASKET_W * 2, 2, -FRAME_W / 2 + GASKET_W / 2, OH / 2, centerZ, gasketMat, false);
  addBox(parent, GASKET_W, FRAME_H - GASKET_W * 2, 2, FRAME_W / 2 - GASKET_W / 2, OH / 2, centerZ, gasketMat, false);

  // Handle - left side
  const handleX = -DOOR_W / 2 + 10;
  const handleZ = centerZ + 3.5;
  [-6, 6].forEach(dy => {
    addBox(parent, 2, 2, 3, handleX, OH / 2 + dy, centerZ + 1.5, matSSPolished());
  });
  addCyl(parent, 1.0, 1.0, 18, 12, handleX, OH / 2, handleZ, matSSPolished(), 0, 0);

  // Cam-lock
  addBox(parent, 4, 6, 2, handleX, OH / 2 - 14, centerZ + 1.5, matSSPolished());
  addCyl(parent, 0.6, 0.6, 5, 8, handleX, OH / 2 - 17, centerZ + 2.7, matSSPolished(), 0, 0);

  // 3 Hinges - right side
  const hingeMat = matSSPolished();
  [OH / 2 + DOOR_H / 2 - 8, OH / 2, OH / 2 - DOOR_H / 2 + 8].forEach(hy => {
    addBox(parent, 3, 8, DOOR_T * 0.7, DOOR_W / 2, hy, centerZ, hingeMat);
    addCyl(parent, 0.8, 0.8, 9, 10, DOOR_W / 2 + 0.5, hy, centerZ, hingeMat, 0, 0);
  });
}

// -─ Scene builder ----------------------

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {

  // - 0. PBR Environment -------------------
  renderer.toneMappingExposure = 0.80;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  const ssMat = matSSBrushed();

  // - 1. Body shell (3 walls: bottom, left, right - NO top, NO front/back) -
  const bodyGroup = new THREE.Group();
  bodyGroup.userData.partId = 'body';
  scene.add(bodyGroup);

  // Bottom panel
  addBox(bodyGroup, OW, WT, OD, 0, WT / 2, 0, ssMat);
  // Left wall
  addBox(bodyGroup, WT, OH - WT * 2, OD, -(OW / 2 - WT / 2), OH / 2, 0, ssMat);
  // Right wall
  addBox(bodyGroup, WT, OH - WT * 2, OD, (OW / 2 - WT / 2), OH / 2, 0, ssMat);

  // Bottom mounting flange
  addBox(bodyGroup, OW + 3, 0.8, OD + 3, 0, 0.4, 0, matSSBrushed());

  // - 2. Top panel - lifted up by GAP -------------
  const topGroup = new THREE.Group();
  topGroup.userData.partId = 'top';
  scene.add(topGroup);

  const topY = OH - WT / 2 + GAP;
  addBox(topGroup, OW, WT, OD, 0, topY, 0, ssMat);

  // Top ports on lifted panel
  [-8, 8].forEach(px => {
    addCyl(topGroup, 1.0, 1.0, WT + 0.5, 12, px, topY, -10, matSSPolished(), 0, 0);
  });

  // Top panel edge lines
  const topGeo = new THREE.BoxGeometry(OW, WT, OD);
  const topEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(topGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  topEdges.position.set(0, topY, 0);
  topGroup.add(topEdges);

  // Connector lines: body → top panel (kept on scene root)
  addTopConnectors(scene, OW / 2, OD / 2, OH - WT, topY - WT / 2);

  // - 3. Front door - pulled forward by GAP ----------
  const frontDoorGroup = new THREE.Group();
  frontDoorGroup.userData.partId = 'front-door';
  scene.add(frontDoorGroup);

  const frontDoorZ = OD / 2 + GAP;
  buildDoorAssembly(frontDoorGroup, frontDoorZ);

  // Connector lines: body front face → front door
  addCornerConnectors(scene, DOOR_W / 2, DOOR_H / 2, OH / 2, OD / 2, frontDoorZ - DOOR_T / 2);

  // - 4. Back door - pulled backward by GAP ----------
  const backDoorGroup = new THREE.Group();
  backDoorGroup.userData.partId = 'back-door';
  scene.add(backDoorGroup);

  const backDoorZ = -(OD / 2 + GAP);
  buildDoorAssembly(backDoorGroup, backDoorZ);

  // Connector lines: body back face → back door
  addCornerConnectors(scene, DOOR_W / 2, DOOR_H / 2, OH / 2, -OD / 2, backDoorZ + DOOR_T / 2);

  // - 5. Interior detail (fully visible) ------------
  const interiorGroup = new THREE.Group();
  interiorGroup.userData.partId = 'interior';
  scene.add(interiorGroup);

  const innerW = OW - WT * 2 - 1;
  const innerH = OH - WT * 2 - 1;
  const innerD = OD - 2;
  const mirrorMat = matSSMirror();

  // Interior walls (no front/back - open, visible)
  addBox(interiorGroup, innerW, 0.5, innerD, 0, WT + 0.5, 0, mirrorMat);       // Floor
  addBox(interiorGroup, 0.5, innerH, innerD, -(innerW / 2), OH / 2, 0, mirrorMat); // Left
  addBox(interiorGroup, 0.5, innerH, innerD, (innerW / 2), OH / 2, 0, mirrorMat);  // Right

  // Interior rounded corners
  const cornerR = 2;
  const cornerH = innerH;
  const cornerMat = matSSMirror();
  const cornerGeo = new THREE.CylinderGeometry(cornerR, cornerR, cornerH, 8, 1, false, 0, Math.PI / 2);
  [
    { x: -(innerW / 2) + cornerR, z: -(innerD / 2) + cornerR, rotY: Math.PI },
    { x: (innerW / 2) - cornerR,  z: -(innerD / 2) + cornerR, rotY: -Math.PI / 2 },
    { x: -(innerW / 2) + cornerR, z: (innerD / 2) - cornerR,  rotY: Math.PI / 2 },
    { x: (innerW / 2) - cornerR,  z: (innerD / 2) - cornerR,  rotY: 0 },
  ].forEach(({ x, z, rotY }) => {
    const corner = new THREE.Mesh(cornerGeo, cornerMat);
    corner.position.set(x, OH / 2, z);
    corner.rotation.y = rotY;
    interiorGroup.add(corner);
  });

  // UV lamp
  addCyl(
    interiorGroup, 0.8, 0.8, 30, 8,
    0, OH - WT - 1.5, 0,
    matUVLamp(),
    0, Math.PI / 2,
  );

  // - 6. Control panel (on body left side) ----------─
  const controlGroup = new THREE.Group();
  controlGroup.userData.partId = 'control-panel';
  scene.add(controlGroup);

  const panelX = -(OW / 2);
  const panelY = OH - 8;
  const panelZ = -OD / 4;

  addBox(controlGroup, 0.5, 5, 9, panelX - 0.3, panelY, panelZ,
    new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.70, metalness: 0.0 }), false);
  addBox(controlGroup, 0.8, 2, 1.2, panelX - 0.6, panelY + 1, panelZ - 2,
    new THREE.MeshStandardMaterial({ color: 0xd91a1a, roughness: 0.60, metalness: 0.0 }), false);
  const ledMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0x22c55e, emissive: new THREE.Color(0x16a34a),
      emissiveIntensity: 2.0, roughness: 0.3, metalness: 0.0,
    }),
  );
  ledMesh.position.set(panelX - 0.6, panelY - 1, panelZ - 2);
  controlGroup.add(ledMesh);

  // - 7. Annotations ---------------------
  placeAnnotations(
    scene,
    [
      { partId: 'front-door',
        anchor: new THREE.Vector3(0, OH / 2, frontDoorZ),                     label: 'Pintu Depan SUS 304' },
      { partId: 'front-door',
        anchor: new THREE.Vector3(0, OH / 2, frontDoorZ - DOOR_T / 2),       label: 'Clear Glass 12mm' },
      { partId: 'top',
        anchor: new THREE.Vector3(0, topY, 0),                                label: 'Panel Atas (Diangkat)' },
      { partId: 'interior',
        anchor: new THREE.Vector3(innerW / 2 - 1, OH / 2, 0),                label: 'Interior Mirror + UV Lamp' },
      { partId: 'back-door',
        anchor: new THREE.Vector3(0, OH / 2, backDoorZ),                      label: 'Pintu Belakang (Identik)' },
      { partId: 'control-panel',
        anchor: new THREE.Vector3(-(OW / 2) - 0.3, OH - 8, -OD / 4),        label: 'Control Panel PLC' },
    ],
    OW / 2 + 55,
    [-5, topY + 5],
  );
}

// -─ React component ---------------------

export function PassBoxExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[4]?.name ?? product.cameraPresets[0]?.name ?? '',
  );

  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 60,
      maxDistance: 800,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      const p = product.cameraPresets[4] ?? product.cameraPresets[0];
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
