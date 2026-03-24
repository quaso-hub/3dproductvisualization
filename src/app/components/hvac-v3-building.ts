/**
 * hvac-v3-building.ts
 * ─────────────────────────────────────────────────────────────
 * V3 Building shell: OR room 6×6×3m, 4 walls (2 glass + 2 solid),
 * ceiling with 2 LAF openings, interstitial space Y=3→5,
 * roof wireframe, mechanical room X=6→9.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import {
  matFloor, matGlassWall, matSolidWall, matCeiling, matRooftopSlab,
} from './hvac-bim-materials';

// ─── Constants ────────────────────────────────────────────────
const ROOM_W = 6;   // X
const ROOM_D = 6;   // Z
const ROOM_H = 3;   // Y (floor to ceiling)
const INTER_H = 2;  // interstitial height (Y=3 → Y=5)
const MECH_X0 = 6;  // mechanical room start X
const MECH_X1 = 9;  // mechanical room end X
const WALL_T = 0.1;  // wall thickness

// ─── Edge overlay helper ──────────────────────────────────────
function addEdges(parent: THREE.Group, mesh: THREE.Mesh, color = 0x445566) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color, linewidth: 1 }),
  );
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  parent.add(edges);
}

// ─── Main builder ─────────────────────────────────────────────

export function buildBuilding(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_building';

  /* ── Floor ── */
  const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D, 12, 12);
  const floor = new THREE.Mesh(floorGeo, matFloor());
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  floor.receiveShadow = true;
  floor.name = 'mesh_floor';
  group.add(floor);

  /* ── 4 Walls ── */
  // West (X=-3, solid)
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, ROOM_H, ROOM_D), matSolidWall());
  wallW.position.set(-ROOM_W / 2, ROOM_H / 2, 0);
  wallW.name = 'wall_west';
  group.add(wallW);

  // East (X=+3, glass — viewer side)
  const wallE = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, ROOM_H, ROOM_D), matGlassWall());
  wallE.position.set(ROOM_W / 2, ROOM_H / 2, 0);
  wallE.name = 'wall_east';
  group.add(wallE);

  // North (Z=-3, glass)
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, WALL_T), matGlassWall());
  wallN.position.set(0, ROOM_H / 2, -ROOM_D / 2);
  wallN.name = 'wall_north';
  group.add(wallN);

  // South (Z=+3, solid)
  const wallS = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, WALL_T), matSolidWall());
  wallS.position.set(0, ROOM_H / 2, ROOM_D / 2);
  wallS.name = 'wall_south';
  group.add(wallS);

  // Wall edge lines
  [wallW, wallE, wallN, wallS].forEach(w => addEdges(group, w));

  /* ── Ceiling with LAF openings ── */
  const ceilMesh = buildCeilingWithOpenings();
  ceilMesh.position.y = ROOM_H;
  ceilMesh.name = 'mesh_ceiling';
  group.add(ceilMesh);

  /* ── Interstitial space walls (Y=3→5) ── */
  const interGroup = buildInterstitial();
  group.add(interGroup);

  /* ── Mechanical room (X=6→9, Y=0→ROOM_H) ── */
  const mechGroup = buildMechanicalRoom();
  group.add(mechGroup);

  /* ── Roof (Y=5) ── */
  const roofGroup = buildRoof();
  group.add(roofGroup);

  return group;
}

// ─── Ceiling with 2 LAF openings (Shape + holes) ─────────────

function buildCeilingWithOpenings(): THREE.Mesh {
  const hw = ROOM_W / 2;
  const hd = ROOM_D / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd);
  shape.lineTo(-hw, hd);
  shape.closePath();

  // LAF hole 1 (left): 1.2×1.8m centered at X=-1.5
  const hole1 = new THREE.Path();
  hole1.moveTo(-2.1, -0.9);
  hole1.lineTo(-0.9, -0.9);
  hole1.lineTo(-0.9, 0.9);
  hole1.lineTo(-2.1, 0.9);
  hole1.closePath();
  shape.holes.push(hole1);

  // LAF hole 2 (right): 1.2×1.8m centered at X=+1.5
  const hole2 = new THREE.Path();
  hole2.moveTo(0.9, -0.9);
  hole2.lineTo(2.1, -0.9);
  hole2.lineTo(2.1, 0.9);
  hole2.lineTo(0.9, 0.9);
  hole2.closePath();
  shape.holes.push(hole2);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
  const mat = matCeiling();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

