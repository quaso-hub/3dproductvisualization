/**
 * PbLeadDoorAssembled3D.tsx — V2 ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * Automatic Single Swing PB / Lead Door — ELFATECH V2 (Revised)
 *
 * V2 key changes:
 *  - Dimensions: DW=100, DH=220 (1000×2200 mm)
 *  - Hinges on LEFT side (hinge jamb = left)
 *  - Handle: horizontal bar pull on RIGHT (strike side)
 *  - Door closer: Regular Arm 2-piece (body + main arm + forearm + pivot)
 *  - Window: 200×300 mm with rounded corners
 *  - Kickplate: 260 mm tall
 *  - Door bottom seal: aluminium housing + rubber drop
 *  - Frame: rebated door stop profile
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

// ─── Dimensi (scene units, 1 unit = 10 mm) ───────────────────
const DW = 100;   // door leaf width   1000 mm
const DH = 220;   // door leaf height  2200 mm
const DT = 4.7;   // door leaf thickness ~47 mm

// Frame
const FW = 8;              // frame jamb visible face width (80 mm)
const FD = DT + 8;         // frame depth (covers door + wall)
const DOOR_STOP = 1.5;     // door stop molding depth (15 mm)
const DOOR_STOP_W = 2;     // door stop width (20 mm)

// View Glass Timbal — 200×300 mm, portrait, rounded corners
const GW = 20;     // glass width  200 mm
const GH = 30;     // glass height 300 mm
const GX = 0;      // centered
const GY_FROM_TOP = 50;   // 500 mm from door top → center at DH/2 - 50 - GH/2 = 75
const gYCenter = DH / 2 - GY_FROM_TOP - GH / 2;
const G_RADIUS = 1.5;     // rounded corner radius (15 mm)

// SS Kick plate — 260 mm from bottom
const KPH = 26;
const KPW = DW - 4;
const kickYCenter = -DH / 2 + 10 + KPH / 2; // 10 units from bottom

// Wall context
const WALL_W = DW + FW * 4 + 30;
const WALL_H = DH + FW * 4 + 30;

// ─── Materials ───────────────────────────────────────────────

function matDoorPowderCoat() {
  return new THREE.MeshStandardMaterial({
    color: 0xd8e0e8,  // RAL 7035 light grey
    roughness: 0.65,
    metalness: 0.05,
    envMapIntensity: 0.45,
  });
}

function matFrame() {
  return new THREE.MeshStandardMaterial({
    color: 0xc0ccd5, roughness: 0.65, metalness: 0.05, envMapIntensity: 0.5,
  });
}

function matSS(roughness = 0.12, metalness = 0.92) {
  return new THREE.MeshStandardMaterial({
    color: 0xd4dde5, roughness, metalness, envMapIntensity: 1.1,
  });
}

function matSSPolished() {
  return new THREE.MeshStandardMaterial({
    color: 0xd8e4ec, roughness: 0.08, metalness: 0.96, envMapIntensity: 1.5,
  });
}

function matLeadGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0xb0c8d8, roughness: 0.05, metalness: 0.0,
    transparent: true, opacity: 0.55, side: THREE.DoubleSide, envMapIntensity: 1.2,
  });
}

function matLead() {
  return new THREE.MeshStandardMaterial({
    color: 0x6b7078, roughness: 0.50, metalness: 0.55,
  });
}

function matRubber() {
  return new THREE.MeshStandardMaterial({
    color: 0x1e2228, roughness: 0.92, metalness: 0.0,
  });
}

function matWall() {
  return new THREE.MeshStandardMaterial({
    color: 0xb8ccd8, roughness: 0.90, metalness: 0.0,
  });
}

function matCloserBody() {
  return new THREE.MeshStandardMaterial({
    color: 0x505860, roughness: 0.45, metalness: 0.15, envMapIntensity: 0.3,
  });
}

function matCloserArm() {
  return new THREE.MeshStandardMaterial({
    color: 0xc0ccd4, roughness: 0.15, metalness: 0.88, envMapIntensity: 0.8,
  });
}

function matAluminium() {
  return new THREE.MeshStandardMaterial({
    color: 0xb0b8c0, roughness: 0.35, metalness: 0.80,
  });
}

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}

// Rounded rectangle shape for window with rounded corners
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

// ─── Scene builder ────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {

  // ── 0. PBR Environment ──────────────────────────────────────
  renderer.toneMappingExposure = 0.72;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
  scene.background = new THREE.Color(0xedf2f5);
  pmrem.dispose();

  // ── 0b. Wall context dengan rebate untuk frame insertion ─────
  // FIX 1.1: Wall dengan pocket/rebate untuk frame insertion
  const WALL_REBATE_DEPTH = 2; // 20mm rebate depth
  const wallThickness = 3;
  
  // Wall main panel
  const wallMain = new THREE.Mesh(box(WALL_W, WALL_H, wallThickness), matWall());
  wallMain.position.set(0, 2.5, -(DT / 2 + FD + WALL_REBATE_DEPTH));
  wallMain.receiveShadow = true;
  scene.add(wallMain);
  
  // Wall rebate (recessed area for frame insertion)
  const wallRebate = new THREE.Mesh(box(WALL_W, WALL_H, WALL_REBATE_DEPTH), matWall());
  wallRebate.position.set(0, 2.5, -(DT / 2 + FD + WALL_REBATE_DEPTH / 2));
  wallRebate.receiveShadow = true;
  scene.add(wallRebate);
  
  // Frame mounting pocket (visible recess around frame)
  const pocketDepth = 0.5;
  const pocketMat = new THREE.MeshStandardMaterial({
    color: 0x98b0c0, roughness: 0.85, metalness: 0.0,
  });
  const pocketL = new THREE.Mesh(box(1, DH + FW, pocketDepth), pocketMat);
  pocketL.position.set(-DW / 2 - FW / 2, -FW / 2, -(DT / 2 + FD + pocketDepth / 2));
  scene.add(pocketL);
  
  const pocketR = new THREE.Mesh(box(1, DH + FW, pocketDepth), pocketMat);
  pocketR.position.set(DW / 2 + FW / 2, -FW / 2, -(DT / 2 + FD + pocketDepth / 2));
  scene.add(pocketR);
  
  const pocketTop = new THREE.Mesh(box(DW + FW * 2, 1, pocketDepth), pocketMat);
  pocketTop.position.set(0, DH / 2 + FW / 2, -(DT / 2 + FD + pocketDepth / 2));
  scene.add(pocketTop);

  // ── 1. DOOR FRAME (rebated profile with door stop) ────────────
  const fMat = matFrame();

  // Left jamb (HINGE side in V2)
  const jambL = new THREE.Mesh(box(FW, DH, FD), fMat);
  jambL.position.set(-DW / 2 - FW / 2, -FW / 2, 0);
  jambL.castShadow = true;
  scene.add(jambL);

  // Right jamb (STRIKE side in V2)
  const jambR = new THREE.Mesh(box(FW, DH, FD), fMat);
  jambR.position.set(DW / 2 + FW / 2, -FW / 2, 0);
  jambR.castShadow = true;
  scene.add(jambR);

  // Top header
  const header = new THREE.Mesh(box(DW + FW * 2, FW, FD), fMat);
  header.position.set(0, DH / 2 + FW / 2, 0);
  header.castShadow = true;
  scene.add(header);

  // Bottom threshold (thinner)
  const threshold = new THREE.Mesh(box(DW + FW * 2, FW * 0.4, FD * 0.6), fMat);
  threshold.position.set(0, -DH / 2 - FW * 0.2, 0);
  scene.add(threshold);

  // ── 1b. Frame Mounting Brackets — FIX 1.1 ─────────────────────
  // Mounting brackets untuk frame-to-wall connection (every 300mm)
  const bracketMat = matAluminium();
  const bracketScrewMat = matSS(0.2, 0.85);

  // Left jamb brackets (4 brackets)
  const leftJacketBracketYs = [-DH / 2 + 5, -DH / 2 + 35, -DH / 2 + 65, -DH / 2 + 95, 0, DH / 2 - 35];
  leftJacketBracketYs.forEach((by) => {
    // L-bracket
    const bracketL = new THREE.Mesh(box(3, 4, 1.5), bracketMat);
    bracketL.position.set(-DW / 2 - FW / 2 - 0.5, by, -(DT / 2 + FD / 2));
    bracketL.castShadow = true;
    scene.add(bracketL);

    // Mounting screw (hex head)
    const screwL = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.4, 6), bracketScrewMat);
    screwL.rotation.x = Math.PI / 2;
    screwL.position.set(-DW / 2 - FW / 2 - 0.5, by, -(DT / 2 + FD / 2 + 0.8));
    scene.add(screwL);
  });

  // Right jamb brackets (4 brackets)
  const rightJacketBracketYs = [-DH / 2 + 5, -DH / 2 + 35, -DH / 2 + 65, -DH / 2 + 95, 0, DH / 2 - 35];
  rightJacketBracketYs.forEach((by) => {
    const bracketR = new THREE.Mesh(box(3, 4, 1.5), bracketMat);
    bracketR.position.set(DW / 2 + FW / 2 + 0.5, by, -(DT / 2 + FD / 2));
    bracketR.castShadow = true;
    scene.add(bracketR);

    const screwR = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.4, 6), bracketScrewMat);
    screwR.rotation.x = Math.PI / 2;
    screwR.position.set(DW / 2 + FW / 2 + 0.5, by, -(DT / 2 + FD / 2 + 0.8));
    scene.add(screwR);
  });

  // Header brackets (3 brackets)
  [-DW / 4, 0, DW / 4].forEach((bx) => {
    const bracketH = new THREE.Mesh(box(3, 3, 1.5), bracketMat);
    bracketH.position.set(bx, DH / 2 + FW / 2, -(DT / 2 + FD / 2));
    bracketH.castShadow = true;
    scene.add(bracketH);

    const screwH = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.4, 6), bracketScrewMat);
    screwH.rotation.x = Math.PI / 2;
    screwH.position.set(bx, DH / 2 + FW / 2, -(DT / 2 + FD / 2 + 0.8));
    scene.add(screwH);
  });
  
  // ── 1c. Sealant Bead — FIX 1.1 ────────────────────────────────
  // Caulking/sealant bead di frame-wall junction
  const sealantColor = 0x889999;
  const sealantMat = new THREE.MeshStandardMaterial({
    color: sealantColor, roughness: 0.8, metalness: 0.0,
  });
  
  // Left jamb sealant
  const sealantL = new THREE.Mesh(box(0.3, DH, 0.3), sealantMat);
  sealantL.position.set(-DW / 2 - FW, -FW / 2, -(DT / 2 + FD));
  scene.add(sealantL);
  
  // Right jamb sealant
  const sealantR = new THREE.Mesh(box(0.3, DH, 0.3), sealantMat);
  sealantR.position.set(DW / 2 + FW, -FW / 2, -(DT / 2 + FD));
  scene.add(sealantR);
  
  // Header sealant
  const sealantTop = new THREE.Mesh(box(DW + FW * 2, 0.3, 0.3), sealantMat);
  sealantTop.position.set(0, DH / 2 + FW, -(DT / 2 + FD));
  scene.add(sealantTop);

  // ── 1d. Door Stop L-Profile — FIX 2.1 ────────────────────────────────
  // FIX 2.1: Replace box dengan L-profile extrusion untuk proper door stop
  const stopMat = matFrame();
  
  // L-profile shape (25×25×3mm)
  function createLProfileShape(): THREE.Shape {
    const shape = new THREE.Shape();
    const L_SIZE = 2.5; // 25mm
    const L_THICK = 0.3; // 3mm
    
    // Draw L shape
    shape.moveTo(0, 0);
    shape.lineTo(L_SIZE, 0);         // Horizontal bottom
    shape.lineTo(L_SIZE, L_THICK);   // Up to thickness
    shape.lineTo(L_THICK, L_THICK);  // Inner horizontal
    shape.lineTo(L_THICK, L_SIZE);   // Vertical up
    shape.lineTo(0, L_SIZE);         // Top horizontal back
    shape.lineTo(0, 0);              // Close
    return shape;
  }
  
  const lProfileGeo = new THREE.ExtrudeGeometry(createLProfileShape(), {
    depth: DH,
    bevelEnabled: false,
  });
  
  // Left jamb L-profile (rotated to proper orientation)
  const stopL = new THREE.Mesh(lProfileGeo, stopMat);
  stopL.rotation.z = Math.PI / 2; // Rotate L to face inward
  stopL.position.set(-DW / 2 - 0.3, -FW / 2, DT * 0.2);
  scene.add(stopL);
  
  // Right jamb L-profile
  const stopR = new THREE.Mesh(lProfileGeo, stopMat);
  stopR.rotation.z = Math.PI / 2;
  stopR.position.set(DW / 2 + 0.3, -FW / 2, DT * 0.2);
  scene.add(stopR);
  
  // Header L-profile (rotated differently)
  const headerLProfileGeo = new THREE.ExtrudeGeometry(createLProfileShape(), {
    depth: DW + FW * 2,
    bevelEnabled: false,
  });
  const stopTop = new THREE.Mesh(headerLProfileGeo, stopMat);
  stopTop.rotation.z = Math.PI / 2;
  stopTop.rotation.y = Math.PI / 2; // Rotate to face downward
  stopTop.position.set(0, DH / 2 + 0.3, DT * 0.2);
  scene.add(stopTop);
  
  // L-profile end caps (visible at corners)
  const lProfileCapMat = new THREE.MeshStandardMaterial({
    color: 0xb0b8c0, roughness: 0.55, metalness: 0.15,
  });
  const capGeo = new THREE.BoxGeometry(0.5, 0.5, 0.3);
  
  // Top-left corner cap
  const capTL = new THREE.Mesh(capGeo, lProfileCapMat);
  capTL.position.set(-DW / 2 - 0.3, DH / 2 + 0.3, DT * 0.2);
  scene.add(capTL);
  
  // Top-right corner cap
  const capTR = new THREE.Mesh(capGeo, lProfileCapMat);
  capTR.position.set(DW / 2 + 0.3, DH / 2 + 0.3, DT * 0.2);
  scene.add(capTR);

  // ── 2. DOOR LEAF ──────────────────────────────────────────────
  // Build door shape with rounded-corner window hole
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-DW / 2, -DH / 2);
  doorShape.lineTo(DW / 2, -DH / 2);
  doorShape.lineTo(DW / 2, DH / 2);
  doorShape.lineTo(-DW / 2, DH / 2);
  doorShape.closePath();

  // Window hole with rounded corners
  const windowShape = roundedRectShape(GW, GH, G_RADIUS);
  const holePath = new THREE.Path();
  const pts = windowShape.getPoints(32);
  holePath.setFromPoints(pts.map(p => new THREE.Vector2(p.x + GX, p.y + gYCenter)));
  doorShape.holes.push(holePath);

  const doorGeo = new THREE.ExtrudeGeometry(doorShape, {
    depth: DT, bevelEnabled: false,
  });
  doorGeo.translate(0, 0, -DT / 2);

  const doorMesh = new THREE.Mesh(doorGeo, matDoorPowderCoat());
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  scene.add(doorMesh);

  // Subtle edge outlines
  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.10, transparent: true }),
  );
  scene.add(doorEdges);

  // ── 2a. Pb lead edge stripe (top edge visible) ──────────────
  const pbEdge = new THREE.Mesh(box(DW - 3, 2.5, DT * 0.9), matLead());
  pbEdge.position.set(0, DH / 2 - 1.25, 0);
  scene.add(pbEdge);

  // ── 2b. EPDM perimeter gasket (P-profile) ────────────────────
  const ES = 1.2;
  const epdmMat = matRubber();
  const epdmItems: [THREE.BoxGeometry, [number, number, number]][] = [
    [box(DW - ES * 2, ES, DT + 1.5), [0,        DH / 2,  0]],
    [box(DW - ES * 2, ES, DT + 1.5), [0,       -DH / 2,  0]],
    [box(ES, DH,       DT + 1.5),    [-DW / 2,  0,        0]],
    [box(ES, DH,       DT + 1.5),    [ DW / 2,  0,        0]],
  ];
  epdmItems.forEach(([g, p]) => {
    const m = new THREE.Mesh(g, epdmMat);
    m.position.set(...p);
    scene.add(m);
  });

  // ── 2c. Door bottom seal (aluminium housing + rubber) ─────────
  const sealHousing = new THREE.Mesh(box(DW - 2, 3, 3), matAluminium());
  sealHousing.position.set(0, -DH / 2 + 1.5, DT / 2 - 0.5);
  scene.add(sealHousing);
  const sealRubber = new THREE.Mesh(box(DW - 4, 1, 2), matRubber());
  sealRubber.position.set(0, -DH / 2 + 0.2, DT / 2 - 0.5);
  scene.add(sealRubber);

  // ── 3. LEAD GLASS WINDOW (rounded corners) ─────────────────────
  // Glass pane (slightly offset forward)
  const glassShape = roundedRectShape(GW, GH, G_RADIUS);
  const glassGeo = new THREE.ExtrudeGeometry(glassShape, { depth: 0.6, bevelEnabled: false });
  glassGeo.translate(0, 0, -0.3);
  const glassMesh = new THREE.Mesh(glassGeo, matLeadGlass());
  glassMesh.position.set(GX, gYCenter, 0.1);
  scene.add(glassMesh);

  // SS glass frame border
  const gfT = 1.2;
  const gfMat = matSS(0.10, 0.90);
  const gfD = DT * 0.5;
  // Top bar
  const gfTopGeo = box(GW + gfT * 2, gfT, gfD);
  const gfTop = new THREE.Mesh(gfTopGeo, gfMat);
  gfTop.position.set(GX, gYCenter + GH / 2 + gfT / 2, 0);
  scene.add(gfTop);
  // Bottom bar
  const gfBot = new THREE.Mesh(gfTopGeo, gfMat);
  gfBot.position.set(GX, gYCenter - GH / 2 - gfT / 2, 0);
  scene.add(gfBot);
  // Left bar
  const gfSideGeo = box(gfT, GH, gfD);
  const gfLeft = new THREE.Mesh(gfSideGeo, gfMat);
  gfLeft.position.set(GX - GW / 2 - gfT / 2, gYCenter, 0);
  scene.add(gfLeft);
  // Right bar
  const gfRight = new THREE.Mesh(gfSideGeo, gfMat);
  gfRight.position.set(GX + GW / 2 + gfT / 2, gYCenter, 0);
  scene.add(gfRight);

  // Glass gasket (thin black rubber ring around glass)
  const gasketMat = matRubber();
  const gasketT = 0.6;
  [
    { pos: [GX, gYCenter + GH / 2 + 0.3, 0.1] as [number, number, number], size: [GW + 0.6, gasketT, 1] as [number, number, number] },
    { pos: [GX, gYCenter - GH / 2 - 0.3, 0.1] as [number, number, number], size: [GW + 0.6, gasketT, 1] as [number, number, number] },
    { pos: [GX - GW / 2 - 0.3, gYCenter, 0.1] as [number, number, number], size: [gasketT, GH, 1] as [number, number, number] },
    { pos: [GX + GW / 2 + 0.3, gYCenter, 0.1] as [number, number, number], size: [gasketT, GH, 1] as [number, number, number] },
  ].forEach(({ pos, size }) => {
    const g = new THREE.Mesh(box(...size), gasketMat);
    g.position.set(...pos);
    scene.add(g);
  });

  // ── 4. SS KICK PLATE ──────────────────────────────────────────
  const kickMat = matSS(0.20, 0.94);
  const kickPlate = new THREE.Mesh(box(KPW, KPH, 1.5), kickMat);
  kickPlate.position.set(0, kickYCenter, DT / 2 + 0.5);
  kickPlate.castShadow = true;
  scene.add(kickPlate);

  // Kick plate edge outline
  const kickEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(box(KPW, KPH, 1.5)),
    new THREE.LineBasicMaterial({ color: 0x5580a0, opacity: 0.20, transparent: true }),
  );
  kickEdges.position.copy(kickPlate.position);
  scene.add(kickEdges);

  // 6 countersunk screw heads on kick plate
  const screwMat = matSS(0.20, 0.80);
  const screwGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10);
  [-KPW / 2 + 4, 0, KPW / 2 - 4].forEach((sx) => {
    [kickYCenter + 8, kickYCenter - 8].forEach((sy) => {
      const screw = new THREE.Mesh(screwGeo, screwMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sx, sy, DT / 2 + 1.5);
      scene.add(screw);
    });
  });

  // ── 5. HANDLE — Horizontal Bar Pull on RIGHT/strike side ──────
  const handleMat = matSSPolished();
  const handleX = DW / 2 - 12;  // 120mm from right edge
  const handleY = -10;           // ~1050mm from floor (center of door)
  const barLen = 50;             // 500mm bar length

  // Bar (horizontal cylinder)
  const barGeo = new THREE.CylinderGeometry(1.1, 1.1, barLen, 16);
  const bar = new THREE.Mesh(barGeo, handleMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(handleX, handleY, DT / 2 + 5.5);
  scene.add(bar);

  // 2 mounting bracket cylinders (endpoints of bar)
  ([handleY - barLen / 2 + 4, handleY + barLen / 2 - 4]).forEach((by) => {
    // Bracket cylinder
    const bracket = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.75, 5.5, 14),
      handleMat,
    );
    bracket.rotation.x = Math.PI / 2;
    bracket.position.set(handleX, by, DT / 2 + 2.75);
    scene.add(bracket);

    // Base plate (disc)
    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.5, 0.8, 16),
      matSS(0.15, 0.90),
    );
    basePlate.rotation.x = Math.PI / 2;
    basePlate.position.set(handleX, by, DT / 2 + 0.4);
    scene.add(basePlate);
  });

  // ── 5b. Mortise body + latch bolt on right door edge ──────────
  const mortise = new THREE.Mesh(box(2.2, 20, DT), matSS(0.22, 0.78));
  mortise.position.set(DW / 2, handleY, 0);
  scene.add(mortise);

  const latchBolt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 3.5, 10),
    matSS(0.12, 0.90),
  );
  latchBolt.rotation.z = Math.PI / 2;
  latchBolt.position.set(DW / 2 + 1.8, handleY, 0);
  scene.add(latchBolt);

  // Strike plate on right jamb
  const strikePlate = new THREE.Mesh(box(2, 7.5, 1.5), matSS(0.18, 0.85));
  strikePlate.position.set(DW / 2 + FW * 0.3, handleY, DT * 0.1);
  scene.add(strikePlate);

  // ── 6. HINGES — 3× on LEFT side (butt hinges) ─────────────────
  const hMat = matSS(0.15, 0.92);
  const hingeX = -DW / 2;
  const HINGE_LEAF_W = 5;
  const HINGE_LEAF_H = 10;
  const HINGE_LEAF_T = 0.4;

  [DH / 2 - 20, 0, -DH / 2 + 20].forEach((hy) => {
    // Door-side leaf
    const doorLeaf = new THREE.Mesh(box(HINGE_LEAF_W, HINGE_LEAF_H, HINGE_LEAF_T), hMat);
    doorLeaf.position.set(hingeX + HINGE_LEAF_W / 2, hy, 0);
    scene.add(doorLeaf);

    // Frame-side leaf
    const frameLeaf = new THREE.Mesh(box(HINGE_LEAF_W, HINGE_LEAF_H, HINGE_LEAF_T), hMat);
    frameLeaf.position.set(hingeX - HINGE_LEAF_W / 2, hy, 0);
    scene.add(frameLeaf);

    // Pivot pin (knuckle)
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, HINGE_LEAF_H + 1, 12),
      hMat,
    );
    pin.position.set(hingeX, hy, 0);
    scene.add(pin);

    // Screw heads on door leaf (4 per leaf)
    const scrGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8);
    [-3, -1, 1, 3].forEach((dy) => {
      const sc = new THREE.Mesh(scrGeo, hMat);
      sc.rotation.x = Math.PI / 2;
      sc.position.set(hingeX + 2.5, hy + dy, DT * 0.25);
      scene.add(sc);
    });
  });

  // ── 7. AUTOMATIC DOOR CLOSER — Regular Arm 2-piece ────────────

  // 7A. CLOSER BODY — rectangular housing on door top (hinge side)
  const CB_W = 28;   // 280mm
  const CB_H = 6;    // 60mm
  const CB_D = 6.5;  // 65mm
  const cbX = -DW / 4;  // offset toward hinge side
  const cbY = DH / 2 + 1 + CB_H / 2;  // sits just above door top
  const cbZ = DT / 2 + CB_D / 2 - 1;  // slightly forward of door face

  // Main body (with rounded edges via bevel)
  const bodyGeo = new THREE.BoxGeometry(CB_W, CB_H, CB_D);
  const bodyMesh = new THREE.Mesh(bodyGeo, matCloserBody());
  bodyMesh.position.set(cbX, cbY, cbZ);
  bodyMesh.castShadow = true;
  scene.add(bodyMesh);

  // End caps (rounded visual)
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x404850, roughness: 0.50, metalness: 0.12,
  });
  [-1, 1].forEach(s => {
    const cap = new THREE.Mesh(box(0.8, CB_H, CB_D), capMat);
    cap.position.set(cbX + s * (CB_W / 2 + 0.4), cbY, cbZ);
    scene.add(cap);
  });

  // Adjustment screws on top face (4 hex heads)
  const hexMat = matSS(0.30, 0.80);
  const hexGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 6);
  [-8, -3, 3, 8].forEach((hx) => {
    const hex = new THREE.Mesh(hexGeo, hexMat);
    hex.position.set(cbX + hx, cbY + CB_H / 2 + 0.2, cbZ);
    scene.add(hex);
  });

  // 7B. MAIN ARM — from body pivot point extending forward
  const armMat = matCloserArm();
  const MAIN_ARM_LEN = 20;  // 200mm

  // Body pivot point (side of closer body, toward strike side)
  const pivotBodyX = cbX + CB_W / 2 + 0.5;
  const pivotBodyY = cbY - CB_H / 2 + 1;
  const pivotBodyZ = cbZ;

  // Main arm extends from body pivot downward-forward toward door
  const mainArmEndX = pivotBodyX + 12;
  const mainArmEndY = pivotBodyY - 4;
  const mainArmEndZ = pivotBodyZ - 1;

  // Main arm mesh (tube from body pivot to joint)
  const mainArmPath = new THREE.LineCurve3(
    new THREE.Vector3(pivotBodyX, pivotBodyY, pivotBodyZ),
    new THREE.Vector3(mainArmEndX, mainArmEndY, mainArmEndZ),
  );
  const mainArmGeo = new THREE.TubeGeometry(mainArmPath, 1, 0.7, 8, false);
  const mainArmMesh = new THREE.Mesh(mainArmGeo, armMat);
  mainArmMesh.castShadow = true;
  scene.add(mainArmMesh);

  // 7C. PIVOT JOINT (knuckle between main arm and forearm)
  const jointX = mainArmEndX;
  const jointY = mainArmEndY;
  const jointZ = mainArmEndZ;

  const jointGeo = new THREE.CylinderGeometry(1.0, 1.0, 2.0, 12);
  const joint = new THREE.Mesh(jointGeo, armMat);
  joint.rotation.x = Math.PI / 2;
  joint.position.set(jointX, jointY, jointZ);
  scene.add(joint);

  // Hex nut on pivot
  const nutGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 6);
  const nut = new THREE.Mesh(nutGeo, hexMat);
  nut.rotation.x = Math.PI / 2;
  nut.position.set(jointX, jointY, jointZ + 1.2);
  scene.add(nut);

  // 7D. FOREARM — from joint to door bracket
  const FOREARM_LEN = 15;  // 150mm
  // Door bracket position (on door face near header)
  const bracketX = jointX - 8;
  const bracketY = DH / 2 - 2;  // near door top
  const bracketZ = DT / 2 + 1;

  const forearmPath = new THREE.LineCurve3(
    new THREE.Vector3(jointX, jointY, jointZ),
    new THREE.Vector3(bracketX, bracketY, bracketZ),
  );
  const forearmGeo = new THREE.TubeGeometry(forearmPath, 1, 0.6, 8, false);
  const forearmMesh = new THREE.Mesh(forearmGeo, armMat);
  forearmMesh.castShadow = true;
  scene.add(forearmMesh);

  // 7E. DOOR BRACKET (shoe) — flat plate on door face
  const bracketMesh = new THREE.Mesh(box(5, 3, 0.6), armMat);
  bracketMesh.position.set(bracketX, bracketY, DT / 2 + 0.3);
  scene.add(bracketMesh);

  // Bracket pivot pin
  const bracketPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 1.2, 10),
    armMat,
  );
  bracketPin.rotation.x = Math.PI / 2;
  bracketPin.position.set(bracketX, bracketY, DT / 2 + 1);
  scene.add(bracketPin);

  // Bracket mounting screws (4)
  const bScrewGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 8);
  [[-1.5, -0.8], [-1.5, 0.8], [1.5, -0.8], [1.5, 0.8]].forEach(([dx, dy]) => {
    const bScrew = new THREE.Mesh(bScrewGeo, hexMat);
    bScrew.rotation.x = Math.PI / 2;
    bScrew.position.set(bracketX + dx, bracketY + dy, DT / 2 + 0.8);
    scene.add(bScrew);
  });

  // Body pivot knuckle (at body end)
  const bodyKnuckle = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 2.5, 12),
    armMat,
  );
  bodyKnuckle.rotation.x = Math.PI / 2;
  bodyKnuckle.position.set(pivotBodyX, pivotBodyY, pivotBodyZ);
  scene.add(bodyKnuckle);

  // ── 8. ANNOTATIONS ─────────────────────────────────────────────
  const annotTop = DH / 2 + FW + CB_H + 8;
  const annotBottom = -DH / 2 - FW - 4;

  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(cbX, cbY, cbZ),                           label: 'Door Closer Body (Hydraulic)' },
      { anchor: new THREE.Vector3(jointX, jointY, jointZ),                   label: 'Regular Arm 2-Piece + Pivot' },
      { anchor: new THREE.Vector3(GX + GW / 2, gYCenter, 0),               label: 'View Glass Timbal (Pb) 200×300' },
      { anchor: new THREE.Vector3(0, DH / 2 - 1.25, 0),                    label: 'Lapis Timbal Pb (Lead Lining)' },
      { anchor: new THREE.Vector3(handleX, handleY, DT / 2 + 5.5),         label: 'Bar Handle SS ⌀22×500 mm' },
      { anchor: new THREE.Vector3(DW / 2, handleY, 0),                      label: 'Mortise X-Ray Special (LBA)' },
      { anchor: new THREE.Vector3(0, kickYCenter, DT / 2 + 1),             label: 'Kick Plate SS 304 (260 mm)' },
      { anchor: new THREE.Vector3(hingeX, 0, 0),                            label: 'Engsel Heavy Duty 3× (Butt)' },
      { anchor: new THREE.Vector3(0, -DH / 2 + 1.5, DT / 2),              label: 'Bottom Seal (Aluminium+Rubber)' },
      { anchor: new THREE.Vector3(-DW / 2 - FW / 2, DH / 4, 0),           label: 'Kusen Steel + Door Stop Rebate' },
    ],
    DW / 2 + 65,
    [annotBottom, annotTop],
  );
}

// ─── React component ──────────────────────────────────────────

export function PbLeadDoorAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 60,
      maxDistance: 900,
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
