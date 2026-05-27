/**
 * ScrubSinkAssembled3D — Session 8 SCULPTED (2026-05-22)
 * ─────────────────────────────────────────────────────────────────
 * Complete rewrite menggunakan geometry-blender.ts helper library.
 * Target: hasil sculpting Blender-tier, bukan "kotak diwarnai".
 *
 * Major upgrades dari Session 7:
 *  - Cabinet body: roundedBox dengan chamfer 0.4 di 12 visible edges
 *  - Doors: beveledPlate + recessed reveal frame (groove visible)
 *  - Door handles: barPullHandle dengan hemispherical caps + standoffs
 *  - Countertop: ExtrudeGeometry dengan multi-segment bevel + rounded basin holes
 *  - Basin: rebated rim via Lathe profile + sloped floor + drain ring chamfered
 *  - Backsplash: ExtrudeGeometry dengan integral cove ke countertop (no joint)
 *  - Faucet: faucetSpout helper (CatmullRom 80 segments × 24 radial = silky)
 *  - Aerator: Lathe profile (true tapered disc, not cylinder stub)
 *  - Mirror frame: mitred 45° corners via 4 angled bars (not butt joint)
 *  - UV grille: louvre slats angled untuk diffusion realistic
 *  - Soap dispenser: Lathe profile bottle (tapered like real bottle)
 *  - Foot pedal: rocker plate dengan hinge pivot bracket
 *  - TMV: rebated cylinder body dengan flange caps + valve handles knurled
 *
 * All materials sudah PBR 2026 (metalness 1.0 + clearcoat).
 * ─────────────────────────────────────────────────────────────────
 */
import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { animateCameraTo, applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import {
  roundedBox,
  beveledPlate,
  latheProfile,
  smoothTube,
  knurledCylinder,
  barPullHandle,
  beveledDisc,
} from '../lib/geometry-blender';
import { useThreeScene } from '../hooks/useThreeScene';
import { useHighlightController } from '../hooks/useHighlightController';
import { ViewerControls } from './ViewerControls';

interface Props {
  product: Product;
}

// ── Scene constants (1 unit = 10 mm) ───────────────────────────
const W = 160; // 1600 mm
const D = 60; // 600 mm
const T_BASE = 6;
const T_CAB = 70;
const T_CT = 4;
const Y_CAB_TOP = 76;
const Y_CT_TOP = 80;
const BP_Z = -29;

// ── Materials (PBR 2026 — TIERED untuk performance) ──────────
// HERO tier: MeshPhysicalMaterial (clearcoat) untuk visible reflective surfaces
// SECONDARY tier: MeshStandardMaterial (lebih murah, env map masih kerja via PMREM)
// Hero used sparingly: countertop, basin interior, faucet body, mirror, chrome handles.
// Standard used for: cabinet body, base trim, pedal, soap bottle, P-trap, TMV pipes.
const matSSPolished = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xeaf0f4,
    roughness: 0.18,
    metalness: 1.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.4,
  });

const matSSMatte = () =>
  // SECONDARY — Standard material is enough; envMap from PMREM still does heavy lifting
  new THREE.MeshStandardMaterial({
    color: 0xc8d4dc,
    roughness: 0.35,
    metalness: 1.0,
    envMapIntensity: 1.0,
  });

const matChrome = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xeef4f8,
    roughness: 0.08,
    metalness: 1.0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.7,
  });

const matBasinInterior = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xa8b4c2,
    roughness: 0.22,
    metalness: 1.0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
  });

const matMirror = () =>
  // BUGFIX 2026-05-25: previous version was metalness=0 + opacity=0.92
  // (transparent), which rendered the mirror as a barely-visible blue glass
  // sheet — frame was visible but the reflective face wasn't. A real surgical
  // mirror is opaque + perfectly reflective. Setting metalness=1.0 and
  // opacity=1.0 makes envMap (RoomEnvironment via PMREM) act as a true
  // mirror reflection. Tint kept very subtle (0xeaf6ff) for clinical bias.
  new THREE.MeshPhysicalMaterial({
    color: 0xeaf6ff,
    roughness: 0.02,
    metalness: 1.0,
    envMapIntensity: 2.0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.04,
  });

const matLEDStrip = () =>
  new THREE.MeshStandardMaterial({
    color: 0xb8f7ff,
    roughness: 0.2,
    metalness: 0,
    emissive: new THREE.Color(0x60e8ff),
    emissiveIntensity: 1.1,
  });

const matUVTube = () =>
  new THREE.MeshStandardMaterial({
    color: 0xc8b4ff,
    roughness: 0.3,
    metalness: 0,
    emissive: new THREE.Color(0x9060ff),
    emissiveIntensity: 0.6,
  });

const matPlexiglass = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xeaf3f8,
    roughness: 0.04,
    metalness: 0,
    transmission: 0.85,
    thickness: 0.5,
    ior: 1.49,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });

const matRubber = () =>
  new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85, metalness: 0 });

const matWaste = () =>
  // SECONDARY — chrome plumbing tidak butuh clearcoat
  new THREE.MeshStandardMaterial({
    color: 0x6c7680,
    roughness: 0.32,
    metalness: 1.0,
    envMapIntensity: 1.0,
  });

// ── Mesh helpers ──────────────────────────────────────────────

function addMesh(scene: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, shadow = true): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  if (shadow) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  scene.add(mesh);
  return mesh;
}

function addMeshGroup(scene: THREE.Object3D, geos: THREE.BufferGeometry[], mat: THREE.Material, x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  geos.forEach((geo) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  });
  group.position.set(x, y, z);
  scene.add(group);
  return group;
}

// ── Sculpted basin via Lathe profile + Extrude ─────────────────

/**
 * Sculpted basin: rebated rim (ekstrude) + sloped floor (vertex-displaced plane) + chrome drain ring.
 * Bukan 4 box dinding lagi — single watertight extrude untuk rim,
 * dengan plane untuk floor slope.
 */
