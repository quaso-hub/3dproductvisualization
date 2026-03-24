/**
 * hvac-v3-ductwork.ts
 * ─────────────────────────────────────────────────────────────
 * V3 Supply + Return ductwork with SMACNA flanges every 1.2m,
 * hanger assemblies, volume dampers with actuators,
 * aluminium tape joints.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import {
  matPIUDuct, matDuctReturn, matSMACNAFlange, matAluminiumTape,
  matGalvanised, matBaffle,
} from './hvac-bim-materials';

// ─── Duct section builder ─────────────────────────────────────

type Vec3Tuple = [number, number, number];

/**
 * Builds a rectangular duct along straight-segment paths.
 * Adds SMACNA flanges every 1.2m and hangers from ceiling.
 */
function buildDuctSection(
  W: number, H: number,
  pathPoints: Vec3Tuple[],
  isSupply: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const ductMat = isSupply ? matPIUDuct() : matDuctReturn();

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const start = new THREE.Vector3(...pathPoints[i]);
    const end = new THREE.Vector3(...pathPoints[i + 1]);
    const direction = end.clone().sub(start);
    const length = direction.length();
    if (length < 0.01) continue;

    const mid = start.clone().add(end).multiplyScalar(0.5);

    // Duct body
    const ductGeo = new THREE.BoxGeometry(W, H, length);
    const ductMesh = new THREE.Mesh(ductGeo, ductMat);
    ductMesh.position.copy(mid);
    ductMesh.lookAt(end);
    ductMesh.rotateX(Math.PI / 2);
    ductMesh.castShadow = true;
    group.add(ductMesh);

    // Flanges every 1.2m
    const flangeCount = Math.ceil(length / 1.2);
    for (let f = 0; f <= flangeCount; f++) {
      const t = f / Math.max(flangeCount, 1);
      const fPos = start.clone().lerp(end, t);
      addDuctFlange(group, fPos, W, H);
    }

    // Hangers (only in interstitial / below roof level)
    if (mid.y < 4.5 && mid.y > 1.0) {
      addDuctHanger(group, mid, W, H, 5.0);
    }
  }

  return group;
}

// ─── Flange (SMACNA TDC/TDF style) ───────────────────────────

function addDuctFlange(
  parent: THREE.Group,
  position: THREE.Vector3,
  W: number, H: number,
): void {
  const fw = 0.035;
  const flangeMat = matSMACNAFlange();

  const corners: Array<{ size: [number, number, number]; off: [number, number, number] }> = [
    { size: [W + fw * 2, fw, 0.008], off: [0, H / 2 + fw / 2, 0] },
    { size: [W + fw * 2, fw, 0.008], off: [0, -H / 2 - fw / 2, 0] },
    { size: [fw, H + fw * 2, 0.008], off: [W / 2 + fw / 2, 0, 0] },
    { size: [fw, H + fw * 2, 0.008], off: [-W / 2 - fw / 2, 0, 0] },
  ];
  corners.forEach(({ size, off }) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(...size), flangeMat);
    f.position.set(position.x + off[0], position.y + off[1], position.z + off[2]);
    parent.add(f);
  });

  // Aluminium tape strip over flange
  const tapeMat = matAluminiumTape();
  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.09, H + 0.09, 0.002),
    tapeMat,
  );
  tape.position.copy(position);
  parent.add(tape);
}

// ─── Hanger assembly (threaded rod + strap + anchor) ──────────

function addDuctHanger(
  parent: THREE.Group,
  ductPos: THREE.Vector3,
  W: number, H: number,
  roofY: number,
): void {
  const rodMat = matGalvanised();
  const rodLength = roofY - (ductPos.y + H / 2);
  if (rodLength <= 0) return;

  ([-W / 2 + 0.05, W / 2 - 0.05] as const).forEach(xOff => {
    // Threaded rod
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, rodLength, 8),
      rodMat,
    );
    rod.position.set(ductPos.x + xOff, ductPos.y + H / 2 + rodLength / 2, ductPos.z);
    parent.add(rod);

    // Nut at top
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.008, 6), rodMat);
    nut.position.set(ductPos.x + xOff, roofY - 0.004, ductPos.z);
    parent.add(nut);

    // Concrete anchor
    const anchor = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.03), rodMat);
    anchor.position.set(ductPos.x + xOff, roofY, ductPos.z);
    parent.add(anchor);
  });

  // Perforated strap under duct
  const strap = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.05, 0.008, 0.025),
    new THREE.MeshStandardMaterial({ color: 0xAAAAAA, metalness: 0.6, roughness: 0.4 }),
  );
  strap.position.set(ductPos.x, ductPos.y - H / 2 - 0.004, ductPos.z);
  parent.add(strap);
}

