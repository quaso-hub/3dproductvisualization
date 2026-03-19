/**
 * HvacSystemAssembled3D.tsx — ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * HVAC System — Operating Theatre integrated system diagram.
 *
 * Shows all 7 HVAC components in spatial context within a
 * partial OR room (isometric cutaway):
 *   A. AHU Double Skin       — rooftop
 *   B. Outdoor Unit DAIKIN   — rooftop
 *   C. PIU Ducting            — rooftop → ceiling → LAF
 *   D. LAF Ceiling HEPA H14  — ceiling
 *   E. Control Panel AHU     — wall (eye level)
 *   F. Refrigerant Piping    — rooftop (Outdoor↔AHU)
 *   G. Return Air Grille ×2  — wall (near floor)
 *
 * Scale: 1 scene unit ≈ 50mm (room 6×6×3m → 120×60×120 units)
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

// ─── Room dimensions (1 unit = 50mm) ──────────────────────────
const ROOM   = 120;   // floor side (6000mm)
const ROOM_H = 54;    // interior height to ceiling underside (2700mm)
const SLAB   = 6;     // ceiling slab thickness (300mm)
const ROOF_Y = ROOM_H + SLAB; // 60 — rooftop surface

// ─── Component A: AHU (1200×930×3000mm → 24×18.6×60) ──────────
const AHU_W = 24, AHU_H = 18.6, AHU_L = 60;
const AHU_X = -10, AHU_Z = -15;
const AHU_Y = ROOF_Y + AHU_H / 2; // center Y

// ─── Component B: Outdoor Unit (1200×1500×900mm → 24×30×18) ───
const ODU_W = 24, ODU_H = 30, ODU_D = 18;
const ODU_X = 40, ODU_Z = -15;
const ODU_Y = ROOF_Y + ODU_H / 2;

// ─── Component D: LAF (1200×1800mm → 24×36) ──────────────────
const LAF_W = 24, LAF_L = 36, LAF_H = 1.6;
const LAF_X = 0, LAF_Z = 15;
const LAF_Y = ROOM_H - LAF_H / 2; // flush in ceiling underside

// ─── Component E: Control Panel (900×600×250mm → 18×12×5) ─────
const CP_W = 18, CP_H = 12, CP_D = 5;
const CP_X = -ROOM / 2 + CP_D / 2; // on left wall
const CP_Y = 30; // eye level
const CP_Z = 0;

// ─── Component G: Return Air Grille (600×400mm → 12×8) ────────
const RAG_W = 12, RAG_H = 8, RAG_D = 2;
const RAG_X = -ROOM / 2 + RAG_D / 2;
const RAG_Y = 4.5; // 15cm from floor = 3 units + half height

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
function matWallGhost() {
  return new THREE.MeshStandardMaterial({
    color: 0xe8e8e0, roughness: 0.80, metalness: 0.0,
    transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false,
  });
}
function matFloorVinyl() {
  return new THREE.MeshStandardMaterial({
    color: 0xf0f0ea, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.3,
  });
}
function matCeilingGhost() {
  return new THREE.MeshStandardMaterial({
    color: 0xe0e0d8, roughness: 0.70, metalness: 0.0,
    transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
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

// ─── Build functions per component ─────────────────────────────

/** A. AHU Double Skin */
function buildAHU(scene: THREE.Scene) {
  const g = new THREE.Group();
  const body = matAHUBody();
  const slat = matSlat();

  // Main body
  addBox(g, AHU_W, AHU_H, AHU_L, 0, 0, 0, body);

  // Front inlet grille slats (on +Z face)
  for (let i = 0; i < 10; i++) {
    const sy = -AHU_H / 2 + 1.5 + i * (AHU_H - 3) / 9;
    addBox(g, AHU_W * 0.92, 0.3, 0.3, 0, sy, AHU_L / 2 + 0.15, slat);
  }

  // Top duct collar
  const collar = matGalvanised();
  addCyl(g, 5, 5, 3, 24, 0, AHU_H / 2 + 1.5, 0, collar);

  // Side inspection panel outline (small inset rect on +X face)
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xa0a8b4, roughness: 0.50, metalness: 0.30,
  });
  addBox(g, 0.15, 8, 12, AHU_W / 2 + 0.08, 0, -10, panelMat);

  // Small control box on top
  addBox(g, 4, 3, 4, AHU_W / 2 - 3, AHU_H / 2 + 1.5, AHU_L / 2 - 6, body);

  g.position.set(AHU_X, AHU_Y, AHU_Z);
  scene.add(g);
  return g;
}

