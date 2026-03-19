/**
 * hvac-bim-detail-helpers.ts
 * ─────────────────────────────────────────────────────────────
 * Atom-level detail builder functions for HVAC BIM-MEP viewer.
 * Pure functions returning THREE.Group / InstancedMesh.
 * Used by hvac-bim-geometry.ts inside THREE.LOD detail layers.
 *
 * Scale: 1 unit = 1 meter (consistent with hvac-bim-geometry).
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';

/* ── Shared Detail Materials (lazy singletons) ─────────────── */

let _matBolt: THREE.MeshStandardMaterial | null = null;
function matBolt(): THREE.MeshStandardMaterial {
  if (!_matBolt) {
    _matBolt = new THREE.MeshStandardMaterial({
      color: 0x5A6270, roughness: 0.30, metalness: 0.85,
    });
  }
  return _matBolt;
}

let _matGasket: THREE.MeshStandardMaterial | null = null;
export function matRubberGasket(): THREE.MeshStandardMaterial {
  if (!_matGasket) {
    _matGasket = new THREE.MeshStandardMaterial({
      color: 0x1A1A1A, roughness: 0.95, metalness: 0.0,
    });
  }
  return _matGasket;
}

let _matFoil: THREE.MeshStandardMaterial | null = null;
export function matAluminiumFoilTape(): THREE.MeshStandardMaterial {
  if (!_matFoil) {
    _matFoil = new THREE.MeshStandardMaterial({
      color: 0xE8E8E8, roughness: 0.05, metalness: 0.95,
    });
  }
  return _matFoil;
}

let _matBrass: THREE.MeshStandardMaterial | null = null;
export function matBrassValve(): THREE.MeshStandardMaterial {
  if (!_matBrass) {
    _matBrass = new THREE.MeshStandardMaterial({
      color: 0xC5A54E, roughness: 0.30, metalness: 0.85,
    });
  }
  return _matBrass;
}

let _matDoorPanel: THREE.MeshStandardMaterial | null = null;
function matDoorPanel(): THREE.MeshStandardMaterial {
  if (!_matDoorPanel) {
    _matDoorPanel = new THREE.MeshStandardMaterial({
      color: 0x78909C, roughness: 0.35, metalness: 0.20,
    });
  }
  return _matDoorPanel;
}

let _matLatchMetal: THREE.MeshStandardMaterial | null = null;
function matLatchMetal(): THREE.MeshStandardMaterial {
  if (!_matLatchMetal) {
    _matLatchMetal = new THREE.MeshStandardMaterial({
      color: 0xC8C8C0, roughness: 0.20, metalness: 0.80,
    });
  }
  return _matLatchMetal;
}

let _matFlangeSteel: THREE.MeshStandardMaterial | null = null;
function matFlangeSteel(): THREE.MeshStandardMaterial {
  if (!_matFlangeSteel) {
    _matFlangeSteel = new THREE.MeshStandardMaterial({
      color: 0x9EA8B0, roughness: 0.40, metalness: 0.60,
    });
  }
  return _matFlangeSteel;
}

let _matHangerRod: THREE.MeshStandardMaterial | null = null;
function matHangerRod(): THREE.MeshStandardMaterial {
  if (!_matHangerRod) {
    _matHangerRod = new THREE.MeshStandardMaterial({
      color: 0x8A9099, roughness: 0.35, metalness: 0.70,
    });
  }
  return _matHangerRod;
}

let _matHangerStrap: THREE.MeshStandardMaterial | null = null;
function matHangerStrap(): THREE.MeshStandardMaterial {
  if (!_matHangerStrap) {
    _matHangerStrap = new THREE.MeshStandardMaterial({
      color: 0xA8B0B8, roughness: 0.40, metalness: 0.60,
    });
  }
  return _matHangerStrap;
}

let _matDamperBlade: THREE.MeshStandardMaterial | null = null;
function matDamperBlade(): THREE.MeshStandardMaterial {
  if (!_matDamperBlade) {
    _matDamperBlade = new THREE.MeshStandardMaterial({
      color: 0x6A7580, roughness: 0.40, metalness: 0.50,
    });
  }
  return _matDamperBlade;
}

