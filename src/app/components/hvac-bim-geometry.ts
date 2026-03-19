/**
 * hvac-bim-geometry.ts
 * ─────────────────────────────────────────────────────────────
 * Pure geometry builder functions for HVAC BIM-MEP viewer.
 * Each function returns a named THREE.Group.
 * Scale: 1 unit = 1 meter.
 *
 * Room: 7×7×3m  |  AHU: X=5, Y=5.5  |  ODU: X=7.5, Y=5
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import * as MAT from './hvac-bim-materials';
import { createHvacHMITexture } from './hvac-panel-texture';
import {
  createBoltArray,
  createAccessDoor,
  createMagnehelicGauge,
  createVibrationIsolator,
  createFlexConnector,
  createDuctJoint,
  createDuctHanger,
  createVolumeDamper,
  createCondenserFinPack,
  createPipeSupportClips,
  createFlareNut,
  createReturnGrilleHighDetail,
  matBrassValve,
} from './hvac-bim-detail-helpers';

/* ── Helpers ──────────────────────────────────────────────── */

function addBox(
  parent: THREE.Group | THREE.Object3D,
  w: number, h: number, d: number,
  material: THREE.Material,
  x = 0, y = 0, z = 0,
  name?: string,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addCyl(
  parent: THREE.Group | THREE.Object3D,
  r: number, h: number,
  material: THREE.Material,
  x = 0, y = 0, z = 0,
  name?: string,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r, r, h, 16);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

/* ================================================================
   A. OR ROOM — Floor, 4 Walls, Ceiling with LAF Hole
   ================================================================ */

export function buildORRoom(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'grp_building';

  const RW = 7, RH = 3, RD = 7; // room 7×3×7m
  const WT = 0.12; // wall thickness

  // Floor
  const floorGeo = new THREE.PlaneGeometry(RW, RD);
  const floor = new THREE.Mesh(floorGeo, MAT.matFloor());
  floor.rotation.x = -Math.PI / 2;
  floor.name = 'floor';
  grp.add(floor);

  const wallMat = MAT.matWall();

  // North wall (Z = -RD/2)
  addBox(grp, RW, RH, WT, wallMat, 0, RH / 2, -RD / 2, 'wall_north');

  // East wall (X = +RW/2)
  addBox(grp, WT, RH, RD, wallMat, RW / 2, RH / 2, 0, 'wall_east');

  // West wall (X = -RW/2)
  addBox(grp, WT, RH, RD, wallMat, -RW / 2, RH / 2, 0, 'wall_west');

  // South wall (Z = +RD/2) — with door opening
  const doorW = 1.0, doorH = 2.1;
  const southShape = new THREE.Shape();
  southShape.moveTo(-RW / 2, 0);
  southShape.lineTo(RW / 2, 0);
  southShape.lineTo(RW / 2, RH);
  southShape.lineTo(-RW / 2, RH);
  southShape.closePath();
  // Door hole (right side of wall)
  const doorHole = new THREE.Path();
  const doorCx = RW / 2 - 0.8; // door center X on south wall
  doorHole.moveTo(doorCx - doorW / 2, 0);
  doorHole.lineTo(doorCx + doorW / 2, 0);
  doorHole.lineTo(doorCx + doorW / 2, doorH);
  doorHole.lineTo(doorCx - doorW / 2, doorH);
  doorHole.closePath();
  southShape.holes.push(doorHole);
  const southGeo = new THREE.ShapeGeometry(southShape);
  const southWall = new THREE.Mesh(southGeo, wallMat);
  southWall.position.set(0, 0, RD / 2);
  southWall.name = 'wall_south';
  grp.add(southWall);

  // Ceiling with LAF hole
  const ceilShape = new THREE.Shape();
  ceilShape.moveTo(-RW / 2, -RD / 2);
  ceilShape.lineTo(RW / 2, -RD / 2);
  ceilShape.lineTo(RW / 2, RD / 2);
  ceilShape.lineTo(-RW / 2, RD / 2);
  ceilShape.closePath();
  // LAF opening (center, 1.2×1.8m)
  const lafHole = new THREE.Path();
  lafHole.moveTo(-0.6, -0.9);
  lafHole.lineTo(0.6, -0.9);
  lafHole.lineTo(0.6, 0.9);
  lafHole.lineTo(-0.6, 0.9);
  lafHole.closePath();
  ceilShape.holes.push(lafHole);
  const ceilGeo = new THREE.ShapeGeometry(ceilShape);
  const ceiling = new THREE.Mesh(ceilGeo, MAT.matCeiling());
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = RH;
  ceiling.name = 'ceiling';
  grp.add(ceiling);

  // Rooftop slab (above ceiling)
  const slabMat = MAT.matRooftopSlab();
  addBox(grp, RW + 2, 0.3, RD + 2, slabMat, 0, RH + 0.15, 0, 'rooftop_slab');

  // Door frame (visible outline on south wall)
  const frameMat = MAT.matStainless();
  // left jamb
  addBox(grp, 0.05, doorH, 0.08, frameMat, doorCx - doorW / 2 - 0.025, doorH / 2, RD / 2);
  // right jamb
  addBox(grp, 0.05, doorH, 0.08, frameMat, doorCx + doorW / 2 + 0.025, doorH / 2, RD / 2);
  // header
  addBox(grp, doorW + 0.1, 0.05, 0.08, frameMat, doorCx, doorH + 0.025, RD / 2);

  grp.userData = { system: 'building', name: 'OR Room Structure' };
  return grp;
}

/* ================================================================
   B. OR INTERIOR — Operating Table, Pendant, Lamp
   ================================================================ */

export function buildORInterior(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'grp_or_interior';
  const eqMat = MAT.matOREquipment();
  const ssMat = MAT.matStainless();

  // Operating table — simplified 2.1×0.55m at center, Y≈0.85m
  const tableGrp = new THREE.Group();
  tableGrp.name = 'operating_table';
  // Base pedestal
  addBox(tableGrp, 0.4, 0.6, 0.4, eqMat, 0, 0.3, 0);
  // Table top
  addBox(tableGrp, 0.55, 0.08, 2.1, ssMat, 0, 0.85, 0);
  // Thin pad
  addBox(tableGrp, 0.50, 0.04, 1.9, new THREE.MeshStandardMaterial({
    color: 0x3A5A5A, roughness: 0.7, metalness: 0,
  }), 0, 0.91, 0);
  tableGrp.userData = {
    system: 'context', name: 'Meja Operasi',
    specs: { 'Ukuran': '2100 × 550 mm', 'Posisi': 'Center OR, di bawah LAF' },
  };
  grp.add(tableGrp);

  // Surgical pendant — ceiling mount + arm + head
  const pendantGrp = new THREE.Group();
  pendantGrp.name = 'surgical_pendant';
  // Ceiling plate
  addCyl(pendantGrp, 0.12, 0.03, ssMat, 0, 3.0 - 0.015, 0);
  // Vertical arm
  addCyl(pendantGrp, 0.04, 0.8, ssMat, 0, 2.6, 0);
  // Horizontal arm
  addBox(pendantGrp, 0.06, 0.06, 0.9, ssMat, 0, 2.2, -0.45);
  // Lamp head (simplified disc)
  const lampHead = addCyl(pendantGrp, 0.35, 0.08, new THREE.MeshStandardMaterial({
    color: 0xE8E8E8, roughness: 0.3, metalness: 0.4,
    emissive: 0xFFF8E0, emissiveIntensity: 0.6,
  }), 0, 2.16, -0.9);
  lampHead.name = 'shadowless_lamp';
  pendantGrp.userData = {
    system: 'context', name: 'Pendant Lampu Operasi',
    specs: { 'Tipe': 'Shadowless 700/700', 'Mount': 'Ceiling pendant' },
  };
  grp.add(pendantGrp);

  grp.userData = { system: 'context', name: 'OR Interior Equipment' };
  return grp;
}

/* ================================================================
   C. OR CEILING — LAF Unit, Plenum, LED Panels, Solid Panels
   ================================================================ */

export function buildORCeiling(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'grp_or_ceiling';

  const LAFW = 1.2, LAFD = 1.8, LAFH = 0.15;
  const CEIL_Y = 3.0;

  // LAF Unit
  const lafGrp = new THREE.Group();
  lafGrp.name = 'laf_unit';

  // Frame bars (4 perimeter bars)
  const frameMat = MAT.matGalvanised();
  const barT = 0.04;
  // X bars (front/back)
  addBox(lafGrp, LAFW, barT, barT, frameMat, 0, CEIL_Y - barT / 2, -LAFD / 2);
  addBox(lafGrp, LAFW, barT, barT, frameMat, 0, CEIL_Y - barT / 2, LAFD / 2);
  // Z bars (left/right)
  addBox(lafGrp, barT, barT, LAFD, frameMat, -LAFW / 2, CEIL_Y - barT / 2, 0);
  addBox(lafGrp, barT, barT, LAFD, frameMat, LAFW / 2, CEIL_Y - barT / 2, 0);

  // Perforated face (with alphaMap)
  const perfCanvas = document.createElement('canvas');
  perfCanvas.width = 24; perfCanvas.height = 42;
  const pCtx = perfCanvas.getContext('2d')!;
  pCtx.fillStyle = '#ffffff';
  pCtx.fillRect(0, 0, 24, 42);
  pCtx.fillStyle = '#000000';
  // Staggered hole pattern
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 4; col++) {
      const ox = row % 2 === 0 ? 0 : 3;
      pCtx.beginPath();
      pCtx.arc(3 + col * 6 + ox, 3 + row * 6, 1.8, 0, Math.PI * 2);
      pCtx.fill();
    }
  }
  const alphaMap = new THREE.CanvasTexture(perfCanvas);
  alphaMap.wrapS = alphaMap.wrapT = THREE.RepeatWrapping;
  alphaMap.repeat.set(LAFW / 0.05, LAFD / 0.05);

  const faceMat = MAT.matLAFFace();
  faceMat.alphaMap = alphaMap;
  faceMat.alphaTest = 0.5;
  faceMat.side = THREE.DoubleSide;
  const faceGeo = new THREE.PlaneGeometry(LAFW - barT * 2, LAFD - barT * 2);
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.rotation.x = Math.PI / 2;
  face.position.y = CEIL_Y - barT;
  face.name = 'laf_face';
  lafGrp.add(face);

  // ── LOD Detail Layer — divider bars, HEPA edge, test port, cam locks ──
  const lafDetail = new THREE.Group();
  lafDetail.name = 'laf_detail';

  // Divider bars (2×3 grid within LAF frame)
  const divMat = MAT.matGalvanised();
  const divW = 0.018, divD = 0.008;
  // 1 horizontal divider (splits LAF into 2 rows along X)
  lafDetail.add(new THREE.Mesh(
    new THREE.BoxGeometry(LAFW - barT * 2, divD, divW), divMat,
  ).translateY(CEIL_Y - barT - divD / 2));
  // 2 vertical dividers (splits into 3 columns along Z)
  const colZ = LAFD / 3;
  for (const zo of [-colZ / 2, colZ / 2]) {
    lafDetail.add(new THREE.Mesh(
      new THREE.BoxGeometry(divW, divD, LAFD - barT * 2), divMat,
    ).translateY(CEIL_Y - barT - divD / 2).translateZ(zo));
  }

  // HEPA filter frame edge (visible at LAF bottom perimeter)
  const hepaFrameMat = new THREE.MeshStandardMaterial({
    color: 0xD0D8E0, roughness: 0.25, metalness: 0.70,
  });
  const hepaH = 0.015;
  // 4 perimeter bars
  lafDetail.add(new THREE.Mesh(new THREE.BoxGeometry(LAFW, hepaH, 0.02), hepaFrameMat)
    .translateY(CEIL_Y - barT - 0.02).translateZ(-LAFD / 2 + 0.01));
  lafDetail.add(new THREE.Mesh(new THREE.BoxGeometry(LAFW, hepaH, 0.02), hepaFrameMat)
    .translateY(CEIL_Y - barT - 0.02).translateZ(LAFD / 2 - 0.01));
  lafDetail.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, hepaH, LAFD), hepaFrameMat)
    .translateY(CEIL_Y - barT - 0.02).translateX(-LAFW / 2 + 0.01));
  lafDetail.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, hepaH, LAFD), hepaFrameMat)
    .translateY(CEIL_Y - barT - 0.02).translateX(LAFW / 2 - 0.01));

  // Test port (Schrader valve, small cylinder on frame side)
  const testPort = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.02, 6),
    matBrassValve(),
  );
  testPort.rotation.z = Math.PI / 2;
  testPort.position.set(LAFW / 2 + 0.01, CEIL_Y - barT / 2, -0.3);
  testPort.name = 'test_port';
  lafDetail.add(testPort);

  // Cam lock retainers (4, one per frame side midpoint)
  const camLockMat = MAT.matStainless();
  const camPositions: [number, number, number, number][] = [
    [0, CEIL_Y - barT / 2, -LAFD / 2 - 0.005, 0],
    [0, CEIL_Y - barT / 2, LAFD / 2 + 0.005, Math.PI],
    [-LAFW / 2 - 0.005, CEIL_Y - barT / 2, 0, Math.PI / 2],
    [LAFW / 2 + 0.005, CEIL_Y - barT / 2, 0, -Math.PI / 2],
  ];
  for (const [cx, cy, cz, cr] of camPositions) {
    const camLock = new THREE.Group();
    camLock.name = 'cam_lock';
    // L-shaped bar
    camLock.add(new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.006, 0.003), camLockMat,
    ));
    camLock.add(new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.006, 0.012), camLockMat,
    ).translateX(0.012).translateZ(0.006));
    camLock.position.set(cx, cy, cz);
    camLock.rotation.y = cr;
    lafDetail.add(camLock);
  }

  const lafLOD = new THREE.LOD();
  lafLOD.name = 'laf_lod';
  lafLOD.addLevel(lafDetail, 0);
  lafLOD.addLevel(new THREE.Group(), 2);
  lafGrp.add(lafLOD);

  lafGrp.userData = {
    system: 'supply', name: 'LAF Ceiling Unit',
    specs: {
      'Ukuran': '1200 × 1800 mm', 'HEPA': 'H14, 99.99% @0.3μm',
      'Perforated Face': '⌀2.4mm, 13% open area',
      'Material': 'Galvanised steel, powder coating',
    },
  };
  grp.add(lafGrp);

  // Plenum box above LAF
  const plenumGrp = new THREE.Group();
  plenumGrp.name = 'laf_plenum';
  addBox(plenumGrp, LAFW + 0.2, 0.6, LAFD + 0.2, MAT.matDuctSupply(), 0, CEIL_Y + 0.3, 0);
  // HEPA filter hint inside plenum
  addBox(plenumGrp, LAFW - 0.1, 0.08, LAFD - 0.1, MAT.matHEPA(), 0, CEIL_Y + 0.05, 0);
  plenumGrp.userData = { system: 'supply', name: 'LAF Plenum Box' };
  grp.add(plenumGrp);

  // LED panels (4 strips around LAF, emissive)
  const ledMat = MAT.matLED();
  const ledW = 0.15, ledL = 1.6;
  addBox(grp, ledW, 0.02, ledL, ledMat, -LAFW / 2 - 0.4, CEIL_Y - 0.01, 0, 'led_east');
  addBox(grp, ledW, 0.02, ledL, ledMat, LAFW / 2 + 0.4, CEIL_Y - 0.01, 0, 'led_west');
  addBox(grp, ledL, 0.02, ledW, ledMat, 0, CEIL_Y - 0.01, -LAFD / 2 - 0.4, 'led_north');
  addBox(grp, ledL, 0.02, ledW, ledMat, 0, CEIL_Y - 0.01, LAFD / 2 + 0.4, 'led_south');

  // Solid ceiling panels (HPL white, 4 corners)
  const solidMat = new THREE.MeshStandardMaterial({
    color: 0xF1F3F4, roughness: 0.72, metalness: 0,
    transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide,
  });
  const cornerW = (7 - LAFW) / 2 - 0.3;
  const cornerD = (7 - LAFD) / 2 - 0.3;
  // 4 corner panels
  const cx = (LAFW / 2 + 3.5) / 2;
  const cz = (LAFD / 2 + 3.5) / 2;
  addBox(grp, cornerW, 0.015, cornerD, solidMat, -cx, CEIL_Y - 0.005, -cz);
  addBox(grp, cornerW, 0.015, cornerD, solidMat, cx, CEIL_Y - 0.005, -cz);
  addBox(grp, cornerW, 0.015, cornerD, solidMat, -cx, CEIL_Y - 0.005, cz);
  addBox(grp, cornerW, 0.015, cornerD, solidMat, cx, CEIL_Y - 0.005, cz);

  grp.userData = { system: 'supply', name: 'OR Ceiling System' };
  return grp;
}