/** B. Outdoor Unit */
function buildOutdoorUnit(scene: THREE.Scene) {
  const g = new THREE.Group();
  const housing = matOutdoorUnit();
  const blade = matFanBlade();

  // Main housing
  addBox(g, ODU_W, ODU_H, ODU_D, 0, 0, 0, housing);

  // Fan grille circle on front (+Z face)
  const grille = new THREE.Mesh(
    new THREE.TorusGeometry(8, 0.3, 8, 32),
    matGalvanised(),
  );
  grille.position.set(0, 2, ODU_D / 2 + 0.2);
  g.add(grille);

  // Cross wires on grille (2 perpendicular lines)
  addBox(g, 15, 0.2, 0.2, 0, 2, ODU_D / 2 + 0.2, matGalvanised());
  addBox(g, 0.2, 15, 0.2, 0, 2, ODU_D / 2 + 0.2, matGalvanised());

  // 3 fan blades (static)
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const bw = 1.2, bh = 6;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.2), blade);
    mesh.position.set(Math.cos(angle) * 3, 2 + Math.sin(angle) * 3, ODU_D / 2 + 0.3);
    mesh.rotation.z = angle + Math.PI / 6;
    g.add(mesh);
  }

  // Fin coil louvered side panels (+X and -X)
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 20; i++) {
      const sy = -ODU_H / 2 + 1.5 + i * (ODU_H - 3) / 19;
      addBox(g, 0.15, 0.8, ODU_D * 0.85, sx * (ODU_W / 2 + 0.08), sy, 0, matSlat());
    }
  }

  // Base frame
  const frame = matGalvanised();
  addBox(g, ODU_W + 2, 1, 1, 0, -ODU_H / 2 - 0.5, ODU_D / 2 - 0.5, frame);
  addBox(g, ODU_W + 2, 1, 1, 0, -ODU_H / 2 - 0.5, -ODU_D / 2 + 0.5, frame);
  addBox(g, 1, 1, ODU_D, ODU_W / 2 + 0.5, -ODU_H / 2 - 0.5, 0, frame);
  addBox(g, 1, 1, ODU_D, -ODU_W / 2 - 0.5, -ODU_H / 2 - 0.5, 0, frame);

  // 2 pipe stubs on side toward AHU (-X face)
  const copper = matCopperPipe();
  addCyl(g, 0.5, 0.5, 3, 12, -ODU_W / 2 - 1.5, -4, 0, copper, 0, Math.PI / 2);
  addCyl(g, 0.35, 0.35, 3, 12, -ODU_W / 2 - 1.5, -6, 0, copper, 0, Math.PI / 2);

  g.position.set(ODU_X, ODU_Y, ODU_Z);
  scene.add(g);
  return g;
}

/** C. PIU Ducting — from AHU top collar through ceiling to LAF */
function buildDucting(scene: THREE.Scene) {
  const g = new THREE.Group();
  const duct = matDuctPIU();
  const DW = 12, DH = 8; // cross-section

  // Segment 1: vertical from AHU collar up
  const seg1H = 5;
  addBox(g, DW, seg1H, DH, AHU_X, ROOF_Y + AHU_H + 1.5 + seg1H / 2, AHU_Z, duct);

  // Segment 2: horizontal at rooftop level toward LAF position
  const horzY = ROOF_Y + AHU_H + 1.5 + seg1H;
  const horzStartZ = AHU_Z;
  const horzEndZ = LAF_Z;
  const horzLen = Math.abs(horzEndZ - horzStartZ);
  addBox(g, DW, DH, horzLen, AHU_X, horzY, (horzStartZ + horzEndZ) / 2, duct);

  // Elbow (chamfered corner) — vertical at LAF X,Z going down through ceiling
  const vertTopY = horzY;
  const vertBotY = LAF_Y + LAF_H / 2 + 2; // above LAF plenum
  const vertH = vertTopY - vertBotY;
  addBox(g, DW, vertH, DH, AHU_X, (vertTopY + vertBotY) / 2, LAF_Z, duct);

  // Horizontal segment from AHU_X to LAF_X at ceiling level
  if (Math.abs(AHU_X - LAF_X) > 1) {
    const connLen = Math.abs(AHU_X - LAF_X);
    addBox(g, connLen, DH, DW,
      (AHU_X + LAF_X) / 2, vertBotY, LAF_Z, duct);
  }

  // Plenum box above LAF
  addBox(g, LAF_W + 2, 5, LAF_L + 2, LAF_X, LAF_Y + LAF_H / 2 + 2.5 + 1, LAF_Z, duct);

  // Seam lines on horizontal duct
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x8a929e, roughness: 0.5, metalness: 0.3,
  });
  for (let z = horzStartZ + 12; z < horzEndZ; z += 24) {
    addBox(g, DW + 0.5, DH + 0.5, 0.15, AHU_X, horzY, z, seamMat);
  }

  scene.add(g);
  return g;
}