// ─── Volume damper + actuator ─────────────────────────────────

function addVolumeDamper(
  parent: THREE.Group,
  pos: THREE.Vector3,
  W: number, H: number,
): void {
  // Actuator body
  const actMat = new THREE.MeshStandardMaterial({ color: 0x3A4A5A, roughness: 0.5, metalness: 0.3 });
  const actuator = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.055), actMat);
  actuator.position.set(pos.x + W / 2 + 0.055, pos.y, pos.z);
  parent.add(actuator);

  // Damper blade inside duct
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.9, H * 0.9, 0.003),
    matBaffle(),
  );
  blade.position.copy(pos);
  blade.rotation.y = Math.PI * 0.2; // slightly open
  parent.add(blade);

  // Connecting rod
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 0.06, 6),
    matGalvanised(),
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.set(pos.x + W / 2, pos.y, pos.z);
  parent.add(rod);
}

// ─── Supply duct system assembly ──────────────────────────────

export function buildSupplyDuctwork(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_supply_duct';

  // Main trunk: AHU outlet → interstitial → center of building
  // Rectangular 600×400mm
  const mainTrunkPath: Vec3Tuple[] = [
    [7.2, 1.8, 0],
    [6.5, 1.8, 0],
    [5.5, 1.8, 0],
    [4.5, 3.5, 0],
    [3.0, 4.2, 0],
    [1.5, 4.2, 0],
    [0, 4.2, 0],
  ];
  group.add(buildDuctSection(0.6, 0.4, mainTrunkPath, true));

  // Branch A → LAF Unit 1 (left): 300×300mm
  group.add(buildDuctSection(0.3, 0.3, [
    [0, 4.2, 0],
    [-1.5, 4.2, 0],
    [-1.5, 3.1, 0],
  ], true));

  // Branch B → LAF Unit 2 (right): 300×300mm
  group.add(buildDuctSection(0.3, 0.3, [
    [0, 4.2, 0],
    [1.5, 4.2, 0],
    [1.5, 3.1, 0],
  ], true));

  // Volume dampers at branch takeoffs
  addVolumeDamper(group, new THREE.Vector3(-1.5, 4.2, 0), 0.3, 0.3);
  addVolumeDamper(group, new THREE.Vector3(1.5, 4.2, 0), 0.3, 0.3);

  return group;
}

// ─── Return duct system assembly ──────────────────────────────

export function buildReturnDuctwork(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_return_duct';

  // 4 branch returns from return grilles → trunk
  const returnBranches: Vec3Tuple[][] = [
    [[-2.8, 0.6, 0], [-2.8, 1.8, 0], [-2.5, 2.5, 0], [0, 2.5, 0]],
    [[2.8, 0.6, 0], [2.8, 1.8, 0], [2.5, 2.5, 0], [0, 2.5, 0]],
    [[0, 0.6, -2.8], [0, 1.8, -2.8], [0, 2.5, -2.5], [0, 2.5, 0]],
    [[0, 0.6, 2.8], [0, 1.8, 2.8], [0, 2.5, 2.5], [0, 2.5, 0]],
  ];
  returnBranches.forEach(path => {
    group.add(buildDuctSection(0.4, 0.3, path, false));
  });

  // Main return trunk: center → AHU mixing chamber inlet
  group.add(buildDuctSection(0.5, 0.35, [
    [0, 2.5, 0],
    [2.5, 2.5, 0],
    [4.5, 2.0, 0],
    [6.5, 1.5, 0],
    [7.2, 1.5, 0],
  ], false));

  return group;
}