/* ================================================================
   D. AHU DETAILED — Shell + Internal Sections
   ================================================================ */

export function buildAHUDetailed(): { group: THREE.Group; fanRef: THREE.Mesh } {
  const grp = new THREE.Group();
  grp.name = 'ahu_unit';

  const W = 1.2, H = 0.93, L = 3.0;

  // Outer shell
  addBox(grp, W, H, L, MAT.matAHUBody(), 0, 0, 0, 'ahu_shell');

  // Inlet grille slats (Z = -L/2 face)
  const slatMat = MAT.matSlat();
  for (let i = 0; i < 14; i++) {
    const slat = addBox(grp, W * 0.92, 0.02, 0.035, slatMat,
      0, -H / 2 + 0.06 + i * 0.06, -L / 2 - 0.02);
    slat.rotation.x = Math.PI * 0.1; // angled louvre
  }

  // Internal sections (visible in exploded mode, children of shell)
  // Filter bay (G4 + F8/F9)
  addBox(grp, W * 0.9, H * 0.85, 0.05, MAT.matFilterMedia(),
    0, 0, -L / 2 + 0.4, 'filter_g4');
  addBox(grp, W * 0.9, H * 0.85, 0.30, MAT.matFilterMedia(),
    0, 0, -L / 2 + 0.75, 'filter_f89');

  // Coil section — aluminium fins
  const finMat = MAT.matCoilFin();
  for (let i = 0; i < 15; i++) {
    addBox(grp, W * 0.88, H * 0.80, 0.003, finMat,
      0, 0, -L / 2 + 1.2 + i * 0.025);
  }
  // Coil tubes (copper)
  const copperMat = MAT.matCopper();
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const tube = addCyl(grp, 0.01, W * 0.85, copperMat,
        0, -H * 0.25 + row * 0.2, -L / 2 + 1.2 + col * 0.12);
      tube.rotation.z = Math.PI / 2;
    }
  }

  // Fan section — simplified blades
  const fanMat = MAT.matFanBlade();
  const fanGrp = new THREE.Group();
  fanGrp.name = 'ahu_fan';
  // Hub
  addCyl(fanGrp, 0.06, 0.08, fanMat, 0, 0, 0);
  // 6 blades
  for (let i = 0; i < 6; i++) {
    const blade = addBox(fanGrp, 0.04, 0.28, 0.015, fanMat, 0, 0, 0);
    blade.rotation.z = (i / 6) * Math.PI * 2;
    blade.position.x = Math.cos(blade.rotation.z) * 0.16;
    blade.position.y = Math.sin(blade.rotation.z) * 0.16;
  }
  fanGrp.position.set(0, 0, L / 2 - 0.6);
  grp.add(fanGrp);

  // UV lamp (emissive tube)
  const uvMat = new THREE.MeshStandardMaterial({
    color: 0xCCEEFF, roughness: 0.1, metalness: 0.1,
    emissive: 0x4488AA, emissiveIntensity: 0.5,
  });
  const uvLamp = addCyl(grp, 0.015, W * 0.75, uvMat, 0, 0.15, L / 2 - 0.3, 'uv_lamp');
  uvLamp.rotation.z = Math.PI / 2;

  // Heater elements (6 SS tubes)
  for (let i = 0; i < 6; i++) {
    const hMat = new THREE.MeshStandardMaterial({
      color: 0xDDC0A0, roughness: 0.3, metalness: 0.4,
      emissive: 0x331100, emissiveIntensity: 0.2,
    });
    const heater = addCyl(grp, 0.012, W * 0.7, hMat,
      0, -0.2 + Math.floor(i / 3) * 0.25, L / 2 - 0.9 + (i % 3) * 0.1);
    heater.rotation.z = Math.PI / 2;
  }

  // Duct collar on top (outlet)
  addBox(grp, 0.6, 0.12, 0.4, MAT.matAHUBody(), 0, H / 2 + 0.06, 0.3, 'duct_collar');

  // Control box on top-right
  addBox(grp, 0.3, 0.2, 0.25, MAT.matControlPanel(), W / 2 - 0.2, H / 2 + 0.1, -L / 2 + 0.3);

  // Bottom drain
  addCyl(grp, 0.02, 0.2, MAT.matGalvanised(), 0.3, -H / 2 - 0.1, 0.4);

  // ── LOD Detail Layer (visible < 3m from AHU center) ──
  const ahuDetail = new THREE.Group();
  ahuDetail.name = 'ahu_detail';

  // Panel seam grooves — horizontal every 600mm, vertical every 1200mm
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x5A6570, roughness: 0.6, metalness: 0.2 });
  // Horizontal seams on front face (Z = -L/2)
  for (let sy = -H / 2 + 0.6; sy < H / 2; sy += 0.6) {
    ahuDetail.add(new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.98, 0.003, 0.002), seamMat,
    ).translateY(sy).translateZ(-L / 2 - 0.001));
  }
  // Vertical seams on front face
  for (let sx = -W / 2 + 0.4; sx < W / 2; sx += 0.4) {
    ahuDetail.add(new THREE.Mesh(
      new THREE.BoxGeometry(0.003, H * 0.95, 0.002), seamMat,
    ).translateX(sx).translateZ(-L / 2 - 0.001));
  }
  // Horizontal seams on back face (Z = +L/2)
  for (let sy = -H / 2 + 0.6; sy < H / 2; sy += 0.6) {
    ahuDetail.add(new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.98, 0.003, 0.002), seamMat,
    ).translateY(sy).translateZ(L / 2 + 0.001));
  }

  // M8 hex bolts along front face seam intersections (~40 bolts)
  const frontBoltPositions: [number, number, number][] = [];
  for (let bx = -W / 2 + 0.15; bx <= W / 2 - 0.15; bx += 0.30) {
    for (let by = -H / 2 + 0.15; by <= H / 2 - 0.05; by += 0.30) {
      frontBoltPositions.push([bx, by, -L / 2 - 0.003]);
    }
  }
  ahuDetail.add(createBoltArray(frontBoltPositions, 0.006, 0.015));
  // Back face bolts
  const backBoltPositions = frontBoltPositions.map(
    ([bx, by]) => [bx, by, L / 2 + 0.003] as [number, number, number],
  );
  ahuDetail.add(createBoltArray(backBoltPositions, 0.006, 0.015));

  // 3 Access doors on long side (+X face)
  const door1 = createAccessDoor(0.5, 0.5);
  door1.position.set(W / 2 + 0.003, 0, -L / 2 + 0.4);
  door1.rotation.y = Math.PI / 2;
  ahuDetail.add(door1);

  const door2 = createAccessDoor(0.5, 0.65);
  door2.position.set(W / 2 + 0.003, 0, -L / 2 + 1.1);
  door2.rotation.y = Math.PI / 2;
  ahuDetail.add(door2);

  const door3 = createAccessDoor(0.6, 0.65);
  door3.position.set(W / 2 + 0.003, 0, L / 2 - 0.6);
  door3.rotation.y = Math.PI / 2;
  ahuDetail.add(door3);

  // Magnehelic gauge on side panel (-X face, near filter section)
  const gauge = createMagnehelicGauge(0.08);
  gauge.position.set(-W / 2 - 0.005, 0.15, -L / 2 + 0.6);
  gauge.rotation.y = -Math.PI / 2;
  ahuDetail.add(gauge);

  // 4 vibration isolators at base corners
  const isoCorners: [number, number, number][] = [
    [-W / 2 + 0.1, -H / 2, -L / 2 + 0.15],
    [W / 2 - 0.1, -H / 2, -L / 2 + 0.15],
    [-W / 2 + 0.1, -H / 2, L / 2 - 0.15],
    [W / 2 - 0.1, -H / 2, L / 2 - 0.15],
  ];
  for (const [ix, iy, iz] of isoCorners) {
    const iso = createVibrationIsolator();
    iso.position.set(ix, iy - 0.05, iz);
    ahuDetail.add(iso);
  }

  // UV lamp inspection window (on front face, near UV section)
  const uvWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.08, 0.004),
    new THREE.MeshStandardMaterial({
      color: 0x6633AA, transparent: true, opacity: 0.5, roughness: 0.05,
      emissive: 0x4422AA, emissiveIntensity: 0.6,
    }),
  );
  uvWindow.position.set(0, 0.15, -L / 2 - 0.003);
  uvWindow.name = 'uv_inspection_window';
  ahuDetail.add(uvWindow);

  // Flex connector at duct collar (top)
  const flexConn = createFlexConnector(0.55, 0.35, 0.12);
  flexConn.position.set(0, H / 2 + 0.18, 0.3);
  ahuDetail.add(flexConn);

  // Rating nameplate (stainless label on front)
  const nameplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.06, 0.001),
    new THREE.MeshStandardMaterial({ color: 0xC0C8D0, roughness: 0.15, metalness: 0.90 }),
  );
  nameplate.position.set(0.3, -0.2, -L / 2 - 0.003);
  ahuDetail.add(nameplate);

  // Wrap in LOD
  const ahuLOD = new THREE.LOD();
  ahuLOD.name = 'ahu_lod';
  ahuLOD.addLevel(ahuDetail, 0);   // visible when close
  ahuLOD.addLevel(new THREE.Group(), 3); // detail hidden beyond 3m
  grp.add(ahuLOD);

  // Position AHU at rooftop
  grp.position.set(5.0, 5.5, 0);

  grp.userData = {
    system: 'supply', name: 'AHU Double Skin',
    specs: {
      'Ukuran': '1200 × 3000 × 930 mm',
      'Fan': '3000 cfm, 1000 Pa',
      'Pre-filter': 'G4, 30-65%, 24"×24"×2"',
      'Med. Filter': 'F8/F9, 90-95%, 24"×24"×12"',
      'Koil Evap.': '10 hp, R410A, 100,000 BTU/h',
      'Heater': '4500W (6×750W), SS304',
      'UV-C': 'Philips 30W–72W',
      'Magnehelic': '0–500 PA',
    },
  };

  return { group: grp, fanRef: fanGrp.children[0] as THREE.Mesh };
}

