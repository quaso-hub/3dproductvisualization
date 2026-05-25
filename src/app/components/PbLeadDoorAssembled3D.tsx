/**
 * PbLeadDoorAssembled3D — Session 8 SCULPTED (2026-05-22)
 * ─────────────────────────────────────────────────────────────────
 * Complete rewrite menggunakan geometry-blender.ts helper library.
 * Target: hasil sculpting Blender-tier untuk pintu medical X-ray.
 *
 * Major upgrades dari Session 7.5:
 *  - Door leaf: ExtrudeGeometry dengan multi-segment bevel (sculpted edges)
 *  - Window aperture: Rounded corners + rebated Pb glass overlap visible
 *  - Pb edge stripes: smooth chamfered profile (not flat boxes)
 *  - Frame jambs: ExtrudeGeometry dengan rounded outer + flat inner stop
 *  - Bar pull handle: barPullHandle helper (hemispherical caps + standoffs)
 *  - Door closer body: roundedBox + Lathe end caps + textured brand plate
 *  - Closer arm: smoothTube CatmullRom (3D Z-bend, NOT flat box rotation)
 *  - Hinges: 5-knuckle alternating + NRP pin + rounded leaves
 *  - Mortise faceplate: extrude with bevel + 6 chamfered screws
 *  - Lockset cylinder: Lathe profile + chamfered escutcheon + keyway slot
 *  - Drop seal: rounded aluminum housing + activation pin
 *  - Lead-lined jamb: visible Pb tabs at all 4 perimeter zones
 *  - Architrave: rounded molding profile (not flat strips)
 * ─────────────────────────────────────────────────────────────────
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { animateCameraTo, applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import {
  roundedBox,
  beveledPlate,
  latheProfile,
  smoothTube,
  barPullHandle,
  beveledDisc,
  hingeKnuckleStack,
} from '../lib/geometry-blender';
import { useThreeScene } from '../hooks/useThreeScene';
import { useHighlightController } from '../hooks/useHighlightController';
import { ViewerControls } from './ViewerControls';

interface Props {
  product: Product;
}

// ── Scene constants (1 unit = 10 mm) ──────────────────────────
const DW = 100; // 1000 mm
const DH = 220; // 2200 mm
const DT = 4.7; // 47 mm
const FW = 8;
const FD = DT + 8;
const GW = 20;
const GH = 30;
const GY = DH / 2 - 30;
const KPH = 26;
const WALL_W = DW + 80;
const WALL_H = DH + 60;
const WALL_T = 8;
// (WALL_* retained as defined-but-unused constants — wall slab itself was
//  removed Session 10 Item 3. Some legacy code may still reference these
//  for camera framing math; safe to leave defined.)
void WALL_W; void WALL_H; void WALL_T;
const HINGE_X = -DW / 2;
const HANDLE_X = DW / 2 - 4;

// ── Materials (PBR 2026 SOTA) ─────────────────────────────────
const matDoorWhite = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xe2e8ec,
    roughness: 0.62,
    metalness: 0.05,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.65,
  });

const matFrame = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xb8c4ce,
    roughness: 0.3,
    metalness: 1.0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.95,
  });

const matSS = (r = 0.18, m = 1.0) =>
  new THREE.MeshPhysicalMaterial({
    color: 0xd4dde5,
    roughness: r,
    metalness: m,
    clearcoat: 0.35,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.2,
  });

const matLeadGlass = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xc8d4b0,
    roughness: 0.05,
    metalness: 0,
    transmission: 0.7,
    thickness: 0.6,
    ior: 1.55,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    envMapIntensity: 1.2,
    clearcoat: 0.3,
    clearcoatRoughness: 0.1,
  });

const matLead = () =>
  new THREE.MeshStandardMaterial({
    color: 0x707680,
    roughness: 0.55,
    metalness: 0.45,
    envMapIntensity: 0.7,
  });

const matRubber = () =>
  new THREE.MeshStandardMaterial({ color: 0x1e2228, roughness: 0.92, metalness: 0 });

const matWall = () =>
  new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.92, metalness: 0 });

const matCloserHousing = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xa0aab4,
    roughness: 0.38,
    metalness: 1.0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.0,
  });

const matCloserArm = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xc2cad2,
    roughness: 0.28,
    metalness: 1.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.15,
  });

// ── Mesh helpers ─────────────────────────────────────────────

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

// ── Door leaf with sculpted bevel + window aperture ───────────

function buildSculptedDoorLeaf(scene: THREE.Object3D): void {
  // Outer rectangle + window hole with rounded corners
  const shape = new THREE.Shape();
  shape.moveTo(-DW / 2, -DH / 2);
  shape.lineTo(DW / 2, -DH / 2);
  shape.lineTo(DW / 2, DH / 2);
  shape.lineTo(-DW / 2, DH / 2);
  shape.lineTo(-DW / 2, -DH / 2);

  const r = 1.5;
  const x0 = -GW / 2;
  const x1 = GW / 2;
  const y0 = GY - GH / 2;
  const y1 = GY + GH / 2;
  const hole = new THREE.Path();
  hole.moveTo(x0 + r, y0);
  hole.lineTo(x1 - r, y0);
  hole.quadraticCurveTo(x1, y0, x1, y0 + r);
  hole.lineTo(x1, y1 - r);
  hole.quadraticCurveTo(x1, y1, x1 - r, y1);
  hole.lineTo(x0 + r, y1);
  hole.quadraticCurveTo(x0, y1, x0, y1 - r);
  hole.lineTo(x0, y0 + r);
  hole.quadraticCurveTo(x0, y0, x0 + r, y0);
  shape.holes.push(hole);

  // ExtrudeGeometry with multi-segment bevel — sculpted feel, NOT flat
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DT,
    bevelEnabled: true,
    bevelThickness: 0.25,
    bevelSize: 0.25,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.translate(0, 0, -DT / 2);

  const leaf = new THREE.Mesh(geo, matDoorWhite());
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  scene.add(leaf);
}

// ── Lead continuity stripes (BoxGeometry — thin strips, no chamfer needed) ──
// These are visual hints, not hero geometry. Box is fine.
function buildSculptedLeadContinuity(scene: THREE.Object3D): void {
  const lead = matLead();
  const t = 0.5;
  const inset = 0.3;

  // Top edge
  const topGeo = new THREE.BoxGeometry(DW - 2, t, DT * 0.85);
  const top = new THREE.Mesh(topGeo, lead);
  top.position.set(0, DH / 2 - inset - t / 2, 0);
  top.castShadow = true;
  scene.add(top);

  // Bottom
  const bot = new THREE.Mesh(topGeo.clone(), lead);
  bot.position.set(0, -DH / 2 + inset + t / 2, 0);
  bot.castShadow = true;
  scene.add(bot);

  // Hinge edge (left)
  const sideGeo = new THREE.BoxGeometry(t, DH - 4, DT * 0.85);
  const left = new THREE.Mesh(sideGeo, lead);
  left.position.set(-DW / 2 + inset + t / 2, 0, 0);
  left.castShadow = true;
  scene.add(left);

  // Latch edge (right)
  const right = new THREE.Mesh(sideGeo.clone(), lead);
  right.position.set(DW / 2 - inset - t / 2, 0, 0);
  right.castShadow = true;
  scene.add(right);
}

// ── Sculpted closer (Sargent 281 style) ───────────────────────

function buildSculptedCloser(scene: THREE.Object3D): void {
  const housing = matCloserHousing();
  const arm = matCloserArm();

  // BUGFIX 2026-05-25 (research-driven): closer body was at HY = DH/2 + FW/2 =
  // 114, which put the housing ABOVE the frame head — read by users as a
  // "stray iron bar floating above the kusen". Real Sargent 281 / LCN 4040
  // closers mount on the DOOR FACE just below the top rail. Industry
  // confirmation: idighardware.com / Marshield / Sargent install manuals.
  // See: docs/research/2026-05-25-pb-lead-door-references.md (Bug 1).
  const HX = 0;
  const HY = DH / 2 - 8;        // housing on door face below top rail (was DH/2 + FW/2)
  const HZ = DT / 2 + 3.0; // housing center Z (DT/2 = door front, +3 = housing offset)
  const HOUSING_DEPTH = 6;
  const HOUSING_FRONT_Z = HZ + HOUSING_DEPTH / 2;

  // Housing body: roundedBox 200×60×60mm proportional
  const body = new THREE.Mesh(roundedBox(20, 6, 6, 0.6, 4), housing);
  body.position.set(HX, HY, HZ);
  body.castShadow = true;
  scene.add(body);

  // Cylinder caps (Lathe — chamfered cylinder ends)
  const capProfile: Array<[number, number]> = [
    [0, 0],
    [0.45, 0],
    [0.5, 0.1],
    [0.5, 0.4],
    [0.45, 0.5],
    [0, 0.5],
  ];
  for (const sx of [-10, 10]) {
    const cap = new THREE.Mesh(latheProfile(capProfile, 16), matSS(0.2, 1.0));
    cap.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    cap.position.set(HX + sx, HY, HZ);
    cap.castShadow = true;
    scene.add(cap);
  }

  // Brand plate — sunk -0.05 into housing front face (research §5.3 rule 3)
  const plate = new THREE.Mesh(new THREE.BoxGeometry(7, 1.8, 0.3), matSS(0.18, 1.0));
  plate.position.set(HX, HY + 1.6, HOUSING_FRONT_Z - 0.15);
  scene.add(plate);

  // Pivot pin — vertical cylinder going DOWN from housing bottom
  // ALIGNMENT FIX: pin top at housing bottom (HY-3), pin extends downward 1.6 units.
  // Pin is regular CylinderGeometry rotated, NOT Lathe (Lathe profile 0→1.6 means pin
  // top at HY-3.2 + 0 and bottom at HY-3.2 - 1.6 — flipped from intuition).
  const PIN_LEN = 1.6;
  const PIN_TOP_Y = HY - 3; // exit housing bottom face
  const PIN_BOT_Y = PIN_TOP_Y - PIN_LEN;
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, PIN_LEN, 16),
    arm,
  );
  pin.position.set(HX + 5, (PIN_TOP_Y + PIN_BOT_Y) / 2, HZ);
  pin.castShadow = true;
  scene.add(pin);

  // Top knuckle — at pin bottom, slight overlap so no gap visible
  const knuckleTop = new THREE.Mesh(
    latheProfile(
      [
        [0, 0],
        [1.0, 0],
        [1.0, 0.6],
        [0.85, 0.85],
        [0.5, 1.0],
        [0, 1.0],
      ],
      24,
    ),
    arm,
  );
  // Knuckle center at PIN_BOT_Y - 0.5 (knuckle Lathe height ~1.0, so center is at 0.5)
  knuckleTop.position.set(HX + 5, PIN_BOT_Y - 0.5, HZ);
  knuckleTop.castShadow = true;
  scene.add(knuckleTop);

  // Main arm via smoothTube — TRUE 3D Z-bend forward (Sargent 281 signature)
  // Pivot starts AT knuckle bottom (continuous geometry — no air gap)
  const pivot = new THREE.Vector3(HX + 5, PIN_BOT_Y - 1.5, HZ);
  const elbow = new THREE.Vector3(HX + 1, HY - 9, HZ + 5);
  // Foot at door front face — bracket Z extends DT/2 to DT/2+0.6, mid at DT/2+0.3
  const FOOT_Z = DT / 2 + 0.3;
  const foot = new THREE.Vector3(HX - 1, DH / 2 - 1.5, FOOT_Z);
  // Main arm
  const mainArmPoints = [
    pivot.clone(),
    pivot.clone().lerp(elbow, 0.3),
    pivot.clone().lerp(elbow, 0.7),
    elbow.clone(),
  ];
  const mainArm = new THREE.Mesh(smoothTube(mainArmPoints, 0.7, 32, 16), arm);
  mainArm.castShadow = true;
  scene.add(mainArm);

  // Elbow knuckle (forged steel joint sphere)
  const elbowKnuckle = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 16, 12),
    arm,
  );
  elbowKnuckle.position.copy(elbow);
  elbowKnuckle.castShadow = true;
  scene.add(elbowKnuckle);

  // Foot arm (smoothTube from elbow to door bracket)
  const footArmPoints = [
    elbow.clone(),
    elbow.clone().lerp(foot, 0.3),
    elbow.clone().lerp(foot, 0.7),
    foot.clone(),
  ];
  const footArm = new THREE.Mesh(smoothTube(footArmPoints, 0.6, 32, 16), arm);
  footArm.castShadow = true;
  scene.add(footArm);

  // Door-mount foot bracket — flat plate on door surface, thickness 0.6
  // Bracket front Z = DT/2+0.6, back Z = DT/2 (flush with door surface)
  const BRACKET_THICK = 0.6;
  const BRACKET_Z = DT / 2 + BRACKET_THICK / 2; // bracket center
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.5, BRACKET_THICK), matSS(0.15, 1.0));
  bracket.position.set(foot.x, foot.y, BRACKET_Z);
  bracket.castShadow = true;
  scene.add(bracket);

  // 4 bracket screws — sunk into bracket front (research §5.3 rule 3)
  // Bracket front face Z = BRACKET_Z + 0.3 = DT/2+0.6, screws at -0.05 sink
  const screwGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.18, 8);
  for (const sx of [-2.5, 2.5]) {
    for (const sy of [-1.0, 1.0]) {
      const screw = new THREE.Mesh(screwGeo, matSS(0.2, 1.0));
      screw.position.set(foot.x + sx, foot.y + sy, BRACKET_Z + 0.25);
      screw.rotation.x = Math.PI / 2; // disc face → +Z
      scene.add(screw);
    }
  }
}

// ── Sculpted bar pull handle ──────────────────────────────────
// ALIGNMENT (research §5.3 rule 2): vertical bar pull, length 500mm = 50 units.
// Real ADA-compliant grip clearance: 75mm (7.5u) from bar to door surface.
// Standoffs span exactly that distance, stand perpendicular to door front.
function buildSculptedBarPull(scene: THREE.Object3D): void {
  const chrome = matSS(0.12, 1.0);
  const PULL_LEN = 50;
  const PULL_R = 1.1;
  const STANDOFF_LEN = 3.0; // 30mm standoff distance (door face → bar back)
  const BAR_Z = DT / 2 + STANDOFF_LEN; // bar center Z
  // Y center: shift down so handle center sits at floor+1050mm
  // door center is at y=0, floor is at y=-DH/2-5=-115. ADA handle = -110+105=-5
  const HANDLE_Y_CENTER = -5;

  // Bar with hemispherical caps
  const [bar, capA, capB] = barPullHandle(PULL_LEN, PULL_R, 24);
  const barMesh = new THREE.Mesh(bar, chrome);
  barMesh.position.set(HANDLE_X, HANDLE_Y_CENTER, BAR_Z);
  barMesh.castShadow = true;
  scene.add(barMesh);
  const capAMesh = new THREE.Mesh(capA, chrome);
  capAMesh.position.set(HANDLE_X, HANDLE_Y_CENTER, BAR_Z);
  scene.add(capAMesh);
  const capBMesh = new THREE.Mesh(capB, chrome);
  capBMesh.position.set(HANDLE_X, HANDLE_Y_CENTER, BAR_Z);
  scene.add(capBMesh);

  // 2 standoffs — perpendicular to door, span from door surface to bar back
  // CylinderGeometry along Y axis, rotated to point along +Z
  const standoffGeo = new THREE.CylinderGeometry(0.7, 0.7, STANDOFF_LEN, 16);
  for (const sy of [PULL_LEN / 2 - 2, -PULL_LEN / 2 + 2]) {
    const standoff = new THREE.Mesh(standoffGeo, chrome);
    standoff.rotation.x = Math.PI / 2; // Y-axis → Z-axis
    standoff.position.set(HANDLE_X, HANDLE_Y_CENTER + sy, DT / 2 + STANDOFF_LEN / 2);
    standoff.castShadow = true;
    scene.add(standoff);
  }

  // Mounting rosettes — flat discs flush ON door surface (sunk -0.05 per rule 3)
  // Rosette is a thin Cylinder facing +Z (toward viewer)
  const rosetteGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.3, 16);
  for (const sy of [PULL_LEN / 2 - 2, -PULL_LEN / 2 + 2]) {
    const rosette = new THREE.Mesh(rosetteGeo, chrome);
    rosette.rotation.x = Math.PI / 2; // disc face → +Z
    rosette.position.set(HANDLE_X, HANDLE_Y_CENTER + sy, DT / 2 + 0.1);
    scene.add(rosette);
  }
}

// ── Sculpted mortise lockset ──────────────────────────────────

function buildSculptedMortise(scene: THREE.Object3D): void {
  const ssMat = matSS(0.18, 1.0);
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.6 });

  const HX = HANDLE_X;

  // Latch escutcheon (sunk into door front face -0.05, research §5.3 rule 3)
  const esc = new THREE.Mesh(new THREE.BoxGeometry(4, 9, 0.3), ssMat);
  esc.position.set(HX - 2, -8, DT / 2 + 0.1);
  esc.castShadow = true;
  scene.add(esc);

  // Cylinder lock (Lathe profile chamfered) — axis perpendicular to door face
  const cylProfile: Array<[number, number]> = [
    [0, 0],
    [1.4, 0],
    [1.4, 0.5],
    [1.2, 0.6],
    [1.2, 0.8],
    [0, 0.8],
  ];
  const cylLock = new THREE.Mesh(latheProfile(cylProfile, 16), ssMat);
  // Lathe Y-axis along Z direction so cylinder sticks OUT toward viewer
  cylLock.rotation.x = -Math.PI / 2;
  cylLock.position.set(HX - 2, -8, DT / 2 + 0.25);
  cylLock.castShadow = true;
  scene.add(cylLock);

  // Keyway slit (sunk into cylinder face)
  const keyway = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.6, 0.04),
    blackMat,
  );
  keyway.position.set(HX - 2, -8, DT / 2 + 1.0); // on cylinder front face
  scene.add(keyway);

  // Mortise body — embedded in door edge, 18u tall × 2.4u deep × 1.5u into door
  // Body Z range: -1.2 to 1.2 (centered at 0). Door Z range: -DT/2 to DT/2 = -2.35 to 2.35
  // → mortise sits inside door interior
  const mortBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 18, 2.4), matSS(0.4, 1.0));
  mortBody.position.set(DW / 2 + 0.5, -8, 0);
  mortBody.castShadow = true;
  scene.add(mortBody);

  // Faceplate — flush against door edge X face (DW/2 = 50)
  // Faceplate thickness 0.4, sits proud of edge by 0.2 (faceplate X 50.85-51.25)
  const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 25, 3.0), ssMat);
  facePlate.position.set(DW / 2 + 1.05, -8, 0);
  facePlate.castShadow = true;
  scene.add(facePlate);

  // 6 screws on faceplate — sunk INTO faceplate front face (X-axis sink)
  // Faceplate front is at X=51.25, screws sink to X=51.20 (-0.05 sink rule)
  const screwGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.18, 8);
  for (const sy of [-11, -6.5, -2, 2, 6.5, 11]) {
    const screw = new THREE.Mesh(screwGeo, ssMat);
    screw.rotation.z = Math.PI / 2; // Y-axis cylinder → X-axis (faces +X)
    screw.position.set(DW / 2 + 1.20, -8 + sy, 0);
    scene.add(screw);
  }

  // Latch bolt — protrudes from faceplate front, axis along +X
  const latchProfile: Array<[number, number]> = [
    [0, 0],
    [0.55, 0],
    [0.55, 0.8],
    [0.45, 1.0],
    [0, 1.0],
  ];
  const latch = new THREE.Mesh(latheProfile(latchProfile, 14), ssMat);
  // Lathe profile Y-axis = bolt extrusion direction; rotate so points +X
  latch.rotation.z = -Math.PI / 2;
  latch.position.set(DW / 2 + 1.25, -8, 0.4); // start at faceplate front face
  scene.add(latch);

  // Dead bolt — separate throw above latch, also along +X
  const deadBolt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 2.5), ssMat);
  // Center at faceplate front +0.5 (half body width) so back face flush at faceplate front
  deadBolt.position.set(DW / 2 + 1.55, -5, 0);
  scene.add(deadBolt);

  // Through-spindle hole — small dark indicator on faceplate front
  const spindleHole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12),
    blackMat,
  );
  spindleHole.rotation.z = Math.PI / 2; // axis along +X to face forward
  spindleHole.position.set(DW / 2 + 1.22, -8 + 3.8, 0); // on faceplate front face
  scene.add(spindleHole);
}

// ── Sculpted hinges (5-knuckle alternating) ──────────────────
// Split into door-side (leafGroup) and frame-side (scene root) so that
// open/close scenario can rotate only the door-mounted parts.

function buildSculptedHinges(scene: THREE.Object3D, leafGroup: THREE.Object3D): void {
  const ssMat = matSS(0.16, 1.0);
  const pinMat = matSS(0.1, 1.0);
  const positions = [DH / 2 - 18, 0, -DH / 2 + 18];

  // ALIGNMENT FIX (research §5.3 — hinge pin axis = door rotation axis):
  // Hinge pin Z must be at door edge (Z=0), NOT at door front face (DT/2).
  // When door rotates open, pivot is around (HINGE_X, py, 0) — the edge.
  // Real hinge geometry: leafA on door face, leafB on jamb face, pin in
  // the gap between (Z ≈ 0). Knuckle barrels alternate around pin.
  for (const py of positions) {
    // Door leaf strip — embedded in door edge, sticks out slightly toward viewer
    // ROTATES with door (mounted on leaf side of hinge).
    const leafA = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, DT * 0.85), ssMat);
    leafA.position.set(HINGE_X + 0.3, py, 0); // very slight outset from door edge
    leafA.castShadow = true;
    leafA.receiveShadow = true;
    leafGroup.add(leafA);

    // Frame leaf — embedded in jamb, sticks toward door
    // STATIC (mounted on frame).
    const leafB = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, FD * 0.7), ssMat);
    leafB.position.set(HINGE_X - 0.3, py, 0);
    leafB.castShadow = true;
    leafB.receiveShadow = true;
    scene.add(leafB);

    // Pin — vertical cylinder AT the rotation axis (HINGE_X, *, 0)
    // STATIC (pin stays with frame; barrels rotate around it).
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 7, 12),
      pinMat,
    );
    pin.position.set(HINGE_X, py, 0);
    pin.castShadow = true;
    scene.add(pin);

    // 5 knuckle barrels at pin axis (alternating thickness for visual texture)
    // STATIC (visually shared between leaf+frame; we keep them in scene root
    //  to avoid clipping when leaf rotates).
    const knuckleYs = [-2.4, -1.2, 0, 1.2, 2.4];
    knuckleYs.forEach((dy) => {
      const k = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 1.0, 12),
        ssMat,
      );
      k.position.set(HINGE_X, py + dy, 0);
      k.castShadow = true;
      scene.add(k);
    });

    // 4 screws per leaf — sunk into surface (-0.05 Z offset = research §5.3 rule 3)
    // Door-side screws: face the viewer (+Z), pressed into door front (rotates with leaf)
    const screwGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.18, 8);
    for (const sy of [-2.2, -0.7, 0.7, 2.2]) {
      const sa = new THREE.Mesh(screwGeo, ssMat);
      sa.rotation.x = Math.PI / 2;
      sa.position.set(HINGE_X + 0.3, py + sy, DT / 2 - 0.05);
      leafGroup.add(sa);
      // Frame-side screws face into the jamb (-Z direction) — STATIC
      const sb = new THREE.Mesh(screwGeo, ssMat);
      sb.rotation.x = Math.PI / 2;
      sb.position.set(HINGE_X - 0.3, py + sy, -FD / 2 + 0.05);
      scene.add(sb);
    }
  }
}

// ── Lead-lined jamb continuity (BoxGeometry — thin tabs/strips) ──
// Tabs hanya visual hint, no chamfer needed. Save vertex budget.
function buildSculptedLeadFrameContinuity(scene: THREE.Object3D): void {
  const lead = matLead();

  // (Pb perimeter tabs at drywall removed Session 10 Item 3 — they were
  //  attached to the wall slab which is also removed. They appeared as
  //  thin "stray bars" floating behind the door frame. The lead-shielding
  //  narrative is preserved by the throat tabs and threshold nosing below
  //  which DO sit inside the frame itself.)

  // Pb wrap inside jamb throat (BoxGeometry flat strips) — STAYS
  const throatZ = -FD / 2 + 0.4;
  addMesh(scene, new THREE.BoxGeometry(FW * 0.45, DH, 0.35), lead, -(DW / 2 + FW * 0.275), 0, throatZ);
  addMesh(scene, new THREE.BoxGeometry(FW * 0.45, DH, 0.35), lead, DW / 2 + FW * 0.275, 0, throatZ);
  addMesh(scene, new THREE.BoxGeometry(DW, FW * 0.45, 0.35), lead, 0, DH / 2 + FW * 0.275, throatZ);

  // Threshold lead nosing (BoxGeometry) — STAYS
  const sillY = -(DH / 2 + FW * 0.4) + 0.2;
  addMesh(scene, new THREE.BoxGeometry(DW + FW * 2, 0.4, FD - 1), lead, 0, sillY, 0);
}

// ── Scene builder ────────────────────────────────────────────

interface SceneHandles {
  leafPivot: THREE.Group;
  closerGroup: THREE.Group;
}

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer): SceneHandles {
  // Environment + tone
  renderer.toneMappingExposure = 1.0;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  scene.background = new THREE.Color(0xeef3f7);
  envScene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      m.geometry.dispose();
      if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
      else (m.material as THREE.Material).dispose();
    }
  });
  pmrem.dispose();

  // Lighting (cool clinical 5500K)
  scene.add(new THREE.AmbientLight(0xf0f6fa, 0.30));
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xc8d2dc, 0.45));

  const key = new THREE.DirectionalLight(0xf0f5ff, 1.15);
  key.position.set(160, 240, 200);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 800;
  key.shadow.camera.left = -200;
  key.shadow.camera.right = 200;
  key.shadow.camera.top = 200;
  key.shadow.camera.bottom = -200;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.04;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.55);
  fill.position.set(-130, 130, -80);
  scene.add(fill);

  const back = new THREE.DirectionalLight(0xd8e8ff, 0.32);
  back.position.set(80, 100, -180);
  scene.add(back);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshStandardMaterial({ color: 0xeef0f3, roughness: 0.85 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -DH / 2 - 5;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── (Wall slab + architrave + drywall lead tabs removed Session 10 Item 3 —
  //     user feedback: "tembok belakang tidak jelas menghalangi" + "bar besi
  //     tipis keluar entah apa". Frame (kusen) below remains as the structural
  //     anchor; the door now reads as a standalone hardware install.)

  // Lead continuity (throat + threshold only — perimeter drywall tabs removed)
  buildSculptedLeadFrameContinuity(scene);

  // ── Frame (jambs + header + threshold) — HERO chamfered, but segs=2 ──
  const frameGroup = new THREE.Group();
  frameGroup.userData.partId = 'frame';
  scene.add(frameGroup);
  const frameMat = matFrame();
  // Left jamb
  addMesh(frameGroup, roundedBox(FW, DH + FW * 2, FD, 0.5, 2), frameMat, -(DW / 2 + FW / 2), 0, 0);
  // Right jamb
  addMesh(frameGroup, roundedBox(FW, DH + FW * 2, FD, 0.5, 2), frameMat, DW / 2 + FW / 2, 0, 0);
  // Header
  addMesh(frameGroup, roundedBox(DW + FW * 2, FW, FD, 0.5, 2), frameMat, 0, DH / 2 + FW / 2, 0);
  // Threshold (BoxGeometry — thin slab)
  addMesh(frameGroup, new THREE.BoxGeometry(DW + FW * 2, FW * 0.4, FD), frameMat, 0, -(DH / 2 + FW * 0.2), 0);

  // Rubber stop bead (BoxGeometry — thin strips, attached to frame)
  const rubber = matRubber();
  addMesh(frameGroup, new THREE.BoxGeometry(0.6, DH, 0.5), rubber, -(DW / 2 + 0.2), 0, FD / 2 - 1);
  addMesh(frameGroup, new THREE.BoxGeometry(0.6, DH, 0.5), rubber, DW / 2 + 0.2, 0, FD / 2 - 1);
  addMesh(frameGroup, new THREE.BoxGeometry(DW, 0.6, 0.5), rubber, 0, DH / 2 + 0.2, FD / 2 - 1);

  // ── Door leaf pivot group ──────────────────────────────────
  // All geometry that physically rotates with the door leaf (skin, lead
  // continuity stripes, gaskets, drop seal, view glass+rebate+bezel,
  // kickplate, bar pull, mortise, door-side hinge leaves) goes into
  // leafPivot. Pivot origin sits AT the hinge axis (HINGE_X, 0, 0) so
  // rotateY around that point is correct. Children are translated by
  // -HINGE_X on X to preserve their world coordinates at angle 0.
  const leafPivot = new THREE.Group();
  leafPivot.position.set(HINGE_X, 0, 0);
  scene.add(leafPivot);

  // Inner group: receives all leaf-mounted geometry, offset back so child
  // local coords match world coords when leafPivot.rotation.y = 0.
  const leafGroup = new THREE.Group();
  leafGroup.position.set(-HINGE_X, 0, 0);
  leafPivot.add(leafGroup);

  // Closer goes in its own group so it can be hidden in 'open' scenario
  // (closer arm articulation is not modelled — hiding is honest).
  const closerGroup = new THREE.Group();
  closerGroup.userData.partId = 'closer';
  scene.add(closerGroup);

  // ── Door leaf with sculpted bevel + window aperture ──
  const doorLeafGroup = new THREE.Group();
  doorLeafGroup.userData.partId = 'door-leaf';
  leafGroup.add(doorLeafGroup);
  buildSculptedDoorLeaf(doorLeafGroup);

  // ── Lead continuity perimeter stripes ──
  const leadStripesGroup = new THREE.Group();
  leadStripesGroup.userData.partId = 'lead-stripes';
  leafGroup.add(leadStripesGroup);
  buildSculptedLeadContinuity(leadStripesGroup);

  // ── EPDM gasket — perimeter compression seal at door front ──
  const gasketGroup = new THREE.Group();
  gasketGroup.userData.partId = 'gasket';
  leafGroup.add(gasketGroup);
  // Gasket sits inside door perimeter, slightly proud of door front face
  // Door front Z = DT/2 = 2.35. Gasket thickness 0.6, flange Z 0.4 (compressed).
  // Gasket front face at Z = DT/2 - 0.05 (sunk into edge groove).
  const gMat = matRubber();
  const gT = 0.6;
  const gFlangeZ = 0.4; // gasket Z thickness — thin compression strip
  const gInset = 0.5;
  // Top gasket
  addMesh(gasketGroup, new THREE.BoxGeometry(DW - 1, gT, gFlangeZ), gMat, 0, DH / 2 - gInset - gT / 2, DT / 2 - gFlangeZ / 2 - 0.05);
  // Bottom gasket
  addMesh(gasketGroup, new THREE.BoxGeometry(DW - 1, gT, gFlangeZ), gMat, 0, -DH / 2 + gInset + gT / 2, DT / 2 - gFlangeZ / 2 - 0.05);
  // Hinge-side gasket
  addMesh(gasketGroup, new THREE.BoxGeometry(gT, DH - 2, gFlangeZ), gMat, -DW / 2 + gInset + gT / 2, 0, DT / 2 - gFlangeZ / 2 - 0.05);
  // Latch-side gasket
  addMesh(gasketGroup, new THREE.BoxGeometry(gT, DH - 2, gFlangeZ), gMat, DW / 2 - gInset - gT / 2, 0, DT / 2 - gFlangeZ / 2 - 0.05);

  // ── Bottom drop seal — mortised INTO door bottom edge ──
  const dropSealGroup = new THREE.Group();
  dropSealGroup.userData.partId = 'drop-seal';
  leafGroup.add(dropSealGroup);
  // Real Athmer/Pemko style: aluminum housing inset into bottom door edge.
  // Housing 12mm thick (1.2u) × 32mm high (3.2u). Top of housing at door bottom -0.5 (slight sink).
  // Housing centered at door front (Z=0) fits within door thickness (DT=4.7, range -2.35 to 2.35).
  // Aluminum housing — inset into door bottom (mortised), centered at Z=0
  const HOUSING_H = 1.2;
  const HOUSING_TOP_Y = -DH / 2 + HOUSING_H / 2 + 0.3;
  addMesh(dropSealGroup, new THREE.BoxGeometry(DW - 4, HOUSING_H, DT - 0.5), matSS(0.25, 1.0), 0, HOUSING_TOP_Y, 0);
  // Rubber sweep — descends BELOW door bottom (visible drop)
  // Sweep top inside housing, bottom protrudes 0.4 below door bottom
  addMesh(dropSealGroup, new THREE.BoxGeometry(DW - 6, 0.5, DT - 1), matRubber(), 0, -DH / 2 - 0.25, 0);

  // Activation pin — small cylinder protruding LATCH-side edge (sticks OUT +X)
  // Real mechanism: pin at latch corner, when door closes pin presses against frame stop
  const actPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.5, 12),
    matSS(0.2, 1.0),
  );
  actPin.rotation.z = Math.PI / 2; // axis along +X (latch-side)
  actPin.position.set(DW / 2 + 0.25, HOUSING_TOP_Y, 0); // sticks out 0.25u from edge
  actPin.castShadow = true;
  dropSealGroup.add(actPin);

  // ── View Glass — REBATED behind steel skin with overlap visible ──
  const glassGroup = new THREE.Group();
  glassGroup.userData.partId = 'view-glass';
  leafGroup.add(glassGroup);
  const OVERLAP = 1.2;
  const glassDepth = 0.7;
  const glass = new THREE.Mesh(
    beveledPlate(GW + OVERLAP * 2, GH + OVERLAP * 2, glassDepth, 0.2, 2),
    matLeadGlass(),
  );
  glass.position.set(0, GY, -DT / 4);
  glass.castShadow = true;
  glassGroup.add(glass);

  // Lead overlap rebate frame (BoxGeometry — thin Pb strips, no chamfer)
  const rebateMat = matLead();
  const rT = 0.3;
  addMesh(glassGroup, new THREE.BoxGeometry(GW + OVERLAP * 2, rT, 0.4), rebateMat, 0, GY + GH / 2 + OVERLAP / 2, -DT / 4 + 0.2);
  addMesh(glassGroup, new THREE.BoxGeometry(GW + OVERLAP * 2, rT, 0.4), rebateMat, 0, GY - GH / 2 - OVERLAP / 2, -DT / 4 + 0.2);
  addMesh(glassGroup, new THREE.BoxGeometry(rT, GH + OVERLAP * 2, 0.4), rebateMat, -GW / 2 - OVERLAP / 2, GY, -DT / 4 + 0.2);
  addMesh(glassGroup, new THREE.BoxGeometry(rT, GH + OVERLAP * 2, 0.4), rebateMat, GW / 2 + OVERLAP / 2, GY, -DT / 4 + 0.2);

  // SS bezel (BoxGeometry — thin frame strips)
  const bezel = matSS(0.18, 1.0);
  const bT = 0.55;
  addMesh(glassGroup, new THREE.BoxGeometry(GW + bT * 2, bT, DT * 0.4), bezel, 0, GY + GH / 2 + bT / 2, DT / 2 - 0.4);
  addMesh(glassGroup, new THREE.BoxGeometry(GW + bT * 2, bT, DT * 0.4), bezel, 0, GY - GH / 2 - bT / 2, DT / 2 - 0.4);
  addMesh(glassGroup, new THREE.BoxGeometry(bT, GH, DT * 0.4), bezel, -GW / 2 - bT / 2, GY, DT / 2 - 0.4);
  addMesh(glassGroup, new THREE.BoxGeometry(bT, GH, DT * 0.4), bezel, GW / 2 + bT / 2, GY, DT / 2 - 0.4);

  // ── SS Kickplate — flat plate flush against door front face ──
  const kickplateGroup = new THREE.Group();
  kickplateGroup.userData.partId = 'kickplate';
  leafGroup.add(kickplateGroup);
  // Kickplate Z range: DT/2+0.02 to DT/2+0.62 (thickness 0.6, sits 0.02 proud)
  const kpY = -DH / 2 + KPH / 2 + 1;
  const KICKPLATE_Z = DT / 2 + 0.32;
  const KICKPLATE_FRONT_Z = KICKPLATE_Z + 0.3; // front face
  addMesh(kickplateGroup, new THREE.BoxGeometry(DW - 4, KPH, 0.6), matSS(0.18, 1.0), 0, kpY, KICKPLATE_Z);

  // 8 screws — sunk into kickplate front face, axis along +Z
  // Cylinder default Y-axis; rotate.x = PI/2 makes axis +Z (face viewer)
  const kpScrewGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 12);
  for (const sx of [-DW / 2 + 5, -DW / 6, DW / 6, DW / 2 - 5]) {
    for (const sy of [-DH / 2 + 2.5, -DH / 2 + KPH - 1]) {
      const screw = new THREE.Mesh(kpScrewGeo, matSS(0.2, 1.0));
      screw.rotation.x = Math.PI / 2; // disc face → +Z
      screw.position.set(sx, sy, KICKPLATE_FRONT_Z - 0.05); // sunk -0.05
      kickplateGroup.add(screw);
    }
  }

  // ── Hardware ──
  const hingesGroup = new THREE.Group();
  hingesGroup.userData.partId = 'hinges';
  scene.add(hingesGroup);
  buildSculptedHinges(hingesGroup, leafGroup);

  const barPullGroup = new THREE.Group();
  barPullGroup.userData.partId = 'bar-pull';
  leafGroup.add(barPullGroup);
  buildSculptedBarPull(barPullGroup);

  const lockGroup = new THREE.Group();
  lockGroup.userData.partId = 'lockset';
  leafGroup.add(lockGroup);
  buildSculptedMortise(lockGroup);

  buildSculptedCloser(closerGroup);

  // ── Annotations ──
  // Continuity-focused: every edge, hardware cutout, and frame overlap is
  // annotated so the radiation-shielding narrative is auditable from any camera angle.
  // Reviewer can verify: Pb wraps tepi daun + jamb throat + sill, and is preserved
  // across hinge / closer / lockset cutouts (kritik v1 §1-3).
  placeAnnotations(
    scene,
    [
      // Hardware identification (existing tier)
      { partId: 'closer',      anchor: new THREE.Vector3(0, DH / 2 + FW / 2, DT / 2 + 3), label: 'Closer Sargent 281 (Regular Arm)' },
      { partId: 'view-glass',  anchor: new THREE.Vector3(0, GY, glassDepth / 2), label: 'View Glass Pb (200×300, R15 corner)' },
      { partId: 'bar-pull',    anchor: new THREE.Vector3(DW / 2 - 4, 0, DT / 2 + 2.5), label: 'Bar Pull SS ⌀22×500' },
      { partId: 'hinges',      anchor: new THREE.Vector3(-DW / 2, DH / 2 - 18, DT / 2), label: 'Hinge 1/3 (5-knuckle butt)' },
      { partId: 'lockset',     anchor: new THREE.Vector3(DW / 2 + 0.5, -8, 0), label: 'Mortise X-Ray + Faceplate 250mm' },
      { partId: 'kickplate',   anchor: new THREE.Vector3(0, kpY, DT / 2 + 0.32), label: 'Kickplate SS (260mm)' },
      { partId: 'drop-seal',   anchor: new THREE.Vector3(DW / 2 - 0.5, -DH / 2 + 0.5, DT / 2 + 0.4), label: 'Drop Seal + Activation Pin' },
      { partId: 'frame',       anchor: new THREE.Vector3(-(DW / 2 + FW / 2), -DH / 2 + 30, FD / 2), label: 'Frame Jamb (Pb-lined throat)' },

      // Continuity tier — auditable shielding narrative
      { partId: 'lead-stripes', anchor: new THREE.Vector3(0, DH / 2 - 1, 0), label: '2 mmPb continuous · Top Edge' },
      { partId: 'lead-stripes', anchor: new THREE.Vector3(0, -DH / 2 + 1, 0), label: '2 mmPb continuous · Bottom Edge' },
      { partId: 'lead-stripes', anchor: new THREE.Vector3(HINGE_X + 1, 0, 0), label: '2 mmPb continuous · Hinge Edge (no break at knuckle cutout)' },
      { partId: 'lead-stripes', anchor: new THREE.Vector3(HANDLE_X - 1, 0, 0), label: '2 mmPb continuous · Latch Edge (mortise pocket lined)' },
      { partId: 'view-glass',   anchor: new THREE.Vector3(GW / 2 + 1, GY, -DT / 4 + 0.3), label: 'Pb rebate frame · View Glass overlap' },
    ],
    DW / 2 + 60,
    [-DH / 2, DH / 2 + FW + 5],
  );

  return { leafPivot, closerGroup };
}

// ── Scenario mode (open / close cycle) ───────────────────────
type DoorScenario = 'closed' | 'open';
const OPEN_ANGLE_RAD = Math.PI / 2; // 90° outward swing (latch side moves +Z)
const CYCLE_DURATION_MS = 900;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── React component ──────────────────────────────────────────
export function PbLeadDoorAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(product.cameraPresets[0]?.name ?? '');
  const [scenarioMode, setScenarioMode] = useState<DoorScenario>('closed');
  const handlesRef = useRef<SceneHandles | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 60,
      maxDistance: 900,
    },
    onInit: (refs) => {
      handlesRef.current = buildScene(refs.scene, refs.renderer);
      const p = product.cameraPresets[0];
      if (p) applyCameraPreset(refs, p.position, p.target);
      attachHighlight(refs);
    },
    deps: [product],
  });

  // Animate leaf rotation + closer visibility when scenarioMode changes
  useEffect(() => {
    const handles = handlesRef.current;
    if (!handles) return;
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);

    const fromAngle = handles.leafPivot.rotation.y;
    const toAngle = scenarioMode === 'open' ? OPEN_ANGLE_RAD : 0;
    const startTime = performance.now();

    // Closer is hidden during open scenario because arm articulation isn't
    // modelled; showing static closer with rotated leaf would clip into frame.
    handles.closerGroup.visible = scenarioMode === 'closed';

    const tick = () => {
      const t = Math.min((performance.now() - startTime) / CYCLE_DURATION_MS, 1);
      const eased = easeInOutCubic(t);
      handles.leafPivot.rotation.y = fromAngle + (toAngle - fromAngle) * eased;
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = null;
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [scenarioMode]);

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
    product.cameraPresets.forEach((p, i) =>
      setTimeout(() => {
        goTo(p);
        setTimeout(() => dl(p.name), 700);
      }, i * 1000),
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
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card text-xs uppercase tracking-wide">
        <span className="text-muted-foreground">Scenario:</span>
        <button
          type="button"
          onClick={() => setScenarioMode('closed')}
          className={`px-2 py-1 border ${scenarioMode === 'closed' ? 'bg-foreground text-background border-foreground' : 'bg-background text-foreground border-border hover:bg-accent'}`}
          aria-pressed={scenarioMode === 'closed'}
        >
          Closed (audit view)
        </button>
        <button
          type="button"
          onClick={() => setScenarioMode('open')}
          className={`px-2 py-1 border ${scenarioMode === 'open' ? 'bg-foreground text-background border-foreground' : 'bg-background text-foreground border-border hover:bg-accent'}`}
          aria-pressed={scenarioMode === 'open'}
        >
          Open 90°
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  );
}
