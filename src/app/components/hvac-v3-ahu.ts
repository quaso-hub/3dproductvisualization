/**
 * hvac-v3-ahu.ts
 * ─────────────────────────────────────────────────────────────
 * V4 AHU (Air Handling Unit) — 3.8m long, 1.2m wide, 0.93m high.
 * Position: X=5.2→9.0, Z=±0.6, Y=0.1→1.03.
 * Front face semi-transparent (opacity 0.35) — NO clipping planes.
 * Internal sections: G4, F9, coil, heater, fan, UV.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { MAT } from './hvac-bim-materials';

/* ── AHU Section Helpers ─────────────────────────────────── */

function addAHUSection(
  parent: THREE.Group,
  sX: [number, number], y0: number, z0: number,
  H: number, W: number,
  mat: THREE.MeshStandardMaterial,
): void {
  const sl = sX[1] - sX[0];
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(sl * 0.88, H * 0.92, W * 0.88),
    mat,
  );
  block.position.set((sX[0] + sX[1]) / 2, y0 + H / 2, z0 + W / 2);
  parent.add(block);

  // Edge lines for visibility
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(sl * 0.88, H * 0.92, W * 0.88)),
    new THREE.LineBasicMaterial({ color: 0x546E7A }),
  );
  edges.position.copy(block.position);
  parent.add(edges);
}

function addEvapCoilSection(
  parent: THREE.Group,
  sX: [number, number], y0: number, z0: number,
  H: number, W: number,
): void {
  const sl = sX[1] - sX[0];
  const cx = (sX[0] + sX[1]) / 2;
  const cy = y0 + H / 2;
  const cz = z0 + W / 2;

  // Dense fins (InstancedMesh)
  const finCount = 50;
  const finGeo = new THREE.PlaneGeometry(sl * 0.8, H * 0.88);
  const fins = new THREE.InstancedMesh(finGeo, MAT.outerFin, finCount);
  const dummy = new THREE.Object3D();
  for (let f = 0; f < finCount; f++) {
    dummy.position.set(cx, cy, z0 + 0.02 + f * (W * 0.88 / finCount));
    dummy.updateMatrix();
    fins.setMatrixAt(f, dummy.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  parent.add(fins);

  // Copper tubes (4 rows)
  for (let row = 0; row < 4; row++) {
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, sl * 0.75, 10),
      MAT.copper,
    );
    tube.rotation.z = Math.PI / 2;
    tube.position.set(cx, y0 + H * 0.2 + row * H * 0.2, cz);
    parent.add(tube);
  }

  // Condensate droplets
  const dropGeo = new THREE.SphereGeometry(0.004, 5, 4);
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x7FCDDD, transparent: true, opacity: 0.8 });
  for (let d = 0; d < 6; d++) {
    const drop = new THREE.Mesh(dropGeo, dropMat);
    drop.position.set(
      cx + (Math.random() - 0.5) * sl * 0.5,
      y0 + 0.05,
      z0 + 0.1 + Math.random() * W * 0.8,
    );
    parent.add(drop);
  }
}

function addHeaterSection(
  parent: THREE.Group,
  sX: [number, number], y0: number, z0: number,
  H: number, W: number,
): void {
  const sl = sX[1] - sX[0];
  const cx = (sX[0] + sX[1]) / 2;
  const cy = y0 + H / 2;
  const cz = z0 + W / 2;
  const count = 6;

  for (let i = 0; i < count; i++) {
    const elem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, sl * 0.85, 8),
      MAT.heater,
    );
    elem.rotation.z = Math.PI / 2;
    elem.position.set(cx, y0 + H / (count + 1) * (i + 1), cz + (i % 2 - 0.5) * W * 0.2);
    parent.add(elem);
  }

  // Orange warm glow (1 PointLight, intensity 0.25)
  const hl = new THREE.PointLight(0xFF6600, 0.25, 1.5);
  hl.position.set(cx, cy, cz);
  parent.add(hl);
}