/* ================================================================
   E. OUTDOOR UNIT — DAIKIN 12HP
   ================================================================ */

export function buildOutdoorUnit(): { group: THREE.Group; fanRef: THREE.Object3D } {
  const grp = new THREE.Group();
  grp.name = 'outdoor_unit';

  const W = 1.2, H = 1.5, D = 0.9;

  // Housing
  addBox(grp, W, H, D, MAT.matOutdoorUnit(), 0, 0, 0, 'odu_shell');

  // Fan grille (front face, Z = +D/2)
  const grilleMat = MAT.matStainless();
  const ringGeo = new THREE.TorusGeometry(0.35, 0.015, 8, 32);
  const ring = new THREE.Mesh(ringGeo, grilleMat);
  ring.position.set(0, 0.15, D / 2 + 0.01);
  ring.name = 'odu_grille';
  grp.add(ring);

  // Fan blades
  const fanGrp = new THREE.Group();
  fanGrp.name = 'odu_fan';
  const bladeMat = MAT.matFanBlade();
  addCyl(fanGrp, 0.04, 0.05, bladeMat, 0, 0, 0); // hub
  for (let i = 0; i < 4; i++) {
    const blade = addBox(fanGrp, 0.03, 0.28, 0.008, bladeMat, 0, 0, 0);
    blade.rotation.z = (i / 4) * Math.PI * 2;
    blade.position.x = Math.cos(blade.rotation.z) * 0.15;
    blade.position.y = Math.sin(blade.rotation.z) * 0.15;
  }
  fanGrp.position.set(0, 0.15, D / 2 + 0.02);
  grp.add(fanGrp);

  // Fin coils (louvered sides, ±X faces)
  const finMat = MAT.matCoilFin();
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 12; i++) {
      const fin = addBox(grp, 0.003, H * 0.7, D * 0.6, finMat,
        side * (W / 2 + 0.005), -0.1 + i * 0.005, 0);
      fin.rotation.y = Math.PI * 0.08 * side;
    }
  }

  // Base frame (4 horizontal bars)
  const baseMat = MAT.matGalvanised();
  addBox(grp, W + 0.1, 0.04, 0.04, baseMat, 0, -H / 2 - 0.02, -D / 2 + 0.05);
  addBox(grp, W + 0.1, 0.04, 0.04, baseMat, 0, -H / 2 - 0.02, D / 2 - 0.05);
  addBox(grp, 0.04, 0.04, D + 0.05, baseMat, -W / 2, -H / 2 - 0.02, 0);
  addBox(grp, 0.04, 0.04, D + 0.05, baseMat, W / 2, -H / 2 - 0.02, 0);

  // 2 pipe stubs on side toward AHU (-X face)
  const copperMat = MAT.matCopper();
  addCyl(grp, 0.018, 0.15, copperMat, -W / 2 - 0.075, 0.1, -0.15);
  addCyl(grp, 0.012, 0.15, copperMat, -W / 2 - 0.075, 0.1, 0.15);

  // ── LOD Detail Layer (visible < 2.5m from ODU) ──
  const oduDetail = new THREE.Group();
  oduDetail.name = 'odu_detail';

  // Fan guard wire mesh (disc wireframe grid on front face)
  const guardGeo = new THREE.CircleGeometry(0.38, 24);
  const guardMat = new THREE.MeshStandardMaterial({
    color: 0xA0A8B0, roughness: 0.35, metalness: 0.70,
    wireframe: true,
  });
  const guard = new THREE.Mesh(guardGeo, guardMat);
  guard.position.set(0, 0.15, D / 2 + 0.015);
  guard.name = 'fan_guard';
  oduDetail.add(guard);

  // Fan motor dome (center hub)
  const domeGeo = new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshStandardMaterial({
    color: 0x3A4550, roughness: 0.45, metalness: 0.30,
  }));
  dome.position.set(0, 0.15, D / 2 + 0.025);
  oduDetail.add(dome);

  // Condenser fin pack (visible through louvre gaps, +X side)
  const finPack = createCondenserFinPack(0.08, H * 0.6, D * 0.5, 300);
  finPack.position.set(W / 2 - 0.02, -0.1, 0);
  finPack.rotation.y = Math.PI / 2;
  oduDetail.add(finPack);

  // Service valve panel (-X face, bottom area)
  const svcGrp = new THREE.Group();
  svcGrp.name = 'service_valves';
  // Hinged cover
  svcGrp.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.003),
    new THREE.MeshStandardMaterial({ color: 0xB0B8C0, roughness: 0.4, metalness: 0.3 }),
  ));
  // 2 brass service valves
  for (let vi = 0; vi < 2; vi++) {
    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.025, 8),
      matBrassValve(),
    );
    valve.position.set(-0.015 + vi * 0.03, -0.01, -0.008);
    svcGrp.add(valve);
  }
  svcGrp.position.set(-W / 2 - 0.005, -H / 4, -D / 4);
  svcGrp.rotation.y = -Math.PI / 2;
  oduDetail.add(svcGrp);

  // Anti-vibration rubber feet (4 corners)
  const footMat = new THREE.MeshStandardMaterial({
    color: 0x1A1A1A, roughness: 0.95, metalness: 0.0,
  });
  const footCorners: [number, number, number][] = [
    [-W / 2 + 0.08, -H / 2 - 0.04, -D / 2 + 0.08],
    [W / 2 - 0.08, -H / 2 - 0.04, -D / 2 + 0.08],
    [-W / 2 + 0.08, -H / 2 - 0.04, D / 2 - 0.08],
    [W / 2 - 0.08, -H / 2 - 0.04, D / 2 - 0.08],
  ];
  for (const [fx, fy, fz] of footCorners) {
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8),
      footMat,
    );
    foot.position.set(fx, fy, fz);
    oduDetail.add(foot);
  }

  // Electrical panel hint (small box, side)
  const ePanelGrp = new THREE.Group();
  ePanelGrp.name = 'electrical_panel';
  ePanelGrp.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.025),
    new THREE.MeshStandardMaterial({ color: 0xC0C8D0, roughness: 0.35, metalness: 0.20 }),
  ));
  // 4 screws
  const ePanelScrews: [number, number, number][] = [
    [0.03, 0.05, 0.013], [-0.03, 0.05, 0.013],
    [0.03, -0.05, 0.013], [-0.03, -0.05, 0.013],
  ];
  ePanelGrp.add(createBoltArray(ePanelScrews, 0.003, 0.006));
  ePanelGrp.position.set(W / 2 + 0.005, -0.3, -D / 4);
  ePanelGrp.rotation.y = Math.PI / 2;
  oduDetail.add(ePanelGrp);

  // Rating nameplate
  const oduNameplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.09, 0.001),
    new THREE.MeshStandardMaterial({ color: 0xC0C8D0, roughness: 0.15, metalness: 0.90 }),
  );
  oduNameplate.position.set(-W / 2 - 0.002, 0.35, 0);
  oduNameplate.rotation.y = -Math.PI / 2;
  oduDetail.add(oduNameplate);

  // Wrap in LOD
  const oduLOD = new THREE.LOD();
  oduLOD.name = 'odu_lod';
  oduLOD.addLevel(oduDetail, 0);
  oduLOD.addLevel(new THREE.Group(), 2.5);
  grp.add(oduLOD);

  // Position at rooftop
  grp.position.set(7.5, 5.0 + H / 2, 2.0);

  grp.userData = {
    system: 'refrigerant', name: 'Outdoor Unit DAIKIN',
    specs: {
      'Kapasitas': '12 HP / 120,000 BTU/h',
      'Refrigerant': 'R410A',
      'Ukuran': '1200 × 1500 × 900 mm',
      'Posisi': 'Rooftop, terpisah dari AHU',
    },
  };

  return { group: grp, fanRef: fanGrp };
}

