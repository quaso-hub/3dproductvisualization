/**
 * hvac-v3-ductwork.ts
 * ─────────────────────────────────────────────────────────────
 * V4 Supply + Return ductwork — AXIS-ALIGNED ONLY.
 * No lookAt(). Every duct is xDuct, yDuct, or zDuct.
 * Supply: cyan #00BCD4. Return: salmon #E57373.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { MAT } from './hvac-bim-materials';

/* ── Axis-aligned duct helpers ────────────────────────────── */

/** Horizontal duct along X axis. Center at midpoint. */
function xDuct(
  parent: THREE.Group,
  x1: number, x2: number, y: number, z: number,
  W: number, H: number,
  mat: THREE.MeshStandardMaterial,
): void {
  const len = Math.abs(x2 - x1);
  if (len < 0.001) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, H, W), mat);
  mesh.position.set((x1 + x2) / 2, y, z);
  parent.add(mesh);
}

/** Vertical duct along Y axis. Center at midpoint. */
function yDuct(
  parent: THREE.Group,
  x: number, y1: number, y2: number, z: number,
  W: number, D: number,
  mat: THREE.MeshStandardMaterial,
): void {
  const len = Math.abs(y2 - y1);
  if (len < 0.001) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, len, D), mat);
  mesh.position.set(x, (y1 + y2) / 2, z);
  parent.add(mesh);
}

/** Horizontal duct along Z axis. Center at midpoint. */
function zDuct(
  parent: THREE.Group,
  x: number, y: number, z1: number, z2: number,
  W: number, H: number,
  mat: THREE.MeshStandardMaterial,
): void {
  const len = Math.abs(z2 - z1);
  if (len < 0.001) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, H, len), mat);
  mesh.position.set(x, y, (z1 + z2) / 2);
  parent.add(mesh);
}

/** Junction box at duct intersection. */
function ductJoint(
  parent: THREE.Group,
  x: number, y: number, z: number,
  size: number,
  mat: THREE.MeshStandardMaterial,
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
}

/** SMACNA-style flange ring around duct. */
function ductFlange(
  parent: THREE.Group,
  x: number, y: number, z: number,
  W: number, H: number,
): void {
  const fw = 0.03;
  const geo = new THREE.BoxGeometry(W + fw * 2, H + fw * 2, 0.008);
  const mesh = new THREE.Mesh(geo, MAT.flange);
  mesh.position.set(x, y, z);
  parent.add(mesh);
}

/* ── Supply Duct System (CYAN) ────────────────────────────── */

export function buildSupplyDuct(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_supply_duct';
  const m = MAT.supplyDuct;
  const SW = 0.5, SH = 0.35; // 500×350mm

  // Riser: AHU outlet → ceiling level
  yDuct(group, 7.1, 0.93, 3.8, 0, SW, SW, m);

  // Horizontal run toward OR room
  xDuct(group, 4.0, 7.1, 3.8, 0, SW, SH, m);

  // Continue into OR room
  xDuct(group, -0.3, 4.0, 3.8, 0, SW, SH, m);

  // Junction at (-0.3, 3.8, 0)
  ductJoint(group, -0.3, 3.8, 0, 0.55, m);

  // Branch Left → LAF-1 at (-1.5, 3.22, -0.5)
  xDuct(group, -1.5, -0.3, 3.8, 0, 0.35, 0.3, m);
  zDuct(group, -1.5, 3.8, 0, -0.5, 0.35, 0.3, m);
  yDuct(group, -1.5, 3.22, 3.8, -0.5, 0.35, 0.35, m);

  // Branch Right → LAF-2 at (1.5, 3.22, -0.5)
  xDuct(group, -0.3, 1.5, 3.8, 0, 0.35, 0.3, m);
  zDuct(group, 1.5, 3.8, 0, -0.5, 0.35, 0.3, m);
  yDuct(group, 1.5, 3.22, 3.8, -0.5, 0.35, 0.35, m);

  // Flanges at key points
  ductFlange(group, 7.1, 0.93, 0, SW, SW);   // AHU outlet
  ductFlange(group, 4.0, 3.8, 0, SW, SH);    // wall penetration
  ductFlange(group, -1.5, 3.22, -0.5, 0.35, 0.35); // LAF-1 inlet
  ductFlange(group, 1.5, 3.22, -0.5, 0.35, 0.35);  // LAF-2 inlet

  return group;
}

/* ── Return Duct System (SALMON) ──────────────────────────── */

export function buildReturnDuct(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_return_duct';
  const m = MAT.returnDuct;
  const RW = 0.4, RH = 0.3; // 400×300mm

  // West grille riser (-3.9, 0.5→3.0)
  yDuct(group, -3.9, 0.5, 3.0, 0, RW, RW, m);
  xDuct(group, -3.9, 0, 3.0, 0, RW, RH, m);

  // East grille riser (3.9, 0.5→3.0)
  yDuct(group, 3.9, 0.5, 3.0, 0, RW, RW, m);
  xDuct(group, 0, 3.9, 3.0, 0, RW, RH, m);

  // North grille riser (0, 0.5→3.0, -3.9)
  yDuct(group, 0, 0.5, 3.0, -3.9, RW, RW, m);
  zDuct(group, 0, 3.0, -3.9, 0, RW, RH, m);

  // South grille riser (0, 0.5→3.0, 3.9)
  yDuct(group, 0, 0.5, 3.0, 3.9, RW, RW, m);
  zDuct(group, 0, 3.0, 0, 3.9, RW, RH, m);

  // Central junction at (0, 3.0, 0)
  ductJoint(group, 0, 3.0, 0, 0.5, m);

  // Trunk: center → wall → AHU inlet
  xDuct(group, 0, 4.0, 3.0, 0, 0.5, RH, m);
  xDuct(group, 4.0, 5.4, 3.0, 0, 0.5, RH, m);

  // Down to AHU inlet
  yDuct(group, 5.3, 1.0, 3.0, 0, 0.5, 0.5, m);

  // Flanges
  ductFlange(group, 5.3, 1.0, 0, 0.5, 0.5);  // AHU inlet
  ductFlange(group, 4.0, 3.0, 0, 0.5, RH);   // wall penetration

  return group;
}
