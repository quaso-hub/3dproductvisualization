/**
 * PassBoxAssembled3D.tsx — ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * Pass Box Stainless Steel SUS-304 — tampilan utuh, kedua pintu tertutup.
 *
 * Referensi visual:
 * - Body kubik: 800×800×500mm (brushed SS exterior)
 * - 2 pintu identik (depan & belakang) dengan kaca jendela ~60% area
 * - Rubber gasket seal di sekeliling frame pintu
 * - Handle horizontal bar SS (sisi kiri) + cam-lock latch
 * - 3 engsel heavy-duty per pintu (sisi kanan)
 * - Interior mirror finish + UV lamp di ceiling
 * - Control panel (switch merah + LED hijau) di sisi kiri atas body
 * - Port plug biru di sisi kiri bawah body
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
const OW = 80;   // outer width  800mm
const OH = 80;   // outer height 800mm
const OD = 50;   // outer depth  500mm
const WT = 3;    // wall thickness ~30mm

// Door opening in body face
const FRAME_W = OW - WT * 2;   // 74
const FRAME_H = OH - WT * 2;   // 74

// Door leaf (slightly smaller than frame for gasket tolerance)
const DOOR_W = FRAME_W - 2;    // 72
const DOOR_H = FRAME_H - 2;    // 72
const DOOR_T = 4;              // 40mm thick

// Glass window (~60% of door area, centered)
const GLASS_W = 40;  // 400mm
const GLASS_H = 40;  // 400mm
const GLASS_T = 1.2; // 12mm

// Gasket strip dimensions
const GASKET_W = 1.2;

// ─── Material factories ───────────────────────────────────────

function matSSBrushed() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4dc,
    roughness: 0.22,
    metalness: 0.92,
    envMapIntensity: 1.2,
  });
}

function matSSMirror() {
  return new THREE.MeshStandardMaterial({
    color: 0xd8e2ea,
    roughness: 0.04,
    metalness: 0.97,
    envMapIntensity: 1.5,
  });
}

function matSSPolished() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dce6,
    roughness: 0.10,
    metalness: 0.95,
    envMapIntensity: 1.3,
  });
}

function matGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0x9ed4e8,
    roughness: 0.02,
    metalness: 0.0,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    envMapIntensity: 1.2,
  });
}

function matRubber() {
  return new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.85,
    metalness: 0.0,
  });
}

function matUVLamp() {
  return new THREE.MeshStandardMaterial({
    color: 0xb8f7ff,
    roughness: 0.20,
    metalness: 0.0,
    emissive: new THREE.Color(0x60e8ff),
    emissiveIntensity: 0.8,
  });
}

// ─── Geometry helpers ─────────────────────────────────────────

function addBox(
  scene: THREE.Scene,
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
  scene: THREE.Scene,
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

// ─── Build one door assembly ──────────────────────────────────

function buildDoor(scene: THREE.Scene, zFace: number, zSign: number) {
  // zFace = Z position of the door front face
  // zSign = +1 for front door, -1 for back door

  const doorCenterZ = zFace - zSign * DOOR_T / 2;

  // Door leaf with glass cutout (Shape + hole + ExtrudeGeometry)
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

  const doorGeo = new THREE.ExtrudeGeometry(doorShape, {
    depth: DOOR_T,
    bevelEnabled: false,
  });
  doorGeo.translate(0, 0, -DOOR_T / 2);

  const doorMesh = new THREE.Mesh(doorGeo, matSSBrushed());
  doorMesh.position.set(0, OH / 2, doorCenterZ);
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  if (zSign < 0) doorMesh.rotation.y = Math.PI;
  scene.add(doorMesh);

  // Edge lines for door
  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  doorEdges.position.copy(doorMesh.position);
  doorEdges.rotation.copy(doorMesh.rotation);
  scene.add(doorEdges);

  // Glass window
  const glassMesh = new THREE.Mesh(
    new THREE.BoxGeometry(GLASS_W, GLASS_H, GLASS_T),
    matGlass(),
  );
  glassMesh.position.set(0, OH / 2, doorCenterZ);
  scene.add(glassMesh);

  // Glass frame border (4 strips around glass)
  const gfW = 2.0;
  const gfD = DOOR_T * 0.6;
  const gfMat = matSSPolished();
  [
    { pos: [0, OH / 2 + GLASS_H / 2 + gfW / 2, doorCenterZ] as [number, number, number], size: [GLASS_W + gfW * 2, gfW, gfD] as [number, number, number] },
    { pos: [0, OH / 2 - GLASS_H / 2 - gfW / 2, doorCenterZ] as [number, number, number], size: [GLASS_W + gfW * 2, gfW, gfD] as [number, number, number] },
    { pos: [-GLASS_W / 2 - gfW / 2, OH / 2, doorCenterZ] as [number, number, number], size: [gfW, GLASS_H, gfD] as [number, number, number] },
    { pos: [GLASS_W / 2 + gfW / 2, OH / 2, doorCenterZ] as [number, number, number], size: [gfW, GLASS_H, gfD] as [number, number, number] },
  ].forEach(({ pos, size }) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), gfMat);
    m.position.set(...pos);
    scene.add(m);
  });

  // Rubber gasket seal around frame recess (on body face)
  const gasketZ = zFace + zSign * 0.3;
  const gasketMat = matRubber();
  const gH = FRAME_H;
  const gW2 = FRAME_W;
  [
    // top
    addBox(scene, gW2, GASKET_W, 2, 0, OH / 2 + FRAME_H / 2 - GASKET_W / 2, gasketZ, gasketMat, false),
    // bottom
    addBox(scene, gW2, GASKET_W, 2, 0, OH / 2 - FRAME_H / 2 + GASKET_W / 2, gasketZ, gasketMat, false),
    // left
    addBox(scene, GASKET_W, gH - GASKET_W * 2, 2, -gW2 / 2 + GASKET_W / 2, OH / 2, gasketZ, gasketMat, false),
    // right
    addBox(scene, GASKET_W, gH - GASKET_W * 2, 2, gW2 / 2 - GASKET_W / 2, OH / 2, gasketZ, gasketMat, false),
  ];

  // Handle — horizontal bar on LEFT side of door (when viewed from front)
  const handleX = -DOOR_W / 2 + 10;
  const handleY = OH / 2;
  const handleZ = zFace + zSign * 3.5;

  // Handle mounting brackets (2)
  [-6, 6].forEach(dy => {
    addBox(scene, 2, 2, 3, handleX, handleY + dy, zFace + zSign * 1.5, matSSPolished());
  });
  // Handle bar
  addCyl(scene, 1.0, 1.0, 18, 12, handleX, handleY, handleZ, matSSPolished(), 0, 0);

  // Cam-lock latch below handle
  const latchY = handleY - 14;
  const latchZ = zFace + zSign * 1.5;
  addBox(scene, 4, 6, 2, handleX, latchY, latchZ, matSSPolished());
  // Latch lever
  addCyl(scene, 0.6, 0.6, 5, 8, handleX, latchY - 3, latchZ + zSign * 1.2, matSSPolished(), 0, 0);

  // 3 Heavy-duty hinges on RIGHT side of door
  const hingeMat = matSSPolished();
  const hingeX = DOOR_W / 2;
  [OH / 2 + DOOR_H / 2 - 8, OH / 2, OH / 2 - DOOR_H / 2 + 8].forEach(hy => {
    // Door leaf plate
    addBox(scene, 3, 8, DOOR_T * 0.7, hingeX, hy, doorCenterZ, hingeMat);
    // Body plate
    addBox(scene, 3, 8, WT * 0.8, hingeX + 2, hy, zFace - zSign * WT / 2, hingeMat);
    // Pin cylinder
    addCyl(scene, 0.8, 0.8, 9, 10, hingeX + 0.5, hy, zFace, hingeMat, 0, 0);
  });
}

// ─── Scene builder ────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {

  // ── 0. PBR Environment ──────────────────────────────────────
  renderer.toneMappingExposure = 0.80;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  // ── 1. Body shell — 4 wall panels (top, bottom, left, right) ─
  const ssMat = matSSBrushed();

  // Top panel
  addBox(scene, OW, WT, OD, 0, OH - WT / 2, 0, ssMat);
  // Bottom panel
  addBox(scene, OW, WT, OD, 0, WT / 2, 0, ssMat);
  // Left panel
  addBox(scene, WT, OH - WT * 2, OD, -(OW / 2 - WT / 2), OH / 2, 0, ssMat);
  // Right panel
  addBox(scene, WT, OH - WT * 2, OD, (OW / 2 - WT / 2), OH / 2, 0, ssMat);

  // ── 1b. Top panel details ────────────────────────────────────
  // 2 small port holes on top (cable/pressure equalization)
  [- 8, 8].forEach(px => {
    addCyl(scene, 1.0, 1.0, WT + 0.5, 12, px, OH - WT / 2, -10, matSSPolished(), 0, 0);
  });

  // ── 1c. Bottom mounting flange/lip ──────────────────────────
  addBox(scene, OW + 3, 0.8, OD + 3, 0, 0.4, 0, matSSBrushed());

  // ── 2. Front door assembly (Z = +OD/2) ──────────────────────
  buildDoor(scene, OD / 2, +1);

  // ── 3. Back door assembly (Z = -OD/2) ───────────────────────
  buildDoor(scene, -OD / 2, -1);

  // ── 4. Interior detail ──────────────────────────────────────
  // Interior walls (mirror finish, slightly smaller to be inside the shell)
  const innerW = OW - WT * 2 - 1;
  const innerH = OH - WT * 2 - 1;
  const innerD = OD - 2; // doors close against the body edges

  // Back interior wall
  addBox(scene, innerW, innerH, 0.5, 0, OH / 2, -(innerD / 2), matSSMirror());
  // Bottom interior floor
  addBox(scene, innerW, 0.5, innerD, 0, WT + 0.5, 0, matSSMirror());
  // Left interior wall
  addBox(scene, 0.5, innerH, innerD, -(innerW / 2), OH / 2, 0, matSSMirror());
  // Right interior wall
  addBox(scene, 0.5, innerH, innerD, (innerW / 2), OH / 2, 0, matSSMirror());
  // Top interior ceiling
  addBox(scene, innerW, 0.5, innerD, 0, OH - WT - 0.5, 0, matSSMirror());
  // Front interior wall (visible through glass)
  addBox(scene, innerW, innerH, 0.5, 0, OH / 2, (innerD / 2), matSSMirror());

  // UV lamp at ceiling interior
  addCyl(
    scene, 0.8, 0.8, 30, 8,
    0, OH - WT - 1.5, 0,
    matUVLamp(),
    0, Math.PI / 2,
  );

  // ── 5. Control panel (left side body, upper area) ───────────
  const panelX = -(OW / 2);
  const panelY = OH - 8;
  const panelZ = -OD / 4;

  // Panel recess
  addBox(scene, 0.5, 5, 9, panelX - 0.3, panelY, panelZ,
    new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.70, metalness: 0.0 }),
    false,
  );

  // Red power switch
  addBox(scene, 0.8, 2, 1.2, panelX - 0.6, panelY + 1, panelZ - 2,
    new THREE.MeshStandardMaterial({ color: 0xd91a1a, roughness: 0.60, metalness: 0.0 }),
    false,
  );

  // Green LED indicator
  const ledMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: new THREE.Color(0x16a34a),
      emissiveIntensity: 2.0,
      roughness: 0.3,
      metalness: 0.0,
    }),
  );
  ledMesh.position.set(panelX - 0.6, panelY - 1, panelZ - 2);
  scene.add(ledMesh);

  // ── 6. Blue port plug (left side body, lower area) ──────────
  addCyl(
    scene, 0.8, 0.8, 1.5, 10,
    -(OW / 2) - 0.5, 10, -OD / 4,
    new THREE.MeshStandardMaterial({ color: 0x1a59cc, roughness: 0.50, metalness: 0.0 }),
    0, 0,
  );

  // ── 7. Annotations (6 items — clear, not crowded) ───────────
  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(OW / 2 - 2, OH / 2, OD / 2 - 5),              label: 'Body SUS 304 (Brushed)' },
      { anchor: new THREE.Vector3(0, OH / 2, OD / 2 - DOOR_T / 2),               label: 'Clear Glass 12mm' },
      { anchor: new THREE.Vector3(-FRAME_W / 2 + 1, OH / 2, OD / 2 + 0.5),      label: 'Rubber Gasket Seal' },
      { anchor: new THREE.Vector3(-DOOR_W / 2 + 10, OH / 2 - 6, OD / 2 + 3.5),  label: 'Handle & Cam-Lock SS 304' },
      { anchor: new THREE.Vector3(DOOR_W / 2, OH / 2, OD / 2),                   label: 'Heavy-Duty Hinge ×3' },
      { anchor: new THREE.Vector3(-(OW / 2) - 0.3, OH - 8, -OD / 4),            label: 'Control Panel + UV Lamp' },
    ],
    OW / 2 + 55,
    [-5, OH + 5],
  );
}

// ─── React component ──────────────────────────────────────────

export function PassBoxAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 60,
      maxDistance: 800,
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
