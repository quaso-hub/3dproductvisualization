/**
 * ReturnAirGrilleExploded3D.tsx — EXPLODED VIEW
 * ─────────────────────────────────────────────────────────────
 * Wall Corner Return Air Grille SUS-304 — komponen terpisah.
 *
 * 4 kelompok komponen dipisahkan sepanjang sumbu Z (depth):
 *   A. Face panel (perforated)  → Z += GAP   (depan)
 *   B. Filter G4                → Z = 0      (referensi)
 *   C. Frame housing            → Z -= GAP   (belakang)
 *   D. Mounting flange          → Z -= GAP×2 (paling belakang)
 *
 * Tidak ada wall fragment di exploded view.
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
const FW = 60;         // frame outer width  600mm
const FH = 40;         // frame outer height 400mm
const FD = 10;         // frame depth        100mm
const FB = 2;          // frame border       20mm per side

const FACE_W = FW - 2 * FB;  // 56
const FACE_H = FH - 2 * FB;  // 36
const PANEL_T = 0.3;

const FLANGE_LIP = 1.5;
const FLANGE_T   = 0.3;

const FILTER_W = FACE_W - 2; // 54
const FILTER_H = FACE_H - 2; // 34
const FILTER_T = 2;

const GAP = 15; // 150mm explosion separation

// ─── Material factories ──────────────────────────────────────

function matSSBrushed() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4dc, roughness: 0.22, metalness: 0.92, envMapIntensity: 1.2,
  });
}

function matFlange() {
  return new THREE.MeshStandardMaterial({
    color: 0xc0ccd4, roughness: 0.25, metalness: 0.90, envMapIntensity: 1.1,
  });
}

function matFilter() {
  return new THREE.MeshStandardMaterial({
    color: 0xf5e6c8, roughness: 0.95, metalness: 0.0, envMapIntensity: 0.3,
  });
}

// ─── CanvasTexture for perforated face panel ─────────────────

function createPerforationAlphaMap(): THREE.CanvasTexture {
  const CW = 1120, CH = 720;
  const canvas = document.createElement('canvas');
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, CW, CH);

  ctx.fillStyle = '#000';
  const HOLE_R = 3;
  const PITCH  = 10;

  const cols = Math.floor((CW - PITCH) / PITCH) + 1;
  const rows = Math.floor((CH - PITCH) / PITCH) + 1;
  const xStart = (CW - (cols - 1) * PITCH) / 2;
  const yStart = (CH - (rows - 1) * PITCH) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.beginPath();
      ctx.arc(xStart + c * PITCH, yStart + r * PITCH, HOLE_R, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function matPerforatedFace(alphaMap: THREE.CanvasTexture) {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dce6,
    roughness: 0.10,
    metalness: 0.95,
    envMapIntensity: 1.3,
    alphaMap,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
}

// ─── Geometry helpers ────────────────────────────────────────

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

function addEdges(parent: THREE.Object3D, geo: THREE.BufferGeometry, pos: THREE.Vector3) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  edges.position.copy(pos);
  parent.add(edges);
}

// ─── Dashed connector lines ──────────────────────────────────

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

/** Draw 4 corner connector lines between two Z positions */
function addZConnectors(
  scene: THREE.Scene,
  halfW: number, halfH: number, yCenter: number,
  z1: number, z2: number,
) {
  const corners: [number, number][] = [
    [-halfW,  yCenter - halfH],
    [ halfW,  yCenter - halfH],
    [ halfW,  yCenter + halfH],
    [-halfW,  yCenter + halfH],
  ];
  for (const [x, y] of corners) {
    addDashedLine(scene, new THREE.Vector3(x, y, z1), new THREE.Vector3(x, y, z2));
  }
}