let _matActuator: THREE.MeshStandardMaterial | null = null;
function matActuator(): THREE.MeshStandardMaterial {
  if (!_matActuator) {
    _matActuator = new THREE.MeshStandardMaterial({
      color: 0x455A64, roughness: 0.50, metalness: 0.10,
    });
  }
  return _matActuator;
}

/* ── Shared geometries (reused across calls) ───────────────── */

let _boltHeadGeo: THREE.CylinderGeometry | null = null;
let _boltShankGeo: THREE.CylinderGeometry | null = null;

function getBoltGeo(radius: number, length: number) {
  // Cache only default M8 size for performance
  if (radius === 0.006 && length === 0.015) {
    if (!_boltHeadGeo) {
      _boltHeadGeo = new THREE.CylinderGeometry(0.006 * 1.6, 0.006 * 1.6, 0.004, 6);
      _boltShankGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.015, 6);
    }
    return { headGeo: _boltHeadGeo, shankGeo: _boltShankGeo! };
  }
  return {
    headGeo: new THREE.CylinderGeometry(radius * 1.6, radius * 1.6, radius * 0.7, 6),
    shankGeo: new THREE.CylinderGeometry(radius, radius, length, 6),
  };
}

/* ================================================================
   1. createBoltArray — InstancedMesh hex bolt array
   ================================================================ */

export function createBoltArray(
  positions: [number, number, number][],
  boltRadius = 0.006,
  boltLength = 0.015,
  color = 0x5A6270,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'bolt_array';

  const count = positions.length;
  if (count === 0) return grp;

  const { headGeo, shankGeo } = getBoltGeo(boltRadius, boltLength);
  const mat = color === 0x5A6270 ? matBolt() : new THREE.MeshStandardMaterial({
    color, roughness: 0.30, metalness: 0.85,
  });

  const heads = new THREE.InstancedMesh(headGeo, mat, count);
  const shanks = new THREE.InstancedMesh(shankGeo, mat, count);
  heads.name = 'bolt_heads';
  shanks.name = 'bolt_shanks';

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const [x, y, z] = positions[i];
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    dummy.position.y += boltLength / 2;
    dummy.updateMatrix();
    shanks.setMatrixAt(i, dummy.matrix);
  }
  heads.instanceMatrix.needsUpdate = true;
  shanks.instanceMatrix.needsUpdate = true;

  grp.add(heads, shanks);
  return grp;
}

/* ================================================================
   2. createFilterMedia — Pleated filter with aluminium frame
   ================================================================ */

export function createFilterMedia(
  width: number, height: number, depth: number,
  pleatCount: number, pleatHeight: number,
  color = 0xDFE3E8,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'filter_media';

  const pleatW = width / pleatCount;
  const mediaMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.90, metalness: 0.0,
  });

  // Pleats as InstancedMesh (alternating angle)
  const pleatGeo = new THREE.BoxGeometry(0.002, pleatHeight, depth * 0.8);
  const pleatMesh = new THREE.InstancedMesh(pleatGeo, mediaMat, pleatCount * 2);
  pleatMesh.name = 'pleats';
  const dummy = new THREE.Object3D();

  for (let i = 0; i < pleatCount; i++) {
    // Fold A
    dummy.position.set(-width / 2 + i * pleatW, 0, 0);
    dummy.rotation.set(0, Math.PI * 0.1, 0);
    dummy.updateMatrix();
    pleatMesh.setMatrixAt(i * 2, dummy.matrix);
    // Fold B
    dummy.position.x += pleatW / 2;
    dummy.rotation.y = -Math.PI * 0.1;
    dummy.updateMatrix();
    pleatMesh.setMatrixAt(i * 2 + 1, dummy.matrix);
  }
  pleatMesh.instanceMatrix.needsUpdate = true;
  grp.add(pleatMesh);

  // Aluminium frame border
  const fb = 0.018;
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x9EA8B3, roughness: 0.30, metalness: 0.70,
  });
  const hw = width / 2, hh = height / 2;
  // Top/Bottom bars
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(width, fb, depth), frameMat)
    .translateY(hh));
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(width, fb, depth), frameMat)
    .translateY(-hh));
  // Left/Right bars
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(fb, height, depth), frameMat)
    .translateX(-hw));
  grp.add(new THREE.Mesh(new THREE.BoxGeometry(fb, height, depth), frameMat)
    .translateX(hw));

  return grp;
}