function addFanSection(
  parent: THREE.Group,
  sX: [number, number], y0: number, z0: number,
  H: number, W: number,
): void {
  const sl = sX[1] - sX[0];
  const cx = (sX[0] + sX[1]) / 2;
  const cy = y0 + H / 2;
  const cz = z0 + W / 2;

  // Fan scroll housing
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(H * 0.42, H * 0.42, sl * 0.7, 8),
    MAT.fanHousing,
  );
  housing.rotation.z = Math.PI / 2;
  housing.position.set(cx, cy, cz);
  parent.add(housing);

  // Impeller blades (12 blades)
  for (let b = 0; b < 12; b++) {
    const angle = (b / 12) * Math.PI * 2;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(sl * 0.55, H * 0.32, 0.008),
      MAT.fanBlade,
    );
    blade.rotation.set(0, 0, angle + Math.PI * 0.15);
    blade.position.set(cx, cy + Math.sin(angle) * H * 0.28, cz + Math.cos(angle) * 0.04);
    parent.add(blade);
  }

  // Center hub
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, sl * 0.65, 12),
    MAT.fanHousing,
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.set(cx, cy, cz);
  parent.add(hub);

  // Motor (side-mounted)
  const motor = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.18, 0.22),
    MAT.ahuCasing,
  );
  motor.position.set(cx, cy, z0 + W + 0.12);
  parent.add(motor);
}

function addUVSection(
  parent: THREE.Group,
  sX: [number, number], y0: number, z0: number,
  H: number, W: number,
): void {
  const sl = sX[1] - sX[0];
  const cx = (sX[0] + sX[1]) / 2;
  const cy = y0 + H / 2;
  const cz = z0 + W / 2;

  // UV tubes (emissive purple)
  const tube1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, sl * 0.85, 10),
    MAT.uvLamp,
  );
  tube1.rotation.z = Math.PI / 2;
  tube1.position.set(cx, cy + H * 0.12, cz);
  parent.add(tube1);

  const tube2 = tube1.clone();
  tube2.position.set(cx, cy - H * 0.12, cz);
  parent.add(tube2);

  // UV ambient light (1 PointLight, intensity 0.4, range 1.0)
  const uvl = new THREE.PointLight(0x9933CC, 0.35, 1.0);
  uvl.position.set(cx, cy, cz);
  parent.add(uvl);
}

/* ── Main AHU Builder ──────────────────────────────────────── */