// ─── Build scene ─────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // 0. PBR Environment
  renderer.toneMappingExposure = 0.80;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  // ─── Group A: Face panel at Z += GAP ───────────────────────
  const faceZ = GAP;

  const alphaMap = createPerforationAlphaMap();
  const faceMat = matPerforatedFace(alphaMap);
  const faceGeo = new THREE.BoxGeometry(FACE_W, FACE_H, PANEL_T);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.set(0, FH / 2, faceZ);
  faceMesh.castShadow = true;
  scene.add(faceMesh);
  addEdges(scene, faceGeo, faceMesh.position);

  // ─── Group B: Filter at Z = 0 ─────────────────────────────
  const filterZ = 0;
  addBox(scene, FILTER_W, FILTER_H, FILTER_T, 0, FH / 2, filterZ, matFilter());

  // ─── Group C: Frame housing at Z -= GAP ────────────────────
  const frameZ = -GAP;

  const frameShape = new THREE.Shape();
  frameShape.moveTo(-FW / 2, 0);
  frameShape.lineTo( FW / 2, 0);
  frameShape.lineTo( FW / 2, FH);
  frameShape.lineTo(-FW / 2, FH);
  frameShape.closePath();

  const frameHole = new THREE.Path();
  frameHole.moveTo(-FACE_W / 2, FB);
  frameHole.lineTo( FACE_W / 2, FB);
  frameHole.lineTo( FACE_W / 2, FB + FACE_H);
  frameHole.lineTo(-FACE_W / 2, FB + FACE_H);
  frameHole.closePath();
  frameShape.holes.push(frameHole);

  const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
    depth: FD,
    bevelEnabled: false,
  });
  frameGeo.translate(0, 0, -FD / 2); // center along depth

  const frameMesh = new THREE.Mesh(frameGeo, matSSBrushed());
  frameMesh.position.set(0, 0, frameZ);
  frameMesh.castShadow = true;
  frameMesh.receiveShadow = true;
  scene.add(frameMesh);

  const frameEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(frameGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  frameEdges.position.copy(frameMesh.position);
  scene.add(frameEdges);

  // Back panel of frame
  addBox(scene, FW, FH, 0.3, 0, FH / 2, frameZ - FD / 2 + 0.15, matSSBrushed());

  // ─── Group D: Mounting flange at Z -= GAP*2 ───────────────
  const flangeZ = -GAP * 2;

  const flangeShape = new THREE.Shape();
  const hw = FW / 2 + FLANGE_LIP;
  const bot = -FLANGE_LIP;
  const top = FH + FLANGE_LIP;
  flangeShape.moveTo(-hw, bot);
  flangeShape.lineTo( hw, bot);
  flangeShape.lineTo( hw, top);
  flangeShape.lineTo(-hw, top);
  flangeShape.closePath();

  const flangeHole = new THREE.Path();
  flangeHole.moveTo(-FW / 2, 0);
  flangeHole.lineTo( FW / 2, 0);
  flangeHole.lineTo( FW / 2, FH);
  flangeHole.lineTo(-FW / 2, FH);
  flangeHole.closePath();
  flangeShape.holes.push(flangeHole);

  const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, {
    depth: FLANGE_T,
    bevelEnabled: false,
  });

  const flangeMesh = new THREE.Mesh(flangeGeo, matFlange());
  flangeMesh.position.set(0, 0, flangeZ);
  flangeMesh.castShadow = true;
  scene.add(flangeMesh);

  // ─── Dashed connector lines ────────────────────────────────
  // A ↔ B (face panel ↔ filter)
  addZConnectors(scene, FILTER_W / 2, FILTER_H / 2, FH / 2,
    faceZ - PANEL_T / 2, filterZ + FILTER_T / 2);

  // B ↔ C (filter ↔ frame)
  addZConnectors(scene, FACE_W / 2, FACE_H / 2, FH / 2,
    filterZ - FILTER_T / 2, frameZ + FD / 2);

  // C ↔ D (frame ↔ flange)
  addZConnectors(scene, FW / 2, FH / 2, FH / 2,
    frameZ - FD / 2, flangeZ + FLANGE_T);

  // ─── Annotations ───────────────────────────────────────────
  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(0, FH / 2, faceZ),
        label: 'Panel Perforated SUS 304' },
      { anchor: new THREE.Vector3(0, FH / 2, filterZ),
        label: 'Filter G4 Pre-Filter 20 mm' },
      { anchor: new THREE.Vector3(FW / 2 - 1, FH / 2, frameZ),
        label: 'Frame Housing SUS 304' },
      { anchor: new THREE.Vector3(FW / 2 + FLANGE_LIP * 0.5, FH / 2, flangeZ),
        label: 'Mounting Flange' },
      { anchor: new THREE.Vector3(FACE_W / 4, FH - 3, faceZ),
        label: '⌀3 mm Holes, Pitch 5 mm' },
    ],
    FW / 2 + 40,
    [-10, FH + 10],
  );
}

// ─── React component ─────────────────────────────────────────

export function ReturnAirGrilleExploded3D({ product }: Props) {
  const lastPreset = product.cameraPresets[product.cameraPresets.length - 1];
  const [activePreset, setActivePreset] = useState<string>(
    lastPreset?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 30,
      maxDistance: 400,
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
