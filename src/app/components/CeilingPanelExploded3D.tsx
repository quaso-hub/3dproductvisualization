/**
 * CeilingPanelExploded3D.tsx — EXPLODED VIEW
 * ─────────────────────────────────────────────────────────────
 * Ceiling Panel System — components separated along Y-axis.
 *
 * 4 groups separated vertically:
 *   A. Hanger rods + mounting plate   → Y += GAP × 2  (topmost)
 *   B. Frame grid + LED strips        → Y += GAP       (structure)
 *   C. PIR panels + HEPA + LAF panel  → Y = 0          (reference)
 *   D. Pendant column + joint head    → Y -= GAP       (bottom)
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

// ─── Dimensions (same as assembled) ────────────────────────────
const MODULE = 240;
const FRAME_W = 8;
const FRAME_H = 12;
const PANEL_T = 7.5;
const PANEL_SIZE = (MODULE - 3 * FRAME_W) / 2; // 108
const PANEL_ACTUAL = PANEL_SIZE - 1;            // 107
const HALF_MOD = MODULE / 2;

const CELL_OFFSET = FRAME_W / 2 + PANEL_SIZE / 2; // 58
const PANEL_POSITIONS: [number, number][] = [
  [-CELL_OFFSET, -CELL_OFFSET],
  [+CELL_OFFSET, -CELL_OFFSET],
  [-CELL_OFFSET, +CELL_OFFSET],
  [+CELL_OFFSET, +CELL_OFFSET], // LAF panel
];

const HEPA_H = 7.6;
const PENDANT_COL_R = 5;
const PENDANT_COL_H = 30; // shorter in exploded for clarity
const PENDANT_PLATE_R = 10;
const PENDANT_PLATE_H = 1.5;
const ROD_R = 0.5;
const ROD_H = 50; // shorter in exploded
const ROD_INSET = 10;
const LED_STRIP_W = 3;
const LED_STRIP_H = 0.3;

const GAP = 40; // 400mm explosion separation

// ─── Material factories ────────────────────────────────────────

function matFrameWhite() {
  return new THREE.MeshStandardMaterial({
    color: 0xf2f2f0, roughness: 0.65, metalness: 0.05, envMapIntensity: 0.7,
  });
}

function matPanelHPL() {
  return new THREE.MeshStandardMaterial({
    color: 0xf5f5f3, roughness: 0.72, metalness: 0.0, envMapIntensity: 0.5,
  });
}

function matLEDCoolWhite() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xe8f4ff),
    emissive: new THREE.Color(0xe0ecff),
    emissiveIntensity: 2.5,
    roughness: 0.1,
    metalness: 0.05,
  });
}

function matHEPAMedia() {
  return new THREE.MeshStandardMaterial({
    color: 0xf2ece0, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.3,
  });
}

function matSUS304() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dde6, roughness: 0.18, metalness: 0.94, envMapIntensity: 1.3,
  });
}

function matZincSteel() {
  return new THREE.MeshStandardMaterial({
    color: 0xb4bec8, roughness: 0.38, metalness: 0.80, envMapIntensity: 0.9,
  });
}

// ─── Tileable perforated alphaMap ──────────────────────────────

function createPerforationAlphaMap(): THREE.CanvasTexture {
  const SCALE = 4;
  const PITCH = 6 * SCALE;
  const ROW_H = Math.round(6 * Math.sin(Math.PI / 3) * SCALE);
  const HOLE_R = 1.2 * SCALE;
  const TW = PITCH;
  const TH = ROW_H * 2;

  const canvas = document.createElement('canvas');
  canvas.width = TW;
  canvas.height = TH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = '#000';

  const rowDefs = [
    { y: 0, xOff: 0 },
    { y: ROW_H, xOff: PITCH / 2 },
  ];

  for (const { y, xOff } of rowDefs) {
    for (let x = xOff - PITCH; x <= TW + PITCH; x += PITCH) {
      ctx.beginPath();
      ctx.arc(x, y, HOLE_R, 0, Math.PI * 2);
      ctx.fill();
      if (y === 0) {
        ctx.beginPath();
        ctx.arc(x, TH, HOLE_R, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function matPerforatedFace(alphaMap: THREE.CanvasTexture, pw: number, pl: number) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf0f0ea,
    roughness: 0.70,
    metalness: 0.0,
    envMapIntensity: 0.5,
    alphaMap,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const pwMM = pw * 10;
  const plMM = pl * 10;
  const hPitch = 6;
  const vPitch = 6 * Math.sin(Math.PI / 3) * 2;
  alphaMap.repeat.set(pwMM / hPitch, plMM / vPitch);
  return mat;
}

// ─── Geometry helpers ──────────────────────────────────────────

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
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// ─── Dashed connector lines ────────────────────────────────────

function addDashedLine(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineDashedMaterial({
    color: 0x8ca0b8,
    dashSize: 6,
    gapSize: 4,
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

function addYConnectors(
  scene: THREE.Scene,
  halfW: number, halfL: number,
  y1: number, y2: number,
) {
  const corners: [number, number][] = [
    [-halfW, -halfL],
    [halfW, -halfL],
    [halfW, halfL],
    [-halfW, halfL],
  ];
  for (const [x, z] of corners) {
    addDashedLine(scene, new THREE.Vector3(x, y1, z), new THREE.Vector3(x, y2, z));
  }
}

// ─── Build scene ───────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  renderer.toneMappingExposure = 0.85;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  const frameMat = matFrameWhite();
  const panelMat = matPanelHPL();
  const ledMat   = matLEDCoolWhite();
  const hepaMat  = matHEPAMedia();
  const susMat   = matSUS304();
  const rodMat   = matZincSteel();

  // Group Y offsets
  const yA = GAP * 2;  // rods + plate (top)
  const yB = GAP;       // frame + LED (structure)
  const yC = 0;          // panels + HEPA (reference)
  const yD = -GAP;       // pendant (bottom)

  // ─── Group C: PIR panels + HEPA + LAF panel (Y = 0) ─────────

  const panelCY = yC + PANEL_T / 2;

  // 3 solid panels
  for (let i = 0; i < 3; i++) {
    const [px, pz] = PANEL_POSITIONS[i];
    addBox(scene, PANEL_ACTUAL, PANEL_T, PANEL_ACTUAL,
      px, panelCY, pz, panelMat);
  }

  // LAF diffuser panel (perforated)
  const lafPos = PANEL_POSITIONS[3];
  const alphaMap = createPerforationAlphaMap();
  const perfMat = matPerforatedFace(alphaMap, PANEL_ACTUAL, PANEL_ACTUAL);
  addBox(scene, PANEL_ACTUAL, PANEL_T, PANEL_ACTUAL,
    lafPos[0], panelCY, lafPos[1], perfMat);

  // HEPA filter (above LAF panel)
  const hepaCY = yC + PANEL_T + 2 + HEPA_H / 2; // small gap above panel
  addBox(scene, PANEL_ACTUAL - 2, HEPA_H, PANEL_ACTUAL - 2,
    lafPos[0], hepaCY, lafPos[1], hepaMat);

  // HEPA frame bars
  const hepaFW = 2.5;
  const hepaInner = PANEL_ACTUAL - 2;
  addBox(scene, hepaInner + 2 * hepaFW, HEPA_H, hepaFW,
    lafPos[0], hepaCY, lafPos[1] - hepaInner / 2 - hepaFW / 2, frameMat);
  addBox(scene, hepaInner + 2 * hepaFW, HEPA_H, hepaFW,
    lafPos[0], hepaCY, lafPos[1] + hepaInner / 2 + hepaFW / 2, frameMat);
  addBox(scene, hepaFW, HEPA_H, hepaInner,
    lafPos[0] - hepaInner / 2 - hepaFW / 2, hepaCY, lafPos[1], frameMat);
  addBox(scene, hepaFW, HEPA_H, hepaInner,
    lafPos[0] + hepaInner / 2 + hepaFW / 2, hepaCY, lafPos[1], frameMat);

  // ─── Group B: Frame grid + LED strips (Y += GAP) ─────────────

  const frameCY = yB + FRAME_H / 2;

  // Border bars
  addBox(scene, MODULE, FRAME_H, FRAME_W,
    0, frameCY, -HALF_MOD + FRAME_W / 2, frameMat);
  addBox(scene, MODULE, FRAME_H, FRAME_W,
    0, frameCY, +HALF_MOD - FRAME_W / 2, frameMat);
  addBox(scene, FRAME_W, FRAME_H, MODULE - 2 * FRAME_W,
    -HALF_MOD + FRAME_W / 2, frameCY, 0, frameMat);
  addBox(scene, FRAME_W, FRAME_H, MODULE - 2 * FRAME_W,
    +HALF_MOD - FRAME_W / 2, frameCY, 0, frameMat);

  // Interior cross
  addBox(scene, MODULE - 2 * FRAME_W, FRAME_H, FRAME_W,
    0, frameCY, 0, frameMat);
  addBox(scene, FRAME_W, FRAME_H, MODULE - 2 * FRAME_W,
    0, frameCY, 0, frameMat);

  // LED strips
  const ledY = yB + LED_STRIP_H / 2 + 0.1;
  const ledLen = MODULE - 2 * FRAME_W;
  const halfLedLen = (ledLen - FRAME_W) / 2;

  // Border LED
  addBox(scene, ledLen, LED_STRIP_H, LED_STRIP_W, 0, ledY, -HALF_MOD + FRAME_W / 2, ledMat);
  addBox(scene, ledLen, LED_STRIP_H, LED_STRIP_W, 0, ledY, +HALF_MOD - FRAME_W / 2, ledMat);
  addBox(scene, LED_STRIP_W, LED_STRIP_H, ledLen, -HALF_MOD + FRAME_W / 2, ledY, 0, ledMat);
  addBox(scene, LED_STRIP_W, LED_STRIP_H, ledLen, +HALF_MOD - FRAME_W / 2, ledY, 0, ledMat);

  // Interior cross LED (split to avoid overlap)
  addBox(scene, halfLedLen, LED_STRIP_H, LED_STRIP_W, -(FRAME_W / 2 + halfLedLen / 2), ledY, 0, ledMat);
  addBox(scene, halfLedLen, LED_STRIP_H, LED_STRIP_W, +(FRAME_W / 2 + halfLedLen / 2), ledY, 0, ledMat);
  addBox(scene, LED_STRIP_W, LED_STRIP_H, halfLedLen, 0, ledY, -(FRAME_W / 2 + halfLedLen / 2), ledMat);
  addBox(scene, LED_STRIP_W, LED_STRIP_H, halfLedLen, 0, ledY, +(FRAME_W / 2 + halfLedLen / 2), ledMat);

  // ─── Group A: Rods + mounting plate (Y += GAP × 2) ───────────

  // Mounting plate
  const plateY = yA + PENDANT_PLATE_H / 2;
  addCyl(scene, PENDANT_PLATE_R, PENDANT_PLATE_R, PENDANT_PLATE_H, 32,
    0, plateY, 0, susMat);

  // Hanger rods
  const rodY = yA + PENDANT_PLATE_H + ROD_H / 2;
  const rodPositions: [number, number][] = [
    [-HALF_MOD + ROD_INSET, -HALF_MOD + ROD_INSET],
    [+HALF_MOD - ROD_INSET, -HALF_MOD + ROD_INSET],
    [+HALF_MOD - ROD_INSET, +HALF_MOD - ROD_INSET],
    [-HALF_MOD + ROD_INSET, +HALF_MOD - ROD_INSET],
  ];

  for (const [rx, rz] of rodPositions) {
    addCyl(scene, ROD_R, ROD_R, ROD_H, 12, rx, rodY, rz, rodMat);
    addCyl(scene, ROD_R * 2.5, ROD_R * 2.5, 0.8, 6,
      rx, rodY + ROD_H / 2 + 0.4, rz, rodMat);
  }

  // ─── Group D: Pendant column (Y -= GAP) ──────────────────────

  const pendantCY = yD + PENDANT_COL_H / 2;
  addCyl(scene, PENDANT_COL_R, PENDANT_COL_R, PENDANT_COL_H, 32,
    0, pendantCY, 0, susMat);

  // Rotation joint ring at top
  addCyl(scene, PENDANT_COL_R + 1.5, PENDANT_COL_R + 1.5, 1.5, 32,
    0, yD + PENDANT_COL_H - 0.75, 0, susMat);

  // Joint head at bottom
  addCyl(scene, PENDANT_COL_R + 2, PENDANT_COL_R, 3, 32,
    0, yD + 1.5, 0, susMat);

  // ─── Dashed connector lines ──────────────────────────────────

  // C ↔ B (panels ↔ frame)
  addYConnectors(scene, HALF_MOD, HALF_MOD,
    yC + PANEL_T + HEPA_H + 4, yB);

  // B ↔ A (frame ↔ rods)
  addYConnectors(scene, HALF_MOD, HALF_MOD,
    yB + FRAME_H, yA);

  // C ↔ D (panels ↔ pendant)
  addDashedLine(scene,
    new THREE.Vector3(0, yC, 0),
    new THREE.Vector3(0, yD + PENDANT_COL_H, 0));

  // ─── Annotations ─────────────────────────────────────────────

  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(rodPositions[1][0], rodY + ROD_H / 2, rodPositions[1][1]),
        label: 'Suspension Rod M10 × 4' },
      { anchor: new THREE.Vector3(0, plateY, 0),
        label: 'Mounting Plate SUS 304 ⌀200mm' },
      { anchor: new THREE.Vector3(HALF_MOD - FRAME_W / 2, frameCY, 0),
        label: 'Frame Aluminium + LED 80×120mm' },
      { anchor: new THREE.Vector3(PANEL_POSITIONS[0][0], panelCY, PANEL_POSITIONS[0][1]),
        label: 'Panel PIR 75mm + HRP 0.5mm × 3' },
      { anchor: new THREE.Vector3(lafPos[0], panelCY, lafPos[1]),
        label: 'LAF Diffuser Perforated ⌀2.4mm' },
      { anchor: new THREE.Vector3(lafPos[0], hepaCY, lafPos[1]),
        label: 'HEPA H14 Filter 610×610×76mm' },
      { anchor: new THREE.Vector3(0, pendantCY, 0),
        label: 'Pendant Column SUS 304 ⌀100mm' },
    ],
    HALF_MOD + 55,
    [yD - 5, rodY + ROD_H / 2 + 15],
  );
}

// ─── React component ───────────────────────────────────────────

export function CeilingPanelExploded3D({ product }: Props) {
  const lastPreset = product.cameraPresets[product.cameraPresets.length - 1];
  const [activePreset, setActivePreset] = useState<string>(
    lastPreset?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 40,
      maxDistance: 700,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      if (lastPreset) applyCameraPreset(refs, lastPreset.position, lastPreset.target);
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