/* ================================================================
   F. CONTROL PANEL AHU — Box + HMI Screen + MCBs + RST Lamps
   ================================================================ */

export function buildControlPanelAHU(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'ahu_ctrl_panel';

  const BW = 0.9, BH = 0.6, BD = 0.25;

  // Main enclosure
  addBox(grp, BW, BH, BD, MAT.matControlPanel(), 0, 0, 0, 'ctrl_box');

  // Front door outline (thin inset)
  addBox(grp, BW - 0.04, BH - 0.04, 0.005, new THREE.MeshStandardMaterial({
    color: 0x546E7A, roughness: 0.3, metalness: 0.15,
  }), 0, 0, BD / 2 + 0.003);

  // HMI Screen 7" (uses Canvas2D texture)
  const hmiTex = createHvacHMITexture();
  const hmiMat = new THREE.MeshBasicMaterial({ map: hmiTex });
  const hmiGeo = new THREE.PlaneGeometry(0.155, 0.086);
  const hmi = new THREE.Mesh(hmiGeo, hmiMat);
  hmi.position.set(-0.15, -0.05, BD / 2 + 0.008);
  hmi.name = 'hmi_screen';
  grp.add(hmi);

  // MCB switches (8)
  for (let i = 0; i < 8; i++) {
    const col = i < 5 ? 0x37474F : 0xB71C1C;
    addBox(grp, 0.018, 0.055, 0.025, new THREE.MeshStandardMaterial({
      color: col, roughness: 0.4, metalness: 0.1,
    }), -0.30 + i * 0.075, 0.18, BD / 2 + 0.015);
  }

  // RST indicator lamps
  const rstColors = [0xCC0000, 0xFFAA00, 0x0044CC];
  rstColors.forEach((c, i) => {
    const lampMat = new THREE.MeshStandardMaterial({
      color: c, roughness: 0.3, metalness: 0.1,
      emissive: c, emissiveIntensity: 1.2,
    });
    addCyl(grp, 0.008, 0.015, lampMat, 0.20 + i * 0.04, 0.18, BD / 2 + 0.01);
  });

  // Handle bar
  addBox(grp, 0.015, 0.08, 0.02, MAT.matStainless(), BW / 2 - 0.06, 0, BD / 2 + 0.015);

  // ── LOD Detail Layer (visible < 1.5m) ──
  const ctrlDetail = new THREE.Group();
  ctrlDetail.name = 'ctrl_detail';

  // 3-point cam latches on door right edge
  const latchMat = new THREE.MeshStandardMaterial({
    color: 0xC8C8C0, roughness: 0.20, metalness: 0.80,
  });
  for (let li = 0; li < 3; li++) {
    const latchG = new THREE.Group();
    latchG.add(new THREE.Mesh(
      new THREE.CylinderGeometry(0.010, 0.010, 0.012, 6),
      latchMat,
    ));
    // Lever arm
    latchG.add(new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.005, 0.005), latchMat,
    ).translateX(0.015));
    latchG.position.set(BW / 2 - 0.03, -BH / 3 + li * (BH / 3), BD / 2 + 0.010);
    ctrlDetail.add(latchG);
  }

  // MCB toggle levers (small rotated tips on existing MCBs)
  const toggleMat = new THREE.MeshStandardMaterial({ color: 0xF0F0F0, roughness: 0.4, metalness: 0.1 });
  for (let ti = 0; ti < 8; ti++) {
    const toggle = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.015, 0.004), toggleMat,
    );
    toggle.position.set(-0.30 + ti * 0.075, 0.18 + 0.035, BD / 2 + 0.020);
    toggle.rotation.x = (ti < 5) ? -0.3 : 0.3; // ON vs tripped position
    ctrlDetail.add(toggle);
  }

  // Interior DIN rail hint (visible through slight transparency of door inset)
  const dinRail = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.85, 0.035, 0.007),
    new THREE.MeshStandardMaterial({ color: 0xA8B0B8, roughness: 0.30, metalness: 0.75 }),
  );
  dinRail.position.set(0, 0.08, BD / 2 - 0.02);
  ctrlDetail.add(dinRail);

  // Cable glands at bottom (5 pass-throughs)
  for (let gi = 0; gi < 5; gi++) {
    const gland = new THREE.Mesh(
      new THREE.CylinderGeometry(0.010, 0.012, 0.025, 8),
      new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.3 }),
    );
    gland.position.set(-BW / 3 + gi * (BW * 0.6 / 4), -BH / 2 - 0.012, 0);
    ctrlDetail.add(gland);
  }

  // Earth bus bar (green/yellow)
  const earthBar = new THREE.Mesh(
    new THREE.BoxGeometry(BW * 0.7, 0.008, 0.005),
    new THREE.MeshStandardMaterial({ color: 0x66AA33, roughness: 0.35, metalness: 0.75 }),
  );
  earthBar.position.set(0, -BH / 2 + 0.03, BD / 2 - 0.02);
  ctrlDetail.add(earthBar);

  // Door lock cylinder (keyhole)
  const lockCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8),
    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.25, metalness: 0.80 }),
  );
  lockCyl.rotation.x = Math.PI / 2;
  lockCyl.position.set(BW / 2 - 0.06, -0.06, BD / 2 + 0.015);
  ctrlDetail.add(lockCyl);

  const ctrlLOD = new THREE.LOD();
  ctrlLOD.name = 'ctrl_lod';
  ctrlLOD.addLevel(ctrlDetail, 0);
  ctrlLOD.addLevel(new THREE.Group(), 1.5);
  grp.add(ctrlLOD);

  // Position near AHU, on rooftop
  grp.position.set(4.0, 5.8, 1.5);

  grp.userData = {
    system: 'control', name: 'Control Panel AHU',
    specs: {
      'Ukuran': '900 × 600 × 250 mm',
      'CPU': 'PLC (Programmable Logic Controller)',
      'HMI': '7" Touch Panel',
      'Relays': 'OMRON Relay Bank',
      'Breakers': 'MCB + MCCB Protection',
      'Protocol': 'Modbus TCP/IP',
    },
  };

  return grp;
}