// ─── Interstitial space (Y=3→5) ──────────────────────────────

function buildInterstitial(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_interstitial';

  const iMat = new THREE.MeshStandardMaterial({
    color: 0xB8C0C8, roughness: 0.70, metalness: 0.0,
    transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false,
  });

  // 4 walls (same footprint, Y=3→5)
  const specs: Array<{ size: [number, number, number]; pos: [number, number, number] }> = [
    { size: [WALL_T, INTER_H, ROOM_D], pos: [-ROOM_W / 2, ROOM_H + INTER_H / 2, 0] },
    { size: [WALL_T, INTER_H, ROOM_D], pos: [ROOM_W / 2, ROOM_H + INTER_H / 2, 0] },
    { size: [ROOM_W, INTER_H, WALL_T], pos: [0, ROOM_H + INTER_H / 2, -ROOM_D / 2] },
    { size: [ROOM_W, INTER_H, WALL_T], pos: [0, ROOM_H + INTER_H / 2, ROOM_D / 2] },
  ];
  specs.forEach(({ size, pos }) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), iMat);
    m.position.set(...pos);
    group.add(m);
    addEdges(group, m, 0x6688AA);
  });

  return group;
}

// ─── Mechanical room (X=6→9) ──────────────────────────────────

function buildMechanicalRoom(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_mechanical_room';

  const mechW = MECH_X1 - MECH_X0; // 3m
  const mechCX = (MECH_X0 + MECH_X1) / 2; // 7.5

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xCCD0D4, roughness: 0.75, metalness: 0.0,
    transparent: true, opacity: 0.20, side: THREE.DoubleSide, depthWrite: false,
  });

  // Floor extension
  const mechFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(mechW, ROOM_D),
    matFloor(),
  );
  mechFloor.rotation.x = -Math.PI / 2;
  mechFloor.position.set(mechCX, 0.01, 0);
  mechFloor.receiveShadow = true;
  group.add(mechFloor);

  // 3 walls (front Z=+3, back Z=-3, far X=9) — shared wall with OR is X=6
  const walls: Array<{ size: [number, number, number]; pos: [number, number, number] }> = [
    { size: [mechW, ROOM_H, WALL_T], pos: [mechCX, ROOM_H / 2, ROOM_D / 2] },
    { size: [mechW, ROOM_H, WALL_T], pos: [mechCX, ROOM_H / 2, -ROOM_D / 2] },
    { size: [WALL_T, ROOM_H, ROOM_D], pos: [MECH_X1, ROOM_H / 2, 0] },
  ];
  walls.forEach(({ size, pos }) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
    m.position.set(...pos);
    group.add(m);
    addEdges(group, m, 0x556677);
  });

  return group;
}

// ─── Roof (Y=5) ──────────────────────────────────────────────

function buildRoof(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_roof';

  // Roof slab covers OR + interstitial + mechanical
  const roofW = MECH_X1 + ROOM_W / 2; // -3 to 9 = 12m total, but center offset
  const roofCX = (MECH_X1 - ROOM_W / 2) / 2; // center between -3 and 9 = 3

  const roofGeo = new THREE.BoxGeometry(roofW, 0.3, ROOM_D + 1);
  const roof = new THREE.Mesh(roofGeo, matRooftopSlab());
  roof.position.set(roofCX, ROOM_H + INTER_H + 0.15, 0);
  roof.name = 'mesh_roof';
  group.add(roof);

  // Wireframe edges (more visible)
  const roofEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(roofGeo),
    new THREE.LineBasicMaterial({ color: 0x6688AA, linewidth: 1.5 }),
  );
  roofEdges.position.copy(roof.position);
  group.add(roofEdges);

  return group;
}
