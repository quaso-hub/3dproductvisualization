/**
 * LafSystemAssembled3D.tsx - ASSEMBLED VIEW
 * ------------------------------─
 * Laminar Air Flow (LAF) Ceiling System - fully assembled unit.
 *
 * Ceiling-mounted HVAC unit viewed from BELOW (worm's eye).
 * Y=0 = bottom face of face diffuser (visible from OR room).
 * Y increases upward into ceiling void.
 *
 * Build order (bottom → top):
 *   1. Face diffuser frame perimeter
 *   2. 6 face sub-panels (perforated, 2×3 grid)
 *   3. Divider bars (1 vertical + 2 horizontal)
 *   4. Central pass-through opening + trim ring
 *   5. LED strip (emissive warm white)
 *   6. HEPA filter modules × 6
 *   7. Plenum box (4 walls + top plate)
 *   8. Duct collar on top
 *   9. Suspension rods × 4
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

// -─ Dimensions (scene units, 1 unit = 10mm) ---------
const LAF_W = 120;        // 1200mm width (X axis)
const LAF_L = 180;        // 1800mm length (Z axis)

// Heights (Y axis, bottom to top)
const FACE_T = 0.8;       // 8mm face diffuser thickness
const HEPA_H = 7.6;       // 76mm HEPA filter thickness
const PLENUM_H = 28;      // 280mm plenum box height
const PLENUM_T = 0.3;     // 3mm plenum wall thickness

// Y coordinates
const Y_FACE_BOT = 0;
const Y_FACE_TOP = FACE_T;                    // 0.8
const Y_HEPA_BOT = Y_FACE_TOP + 0.5;          // small gap above face
const Y_HEPA_TOP = Y_HEPA_BOT + HEPA_H;       // ≈8.9
const Y_PLENUM_BOT = Y_HEPA_TOP;
const Y_PLENUM_TOP = Y_PLENUM_BOT + PLENUM_H; // ≈36.9

// Frame & grid
const FRAME_W = 4;        // 40mm perimeter frame width
const DIVIDER_W = 2;      // 20mm divider bar width
const INNER_W = LAF_W - 2 * FRAME_W;  // 112
const INNER_L = LAF_L - 2 * FRAME_W;  // 172

// Sub-panel dimensions (6 panels in 2 cols × 3 rows)
const PANEL_W = (INNER_W - DIVIDER_W) / 2;      // 55
const PANEL_L = (INNER_L - 2 * DIVIDER_W) / 3;  // 56

// Central opening
const OPENING = 20;       // 200mm

// Hardware
const ROD_R = 0.4;        // M8 ⌀8mm
const ROD_H = 70;         // 700mm visible rod length
const COLLAR_R = 17.5;    // ⌀350mm duct collar
const COLLAR_H = 10;      // 100mm collar height

// HEPA filter frame
const HEPA_FRAME_W = 2.5; // 25mm aluminium frame per side
const HEPA_UNIT_W = 61;   // 610mm filter width
const HEPA_UNIT_L = 122;  // 1220mm filter length (but we use 3 rows layout)

// -─ Material factories --------------------

function matPowderWhite() {
  return new THREE.MeshStandardMaterial({
    color: 0xedede8, roughness: 0.75, metalness: 0.05, envMapIntensity: 0.6,
  });
}

function matAlumAnodized() {
  return new THREE.MeshStandardMaterial({
    color: 0xd8dfe6, roughness: 0.28, metalness: 0.85, envMapIntensity: 1.1,
  });
}

function matHEPAMedia() {
  return new THREE.MeshStandardMaterial({
    color: 0xf2ece0, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.3,
  });
}

function matGalvanised() {
  return new THREE.MeshStandardMaterial({
    color: 0xb4bec8, roughness: 0.35, metalness: 0.80, envMapIntensity: 0.9,
  });
}

function matDuctCollar() {
  return new THREE.MeshStandardMaterial({
    color: 0xb0b8b0, roughness: 0.40, metalness: 0.75, envMapIntensity: 0.8,
  });
}

function matRubber() {
  return new THREE.MeshStandardMaterial({
    color: 0x404040, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.2,
  });
}

function matLEDWarm() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xfff0d0),
    emissive: new THREE.Color(0xfff0d0),
    emissiveIntensity: 0.7,
    roughness: 0.15,
    metalness: 0.1,
  });
}

// -─ Tileable perforated alphaMap (staggered hex) -------

function createLAFPerforationAlphaMap(): THREE.CanvasTexture {
  // Scale: 4px per mm
  const SCALE = 4;
  const PITCH = 6 * SCALE;  // 24px horizontal pitch
  const ROW_H = Math.round(6 * Math.sin(Math.PI / 3) * SCALE); // ≈21px
  const HOLE_R = 1.2 * SCALE; // 4.8px

  // Tile: one pitch wide × two rows high (for stagger seamless repeat)
  const TW = PITCH;      // 24
  const TH = ROW_H * 2;  // 42

  const canvas = document.createElement('canvas');
  canvas.width = TW;
  canvas.height = TH;
  const ctx = canvas.getContext('2d')!;

  // White = opaque (metal surface)
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, TW, TH);

  // Black = transparent (holes)
  ctx.fillStyle = '#000';

  // Even row (y=0) and odd row (y=ROW_H, offset by half pitch)
  const rowDefs = [
    { y: 0,     xOff: 0 },
    { y: ROW_H, xOff: PITCH / 2 },
  ];

  for (const { y, xOff } of rowDefs) {
    for (let x = xOff - PITCH; x <= TW + PITCH; x += PITCH) {
      ctx.beginPath();
      ctx.arc(x, y, HOLE_R, 0, Math.PI * 2);
      ctx.fill();
      // Wrap at y=0 → also draw at y+TH for seamless vertical tiling
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
    color: 0xeeeee8,
    roughness: 0.72,
    metalness: 0.05,
    envMapIntensity: 0.5,
    alphaMap,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  // Set repeat count based on panel dimensions in mm
  const pwMM = pw * 10;
  const plMM = pl * 10;
  const hPitch = 6;  // mm
  const vPitch = 6 * Math.sin(Math.PI / 3) * 2; // ≈10.39mm per tile row pair
  alphaMap.repeat.set(pwMM / hPitch, plMM / vPitch);
  return mat;
}

// -─ Geometry helpers ---------------------

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

// -─ Build scene -----------------------─

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // 0. PBR Environment
  renderer.toneMappingExposure = 0.80;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  const alumMat = matAlumAnodized();
  const powderMat = matPowderWhite();
  const hepaMat = matHEPAMedia();
  const rodMat = matGalvanised();
  const ledMat = matLEDWarm();
  const rubberMat = matRubber();
  const collarMat = matDuctCollar();

  const faceCY = Y_FACE_BOT + FACE_T / 2; // center Y of face slab

  // -─ 1. Face diffuser frame perimeter (aluminium) -----─
  const frameH = FACE_T + 4; // frame extends 40mm above face
  const frameCY = Y_FACE_BOT + frameH / 2;
  const frameGroup = new THREE.Group();
  frameGroup.userData.partId = 'frame';
  scene.add(frameGroup);

  // Front bar (-Z side)
  addBox(frameGroup, LAF_W, frameH, FRAME_W, 0, frameCY, -LAF_L / 2 + FRAME_W / 2, alumMat);
  // Back bar (+Z side)
  addBox(frameGroup, LAF_W, frameH, FRAME_W, 0, frameCY, LAF_L / 2 - FRAME_W / 2, alumMat);
  // Left bar (-X side)
  addBox(frameGroup, FRAME_W, frameH, LAF_L - 2 * FRAME_W, -LAF_W / 2 + FRAME_W / 2, frameCY, 0, alumMat);
  // Right bar (+X side)
  addBox(frameGroup, FRAME_W, frameH, LAF_L - 2 * FRAME_W, LAF_W / 2 - FRAME_W / 2, frameCY, 0, alumMat);

  // -─ 2. Six face sub-panels (perforated) ----------
  const baseAlphaMap = createLAFPerforationAlphaMap();
  const faceGroup = new THREE.Group();
  faceGroup.userData.partId = 'face';
  scene.add(faceGroup);

  const colXs = [
    -(DIVIDER_W / 2 + PANEL_W / 2),
    (DIVIDER_W / 2 + PANEL_W / 2),
  ];
  const rowZs = [
    -(DIVIDER_W + PANEL_L),
    0,
    (DIVIDER_W + PANEL_L),
  ];

  for (const cx of colXs) {
    for (const cz of rowZs) {
      const alpha = baseAlphaMap.clone();
      const perfMat = matPerforatedFace(alpha, PANEL_W, PANEL_L);
      addBox(faceGroup, PANEL_W, FACE_T, PANEL_L, cx, faceCY, cz, perfMat);
    }
  }

  // -─ 3. Divider bars (part of frame visually) ----------
  addBox(frameGroup, DIVIDER_W, FACE_T + 1, INNER_L, 0, faceCY + 0.5, 0, alumMat);
  addBox(frameGroup, INNER_W, FACE_T + 1, DIVIDER_W, 0, faceCY + 0.5, -(PANEL_L / 2 + DIVIDER_W / 2), alumMat);
  addBox(frameGroup, INNER_W, FACE_T + 1, DIVIDER_W, 0, faceCY + 0.5, (PANEL_L / 2 + DIVIDER_W / 2), alumMat);

  // -─ 4. Central pass-through opening ------------
  const openingGroup = new THREE.Group();
  openingGroup.userData.partId = 'opening';
  scene.add(openingGroup);
  const trimW = 1.5;
  const trimH = 2;
  const trimCY = Y_FACE_BOT + trimH / 2;
  const halfOp = OPENING / 2;

  addBox(openingGroup, OPENING + 2 * trimW, trimH, trimW, 0, trimCY, -halfOp - trimW / 2, alumMat);
  addBox(openingGroup, OPENING + 2 * trimW, trimH, trimW, 0, trimCY, halfOp + trimW / 2, alumMat);
  addBox(openingGroup, trimW, trimH, OPENING, -halfOp - trimW / 2, trimCY, 0, alumMat);
  addBox(openingGroup, trimW, trimH, OPENING, halfOp + trimW / 2, trimCY, 0, alumMat);

  const grommetW = 0.8;
  addBox(openingGroup, OPENING, grommetW, grommetW, 0, Y_FACE_BOT + grommetW / 2, -halfOp, rubberMat);
  addBox(openingGroup, OPENING, grommetW, grommetW, 0, Y_FACE_BOT + grommetW / 2, halfOp, rubberMat);
  addBox(openingGroup, grommetW, grommetW, OPENING - 2 * grommetW, -halfOp, Y_FACE_BOT + grommetW / 2, 0, rubberMat);
  addBox(openingGroup, grommetW, grommetW, OPENING - 2 * grommetW, halfOp, Y_FACE_BOT + grommetW / 2, 0, rubberMat);

  // -─ 5. LED strip --------------
  const ledGroup = new THREE.Group();
  ledGroup.userData.partId = 'led';
  scene.add(ledGroup);
  const ledY = Y_FACE_BOT + 0.15;
  const ledInset = FRAME_W - 0.5;
  addBox(ledGroup, LAF_W - 2 * ledInset, 0.3, 0.5, 0, ledY, -LAF_L / 2 + ledInset, ledMat);
  addBox(ledGroup, LAF_W - 2 * ledInset, 0.3, 0.5, 0, ledY, LAF_L / 2 - ledInset, ledMat);
  addBox(ledGroup, 0.5, 0.3, LAF_L - 2 * ledInset, -LAF_W / 2 + ledInset, ledY, 0, ledMat);
  addBox(ledGroup, 0.5, 0.3, LAF_L - 2 * ledInset, LAF_W / 2 - ledInset, ledY, 0, ledMat);

  // -─ 6. HEPA filter modules x 6 --------------
  const hepaGroup = new THREE.Group();
  hepaGroup.userData.partId = 'hepa';
  scene.add(hepaGroup);
  const hepaMediaW = PANEL_W - 2;
  const hepaMediaL = PANEL_L - 2;
  const hepaCY = Y_HEPA_BOT + HEPA_H / 2;

  for (const cx of colXs) {
    for (const cz of rowZs) {
      addBox(hepaGroup, hepaMediaW, HEPA_H, hepaMediaL, cx, hepaCY, cz, hepaMat);
      const fW = HEPA_FRAME_W;
      addBox(hepaGroup, hepaMediaW + 2 * fW, HEPA_H, fW,
        cx, hepaCY, cz - hepaMediaL / 2 - fW / 2, alumMat);
      addBox(hepaGroup, hepaMediaW + 2 * fW, HEPA_H, fW,
        cx, hepaCY, cz + hepaMediaL / 2 + fW / 2, alumMat);
      addBox(hepaGroup, fW, HEPA_H, hepaMediaL,
        cx - hepaMediaW / 2 - fW / 2, hepaCY, cz, alumMat);
      addBox(hepaGroup, fW, HEPA_H, hepaMediaL,
        cx + hepaMediaW / 2 + fW / 2, hepaCY, cz, alumMat);
    }
  }

  // -─ 7. Plenum box ----------
  const plenumGroup = new THREE.Group();
  plenumGroup.userData.partId = 'plenum';
  scene.add(plenumGroup);
  const plenumCY = Y_PLENUM_BOT + PLENUM_H / 2;

  addBox(plenumGroup, LAF_W, PLENUM_H, PLENUM_T, 0, plenumCY, -LAF_L / 2 + PLENUM_T / 2, powderMat);
  addBox(plenumGroup, LAF_W, PLENUM_H, PLENUM_T, 0, plenumCY, LAF_L / 2 - PLENUM_T / 2, powderMat);
  addBox(plenumGroup, PLENUM_T, PLENUM_H, LAF_L - 2 * PLENUM_T, -LAF_W / 2 + PLENUM_T / 2, plenumCY, 0, powderMat);
  addBox(plenumGroup, PLENUM_T, PLENUM_H, LAF_L - 2 * PLENUM_T, LAF_W / 2 - PLENUM_T / 2, plenumCY, 0, powderMat);
  addBox(plenumGroup, LAF_W, PLENUM_T, LAF_L, 0, Y_PLENUM_TOP - PLENUM_T / 2, 0, powderMat);

  // -─ 8. Duct collar -------------
  const collarGroup = new THREE.Group();
  collarGroup.userData.partId = 'collar';
  scene.add(collarGroup);
  const collarY = Y_PLENUM_TOP + COLLAR_H / 2;
  addCyl(collarGroup, COLLAR_R, COLLAR_R, COLLAR_H, 32, 0, collarY, 0, collarMat);
  addCyl(collarGroup, COLLAR_R + 1, COLLAR_R + 1, 0.5, 32, 0, Y_PLENUM_TOP + 0.25, 0, collarMat);

  // -─ 9. Suspension rods x 4 ----------------
  const rodsGroup = new THREE.Group();
  rodsGroup.userData.partId = 'rods';
  scene.add(rodsGroup);
  const rodInset = 10;
  const rodY = Y_PLENUM_TOP + ROD_H / 2;
  const rodPositions: [number, number][] = [
    [-LAF_W / 2 + rodInset, -LAF_L / 2 + rodInset],
    [LAF_W / 2 - rodInset, -LAF_L / 2 + rodInset],
    [LAF_W / 2 - rodInset, LAF_L / 2 - rodInset],
    [-LAF_W / 2 + rodInset, LAF_L / 2 - rodInset],
  ];

  for (const [rx, rz] of rodPositions) {
    addCyl(rodsGroup, ROD_R, ROD_R, ROD_H, 12, rx, rodY, rz, rodMat);
    addCyl(rodsGroup, ROD_R * 2.5, ROD_R * 2.5, 0.8, 6, rx, rodY + ROD_H / 2 + 0.4, rz, rodMat);
    addCyl(rodsGroup, ROD_R * 3, ROD_R * 3, 0.2, 16, rx, rodY + ROD_H / 2 - 0.1, rz, rodMat);
    addBox(rodsGroup, ROD_R * 5, 1.5, ROD_R * 5, rx, Y_PLENUM_TOP + 0.75, rz, alumMat);
  }

  // -─ Annotations ----------------------─
  placeAnnotations(
    scene,
    [
      { partId: 'face',    anchor: new THREE.Vector3(0, Y_FACE_BOT - 1, 0),
        label: 'Face Diffuser Perforated' },
      { partId: 'frame',   anchor: new THREE.Vector3(LAF_W / 2 - FRAME_W / 2, faceCY, -LAF_L / 2 + FRAME_W / 2),
        label: 'Frame Aluminium Anodized' },
      { partId: 'hepa',    anchor: new THREE.Vector3(colXs[1], hepaCY, rowZs[0]),
        label: 'HEPA Filter H14 x 6 Modul' },
      { partId: 'plenum',  anchor: new THREE.Vector3(LAF_W / 2, plenumCY, 0),
        label: 'Plenum Box Galv. Steel' },
      { partId: 'collar',  anchor: new THREE.Vector3(0, collarY, 0),
        label: 'Duct Inlet Collar 350 mm' },
      { partId: 'rods',    anchor: new THREE.Vector3(rodPositions[1][0], rodY + ROD_H / 2, rodPositions[1][1]),
        label: 'Suspension Rod M8 x 4' },
      { partId: 'opening', anchor: new THREE.Vector3(0, Y_FACE_BOT, 0),
        label: 'Pass-Through Opening 200 mm' },
      { partId: 'led',     anchor: new THREE.Vector3(-LAF_W / 2 + ledInset, ledY, 0),
        label: 'LED Strip Warm White' },
    ],
    LAF_W / 2 + 50,
    [-10, Y_PLENUM_TOP + ROD_H + 15],
  );
}

// -─ React component ---------------------─

export function LafSystemAssembled3D({ product }: Props) {
  const firstPreset = product.cameraPresets[0];
  const [activePreset, setActivePreset] = useState<string>(
    firstPreset?.name ?? '',
  );
  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 40,
      maxDistance: 600,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      if (firstPreset) applyCameraPreset(refs, firstPreset.position, firstPreset.target);
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
