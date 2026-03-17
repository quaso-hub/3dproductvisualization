/**
 * ReturnAirGrilleAssembled3D.tsx — ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * Wall Corner Return Air Grille SUS-304 — tampilan terpasang di dinding.
 *
 * Referensi visual:
 * - Frame outer 600×400×100mm (brushed SS)
 * - Perforated face panel (⌀3mm holes, pitch 5mm, polished SS)
 * - G4 pre-filter washable di belakang face panel
 * - Mounting flange 15mm overhang pada dinding
 * - Wall fragment sebagai konteks pemasangan
 * - 4 baut mounting di sudut flange
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

const FACE_W = FW - 2 * FB;  // 56 — face opening width
const FACE_H = FH - 2 * FB;  // 36 — face opening height
const PANEL_T = 0.3;         // face panel visual thickness

const FLANGE_LIP = 1.5;     // 15mm overhang on wall
const FLANGE_T   = 0.3;     // flange thickness

const FILTER_W = FACE_W - 2; // 54
const FILTER_H = FACE_H - 2; // 34
const FILTER_T = 2;          // 20mm

const WALL_W = FW + 30;      // 90 — wall fragment width
const WALL_H = FH + 20;      // 60 — wall fragment height
const WALL_T = 12;           // 120mm wall panel thickness

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

function matWall() {
  return new THREE.MeshStandardMaterial({
    color: 0xe8e8e0, roughness: 0.80, metalness: 0.0, envMapIntensity: 0.2,
  });
}

function matScrew() {
  return new THREE.MeshStandardMaterial({
    color: 0xb8c4cc, roughness: 0.15, metalness: 0.96, envMapIntensity: 1.4,
  });
}

// ─── CanvasTexture for perforated face panel ─────────────────

function createPerforationAlphaMap(): THREE.CanvasTexture {
  // 560×360mm real face area → 1120×720px canvas (2px per mm)
  const CW = 1120, CH = 720;
  const canvas = document.createElement('canvas');
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d')!;

  // White = opaque (metal), Black = transparent (holes)
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, CW, CH);

  ctx.fillStyle = '#000';
  const HOLE_R = 3;   // 1.5mm radius × 2px/mm
  const PITCH  = 10;  // 5mm pitch × 2px/mm

  // Center the grid pattern
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

function addCyl(
  parent: THREE.Object3D,
  rTop: number, rBot: number, h: number, seg: number,
  x: number, y: number, z: number, mat: THREE.Material,
  rotX = 0, rotZ = 0,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  if (rotX) mesh.rotation.x = rotX;
  if (rotZ) mesh.rotation.z = rotZ;
  mesh.castShadow = true;
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

// ─── Build scene ─────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // 0. PBR Environment
  renderer.toneMappingExposure = 0.80;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  // 1. Wall fragment (context) — front face at Z=0, extends backward
  buildWallFragment(scene);

  // 2. Frame housing — sits inside wall opening
  buildFrameHousing(scene);

  // 3. Mounting flange — thin lip at wall surface
  buildMountingFlange(scene);

  // 4. Filter — behind face panel
  const filterZ = -(PANEL_T + 0.5 + FILTER_T / 2);
  addBox(scene, FILTER_W, FILTER_H, FILTER_T, 0, FH / 2, filterZ, matFilter());

  // 5. Perforated face panel
  buildPerforatedFacePanel(scene);

  // 6. Mounting screws (4 corners)
  buildMountingScrews(scene);

  // 7. Annotations
  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(FW / 2 - 1, FH / 2, -FD / 2),
        label: 'Frame SUS 304 (Brushed)' },
      { anchor: new THREE.Vector3(0, FH / 2, PANEL_T + 0.5),
        label: 'Panel Perforated SUS 304' },
      { anchor: new THREE.Vector3(0, FH / 2, filterZ),
        label: 'Filter G4 Pre-Filter' },
      { anchor: new THREE.Vector3(FW / 2 + FLANGE_LIP * 0.6, FH - 3, 0),
        label: 'Mounting Flange 15 mm' },
      { anchor: new THREE.Vector3(-WALL_W / 2 + 5, FH / 2, -WALL_T / 2),
        label: 'Dinding Ruang OR' },
      { anchor: new THREE.Vector3(FW / 2 + FLANGE_LIP * 0.5, -FLANGE_LIP * 0.5, FLANGE_T),
        label: 'Baut Mounting ×4' },
    ],
    FW / 2 + 45,
    [-15, FH + 15],
  );
}

// ─── Geometry builders ───────────────────────────────────────

function buildWallFragment(scene: THREE.Scene) {
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-WALL_W / 2, -10);
  wallShape.lineTo( WALL_W / 2, -10);
  wallShape.lineTo( WALL_W / 2, FH + 10);
  wallShape.lineTo(-WALL_W / 2, FH + 10);
  wallShape.closePath();

  // Rectangular cutout for grille opening
  const hole = new THREE.Path();
  hole.moveTo(-FW / 2, 0);
  hole.lineTo( FW / 2, 0);
  hole.lineTo( FW / 2, FH);
  hole.lineTo(-FW / 2, FH);
  hole.closePath();
  wallShape.holes.push(hole);

  const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
    depth: WALL_T,
    bevelEnabled: false,
  });
  wallGeo.translate(0, 0, -WALL_T); // front face at Z=0, extends to Z=-WALL_T

  const wallMesh = new THREE.Mesh(wallGeo, matWall());
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(wallGeo),
    new THREE.LineBasicMaterial({ color: 0xaaaaaa, opacity: 0.08, transparent: true }),
  );
  scene.add(edges);
}

function buildFrameHousing(scene: THREE.Scene) {
  // Rectangular tube: outer FW×FH, inner FACE_W×FACE_H, extruded FD
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-FW / 2, 0);
  frameShape.lineTo( FW / 2, 0);
  frameShape.lineTo( FW / 2, FH);
  frameShape.lineTo(-FW / 2, FH);
  frameShape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-FACE_W / 2, FB);
  hole.lineTo( FACE_W / 2, FB);
  hole.lineTo( FACE_W / 2, FB + FACE_H);
  hole.lineTo(-FACE_W / 2, FB + FACE_H);
  hole.closePath();
  frameShape.holes.push(hole);

  const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
    depth: FD,
    bevelEnabled: false,
  });
  frameGeo.translate(0, 0, -FD); // front face at Z=0, extends to Z=-FD

  const frameMesh = new THREE.Mesh(frameGeo, matSSBrushed());
  frameMesh.castShadow = true;
  frameMesh.receiveShadow = true;
  scene.add(frameMesh);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(frameGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  scene.add(edges);

  // Back panel (duct connection plate) — closes the rear of the frame housing
  addBox(scene, FW, FH, 0.3, 0, FH / 2, -FD + 0.15, matSSBrushed());
}

function buildMountingFlange(scene: THREE.Scene) {
  const flangeShape = new THREE.Shape();
  const hw = FW / 2 + FLANGE_LIP;
  const bot = -FLANGE_LIP;
  const top = FH + FLANGE_LIP;
  flangeShape.moveTo(-hw, bot);
  flangeShape.lineTo( hw, bot);
  flangeShape.lineTo( hw, top);
  flangeShape.lineTo(-hw, top);
  flangeShape.closePath();

  // Frame outer passes through flange
  const hole = new THREE.Path();
  hole.moveTo(-FW / 2, 0);
  hole.lineTo( FW / 2, 0);
  hole.lineTo( FW / 2, FH);
  hole.lineTo(-FW / 2, FH);
  hole.closePath();
  flangeShape.holes.push(hole);

  const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, {
    depth: FLANGE_T,
    bevelEnabled: false,
  });
  flangeGeo.translate(0, 0, 0); // sits at Z=0 (wall surface)

  const flangeMesh = new THREE.Mesh(flangeGeo, matFlange());
  flangeMesh.castShadow = true;
  scene.add(flangeMesh);
}

function buildPerforatedFacePanel(scene: THREE.Scene) {
  const alphaMap = createPerforationAlphaMap();
  const faceMat = matPerforatedFace(alphaMap);

  const faceGeo = new THREE.BoxGeometry(FACE_W, FACE_H, PANEL_T);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.set(0, FH / 2, PANEL_T / 2);
  faceMesh.castShadow = true;
  scene.add(faceMesh);

  // Edge highlight
  addEdges(scene, faceGeo, faceMesh.position);
}

function buildMountingScrews(scene: THREE.Scene) {
  const sm = matScrew();
  const positions: [number, number][] = [
    [-(FW / 2 + FLANGE_LIP * 0.5), -(FLANGE_LIP * 0.5)],
    [ (FW / 2 + FLANGE_LIP * 0.5), -(FLANGE_LIP * 0.5)],
    [-(FW / 2 + FLANGE_LIP * 0.5),  FH + FLANGE_LIP * 0.5],
    [ (FW / 2 + FLANGE_LIP * 0.5),  FH + FLANGE_LIP * 0.5],
  ];
  for (const [x, y] of positions) {
    // Screw head (flat cylinder)
    addCyl(scene, 0.5, 0.5, 0.3, 12, x, y, FLANGE_T + 0.15, sm, Math.PI / 2, 0);
    // Phillips cross slot
    addBox(scene, 0.6, 0.08, 0.1, x, y, FLANGE_T + 0.32,
      new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.3 }));
    addBox(scene, 0.08, 0.6, 0.1, x, y, FLANGE_T + 0.32,
      new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.3 }));
  }
}

// ─── React component ─────────────────────────────────────────

export function ReturnAirGrilleAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 30,
      maxDistance: 400,
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