/* ================================================================
   3. createCondenserFinPack — Dense aluminium fin array + tubes
   ================================================================ */

export function createCondenserFinPack(
  width: number, height: number, depth: number,
  finsPerMeter = 400,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'condenser_fins';

  const finCount = Math.min(Math.floor(width * finsPerMeter), 120); // cap for perf
  const finGeo = new THREE.BoxGeometry(0.0005, height * 0.85, depth * 0.85);
  const finMat = new THREE.MeshStandardMaterial({
    color: 0xC8D8E8, roughness: 0.15, metalness: 0.85,
    side: THREE.DoubleSide,
  });

  const fins = new THREE.InstancedMesh(finGeo, finMat, finCount);
  fins.name = 'fins';
  const dummy = new THREE.Object3D();
  const gap = width / finCount;
  for (let i = 0; i < finCount; i++) {
    dummy.position.set(-width / 2 + i * gap, 0, 0);
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  grp.add(fins);

  // Copper tubes passing through fins (4 rows)
  const tubeMat = new THREE.MeshStandardMaterial({
    color: 0xB87333, roughness: 0.20, metalness: 0.90,
  });
  for (let row = 0; row < 4; row++) {
    const tubeGeo = new THREE.CylinderGeometry(0.005, 0.005, width * 0.95, 8);
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0, -height * 0.3 + row * (height * 0.2), -depth * 0.15 + row * 0.02);
    grp.add(tube);
  }

  return grp;
}

/* ================================================================
   4. createAccessDoor — AHU access panel with cam latches
   ================================================================ */

export function createAccessDoor(
  width: number, height: number,
  depth = 0.003, _isOpen = false,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'access_door';

  // Door panel
  grp.add(new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    matDoorPanel(),
  ));

  // Cam latches (1 per 0.3m of height)
  const latchCount = Math.max(2, Math.floor(height / 0.3));
  const latchMat = matLatchMetal();
  const latchGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.015, 8);
  const slotGeo = new THREE.BoxGeometry(0.018, 0.004, 0.004);

  for (let i = 0; i < latchCount; i++) {
    const latch = new THREE.Group();
    latch.name = 'cam_latch';
    latch.add(new THREE.Mesh(latchGeo, latchMat));
    latch.add(new THREE.Mesh(slotGeo, latchMat));
    latch.position.set(
      width / 2 - 0.02,
      -height / 2 + 0.08 + i * (height / (latchCount + 1)),
      depth / 2 + 0.008,
    );
    grp.add(latch);
  }

  // Handle (T-handle bar)
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0xAAAAAA, roughness: 0.30, metalness: 0.70,
  });
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.06, 8),
    handleMat,
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 0, depth / 2 + 0.012);
  grp.add(handle);

  // Rubber gasket around perimeter
  const gMat = matRubberGasket();
  const gW = 0.006;
  const strips: Array<{ s: [number, number, number]; p: [number, number, number] }> = [
    { s: [width + gW, gW, gW], p: [0, height / 2, 0] },
    { s: [width + gW, gW, gW], p: [0, -height / 2, 0] },
    { s: [gW, height, gW], p: [width / 2, 0, 0] },
    { s: [gW, height, gW], p: [-width / 2, 0, 0] },
  ];
  for (const { s, p } of strips) {
    const gasket = new THREE.Mesh(new THREE.BoxGeometry(...s), gMat);
    gasket.position.set(...p);
    grp.add(gasket);
  }

  grp.userData = {
    system: 'supply', name: 'Access Panel',
    specs: { 'Ukuran': `${Math.round(width * 1000)}×${Math.round(height * 1000)}mm`, 'Latch': `${latchCount}× cam lock` },
  };

  return grp;
}

