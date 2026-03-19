/**
 * CeilingPanelAssembled3D.tsx — ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * Ceiling Panel System (PIR Sandwich + LED Grid + LAF Integrated)
 * Modular OR ceiling: 2×2 grid = 4 panels in aluminium frame.
 *
 * Ceiling-mounted system viewed from BELOW (worm's eye).
 * Y=0 = bottom edge of frame (lowest structural element).
 * Y increases upward into ceiling void.
 *
 * Build order (bottom → top):
 *   1. Frame grid — 4 border bars + 2 interior cross bars
 *   2. LED diffuser strips — emissive cool white in frame groove
 *   3. 3 solid PIR panels — medical white HPL matte
 *   4. 1 LAF diffuser panel — perforated (bottom-right)
 *   5. HEPA H14 filter — above LAF panel only
 *   6. Pendant column — SUS 304, center, extends downward
 *   7. Pendant mounting plate — SUS 304, on top of frame
 *   8. Hanger rods × 4 — zinc steel, extend upward
 *   9. Annotations
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

// ─── Dimensions (scene units, 1 unit = 10mm) ──────────────────
const MODULE = 240;        // 2400mm module (X and Z both)
const FRAME_W = 8;         // 80mm frame bar visible face width
const FRAME_H = 12;        // 120mm frame depth/height
const PANEL_T = 7.5;       // 75mm PIR panel thickness
const PANEL_RECESS = 1;    // 10mm recessed from frame bottom

// Derived
const PANEL_SIZE = (MODULE - 3 * FRAME_W) / 2; // 108 per opening
const PANEL_ACTUAL = PANEL_SIZE - 1;            // 107 with clearance gap
const HALF_MOD = MODULE / 2;                    // 120

// Panel opening centers (2×2 grid)
const CELL_OFFSET = FRAME_W / 2 + PANEL_SIZE / 2; // 8/2 + 108/2 = 58
const PANEL_POSITIONS: [number, number][] = [
  [-CELL_OFFSET, -CELL_OFFSET], // top-left (solid)
  [+CELL_OFFSET, -CELL_OFFSET], // top-right (solid)
  [-CELL_OFFSET, +CELL_OFFSET], // bottom-left (solid)
  [+CELL_OFFSET, +CELL_OFFSET], // bottom-right (LAF perforated)
];

// Y coordinates
const Y_FRAME_BOT = 0;
const Y_PANEL_BOT = PANEL_RECESS;                    // 1
const Y_PANEL_CY  = Y_PANEL_BOT + PANEL_T / 2;      // 4.75
const Y_PANEL_TOP = Y_PANEL_BOT + PANEL_T;           // 8.5
const Y_FRAME_TOP = FRAME_H;                         // 12

// HEPA (above LAF panel only)
const HEPA_H = 7.6;       // 76mm HEPA thickness
const Y_HEPA_BOT = Y_FRAME_TOP + 0.5; // small gap above frame
const Y_HEPA_CY  = Y_HEPA_BOT + HEPA_H / 2;

// Pendant column
const PENDANT_COL_R = 5;  // ⌀100mm
const PENDANT_COL_H = 35; // 350mm visible stub
const PENDANT_PLATE_R = 10; // ⌀200mm
const PENDANT_PLATE_H = 1.5; // 15mm

// Hanger rods
const ROD_R = 0.5;        // ⌀10mm
const ROD_H = 70;         // 700mm visible rod length
const ROD_INSET = 10;     // 100mm from module edge

// LED strip
const LED_STRIP_W = 3;    // 30mm visible diffuser width
const LED_STRIP_H = 0.3;  // 3mm thickness

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

// ─── Tileable perforated alphaMap (staggered hex) ──────────────

function createPerforationAlphaMap(): THREE.CanvasTexture {
  const SCALE = 4;
  const PITCH = 6 * SCALE;  // 24px
  const ROW_H = Math.round(6 * Math.sin(Math.PI / 3) * SCALE); // ≈21px
  const HOLE_R = 1.2 * SCALE; // 4.8px

  const TW = PITCH;      // 24
  const TH = ROW_H * 2;  // 42

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

// ─── Build scene ───────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // PBR Environment
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

  const frameCY = Y_FRAME_BOT + FRAME_H / 2; // 6

  // ─── 1. Frame grid — 4 border bars + 2 interior cross bars ──

  // Border bars (full module length along their axis)
  // Front bar (−Z side)
  addBox(scene, MODULE, FRAME_H, FRAME_W,
    0, frameCY, -HALF_MOD + FRAME_W / 2, frameMat);
  // Back bar (+Z side)
  addBox(scene, MODULE, FRAME_H, FRAME_W,
    0, frameCY, +HALF_MOD - FRAME_W / 2, frameMat);
  // Left bar (−X side) — inner length (between front/back)
  addBox(scene, FRAME_W, FRAME_H, MODULE - 2 * FRAME_W,
    -HALF_MOD + FRAME_W / 2, frameCY, 0, frameMat);
  // Right bar (+X side)
  addBox(scene, FRAME_W, FRAME_H, MODULE - 2 * FRAME_W,
    +HALF_MOD - FRAME_W / 2, frameCY, 0, frameMat);

  // Interior cross bars (forming "+")
  // Horizontal cross (X direction, at Z=0)
  addBox(scene, MODULE - 2 * FRAME_W, FRAME_H, FRAME_W,
    0, frameCY, 0, frameMat);
  // Vertical cross (Z direction, at X=0)
  addBox(scene, FRAME_W, FRAME_H, MODULE - 2 * FRAME_W,
    0, frameCY, 0, frameMat);

  // ─── 2. LED diffuser strips (inside frame groove, all bars) ──

  const ledY = Y_FRAME_BOT + LED_STRIP_H / 2 + 0.1; // just above frame bottom

  // Helper: add LED strip along a frame bar
  function addLedStrip(
    x: number, z: number,
    w: number, d: number,
  ) {
    addBox(scene, w, LED_STRIP_H, d, x, ledY, z, ledMat);
  }

  // LED along border bars
  const ledLen = MODULE - 2 * FRAME_W; // inner length

  // Front bar LED
  addLedStrip(0, -HALF_MOD + FRAME_W / 2, ledLen, LED_STRIP_W);
  // Back bar LED
  addLedStrip(0, +HALF_MOD - FRAME_W / 2, ledLen, LED_STRIP_W);
  // Left bar LED
  addLedStrip(-HALF_MOD + FRAME_W / 2, 0, LED_STRIP_W, ledLen);
  // Right bar LED
  addLedStrip(+HALF_MOD - FRAME_W / 2, 0, LED_STRIP_W, ledLen);

  // Interior cross LEDs
  // Horizontal cross LED (X dir, Z=0) — split into 2 segments to avoid Z-fighting with vertical
  const halfLedLen = (ledLen - FRAME_W) / 2; // half minus center overlap
  addLedStrip(-(FRAME_W / 2 + halfLedLen / 2), 0, halfLedLen, LED_STRIP_W);
  addLedStrip(+(FRAME_W / 2 + halfLedLen / 2), 0, halfLedLen, LED_STRIP_W);
  // Vertical cross LED (Z dir, X=0) — split into 2 segments
  addLedStrip(0, -(FRAME_W / 2 + halfLedLen / 2), LED_STRIP_W, halfLedLen);
  addLedStrip(0, +(FRAME_W / 2 + halfLedLen / 2), LED_STRIP_W, halfLedLen);

  // ─── 3. Three solid PIR panels ───────────────────────────────

  for (let i = 0; i < 3; i++) {
    const [px, pz] = PANEL_POSITIONS[i];
    addBox(scene, PANEL_ACTUAL, PANEL_T, PANEL_ACTUAL,
      px, Y_PANEL_CY, pz, panelMat);
  }

  // ─── 4. LAF diffuser panel (perforated, bottom-right) ────────

  const lafPos = PANEL_POSITIONS[3];
  const alphaMap = createPerforationAlphaMap();
  const perfMat = matPerforatedFace(alphaMap, PANEL_ACTUAL, PANEL_ACTUAL);
  addBox(scene, PANEL_ACTUAL, PANEL_T, PANEL_ACTUAL,
    lafPos[0], Y_PANEL_CY, lafPos[1], perfMat);

  // ─── 5. HEPA H14 filter (above LAF panel only) ───────────────

  addBox(scene, PANEL_ACTUAL - 2, HEPA_H, PANEL_ACTUAL - 2,
    lafPos[0], Y_HEPA_CY, lafPos[1], hepaMat);

  // HEPA frame bars (aluminium)
  const hepaFW = 2.5;
  const hepaInner = PANEL_ACTUAL - 2;
  // Front & back
  addBox(scene, hepaInner + 2 * hepaFW, HEPA_H, hepaFW,
    lafPos[0], Y_HEPA_CY, lafPos[1] - hepaInner / 2 - hepaFW / 2, frameMat);
  addBox(scene, hepaInner + 2 * hepaFW, HEPA_H, hepaFW,
    lafPos[0], Y_HEPA_CY, lafPos[1] + hepaInner / 2 + hepaFW / 2, frameMat);
  // Left & right
  addBox(scene, hepaFW, HEPA_H, hepaInner,
    lafPos[0] - hepaInner / 2 - hepaFW / 2, Y_HEPA_CY, lafPos[1], frameMat);
  addBox(scene, hepaFW, HEPA_H, hepaInner,
    lafPos[0] + hepaInner / 2 + hepaFW / 2, Y_HEPA_CY, lafPos[1], frameMat);

  // ─── 6. Pendant column (SUS 304, center, extends downward) ───

  const pendantColY = Y_FRAME_BOT - PENDANT_COL_H / 2; // extends below
  addCyl(scene, PENDANT_COL_R, PENDANT_COL_R, PENDANT_COL_H, 32,
    0, pendantColY, 0, susMat);

  // Rotation joint ring at frame level
  addCyl(scene, PENDANT_COL_R + 1.5, PENDANT_COL_R + 1.5, 1.5, 32,
    0, Y_FRAME_BOT - 0.75, 0, susMat);

  // Joint head at bottom (slightly wider)
  addCyl(scene, PENDANT_COL_R + 2, PENDANT_COL_R, 3, 32,
    0, pendantColY - PENDANT_COL_H / 2 + 1.5, 0, susMat);

  // ─── 7. Pendant mounting plate (on top of frame) ─────────────

  const plateY = Y_FRAME_TOP + PENDANT_PLATE_H / 2;
  addCyl(scene, PENDANT_PLATE_R, PENDANT_PLATE_R, PENDANT_PLATE_H, 32,
    0, plateY, 0, susMat);

  // ─── 8. Hanger rods × 4 ──────────────────────────────────────

  const rodY = Y_FRAME_TOP + ROD_H / 2;
  const rodPositions: [number, number][] = [
    [-HALF_MOD + ROD_INSET, -HALF_MOD + ROD_INSET],
    [+HALF_MOD - ROD_INSET, -HALF_MOD + ROD_INSET],
    [+HALF_MOD - ROD_INSET, +HALF_MOD - ROD_INSET],
    [-HALF_MOD + ROD_INSET, +HALF_MOD - ROD_INSET],
  ];

  for (const [rx, rz] of rodPositions) {
    addCyl(scene, ROD_R, ROD_R, ROD_H, 12, rx, rodY, rz, rodMat);
    // Hex nut at top
    addCyl(scene, ROD_R * 2.5, ROD_R * 2.5, 0.8, 6,
      rx, rodY + ROD_H / 2 + 0.4, rz, rodMat);
    // Washer
    addCyl(scene, ROD_R * 3, ROD_R * 3, 0.2, 16,
      rx, rodY + ROD_H / 2 - 0.1, rz, rodMat);
    // Bracket at frame penetration
    addBox(scene, ROD_R * 5, 1.5, ROD_R * 5,
      rx, Y_FRAME_TOP + 0.75, rz, frameMat);
  }

  // ─── 9. Annotations ─────────────────────────────────────────

  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(0, frameCY, -HALF_MOD + FRAME_W / 2),
        label: 'Frame Aluminium Powder Coat 80×120mm' },
      { anchor: new THREE.Vector3(HALF_MOD - FRAME_W / 2, ledY, 0),
        label: 'LED Strip 6000K Cool White' },
      { anchor: new THREE.Vector3(PANEL_POSITIONS[0][0], Y_PANEL_CY, PANEL_POSITIONS[0][1]),
        label: 'Panel PIR 75mm + HRP Anti-bacterial' },
      { anchor: new THREE.Vector3(lafPos[0], Y_PANEL_CY, lafPos[1]),
        label: 'LAF Diffuser Panel Perforated ⌀2.4mm' },
      { anchor: new THREE.Vector3(lafPos[0], Y_HEPA_CY, lafPos[1]),
        label: 'HEPA H14 Filter 99.99%' },
      { anchor: new THREE.Vector3(0, pendantColY, 0),
        label: 'Pendant Column SUS 304 ⌀100mm' },
      { anchor: new THREE.Vector3(0, plateY, 0),
        label: 'Mounting Plate SUS 304 ⌀200mm' },
      { anchor: new THREE.Vector3(rodPositions[1][0], rodY + ROD_H / 2, rodPositions[1][1]),
        label: 'Suspension Rod M10 × 4' },
    ],
    HALF_MOD + 55,
    [-PENDANT_COL_H - 5, rodY + ROD_H / 2 + 15],
  );
}

// ─── React component ───────────────────────────────────────────

export function CeilingPanelAssembled3D({ product }: Props) {
  const firstPreset = product.cameraPresets[0];
  const [activePreset, setActivePreset] = useState<string>(
    firstPreset?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 40,
      maxDistance: 700,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      if (firstPreset) applyCameraPreset(refs, firstPreset.position, firstPreset.target);
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