/** D. LAF Ceiling — simplified representation */
function buildLAF(scene: THREE.Scene) {
  const g = new THREE.Group();
  const frame = matSSFrame();
  const faceM = matPerforatedFace();
  const FW = 1.5; // frame bar width

  // Frame perimeter (4 bars)
  addBox(g, LAF_W, FW, FW, 0, 0, -LAF_L / 2 + FW / 2, frame);
  addBox(g, LAF_W, FW, FW, 0, 0, LAF_L / 2 - FW / 2, frame);
  addBox(g, FW, FW, LAF_L - 2 * FW, -LAF_W / 2 + FW / 2, 0, 0, frame);
  addBox(g, FW, FW, LAF_L - 2 * FW, LAF_W / 2 - FW / 2, 0, 0, frame);

  // Perforated face (thin panel)
  const face = addBox(g, LAF_W - 2 * FW, 0.3, LAF_L - 2 * FW, 0, -FW / 2, 0, faceM);

  // Simple perforation alpha map (tileable)
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

  // HEPA hint (visible above frame)
  addBox(g, LAF_W - 2, 3, LAF_L - 2, 0, FW / 2 + 1.5, 0, matHEPAMedia());

  g.position.set(LAF_X, LAF_Y, LAF_Z);
  scene.add(g);
  return g;
}

/** E. Control Panel AHU */
function buildControlPanel(scene: THREE.Scene) {
  const g = new THREE.Group();
  const panel = matControlPanel();

  // Main box
  addBox(g, CP_D, CP_H, CP_W, 0, 0, 0, panel);

  // Front door outline (slightly lighter, on +X face since wall is -X)
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x8a9aac, roughness: 0.48, metalness: 0.28,
  });
  addBox(g, 0.15, CP_H - 1.5, CP_W - 1.5, CP_D / 2 + 0.08, 0, 0, doorMat);

  // Handle
  addBox(g, 0.4, 2, 0.4, CP_D / 2 + 0.3, 0, CP_W / 2 - 2, matGalvanised());

  // HMI screen (7" → about 7×5 scene units)
  const screenGeo = new THREE.PlaneGeometry(5, 7);
  const screenTex = createHvacHMITexture();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(CP_D / 2 + 0.1, -1.5, 0);
  screen.rotation.y = 0; // facing +X
  g.add(screen);

  // MCB switches row (8 tiny boxes above screen)
  for (let i = 0; i < 8; i++) {
    const sz = -CP_W / 2 + 2 + i * (CP_W - 4) / 7;
    addBox(g, 0.4, 1, 0.8, CP_D / 2 + 0.3, CP_H / 2 - 2, sz,
      new THREE.MeshStandardMaterial({ color: 0x303030, roughness: 0.6, metalness: 0.2 }));
  }

  // RST indicator lamps (R=red, S=yellow, T=blue)
  const lampR = 0.5;
  addCyl(g, lampR, lampR, 0.4, 12, CP_D / 2 + 0.3, CP_H / 2 - 4.5, -3, matRSTLamp(0xff2222));
  addCyl(g, lampR, lampR, 0.4, 12, CP_D / 2 + 0.3, CP_H / 2 - 4.5, 0, matRSTLamp(0xffcc00));
  addCyl(g, lampR, lampR, 0.4, 12, CP_D / 2 + 0.3, CP_H / 2 - 4.5, 3, matRSTLamp(0x2255ff));

  g.position.set(CP_X, CP_Y, CP_Z);
  scene.add(g);
  return g;
}