/* ================================================================
   G. SUPPLY DUCT — CatmullRomCurve3 Path from AHU to LAF Plenum
   ================================================================ */

export function buildSupplyDuct(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'grp_supply_duct';

  // Duct path: AHU top outlet → horizontal in interstitial → vertical drop to plenum
  const pathPoints = [
    new THREE.Vector3(5.0, 6.1, 0.3),    // AHU outlet
    new THREE.Vector3(5.0, 5.8, 0.3),    // short down
    new THREE.Vector3(4.0, 5.0, 0.3),    // horizontal elbow
    new THREE.Vector3(2.5, 4.8, 0.2),    // horizontal toward room
    new THREE.Vector3(0.5, 4.5, 0.1),    // above room
    new THREE.Vector3(0.0, 4.2, 0.0),    // above LAF center
    new THREE.Vector3(0.0, 3.7, 0.0),    // dropping down
  ];

  const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.15);

  // Rectangular cross-section 600×400mm
  const shape = new THREE.Shape();
  const hw = 0.30, hh = 0.20;
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const extGeo = new THREE.ExtrudeGeometry(shape, {
    steps: 80,
    bevelEnabled: false,
    extrudePath: curve,
  });

  const ductMesh = new THREE.Mesh(extGeo, MAT.matDuctSupply());
  ductMesh.name = 'supply_duct_main';
  grp.add(ductMesh);

  // ── LOD Detail Layer — Seam joints, hangers, damper, access ──
  const ductDetail = new THREE.Group();
  ductDetail.name = 'supply_duct_detail';

  // SMACNA angle flange joints every ~1.2m along path
  for (let t = 0.12; t < 0.95; t += 0.14) {
    const pt = curve.getPointAt(t);
    const joint = createDuctJoint(hw * 2, hh * 2);
    joint.position.copy(pt);
    ductDetail.add(joint);
  }

  // Full hanger assemblies (rods + strap + clamps)
  const SLAB_TOP_Y = 3.3 + 0.15; // rooftop slab top surface
  for (let t = 0.2; t < 0.85; t += 0.2) {
    const pt = curve.getPointAt(t);
    if (pt.y > 3.5) { // only for ducts above ceiling
      const hanger = createDuctHanger(hw * 2, hh * 2, SLAB_TOP_Y + 2.0, pt.y);
      hanger.position.set(pt.x, 0, pt.z);
      ductDetail.add(hanger);
    }
  }

  // Volume damper + actuator at t=0.35 (near branch point)
  const damperPt = curve.getPointAt(0.35);
  const damper = createVolumeDamper(hw * 2, hh * 2);
  damper.position.copy(damperPt);
  ductDetail.add(damper);

  // Flex connector at AHU end (t≈0.02)
  const flexPt = curve.getPointAt(0.03);
  const flex = createFlexConnector(hw * 2 - 0.02, hh * 2 - 0.02, 0.12);
  flex.position.copy(flexPt);
  ductDetail.add(flex);

  // Access door at t=0.5 (bottom face of duct)
  const accessPt = curve.getPointAt(0.5);
  const accessDoor = createAccessDoor(0.4, 0.3);
  accessDoor.position.set(accessPt.x, accessPt.y - hh - 0.003, accessPt.z);
  accessDoor.rotation.x = Math.PI / 2; // facing down
  ductDetail.add(accessDoor);

  const ductLOD = new THREE.LOD();
  ductLOD.name = 'supply_duct_lod';
  ductLOD.addLevel(ductDetail, 0);
  ductLOD.addLevel(new THREE.Group(), 3);
  grp.add(ductLOD);

  // Basic seam hint lines (always visible, lightweight)
  const seamMat = new THREE.LineBasicMaterial({ color: 0x8AAABE, linewidth: 1 });
  for (let t = 0.1; t < 1.0; t += 0.15) {
    const pt = curve.getPointAt(t);
    const pts = [
      new THREE.Vector3(pt.x - hw, pt.y, pt.z),
      new THREE.Vector3(pt.x + hw, pt.y, pt.z),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(lineGeo, seamMat);
    line.name = 'seam';
    grp.add(line);
  }

  // Basic hanger rods (always visible at distance, lightweight)
  const hangerMat = MAT.matGalvanised();
  for (let t = 0.2; t < 0.85; t += 0.25) {
    const pt = curve.getPointAt(t);
    const roofY = 3.3;
    if (pt.y > roofY) {
      const hangH = pt.y - roofY + 0.5;
      addCyl(grp, 0.008, hangH, hangerMat,
        pt.x - 0.15, roofY + hangH / 2, pt.z);
      addCyl(grp, 0.008, hangH, hangerMat,
        pt.x + 0.15, roofY + hangH / 2, pt.z);
    }
  }

  grp.userData = {
    system: 'supply', name: 'Supply Duct (PIU)',
    specs: {
      'Material': 'Polyurethane PIU, TDI',
      'Tebal Insulasi': '20 mm',
      'Cross-section': '600 × 400 mm',
      'Flow': '3000 cfm supply',
    },
  };

  return grp;
}