/* ================================================================
   5. createDuctHanger — Threaded rods + strap + clamps
   ================================================================ */

export function createDuctHanger(
  ductWidth: number, ductHeight: number,
  roofY: number, ductCenterY: number,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'duct_hanger';

  const rodLength = roofY - (ductCenterY - ductHeight / 2) + 0.05;
  if (rodLength <= 0) return grp;

  const rodMat = matHangerRod();
  const rodGeo = new THREE.CylinderGeometry(0.004, 0.004, rodLength, 6);
  const nutGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.006, 6);
  const clampGeo = new THREE.BoxGeometry(0.03, 0.015, 0.03);

  // Two rods (left/right of duct)
  for (const xOff of [-ductWidth / 2 + 0.04, ductWidth / 2 - 0.04]) {
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.set(xOff, (roofY + ductCenterY - ductHeight / 2) / 2, 0);
    grp.add(rod);

    // Nut at bottom
    const nut = new THREE.Mesh(nutGeo, rodMat);
    nut.position.set(xOff, ductCenterY - ductHeight / 2 - 0.003, 0);
    grp.add(nut);

    // Ceiling clamp at top
    const clamp = new THREE.Mesh(clampGeo, rodMat);
    clamp.position.set(xOff, roofY - 0.008, 0);
    grp.add(clamp);
  }

  // Galvanised strap under duct
  const strap = new THREE.Mesh(
    new THREE.BoxGeometry(ductWidth + 0.03, 0.006, 0.02),
    matHangerStrap(),
  );
  strap.position.y = ductCenterY - ductHeight / 2 - 0.003;
  grp.add(strap);

  return grp;
}

/* ================================================================
   6. createDuctJoint — SMACNA angle flange ring + foil tape
   ================================================================ */

export function createDuctJoint(
  ductWidth: number, ductHeight: number,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'duct_joint';

  const ft = 0.003; // flange thickness
  const fw = 0.025; // flange width

  const flangeMat = matFlangeSteel();
  const foilMat = matAluminiumFoilTape();
  const tapeT = 0.001;

  // 4-side flange ring (protrudes slightly from duct surface)
  const flanges: Array<{ s: [number, number, number]; p: [number, number, number] }> = [
    // Top & Bottom
    { s: [ductWidth + fw * 2, fw, ft], p: [0, ductHeight / 2 + fw / 2, 0] },
    { s: [ductWidth + fw * 2, fw, ft], p: [0, -ductHeight / 2 - fw / 2, 0] },
    // Left & Right
    { s: [fw, ductHeight, ft], p: [ductWidth / 2 + fw / 2, 0, 0] },
    { s: [fw, ductHeight, ft], p: [-ductWidth / 2 - fw / 2, 0, 0] },
  ];
  for (const { s, p } of flanges) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(...s), flangeMat);
    f.position.set(...p);
    grp.add(f);
  }

  // Foil tape over joint (4 reflective strips)
  const tapeW = 0.04; // 40mm tape
  const tapes: Array<{ s: [number, number, number]; p: [number, number, number] }> = [
    { s: [ductWidth, tapeW, tapeT], p: [0, ductHeight / 2, ft / 2 + tapeT / 2] },
    { s: [ductWidth, tapeW, tapeT], p: [0, -ductHeight / 2, ft / 2 + tapeT / 2] },
    { s: [tapeW, ductHeight, tapeT], p: [ductWidth / 2, 0, ft / 2 + tapeT / 2] },
    { s: [tapeW, ductHeight, tapeT], p: [-ductWidth / 2, 0, ft / 2 + tapeT / 2] },
  ];
  for (const { s, p } of tapes) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(...s), foilMat);
    t.position.set(...p);
    grp.add(t);
  }

  return grp;
}

/* ================================================================
   7. createVolumeDamper — Butterfly blades + actuator box
   ================================================================ */