/** F. Refrigerant Piping — 2 parallel pipes from Outdoor Unit to AHU */
function buildRefrigerantPiping(scene: THREE.Scene) {
  const g = new THREE.Group();
  const insul = matInsulationBlack();
  const copper = matCopperPipe();
  const bracket = matGalvanised();

  // Pipe route: from ODU side (-X) to AHU side (+X) at rooftop level
  const pipeY = ROOF_Y + 6; // slightly above rooftop
  const pipeZ = ODU_Z;
  const startX = ODU_X - ODU_W / 2 - 3;
  const endX = AHU_X + AHU_W / 2 + 1;
  const pipeLen = Math.abs(startX - endX);
  const pipeCX = (startX + endX) / 2;

  // Suction line (larger, r≈1 with insulation)
  addCyl(g, 1.0, 1.0, pipeLen, 12, pipeCX, pipeY, pipeZ - 1.5, insul, 0, Math.PI / 2);
  // Copper inner visible at ends
  addCyl(g, 0.5, 0.5, 1.5, 12, startX + 0.75, pipeY, pipeZ - 1.5, copper, 0, Math.PI / 2);
  addCyl(g, 0.5, 0.5, 1.5, 12, endX - 0.75, pipeY, pipeZ - 1.5, copper, 0, Math.PI / 2);

  // Liquid line (smaller, r≈0.7)
  addCyl(g, 0.7, 0.7, pipeLen, 12, pipeCX, pipeY, pipeZ + 1.5, insul, 0, Math.PI / 2);
  // Copper ends
  addCyl(g, 0.35, 0.35, 1.5, 12, startX + 0.75, pipeY, pipeZ + 1.5, copper, 0, Math.PI / 2);
  addCyl(g, 0.35, 0.35, 1.5, 12, endX - 0.75, pipeY, pipeZ + 1.5, copper, 0, Math.PI / 2);

  // Support brackets (3 along pipe run)
  for (let i = 1; i <= 3; i++) {
    const bx = startX + i * pipeLen / 4;
    // L-bracket: vertical + horizontal
    addBox(g, 0.4, 3, 0.4, bx, pipeY - 2.5, pipeZ, bracket);
    addBox(g, 0.4, 0.4, 5, bx, pipeY - 1, pipeZ, bracket);
  }

  scene.add(g);
  return g;
}

/** G. Return Air Grilles ×2 on left wall */
function buildReturnAirGrilles(scene: THREE.Scene) {
  const g = new THREE.Group();
  const galv = matGalvanised();
  const face = matPerforatedFace();

  for (const zOff of [25, -25]) {
    const gg = new THREE.Group();

    // Frame
    addBox(gg, RAG_D, RAG_H, RAG_W, 0, 0, 0, galv);

    // Perforated face (on +X face, facing into room)
    const faceMesh = addBox(gg, 0.2, RAG_H - 1.5, RAG_W - 1.5, RAG_D / 2 + 0.1, 0, 0, face);

    // Simple grid lines for perforation look
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0x8a929e, roughness: 0.5, metalness: 0.3,
    });
    for (let i = 0; i < 5; i++) {
      const ly = -RAG_H / 2 + 1.5 + i * (RAG_H - 3) / 4;
      addBox(gg, 0.1, 0.15, RAG_W - 2, RAG_D / 2 + 0.2, ly, 0, lineMat);
    }

    gg.position.set(RAG_X, RAG_Y, zOff);
    g.add(gg);
  }

  scene.add(g);
  return g;
}