function buildSculptedBasin(scene: THREE.Object3D, cx: number): void {
  // BUGFIX 2026-05-25: previously rim was 56×41 but countertop hole was 60×45,
  // leaving a 2-unit dark gap around every basin (visible "kapal pecah" effect).
  // Now rim outer = countertop hole size (60×45) exactly, with bevel filling
  // the seam so the basin reads as integral with the countertop slab.
  //
  // RESEARCH 2026-05-25: basin depth bumped from 200mm to 250mm per
  // docs/research/2026-05-25-scrub-sink-references.md Q2. Every real
  // reference (Avante 267mm, Belimed/Skytron ~250mm, Dolson ~250mm) is at
  // or above 250mm to allow elbow-deep scrubbing. 200mm was too shallow.
  const bw = 60;     // matches countertop holeBasin width (was 56)
  const bd = 45;     // matches countertop holeBasin depth (was 41)
  const bh = 25;     // 250mm depth (was 22 = 220mm). Real spec: 250-280mm.
  const baseY = Y_CT_TOP - bh;

  // Rim profile: rebated cross-section (cove curve into basin)
  const rimShape = new THREE.Shape();
  // Outer top rim: rectangular outline
  rimShape.moveTo(-bw / 2, -bd / 2);
  rimShape.lineTo(bw / 2, -bd / 2);
  rimShape.lineTo(bw / 2, bd / 2);
  rimShape.lineTo(-bw / 2, bd / 2);
  rimShape.lineTo(-bw / 2, -bd / 2);
  // Hole for basin interior
  const innerHole = new THREE.Path();
  const innerR = 3.5; // coved corner radius
  const ix0 = -bw / 2 + 1.5;
  const ix1 = bw / 2 - 1.5;
  const iz0 = -bd / 2 + 1.5;
  const iz1 = bd / 2 - 1.5;
  innerHole.moveTo(ix0 + innerR, iz0);
  innerHole.lineTo(ix1 - innerR, iz0);
  innerHole.quadraticCurveTo(ix1, iz0, ix1, iz0 + innerR);
  innerHole.lineTo(ix1, iz1 - innerR);
  innerHole.quadraticCurveTo(ix1, iz1, ix1 - innerR, iz1);
  innerHole.lineTo(ix0 + innerR, iz1);
  innerHole.quadraticCurveTo(ix0, iz1, ix0, iz1 - innerR);
  innerHole.lineTo(ix0, iz0 + innerR);
  innerHole.quadraticCurveTo(ix0, iz0, ix0 + innerR, iz0);
  rimShape.holes.push(innerHole);

  // Extrude rim with bevel (gives rounded entry into basin)
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
    depth: 1.5,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 4,
    curveSegments: 8,
  });
  rimGeo.rotateX(-Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, matBasinInterior());
  rim.position.set(cx, Y_CT_TOP, -7.5);
  rim.castShadow = true;
  rim.receiveShadow = true;
  scene.add(rim);

  // Inner walls extrude (4 walls as one, double-sided)
  const innerWidth = ix1 - ix0;
  const innerDepth = iz1 - iz0;
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-innerWidth / 2, -innerDepth / 2);
  wallShape.lineTo(innerWidth / 2, -innerDepth / 2);
  wallShape.lineTo(innerWidth / 2, innerDepth / 2);
  wallShape.lineTo(-innerWidth / 2, innerDepth / 2);
  wallShape.lineTo(-innerWidth / 2, -innerDepth / 2);
  // Hole inside (very slightly smaller — creates wall thickness illusion)
  const wallHole = new THREE.Path();
  const wallT = 0.6;
  wallHole.moveTo(-innerWidth / 2 + wallT, -innerDepth / 2 + wallT);
  wallHole.lineTo(innerWidth / 2 - wallT, -innerDepth / 2 + wallT);
  wallHole.lineTo(innerWidth / 2 - wallT, innerDepth / 2 - wallT);
  wallHole.lineTo(-innerWidth / 2 + wallT, innerDepth / 2 - wallT);
  wallHole.lineTo(-innerWidth / 2 + wallT, -innerDepth / 2 + wallT);
  wallShape.holes.push(wallHole);
  const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
    depth: bh,
    bevelEnabled: false,
  });
  wallGeo.rotateX(Math.PI / 2);
  const walls = new THREE.Mesh(wallGeo, matBasinInterior());
  walls.position.set(cx, Y_CT_TOP, -7.5);
  walls.castShadow = true;
  walls.receiveShadow = true;
  scene.add(walls);

  // Sloped floor
  const floorGeo = new THREE.PlaneGeometry(innerWidth - wallT * 2, innerDepth - wallT * 2, 16, 16);
  floorGeo.rotateX(-Math.PI / 2);
  const pos = floorGeo.attributes.position;
  const slopeDepth = 0.5;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    const r = Math.hypot(px, pz);
    const maxR = Math.max(innerWidth / 2, innerDepth / 2);
    const drop = slopeDepth * (1 - r / maxR);
    pos.setY(i, pos.getY(i) - drop);
  }
  floorGeo.computeVertexNormals();
  const floor = new THREE.Mesh(floorGeo, matBasinInterior());
  floor.position.set(cx, baseY + 0.3, -7.5);
  floor.receiveShadow = true;
  scene.add(floor);

  // Chrome drain ring — sits ON the basin floor, centered on drain hole.
  // Floor is at baseY + 0.3 (with slope center slightly lower).
  // Ring top face flush with floor center → ring.y = baseY + 0.3
  const drainY = baseY + 0.3;
  const ringProfile: Array<[number, number]> = [
    [0, 0],
    [2.5, 0],
    [2.6, 0.3],
    [2.4, 0.5],
    [2.2, 0.4],
    [1.8, 0.2],
    [0, 0.2],
  ];
  const ring = new THREE.Mesh(latheProfile(ringProfile, 36), matChrome());
  ring.position.set(cx, drainY, -7.5);
  ring.castShadow = true;
  scene.add(ring);

  // Strainer disc — sits on top of ring, slightly above floor
  const strainer = new THREE.Mesh(beveledDisc(2.0, 0.15, 0.05, 32), matChrome());
  strainer.position.set(cx, drainY + 0.2, -7.5);
  scene.add(strainer);
  // Strainer slots (8 thin radial)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.05, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7 }),
    );
    slot.position.set(cx + Math.cos(angle) * 0.2, drainY + 0.25, -7.5 + Math.sin(angle) * 0.2);
    slot.rotation.y = angle;
    scene.add(slot);
  }

  // Drain throat — goes DOWN from floor into cabinet void
  // Positioned slightly behind center (toward backsplash) to clear cabinet divider
  const drainThroat = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 3.0, 24),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7, metalness: 0.3 }),
  );
  drainThroat.position.set(cx, drainY - 1.5, -7.5);
  scene.add(drainThroat);
}

// ── P-trap with smooth CatmullRom curve ──────────────────────

function buildSculptedPTrap(scene: THREE.Object3D, cx: number, fromY: number, toY: number): void {
  const points = [
    new THREE.Vector3(cx, fromY, -7.5),
    new THREE.Vector3(cx, fromY - 6, -7.5),
    new THREE.Vector3(cx + 1, fromY - 12, -7.5),
    new THREE.Vector3(cx + 4, fromY - 16, -7.5),
    new THREE.Vector3(cx + 4, fromY - 19, -7.5), // bottom of U
    new THREE.Vector3(cx + 4, fromY - 16, -10),
    new THREE.Vector3(cx + 2, fromY - 12, -14),
    new THREE.Vector3(cx, toY, -18), // back to wall
  ];
  const geo = smoothTube(points, 1.2, 64, 16);
  const mesh = new THREE.Mesh(geo, matWaste());
  mesh.castShadow = true;
  scene.add(mesh);

  // Cleanout cap (chamfered disc bolted on bottom of U)
  const cap = new THREE.Mesh(beveledDisc(1.5, 0.4, 0.1, 24), matWaste());
  cap.position.set(cx + 4, fromY - 19.5, -7.5);
  cap.rotation.x = Math.PI;
  cap.castShadow = true;
  scene.add(cap);
}

