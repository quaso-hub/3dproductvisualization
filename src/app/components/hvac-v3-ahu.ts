/**
 * hvac-v3-ahu.ts
 * ─────────────────────────────────────────────────────────────
 * V3 AHU (Air Handling Unit) — HERO COMPONENT
 * 1.2×3.0×0.93m double-skin body with Material.clippingPlanes
 * cutaway exposing all internal sections:
 *   Inlet louvres → G4 pre-filter → F8/F9 → Evaporator coil →
 *   Heater elements → Centrifugal fan → UV-C lamp
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import {
  matAHUBody, matFilterG4, matFilterF89, matCoilFin, matCopper,
  matHeaterElement, matScrollHousing, matFanBlade, matUVLamp,
  matDrainPan, matBaffle, matSlat, matGalvanised, matStainless,
  matRubberGasket,
} from './hvac-bim-materials';

// ─── AHU Dimensions (meters) ──────────────────────────────────
const W = 1.2;       // width (X)
const L = 3.0;       // length (Z)
const H = 0.93;      // height (Y)
const WALL_T = 0.025; // double-skin wall thickness

// ─── Clipping plane for cutaway ───────────────────────────────
// Cuts from the left side (-X), exposing internals to the viewer
export const ahuCutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), W / 2 + 0.01);

// ─── Main builder ─────────────────────────────────────────────

export function buildAHU(): {
  group: THREE.Group;
  uvLights: THREE.PointLight[];
  fanGroup: THREE.Group;
  heaterMeshes: THREE.Mesh[];
} {
  const group = new THREE.Group();
  group.name = 'grp_ahu';

  const uvLights: THREE.PointLight[] = [];
  const heaterMeshes: THREE.Mesh[] = [];

  /* ── Outer casing (clipped) ── */
  const casingMat = matAHUBody();
  casingMat.clippingPlanes = [ahuCutPlane];
  casingMat.side = THREE.DoubleSide;

  // 5 panels: top, bottom, right, front, back (left side gets clipped away)
  const panels: Array<{ size: [number, number, number]; pos: [number, number, number] }> = [
    { size: [W, WALL_T, L], pos: [0, H - WALL_T / 2, 0] },        // TOP
    { size: [W, WALL_T, L], pos: [0, WALL_T / 2, 0] },             // BOTTOM
    { size: [WALL_T, H, L], pos: [W / 2 - WALL_T / 2, H / 2, 0] }, // RIGHT
    { size: [W, H, WALL_T], pos: [0, H / 2, L / 2 - WALL_T / 2] }, // FRONT
    { size: [W, H, WALL_T], pos: [0, H / 2, -L / 2 + WALL_T / 2] }, // BACK
  ];
  panels.forEach(({ size, pos }) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), casingMat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    group.add(mesh);
  });

  // Cut face cap (solid fill where casing is cut)
  const capMat = new THREE.MeshStandardMaterial({ color: 0xCCCCC0, roughness: 0.9 });
  const capGeo = new THREE.PlaneGeometry(H, L);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.rotation.y = Math.PI / 2;
  cap.position.set(-W / 2, H / 2, 0);
  group.add(cap);

  // Structural ribs (vertical panel joins every ~0.5m)
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x6677AA, metalness: 0.7, roughness: 0.25 });
  const ribCount = 6;
  for (let i = 0; i <= ribCount; i++) {
    const z = -L / 2 + i * (L / ribCount);
    const ribGeo = new THREE.BoxGeometry(W, H, 0.008);
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.position.set(0, H / 2, z);
    rib.renderOrder = 1;
    group.add(rib);
  }

  /* ── Interior group (NOT clipped — always visible) ── */
  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'grp_ahu_interior';

  // Section divider baffles
  const bafflePositions = [-0.8, -0.4, 0.0, 0.4, 0.8, 1.2];
  bafflePositions.forEach(z => {
    const baffle = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.05, H - 0.05, 0.004),
      matBaffle(),
    );
    baffle.position.set(0, H / 2, z);
    interiorGroup.add(baffle);
  });

  // G4 Pre-filter (Z=-1.2)
  const prefilter = buildFilterBank(0.55, 0.85, 0.05, 12, matFilterG4());
  prefilter.position.set(0, H / 2, -1.2);
  interiorGroup.add(prefilter);

  // F8/F9 Medium filter (Z=-0.7)
  const medfilter = buildFilterBank(0.55, 0.85, 0.30, 40, matFilterF89());
  medfilter.position.set(0, H / 2, -0.7);
  interiorGroup.add(medfilter);

  // Evaporator coil (Z=-0.2)
  const coil = buildEvaporatorCoil(0.50, 0.80, 0.25);
  coil.position.set(0, H / 2, -0.2);
  interiorGroup.add(coil);

  // Heater elements (Z=0.3)
  const { group: heaterGrp, meshes: hMeshes } = buildHeaterElements(0.50, 0.80, 6);
  heaterGrp.position.set(0, H / 2, 0.3);
  interiorGroup.add(heaterGrp);
  heaterMeshes.push(...hMeshes);

  // Centrifugal fan + scroll housing (Z=0.75)
  const fan = buildCentrifugalFan(0.45, 0.42);
  fan.position.set(0, H / 2, 0.75);
  interiorGroup.add(fan);

  // UV-C lamp (Z=1.2)
  const { group: uvGrp, lights } = buildUVCLamp(W - 0.1, H - 0.1);
  uvGrp.position.set(0, H / 2, 1.2);
  interiorGroup.add(uvGrp);
  uvLights.push(...lights);

  // Drain pan (under coil section)
  const drainPan = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.05, 0.05, 0.45),
    matDrainPan(),
  );
  drainPan.position.set(0, WALL_T + 0.025, -0.2);
  interiorGroup.add(drainPan);

  group.add(interiorGroup);

  /* ── Exterior features ── */
  const exteriorGroup = new THREE.Group();
  exteriorGroup.name = 'grp_ahu_exterior';

  // Access doors on front face
  addAHUAccessDoors(exteriorGroup);

  // Magnehelic gauge
  const gauge = buildMagnehelicGauge();
  gauge.position.set(W / 2 + 0.05, H * 0.6, -1.0);
  gauge.rotation.y = Math.PI / 2;
  exteriorGroup.add(gauge);

  // Inlet louvres (back face Z=-L/2)
  const louvres = buildInletLouvres(0.5, 0.6);
  louvres.position.set(0, H * 0.4, -L / 2 - 0.01);
  exteriorGroup.add(louvres);

  // Flexible duct connection at outlet
  const flex = buildFlexibleConnection(0.4, 0.3, 0.25);
  flex.position.set(0, H * 0.7, L / 2);
  exteriorGroup.add(flex);

  group.add(exteriorGroup);

  // Position AHU in mechanical room
  group.position.set(7.5, 0, 0);

  return { group, uvLights, fanGroup: fan, heaterMeshes };
}

