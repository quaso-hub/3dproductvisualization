/**
 * LafSystemExploded3D.tsx - EXPLODED VIEW
 * ------------------------------─
 * Laminar Air Flow (LAF) Ceiling System - components separated.
 *
 * 4 groups separated along Y-axis (vertical):
 *   A. Suspension rods + duct collar   → Y += GAP × 2  (topmost)
 *   B. Plenum box                      → Y += GAP       (upper)
 *   C. HEPA filters (6 modules)        → Y = 0          (reference)
 *   D. Face diffuser + frame + LED     → Y -= GAP       (bottom)
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

// -─ Dimensions (same as assembled) --------------
const LAF_W = 120;
const LAF_L = 180;
const FACE_T = 0.8;
const HEPA_H = 7.6;
const PLENUM_H = 28;
const PLENUM_T = 0.3;

const FRAME_W = 4;
const DIVIDER_W = 2;
const INNER_W = LAF_W - 2 * FRAME_W;
const INNER_L = LAF_L - 2 * FRAME_W;
const PANEL_W = (INNER_W - DIVIDER_W) / 2;
const PANEL_L = (INNER_L - 2 * DIVIDER_W) / 3;

const OPENING = 20;
const ROD_R = 0.4;
const ROD_H = 50; // shorter in exploded view for clarity
const COLLAR_R = 17.5;
const COLLAR_H = 10;
const HEPA_FRAME_W = 2.5;

const GAP = 30; // 300mm explosion separation

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

function matLEDWarm() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xfff0d0),
    emissive: new THREE.Color(0xfff0d0),
    emissiveIntensity: 0.7,
    roughness: 0.15,
    metalness: 0.1,
  });
}

// -─ Tileable perforated alphaMap ---------------

function createLAFPerforationAlphaMap(): THREE.CanvasTexture {
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
    color: 0xeeeee8,
    roughness: 0.72,
    metalness: 0.05,
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

// -─ Dashed connector lines ------------------

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

// -─ Build scene -----------------------─

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // PBR Environment
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
  const collarMat = matDuctCollar();

  // Group Y offsets
  const yA = GAP * 2;   // rods + collar (top)
  const yB = GAP;        // plenum box
  const yC = 0;          // HEPA filters (reference)
  const yD = -GAP;       // face diffuser + frame

  // -─ Group D: Face diffuser + frame (Y -= GAP) ------─
  const faceGroup = new THREE.Group();
  faceGroup.userData.partId = 'face';
  scene.add(faceGroup);

  const faceCY = yD + FACE_T / 2;

  // Frame perimeter
  const frameH = FACE_T + 4;
  const frameCY = yD + frameH / 2;
  addBox(faceGroup, LAF_W, frameH, FRAME_W, 0, frameCY, -LAF_L / 2 + FRAME_W / 2, alumMat);
  addBox(faceGroup, LAF_W, frameH, FRAME_W, 0, frameCY, LAF_L / 2 - FRAME_W / 2, alumMat);
  addBox(faceGroup, FRAME_W, frameH, LAF_L - 2 * FRAME_W, -LAF_W / 2 + FRAME_W / 2, frameCY, 0, alumMat);
  addBox(faceGroup, FRAME_W, frameH, LAF_L - 2 * FRAME_W, LAF_W / 2 - FRAME_W / 2, frameCY, 0, alumMat);

  // Sub-panels (perforated)
  const baseAlphaMap = createLAFPerforationAlphaMap();
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

  // Divider bars
  addBox(faceGroup, DIVIDER_W, FACE_T + 1, INNER_L, 0, faceCY + 0.5, 0, alumMat);
  addBox(faceGroup, INNER_W, FACE_T + 1, DIVIDER_W, 0, faceCY + 0.5, -(PANEL_L / 2 + DIVIDER_W / 2), alumMat);
  addBox(faceGroup, INNER_W, FACE_T + 1, DIVIDER_W, 0, faceCY + 0.5, (PANEL_L / 2 + DIVIDER_W / 2), alumMat);

  // LED strip
  const ledY = yD + 0.15;
  const ledInset = FRAME_W - 0.5;
  addBox(faceGroup, LAF_W - 2 * ledInset, 0.3, 0.5, 0, ledY, -LAF_L / 2 + ledInset, ledMat);
  addBox(faceGroup, LAF_W - 2 * ledInset, 0.3, 0.5, 0, ledY, LAF_L / 2 - ledInset, ledMat);
  addBox(faceGroup, 0.5, 0.3, LAF_L - 2 * ledInset, -LAF_W / 2 + ledInset, ledY, 0, ledMat);
  addBox(faceGroup, 0.5, 0.3, LAF_L - 2 * ledInset, LAF_W / 2 - ledInset, ledY, 0, ledMat);

  // Central opening trim ring
  const openingGroup = new THREE.Group();
  openingGroup.userData.partId = 'opening';
  scene.add(openingGroup);

  const trimW = 1.5;
  const trimH = 2;
  const trimCY = yD + trimH / 2;
  const halfOp = OPENING / 2;
  addBox(openingGroup, OPENING + 2 * trimW, trimH, trimW, 0, trimCY, -halfOp - trimW / 2, alumMat);
  addBox(openingGroup, OPENING + 2 * trimW, trimH, trimW, 0, trimCY, halfOp + trimW / 2, alumMat);
  addBox(openingGroup, trimW, trimH, OPENING, -halfOp - trimW / 2, trimCY, 0, alumMat);
  addBox(openingGroup, trimW, trimH, OPENING, halfOp + trimW / 2, trimCY, 0, alumMat);

  // -─ Group C: HEPA filters (Y = 0) ------------─
  const hepaGroup = new THREE.Group();
  hepaGroup.userData.partId = 'hepa';
  scene.add(hepaGroup);

  const hepaMediaW = PANEL_W - 2;
  const hepaMediaL = PANEL_L - 2;
  const hepaCY = yC + HEPA_H / 2;

  for (const cx of colXs) {
    for (const cz of rowZs) {
      addBox(hepaGroup, hepaMediaW, HEPA_H, hepaMediaL, cx, hepaCY, cz, hepaMat);
      const fW = HEPA_FRAME_W;
      addBox(hepaGroup, hepaMediaW + 2 * fW, HEPA_H, fW, cx, hepaCY, cz - hepaMediaL / 2 - fW / 2, alumMat);
      addBox(hepaGroup, hepaMediaW + 2 * fW, HEPA_H, fW, cx, hepaCY, cz + hepaMediaL / 2 + fW / 2, alumMat);
      addBox(hepaGroup, fW, HEPA_H, hepaMediaL, cx - hepaMediaW / 2 - fW / 2, hepaCY, cz, alumMat);
      addBox(hepaGroup, fW, HEPA_H, hepaMediaL, cx + hepaMediaW / 2 + fW / 2, hepaCY, cz, alumMat);
    }
  }

  // -─ Group B: Plenum box (Y += GAP) ------------─
  const plenumGroup = new THREE.Group();
  plenumGroup.userData.partId = 'plenum';
  scene.add(plenumGroup);

  const plenumCY = yB + PLENUM_H / 2;
  addBox(plenumGroup, LAF_W, PLENUM_H, PLENUM_T, 0, plenumCY, -LAF_L / 2 + PLENUM_T / 2, powderMat);
  addBox(plenumGroup, LAF_W, PLENUM_H, PLENUM_T, 0, plenumCY, LAF_L / 2 - PLENUM_T / 2, powderMat);
  addBox(plenumGroup, PLENUM_T, PLENUM_H, LAF_L - 2 * PLENUM_T, -LAF_W / 2 + PLENUM_T / 2, plenumCY, 0, powderMat);
  addBox(plenumGroup, PLENUM_T, PLENUM_H, LAF_L - 2 * PLENUM_T, LAF_W / 2 - PLENUM_T / 2, plenumCY, 0, powderMat);
  addBox(plenumGroup, LAF_W, PLENUM_T, LAF_L, 0, yB + PLENUM_H - PLENUM_T / 2, 0, powderMat);

  // -─ Group A: Rods + duct collar (Y += GAP × 2) ------
  // Duct collar
  const collarGroup = new THREE.Group();
  collarGroup.userData.partId = 'collar';
  scene.add(collarGroup);

  const collarY = yA + COLLAR_H / 2;
  addCyl(collarGroup, COLLAR_R, COLLAR_R, COLLAR_H, 32, 0, collarY, 0, collarMat);
  addCyl(collarGroup, COLLAR_R + 1, COLLAR_R + 1, 0.5, 32, 0, yA + 0.25, 0, collarMat);

  // Suspension rods
  const rodsGroup = new THREE.Group();
  rodsGroup.userData.partId = 'rods';
  scene.add(rodsGroup);

  const rodInset = 10;
  const rodY = yA + ROD_H / 2 + COLLAR_H;
  const rodPositions: [number, number][] = [
    [-LAF_W / 2 + rodInset, -LAF_L / 2 + rodInset],
    [LAF_W / 2 - rodInset, -LAF_L / 2 + rodInset],
    [LAF_W / 2 - rodInset, LAF_L / 2 - rodInset],
    [-LAF_W / 2 + rodInset, LAF_L / 2 - rodInset],
  ];

  for (const [rx, rz] of rodPositions) {
    addCyl(rodsGroup, ROD_R, ROD_R, ROD_H, 12, rx, rodY, rz, rodMat);
    addCyl(rodsGroup, ROD_R * 2.5, ROD_R * 2.5, 0.8, 6, rx, rodY + ROD_H / 2 + 0.4, rz, rodMat);
  }

  // -─ Dashed connector lines -----------------
  // D ↔ C (face ↔ HEPA)
  addYConnectors(scene, LAF_W / 2, LAF_L / 2,
    yD + frameH, yC);

  // C ↔ B (HEPA ↔ plenum)
  addYConnectors(scene, LAF_W / 2, LAF_L / 2,
    yC + HEPA_H, yB);

  // B ↔ A (plenum ↔ rods/collar)
  addYConnectors(scene, LAF_W / 2, LAF_L / 2,
    yB + PLENUM_H, yA);

  // -─ Annotations ----------------------─
  placeAnnotations(
    scene,
    [
      { partId: 'rods',
        anchor: new THREE.Vector3(rodPositions[1][0], rodY + ROD_H / 2, rodPositions[1][1]),
        label: 'Suspension Rod M8 × 4' },
      { partId: 'collar',
        anchor: new THREE.Vector3(0, collarY, 0),
        label: 'Duct Inlet Collar ⌀350 mm' },
      { partId: 'plenum',
        anchor: new THREE.Vector3(LAF_W / 2, plenumCY, 0),
        label: 'Plenum Distribution Box 280 mm' },
      { partId: 'hepa',
        anchor: new THREE.Vector3(colXs[1], hepaCY, rowZs[1]),
        label: 'HEPA H14 Filter × 6 Modul' },
      { partId: 'face',
        anchor: new THREE.Vector3(0, faceCY, 0),
        label: 'Perforated Face Diffuser' },
      { partId: 'opening',
        anchor: new THREE.Vector3(0, yD, 0),
        label: 'Central Pass-Through ⌀200 mm' },
    ],
    LAF_W / 2 + 50,
    [yD - 10, rodY + ROD_H / 2 + 15],
  );
}

// -─ React component ---------------------─

export function LafSystemExploded3D({ product }: Props) {
  const lastPreset = product.cameraPresets[product.cameraPresets.length - 1];
  const [activePreset, setActivePreset] = useState<string>(
    lastPreset?.name ?? '',
  );

  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 40,
      maxDistance: 600,
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
