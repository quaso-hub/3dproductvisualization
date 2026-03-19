/**
 * SurgicalPanelAssembled3D.tsx — ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * Surgical Control Panel Room Touchscreen — flush-mounted di dinding OR.
 *
 * Komponen utama:
 *   - Wall fragment (HPL white) dengan cutout untuk housing
 *   - Housing SUS 304 brushed (ExtrudeGeometry dengan screen opening)
 *   - Mounting flange di permukaan dinding
 *   - LCD Touchscreen (Canvas2D emissive texture — SCADA UI)
 *   - Tempered glass overlay
 *   - 6 function buttons (LED backlit) di bawah layar
 *   - 4 mounting screws di sudut flange
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';
import { createScreenUITexture } from './surgical-panel-texture';

interface Props { product: Product }

// ─── Dimensi (scene units, 1 unit = 10mm) ───────────────────
const HW = 45;          // housing width  450mm
const HH = 31;          // housing height 310mm
const FD = 8.5;         // housing depth  85mm

const BEZEL_L = 4;      // left bezel   40mm
const BEZEL_R = 4;      // right bezel  40mm
const BEZEL_T = 5;      // top bezel    50mm
const BEZEL_B = 6;      // bottom bezel 60mm (wider — button area)

const OPENING_W = HW - BEZEL_L - BEZEL_R;  // 37
const OPENING_H = HH - BEZEL_T - BEZEL_B;  // 20
const OPENING_CY = BEZEL_B + OPENING_H / 2; // 16

const SCREEN_W = 34.5;  // 345mm visible
const SCREEN_H = 19.4;  // 194mm visible

const FLANGE_LIP = 2;   // 20mm overhang
const FLANGE_T   = 0.3; // 3mm thickness

const WALL_W = 70;      // 700mm
const WALL_H = 60;      // 600mm
const WALL_T = 10;      // 100mm

const WALL_BOT = -(WALL_H - HH) / 2;   // -14.5
const WALL_TOP = HH + (WALL_H - HH) / 2; // 45.5

// ─── Material factories ──────────────────────────────────────

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

function matWall() {
  return new THREE.MeshStandardMaterial({
    color: 0xebebea, roughness: 0.75, metalness: 0.0, envMapIntensity: 0.2,
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
    transparent: true, opacity: 0.03, side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  });
}

function matScrew() {
  return new THREE.MeshStandardMaterial({
    color: 0xe0e8f0, roughness: 0.10, metalness: 0.97, envMapIntensity: 1.4,
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
  rotX = 0,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  if (rotX) mesh.rotation.x = rotX;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// ─── Build scene ─────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // 0. PBR Environment
  renderer.toneMappingExposure = 1.10;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  // 1. Wall fragment (context)
  buildWallFragment(scene);

  // 2. Housing body (ExtrudeGeometry with screen opening)
  buildHousing(scene);

  // 3. Mounting flange
  buildMountingFlange(scene);

  // 4. Dark screen backing + LCD Screen + Glass overlay
  buildScreenAssembly(scene);

  // 5. Function buttons (6 LED backlit)
  buildFunctionButtons(scene);

  // 6. Mounting screws (4 corners)
  buildMountingScrews(scene);

  // 7. Speaker grill (right side)
  buildSpeakerGrill(scene);

  // 8. Annotations
  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(HW / 2 - 1, HH / 2, -FD / 2),
        label: 'Housing SUS 304 Brushed' },
      { anchor: new THREE.Vector3(0, OPENING_CY, 0.1),
        label: 'LCD Touchscreen 15.6" Full HD' },
      { anchor: new THREE.Vector3(0, OPENING_CY + OPENING_H / 2 - 1, 0.3),
        label: 'Cover Glass (Tempered, IP65)' },
      { anchor: new THREE.Vector3(HW / 2 + FLANGE_LIP * 0.6, HH + FLANGE_LIP * 0.5, 0),
        label: 'Mounting Flange SUS 304' },
      { anchor: new THREE.Vector3(0, BEZEL_B / 2, 0.2),
        label: 'Button Kontrol ×6 (LED)' },
      { anchor: new THREE.Vector3(-WALL_W / 2 + 5, HH / 2, -WALL_T / 2),
        label: 'Dinding Panel OR (HPL)' },
      { anchor: new THREE.Vector3(HW / 2 + FLANGE_LIP * 0.5, WALL_BOT + 2, FLANGE_T),
        label: 'Baut Mounting ×4' },
      { anchor: new THREE.Vector3(HW / 2, HH / 2, -FD / 4),
        label: 'Speaker Grill (Audio Alarm)' },
    ],
    HW / 2 + 40,
    [WALL_BOT - 5, WALL_TOP + 5],
  );
}

// ─── Geometry builders ───────────────────────────────────────

function buildWallFragment(scene: THREE.Scene) {
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-WALL_W / 2, WALL_BOT);
  wallShape.lineTo( WALL_W / 2, WALL_BOT);
  wallShape.lineTo( WALL_W / 2, WALL_TOP);
  wallShape.lineTo(-WALL_W / 2, WALL_TOP);
  wallShape.closePath();

  // Rectangular cutout for housing
  const hole = new THREE.Path();
  hole.moveTo(-HW / 2, 0);
  hole.lineTo( HW / 2, 0);
  hole.lineTo( HW / 2, HH);
  hole.lineTo(-HW / 2, HH);
  hole.closePath();
  wallShape.holes.push(hole);

  const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
    depth: WALL_T, bevelEnabled: false,
  });
  wallGeo.translate(0, 0, -WALL_T); // front at Z=0, extends backward

  const wallMesh = new THREE.Mesh(wallGeo, matWall());
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);

  // Subtle edge lines
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(wallGeo),
    new THREE.LineBasicMaterial({ color: 0xaaaaaa, opacity: 0.08, transparent: true }),
  );
  scene.add(edges);
}

function buildHousing(scene: THREE.Scene) {
  // Front face frame with screen opening hole
  const housingShape = new THREE.Shape();
  housingShape.moveTo(-HW / 2, 0);
  housingShape.lineTo( HW / 2, 0);
  housingShape.lineTo( HW / 2, HH);
  housingShape.lineTo(-HW / 2, HH);
  housingShape.closePath();

  // Screen opening
  const openL = -HW / 2 + BEZEL_L;
  const openB = BEZEL_B;
  const openR = openL + OPENING_W;
  const openT = openB + OPENING_H;
  const hole = new THREE.Path();
  hole.moveTo(openL, openB);
  hole.lineTo(openR, openB);
  hole.lineTo(openR, openT);
  hole.lineTo(openL, openT);
  hole.closePath();
  housingShape.holes.push(hole);

  const housingGeo = new THREE.ExtrudeGeometry(housingShape, {
    depth: FD, bevelEnabled: false,
  });
  housingGeo.translate(0, 0, -FD); // front at Z=0

  const housingMesh = new THREE.Mesh(housingGeo, matSS304());
  housingMesh.castShadow = true;
  housingMesh.receiveShadow = true;
  scene.add(housingMesh);

  // Subtle edge highlight
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(housingGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  scene.add(edges);

  // Back panel — closes the rear
  addBox(scene, HW, HH, 0.3, 0, HH / 2, -FD + 0.15, matSS304());
}

function buildMountingFlange(scene: THREE.Scene) {
  const flangeShape = new THREE.Shape();
  const fhw = HW / 2 + FLANGE_LIP;
  const bot = -FLANGE_LIP;
  const top = HH + FLANGE_LIP;
  flangeShape.moveTo(-fhw, bot);
  flangeShape.lineTo( fhw, bot);
  flangeShape.lineTo( fhw, top);
  flangeShape.lineTo(-fhw, top);
  flangeShape.closePath();

  // Housing passes through flange
  const hole = new THREE.Path();
  hole.moveTo(-HW / 2, 0);
  hole.lineTo( HW / 2, 0);
  hole.lineTo( HW / 2, HH);
  hole.lineTo(-HW / 2, HH);
  hole.closePath();
  flangeShape.holes.push(hole);

  const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, {
    depth: FLANGE_T, bevelEnabled: false,
  });

  const flangeMesh = new THREE.Mesh(flangeGeo, matFlange());
  flangeMesh.castShadow = true;
  scene.add(flangeMesh);
}

function buildScreenAssembly(scene: THREE.Scene) {
  // A. Dark backing — fills entire screen opening behind screen
  addBox(scene, OPENING_W, OPENING_H, 0.1, 0, OPENING_CY, -0.35, matDarkBezel());

  // B. LCD Touchscreen — emissive Canvas2D texture
  const screenTex = createScreenUITexture();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screenGeo = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, OPENING_CY, -0.25);
  scene.add(screenMesh);

  // C. Tempered glass overlay — slightly in front of screen
  const glassGeo = new THREE.PlaneGeometry(OPENING_W - 0.5, OPENING_H - 0.5);
  const glassMesh = new THREE.Mesh(glassGeo, matGlass());
  glassMesh.position.set(0, OPENING_CY, -0.05);
  scene.add(glassMesh);
}

function buildFunctionButtons(scene: THREE.Scene) {
  // 6 buttons evenly spaced in bottom bezel
  const btnY = BEZEL_B / 2;           // 3.0 — center of bottom bezel
  const btnZ = 0.15;                   // slightly proud of housing face
  const spanX = HW - BEZEL_L - BEZEL_R - 4; // usable width minus margins
  const colors = [0x42A5F5, 0x42A5F5, 0x42A5F5, 0x66BB6A, 0xFF1744, 0xFFD600];

  for (let i = 0; i < 6; i++) {
    const bx = -spanX / 2 + (i * spanX) / 5;
    const btnMat = new THREE.MeshBasicMaterial({ color: colors[i] });
    addCyl(scene, 0.6, 0.6, 0.2, 16, bx, btnY, btnZ, btnMat, Math.PI / 2);

    // Subtle ring around button
    const ringGeo = new THREE.RingGeometry(0.6, 0.8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa, roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(bx, btnY, btnZ + 0.12);
    scene.add(ring);
  }
}

function buildMountingScrews(scene: THREE.Scene) {
  const sm = matScrew();
  const positions: [number, number][] = [
    [-(HW / 2 + FLANGE_LIP * 0.5), -(FLANGE_LIP * 0.5)],
    [ (HW / 2 + FLANGE_LIP * 0.5), -(FLANGE_LIP * 0.5)],
    [-(HW / 2 + FLANGE_LIP * 0.5),  HH + FLANGE_LIP * 0.5],
    [ (HW / 2 + FLANGE_LIP * 0.5),  HH + FLANGE_LIP * 0.5],
  ];
  for (const [x, y] of positions) {
    addCyl(scene, 0.5, 0.5, 0.3, 12, x, y, FLANGE_T + 0.15, sm, Math.PI / 2);
    // Phillips cross
    const crossMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.3 });
    addBox(scene, 0.6, 0.08, 0.1, x, y, FLANGE_T + 0.32, crossMat);
    addBox(scene, 0.08, 0.6, 0.1, x, y, FLANGE_T + 0.32, crossMat);
  }
}

function buildSpeakerGrill(scene: THREE.Scene) {
  // Small darkened rectangle on right side of housing
  const grillW = 4;  // 40mm
  const grillH = 6;  // 60mm
  const grillMat = new THREE.MeshStandardMaterial({
    color: 0x555f6a, roughness: 0.45, metalness: 0.80,
  });
  addBox(scene, 0.15, grillH, grillW, HW / 2 + 0.08, HH / 2, -FD / 2 + 1, grillMat);

  // Small perforation dots on the grill face
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const dy = HH / 2 - grillH / 2 + 1 + r * 1.2;
      const dz = -FD / 2 + 1 - grillW / 2 + 1 + c * 1.2;
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.25, 8),
        dotMat,
      );
      dot.position.set(HW / 2 + 0.16, dy, dz);
      dot.rotation.y = Math.PI / 2;
      scene.add(dot);
    }
  }
}

// ─── React component ─────────────────────────────────────────

export function SurgicalPanelAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 20,
      maxDistance: 300,
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
