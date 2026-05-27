/**
 * SurgicalPanelExploded3D.tsx - EXPLODED VIEW
 * ------------------------------─
 * Surgical Control Panel Room Touchscreen - komponen terpisah.
 *
 * 5 kelompok komponen dipisahkan sepanjang sumbu Z (depth):
 *   E. Glass overlay + Buttons    → Z += GAP×2  (depan)
 *   D. LCD Touchscreen (emissive) → Z += GAP    (depan)
 *   C. Housing body + Bezel       → Z = 0       (referensi)
 *   B. Mounting flange            → Z -= GAP    (belakang)
 *   A. Control Module (PCB)       → Z -= GAP×2  (paling belakang)
 *
 * Tidak ada wall fragment di exploded view.
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
import { createScreenUITexture } from './surgical-panel-texture';

interface Props { product: Product }

// -─ Dimensi (scene units, 1 unit = 10mm) ---------─
const HW = 45;          // housing width  450mm
const HH = 31;          // housing height 310mm
const FD = 8.5;         // housing depth  85mm

const BEZEL_L = 4;
const BEZEL_R = 4;
const BEZEL_T = 5;
const BEZEL_B = 6;

const OPENING_W = HW - BEZEL_L - BEZEL_R;  // 37
const OPENING_H = HH - BEZEL_T - BEZEL_B;  // 20
const OPENING_CY = BEZEL_B + OPENING_H / 2; // 16

const SCREEN_W = 34.5;
const SCREEN_H = 19.4;

const FLANGE_LIP = 2;
const FLANGE_T   = 0.3;

const GAP = 12; // 120mm explosion separation

// -─ Material factories -------------------

function matSS304() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dde6, roughness: 0.20, metalness: 0.94, envMapIntensity: 1.3,
  });
}

function matFlange() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4dc, roughness: 0.22, metalness: 0.93, envMapIntensity: 1.2,
  });
}

function matDarkBezel() {
  return new THREE.MeshStandardMaterial({
    color: 0x0a0e1a, roughness: 0.85, metalness: 0.0,
  });
}

function matGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.02, metalness: 0.0,
    transparent: true, opacity: 0.12, side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  });
}

function matPCB() {
  return new THREE.MeshStandardMaterial({
    color: 0x2e7d32, roughness: 0.65, metalness: 0.15,
  });
}

function matPCBCase() {
  return new THREE.MeshStandardMaterial({
    color: 0x455a64, roughness: 0.50, metalness: 0.40,
  });
}

// -─ Geometry helpers --------------------

function addBox(
  parent: THREE.Object3D, w: number, h: number, d: number,
  x: number, y: number, z: number, mat: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCyl(
  parent: THREE.Object3D,
  rTop: number, rBot: number, h: number, seg: number,
  x: number, y: number, z: number, mat: THREE.Material,
  rotX = 0,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  if (rotX) mesh.rotation.x = rotX;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// -─ Dashed connector lines -----------------

function addDashedLine(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineDashedMaterial({
    color: 0x8ca0b8,
    dashSize: 4,
    gapSize: 3,
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

function addZConnectors(
  scene: THREE.Scene,
  halfW: number, halfH: number, yCenter: number,
  z1: number, z2: number,
) {
  const corners: [number, number][] = [
    [-halfW, yCenter - halfH],
    [ halfW, yCenter - halfH],
    [ halfW, yCenter + halfH],
    [-halfW, yCenter + halfH],
  ];
  for (const [x, y] of corners) {
    addDashedLine(scene, new THREE.Vector3(x, y, z1), new THREE.Vector3(x, y, z2));
  }
}

// -─ Build scene ----------------------─

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // 0. PBR Environment
  renderer.toneMappingExposure = 1.10;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  // -─ Group A: Control Module (PCB) at Z -= GAP×2 -----
  const zA = -GAP * 2;

  const controlGroup = new THREE.Group();
  controlGroup.userData.partId = 'control-module';
  scene.add(controlGroup);

  // PCB module case
  addBox(controlGroup, HW - 4, HH - 8, 3, 0, HH / 2, zA, matPCBCase());
  // PCB board inside
  addBox(controlGroup, HW - 8, HH - 12, 0.3, 0, HH / 2, zA + 1.7, matPCB());
  // Some ICs on the PCB (small blocks)
  const icMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.3 });
  addBox(controlGroup, 4, 4, 0.5, -8, HH / 2 + 4, zA + 2, icMat);
  addBox(controlGroup, 6, 3, 0.5, 5, HH / 2 - 2, zA + 2, icMat);
  addBox(controlGroup, 3, 5, 0.5, 12, HH / 2 + 3, zA + 2, icMat);
  // Power connector
  addBox(controlGroup, 3, 2, 1.5, -15, HH / 2 - 5, zA + 2, new THREE.MeshStandardMaterial({ color: 0x2196f3, roughness: 0.5, metalness: 0.2 }));

  // -─ Group B: Mounting flange at Z -= GAP ---------
  const zB = -GAP;

  const flangeGroup = new THREE.Group();
  flangeGroup.userData.partId = 'flange';
  scene.add(flangeGroup);

  const flangeShape = new THREE.Shape();
  const fhw = HW / 2 + FLANGE_LIP;
  flangeShape.moveTo(-fhw, -FLANGE_LIP);
  flangeShape.lineTo( fhw, -FLANGE_LIP);
  flangeShape.lineTo( fhw, HH + FLANGE_LIP);
  flangeShape.lineTo(-fhw, HH + FLANGE_LIP);
  flangeShape.closePath();

  const flangeHole = new THREE.Path();
  flangeHole.moveTo(-HW / 2, 0);
  flangeHole.lineTo( HW / 2, 0);
  flangeHole.lineTo( HW / 2, HH);
  flangeHole.lineTo(-HW / 2, HH);
  flangeHole.closePath();
  flangeShape.holes.push(flangeHole);

  const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, { depth: FLANGE_T, bevelEnabled: false });
  const flangeMesh = new THREE.Mesh(flangeGeo, matFlange());
  flangeMesh.position.set(0, 0, zB);
  flangeMesh.castShadow = true;
  flangeGroup.add(flangeMesh);

  // Mounting screws on flange
  const screwMat = new THREE.MeshStandardMaterial({ color: 0xe0e8f0, roughness: 0.10, metalness: 0.97 });
  const screwPos: [number, number][] = [
    [-(HW / 2 + FLANGE_LIP * 0.5), -(FLANGE_LIP * 0.5)],
    [ (HW / 2 + FLANGE_LIP * 0.5), -(FLANGE_LIP * 0.5)],
    [-(HW / 2 + FLANGE_LIP * 0.5),  HH + FLANGE_LIP * 0.5],
    [ (HW / 2 + FLANGE_LIP * 0.5),  HH + FLANGE_LIP * 0.5],
  ];
  for (const [sx, sy] of screwPos) {
    addCyl(flangeGroup, 0.5, 0.5, 0.3, 12, sx, sy, zB + FLANGE_T + 0.15, screwMat, Math.PI / 2);
  }

  // -─ Group C: Housing body at Z = 0 -----------─
  const zC = 0;

  const housingGroup = new THREE.Group();
  housingGroup.userData.partId = 'housing';
  scene.add(housingGroup);

  const housingShape = new THREE.Shape();
  housingShape.moveTo(-HW / 2, 0);
  housingShape.lineTo( HW / 2, 0);
  housingShape.lineTo( HW / 2, HH);
  housingShape.lineTo(-HW / 2, HH);
  housingShape.closePath();

  const openL = -HW / 2 + BEZEL_L;
  const openB = BEZEL_B;
  const openR = openL + OPENING_W;
  const openT = openB + OPENING_H;
  const housingHole = new THREE.Path();
  housingHole.moveTo(openL, openB);
  housingHole.lineTo(openR, openB);
  housingHole.lineTo(openR, openT);
  housingHole.lineTo(openL, openT);
  housingHole.closePath();
  housingShape.holes.push(housingHole);

  const housingGeo = new THREE.ExtrudeGeometry(housingShape, { depth: FD, bevelEnabled: false });
  housingGeo.translate(0, 0, -FD / 2); // center along depth

  const housingMesh = new THREE.Mesh(housingGeo, matSS304());
  housingMesh.position.set(0, 0, zC);
  housingMesh.castShadow = true;
  housingMesh.receiveShadow = true;
  housingGroup.add(housingMesh);

  const housingEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(housingGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  housingEdges.position.copy(housingMesh.position);
  housingGroup.add(housingEdges);

  // Back panel
  addBox(housingGroup, HW, HH, 0.3, 0, HH / 2, zC - FD / 2 + 0.15, matSS304());

  // Dark bezel backing (visible through opening)
  addBox(housingGroup, OPENING_W, OPENING_H, 0.1, 0, OPENING_CY, zC + FD / 2 - 0.35, matDarkBezel());

  // Speaker grill on right side (separate partId for highlight)
  const speakerGroup = new THREE.Group();
  speakerGroup.userData.partId = 'speaker';
  scene.add(speakerGroup);

  const grillMat = new THREE.MeshStandardMaterial({ color: 0x555f6a, roughness: 0.45, metalness: 0.80 });
  addBox(speakerGroup, 0.15, 6, 4, HW / 2 + 0.08, HH / 2, zC, grillMat);

  // -─ Group D: LCD Touchscreen at Z += GAP ---------
  const zD = GAP;

  const screenGroup = new THREE.Group();
  screenGroup.userData.partId = 'screen';
  scene.add(screenGroup);

  const screenTex = createScreenUITexture();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screenGeo = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, OPENING_CY, zD);
  screenGroup.add(screenMesh);

  // -─ Group E: Glass + Buttons at Z += GAP×2 -------─
  const zE = GAP * 2;

  const glassGroup = new THREE.Group();
  glassGroup.userData.partId = 'glass';
  scene.add(glassGroup);

  // Glass overlay
  const glassGeo = new THREE.PlaneGeometry(OPENING_W - 0.5, OPENING_H - 0.5);
  const glassMesh = new THREE.Mesh(glassGeo, matGlass());
  glassMesh.position.set(0, OPENING_CY, zE);
  glassGroup.add(glassMesh);

  // Subtle glass edge highlight
  const glassEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(OPENING_W - 0.5, OPENING_H - 0.5, 0.2)),
    new THREE.LineBasicMaterial({ color: 0x90caf9, opacity: 0.25, transparent: true }),
  );
  glassEdges.position.set(0, OPENING_CY, zE);
  glassGroup.add(glassEdges);

  // Function buttons (separate partId)
  const buttonsGroup = new THREE.Group();
  buttonsGroup.userData.partId = 'buttons';
  scene.add(buttonsGroup);

  const btnSpanX = HW - BEZEL_L - BEZEL_R - 4;
  const colors = [0x42A5F5, 0x42A5F5, 0x42A5F5, 0x66BB6A, 0xFF1744, 0xFFD600];
  for (let i = 0; i < 6; i++) {
    const bx = -btnSpanX / 2 + (i * btnSpanX) / 5;
    addCyl(buttonsGroup, 0.6, 0.6, 0.2, 16, bx, BEZEL_B / 2, zE - 0.5,
      new THREE.MeshBasicMaterial({ color: colors[i] }), Math.PI / 2);
  }

  // -─ Dashed connector lines ----------------
  // A ↔ B (PCB ↔ flange)
  addZConnectors(scene, HW / 2 - 2, HH / 2 - 4, HH / 2, zA + 1.5, zB);

  // B ↔ C (flange ↔ housing)
  addZConnectors(scene, HW / 2, HH / 2, HH / 2, zB + FLANGE_T, zC - FD / 2);

  // C ↔ D (housing ↔ screen)
  addZConnectors(scene, OPENING_W / 2, OPENING_H / 2, OPENING_CY, zC + FD / 2, zD);

  // D ↔ E (screen ↔ glass)
  addZConnectors(scene, SCREEN_W / 2, SCREEN_H / 2, OPENING_CY, zD, zE);

  // -─ Annotations ---------------------
  placeAnnotations(
    scene,
    [
      { partId: 'control-module',
        anchor: new THREE.Vector3(0, HH / 2, zA),
        label: 'Control Module (PLC + Modbus TCP/IP)' },
      { partId: 'flange',
        anchor: new THREE.Vector3(HW / 2 + FLANGE_LIP * 0.5, HH / 2, zB),
        label: 'Mounting Flange + Baut ×4' },
      { partId: 'housing',
        anchor: new THREE.Vector3(HW / 2 - 1, HH / 2, zC),
        label: 'Housing SUS 304 (450×310×85 mm)' },
      { partId: 'screen',
        anchor: new THREE.Vector3(0, OPENING_CY, zD),
        label: 'LCD 15.6" Full HD Touchscreen' },
      { partId: 'glass',
        anchor: new THREE.Vector3(0, OPENING_CY + OPENING_H / 2 - 1, zE),
        label: 'Tempered Glass Cover (IP65)' },
      { partId: 'buttons',
        anchor: new THREE.Vector3(0, BEZEL_B / 2, zE - 0.5),
        label: 'Button Kontrol ×6 (LED Backlit)' },
      { partId: 'speaker',
        anchor: new THREE.Vector3(HW / 2, HH / 2, zC),
        label: 'Speaker Grill (Audio Alarm)' },
    ],
    HW / 2 + 35,
    [-5, HH + 10],
  );
}

// -─ React component --------------------─

export function SurgicalPanelExploded3D({ product }: Props) {
  const lastPreset = product.cameraPresets[product.cameraPresets.length - 1];
  const [activePreset, setActivePreset] = useState<string>(
    lastPreset?.name ?? '',
  );

  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 20,
      maxDistance: 400,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      if (lastPreset) applyCameraPreset(refs, lastPreset.position, lastPreset.target);
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