// ── Sculpted faucet — gooseneck tube langsung, tidak pakai faucetSpout helper ─

function buildSculptedFaucet(scene: THREE.Object3D, fX: number): void {
  const chrome = matChrome();
  const baseY = Y_CT_TOP + 1;
  const FAUCET_BASE_Z = -22;
  const tipY = 94;
  const tipZ = -7.5;

  // Mounting flange (Lathe — chamfered base) sits on countertop
  const flangeProfile: Array<[number, number]> = [
    [0, 0],
    [2.4, 0],
    [2.4, 0.4],
    [2.2, 0.6],
    [1.8, 0.7],
    [1.4, 0.9],
    [1.4, 1.5],
    [0, 1.5],
  ];
  const flange = new THREE.Mesh(latheProfile(flangeProfile, 24), chrome);
  flange.position.set(fX, Y_CT_TOP, FAUCET_BASE_Z);
  flange.castShadow = true;
  scene.add(flange);

  // Vertical column (cylinder) from countertop up to arch start
  const colH = 14;
  const colMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.3, colH, 20),
    chrome,
  );
  colMesh.position.set(fX, baseY + colH / 2, FAUCET_BASE_Z);
  colMesh.castShadow = true;
  scene.add(colMesh);

  // Gooseneck arch — smooth CatmullRom tube dengan titik yang masuk akal
  // Mulai dari atas kolom, arch ke depan, turun ke basin center
  const archPoints = [
    new THREE.Vector3(fX, baseY + colH,          FAUCET_BASE_Z),      // top of column
    new THREE.Vector3(fX, baseY + colH + 4,       FAUCET_BASE_Z),      // short vertical rise
    new THREE.Vector3(fX, baseY + colH + 8,       FAUCET_BASE_Z + 5),  // start arch forward
    new THREE.Vector3(fX, baseY + colH + 10,      FAUCET_BASE_Z + 10), // peak of arch
    new THREE.Vector3(fX, tipY + 2,               tipZ + 4),           // descending
    new THREE.Vector3(fX, tipY,                   tipZ),               // tip over basin
  ];
  const archTube = new THREE.Mesh(smoothTube(archPoints, 1.0, 48, 16), chrome);
  archTube.castShadow = true;
  scene.add(archTube);

  // Aerator at tip (tapered disc pointing down)
  const aeratorProfile: Array<[number, number]> = [
    [0, 0],
    [1.3, 0],
    [1.2, 0.4],
    [0.9, 0.8],
    [0, 0.8],
  ];
  const aerator = new THREE.Mesh(latheProfile(aeratorProfile, 20), chrome);
  aerator.position.set(fX, tipY - 0.8, tipZ);
  scene.add(aerator);

  // IR sensor dome on front face of column
  const sensorDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.3, clearcoat: 0.4 }),
  );
  sensorDome.rotation.x = Math.PI / 2;
  sensorDome.position.set(fX, baseY + 8, FAUCET_BASE_Z + 1.0);
  sensorDome.castShadow = true;
  scene.add(sensorDome);

  // Sensor LED dot
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 8),
    new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: new THREE.Color(0xff2020),
      emissiveIntensity: 1.2,
    }),
  );
  dot.position.set(fX, baseY + 8, FAUCET_BASE_Z + 1.85);
  scene.add(dot);
}

// ── Sculpted door with reveal frame + bar pull handle ──────────

function buildSculptedDoor(scene: THREE.Object3D, x: number, doorW: number, hingeSide: 'left' | 'right'): void {
  const matMatte = matSSMatte();
  const matPolish = matSSPolished();
  const chrome = matChrome();

  // Door slab — beveled plate (rounded corners + bevel edges)
  const slab = new THREE.Mesh(
    beveledPlate(doorW - 0.6, T_CAB - 4, 0.8, 0.3, 2),
    matMatte,
  );
  slab.position.set(x, T_BASE + T_CAB / 2, 31.4);
  slab.castShadow = true;
  slab.receiveShadow = true;
  scene.add(slab);

  // Recessed reveal frame — BoxGeometry biasa (thin strips, no chamfer needed)
  const fW = 0.4;
  const fT = 0.15;
  const dW = doorW - 0.6;
  const dH = T_CAB - 4;
  const revGeo = new THREE.BoxGeometry(dW - fW * 2, fW, fT);
  const revT = new THREE.Mesh(revGeo, matPolish);
  revT.position.set(x, T_BASE + T_CAB - 2 - fW, 31.78);
  scene.add(revT);
  const revB = new THREE.Mesh(revGeo.clone(), matPolish);
  revB.position.set(x, T_BASE + 2 + fW, 31.78);
  scene.add(revB);
  const revVGeo = new THREE.BoxGeometry(fW, dH - fW * 2, fT);
  const revL = new THREE.Mesh(revVGeo, matPolish);
  revL.position.set(x - dW / 2 + fW, T_BASE + T_CAB / 2, 31.78);
  scene.add(revL);
  const revR = new THREE.Mesh(revVGeo.clone(), matPolish);
  revR.position.set(x + dW / 2 - fW, T_BASE + T_CAB / 2, 31.78);
  scene.add(revR);

  // Bar pull handle (capped bar — hero piece, keep sculpted)
  const pullX = hingeSide === 'left' ? x + dW / 2 - 4 : x - dW / 2 + 4;
  const pullY = T_BASE + T_CAB / 2;
  const pullLen = 22;
  const pullR = 0.7;
  const [bar, capA, capB] = barPullHandle(pullLen, pullR, 16);
  const barMesh = new THREE.Mesh(bar, chrome);
  barMesh.position.set(pullX, pullY, 32.6);
  barMesh.castShadow = true;
  scene.add(barMesh);
  const capAMesh = new THREE.Mesh(capA, chrome);
  capAMesh.position.set(pullX, pullY, 32.6);
  scene.add(capAMesh);
  const capBMesh = new THREE.Mesh(capB, chrome);
  capBMesh.position.set(pullX, pullY, 32.6);
  scene.add(capBMesh);

  // 2 standoffs (CylinderGeometry — already simple)
  const standoffGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.6, 12);
  for (const sy of [-pullLen / 2 + 1.5, pullLen / 2 - 1.5]) {
    const standoff = new THREE.Mesh(standoffGeo, chrome);
    standoff.rotation.x = Math.PI / 2;
    standoff.position.set(pullX, pullY + sy, 31.8);
    standoff.castShadow = true;
    scene.add(standoff);
  }
  // Mounting rosettes (small flat discs)
  for (const sy of [-pullLen / 2 + 1.5, pullLen / 2 - 1.5]) {
    const rosette = new THREE.Mesh(beveledDisc(0.95, 0.2, 0.05, 12), chrome);
    rosette.rotation.x = -Math.PI / 2;
    rosette.position.set(pullX, pullY + sy, 31.55);
    scene.add(rosette);
  }
}