export function createVolumeDamper(
  ductWidth: number, ductHeight: number,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'volume_damper';

  const bladeMat = matDamperBlade();
  const bladeH = ductHeight * 0.45;

  // Two butterfly blades (angled ~27 degrees — partially open)
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(ductWidth * 0.9, bladeH, 0.002),
      bladeMat,
    );
    blade.position.y = (i === 0) ? bladeH / 2 : -bladeH / 2;
    blade.rotation.x = Math.PI * 0.15;
    grp.add(blade);
  }

  // Damper shaft (through duct width)
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, ductWidth + 0.08, 6),
    bladeMat,
  );
  shaft.rotation.z = Math.PI / 2;
  grp.add(shaft);

  // Actuator box (outside duct, right side)
  const actGrp = new THREE.Group();
  actGrp.name = 'actuator';
  actGrp.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.07, 0.05),
    matActuator(),
  ));
  // Mounting bracket
  actGrp.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.03, 0.10),
    matFlangeSteel(),
  ).translateX(-0.065));
  // Position indicator arc
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(0.020, 0.002, 4, 16, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0xFFD600, emissive: 0x665500, emissiveIntensity: 0.3,
    }),
  );
  arc.position.z = 0.03;
  actGrp.add(arc);

  actGrp.position.set(ductWidth / 2 + 0.06, 0, 0);
  grp.add(actGrp);

  grp.userData = {
    system: 'supply', name: 'Volume Damper',
    specs: { 'Tipe': 'Butterfly dual-blade', 'Actuator': 'Electric, modulating' },
  };

  return grp;
}

/* ================================================================
   8. createInsulatedPipeDetail — Support clips + flare nuts
   ================================================================ */

export function createPipeSupportClips(
  curve: THREE.CatmullRomCurve3,
  insulRadius: number,
  intervalM = 1.5,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'pipe_clips';

  const curveLen = curve.getLength();
  const clipCount = Math.floor(curveLen / intervalM);
  const clipMat = matHangerRod();

  for (let i = 1; i <= clipCount; i++) {
    const t = i / (clipCount + 1);
    const pos = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);

    // U-bolt clip (half torus)
    const clipGeo = new THREE.TorusGeometry(insulRadius + 0.004, 0.003, 4, 10, Math.PI);
    const clip = new THREE.Mesh(clipGeo, clipMat);
    clip.position.copy(pos);
    // Orient clip perpendicular to curve direction
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1), tangent,
    );
    clip.quaternion.copy(quat);
    grp.add(clip);
  }

  return grp;
}

export function createFlareNut(radius = 0.012): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'flare_nut';

  // Hex nut body
  const nut = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, radius * 0.6, 6),
    matBrassValve(),
  );
  grp.add(nut);

  return grp;
}

/* ================================================================
   9. createReturnGrilleHighDetail — Bar grid + frame + screws
   ================================================================ */