export function buildAHU(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_ahu';

  // AHU dimensions and position (from V4 spec)
  const X1 = 5.2, X2 = 9.0, Z1 = -0.6, Z2 = 0.6, Y1 = 0.1, Y2 = 1.03;
  const L = X2 - X1, W = Z2 - Z1, H = Y2 - Y1;
  const cx = (X1 + X2) / 2, cy = (Y1 + Y2) / 2, cz = (Z1 + Z2) / 2;
  const WALL = 0.025;

  // ── CASING (5 panels — front is semi-transparent) ──

  // Bottom
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(L, WALL, W), MAT.ahuCasing);
  bottom.position.set(cx, Y1 + WALL / 2, cz);
  group.add(bottom);

  // Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(L, WALL, W), MAT.ahuCasing);
  top.position.set(cx, Y2 - WALL / 2, cz);
  group.add(top);

  // Left end (X1 side)
  const leftEnd = new THREE.Mesh(new THREE.BoxGeometry(WALL, H, W), MAT.ahuCasing);
  leftEnd.position.set(X1 + WALL / 2, cy, cz);
  group.add(leftEnd);

  // Right end (X2 side)
  const rightEnd = new THREE.Mesh(new THREE.BoxGeometry(WALL, H, W), MAT.ahuCasing);
  rightEnd.position.set(X2 - WALL / 2, cy, cz);
  group.add(rightEnd);

  // Back face (Z1 side — solid)
  const backFace = new THREE.Mesh(new THREE.BoxGeometry(L, H, WALL), MAT.ahuCasing);
  backFace.position.set(cx, cy, Z1 + WALL / 2);
  group.add(backFace);

  // FRONT FACE (Z2 side — SEMI-TRANSPARENT, opacity 0.35)
  const frontFaceMat = new THREE.MeshStandardMaterial({
    color: 0x546E7A, roughness: 0.4, metalness: 0.5,
    transparent: true, opacity: 0.35,
  });
  const frontFace = new THREE.Mesh(new THREE.BoxGeometry(L, H, WALL), frontFaceMat);
  frontFace.position.set(cx, cy, Z2 - WALL / 2);
  group.add(frontFace);

  // ── ACCESS DOOR outlines on front face ──
  const doorOutlineMat = new THREE.LineBasicMaterial({ color: 0x90A4AE });
  const sectionCount = 5;
  const sectionW = (L - WALL * 2) / sectionCount;
  for (let s = 0; s < sectionCount; s++) {
    const dx = X1 + WALL + s * sectionW + sectionW / 2;
    const doorGeo = new THREE.BoxGeometry(sectionW * 0.9, H * 0.85, 0.001);
    const doorEdge = new THREE.LineSegments(new THREE.EdgesGeometry(doorGeo), doorOutlineMat);
    doorEdge.position.set(dx, cy, Z2);
    group.add(doorEdge);

    // Cam latch
    const latch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.016, 8),
      MAT.flange,
    );
    latch.rotation.x = Math.PI / 2;
    latch.position.set(dx + sectionW * 0.38, cy, Z2 + 0.009);
    group.add(latch);
  }

  // ── INTERNAL SECTIONS ──
  const IH = H - 0.06, IW = W - 0.06;
  const sX: [number, number][] = [
    [X1 + WALL, X1 + WALL + 0.55],         // G4 Pre-filter
    [X1 + WALL + 0.55, X1 + WALL + 1.35],  // F8/F9 filter
    [X1 + WALL + 1.35, X1 + WALL + 1.85],  // Evaporator Coil
    [X1 + WALL + 1.85, X1 + WALL + 2.15],  // Heater elements
    [X1 + WALL + 2.15, X1 + WALL + 3.05],  // Fan+scroll housing
    [X1 + WALL + 3.05, X2 - WALL],          // UV lamp + outlet
  ];

  addAHUSection(group, sX[0], Y1 + 0.03, Z1 + 0.03, IH, IW, MAT.filterG4);
  addAHUSection(group, sX[1], Y1 + 0.03, Z1 + 0.03, IH, IW, MAT.filterF9);
  addEvapCoilSection(group, sX[2], Y1 + 0.03, Z1 + 0.03, IH, IW);
  addHeaterSection(group, sX[3], Y1 + 0.03, Z1 + 0.03, IH, IW);
  addFanSection(group, sX[4], Y1 + 0.03, Z1 + 0.03, IH, IW);
  addUVSection(group, sX[5], Y1 + 0.03, Z1 + 0.03, IH, IW);

  // ── SECTION DIVIDER BAFFLES ──
  const baffleMat = new THREE.MeshStandardMaterial({
    color: 0x546E7A, metalness: 0.5, transparent: true, opacity: 0.6,
  });
  sX.slice(1).forEach(sx => {
    const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.008, IH, IW), baffleMat);
    baffle.position.set(sx[0], Y1 + 0.03 + IH / 2, cz);
    group.add(baffle);
  });

  // ── MAGNEHELIC GAUGE (on top) ──
  const mg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.048, 0.022, 32),
    MAT.magnehelic,
  );
  mg.position.set(X1 + 0.6, Y2, cz);
  group.add(mg);

  const mgDial = new THREE.Mesh(
    new THREE.CircleGeometry(0.044, 32),
    new THREE.MeshStandardMaterial({ color: 0xF5F5F5, roughness: 0.7 }),
  );
  mgDial.rotation.x = -Math.PI / 2;
  mgDial.position.set(X1 + 0.6, Y2 + 0.012, cz);
  group.add(mgDial);

  // ── INLET LOUVRES (left end face) ──
  for (let li = 0; li < 12; li++) {
    const ly = Y1 + 0.05 + li * (H * 0.85 / 12);
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.006, W * 0.85),
      MAT.flange,
    );
    slat.position.set(X1, ly, cz);
    slat.rotation.z = Math.PI * 0.12;
    group.add(slat);
  }

  // ── DRAIN PAN (below coil section) ──
  const dp = new THREE.Mesh(
    new THREE.BoxGeometry(sX[2][1] - sX[2][0] + 0.1, 0.04, W - 0.04),
    new THREE.MeshStandardMaterial({ color: 0x7798AA, metalness: 0.7, roughness: 0.25 }),
  );
  dp.position.set((sX[2][0] + sX[2][1]) / 2, Y1 + 0.02, cz);
  group.add(dp);

  // ── VIBRATION ISOLATORS (4 corners) ──
  const isoCorners: [number, number][] = [
    [X1 + 0.1, Z1 + 0.05], [X1 + 0.1, Z2 - 0.05],
    [X2 - 0.1, Z1 + 0.05], [X2 - 0.1, Z2 - 0.05],
  ];
  isoCorners.forEach(([ix, iz]) => {
    const iso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.85 }),
    );
    iso.position.set(ix, Y1 - 0.04, iz);
    group.add(iso);
  });

  return group;
}