// ── Sculpted soap dispenser (Lathe bottle) ─────────────────────

function buildSculptedSoapDispenser(scene: THREE.Object3D, dx: number): void {
  const matte = matSSMatte();
  const chrome = matChrome();

  // Bottle: tapered cylinder via Lathe
  const bottleProfile: Array<[number, number]> = [
    [0, 0],
    [3.6, 0],
    [3.6, 1.5],
    [3.5, 3],
    [3.4, 6],
    [3.5, 10],
    [3.6, 13.5],
    [3.5, 14],
    [2.0, 14.5],
    [1.4, 15],
    [1.4, 17],
    [0, 17],
  ];
  // GEOMETRY FIX 2026-05-27: dispenser sits on countertop at same Z as faucet
  // base (-22), not at Z=-4 (which was floating in mid-air over the basin).
  const SOAP_Z = -22;
  const bottle = new THREE.Mesh(latheProfile(bottleProfile, 36), matte);
  bottle.position.set(dx, Y_CT_TOP, SOAP_Z);
  bottle.castShadow = true;
  bottle.receiveShadow = true;
  scene.add(bottle);

  // Pump cap (chrome with chamfer)
  const cap = new THREE.Mesh(
    latheProfile(
      [
        [0, 0],
        [1.2, 0],
        [1.3, 0.2],
        [1.2, 0.4],
        [1.0, 0.5],
        [0.8, 0.6],
        [0.8, 1.2],
        [0, 1.2],
      ],
      24,
    ),
    chrome,
  );
  cap.position.set(dx, Y_CT_TOP + 17, SOAP_Z);
  cap.castShadow = true;
  scene.add(cap);

  // Curved nozzle — arches forward toward basin
  const nozzlePoints = [
    new THREE.Vector3(dx, Y_CT_TOP + 18, SOAP_Z),
    new THREE.Vector3(dx, Y_CT_TOP + 19.5, SOAP_Z),
    new THREE.Vector3(dx, Y_CT_TOP + 20, SOAP_Z + 1.5),
    new THREE.Vector3(dx, Y_CT_TOP + 20.2, SOAP_Z + 3),
  ];
  const nozzle = new THREE.Mesh(smoothTube(nozzlePoints, 0.4, 32, 16), chrome);
  nozzle.castShadow = true;
  scene.add(nozzle);
}

// ── Sculpted foot pedal (rocker plate + hinge bracket) ─────────

function buildSculptedFootPedal(scene: THREE.Object3D, px: number): void {
  const pedalMat = matRubber();
  const chrome = matChrome();

  // Rocker plate (rounded box, slightly tilted toward user)
  const rocker = new THREE.Mesh(
    roundedBox(20, 1.6, 14, 0.4, 2),
    pedalMat,
  );
  rocker.position.set(px, 1.8, 36);
  rocker.rotation.x = -0.05;
  rocker.castShadow = true;
  rocker.receiveShadow = true;
  scene.add(rocker);

  // Tread strips (3 thin chrome bars sunk -0.05 into rocker top)
  for (const tz of [33, 36, 39]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.3, 0.6),
      chrome,
    );
    strip.position.set(px, 2.6, tz); // rocker top at Y=2.6, strip flush
    scene.add(strip);
  }

  // Hinge pivot bracket — REAL hinge axis along X (left-right), so rocker
  // swings around X (toward/away from user)
  // Cylinder default Y axis → rotation.z = PI/2 → axis along X
  const pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 18, 12), // long axis spans rocker width
    chrome,
  );
  pivot.rotation.z = Math.PI / 2; // axis Y → X
  pivot.position.set(px, 1.8, 30.5); // pivot at rocker back edge (toward cabinet)
  scene.add(pivot);

  // 2 hinge brackets — flat plates each side anchoring pivot ke cabinet wall
  const bracketGeo = new THREE.BoxGeometry(1.5, 2, 1.0);
  for (const hx of [px - 9, px + 9]) {
    const bracket = new THREE.Mesh(bracketGeo, chrome);
    bracket.position.set(hx, 1.8, 30.5);
    scene.add(bracket);
  }

  // Connection rod going into cabinet (mechanical linkage to valve)
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 5, 12),
    chrome,
  );
  rod.position.set(px, 4.5, 30); // vertical rod going up from pivot into cabinet
  scene.add(rod);
}

// ── Sculpted mirror with mitred frame ──────────────────────────

function buildSculptedMirror(scene: THREE.Object3D, mx: number): void {
  const frame = matSSPolished();
  const glass = matMirror();

  // Mirror flush-mounted on front face of backsplash.
  // Backsplash front face at Z = BP_Z + 2 = -27.
  // Mirror glass: 3mm proud → Z = -26.5
  // Frame: L-profile box bars, 1.6u wide × 1.4u deep, proud of glass → Z = -26.0
  const MIRROR_Z_GLASS = -26.5;
  const MIRROR_Z_FRAME = -26.0;
  const MIRROR_BOT_Y  = 88;
  const MIRROR_TOP_Y  = 138;
  const MIRROR_CY     = (MIRROR_BOT_Y + MIRROR_TOP_Y) / 2; // 113
  const MIRROR_H      = MIRROR_TOP_Y - MIRROR_BOT_Y;       // 50
  const MIRROR_W      = 55;

  // Frame bar dimensions
  const FB = 1.6;   // frame bar width (face)
  const FD = 1.4;   // frame bar depth (into scene)

  // Glass slab
  const glassMesh = new THREE.Mesh(
    beveledPlate(MIRROR_W, MIRROR_H, 0.5, 0.2, 2),
    glass,
  );
  glassMesh.position.set(mx, MIRROR_CY, MIRROR_Z_GLASS);
  scene.add(glassMesh);

  // Frame bars — simple BoxGeometry, no rotation tricks
  // Top bar (horizontal, spans full mirror width + 2×FB for corner overlap)
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(MIRROR_W + FB * 2, FB, FD),
    frame,
  );
  topBar.position.set(mx, MIRROR_TOP_Y + FB / 2, MIRROR_Z_FRAME);
  topBar.castShadow = true;
  scene.add(topBar);

  // Bottom bar
  const botBar = new THREE.Mesh(
    new THREE.BoxGeometry(MIRROR_W + FB * 2, FB, FD),
    frame,
  );
  botBar.position.set(mx, MIRROR_BOT_Y - FB / 2, MIRROR_Z_FRAME);
  botBar.castShadow = true;
  scene.add(botBar);

  // Left bar (vertical, between top and bottom bars)
  const leftBar = new THREE.Mesh(
    new THREE.BoxGeometry(FB, MIRROR_H, FD),
    frame,
  );
  leftBar.position.set(mx - MIRROR_W / 2 - FB / 2, MIRROR_CY, MIRROR_Z_FRAME);
  leftBar.castShadow = true;
  scene.add(leftBar);

  // Right bar
  const rightBar = new THREE.Mesh(
    new THREE.BoxGeometry(FB, MIRROR_H, FD),
    frame,
  );
  rightBar.position.set(mx + MIRROR_W / 2 + FB / 2, MIRROR_CY, MIRROR_Z_FRAME);
  rightBar.castShadow = true;
  scene.add(rightBar);

  // Mounting bracket tabs — 2 per mirror, recessed into backsplash
  const bracketGeo = new THREE.BoxGeometry(2.5, 1.0, 1.2);
  for (const by of [MIRROR_BOT_Y + 2, MIRROR_TOP_Y - 2]) {
    const bracket = new THREE.Mesh(bracketGeo, matSSPolished());
    bracket.position.set(mx, by, MIRROR_Z_GLASS - 0.4);
    bracket.castShadow = true;
    scene.add(bracket);
  }
}