/* ================================================================
   H. RETURN DUCTS — 4 Branches + Trunk Back to AHU
   ================================================================ */

export function buildReturnDucts(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'grp_return_duct';

  const CEIL_Y = 3.0, INTER_Y = 4.0;
  const ROOM_HALF = 3.5;

  // Return duct cross-section: 400×300mm
  const shape = new THREE.Shape();
  const hw = 0.20, hh = 0.15;
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const returnMat = MAT.matDuctReturn();

  // Branch from each wall grille up through wall to interstitial
  const branches: Array<{ name: string; points: THREE.Vector3[] }> = [
    { name: 'return_branch_N', points: [
      new THREE.Vector3(0, 0.6, -ROOM_HALF),
      new THREE.Vector3(0, CEIL_Y + 0.3, -ROOM_HALF),
      new THREE.Vector3(0, INTER_Y, -ROOM_HALF + 0.5),
    ]},
    { name: 'return_branch_S', points: [
      new THREE.Vector3(0, 0.6, ROOM_HALF),
      new THREE.Vector3(0, CEIL_Y + 0.3, ROOM_HALF),
      new THREE.Vector3(0, INTER_Y, ROOM_HALF - 0.5),
    ]},
    { name: 'return_branch_E', points: [
      new THREE.Vector3(ROOM_HALF, 0.6, 0),
      new THREE.Vector3(ROOM_HALF, CEIL_Y + 0.3, 0),
      new THREE.Vector3(ROOM_HALF - 0.5, INTER_Y, 0),
    ]},
    { name: 'return_branch_W', points: [
      new THREE.Vector3(-ROOM_HALF, 0.6, 0),
      new THREE.Vector3(-ROOM_HALF, CEIL_Y + 0.3, 0),
      new THREE.Vector3(-ROOM_HALF + 0.5, INTER_Y, 0),
    ]},
  ];

  for (const br of branches) {
    const curve = new THREE.CatmullRomCurve3(br.points, false, 'catmullrom', 0.3);
    const brGeo = new THREE.ExtrudeGeometry(shape, {
      steps: 30, bevelEnabled: false, extrudePath: curve,
    });
    const brMesh = new THREE.Mesh(brGeo, returnMat);
    brMesh.name = br.name;
    grp.add(brMesh);
  }

  // Return trunk: horizontal duct at interstitial level converging to AHU
  const trunkPoints = [
    new THREE.Vector3(0, INTER_Y, 0),         // center convergence
    new THREE.Vector3(2.5, INTER_Y + 0.3, 0), // toward AHU side
    new THREE.Vector3(4.5, INTER_Y + 0.5, 0), // approaching AHU
    new THREE.Vector3(5.0, 5.0, 0),            // AHU intake
  ];
  const trunkCurve = new THREE.CatmullRomCurve3(trunkPoints, false, 'catmullrom', 0.2);
  const trunkGeo = new THREE.ExtrudeGeometry(shape, {
    steps: 40, bevelEnabled: false, extrudePath: trunkCurve,
  });
  const trunk = new THREE.Mesh(trunkGeo, returnMat);
  trunk.name = 'return_trunk';
  grp.add(trunk);

  grp.userData = {
    system: 'return', name: 'Return Duct System',
    specs: {
      'Branches': '4 (satu per dinding)',
      'Cross-section': '400 × 300 mm',
      'Trunk': 'Ke AHU mixing chamber',
      'Material': 'PIU Polyurethane',
    },
  };

  return grp;
}