export function createReturnGrilleHighDetail(
  width: number, height: number,
  faceZOffset = 0.016,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'grille_detail';

  const barMat = new THREE.MeshStandardMaterial({
    color: 0x8A9099, roughness: 0.30, metalness: 0.70,
  });

  const cellSize = 0.008; // 8mm cell
  const barThick = 0.002; // 2mm bar width

  // Horizontal bars
  const hBarCount = Math.min(Math.floor(height / (cellSize + barThick)), 40);
  const hBarGeo = new THREE.BoxGeometry(width * 0.9, barThick, 0.006);
  const hBars = new THREE.InstancedMesh(hBarGeo, barMat, hBarCount);
  hBars.name = 'h_bars';
  const dummy = new THREE.Object3D();
  for (let r = 0; r < hBarCount; r++) {
    dummy.position.set(0, -height / 2 + 0.01 + r * (cellSize + barThick), faceZOffset);
    dummy.updateMatrix();
    hBars.setMatrixAt(r, dummy.matrix);
  }
  hBars.instanceMatrix.needsUpdate = true;
  grp.add(hBars);

  // Vertical bars
  const vBarCount = Math.min(Math.floor(width / (cellSize + barThick)), 50);
  const vBarGeo = new THREE.BoxGeometry(barThick, height * 0.9, 0.006);
  const vBars = new THREE.InstancedMesh(vBarGeo, barMat, vBarCount);
  vBars.name = 'v_bars';
  for (let c = 0; c < vBarCount; c++) {
    dummy.position.set(-width / 2 + 0.01 + c * (cellSize + barThick), 0, faceZOffset);
    dummy.updateMatrix();
    vBars.setMatrixAt(c, dummy.matrix);
  }
  vBars.instanceMatrix.needsUpdate = true;
  grp.add(vBars);

  // Frame border (stainless, 20mm)
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x9EA8B3, roughness: 0.20, metalness: 0.80,
  });
  const bw = 0.018;
  const frameBars: Array<{ s: [number, number, number]; p: [number, number, number] }> = [
    { s: [width + bw * 2, bw, 0.012], p: [0, height / 2 + bw / 2, faceZOffset] },
    { s: [width + bw * 2, bw, 0.012], p: [0, -height / 2 - bw / 2, faceZOffset] },
    { s: [bw, height + bw * 2, 0.012], p: [width / 2 + bw / 2, 0, faceZOffset] },
    { s: [bw, height + bw * 2, 0.012], p: [-width / 2 - bw / 2, 0, faceZOffset] },
  ];
  for (const { s, p } of frameBars) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(...s), frameMat);
    bar.position.set(...p);
    grp.add(bar);
  }

  // Mounting screws (4 corners)
  const screwPositions: [number, number, number][] = [
    [width / 2 + bw * 0.5, height / 2 + bw * 0.5, faceZOffset + 0.007],
    [-width / 2 - bw * 0.5, height / 2 + bw * 0.5, faceZOffset + 0.007],
    [width / 2 + bw * 0.5, -height / 2 - bw * 0.5, faceZOffset + 0.007],
    [-width / 2 - bw * 0.5, -height / 2 - bw * 0.5, faceZOffset + 0.007],
  ];
  grp.add(createBoltArray(screwPositions, 0.004, 0.008, 0x7A8490));

  // Rubber gasket perimeter
  const gMat = matRubberGasket();
  const gW = 0.006;
  const gaskets: Array<{ s: [number, number, number]; p: [number, number, number] }> = [
    { s: [width, gW, gW], p: [0, height / 2 + bw + gW / 2, faceZOffset] },
    { s: [width, gW, gW], p: [0, -height / 2 - bw - gW / 2, faceZOffset] },
    { s: [gW, height, gW], p: [width / 2 + bw + gW / 2, 0, faceZOffset] },
    { s: [gW, height, gW], p: [-width / 2 - bw - gW / 2, 0, faceZOffset] },
  ];
  for (const { s, p } of gaskets) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(...s), gMat);
    g.position.set(...p);
    grp.add(g);
  }

  return grp;
}

/* ================================================================
   10. createMagnehelicGauge — Round dial gauge
   ================================================================ */

