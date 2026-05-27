/**
 * hvac-v3-building.ts
 * ─────────────────────────────────────────────────────────────
 * V4 Building shell: OR room 8×8×3.5m, transparent walls,
 * EdgesGeometry wireframe, mechanical room ghost shell.
 * Return grilles on 4 walls at Y=0.5.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { MAT } from './hvac-bim-materials';

/* ── Return Air Grille ──────────────────────────────────────── */

function buildReturnGrille(
  x: number, y: number, z: number,
  rotY: number, parent: THREE.Object3D,
): void {
  const group = new THREE.Group();
  const W = 0.55, H = 0.38;
  const border = 0.025;

  // Frame
  const frameParts: [number, number, number, number, number, number][] = [
    [0, H / 2 + border / 2, 0, W + border * 2, border, 0.02],
    [0, -H / 2 - border / 2, 0, W + border * 2, border, 0.02],
    [W / 2 + border / 2, 0, 0, border, H, 0.02],
    [-W / 2 - border / 2, 0, 0, border, H, 0.02],
  ];
  frameParts.forEach(([dx, dy, dz, fw, fh, fd]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), MAT.grilleFrame);
    f.position.set(dx, dy, dz);
    group.add(f);
  });

  // Louver slats (10 slats)
  for (let i = 0; i < 10; i++) {
    const gy = -H / 2 + (i + 0.5) * H / 10;
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.01, 0.005, H / 10 * 1.15),
      MAT.grillSlat,
    );
    slat.position.set(0, gy, 0);
    slat.rotation.x = Math.PI * 0.12;
    group.add(slat);
  }

  group.position.set(x, y, z);
  group.rotation.y = rotY;
  parent.add(group);
}

/* ── Building ──────────────────────────────────────────────── */

export function buildBuilding(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_building';

  // FLOOR (8×8m)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), MAT.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // Grid on floor
  const grid = new THREE.GridHelper(8, 16, 0xB0BEC5, 0xCFD8DC);
  grid.position.set(0, 0.002, 0);
  group.add(grid);

  // WALLS (4 semi-transparent PlaneGeometry panels)
  const wallDefs: { pos: [number, number, number]; rot: [number, number, number]; w: number; h: number }[] = [
    { pos: [-4, 1.75, 0], rot: [0, Math.PI / 2, 0], w: 8, h: 3.5 },   // West
    { pos: [+4, 1.75, 0], rot: [0, -Math.PI / 2, 0], w: 8, h: 3.5 },  // East
    { pos: [0, 1.75, -4], rot: [0, 0, 0], w: 8, h: 3.5 },              // North
    { pos: [0, 1.75, +4], rot: [0, Math.PI, 0], w: 8, h: 3.5 },        // South
  ];
  wallDefs.forEach(({ pos, rot, w, h }) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), MAT.wallGlass);
    wall.position.set(...pos);
    wall.rotation.set(...rot);
    group.add(wall);
  });

  // CEILING (transparent slab)
  const ceilMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), MAT.ceiling);
  ceilMesh.rotation.x = Math.PI / 2;
  ceilMesh.position.set(0, 3.5, 0);
  group.add(ceilMesh);

  // EDGE LINES (architectural wireframe around building)
  const boxGeo = new THREE.BoxGeometry(8, 3.5, 8);
  const edges = new THREE.EdgesGeometry(boxGeo);
  const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x6688AA }));
  wireframe.position.set(0, 1.75, 0);
  group.add(wireframe);

  // RETURN AIR GRILLES (4 grilles, low sidewall, Y=0.5)
  buildReturnGrille(-3.9, 0.5, 0.0, 0, group);            // West
  buildReturnGrille(+3.9, 0.5, 0.0, Math.PI, group);       // East
  buildReturnGrille(0.0, 0.5, -3.9, -Math.PI / 2, group);  // North
  buildReturnGrille(0.0, 0.5, +3.9, Math.PI / 2, group);   // South

  return group;
}

/* ── Mechanical Room Shell ─────────────────────────────────── */

export function buildMechRoom(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_mechroom';

  // Ghost box around AHU mechanical room
  const panels: [number, number, number, number, number, number][] = [
    [7.2, 1.4, -1.5, 4.5, 2.8, 0.006],  // back wall Z-
    [7.2, 1.4, 1.5, 4.5, 2.8, 0.006],   // front wall Z+
    [7.2, 2.8, 0, 4.5, 0.006, 3],        // ceiling
  ];
  panels.forEach(([px, py, pz, w, h, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.mechRoom);
    m.position.set(px, py, pz);
    group.add(m);
  });

  // Edge outline
  const mechBox = new THREE.BoxGeometry(4.5, 2.8, 3);
  const mechEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(mechBox),
    new THREE.LineBasicMaterial({ color: 0x546E7A }),
  );
  mechEdge.position.set(7.2, 1.4, 0);
  group.add(mechEdge);

  return group;
}
