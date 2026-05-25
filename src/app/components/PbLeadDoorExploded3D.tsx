/**
 * PbLeadDoorExploded3D.tsx — EXPLODED VIEW (Session 10 Item 3 rewrite)
 * ──────────────────────────────────────────────────────────────────
 * Konsisten dengan Assembled view: SEMUA komponen pintu Pb Lead Door
 * di-explode, bukan hanya cross-section panel.
 *
 * Strategi:
 *   • Door panel layers (6 layer) → cross-section di Z, centered
 *   • Lead glass → terpisah ke depan
 *   • Frame (jamb + header + threshold) → meledak radial keluar (kiri/kanan/atas/bawah)
 *   • Closer (Sargent 281) → ke atas
 *   • Bar pull handle → ke depan (Z+)
 *   • Lockset (mortise + faceplate) → terpisah di samping latch
 *   • Hinges (3×) → terpisah ke kiri (hinge edge)
 *   • Kickplate → ke bawah
 *   • Drop seal → di bawah door panel
 *
 * Setiap komponen punya dashed connector ke posisi assembled-nya.
 * ──────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import {
  animateCameraTo, applyCameraPreset, downloadPNG, placeAnnotations, visualThickness,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { useHighlightController } from '../hooks/useHighlightController';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ── Dimensi (mirror Assembled) ────────────────────────
const DW = 100;
const DH = 220;
const DT = 4.7;
const GW = 20;
const GH = 30;
const GX = 0;
const GY = 65;
const GR = 1.5;

// Frame
const FW = 8;
// BUGFIX 2026-05-25: was const FD = 12 (hardcoded). Assembled view uses
// const FD = DT + 8 = 12.7. Mismatch caused subtle jamb-throat width drift
// between assembled and exploded views. See research:
// docs/research/2026-05-25-pb-lead-door-references.md (Bug 3).
const FD = DT + 8;

// ── Explosion offsets ─────────────────────────────────
const PANEL_GAP = 14;        // gap antara panel layers (Z)
const GLASS_FORWARD = 50;    // glass flying forward (Z)
const FRAME_RADIAL = 60;     // frame components radial outward
const CLOSER_UP = 70;        // closer flying up
const HANDLE_FORWARD = 60;   // bar pull flying forward
const LOCKSET_OUT = 60;      // lockset flying right (latch side)
const HINGES_OUT = 60;       // hinges flying left (hinge edge)
const KICKPLATE_DOWN = 50;   // kickplate flying down
const DASH_COLOR = 0x9ca3af;

// ── Materials ──────────────────────────────────────────
function matSS(roughness = 0.22, metalness = 0.95) {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dde6, roughness, metalness, envMapIntensity: 0.95,
  });
}
function matFrame() {
  return new THREE.MeshStandardMaterial({
    color: 0x707880, roughness: 0.30, metalness: 0.85,
  });
}
function matLeadGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4b0, roughness: 0.05, metalness: 0,
    transparent: true, opacity: 0.55, side: THREE.DoubleSide,
  });
}
function matLead() {
  return new THREE.MeshStandardMaterial({
    color: 0x707680, roughness: 0.55, metalness: 0.45,
  });
}
function matChrome() {
  return new THREE.MeshStandardMaterial({
    color: 0xeef4f8, roughness: 0.08, metalness: 1.0,
  });
}
function matHousing() {
  return new THREE.MeshStandardMaterial({
    color: 0x6a7480, roughness: 0.35, metalness: 0.85,
  });
}
function matRubber() {
  return new THREE.MeshStandardMaterial({
    color: 0x1e2228, roughness: 0.92, metalness: 0,
  });
}

// ── Door shape with rounded-corner window hole ─────────
function buildFullDoorShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-DW / 2, -DH / 2);
  shape.lineTo(DW / 2, -DH / 2);
  shape.lineTo(DW / 2, DH / 2);
  shape.lineTo(-DW / 2, DH / 2);
  shape.closePath();
  return shape;
}

function buildDoorShapeWithHole(): THREE.Shape {
  const shape = buildFullDoorShape();
  const gYCenter = DH / 2 - GY - GH / 2;
  const hw = GW / 2, hh = GH / 2, r = GR;
  const hole = new THREE.Path();
  hole.moveTo(GX - hw + r, gYCenter - hh);
  hole.lineTo(GX + hw - r, gYCenter - hh);
  hole.quadraticCurveTo(GX + hw, gYCenter - hh, GX + hw, gYCenter - hh + r);
  hole.lineTo(GX + hw, gYCenter + hh - r);
  hole.quadraticCurveTo(GX + hw, gYCenter + hh, GX + hw - r, gYCenter + hh);
  hole.lineTo(GX - hw + r, gYCenter + hh);
  hole.quadraticCurveTo(GX - hw, gYCenter + hh, GX - hw, gYCenter + hh - r);
  hole.lineTo(GX - hw, gYCenter - hh + r);
  hole.quadraticCurveTo(GX - hw, gYCenter - hh, GX - hw + r, gYCenter - hh);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

function dashedConnector(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3) {
  const mat = new THREE.LineDashedMaterial({
    color: DASH_COLOR, linewidth: 1, dashSize: 4, gapSize: 3,
    opacity: 0.5, transparent: true,
  });
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  scene.add(line);
}

// ── Scene builder ─────────────────────────────────────
function buildExplodedScene(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  layers: Product['layers'],
) {
  // Environment + Lighting
  renderer.toneMappingExposure = 1.0;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.background = new THREE.Color(0xeef3f7);
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  scene.add(new THREE.HemisphereLight(0xfaffff, 0xd0dde6, 0.42));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(180, 240, 220);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc8e0ff, 0.45);
  fill.position.set(-140, 130, -100);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff0d8, 0.32);
  rim.position.set(80, 100, -200);
  scene.add(rim);

  const annotItems: { anchor: THREE.Vector3; label: string; partId?: string }[] = [];

  // ════════════════════════════════════════════════════
  // 1. PANEL CROSS-SECTION (6 layers, centered, separated in Z)
  // ════════════════════════════════════════════════════
  const panelLayers = layers.slice(0, 6);
  const visualTs = panelLayers.map((l) => visualThickness(l));
  const totalVisT = visualTs.reduce((s, t) => s + t, 0);
  const totalSpan = totalVisT + PANEL_GAP * (panelLayers.length - 1);
  let currentZ = -totalSpan / 2;

  const panelLayersGroup = new THREE.Group();
  panelLayersGroup.userData.partId = 'door-leaf';
  scene.add(panelLayersGroup);

  panelLayers.forEach((layer, i) => {
    const vt = visualTs[i];
    const useHole = i === 0 || i === 5;
    const shapeGeo = new THREE.ExtrudeGeometry(
      useHole ? buildDoorShapeWithHole() : buildFullDoorShape(),
      { depth: vt, bevelEnabled: false },
    );

    const mat = new THREE.MeshStandardMaterial({
      color: layer.color, roughness: layer.roughness, metalness: layer.metalness,
      side: THREE.DoubleSide, envMapIntensity: 0.9,
    });
    const mesh = new THREE.Mesh(shapeGeo, mat);
    mesh.position.z = currentZ;
    mesh.castShadow = mesh.receiveShadow = true;
    panelLayersGroup.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(shapeGeo),
      new THREE.LineBasicMaterial({ color: 0x1a2332, opacity: 0.25, transparent: true }),
    );
    edges.position.z = currentZ;
    panelLayersGroup.add(edges);

    annotItems.push({
      anchor: new THREE.Vector3(DW / 2, 0, currentZ + vt / 2),
      label: layer.name,
      partId: 'door-leaf',
    });
    currentZ += vt + PANEL_GAP;
  });

  // ════════════════════════════════════════════════════
  // 2. LEAD GLASS (forward Z)
  // ════════════════════════════════════════════════════
  const glassLayer = layers[6];
  if (glassLayer) {
    const glassVT = Math.max(visualThickness(glassLayer), 3.5);
    const glassZ = currentZ + GLASS_FORWARD;
    const gYCenter = DH / 2 - GY - GH / 2;

    const glassGroup = new THREE.Group();
    glassGroup.userData.partId = 'view-glass';
    scene.add(glassGroup);

    const glassGeo = new THREE.BoxGeometry(GW, GH, glassVT);
    const glassMesh = new THREE.Mesh(glassGeo, matLeadGlass());
    glassMesh.position.set(GX, gYCenter, glassZ);
    glassGroup.add(glassMesh);

    // Glass frame border
    const gfT = 1.0;
    [
      { pos: [GX, gYCenter + GH / 2 + gfT / 2, glassZ], size: [GW + gfT * 2, gfT, glassVT] },
      { pos: [GX, gYCenter - GH / 2 - gfT / 2, glassZ], size: [GW + gfT * 2, gfT, glassVT] },
      { pos: [GX - GW / 2 - gfT / 2, gYCenter, glassZ], size: [gfT, GH, glassVT] },
      { pos: [GX + GW / 2 + gfT / 2, gYCenter, glassZ], size: [gfT, GH, glassVT] },
    ].forEach(({ pos, size }) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(...size as [number, number, number]),
        matSS(0.18, 1.0),
      );
      m.position.set(...pos as [number, number, number]);
      glassGroup.add(m);
    });

    const glassEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(glassGeo),
      new THREE.LineBasicMaterial({ color: 0x0284c7, opacity: 0.45, transparent: true }),
    );
    glassEdges.position.copy(glassMesh.position);
    glassGroup.add(glassEdges);

    // Connector to assembled location
    dashedConnector(scene,
      new THREE.Vector3(GX, gYCenter, glassZ),
      new THREE.Vector3(GX, gYCenter, currentZ - PANEL_GAP - 5));

    annotItems.push({
      anchor: new THREE.Vector3(GX + GW / 2, gYCenter, glassZ),
      label: glassLayer.name,
      partId: 'view-glass',
    });
  }

  // ════════════════════════════════════════════════════
  // 3. FRAME (kusen): jambs + header + threshold — radial outward
  // ════════════════════════════════════════════════════
  const frameZ = -totalSpan / 2 - 25;
  const frameGroup = new THREE.Group();
  frameGroup.userData.partId = 'frame';
  scene.add(frameGroup);

  // Left jamb: flies left
  const jambGeo = new THREE.BoxGeometry(FW, DH + FW * 2, FD);
  const jambL = new THREE.Mesh(jambGeo, matFrame());
  jambL.position.set(-(DW / 2 + FW / 2 + FRAME_RADIAL), 0, frameZ);
  frameGroup.add(jambL);
  dashedConnector(scene,
    new THREE.Vector3(-(DW / 2 + FW / 2 + FRAME_RADIAL), 0, frameZ),
    new THREE.Vector3(-(DW / 2 + FW / 2), 0, 0));
  annotItems.push({
    anchor: new THREE.Vector3(-(DW / 2 + FW / 2 + FRAME_RADIAL), 0, frameZ),
    label: 'Jamb Kiri (Kusen, Pb-lined throat)',
    partId: 'frame',
  });

  // Right jamb: flies right
  const jambR = new THREE.Mesh(jambGeo.clone(), matFrame());
  jambR.position.set(DW / 2 + FW / 2 + FRAME_RADIAL, 0, frameZ);
  frameGroup.add(jambR);
  dashedConnector(scene,
    new THREE.Vector3(DW / 2 + FW / 2 + FRAME_RADIAL, 0, frameZ),
    new THREE.Vector3(DW / 2 + FW / 2, 0, 0));
  annotItems.push({
    anchor: new THREE.Vector3(DW / 2 + FW / 2 + FRAME_RADIAL, 0, frameZ),
    label: 'Jamb Kanan (Kusen)',
    partId: 'frame',
  });

  // Header: flies up
  const headerGeo = new THREE.BoxGeometry(DW + FW * 2, FW, FD);
  const header = new THREE.Mesh(headerGeo, matFrame());
  header.position.set(0, DH / 2 + FW / 2 + FRAME_RADIAL, frameZ);
  frameGroup.add(header);
  dashedConnector(scene,
    new THREE.Vector3(0, DH / 2 + FW / 2 + FRAME_RADIAL, frameZ),
    new THREE.Vector3(0, DH / 2 + FW / 2, 0));
  annotItems.push({
    anchor: new THREE.Vector3(0, DH / 2 + FW / 2 + FRAME_RADIAL, frameZ),
    label: 'Header (Kusen Atas)',
    partId: 'frame',
  });

  // Threshold: flies down
  const threshGeo = new THREE.BoxGeometry(DW + FW * 2, FW * 0.4, FD);
  const thresh = new THREE.Mesh(threshGeo, matFrame());
  thresh.position.set(0, -(DH / 2 + FW * 0.2 + FRAME_RADIAL), frameZ);
  frameGroup.add(thresh);
  dashedConnector(scene,
    new THREE.Vector3(0, -(DH / 2 + FW * 0.2 + FRAME_RADIAL), frameZ),
    new THREE.Vector3(0, -(DH / 2 + FW * 0.2), 0));

  // ════════════════════════════════════════════════════
  // 4. CLOSER (Sargent 281 housing) — flies up
  // ════════════════════════════════════════════════════
  const closerGroup = new THREE.Group();
  closerGroup.userData.partId = 'closer';
  scene.add(closerGroup);

  const closerY_assembled = DH / 2 + FW / 2;
  const closerY_exploded = closerY_assembled + CLOSER_UP;
  const closerHousing = new THREE.Mesh(
    new THREE.BoxGeometry(20, 6, 6),
    matHousing(),
  );
  closerHousing.position.set(0, closerY_exploded, DT / 2 + 3);
  closerHousing.castShadow = true;
  closerGroup.add(closerHousing);
  // Closer caps
  for (const sx of [-10, 10]) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 0.5, 16),
      matSS(0.2, 1.0),
    );
    cap.rotation.z = Math.PI / 2;
    cap.position.set(sx, closerY_exploded, DT / 2 + 3);
    closerGroup.add(cap);
  }
  dashedConnector(scene,
    new THREE.Vector3(0, closerY_exploded, DT / 2 + 3),
    new THREE.Vector3(0, closerY_assembled, DT / 2 + 3));
  annotItems.push({
    anchor: new THREE.Vector3(0, closerY_exploded + 4, DT / 2 + 3),
    label: 'Closer Sargent 281 (Regular Arm)',
    partId: 'closer',
  });

  // ════════════════════════════════════════════════════
  // 5. BAR PULL HANDLE — flies forward
  // ════════════════════════════════════════════════════
  const barPullGroup = new THREE.Group();
  barPullGroup.userData.partId = 'bar-pull';
  scene.add(barPullGroup);

  const handleX = DW / 2 - 4;
  const handleY = -5;
  const handleZ_assembled = DT / 2 + 3;
  const handleZ_exploded = handleZ_assembled + HANDLE_FORWARD;
  // Bar
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 50, 24),
    matChrome(),
  );
  bar.position.set(handleX, handleY, handleZ_exploded);
  bar.castShadow = true;
  barPullGroup.add(bar);
  // 2 standoffs
  for (const sy of [25 - 2, -25 + 2]) {
    const standoff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 3, 16),
      matChrome(),
    );
    standoff.rotation.x = Math.PI / 2;
    standoff.position.set(handleX, handleY + sy, handleZ_exploded - 1.5);
    barPullGroup.add(standoff);
  }
  dashedConnector(scene,
    new THREE.Vector3(handleX, handleY, handleZ_exploded),
    new THREE.Vector3(handleX, handleY, handleZ_assembled));
  annotItems.push({
    anchor: new THREE.Vector3(handleX, handleY, handleZ_exploded),
    label: 'Bar Pull SS Ø22×500',
    partId: 'bar-pull',
  });

  // ════════════════════════════════════════════════════
  // 6. LOCKSET (Mortise + Faceplate) — flies right (latch side)
  // ════════════════════════════════════════════════════
  const locksetGroup = new THREE.Group();
  locksetGroup.userData.partId = 'lockset';
  scene.add(locksetGroup);

  const lockX_assembled = DW / 2 + 0.5;
  const lockX_exploded = lockX_assembled + LOCKSET_OUT;
  const lockY = -8;
  // Mortise body
  const mortise = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 18, 2.4),
    matSS(0.4, 1.0),
  );
  mortise.position.set(lockX_exploded, lockY, 0);
  locksetGroup.add(mortise);
  // Faceplate
  const faceplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 25, 3.0),
    matSS(0.2, 1.0),
  );
  faceplate.position.set(lockX_exploded - 0.95, lockY, 0);
  locksetGroup.add(faceplate);
  dashedConnector(scene,
    new THREE.Vector3(lockX_exploded, lockY, 0),
    new THREE.Vector3(lockX_assembled, lockY, 0));
  annotItems.push({
    anchor: new THREE.Vector3(lockX_exploded, lockY, 0),
    label: 'Mortise X-Ray + Faceplate 250mm',
    partId: 'lockset',
  });

  // ════════════════════════════════════════════════════
  // 7. HINGES (3×) — fly left (hinge edge)
  // ════════════════════════════════════════════════════
  const hingesGroup = new THREE.Group();
  hingesGroup.userData.partId = 'hinges';
  scene.add(hingesGroup);

  const hingeX_assembled = -DW / 2;
  const hingeX_exploded = hingeX_assembled - HINGES_OUT;
  const hingeYs = [DH / 2 - 18, 0, -DH / 2 + 18]; // 3 hinges
  hingeYs.forEach((hy, i) => {
    const hingeGroup = new THREE.Group();
    // Door-side leaf
    const leafD = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 6, DT * 0.85),
      matSS(0.2, 1.0),
    );
    leafD.position.set(hingeX_exploded - 1, hy, 0);
    hingeGroup.add(leafD);
    // Frame-side leaf
    const leafF = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 6, FD * 0.7),
      matSS(0.2, 1.0),
    );
    leafF.position.set(hingeX_exploded - 1, hy, -DT / 2 - FD / 4);
    hingeGroup.add(leafF);
    // Pin
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 7, 12),
      matSS(0.15, 1.0),
    );
    pin.position.set(hingeX_exploded - 0.4, hy, -DT / 4);
    hingeGroup.add(pin);
    hingesGroup.add(hingeGroup);

    dashedConnector(scene,
      new THREE.Vector3(hingeX_exploded - 1, hy, 0),
      new THREE.Vector3(hingeX_assembled, hy, 0));

    if (i === 0) {
      annotItems.push({
        anchor: new THREE.Vector3(hingeX_exploded - 4, hy, 0),
        label: `Hinge ${i + 1}/3 (5-knuckle butt)`,
        partId: 'hinges',
      });
    }
  });

  // ════════════════════════════════════════════════════
  // 8. KICKPLATE — flies down
  // ════════════════════════════════════════════════════
  const kickplateGroup = new THREE.Group();
  kickplateGroup.userData.partId = 'kickplate';
  scene.add(kickplateGroup);

  const KPH = 26; // kickplate height
  const kpY_assembled = -DH / 2 + KPH / 2 + 1;
  const kpY_exploded = kpY_assembled - KICKPLATE_DOWN;
  const kp = new THREE.Mesh(
    new THREE.BoxGeometry(DW - 4, KPH, 0.6),
    matSS(0.18, 1.0),
  );
  kp.position.set(0, kpY_exploded, DT / 2 + 0.32);
  kickplateGroup.add(kp);
  dashedConnector(scene,
    new THREE.Vector3(0, kpY_exploded, DT / 2 + 0.32),
    new THREE.Vector3(0, kpY_assembled, DT / 2 + 0.32));
  annotItems.push({
    anchor: new THREE.Vector3(0, kpY_exploded, DT / 2 + 0.32),
    label: 'Kickplate SS (260mm)',
    partId: 'kickplate',
  });

  // ════════════════════════════════════════════════════
  // 9. DROP SEAL — di bawah panel kerangka
  // ════════════════════════════════════════════════════
  const dropSealGroup = new THREE.Group();
  dropSealGroup.userData.partId = 'drop-seal';
  scene.add(dropSealGroup);

  const dsY_assembled = -DH / 2;
  const dsY_exploded = dsY_assembled - 25;
  const ds = new THREE.Mesh(
    new THREE.BoxGeometry(DW - 4, 1.2, DT - 0.5),
    matSS(0.25, 1.0),
  );
  ds.position.set(0, dsY_exploded, 0);
  dropSealGroup.add(ds);
  // Sweep
  const sweep = new THREE.Mesh(
    new THREE.BoxGeometry(DW - 6, 0.5, DT - 1),
    matRubber(),
  );
  sweep.position.set(0, dsY_exploded - 0.85, 0);
  dropSealGroup.add(sweep);
  dashedConnector(scene,
    new THREE.Vector3(0, dsY_exploded, 0),
    new THREE.Vector3(0, dsY_assembled + 0.5, 0));
  annotItems.push({
    anchor: new THREE.Vector3(0, dsY_exploded - 1, 0),
    label: 'Drop Seal + Activation Pin',
    partId: 'drop-seal',
  });

  // ════════════════════════════════════════════════════
  // 10. EPDM GASKET — perimeter compression seal
  //     ADDED 2026-05-25: was missing in exploded view (Bug 3 sync issue).
  //     Floats to door FRONT (+Z) so all 4 strips are visible as a frame.
  // ════════════════════════════════════════════════════
  const gasketGroup = new THREE.Group();
  gasketGroup.userData.partId = 'gasket';
  scene.add(gasketGroup);

  const gT = 0.6;
  const gFlangeZ = 0.4;
  const gInset = 0.5;
  const gZ_exploded = DT / 2 + 28; // float forward of door
  // Top
  const gTop = new THREE.Mesh(new THREE.BoxGeometry(DW - 1, gT, gFlangeZ), matRubber());
  gTop.position.set(0, DH / 2 - gInset - gT / 2, gZ_exploded);
  gasketGroup.add(gTop);
  // Bottom
  const gBot = new THREE.Mesh(new THREE.BoxGeometry(DW - 1, gT, gFlangeZ), matRubber());
  gBot.position.set(0, -DH / 2 + gInset + gT / 2, gZ_exploded);
  gasketGroup.add(gBot);
  // Hinge-side
  const gLeft = new THREE.Mesh(new THREE.BoxGeometry(gT, DH - 2, gFlangeZ), matRubber());
  gLeft.position.set(-DW / 2 + gInset + gT / 2, 0, gZ_exploded);
  gasketGroup.add(gLeft);
  // Latch-side
  const gRight = new THREE.Mesh(new THREE.BoxGeometry(gT, DH - 2, gFlangeZ), matRubber());
  gRight.position.set(DW / 2 - gInset - gT / 2, 0, gZ_exploded);
  gasketGroup.add(gRight);

  dashedConnector(scene,
    new THREE.Vector3(0, 0, gZ_exploded),
    new THREE.Vector3(0, 0, DT / 2));
  annotItems.push({
    anchor: new THREE.Vector3(0, 0, gZ_exploded),
    label: 'EPDM Perimeter Gasket',
    partId: 'gasket',
  });

  // ════════════════════════════════════════════════════
  // 11. LEAD CONTINUITY STRIPES — 2 mm Pb wrap edges
  //     ADDED 2026-05-25: was missing in exploded view (Bug 3 sync issue).
  //     Floats to door BACK (-Z) so the 2 mm Pb edge wrap reads clearly
  //     as 4 separate strips wrapping the door perimeter.
  // ════════════════════════════════════════════════════
  const leadStripesGroup = new THREE.Group();
  leadStripesGroup.userData.partId = 'lead-stripes';
  scene.add(leadStripesGroup);

  const lsZ_exploded = -DT / 2 - 35;
  const stripT = 0.2;
  const stripW = 0.8;
  // Top strip
  const lsTop = new THREE.Mesh(new THREE.BoxGeometry(DW, stripW, stripT), matLead());
  lsTop.position.set(0, DH / 2 - stripW / 2, lsZ_exploded);
  leadStripesGroup.add(lsTop);
  // Bottom strip
  const lsBot = new THREE.Mesh(new THREE.BoxGeometry(DW, stripW, stripT), matLead());
  lsBot.position.set(0, -DH / 2 + stripW / 2, lsZ_exploded);
  leadStripesGroup.add(lsBot);
  // Hinge-edge strip
  const lsLeft = new THREE.Mesh(new THREE.BoxGeometry(stripW, DH, stripT), matLead());
  lsLeft.position.set(-DW / 2 + stripW / 2, 0, lsZ_exploded);
  leadStripesGroup.add(lsLeft);
  // Latch-edge strip
  const lsRight = new THREE.Mesh(new THREE.BoxGeometry(stripW, DH, stripT), matLead());
  lsRight.position.set(DW / 2 - stripW / 2, 0, lsZ_exploded);
  leadStripesGroup.add(lsRight);

  dashedConnector(scene,
    new THREE.Vector3(0, 0, lsZ_exploded),
    new THREE.Vector3(0, 0, -DT / 2));
  annotItems.push({
    anchor: new THREE.Vector3(0, DH / 2 - 1, lsZ_exploded),
    label: '2 mmPb edge continuity',
    partId: 'lead-stripes',
  });

  // ── Annotations ──
  placeAnnotations(
    scene,
    annotItems,
    DW / 2 + HANDLE_FORWARD + 50,
    [-DH / 2 - KICKPLATE_DOWN - 30, DH / 2 + CLOSER_UP + 30],
  );
}

// ── React component ───────────────────────────────────
export function PbLeadDoorExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );
  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 100,
      maxDistance: 1500,
    },
    onInit: (refs) => {
      buildExplodedScene(refs.scene, refs.renderer, product.layers);
      const [px, py, pz] = product.explodedCameraStart;
      applyCameraPreset(refs, [px, py, pz], [0, 0, 0]);
      attachHighlight(refs);
    },
    deps: [product],
  });

  const goTo = (p: CameraPreset) => {
    if (refsRef.current) animateCameraTo(refsRef.current, p.position, p.target, 600);
    setActivePreset(p.name);
  };
  const dl = (name: string) =>
    refsRef.current && downloadPNG(
      refsRef.current.renderer,
      `${product.id}-exploded-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
    );
  const dlAll = () =>
    product.cameraPresets.forEach((p, i) =>
      setTimeout(() => { goTo(p); setTimeout(() => dl(p.name), 700); }, i * 1000),
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