export function createMagnehelicGauge(
  dialDiameter = 0.08,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'magnehelic_gauge';

  // Body cylinder (disc, facing +Z)
  const bodyGeo = new THREE.CylinderGeometry(dialDiameter / 2, dialDiameter / 2, 0.025, 24);
  bodyGeo.rotateX(Math.PI / 2);
  grp.add(new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
    color: 0x3A4550, roughness: 0.40, metalness: 0.50,
  })));

  // Dial face (white disc with Canvas2D texture)
  const dialCanvas = document.createElement('canvas');
  dialCanvas.width = 128; dialCanvas.height = 128;
  const ctx = dialCanvas.getContext('2d')!;
  // White background
  ctx.fillStyle = '#F8F8F0';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  // Scale arc (0-500 Pa range)
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const angle = (i / 10) * Math.PI * 1.5 - Math.PI * 0.75;
    const inner = 40, outer = 55;
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(angle) * inner, 64 + Math.sin(angle) * inner);
    ctx.lineTo(64 + Math.cos(angle) * outer, 64 + Math.sin(angle) * outer);
    ctx.stroke();
  }
  // Needle (red)
  const needleAngle = -Math.PI * 0.75 + (250 / 500) * Math.PI * 1.5; // ~250Pa reading
  ctx.strokeStyle = '#FF1111';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 64);
  ctx.lineTo(64 + Math.cos(needleAngle) * 42, 64 + Math.sin(needleAngle) * 42);
  ctx.stroke();
  // Center hub dot
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(64, 64, 4, 0, Math.PI * 2);
  ctx.fill();
  // "Pa" label
  ctx.fillStyle = '#555';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Pa', 64, 90);
  ctx.fillText('0-500', 64, 100);

  const dialTex = new THREE.CanvasTexture(dialCanvas);
  const dialGeo = new THREE.CircleGeometry(dialDiameter / 2 * 0.88, 24);
  const dial = new THREE.Mesh(dialGeo, new THREE.MeshBasicMaterial({ map: dialTex }));
  dial.position.z = 0.013;
  grp.add(dial);

  // Glass cover (subtle transparent disc)
  const glassGeo = new THREE.CircleGeometry(dialDiameter / 2 * 0.90, 24);
  const glass = new THREE.Mesh(glassGeo, new THREE.MeshStandardMaterial({
    color: 0xCCEEFF, transparent: true, opacity: 0.12, roughness: 0.05,
  }));
  glass.position.z = 0.014;
  grp.add(glass);

  // Mounting bracket (small L-shape)
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, dialDiameter + 0.02, 0.015),
    matFlangeSteel(),
  );
  bracket.position.z = -0.008;
  grp.add(bracket);

  grp.userData = {
    system: 'supply', name: 'Magnehelic Gauge',
    specs: { 'Range': '0–500 Pa', 'Reading': '~250 Pa (normal)' },
  };

  return grp;
}

/* ================================================================
   11. createVibrationIsolator — Spring mount at AHU feet
   ================================================================ */

export function createVibrationIsolator(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'vibration_isolator';

  // Rubber pad (neoprene)
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.015, 12),
    matRubberGasket(),
  );
  pad.position.y = -0.0075;
  grp.add(pad);

  // Spring coil (simplified as torus segments)
  const springMat = new THREE.MeshStandardMaterial({
    color: 0x607080, roughness: 0.40, metalness: 0.65,
  });
  const spring = new THREE.Mesh(
    new THREE.TorusGeometry(0.025, 0.004, 6, 16, Math.PI * 4),
    springMat,
  );
  spring.rotation.x = Math.PI / 2;
  spring.position.y = 0.025;
  grp.add(spring);

  // Top plate
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.005, 12),
    matFlangeSteel(),
  );
  plate.position.y = 0.05;
  grp.add(plate);

  return grp;
}

/* ================================================================
   12. createFlexConnector — Bellows/accordion rubber at AHU
   ================================================================ */

export function createFlexConnector(
  width: number, height: number, length = 0.15,
): THREE.Group {
  const grp = new THREE.Group();
  grp.name = 'flex_connector';

  // Accordion folds (series of thin boxes with alternating X scale)
  const foldCount = 6;
  const foldLen = length / foldCount;
  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x3A3A3A, roughness: 0.85, metalness: 0.0,
  });

  for (let i = 0; i < foldCount; i++) {
    const scale = (i % 2 === 0) ? 1.0 : 0.92; // alternating width for bellows effect
    const fold = new THREE.Mesh(
      new THREE.BoxGeometry(width * scale, height * scale, foldLen * 0.8),
      rubberMat,
    );
    fold.position.z = -length / 2 + foldLen * (i + 0.5);
    grp.add(fold);
  }

  // Clamp bands at each end
  const clampMat = matFlangeSteel();
  for (const zOff of [-length / 2, length / 2]) {
    const clamp = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.015, height + 0.015, 0.008),
      clampMat,
    );
    clamp.position.z = zOff;
    grp.add(clamp);
  }

  grp.userData = {
    system: 'supply', name: 'Flexible Connector',
    specs: { 'Material': 'Canvas/rubber bellows', 'Panjang': `${Math.round(length * 1000)}mm` },
  };

  return grp;
}