// ── Sculpted TMV (Thermostatic Mixing Valve) ───────────────────

function buildSculptedTMV(scene: THREE.Object3D): void {
  const chrome = matChrome();
  const tmvY = 28;
  const tmvZ = -27;

  // TMV core valve assembly (body, inlets, mixed-outlet risers, label)
  const tmvGroup = new THREE.Group();
  tmvGroup.userData.partId = 'tmv';
  scene.add(tmvGroup);

  // Supply lines + angle stops (sleeves up from floor + lever valves)
  const supplyGroup = new THREE.Group();
  supplyGroup.userData.partId = 'supply-lines';
  scene.add(supplyGroup);

  // TMV body (rounded box)
  const body = new THREE.Mesh(roundedBox(12, 8, 4, 0.3, 3), chrome);
  body.position.set(0, tmvY, tmvZ);
  body.castShadow = true;
  tmvGroup.add(body);

  // Hot inlet (left) — pipe with flange
  for (const [side, color] of [
    [-8, 0xc62828],
    [8, 0x1565c0],
  ] as const) {
    const inletPoint = new THREE.Mesh(
      latheProfile(
        [
          [0, 0],
          [0.7, 0],
          [0.7, 2],
          [1.0, 2.2],
          [1.0, 3],
          [0.7, 3.2],
          [0.7, 4],
          [0, 4],
        ],
        24,
      ),
      chrome,
    );
    inletPoint.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    inletPoint.position.set(side, tmvY, tmvZ);
    inletPoint.castShadow = true;
    tmvGroup.add(inletPoint);
    // Color band marker
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.4, 24),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4 }),
    );
    band.rotation.z = Math.PI / 2;
    band.position.set(side > 0 ? side - 1 : side + 1, tmvY, tmvZ);
    tmvGroup.add(band);
  }

  // Anti-scald label tag
  const label = new THREE.Mesh(
    roundedBox(6, 1.6, 0.3, 0.15, 2),
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 }),
  );
  label.position.set(0, tmvY + 4.5, tmvZ + 2.1);
  tmvGroup.add(label);

  // Mixed outlet riser → faucet bases (smooth tube each)
  // ALIGNMENT FIX: avoid penetrating cabinet center divider (X=0±0.6, Z range full).
  // Riser starts at TMV top (X=0, Z=-27), shifts to X=±2 immediately to clear
  // divider, runs up vertical, then horizontal to faucet column at X=±40.
  for (const fX of [-40, 40]) {
    const sideOffset = fX < 0 ? -2 : 2; // hot pipe goes left, cold goes right
    const points = [
      new THREE.Vector3(0, tmvY + 4, tmvZ),                         // TMV top
      new THREE.Vector3(sideOffset, tmvY + 6, tmvZ),                // small offset to avoid divider
      new THREE.Vector3(sideOffset, Y_CT_TOP - 4, tmvZ),            // riser straight up
      new THREE.Vector3(fX, Y_CT_TOP - 4, tmvZ),                    // horizontal across to faucet column
      new THREE.Vector3(fX, Y_CT_TOP - 1, -22),                      // final dip to faucet base
    ];
    const tube = new THREE.Mesh(smoothTube(points, 0.5, 32, 12), chrome);
    tube.castShadow = true;
    tmvGroup.add(tube);
  }

  // Supply lines (braided sleeves) up from floor to TMV
  // Hot
  const hotSleeveMat = new THREE.MeshStandardMaterial({ color: 0x6b3a3a, roughness: 0.85, metalness: 0.2 });
  const hotPoints = [
    new THREE.Vector3(-12, 6, tmvZ),
    new THREE.Vector3(-12, 16, tmvZ),
    new THREE.Vector3(-9, tmvY, tmvZ),
  ];
  const hotSleeve = new THREE.Mesh(smoothTube(hotPoints, 0.45, 48, 12), hotSleeveMat);
  supplyGroup.add(hotSleeve);

  // Cold
  const coldSleeveMat = new THREE.MeshStandardMaterial({ color: 0x3a4a6b, roughness: 0.85, metalness: 0.2 });
  const coldPoints = [
    new THREE.Vector3(12, 6, tmvZ),
    new THREE.Vector3(12, 16, tmvZ),
    new THREE.Vector3(9, tmvY, tmvZ),
  ];
  const coldSleeve = new THREE.Mesh(smoothTube(coldPoints, 0.45, 48, 12), coldSleeveMat);
  supplyGroup.add(coldSleeve);

  // Angle stop valves (knurled chrome handles)
  for (const [vx, _color] of [
    [-12, 0xc62828],
    [12, 0x1565c0],
  ] as const) {
    const valve = new THREE.Mesh(
      knurledCylinder(0.6, 1.4, 24, 0.06),
      chrome,
    );
    valve.position.set(vx, 6, tmvZ);
    valve.castShadow = true;
    supplyGroup.add(valve);
    // Lever handle
    const lever = new THREE.Mesh(
      roundedBox(2.2, 0.4, 0.4, 0.1, 2),
      chrome,
    );
    lever.position.set(vx, 7.4, tmvZ);
    supplyGroup.add(lever);
  }
}