// ─── Sub-builders ─────────────────────────────────────────────

function buildFilterBank(
  width: number, height: number, depth: number,
  pleatCount: number, filterMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();

  // Aluminium frame
  const frameMat = matGalvanised();
  const bw = 0.02;
  const borders: Array<{ size: [number, number, number]; pos: [number, number, number] }> = [
    { size: [width, bw, depth], pos: [0, height / 2, 0] },
    { size: [width, bw, depth], pos: [0, -height / 2, 0] },
    { size: [bw, height, depth], pos: [width / 2, 0, 0] },
    { size: [bw, height, depth], pos: [-width / 2, 0, 0] },
  ];
  borders.forEach(({ size, pos }) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(...size), frameMat);
    b.position.set(...pos);
    group.add(b);
  });

  // Pleated media (InstancedMesh)
  const pleatW = (width - bw * 2) / pleatCount;
  const pleatGeo = new THREE.PlaneGeometry(0.002, height - bw * 2);
  const pleatInst = new THREE.InstancedMesh(pleatGeo, filterMat, pleatCount * 2);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < pleatCount; i++) {
    const x = -width / 2 + bw + (i + 0.25) * pleatW;
    // Forward fold
    dummy.position.set(x, 0, depth * 0.25);
    dummy.rotation.y = Math.PI * 0.15;
    dummy.updateMatrix();
    pleatInst.setMatrixAt(i * 2, dummy.matrix);
    // Backward fold
    dummy.position.set(x + pleatW * 0.5, 0, depth * -0.25);
    dummy.rotation.y = -Math.PI * 0.15;
    dummy.updateMatrix();
    pleatInst.setMatrixAt(i * 2 + 1, dummy.matrix);
  }
  pleatInst.instanceMatrix.needsUpdate = true;
  group.add(pleatInst);

  return group;
}