/* ================================================================
   I. RETURN AIR GRILLES — 4 Low-Wall Grilles (ASHRAE 170)
   ================================================================ */

export function buildReturnGrilles(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'grp_return_grilles';

  const GW = 0.5, GH = 0.4, GT = 0.03;
  const ROOM_HALF = 3.5;
  const grilleY = 0.6; // center height (0.3-0.9m range)

  const positions: Array<{ name: string; pos: [number, number, number]; rotY: number }> = [
    { name: 'grille_N', pos: [0, grilleY, -ROOM_HALF + GT / 2], rotY: 0 },
    { name: 'grille_S', pos: [0, grilleY, ROOM_HALF - GT / 2], rotY: Math.PI },
    { name: 'grille_E', pos: [ROOM_HALF - GT / 2, grilleY, 0], rotY: -Math.PI / 2 },
    { name: 'grille_W', pos: [-ROOM_HALF + GT / 2, grilleY, 0], rotY: Math.PI / 2 },
  ];

  const frameMat = MAT.matGalvanised();

  // Perforated texture for grille face
  const perfCanvas = document.createElement('canvas');
  perfCanvas.width = 20; perfCanvas.height = 20;
  const ctx = perfCanvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 20, 20);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.beginPath();
      ctx.arc(2.5 + c * 5, 2.5 + r * 5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const grAlpha = new THREE.CanvasTexture(perfCanvas);
  grAlpha.wrapS = grAlpha.wrapT = THREE.RepeatWrapping;
  grAlpha.repeat.set(GW / 0.04, GH / 0.04);

  for (const gpos of positions) {
    const gGrp = new THREE.Group();
    gGrp.name = gpos.name;

    // Frame
    addBox(gGrp, GW, GH, GT, frameMat, 0, 0, 0, gpos.name + '_frame');

    // Perforated face
    const faceMat = MAT.matLAFFace();
    faceMat.alphaMap = grAlpha;
    faceMat.alphaTest = 0.5;
    faceMat.side = THREE.DoubleSide;
    const faceGeo = new THREE.PlaneGeometry(GW - 0.03, GH - 0.03);
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.z = GT / 2 + 0.002;
    gGrp.add(face);

    gGrp.position.set(...gpos.pos);
    gGrp.rotation.y = gpos.rotY;

    // LOD detail: individual bar grid + frame + screws + gasket
    const grilleDetail = createReturnGrilleHighDetail(GW, GH, GT / 2 + 0.003);
    const grilleLOD = new THREE.LOD();
    grilleLOD.name = gpos.name + '_lod';
    grilleLOD.addLevel(grilleDetail, 0);
    grilleLOD.addLevel(new THREE.Group(), 1.5);
    gGrp.add(grilleLOD);

    gGrp.userData = {
      system: 'return', name: 'Return Air Grille',
      specs: {
        'Ukuran': '500 × 400 mm', 'Material': 'Galvanised steel, powder coating white',
        'Posisi': 'Low sidewall, Y=0.3–0.9m (ASHRAE 170)',
      },
    };
    grp.add(gGrp);
  }

  grp.userData = { system: 'return', name: 'Return Air Grilles (×4)' };
  return grp;
}

/* ================================================================
   J. REFRIGERANT PIPING — Suction + Liquid + Condensate
   ================================================================ */

