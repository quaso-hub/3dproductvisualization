/**
 * HvacSystemExploded3D.tsx — EXPLODED VIEW
 * ─────────────────────────────────────────────────────────────
 * HVAC System — 7 component groups separated on Y-axis.
 *
 * Top → Bottom (GAP=50):
 *   Y=+150  A. AHU Double Skin
 *   Y=+100  B. Outdoor Unit
 *   Y= +50  C. PIU Ducting
 *   Y=   0  D. LAF Ceiling (reference)
 *   Y= -50  E. Control Panel AHU
 *   Y=-100  F. Refrigerant Piping
 *   Y=-150  G. Return Air Grille
 *
 * Each component centered at X=0, Z=0. No room context.
 * Dashed connectors between adjacent groups at 4 corners.
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';
import { createHvacHMITexture } from './hvac-panel-texture';

interface Props { product: Product }

const GAP = 50;

// Y offsets for 7 groups
const YA =  GAP * 3;   // 150
const YB =  GAP * 2;   // 100
const YC =  GAP * 1;   //  50
const YD =  0;          //   0  (reference)
const YE = -GAP * 1;   // -50
const YF = -GAP * 2;   // -100
const YG = -GAP * 3;   // -150

// Component dimensions (same as assembled, in scene units at 1:50)
const AHU_W = 24, AHU_H = 18.6, AHU_L = 60;
const ODU_W = 24, ODU_H = 30, ODU_D = 18;
const DW = 12, DH = 8;
const LAF_W = 24, LAF_L = 36;
const CP_W = 18, CP_H = 12, CP_D = 5;
const RAG_W = 12, RAG_H = 8, RAG_D = 2;

// Bounding half-extents for dashed connectors
const CONN_HW = 32, CONN_HL = 32;

// ─── Material factories ────────────────────────────────────────

function matAHUBody() {
  return new THREE.MeshStandardMaterial({
    color: 0xb8c0cc, roughness: 0.55, metalness: 0.20, envMapIntensity: 0.8,
  });
}
function matOutdoorUnit() {
  return new THREE.MeshStandardMaterial({
    color: 0xd4d8dc, roughness: 0.50, metalness: 0.15, envMapIntensity: 0.7,
  });
}
function matDuctPIU() {
  return new THREE.MeshStandardMaterial({
    color: 0xced4da, roughness: 0.65, metalness: 0.10, envMapIntensity: 0.6,
  });
}
function matControlPanel() {
  return new THREE.MeshStandardMaterial({
    color: 0x78909c, roughness: 0.50, metalness: 0.25, envMapIntensity: 0.8,
  });
}
function matInsulationBlack() {
  return new THREE.MeshStandardMaterial({
    color: 0x2d3436, roughness: 0.90, metalness: 0.0, envMapIntensity: 0.2,
  });
}
function matCopperPipe() {
  return new THREE.MeshStandardMaterial({
    color: 0xb87333, roughness: 0.30, metalness: 0.85, envMapIntensity: 1.0,
  });
}
function matGalvanised() {
  return new THREE.MeshStandardMaterial({
    color: 0xb4bec8, roughness: 0.35, metalness: 0.80, envMapIntensity: 0.9,
  });
}
function matSSFrame() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dce6, roughness: 0.22, metalness: 0.92, envMapIntensity: 1.2,
  });
}
function matSlat() {
  return new THREE.MeshStandardMaterial({
    color: 0xa8b0bc, roughness: 0.40, metalness: 0.50, envMapIntensity: 0.8,
  });
}
function matFanBlade() {
  return new THREE.MeshStandardMaterial({
    color: 0x505860, roughness: 0.45, metalness: 0.30,
  });
}
function matRSTLamp(color: number) {
  return new THREE.MeshStandardMaterial({
    color, emissive: new THREE.Color(color), emissiveIntensity: 0.8,
    roughness: 0.3, metalness: 0.1,
  });
}
function matHEPAMedia() {
  return new THREE.MeshStandardMaterial({
    color: 0xf2ece0, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.3,
  });
}
function matPerforatedFace() {
  return new THREE.MeshStandardMaterial({
    color: 0xedede8, roughness: 0.75, metalness: 0.05, envMapIntensity: 0.6,
  });
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

// ─── Dashed connectors ─────────────────────────────────────────

function addDashedLine(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineDashedMaterial({
    color: 0x8ca0b8, dashSize: 5, gapSize: 4,
    opacity: 0.32, transparent: true, depthTest: false, depthWrite: false,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  line.renderOrder = 997;
  scene.add(line);
}

function addYConnectors(
  scene: THREE.Scene, halfW: number, halfL: number,
  y1: number, y2: number,
) {
  const corners: [number, number][] = [
    [-halfW, -halfL], [halfW, -halfL], [halfW, halfL], [-halfW, halfL],
  ];
  for (const [x, z] of corners) {
    addDashedLine(scene, new THREE.Vector3(x, y1, z), new THREE.Vector3(x, y2, z));
  }
}

// ─── Build each component group (centered at X=0, Z=0) ────────

function buildAHUGroup(scene: THREE.Scene) {
  const g = new THREE.Group();
  const body = matAHUBody();
  const slat = matSlat();

  addBox(g, AHU_W, AHU_H, AHU_L, 0, 0, 0, body);

  // Front inlet grille slats
  for (let i = 0; i < 10; i++) {
    const sy = -AHU_H / 2 + 1.5 + i * (AHU_H - 3) / 9;
    addBox(g, AHU_W * 0.92, 0.3, 0.3, 0, sy, AHU_L / 2 + 0.15, slat);
  }

  // Duct collar
  addCyl(g, 5, 5, 3, 24, 0, AHU_H / 2 + 1.5, 0, matGalvanised());

  // Control box on top
  addBox(g, 4, 3, 4, AHU_W / 2 - 3, AHU_H / 2 + 1.5, AHU_L / 2 - 6, body);

  g.position.set(0, YA, 0);
  scene.add(g);
}

function buildOutdoorUnitGroup(scene: THREE.Scene) {
  const g = new THREE.Group();
  const housing = matOutdoorUnit();
  const blade = matFanBlade();

  addBox(g, ODU_W, ODU_H, ODU_D, 0, 0, 0, housing);

  // Fan grille
  const grille = new THREE.Mesh(new THREE.TorusGeometry(8, 0.3, 8, 32), matGalvanised());
  grille.position.set(0, 2, ODU_D / 2 + 0.2);
  g.add(grille);
  addBox(g, 15, 0.2, 0.2, 0, 2, ODU_D / 2 + 0.2, matGalvanised());
  addBox(g, 0.2, 15, 0.2, 0, 2, ODU_D / 2 + 0.2, matGalvanised());

  // Fan blades
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6, 0.2), blade);
    mesh.position.set(Math.cos(angle) * 3, 2 + Math.sin(angle) * 3, ODU_D / 2 + 0.3);
    mesh.rotation.z = angle + Math.PI / 6;
    g.add(mesh);
  }

  // Fin coil sides
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 16; i++) {
      const sy = -ODU_H / 2 + 1.5 + i * (ODU_H - 3) / 15;
      addBox(g, 0.15, 0.8, ODU_D * 0.85, sx * (ODU_W / 2 + 0.08), sy, 0, matSlat());
    }
  }

  // Base frame
  const frame = matGalvanised();
  addBox(g, ODU_W + 2, 1, 1, 0, -ODU_H / 2 - 0.5, ODU_D / 2 - 0.5, frame);
  addBox(g, ODU_W + 2, 1, 1, 0, -ODU_H / 2 - 0.5, -ODU_D / 2 + 0.5, frame);

  g.position.set(0, YB, 0);
  scene.add(g);
}

function buildDuctingGroup(scene: THREE.Scene) {
  const g = new THREE.Group();
  const duct = matDuctPIU();

  // Straight duct segment
  addBox(g, DW, DH, 40, 0, 0, 0, duct);

  // Seam lines
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x8a929e, roughness: 0.5, metalness: 0.3,
  });
  for (const z of [-12, 0, 12]) {
    addBox(g, DW + 0.5, DH + 0.5, 0.15, 0, 0, z, seamMat);
  }

  // Volume damper hint (thin angled plate inside)
  const damperMat = new THREE.MeshStandardMaterial({
    color: 0x707880, roughness: 0.5, metalness: 0.4,
  });
  const damper = addBox(g, DW * 0.85, DH * 0.85, 0.15, 0, 0, 6, damperMat);
  damper.rotation.x = Math.PI / 6;

  g.position.set(0, YC, 0);
  scene.add(g);
}

function buildLAFGroup(scene: THREE.Scene) {
  const g = new THREE.Group();
  const frame = matSSFrame();
  const FW = 1.5;

  // Frame perimeter
  addBox(g, LAF_W, FW, FW, 0, 0, -LAF_L / 2 + FW / 2, frame);
  addBox(g, LAF_W, FW, FW, 0, 0, LAF_L / 2 - FW / 2, frame);
  addBox(g, FW, FW, LAF_L - 2 * FW, -LAF_W / 2 + FW / 2, 0, 0, frame);
  addBox(g, FW, FW, LAF_L - 2 * FW, LAF_W / 2 - FW / 2, 0, 0, frame);

  // Perforated face
  const faceM = matPerforatedFace();
  const face = addBox(g, LAF_W - 2 * FW, 0.3, LAF_L - 2 * FW, 0, -FW / 2, 0, faceM);

  // Perforation alpha map
  const perfCanvas = document.createElement('canvas');
  perfCanvas.width = 24;
  perfCanvas.height = 42;
  const pCtx = perfCanvas.getContext('2d')!;
  pCtx.fillStyle = '#fff';
  pCtx.fillRect(0, 0, 24, 42);
  pCtx.fillStyle = '#000';
  const hR = 3;
  pCtx.beginPath(); pCtx.arc(12, 7, hR, 0, Math.PI * 2); pCtx.fill();
  pCtx.beginPath(); pCtx.arc(0, 21, hR, 0, Math.PI * 2); pCtx.fill();
  pCtx.beginPath(); pCtx.arc(24, 21, hR, 0, Math.PI * 2); pCtx.fill();
  pCtx.beginPath(); pCtx.arc(12, 35, hR, 0, Math.PI * 2); pCtx.fill();

  const alphaMap = new THREE.CanvasTexture(perfCanvas);
  alphaMap.wrapS = alphaMap.wrapT = THREE.RepeatWrapping;
  const faceWmm = (LAF_W - 2 * FW) * 50;
  const faceLmm = (LAF_L - 2 * FW) * 50;
  const pitch = 6;
  alphaMap.repeat.set(faceWmm / (pitch * 4), faceLmm / (pitch * 7));
  (face.material as THREE.MeshStandardMaterial).alphaMap = alphaMap;
  (face.material as THREE.MeshStandardMaterial).transparent = true;
  (face.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;

  // HEPA hint
  addBox(g, LAF_W - 2, 3, LAF_L - 2, 0, FW / 2 + 1.5, 0, matHEPAMedia());

  g.position.set(0, YD, 0);
  scene.add(g);
}

function buildControlPanelGroup(scene: THREE.Scene) {
  const g = new THREE.Group();
  const panel = matControlPanel();

  addBox(g, CP_W, CP_H, CP_D, 0, 0, 0, panel);

  // Front door outline
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x8a9aac, roughness: 0.48, metalness: 0.28,
  });
  addBox(g, CP_W - 1.5, CP_H - 1.5, 0.15, 0, 0, CP_D / 2 + 0.08, doorMat);

  // Handle
  addBox(g, 0.4, 2, 0.4, CP_W / 2 - 2, 0, CP_D / 2 + 0.3, matGalvanised());

  // HMI screen
  const screenGeo = new THREE.PlaneGeometry(7, 5);
  const screenTex = createHvacHMITexture();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, -1.5, CP_D / 2 + 0.1);
  g.add(screen);

  // MCB switches
  for (let i = 0; i < 8; i++) {
    const sx = -CP_W / 2 + 2 + i * (CP_W - 4) / 7;
    addBox(g, 0.8, 1, 0.4, sx, CP_H / 2 - 2, CP_D / 2 + 0.3,
      new THREE.MeshStandardMaterial({ color: 0x303030, roughness: 0.6, metalness: 0.2 }));
  }

  // RST lamps
  const lampR = 0.5;
  addCyl(g, lampR, lampR, 0.4, 12, -3, CP_H / 2 - 4.5, CP_D / 2 + 0.3, matRSTLamp(0xff2222));
  addCyl(g, lampR, lampR, 0.4, 12, 0, CP_H / 2 - 4.5, CP_D / 2 + 0.3, matRSTLamp(0xffcc00));
  addCyl(g, lampR, lampR, 0.4, 12, 3, CP_H / 2 - 4.5, CP_D / 2 + 0.3, matRSTLamp(0x2255ff));

  g.position.set(0, YE, 0);
  scene.add(g);
}

function buildPipingGroup(scene: THREE.Scene) {
  const g = new THREE.Group();
  const insul = matInsulationBlack();
  const copper = matCopperPipe();
  const bracket = matGalvanised();
  const pipeLen = 50;

  // Suction line
  addCyl(g, 1.0, 1.0, pipeLen, 12, 0, 0, -1.5, insul, 0, Math.PI / 2);
  addCyl(g, 0.5, 0.5, 2, 12, -pipeLen / 2 + 1, 0, -1.5, copper, 0, Math.PI / 2);
  addCyl(g, 0.5, 0.5, 2, 12, pipeLen / 2 - 1, 0, -1.5, copper, 0, Math.PI / 2);

  // Liquid line
  addCyl(g, 0.7, 0.7, pipeLen, 12, 0, 0, 1.5, insul, 0, Math.PI / 2);
  addCyl(g, 0.35, 0.35, 2, 12, -pipeLen / 2 + 1, 0, 1.5, copper, 0, Math.PI / 2);
  addCyl(g, 0.35, 0.35, 2, 12, pipeLen / 2 - 1, 0, 1.5, copper, 0, Math.PI / 2);

  // Brackets
  for (const bx of [-15, 0, 15]) {
    addBox(g, 0.4, 3, 0.4, bx, -2.5, 0, bracket);
    addBox(g, 0.4, 0.4, 5, bx, -1, 0, bracket);
  }

  g.position.set(0, YF, 0);
  scene.add(g);
}

function buildReturnAirGrilleGroup(scene: THREE.Scene) {
  const g = new THREE.Group();
  const galv = matGalvanised();

  addBox(g, RAG_W, RAG_H, RAG_D, 0, 0, 0, galv);

  // Perforated face
  const face = matPerforatedFace();
  addBox(g, RAG_W - 1.5, RAG_H - 1.5, 0.2, 0, 0, RAG_D / 2 + 0.1, face);

  // Grid lines
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0x8a929e, roughness: 0.5, metalness: 0.3,
  });
  for (let i = 0; i < 5; i++) {
    const ly = -RAG_H / 2 + 1.5 + i * (RAG_H - 3) / 4;
    addBox(g, RAG_W - 2, 0.15, 0.1, 0, ly, RAG_D / 2 + 0.2, lineMat);
  }

  g.position.set(0, YG, 0);
  scene.add(g);
}

// ─── Build scene ───────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  renderer.toneMappingExposure = 1.0;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  // Build all 7 component groups
  buildAHUGroup(scene);
  buildOutdoorUnitGroup(scene);
  buildDuctingGroup(scene);
  buildLAFGroup(scene);
  buildControlPanelGroup(scene);
  buildPipingGroup(scene);
  buildReturnAirGrilleGroup(scene);

  // Dashed connectors between adjacent groups
  const groups = [YA, YB, YC, YD, YE, YF, YG];
  const halfH = [AHU_H / 2, ODU_H / 2, DH / 2, 2, CP_H / 2, 1.5, RAG_H / 2];
  for (let i = 0; i < groups.length - 1; i++) {
    const y1 = groups[i] - halfH[i];
    const y2 = groups[i + 1] + halfH[i + 1];
    addYConnectors(scene, CONN_HW, CONN_HL, y1, y2);
  }

  // Annotations
  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(AHU_W / 2, YA, 0),
        label: 'AHU Double Skin — 1200×3000×930mm' },
      { anchor: new THREE.Vector3(ODU_W / 2, YB, 0),
        label: 'Outdoor Unit DAIKIN — 12HP, R410A' },
      { anchor: new THREE.Vector3(DW / 2, YC, 0),
        label: 'Ducting PIU — 600×400mm, Insul. 20mm' },
      { anchor: new THREE.Vector3(LAF_W / 2, YD, 0),
        label: 'LAF Ceiling — HEPA H14, 1200×1800mm' },
      { anchor: new THREE.Vector3(CP_W / 2, YE, 0),
        label: 'Control Panel AHU — PLC + HMI 7"' },
      { anchor: new THREE.Vector3(5, YF, 0),
        label: 'Pipa Refrigerant — ASTM B280, Copper' },
      { anchor: new THREE.Vector3(RAG_W / 2, YG, 0),
        label: 'Return Air Grille — 600×400mm Galv.' },
    ],
    CONN_HW + 20,
    [YG - 15, YA + 20],
  );
}

// ─── React component ───────────────────────────────────────────

export function HvacSystemExploded3D({ product }: Props) {
  const firstPreset = product.cameraPresets[0];
  const [activePreset, setActivePreset] = useState<string>(
    firstPreset?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 60,
      maxDistance: 900,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
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