function buildEvaporatorCoil(width: number, height: number, depth: number): THREE.Group {
  const group = new THREE.Group();

  // Dense aluminium fin array (~80 fins)
  const finCount = Math.floor(depth / 0.003);
  const finGeo = new THREE.PlaneGeometry(0.001, height * 0.95);
  const finMat = matCoilFin();
  finMat.side = THREE.DoubleSide;
  const fins = new THREE.InstancedMesh(finGeo, finMat, finCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < finCount; i++) {
    dummy.position.set(0, 0, -depth / 2 + i * (depth / finCount));
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  group.add(fins);

  // Copper tubes (4 rows × 3 columns)
  const copperMat = matCopper();
  const tubeRows = 4, tubeCols = 3;
  const tubeR = 0.009;
  for (let col = 0; col < tubeCols; col++) {
    for (let row = 0; row < tubeRows; row++) {
      const tubeGeo = new THREE.CylinderGeometry(tubeR, tubeR, width, 12);
      const tube = new THREE.Mesh(tubeGeo, copperMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(
        0,
        -height / 2 * 0.4 + row * height * 0.3,
        -depth / 2 + col * depth / (tubeCols - 1) + depth / (tubeCols * 2),
      );
      group.add(tube);
    }
  }

  // Header pipe
  const header = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, height * 0.9, 12),
    copperMat,
  );
  header.position.set(-width / 2 + 0.02, 0, 0);
  group.add(header);

  // Condensate droplets (visual detail)
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x88AACC, transparent: true, opacity: 0.85 });
  const dropGeo = new THREE.SphereGeometry(0.004, 6, 4);
  for (let d = 0; d < 8; d++) {
    const drop = new THREE.Mesh(dropGeo, dropMat);
    drop.position.set(
      (Math.random() - 0.5) * width * 0.8,
      -height / 2 + 0.05,
      (Math.random() - 0.5) * depth * 0.8,
    );
    group.add(drop);
  }

  return group;
}

function buildHeaterElements(
  width: number, height: number, count: number,
): { group: THREE.Group; meshes: THREE.Mesh[] } {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const heatMat = matHeaterElement();
  const spacing = height / (count + 1);

  for (let i = 0; i < count; i++) {
    const elemGeo = new THREE.CylinderGeometry(0.005, 0.005, width * 0.85, 8);
    const elem = new THREE.Mesh(elemGeo, heatMat.clone());
    elem.rotation.z = Math.PI / 2;
    elem.position.y = -height / 2 + spacing * (i + 1);
    group.add(elem);
    meshes.push(elem);

    // Warm glow point light every other element
    if (i % 2 === 0) {
      const light = new THREE.PointLight(0xFF6600, 0.3, 0.5);
      light.position.copy(elem.position);
      group.add(light);
    }
  }

  return { group, meshes };
}

function buildCentrifugalFan(diameter: number, width: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_fan';

  // Scroll housing
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(diameter / 2 + 0.05, diameter / 2 + 0.05, width, 6),
    matScrollHousing(),
  );
  housing.rotation.x = Math.PI / 2;
  group.add(housing);

  // 16 forward-curved impeller blades
  const bladeMat = matFanBlade();
  const bladeCount = 16;
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2;
    const bladeGeo = new THREE.BoxGeometry(0.008, diameter * 0.35, width * 0.85);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.x = Math.cos(angle) * diameter * 0.35;
    blade.position.y = Math.sin(angle) * diameter * 0.35;
    blade.rotation.z = angle + Math.PI * 0.2;
    group.add(blade);
  }

  // Center hub
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, width, 12),
    new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.8, roughness: 0.2 }),
  );
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  // Motor assembly
  const motor = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.18, 0.22),
    matScrollHousing(),
  );
  motor.position.set(diameter / 2 + 0.14, 0, 0);
  group.add(motor);

  return group;
}

