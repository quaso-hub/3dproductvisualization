/**
 * ScrubSinkAssembled3D.tsx — V2 ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * Surgical Scrub Sink 2 Bay — ELFATECH Catalog V2 (Revised)
 *
 * V2 improvements over V1:
 *  - Deep sloping basins with coved corners (Shape + ExtrudeGeometry)
 *  - CatmullRom gooseneck faucets with IR sensor + aerator
 *  - 4 hinged cabinet doors (2 per bay) instead of 2 sliding
 *  - Plexiglass divider between bays
 *  - Structured canopy frame with supports, LED strip, UV lamps
 *  - P-trap plumbing under each basin
 *  - Improved foot pedals with housing
 *  - Soap dispensers with nozzle + transparent window
 *
 * Zone breakdown (V2, 1 unit = 10mm):
 *  Cabinet base : Y = 0→65   (650 mm, feet + body + 4 hinged doors)
 *  Countertop   : Y = 65→90  (250 mm, 25mm slab + 200mm basins)
 *  Backsplash   : Y = 90→120 (300 mm, faucets, soap, controls)
 *  Canopy/Mirror: Y = 120→155 (350 mm, mirrors, LED, UV, frame)
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

// ─── Scene constants (1 scene unit = 10 mm) ───────────────────────────────────
const W = 160;              // 1600 mm total width
const D = 60;               // 600 mm depth
const HALF_W = W / 2;       // 80
const HALF_D = D / 2;       // 30

// Zone Y boundaries
const Y_CAB_TOP = 65;       // cabinet top (650 mm from floor)
const Y_CT_SURFACE = 90;    // countertop surface (900 mm) — working height
const CT_SLAB = 2.5;        // countertop slab thickness (25 mm)
const Y_CT_BOTTOM = Y_CT_SURFACE - CT_SLAB; // 87.5
const BASIN_DEPTH = 20;     // basin depth 200 mm
const Y_BASIN_BOTTOM = Y_CT_SURFACE - BASIN_DEPTH; // 70
const Y_BS_TOP = 120;       // backsplash top (1200 mm)
const Y_CANOPY_TOP = 155;   // total height (1550 mm)

// Basin dimensions (per bay)
const BASIN_W = 65;         // 650 mm basin opening width
const BASIN_D = 45;         // 450 mm basin opening depth
const BAY_CX_L = -40;       // left bay center X
const BAY_CX_R = 40;        // right bay center X
const BASIN_CZ = -5;        // basin center Z (slightly back)

// Cabinet door layout
const DOOR_W = 38;          // 380 mm per door
const DOOR_H = 58;          // 580 mm per door
const DOOR_GAP = 0.5;       // 5 mm gap

// ─── Material factories ───────────────────────────────────────────────────────

function matSSBrushed() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4dc, roughness: 0.22, metalness: 0.94, envMapIntensity: 1.0,
  });
}

function matSSPolished() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dce8, roughness: 0.12, metalness: 0.96, envMapIntensity: 1.2,
  });
}

function matBasinInterior() {
  return new THREE.MeshStandardMaterial({
    color: 0x9098a8, roughness: 0.18, metalness: 0.95, envMapIntensity: 0.9,
  });
}

function matChrome() {
  return new THREE.MeshStandardMaterial({
    color: 0xe8f2f8, roughness: 0.08, metalness: 0.97, envMapIntensity: 1.8,
  });
}

function matMirror() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8dce8, roughness: 0.02, metalness: 0.10,
    transparent: true, opacity: 0.72, side: THREE.DoubleSide, envMapIntensity: 1.5,
  });
}

function matLED() {
  return new THREE.MeshStandardMaterial({
    color: 0xfff8e0, roughness: 0.20, metalness: 0.0,
    emissive: new THREE.Color(0xfff0c0), emissiveIntensity: 2.0,
  });
}

function matUV() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0c0ff, roughness: 0.30, metalness: 0.0,
    emissive: new THREE.Color(0xc0a0ff), emissiveIntensity: 1.0,
  });
}

function matPlexiglass() {
  return new THREE.MeshStandardMaterial({
    color: 0xe8f0f8, roughness: 0.03, metalness: 0.0,
    transparent: true, opacity: 0.18, side: THREE.DoubleSide,
  });
}

function matSensor() {
  return new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, roughness: 0.65, metalness: 0.0,
  });
}

function matSensorLED() {
  return new THREE.MeshStandardMaterial({
    color: 0x4488ff, emissive: new THREE.Color(0x2266ff),
    emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.0,
  });
}

function matRubber() {
  return new THREE.MeshStandardMaterial({
    color: 0x303030, roughness: 0.85, metalness: 0.0,
  });
}

function matSoapBody() {
  return new THREE.MeshStandardMaterial({
    color: 0xe0e4e8, roughness: 0.60, metalness: 0.10,
  });
}

function matSoapWindow() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0e8f0, roughness: 0.10, metalness: 0.0,
    transparent: true, opacity: 0.45,
  });
}

function matAluminium() {
  return new THREE.MeshStandardMaterial({
    color: 0xb0bcc8, roughness: 0.35, metalness: 0.80,
  });
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function addBox(
  parent: THREE.Object3D,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  mat: THREE.Material,
  shadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  parent.add(mesh);
  return mesh;
}

function addCyl(
  parent: THREE.Object3D,
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
  parent.add(mesh);
  return mesh;
}

// Rounded rectangle Shape for basin opening (coved corners)
function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

// ─── Scene builder ────────────────────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {

  // ── 0. PBR Environment ──────────────────────────────────────────────────
  renderer.toneMappingExposure = 0.85;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(120, 200, 100);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd0e8ff, 0.8);
  fill.position.set(-100, 120, -80);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff8e8, 0.5);
  rim.position.set(-60, 80, -120);
  scene.add(rim);

  // ── 1. CABINET BASE (Y = 0 → 65) ──────────────────────────────────────
  const cabBrushed = matSSBrushed();
  const cabPolished = matSSPolished();

  // Main cabinet body
  addBox(scene, W, Y_CAB_TOP, D, 0, Y_CAB_TOP / 2, 0, cabBrushed);

  // Front face (slightly more polished)
  addBox(scene, W, Y_CAB_TOP, 0.8, 0, Y_CAB_TOP / 2, HALF_D + 0.4, cabPolished);

  // ── 1a. Adjustable feet — 4 corners ───────────────────────────────────
  const ftMat = matSSPolished();
  const rubberMat = matRubber();
  ([[-70, -24], [-70, 24], [70, -24], [70, 24]] as [number, number][]).forEach(([fx, fz]) => {
    // Steel cylinder
    addCyl(scene, 2.5, 2.5, 6, 14, fx, 3, fz, ftMat);
    // Rubber pad at bottom
    addCyl(scene, 2.8, 2.8, 1.5, 14, fx, 0.75, fz, rubberMat);
  });

  // ── 1b. Cabinet doors — 4 hinged panels (2 per bay) ──────────────────
  const doorMat = matSSBrushed();
  const handleMat = matChrome();
  const doorY = Y_CAB_TOP / 2;      // vertical center of cabinet
  const doorFrontZ = HALF_D + 1.2;   // slightly proud of face

  // 4 doors: left-bay (2) + right-bay (2)
  const doorPositions = [
    -(HALF_W / 2 + DOOR_GAP / 2 + DOOR_W / 2), // bay-left, door-left
    -(HALF_W / 2 - DOOR_GAP / 2 - DOOR_W / 2), // bay-left, door-right
    (HALF_W / 2 - DOOR_GAP / 2 - DOOR_W / 2),  // bay-right, door-left
    (HALF_W / 2 + DOOR_GAP / 2 + DOOR_W / 2),  // bay-right, door-right
  ];
  doorPositions.forEach((dx) => {
    // Door panel
    addBox(scene, DOOR_W, DOOR_H, 0.8, dx, doorY, doorFrontZ, doorMat);
    // D-pull handle (horizontal bar, center of door)
    addBox(scene, 8, 1, 2, dx, doorY, doorFrontZ + 1.5, handleMat);
  });

  // Vertical divider strips between doors (3 dividers)
  const divMat = new THREE.MeshStandardMaterial({
    color: 0x8898a8, roughness: 0.25, metalness: 0.78,
  });
  [0, -HALF_W / 2, HALF_W / 2].forEach((divX) => {
    addBox(scene, 1, Y_CAB_TOP - 4, 0.8, divX, doorY, doorFrontZ, divMat);
  });

  // ── 1c. Foot pedals — 2×, one per bay ─────────────────────────────────
  const pedalMat = matSSPolished();
  ([BAY_CX_L, BAY_CX_R]).forEach((px) => {
    // Oval paddle (approximated with box, slightly wider)
    addBox(scene, 12, 2, 18, px, 1, HALF_D + 5, pedalMat);
    // Pedal housing bracket
    addBox(scene, 14, 3, 4, px, 2.5, HALF_D + 1, cabBrushed);
    // Connecting rod
    addCyl(scene, 0.6, 0.6, 8, 8, px, 2, HALF_D + 3, pedalMat, Math.PI / 2, 0);
  });

  // ── 2. COUNTERTOP ZONE (Y = 65 → 90) ─────────────────────────────────

  // ── 2a. Countertop slab dengan basin cutout — FIX 1.2 ─────────────────
  const ctMat = matSSPolished();

  // FIX 1.2: Countertop dengan basin cutout menggunakan Shape + Path
  const ctShape = new THREE.Shape();
  ctShape.moveTo(-W / 2, -D / 2);
  ctShape.lineTo(W / 2, -D / 2);
  ctShape.lineTo(W / 2, D / 2);
  ctShape.lineTo(-W / 2, D / 2);
  ctShape.closePath();

  // Basin cutout helper function
  function addBasinCutout(shape: THREE.Shape, centerX: number, centerZ: number) {
    const cutoutShape = roundedRectShape(BASIN_W + 0.5, BASIN_D + 0.5, 3);
    const cutoutPath = new THREE.Path();
    const pts = cutoutShape.getPoints(32);
    cutoutPath.setFromPoints(pts.map(p => new THREE.Vector2(p.x + centerX, p.y + centerZ)));
    shape.holes.push(cutoutPath);
  }

  // Add basin cutouts (left and right)
  addBasinCutout(ctShape, BAY_CX_L, BASIN_CZ);
  addBasinCutout(ctShape, BAY_CX_R, BASIN_CZ);

  // Extrude countertop dengan cutout
  const countertopGeo = new THREE.ExtrudeGeometry(ctShape, {
    depth: CT_SLAB,
    bevelEnabled: false,
  });
  const countertop = new THREE.Mesh(countertopGeo, ctMat);
  countertop.position.set(0, Y_CT_BOTTOM, 0);
  countertop.castShadow = true;
  countertop.receiveShadow = true;
  scene.add(countertop);

  // Countertop edge outline
  const countertopEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(countertopGeo),
    new THREE.LineBasicMaterial({ color: 0x8898a8, opacity: 0.3, transparent: true }),
  );
  countertopEdges.position.set(0, Y_CT_BOTTOM, 0);
  scene.add(countertopEdges);

  // Front apron lip (20mm overhang) - setelah countertop utama
  addBox(scene, W + 2, 3, 2, 0, Y_CT_SURFACE - 1.5, HALF_D + 1, ctMat);
  // Bevel chamfer on front edge
  addBox(scene, W + 2, 1.5, 1.5, 0, Y_CT_SURFACE - 3.5, HALF_D + 1.5, cabBrushed);

  // ── 2b. Basin inserts — terintegrasi dengan countertop — FIX 1.2 ─────
  const basinMat = matBasinInterior();

  ([BAY_CX_L, BAY_CX_R]).forEach((bx) => {
    // Basin walls extend DOWNWARD dari countertop bottom
    const basinWallShape = roundedRectShape(BASIN_W, BASIN_D, 2.5);
    const basinWallGeo = new THREE.ExtrudeGeometry(basinWallShape, {
      depth: BASIN_DEPTH,
      bevelEnabled: false,
    });
    basinWallGeo.rotateX(Math.PI / 2);

    // Position: countertop bottom (Y_CT_BOTTOM) extend downward
    const basinWallMesh = new THREE.Mesh(basinWallGeo, basinMat);
    basinWallMesh.position.set(bx, Y_CT_BOTTOM, BASIN_CZ);
    basinWallMesh.castShadow = true;
    basinWallMesh.receiveShadow = true;
    scene.add(basinWallMesh);

    // Basin wall edge outline
    const basinWallEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(basinWallGeo),
      new THREE.LineBasicMaterial({ color: 0x607080, opacity: 0.25, transparent: true }),
    );
    basinWallEdges.position.set(bx, Y_CT_BOTTOM, BASIN_CZ);
    scene.add(basinWallEdges);

    // Basin floor (sloping toward drain - lebih steep untuk visibility)
    const floorSlope = 0.08; // 5° slope (increased from 0.02)
    const floorGeo = new THREE.PlaneGeometry(BASIN_W - 2, BASIN_D - 2);
    const floorMesh = new THREE.Mesh(floorGeo, basinMat);
    floorMesh.rotation.x = -Math.PI / 2 + floorSlope;
    floorMesh.position.set(bx, Y_BASIN_BOTTOM + 1, BASIN_CZ - 3); // offset toward drain
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Weld seam di basin-countertop junction (visible integration)
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0x98a8b8, roughness: 0.3, metalness: 0.7,
    });
    const seamThickness = 0.3;
    const seamWidth = BASIN_W + 0.2;
    const seamDepth = BASIN_D + 0.2;
    
    // Front seam
    const seamFront = new THREE.Mesh(box(seamWidth, seamThickness, 0.5), seamMat);
    seamFront.position.set(bx, Y_CT_BOTTOM - 0.5, BASIN_CZ + BASIN_D / 2);
    scene.add(seamFront);
    
    // Back seam
    const seamBack = new THREE.Mesh(box(seamWidth, seamThickness, 0.5), seamMat);
    seamBack.position.set(bx, Y_CT_BOTTOM - 0.5, BASIN_CZ - BASIN_D / 2);
    scene.add(seamBack);
    
    // Left seam
    const seamLeft = new THREE.Mesh(box(0.5, seamThickness, seamDepth), seamMat);
    seamLeft.position.set(bx - BASIN_W / 2, Y_CT_BOTTOM - 0.5, BASIN_CZ);
    scene.add(seamLeft);
    
    // Right seam
    const seamRight = new THREE.Mesh(box(0.5, seamThickness, seamDepth), seamMat);
    seamRight.position.set(bx + BASIN_W / 2, Y_CT_BOTTOM - 0.5, BASIN_CZ);
    scene.add(seamRight);

    // Drain hole (⌀50mm at center-back of basin)
    const drainMat = new THREE.MeshStandardMaterial({
      color: 0x4a5060, roughness: 0.20, metalness: 0.90,
    });
    // Drain ring
    addCyl(scene, 2.5, 2.5, 1.5, 16, bx, Y_BASIN_BOTTOM + 0.8, BASIN_CZ - 8, drainMat);
    // Drain grate (perforated disc)
    const grateMat = matSSPolished();
    addCyl(scene, 2.2, 2.2, 0.3, 16, bx, Y_BASIN_BOTTOM + 1.6, BASIN_CZ - 8, grateMat);
  });

  // ── 2c. Plexiglass divider between basins ─────────────────────────────
  const plexiMesh = addBox(scene, 0.8, 30, D * 0.5,
    0, Y_CT_SURFACE + 15, -5,
    matPlexiglass(), false,
  );
  // Stainless channel at base of plexiglass
  addBox(scene, 2, 1, D * 0.5, 0, Y_CT_SURFACE + 0.5, -5, matSSBrushed());

  // ── 2d. P-trap plumbing under each basin ──────────────────────────────
  const pipeMat = matSSPolished();
  ([BAY_CX_L, BAY_CX_R]).forEach((px) => {
    const drainZ = BASIN_CZ - 8;
    // Vertical drop from drain
    addCyl(scene, 1.2, 1.2, 6, 12, px, Y_BASIN_BOTTOM - 3, drainZ, pipeMat);

    // P-trap curve (CatmullRomCurve3 + TubeGeometry)
    const ptrapPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px, Y_BASIN_BOTTOM - 6, drainZ),
      new THREE.Vector3(px, Y_BASIN_BOTTOM - 10, drainZ - 2),
      new THREE.Vector3(px, Y_BASIN_BOTTOM - 14, drainZ - 4),
      new THREE.Vector3(px, Y_BASIN_BOTTOM - 10, drainZ - 7),
      new THREE.Vector3(px, Y_BASIN_BOTTOM - 6, drainZ - 9),
      new THREE.Vector3(px, Y_BASIN_BOTTOM - 6, drainZ - 16),
    ], false, 'catmullrom', 0.5);
    const ptrapGeo = new THREE.TubeGeometry(ptrapPath, 32, 1.2, 10, false);
    const ptrapMesh = new THREE.Mesh(ptrapGeo, pipeMat);
    ptrapMesh.castShadow = true;
    scene.add(ptrapMesh);
  });

  // ── 3. BACKSPLASH (Y = 90 → 120) ────────────────────────────────────
  // Main backsplash panel (full width, at back wall)
  const bsZ = -HALF_D + 1; // flush with back
  addBox(scene, W, Y_BS_TOP - Y_CT_SURFACE, 1.5, 0, (Y_CT_SURFACE + Y_BS_TOP) / 2, bsZ, matSSBrushed());

  // ── 3a. Gooseneck faucets — 2× with CatmullRom S-curve ──────────────
  const chromeMat = matChrome();
  const sensorMat = matSensor();
  const sensorLedMat = matSensorLED();

  ([BAY_CX_L, BAY_CX_R]).forEach((fX) => {
    const fBaseY = Y_CT_SURFACE + 2; // faucet base sits just above countertop
    const fBaseZ = bsZ + 3;          // mounted on backsplash

    // Mounting flange
    addCyl(scene, 3, 3, 0.8, 16, fX, fBaseY - 0.4, fBaseZ, chromeMat);

    // Base body (cylindrical, ⌀40mm × 80mm)
    addCyl(scene, 2, 2, 8, 16, fX, fBaseY + 4, fBaseZ, chromeMat);

    // Gooseneck curve (CatmullRomCurve3 → TubeGeometry)
    const neckPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(fX, fBaseY + 8, fBaseZ),          // top of base body
      new THREE.Vector3(fX, fBaseY + 18, fBaseZ + 2),     // rise 180mm
      new THREE.Vector3(fX, fBaseY + 26, fBaseZ + 10),    // arc forward 100mm
      new THREE.Vector3(fX, fBaseY + 24, fBaseZ + 18),    // curve forward-down
      new THREE.Vector3(fX, fBaseY + 20, fBaseZ + 22),    // tip over basin
    ], false, 'catmullrom', 0.5);
    const neckGeo = new THREE.TubeGeometry(neckPath, 48, 0.8, 12, false);
    const neckMesh = new THREE.Mesh(neckGeo, chromeMat);
    neckMesh.castShadow = true;
    scene.add(neckMesh);

    // Aerator / spray head at tip
    addCyl(scene, 1.5, 1.2, 3.5, 14,
      fX, fBaseY + 18.5, fBaseZ + 22.5, chromeMat);

    // Spray rose holes (small dots on aerator face)
    const roseMat = new THREE.MeshStandardMaterial({
      color: 0x606870, roughness: 0.40, metalness: 0.5,
    });
    addCyl(scene, 1.0, 1.0, 0.3, 12, fX, fBaseY + 16.8, fBaseZ + 22.5, roseMat);

    // IR sensor on base body (front-facing)
    addCyl(scene, 0.9, 0.9, 1.2, 10, fX, fBaseY + 3, fBaseZ + 2.2, sensorMat, Math.PI / 2, 0);
    // Sensor LED indicator
    const ledDot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), sensorLedMat);
    ledDot.position.set(fX, fBaseY + 5, fBaseZ + 2.3);
    scene.add(ledDot);

    // Water inlet ports (2× small cylinders at base bottom)
    addCyl(scene, 0.5, 0.5, 2, 8, fX - 1, fBaseY - 1, fBaseZ, pipeMat, Math.PI / 2, 0);
    addCyl(scene, 0.5, 0.5, 2, 8, fX + 1, fBaseY - 1, fBaseZ, pipeMat, Math.PI / 2, 0);
  });

  // ── 3b. Soap dispensers — 2× on backsplash between faucets ────────────
  const soapX = 0; // between the two faucets (center)
  // Actually let's put one per bay on the backsplash
  ([BAY_CX_L + 25, BAY_CX_R - 25]).forEach((sx) => {
    const soapY = Y_CT_SURFACE + 8;
    const soapZ = bsZ + 3;
    // Body
    addBox(scene, 8, 12, 6, sx, soapY, soapZ, matSoapBody());
    // Transparent window on front
    addBox(scene, 4, 8, 0.5, sx, soapY, soapZ + 3.3, matSoapWindow());
    // Nozzle at bottom
    addCyl(scene, 0.6, 0.4, 2, 8, sx, soapY - 7, soapZ + 1, matChrome());
    // IR sensor dot on top
    const sensorDot = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), sensorMat);
    sensorDot.position.set(sx, soapY + 6.5, soapZ + 1);
    scene.add(sensorDot);
  });

  // ── 3c. Small control panel on backsplash side ────────────────────────
  const cpMat = new THREE.MeshStandardMaterial({
    color: 0x303840, roughness: 0.50, metalness: 0.15,
  });
  addBox(scene, 10, 8, 1.5, HALF_W - 12, Y_CT_SURFACE + 15, bsZ + 2, cpMat);
  // Control LED indicator
  const cpLed = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshStandardMaterial({
      color: 0x44ff44, emissive: new THREE.Color(0x22cc22),
      emissiveIntensity: 0.8, roughness: 0.3,
    }),
  );
  cpLed.position.set(HALF_W - 12, Y_CT_SURFACE + 18, bsZ + 3.5);
  scene.add(cpLed);

  // ── 4. CANOPY / MIRROR ZONE (Y = 120 → 155) ──────────────────────────

  // ── 4a. Vertical supports — 2 posts from backsplash to canopy ─────────
  const supportMat = matSSBrushed();
  const SUPPORT_W = 4;
  const SUPPORT_D = 3;
  const supportH = Y_CANOPY_TOP - Y_BS_TOP - 4; // leave 4 units for canopy casing
  const supportCY = Y_BS_TOP + supportH / 2;
  ([-HALF_W + 3, HALF_W - 3]).forEach((sx) => {
    addBox(scene, SUPPORT_W, supportH, SUPPORT_D, sx, supportCY, bsZ + 2, supportMat);
  });

  // ── 4b. Canopy casing — top structure ─────────────────────────────────
  const canopyY = Y_CANOPY_TOP - 2; // center of 4-unit thick casing
  const canopyH = 4;
  const canopyD = 20;
  addBox(scene, W + 4, canopyH, canopyD, 0, canopyY, bsZ + canopyD / 2, supportMat);

  // Canopy side panels (closing the canopy box at left & right)
  const sidePanelH = Y_CANOPY_TOP - Y_BS_TOP;
  ([-(W / 2 + 2), (W / 2 + 2)]).forEach((spx) => {
    addBox(scene, 1, sidePanelH, canopyD,
      spx, Y_BS_TOP + sidePanelH / 2, bsZ + canopyD / 2, supportMat);
  });

  // ── 4c. LED strip housing under canopy ────────────────────────────────
  const ledY = Y_CANOPY_TOP - canopyH - 1.5;
  addBox(scene, W - 4, 3, canopyD - 4, 0, ledY, bsZ + canopyD / 2, matAluminium());
  // LED face (emissive, facing down)
  addBox(scene, W - 6, 0.5, canopyD - 6, 0, ledY - 1.8, bsZ + canopyD / 2, matLED(), false);

  // ── 4d. UV sterilization lamps (2× inside canopy) ─────────────────────
  ([BAY_CX_L, BAY_CX_R]).forEach((uvX) => {
    addCyl(scene, 1.25, 1.25, W / 2 - 6, 12,
      uvX, Y_CANOPY_TOP - canopyH - 5, bsZ + canopyD / 2,
      matUV(), 0, Math.PI / 2);
  });

  // ── 4e. Mirror panels — 2× with SS frames — FIX 1.3 ───────────────────
  const mirrorMat = matMirror();
  const frameMat = matSSPolished();
  const MIRROR_W = 55;
  const MIRROR_H = 40;
  const mirrorZ = bsZ + 4;
  
  // FIX 1.3: Mirror repositioned dengan proper clearance
  // canopyBottom = Y_CANOPY_TOP - canopyH = 155 - 4 = 151
  // backsplashTop = Y_BS_TOP = 120
  // Proper clearance: 50mm (5 units) dari canopy dan backsplash
  const canopyBottom = Y_CANOPY_TOP - canopyH;
  const mirrorClearanceTop = 5; // 50mm dari canopy bottom
  const mirrorClearanceBottom = 5; // 50mm dari backsplash top
  
  // Mirror center Y: backsplashTop + clearance + half mirror height
  const mirrorCY = backsplashTop + mirrorClearanceBottom + MIRROR_H / 2;
  // mirrorCY = 120 + 5 + 20 = 145

  ([BAY_CX_L, BAY_CX_R]).forEach((mx) => {
    // Mirror glass
    addBox(scene, MIRROR_W, MIRROR_H, 0.8, mx, mirrorCY, mirrorZ, mirrorMat, false);
    
    // SS frame (4 bars)
    const fT = 1.5;
    addBox(scene, MIRROR_W + fT * 2, fT, 1, mx, mirrorCY + MIRROR_H / 2 + fT / 2, mirrorZ, frameMat); // top
    addBox(scene, MIRROR_W + fT * 2, fT, 1, mx, mirrorCY - MIRROR_H / 2 - fT / 2, mirrorZ, frameMat); // bottom
    addBox(scene, fT, MIRROR_H, 1, mx - MIRROR_W / 2 - fT / 2, mirrorCY, mirrorZ, frameMat); // left
    addBox(scene, fT, MIRROR_H, 1, mx + MIRROR_W / 2 + fT / 2, mirrorCY, mirrorZ, frameMat); // right
    
    // FIX 1.3: Mirror mounting brackets (4 per mirror)
    const bracketMat = matSS(0.15, 0.88);
    const bracketPositions = [
      [-MIRROR_W / 2 + 5, MIRROR_H / 2 - 5],
      [MIRROR_W / 2 - 5, MIRROR_H / 2 - 5],
      [-MIRROR_W / 2 + 5, -MIRROR_H / 2 + 5],
      [MIRROR_W / 2 - 5, -MIRROR_H / 2 + 5],
    ];
    
    bracketPositions.forEach(([ox, oy]) => {
      // Bracket cylinder
      const bracket = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 2, 8),
        bracketMat
      );
      bracket.rotation.x = Math.PI / 2;
      bracket.position.set(mx + ox, mirrorCY + oy, mirrorZ + 1);
      scene.add(bracket);
      
      // Screw head
      const screw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.3, 6),
        bracketMat
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(mx + ox, mirrorCY + oy, mirrorZ + 2);
      scene.add(screw);
    });
  });

  // ── 5. ANNOTATIONS ────────────────────────────────────────────────────
  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(60, Y_CANOPY_TOP - 2, bsZ + 10),     label: 'Canopy SS 304 + LED Strip' },
      { anchor: new THREE.Vector3(BAY_CX_L, Y_CANOPY_TOP - 8, bsZ + 10), label: 'UV Sterilization Lamp' },
      { anchor: new THREE.Vector3(-10, mirrorCY, mirrorZ),               label: 'Mirror Panel + Frame SS (2×)' },
      { anchor: new THREE.Vector3(BAY_CX_L, Y_CT_SURFACE + 20, bsZ + 18), label: 'Gooseneck Faucet IR Sensor (2×)' },
      { anchor: new THREE.Vector3(-15, Y_CT_SURFACE + 8, bsZ + 3),      label: 'Soap Dispenser Otomatis' },
      { anchor: new THREE.Vector3(0, Y_CT_SURFACE + 15, -5),             label: 'Plexiglass Divider 8 mm' },
      { anchor: new THREE.Vector3(BAY_CX_R, Y_CT_SURFACE - 5, 5),       label: 'Basin SS 304 (650×450×200 mm)' },
      { anchor: new THREE.Vector3(50, Y_CT_BOTTOM + 1, 0),               label: 'Countertop SS 304 Polished' },
      { anchor: new THREE.Vector3(BAY_CX_L, Y_BASIN_BOTTOM - 8, BASIN_CZ - 10), label: 'P-Trap Drain SS 304' },
      { anchor: new THREE.Vector3(50, (Y_CT_SURFACE + Y_BS_TOP) / 2, bsZ), label: 'Backsplash Integral 300 mm' },
      { anchor: new THREE.Vector3(60, Y_CAB_TOP / 2, doorFrontZ),       label: 'Kabinet 4 Pintu Hinged + Handle' },
      { anchor: new THREE.Vector3(0, 1, HALF_D + 5),                     label: 'Foot Pedal Hands-Free (2×)' },
      { anchor: new THREE.Vector3(70, 3, 24),                            label: 'Adjustable Feet SS ⌀50 mm (4×)' },
    ],
    HALF_W + 45,
    [0, Y_CANOPY_TOP + 5],
  );
}

// ─── React component ──────────────────────────────────────────────────────────

export function ScrubSinkAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 80,
      maxDistance: 1200,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      const p = product.cameraPresets[0];
      if (p) applyCameraPreset(refs, p.position, p.target);
    },
    deps: [product],
  });

  const goTo = (p: CameraPreset) => {
    if (refsRef.current) applyCameraPreset(refsRef.current, p.position, p.target);
    setActivePreset(p.name);
  };

  const dl = (name: string) =>
    refsRef.current &&
    downloadPNG(
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