export function buildRefrigerantPiping(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'grp_piping';

  // Suction line (thick, insulated): Outdoor → AHU
  const suctionPoints = [
    new THREE.Vector3(7.0, 5.5, 2.0),    // outdoor unit side
    new THREE.Vector3(6.5, 5.6, 1.5),
    new THREE.Vector3(5.8, 5.6, 0.8),
    new THREE.Vector3(5.5, 5.5, 0.3),    // AHU inlet
  ];
  const suctionCurve = new THREE.CatmullRomCurve3(suctionPoints, false, 'catmullrom', 0.3);

  // Inner copper pipe
  const suctionPipeGeo = new THREE.TubeGeometry(suctionCurve, 30, 0.018, 8, false);
  grp.add(new THREE.Mesh(suctionPipeGeo, MAT.matCopper()));
  // Insulation jacket
  const suctionInsulGeo = new THREE.TubeGeometry(suctionCurve, 30, 0.035, 12, false);
  const suctionInsul = new THREE.Mesh(suctionInsulGeo, MAT.matInsulation());
  suctionInsul.name = 'suction_line';
  grp.add(suctionInsul);

  // Liquid line (thin, insulated): parallel offset
  const liquidPoints = [
    new THREE.Vector3(7.0, 5.35, 2.0),
    new THREE.Vector3(6.5, 5.45, 1.5),
    new THREE.Vector3(5.8, 5.45, 0.8),
    new THREE.Vector3(5.5, 5.35, 0.3),
  ];
  const liquidCurve = new THREE.CatmullRomCurve3(liquidPoints, false, 'catmullrom', 0.3);

  const liquidPipeGeo = new THREE.TubeGeometry(liquidCurve, 30, 0.008, 8, false);
  grp.add(new THREE.Mesh(liquidPipeGeo, MAT.matCopper()));
  const liquidInsulGeo = new THREE.TubeGeometry(liquidCurve, 30, 0.018, 12, false);
  const liquidInsul = new THREE.Mesh(liquidInsulGeo, MAT.matInsulation());
  liquidInsul.name = 'liquid_line';
  grp.add(liquidInsul);

  // Condensate drain (small pipe from AHU down)
  const drainPoints = [
    new THREE.Vector3(5.3, 5.0, 0.5),
    new THREE.Vector3(5.3, 4.5, 0.8),
    new THREE.Vector3(5.3, 3.5, 1.0),
  ];
  const drainCurve = new THREE.CatmullRomCurve3(drainPoints, false, 'catmullrom', 0.3);
  const drainGeo = new THREE.TubeGeometry(drainCurve, 20, 0.012, 8, false);
  const drain = new THREE.Mesh(drainGeo, MAT.matGalvanised());
  drain.name = 'condensate_drain';
  grp.add(drain);

  // Support brackets along piping route (always visible)
  const bracketMat = MAT.matGalvanised();
  for (let t = 0.2; t < 0.9; t += 0.3) {
    const pt = suctionCurve.getPointAt(t);
    addBox(grp, 0.03, 0.03, 0.12, bracketMat, pt.x, pt.y + 0.06, pt.z);
    addBox(grp, 0.03, 0.08, 0.03, bracketMat, pt.x, pt.y + 0.1, pt.z);
  }

  // ── LOD Detail Layer — clips, flare nuts, P-trap ──
  const pipeDetail = new THREE.Group();
  pipeDetail.name = 'piping_detail';

  // U-bolt support clips on suction line
  pipeDetail.add(createPipeSupportClips(suctionCurve, 0.035, 1.2));

  // U-bolt support clips on liquid line
  pipeDetail.add(createPipeSupportClips(liquidCurve, 0.018, 1.2));

  // Flare nuts at endpoints (suction line)
  const sFlareStart = createFlareNut(0.014);
  sFlareStart.position.copy(suctionPoints[0]);
  pipeDetail.add(sFlareStart);
  const sFlareEnd = createFlareNut(0.014);
  sFlareEnd.position.copy(suctionPoints[suctionPoints.length - 1]);
  pipeDetail.add(sFlareEnd);

  // Flare nuts at endpoints (liquid line)
  const lFlareStart = createFlareNut(0.010);
  lFlareStart.position.copy(liquidPoints[0]);
  pipeDetail.add(lFlareStart);
  const lFlareEnd = createFlareNut(0.010);
  lFlareEnd.position.copy(liquidPoints[liquidPoints.length - 1]);
  pipeDetail.add(lFlareEnd);

  // P-trap on condensate drain (U-bend at bottom)
  const ptrapGrp = new THREE.Group();
  ptrapGrp.name = 'p_trap';
  const ptrapMat = MAT.matGalvanised();
  // Vertical down
  addCyl(ptrapGrp, 0.012, 0.15, ptrapMat, 0, -0.075, 0);
  // U-bend bottom
  const uBend = new THREE.Mesh(
    new THREE.TorusGeometry(0.04, 0.012, 8, 12, Math.PI),
    ptrapMat,
  );
  uBend.position.set(0.04, -0.15, 0);
  uBend.rotation.z = Math.PI;
  ptrapGrp.add(uBend);
  // Vertical up (short)
  addCyl(ptrapGrp, 0.012, 0.08, ptrapMat, 0.08, -0.12, 0);
  ptrapGrp.position.copy(drainPoints[drainPoints.length - 1]);
  pipeDetail.add(ptrapGrp);

  // Insulation joint tape hints (aluminium tape bands on suction)
  const tapeMat = new THREE.MeshStandardMaterial({
    color: 0xE0E0E0, roughness: 0.05, metalness: 0.92,
  });
  for (let t = 0.25; t < 0.9; t += 0.25) {
    const pt = suctionCurve.getPointAt(t);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.037, 0.003, 4, 16),
      tapeMat,
    );
    band.position.copy(pt);
    // Orient ring perpendicular to pipe direction
    const tangent = suctionCurve.getTangentAt(t);
    band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    pipeDetail.add(band);
  }

  const pipeLOD = new THREE.LOD();
  pipeLOD.name = 'piping_lod';
  pipeLOD.addLevel(pipeDetail, 0);
  pipeLOD.addLevel(new THREE.Group(), 2);
  grp.add(pipeLOD);

  grp.userData = {
    system: 'refrigerant', name: 'Refrigerant Piping',
    specs: {
      'Suction Line': '⌀28-35mm, insulated Harmaflek',
      'Liquid Line': '⌀12-16mm, insulated',
      'Refrigerant': 'R410A, ASTM B280',
      'Condensate': 'PVC drain ⌀20mm',
    },
  };

  return grp;
}

/* ================================================================
   K. ROOFTOP GROUP — Collects AHU, ODU, Ctrl Panel, Platform
   ================================================================ */

export function buildRooftopGroup(): {
  group: THREE.Group;
  ahuFanRef: THREE.Object3D;
  oduFanRef: THREE.Object3D;
} {
  const grp = new THREE.Group();
  grp.name = 'grp_rooftop';

  // Rooftop service platform (concrete base)
  const platMat = new THREE.MeshStandardMaterial({
    color: 0xB0B0A8, roughness: 0.9, metalness: 0.0,
  });
  addBox(grp, 5.0, 0.15, 4.0, platMat, 6.0, 5.0 - 0.075, 1.0, 'rooftop_platform');

  // AHU
  const { group: ahuGrp, fanRef: ahuFan } = buildAHUDetailed();
  grp.add(ahuGrp);

  // Outdoor Unit
  const { group: oduGrp, fanRef: oduFan } = buildOutdoorUnit();
  grp.add(oduGrp);

  // Control Panel
  const ctrlPanel = buildControlPanelAHU();
  grp.add(ctrlPanel);

  grp.userData = {
    system: 'supply', name: 'Rooftop Equipment',
    specs: {
      'AHU': 'Double Skin 1200×3000×930mm',
      'Outdoor Unit': 'DAIKIN 12HP',
      'Control Panel': '900×600×250mm + PLC + HMI 7"',
    },
  };

  return { group: grp, ahuFanRef: ahuFan, oduFanRef: oduFan };
}

/* ================================================================
   L. SUPPLY PARTICLES — InstancedMesh Falling from LAF
   ================================================================ */

export function createSupplyParticles(): {
  group: THREE.Group;
  update: () => void;
} {
  const grp = new THREE.Group();
  grp.name = 'grp_particles';

  const COUNT = 200;
  const geo = new THREE.SphereGeometry(0.02, 4, 4);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x29B6F6, transparent: true, opacity: 0.6,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.name = 'supply_particles';
  grp.add(mesh);

  // Particle state
  const particles = Array.from({ length: COUNT }, () => ({
    x: (Math.random() - 0.5) * 1.1,  // within LAF footprint (1.2m wide)
    y: 2.95 - Math.random() * 2.8,   // from ceiling to near-floor
    z: (Math.random() - 0.5) * 1.7,  // within LAF footprint (1.8m deep)
    speed: 0.006 + Math.random() * 0.010,
  }));

  const dummy = new THREE.Object3D();

  function update() {
    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      p.y -= p.speed;
      if (p.y < 0.05) {
        p.y = 2.95;
        p.x = (Math.random() - 0.5) * 1.1;
        p.z = (Math.random() - 0.5) * 1.7;
        p.speed = 0.006 + Math.random() * 0.010;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Initialize positions
  update();

  return { group: grp, update };
}