function buildUVCLamp(
  width: number, height: number,
): { group: THREE.Group; lights: THREE.PointLight[] } {
  const group = new THREE.Group();
  const lights: THREE.PointLight[] = [];

  const uvMat = matUVLamp();

  // 2 UV-C tubes
  ([-0.1, 0.1] as const).forEach(yOff => {
    const lampGeo = new THREE.CylinderGeometry(0.012, 0.012, width * 0.9, 12);
    const lamp = new THREE.Mesh(lampGeo, uvMat.clone());
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(0, yOff, 0);
    group.add(lamp);

    const uvLight = new THREE.PointLight(0x8844FF, 1.5, 1.2);
    uvLight.position.copy(lamp.position);
    group.add(uvLight);
    lights.push(uvLight);
  });

  // Brackets
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.6, roughness: 0.3 });
  [-width / 2 * 0.4, 0, width / 2 * 0.4].forEach(zPos => {
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.25, 0.03),
      bracketMat,
    );
    bracket.position.set(zPos, 0, 0.14);
    group.add(bracket);
  });

  return { group, lights };
}

function addAHUAccessDoors(parent: THREE.Group): void {
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x7788AA, metalness: 0.55, roughness: 0.38 });
  const latchMat = matStainless();

  const doorSpecs = [
    { w: 0.55, h: 0.42, x: 0, y: 0.6 },
    { w: 0.55, h: 0.42, x: 0, y: 0.22 },
    { w: 0.55, h: 0.55, x: 0, y: H * 0.58 },
    { w: 0.55, h: 0.25, x: 0, y: 0.08 },
  ];

  doorSpecs.forEach(({ w, h, x, y }) => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), doorMat);
    door.position.set(x, y, -L / 2 - 0.003);
    parent.add(door);

    // Cam latches (2 per door)
    [-0.35, 0.35].forEach(lx => {
      const latch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.018, 8),
        latchMat,
      );
      latch.rotation.x = Math.PI / 2;
      latch.position.set(x + lx * (w / 0.7), y, -L / 2 - 0.01);
      parent.add(latch);
    });
  });
}

function buildMagnehelicGauge(): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.45, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 32), bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  // Dial face
  const dial = new THREE.Mesh(
    new THREE.CircleGeometry(0.046, 32),
    new THREE.MeshStandardMaterial({ color: 0xF8F8F0, roughness: 0.8 }),
  );
  dial.position.z = 0.013;
  group.add(dial);

  // Needle
  const needleGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0.015),
    new THREE.Vector3(0.03, 0, 0.015),
  ]);
  const needle = new THREE.Line(needleGeo, new THREE.LineBasicMaterial({ color: 0xFF2200 }));
  needle.rotation.z = Math.PI * 0.35;
  group.add(needle);

  return group;
}

function buildInletLouvres(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const slats = 12;
  const slatMat = matSlat();

  for (let i = 0; i < slats; i++) {
    const slatGeo = new THREE.BoxGeometry(width, 0.006, 0.025);
    const slatMesh = new THREE.Mesh(slatGeo, slatMat);
    slatMesh.position.y = -height / 2 + (i + 0.5) * height / slats;
    slatMesh.rotation.x = Math.PI * -0.15;
    group.add(slatMesh);
  }

  // Frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.6, roughness: 0.3 });
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.04, height + 0.04, 0.008),
    frameMat,
  );
  group.add(frame);

  return group;
}

function buildFlexibleConnection(width: number, height: number, length: number): THREE.Group {
  const group = new THREE.Group();
  const folds = 8;
  const foldMat = matRubberGasket();
  foldMat.side = THREE.DoubleSide;

  for (let i = 0; i < folds; i++) {
    const z = i * length / folds;
    const radius = i % 2 === 0 ? width / 2 : width / 2 * 1.08;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 8, 24),
      foldMat,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.z = z;
    group.add(ring);
  }

  return group;
}