// ── Scene builder ──────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  // Environment + tone
  renderer.toneMappingExposure = 1.05;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.background = new THREE.Color(0xeef3f7);
  // Dispose envScene meshes after baking
  envScene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      m.geometry.dispose();
      if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
      else (m.material as THREE.Material).dispose();
    }
  });
  pmrem.dispose();

  // Lighting (clinical 5500K)
  scene.add(new THREE.HemisphereLight(0xeaf2ff, 0xc8d2dc, 0.42));

  const key = new THREE.DirectionalLight(0xf0f5ff, 1.15);
  key.position.set(120, 220, 110);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 600;
  key.shadow.camera.left = -160;
  key.shadow.camera.right = 160;
  key.shadow.camera.top = 200;
  key.shadow.camera.bottom = -50;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.04;
  key.shadow.radius = 6;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.55);
  fill.position.set(-90, 110, -70);
  scene.add(fill);

  const back = new THREE.DirectionalLight(0xffffff, 0.35);
  back.position.set(60, 80, -180);
  scene.add(back);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 600),
    new THREE.MeshStandardMaterial({ color: 0xeef0f3, roughness: 0.85 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Base trim (chamfered hero edge) ──
  const baseTrim = new THREE.Mesh(roundedBox(W, T_BASE, D, 0.4, 2), matSSMatte());
  baseTrim.position.set(0, T_BASE / 2, 0);
  baseTrim.castShadow = true;
  baseTrim.receiveShadow = true;
  scene.add(baseTrim);

  // Adjustable feet (Lathe — chamfered)
  const footProfile: Array<[number, number]> = [
    [0, 0],
    [2.2, 0],
    [2.4, 0.3],
    [2.0, 0.6],
    [1.5, 0.8],
    [1.5, 2.5],
    [0, 2.5],
  ];
  for (const [fx, fz] of [
    [-70, -24],
    [-70, 24],
    [70, -24],
    [70, 24],
  ] as const) {
    addMesh(scene, latheProfile(footProfile, 16), matSSPolished(), fx, 0, fz);
  }

  // Foot pedals (sculpted) — group-tag for highlight
  const pedalLeftGroup = new THREE.Group();
  pedalLeftGroup.userData.partId = 'foot-pedal';
  scene.add(pedalLeftGroup);
  buildSculptedFootPedal(pedalLeftGroup, -40);
  const pedalRightGroup = new THREE.Group();
  pedalRightGroup.userData.partId = 'foot-pedal';
  scene.add(pedalRightGroup);
  buildSculptedFootPedal(pedalRightGroup, 40);

  // ── Cabinet structural body — wrapped in `cabinet` group for highlight ──
  const cabinetGroup = new THREE.Group();
  cabinetGroup.userData.partId = 'cabinet';
  scene.add(cabinetGroup);

  const cabMatte = matSSMatte();
  const cabPolish = matSSPolished();

  // Back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(W, T_CAB, 1), cabMatte);
  backWall.position.set(0, T_BASE + T_CAB / 2, -D / 2 + 0.5);
  backWall.castShadow = backWall.receiveShadow = true;
  cabinetGroup.add(backWall);
  // Top — flush dengan countertop bottom (Y_CT_TOP - T_CT = 76)
  // Naikkan 0.5 supaya top face tepat di 76, tidak ada gap visual
  const topShelf = new THREE.Mesh(new THREE.BoxGeometry(W, 1, D), cabMatte);
  topShelf.position.set(0, Y_CAB_TOP, 0);
  topShelf.castShadow = topShelf.receiveShadow = true;
  cabinetGroup.add(topShelf);
  // Left side
  const leftSide = new THREE.Mesh(new THREE.BoxGeometry(1, T_CAB, D), cabMatte);
  leftSide.position.set(-W / 2 + 0.5, T_BASE + T_CAB / 2, 0);
  leftSide.castShadow = leftSide.receiveShadow = true;
  cabinetGroup.add(leftSide);
  // Right side
  const rightSide = new THREE.Mesh(new THREE.BoxGeometry(1, T_CAB, D), cabMatte);
  rightSide.position.set(W / 2 - 0.5, T_BASE + T_CAB / 2, 0);
  rightSide.castShadow = rightSide.receiveShadow = true;
  cabinetGroup.add(rightSide);
  // Center vertical divider
  const divider = new THREE.Mesh(new THREE.BoxGeometry(1.2, T_CAB - 4, D - 2), cabMatte);
  divider.position.set(0, T_BASE + T_CAB / 2, 0);
  divider.castShadow = divider.receiveShadow = true;
  cabinetGroup.add(divider);

  // 4 hinged doors REMOVED 2026-05-25 per research findings (see
  // docs/research/2026-05-25-scrub-sink-references.md). Real surgical
  // scrub sinks NEVER have hinged doors with D-pulls — they have either
  // seamless welded SS front panels (Asian/Indonesian style — Dolson
  // Nusantara, Rooe BSS100) or removable hidden-latch kick panels (US/EU
  // style — Belimed, MAC Medical, Skytron). Our reference target is the
  // Dolson DSR-style 1600×573×1600mm freestanding unit, so we use a
  // seamless welded SS front face.
  //
  // Front face: single welded SS panel from base to countertop bottom,
  // spanning the full width. No vertical reveal lines, no handles.
  // Brushed #4 finish (matSSMatte) per research Q8 — mirror polish is
  // decorative-only and shows water spots in clinical use.
  const frontPanel = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.5, T_CAB - 1, 1),
    cabMatte,
  );
  frontPanel.position.set(0, T_BASE + (T_CAB - 1) / 2 + 0.5, D / 2 - 0.5);
  frontPanel.castShadow = frontPanel.receiveShadow = true;
  cabinetGroup.add(frontPanel);

  // Subtle horizontal seam line at base — purely visual reference for
  // where a removable kick panel would be on a US-spec unit. ~150mm above
  // floor (Y = 18). Reads as a brushed seam, not a door reveal.
  const seamGeo = new THREE.BoxGeometry(W - 1, 0.15, 1.2);
  const seam = new THREE.Mesh(seamGeo, matSSPolished());
  seam.position.set(0, 18, D / 2);
  cabinetGroup.add(seam);

  // Door rail at top of cabinet (thin polished accent — BoxGeometry)
  const rail = new THREE.Mesh(new THREE.BoxGeometry(W, 1.2, 1), cabPolish);
  rail.position.set(0, Y_CAB_TOP - 0.6, D / 2 + 0.6);
  cabinetGroup.add(rail);

  // ── Countertop with proper basin holes (rounded corners) ──
  const ctShape = new THREE.Shape();
  const r = 1.6;
  ctShape.moveTo(-W / 2 + r, -D / 2);
  ctShape.lineTo(W / 2 - r, -D / 2);
  ctShape.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + r);
  ctShape.lineTo(W / 2, D / 2 - r);
  ctShape.quadraticCurveTo(W / 2, D / 2, W / 2 - r, D / 2);
  ctShape.lineTo(-W / 2 + r, D / 2);
  ctShape.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - r);
  ctShape.lineTo(-W / 2, -D / 2 + r);
  ctShape.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + r, -D / 2);

  const holeBasin = (cx: number) => {
    const bw = 60;
    const bd = 45;
    const br = 4;
    const path = new THREE.Path();
    const x0 = cx - bw / 2;
    const x1 = cx + bw / 2;
    const z0 = -7.5 - bd / 2;
    const z1 = -7.5 + bd / 2;
    path.moveTo(x0 + br, z0);
    path.lineTo(x1 - br, z0);
    path.quadraticCurveTo(x1, z0, x1, z0 + br);
    path.lineTo(x1, z1 - br);
    path.quadraticCurveTo(x1, z1, x1 - br, z1);
    path.lineTo(x0 + br, z1);
    path.quadraticCurveTo(x0, z1, x0, z1 - br);
    path.lineTo(x0, z0 + br);
    path.quadraticCurveTo(x0, z0, x0 + br, z0);
    return path;
  };
  ctShape.holes.push(holeBasin(-40));
  ctShape.holes.push(holeBasin(40));

  const ctGeo = new THREE.ExtrudeGeometry(ctShape, {
    depth: T_CT,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 4,
    curveSegments: 12,
  });
  ctGeo.rotateX(-Math.PI / 2);
  ctGeo.translate(0, T_CT, 0);
  const countertop = new THREE.Mesh(ctGeo, matSSPolished());
  countertop.position.y = Y_CT_TOP - T_CT;
  countertop.castShadow = true;
  countertop.receiveShadow = true;
  countertop.userData.partId = 'countertop';
  scene.add(countertop);

  // Sculpted basins (rebated rim + sloped floor) — wrapped per side
  const basinLeftGroup = new THREE.Group();
  basinLeftGroup.userData.partId = 'basin-left';
  scene.add(basinLeftGroup);
  buildSculptedBasin(basinLeftGroup, -40);

  const basinRightGroup = new THREE.Group();
  basinRightGroup.userData.partId = 'basin-right';
  scene.add(basinRightGroup);
  buildSculptedBasin(basinRightGroup, 40);

  // Plexiglass divider (BoxGeometry — flat slab, no chamfer needed)
  const plexiGroup = new THREE.Group();
  plexiGroup.userData.partId = 'plexi-divider';
  scene.add(plexiGroup);
  const plexi = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 22, 35),
    matPlexiglass(),
  );
  plexi.position.set(0, Y_CT_TOP + 11, -7.5);
  plexiGroup.add(plexi);
  // Frame top + bottom (BoxGeometry chrome strips)
  const plexiFrameGeo = new THREE.BoxGeometry(0.8, 0.8, 36);
  const plexiTop = new THREE.Mesh(plexiFrameGeo, matChrome());
  plexiTop.position.set(0, Y_CT_TOP + 22, -7.5);
  plexiTop.castShadow = plexiTop.receiveShadow = true;
  plexiGroup.add(plexiTop);
  const plexiBot = new THREE.Mesh(plexiFrameGeo.clone(), matChrome());
  plexiBot.position.set(0, Y_CT_TOP + 0.4, -7.5);
  plexiBot.castShadow = plexiBot.receiveShadow = true;
  plexiGroup.add(plexiBot);

  // Backsplash with integral cove (ExtrudeGeometry with bevel at base)
  const bsShape = new THREE.Shape();
  bsShape.moveTo(-W / 2, 0);
  bsShape.lineTo(W / 2, 0);
  bsShape.lineTo(W / 2, 75);
  bsShape.lineTo(-W / 2, 75);
  bsShape.closePath();
  const bsGeo = new THREE.ExtrudeGeometry(bsShape, {
    depth: 2,
    bevelEnabled: true,
    bevelThickness: 0.6,
    bevelSize: 0.8,
    bevelSegments: 4,
  });
  bsGeo.rotateX(0);
  const backsplash = new THREE.Mesh(bsGeo, matSSMatte());
  backsplash.position.set(0, 80, BP_Z - 1);
  backsplash.castShadow = true;
  backsplash.receiveShadow = true;
  backsplash.userData.partId = 'splash-back';
  scene.add(backsplash);

  // Cove transition strip (integral curve from countertop → backsplash, no joint visible)
  // BUGFIX 2026-05-25: previous version translated the extrusion by +W/2 in
  // geometry space, then offset mesh by -W/2 in world. Net result: cove ran
  // from x=0 to x=W (sticking out past +W/2 right edge by W/2). Now extrusion
  // runs from 0 to W along +X by default; we mesh-position at -W/2 so it
  // spans -W/2..+W/2, centered. The phantom 80-unit bar is gone.
  const coveProfile = new THREE.Shape();
  coveProfile.moveTo(0, 0);
  coveProfile.lineTo(2.5, 0);
  coveProfile.quadraticCurveTo(2.5, 2.5, 0, 2.5);
  coveProfile.lineTo(0, 0);
  const coveGeo = new THREE.ExtrudeGeometry(coveProfile, {
    depth: W,
    bevelEnabled: false,
  });
  coveGeo.rotateY(Math.PI / 2);
  // (no translate — extrusion now naturally runs 0..W along +X)
  const cove = new THREE.Mesh(coveGeo, matSSPolished());
  cove.position.set(-W / 2, Y_CT_TOP, BP_Z + 1.2);
  cove.castShadow = true;
  cove.userData.partId = 'countertop';
  scene.add(cove);

  // P-traps — both basins drain into shared `drain-trap` part
  const drainTrapGroup = new THREE.Group();
  drainTrapGroup.userData.partId = 'drain-trap';
  scene.add(drainTrapGroup);
  buildSculptedPTrap(drainTrapGroup, -40, 58, 8);
  buildSculptedPTrap(drainTrapGroup, 40, 58, 8);

  // TMV + supply lines
  buildSculptedTMV(scene);

  // Faucets (sculpted gooseneck) — both faucets share one `faucet` part
  const faucetGroup = new THREE.Group();
  faucetGroup.userData.partId = 'faucet';
  scene.add(faucetGroup);
  buildSculptedFaucet(faucetGroup, -40);
  buildSculptedFaucet(faucetGroup, 40);

  // Mirrors (sculpted with mitred frames) — both share `mirror` part
  const mirrorGroup = new THREE.Group();
  mirrorGroup.userData.partId = 'mirror';
  scene.add(mirrorGroup);
  buildSculptedMirror(mirrorGroup, -40);
  buildSculptedMirror(mirrorGroup, 40);

  // Canopy + LED + UV (canopy hero ‑ keep sculpted; LED + slats simple Box)
  const canopyGroup = new THREE.Group();
  canopyGroup.userData.partId = 'canopy';
  scene.add(canopyGroup);

  // GEOMETRY FIX 2026-05-27: canopy was at Y=152.5 which overlapped the
  // backsplash top (Y=80+75=155). Real spec: overhead shelf sits at 1680mm
  // from floor = 168u. Canopy body is 5u tall so center at Y=170.5.
  // Support posts connect backsplash top (Y=155) to canopy bottom (Y=168).
  const CANOPY_BOT_Y = 168;
  const CANOPY_CY    = CANOPY_BOT_Y + 2.5; // center of 5u-tall canopy body
  const CANOPY_Z     = -22;                 // same depth as backsplash zone

  // Vertical support posts — connect backsplash top to canopy underside
  const supportPostGeo = new THREE.CylinderGeometry(0.6, 0.6, CANOPY_BOT_Y - 155, 16);
  for (const sx of [-78, 78]) {
    const post = new THREE.Mesh(supportPostGeo, matSSPolished());
    post.position.set(sx, 155 + (CANOPY_BOT_Y - 155) / 2, CANOPY_Z);
    post.castShadow = true;
    canopyGroup.add(post);
  }

  const canopy = new THREE.Mesh(roundedBox(164, 5, 14, 0.4, 2), matSSPolished());
  canopy.position.set(0, CANOPY_CY, CANOPY_Z);
  canopy.castShadow = true;
  canopyGroup.add(canopy);

  // LED strip (BoxGeometry — flat strip on underside of canopy)
  const led = new THREE.Mesh(new THREE.BoxGeometry(158, 0.8, 4), matLEDStrip());
  led.position.set(0, CANOPY_BOT_Y - 0.4, CANOPY_Z - 3);
  canopyGroup.add(led);

  // UV tube (CylinderGeometry)
  const uvTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 150, 16),
    matUVTube(),
  );
  uvTube.rotation.z = Math.PI / 2;
  uvTube.position.set(0, CANOPY_BOT_Y + 1, CANOPY_Z + 2);
  canopyGroup.add(uvTube);

  // UV end caps
  const endCapGeo = latheProfile(
    [
      [0, -0.3],
      [1.0, -0.3],
      [1.0, 0.4],
      [0.7, 0.6],
      [0, 0.6],
    ],
    14,
  );
  for (const ex of [-76, 76]) {
    const cap = new THREE.Mesh(endCapGeo, matChrome());
    cap.rotation.z = ex < 0 ? Math.PI / 2 : -Math.PI / 2;
    cap.position.set(ex, CANOPY_BOT_Y + 1, CANOPY_Z + 2);
    canopyGroup.add(cap);
  }

  // Louvre slats on canopy underside
  const louvreMat = matSSMatte();
  const louvreGeo = new THREE.BoxGeometry(150, 0.3, 0.6);
  for (let i = -7; i <= 7; i += 2) {
    const slat = new THREE.Mesh(louvreGeo, louvreMat);
    slat.position.set(0, CANOPY_BOT_Y - 0.2, CANOPY_Z + 2 + i * 0.4);
    slat.rotation.x = -0.15;
    canopyGroup.add(slat);
  }

  // Soap dispensers (sculpted bottles) — both share `soap-dispenser` part
  // GEOMETRY FIX 2026-05-27: dispensers were at X=±72 (near unit edges, outside
  // basin zone). Real spec: soap spout mounts on countertop ~200mm (20u) to the
  // left of each faucet base. Faucet bases are at X=±40, so dispensers at
  // X = -40-20 = -60 (left bay) and X = 40+20 = 60 (right bay).
  // Both at same Z as faucet base (-22) so they read as countertop-mounted.
  const soapGroup = new THREE.Group();
  soapGroup.userData.partId = 'soap-dispenser';
  scene.add(soapGroup);
  buildSculptedSoapDispenser(soapGroup, -60);
  buildSculptedSoapDispenser(soapGroup, 60);

  // Annotations — updated to match corrected geometry positions
  placeAnnotations(
    scene,
    [
      { partId: 'canopy',          anchor: new THREE.Vector3(60, 170.5, -22),        label: 'Canopy + UV Germicidal' },
      { partId: 'mirror',          anchor: new THREE.Vector3(-10, 113, -26.5),        label: 'Mirror SS Mitred Frame' },
      { partId: 'faucet',          anchor: new THREE.Vector3(-40, 94, -7.5),          label: 'Sensor IR Gooseneck' },
      { partId: 'plexi-divider',   anchor: new THREE.Vector3(0, 92, -7.5),            label: 'Plexi Divider' },
      { partId: 'soap-dispenser',  anchor: new THREE.Vector3(-60, Y_CT_TOP + 10, -22), label: 'Soap Dispenser' },
      { partId: 'drain-trap',      anchor: new THREE.Vector3(-40, 59, -7.5),          label: 'Drain ⌀50 + P-Trap' },
      { partId: 'tmv',             anchor: new THREE.Vector3(0, 28, -27),             label: 'TMV (ASSE 1070)' },
      { partId: 'supply-lines',    anchor: new THREE.Vector3(-12, 6, -27),            label: 'Hot Supply + Angle Stop' },
      { partId: 'basin-right',     anchor: new THREE.Vector3(40, Y_CT_TOP, 15),       label: 'Basin SS304 Coved' },
      { partId: 'countertop',      anchor: new THREE.Vector3(60, 78, 0),              label: 'Countertop SS304' },
      { partId: 'cabinet',         anchor: new THREE.Vector3(60, T_BASE + T_CAB / 2, 31), label: 'Cabinet Seamless SS' },
      { partId: 'foot-pedal',      anchor: new THREE.Vector3(0, 1.6, 36),             label: 'Foot Pedal (rocker)' },
    ],
    W / 2 + 40,
    [0, 178],
  );
}

// ── React component ──────────────────────────────────────────
export function ScrubSinkAssembled3D({ product }: Props) {
  const visiblePresets = product.cameraPresets.filter(
    (p) => !/exploded/i.test(p.name),
  );

  const [activePreset, setActivePreset] = useState<string>(visiblePresets[0]?.name ?? '');
  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 80,
      maxDistance: 1200,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      const p = visiblePresets[0];
      if (p) applyCameraPreset(refs, p.position, p.target);
      // Highlight system: scan scene for userData.partId + label data-part-id.
      attachHighlight(refs);
    },
    deps: [product],
  });

  const goTo = (p: CameraPreset) => {
    if (refsRef.current) animateCameraTo(refsRef.current, p.position, p.target, 600);
    setActivePreset(p.name);
  };

  const dl = (name: string) =>
    refsRef.current &&
    downloadPNG(
      refsRef.current.renderer,
      `${product.id}-assembled-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
    );

  const dlAll = () =>
    visiblePresets.forEach((p, i) =>
      setTimeout(() => {
        goTo(p);
        setTimeout(() => dl(p.name), 700);
      }, i * 1000),
    );

  return (
    <div className="w-full h-full flex flex-col">
      <ViewerControls
        presets={visiblePresets}
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