/** Room context: floor, ghost walls, ceiling with LAF opening */
function buildRoom(scene: THREE.Scene) {
  const g = new THREE.Group();
  const wallMat = matWallGhost();
  const floorMat = matFloorVinyl();
  const ceilMat = matCeilingGhost();

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM, ROOM),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // Back wall (Z = -ROOM/2)
  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM, ROOM_H),
    wallMat,
  );
  backWall.position.set(0, ROOM_H / 2, -ROOM / 2);
  g.add(backWall);

  // Left wall (X = -ROOM/2)
  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM, ROOM_H),
    wallMat,
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-ROOM / 2, ROOM_H / 2, 0);
  g.add(leftWall);

  // Right wall partial (X = +ROOM/2), shorter for cutaway feel
  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM * 0.4, ROOM_H),
    wallMat,
  );
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(ROOM / 2, ROOM_H / 2, -ROOM * 0.3);
  g.add(rightWall);

  // Ceiling slab with LAF opening (using Shape with hole)
  const ceilShape = new THREE.Shape();
  ceilShape.moveTo(-ROOM / 2, -ROOM / 2);
  ceilShape.lineTo(ROOM / 2, -ROOM / 2);
  ceilShape.lineTo(ROOM / 2, ROOM / 2);
  ceilShape.lineTo(-ROOM / 2, ROOM / 2);
  ceilShape.closePath();

  // Hole for LAF
  const holeW = LAF_W + 2, holeL = LAF_L + 2;
  const hole = new THREE.Path();
  hole.moveTo(LAF_X - holeW / 2, LAF_Z - holeL / 2);
  hole.lineTo(LAF_X + holeW / 2, LAF_Z - holeL / 2);
  hole.lineTo(LAF_X + holeW / 2, LAF_Z + holeL / 2);
  hole.lineTo(LAF_X - holeW / 2, LAF_Z + holeL / 2);
  hole.closePath();
  ceilShape.holes.push(hole);

  const ceilGeo = new THREE.ShapeGeometry(ceilShape);
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = -Math.PI / 2;
  ceiling.position.y = ROOM_H;
  g.add(ceiling);

  // Rooftop slab (solid, slightly visible)
  const roofSlab = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM, SLAB, ROOM),
    new THREE.MeshStandardMaterial({
      color: 0xd0d0c8, roughness: 0.80, metalness: 0.0,
      transparent: true, opacity: 0.15, depthWrite: false,
    }),
  );
  roofSlab.position.set(0, ROOM_H + SLAB / 2, 0);
  g.add(roofSlab);

  scene.add(g);
}

// ─── Build scene ───────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  renderer.toneMappingExposure = 1.1;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  // Build all elements
  buildRoom(scene);
  buildAHU(scene);
  buildOutdoorUnit(scene);
  buildDucting(scene);
  buildLAF(scene);
  buildControlPanel(scene);
  buildRefrigerantPiping(scene);
  buildReturnAirGrilles(scene);

  // ── Annotations ──
  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(AHU_X, AHU_Y, AHU_Z + AHU_L / 2),
        label: 'A — AHU Double Skin 3000 cfm' },
      { anchor: new THREE.Vector3(ODU_X + ODU_W / 2, ODU_Y, ODU_Z),
        label: 'B — Outdoor Unit DAIKIN 12 HP' },
      { anchor: new THREE.Vector3(AHU_X, ROOF_Y + AHU_H + 5, (AHU_Z + LAF_Z) / 2),
        label: 'C — Ducting PIU Insulated 20mm' },
      { anchor: new THREE.Vector3(LAF_X + LAF_W / 2, LAF_Y, LAF_Z),
        label: 'D — LAF Ceiling HEPA H14' },
      { anchor: new THREE.Vector3(CP_X + CP_D, CP_Y, CP_Z),
        label: 'E — Control Panel AHU (PLC+HMI)' },
      { anchor: new THREE.Vector3((AHU_X + ODU_X) / 2, ROOF_Y + 6, ODU_Z),
        label: 'F — Pipa Refrigerant R410A' },
      { anchor: new THREE.Vector3(RAG_X + RAG_D, RAG_Y, 25),
        label: 'G — Return Air Grille Galv.' },
    ],
    ROOM / 2 + 20,
    [-5, ROOF_Y + AHU_H + 15],
  );
}

// ─── React component ───────────────────────────────────────────

export function HvacSystemAssembled3D({ product }: Props) {
  const firstPreset = product.cameraPresets[0];
  const [activePreset, setActivePreset] = useState<string>(
    firstPreset?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 40,
      maxDistance: 800,
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
