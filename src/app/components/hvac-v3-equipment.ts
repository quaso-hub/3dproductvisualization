/**
 * hvac-v3-equipment.ts
 * ─────────────────────────────────────────────────────────────
 * V3 Equipment: 2× LAF ceiling units, 4× return grilles,
 * outdoor unit (Daikin 12HP), OR equipment (operating table,
 * shadowless lamp, surgical pendant), refrigerant piping,
 * control panel.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import {
  matGalvanised, matHEPA, matLAFFace, matLampLED, matStainless,
  matSlat, matCoilFin, matFanBlade, matCopper, matInsulation,
  matOutdoorUnit, matRubberGasket, matBrassValve, matControlPanel,
  matOperatingPad, matOREquipment, matGasOutlet, matWireMesh,
} from './hvac-bim-materials';

// ═════════════════════════════════════════════════════════════
// LAF Ceiling Unit (1.2×1.8m face, 0.4m deep plenum)
// ═════════════════════════════════════════════════════════════

export function buildLAFUnit(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const W = 1.2, D = 1.8, Hp = 0.4;

  // Plenum box walls (4 walls + top, no bottom)
  const plenumMat = matGalvanised();
  const plenumPanels: Array<{ size: [number, number, number]; pos: [number, number, number] }> = [
    { size: [W, Hp, 0.006], pos: [0, 0, D / 2] },
    { size: [W, Hp, 0.006], pos: [0, 0, -D / 2] },
    { size: [0.006, Hp, D], pos: [W / 2, 0, 0] },
    { size: [0.006, Hp, D], pos: [-W / 2, 0, 0] },
    { size: [W, 0.006, D], pos: [0, Hp / 2, 0] },
  ];
  plenumPanels.forEach(({ size, pos }) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(...size), plenumMat);
    p.position.set(...pos);
    group.add(p);
  });

  // HEPA H14 filters — 2×3 grid (6 filters)
  const filterW = 0.55, filterD = 0.55, filterH = 0.075;
  const hepaMat = matHEPA();
  const hepaPositions: [number, number, number][] = [
    [-W / 4, 0, -D / 3], [-W / 4, 0, 0], [-W / 4, 0, D / 3],
    [W / 4, 0, -D / 3], [W / 4, 0, 0], [W / 4, 0, D / 3],
  ];
  hepaPositions.forEach(([fx, , fz]) => {
    // Filter frame
    const frameMat = matGalvanised();
    const bw = 0.015;
    const frame = new THREE.Group();
    ([
      { size: [filterW, bw, filterH] as [number, number, number], pos: [0, filterD / 2, 0] as [number, number, number] },
      { size: [filterW, bw, filterH] as [number, number, number], pos: [0, -filterD / 2, 0] as [number, number, number] },
      { size: [bw, filterD, filterH] as [number, number, number], pos: [filterW / 2, 0, 0] as [number, number, number] },
      { size: [bw, filterD, filterH] as [number, number, number], pos: [-filterW / 2, 0, 0] as [number, number, number] },
    ] as Array<{ size: [number, number, number]; pos: [number, number, number] }>).forEach(({ size, pos }) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(...size), frameMat);
      b.position.set(...pos);
      frame.add(b);
    });

    // Filter media
    const media = new THREE.Mesh(
      new THREE.BoxGeometry(filterW - bw * 2, filterD - bw * 2, filterH * 0.8),
      hepaMat,
    );
    frame.add(media);

    frame.rotation.x = Math.PI / 2;
    frame.position.set(fx, -Hp / 2 + filterH / 2, fz);
    group.add(frame);

    // Test port (Schrader valve)
    const port = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.015, 8),
      matStainless(),
    );
    port.position.set(fx + filterW * 0.4, -Hp / 2 - 0.01, fz);
    group.add(port);
  });

  // Perforated face diffuser (bottom)
  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.008, D),
    matLAFFace(),
  );
  diffuser.position.y = -Hp / 2 - 0.004;
  group.add(diffuser);

  // Perforation holes (InstancedMesh)
  const holeCount = 200;
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x111122 });
  const holeGeo = new THREE.CircleGeometry(0.012, 6);
  const holes = new THREE.InstancedMesh(holeGeo, holeMat, holeCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < holeCount; i++) {
    dummy.position.set(
      (Math.random() - 0.5) * (W - 0.05),
      -Hp / 2 - 0.009,
      (Math.random() - 0.5) * (D - 0.05),
    );
    dummy.rotation.x = -Math.PI / 2;
    dummy.updateMatrix();
    holes.setMatrixAt(i, dummy.matrix);
  }
  holes.instanceMatrix.needsUpdate = true;
  group.add(holes);

  // Aluminium frame border
  const borderW = 0.04;
  const frameBorderMat = matGalvanised();
  ([
    { size: [W + borderW * 2, 0.015, borderW] as [number, number, number], pos: [0, -Hp / 2, D / 2 + borderW / 2] as [number, number, number] },
    { size: [W + borderW * 2, 0.015, borderW] as [number, number, number], pos: [0, -Hp / 2, -D / 2 - borderW / 2] as [number, number, number] },
    { size: [borderW, 0.015, D + borderW * 2] as [number, number, number], pos: [W / 2 + borderW / 2, -Hp / 2, 0] as [number, number, number] },
    { size: [borderW, 0.015, D + borderW * 2] as [number, number, number], pos: [-W / 2 - borderW / 2, -Hp / 2, 0] as [number, number, number] },
  ] as Array<{ size: [number, number, number]; pos: [number, number, number] }>).forEach(({ size, pos }) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(...size), frameBorderMat);
    f.position.set(...pos);
    group.add(f);
  });

  // LED strip
  const ledStrip = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.95, 0.008, 0.025),
    matLampLED(),
  );
  ledStrip.position.y = -Hp / 2 - 0.005;
  group.add(ledStrip);

  group.position.copy(position);
  return group;
}

// ═════════════════════════════════════════════════════════════
// LAF units assembly (2× units)
// ═════════════════════════════════════════════════════════════

export function buildLAFUnits(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_laf_units';

  // LAF 1 (left, centered at X=-1.5, Y=3, Z=0)
  const laf1 = buildLAFUnit(new THREE.Vector3(-1.5, 3, 0));
  laf1.name = 'laf_1';
  group.add(laf1);

  // LAF 2 (right, centered at X=+1.5, Y=3, Z=0)
  const laf2 = buildLAFUnit(new THREE.Vector3(1.5, 3, 0));
  laf2.name = 'laf_2';
  group.add(laf2);

  return group;
}

// ═════════════════════════════════════════════════════════════
// Return Grilles (600×400mm, 4× low sidewall)
// ═════════════════════════════════════════════════════════════

function buildReturnGrille(): THREE.Group {
  const group = new THREE.Group();
  const GW = 0.6, GH = 0.4;
  const slatCount = 14;
  const slatMat = matSlat();
  const frameMat = matGalvanised();
  const borderW = 0.025;

  // Frame
  ([
    { size: [GW + borderW * 2, borderW, 0.02] as [number, number, number], pos: [0, GH / 2 + borderW / 2, 0] as [number, number, number] },
    { size: [GW + borderW * 2, borderW, 0.02] as [number, number, number], pos: [0, -GH / 2 - borderW / 2, 0] as [number, number, number] },
    { size: [borderW, GH, 0.02] as [number, number, number], pos: [GW / 2 + borderW / 2, 0, 0] as [number, number, number] },
    { size: [borderW, GH, 0.02] as [number, number, number], pos: [-GW / 2 - borderW / 2, 0, 0] as [number, number, number] },
  ] as Array<{ size: [number, number, number]; pos: [number, number, number] }>).forEach(({ size, pos }) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(...size), frameMat);
    b.position.set(...pos);
    group.add(b);
  });

  // Louver slats
  for (let i = 0; i < slatCount; i++) {
    const y = -GH / 2 + (i + 0.5) * GH / slatCount;
    const slatGeo = new THREE.BoxGeometry(GW - 0.005, 0.004, GH / slatCount * 1.2);
    const slat = new THREE.Mesh(slatGeo, slatMat);
    slat.position.set(0, y, 0);
    slat.rotation.x = Math.PI * -0.12;
    group.add(slat);
  }

  // Mounting screws (4 corners)
  const screwMat = matStainless();
  ([[-GW / 2 - 0.01, GH / 2 + 0.01], [GW / 2 + 0.01, GH / 2 + 0.01],
    [-GW / 2 - 0.01, -GH / 2 - 0.01], [GW / 2 + 0.01, -GH / 2 - 0.01]] as const).forEach(([x, y]) => {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 6), screwMat);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(x, y, -0.01);
    group.add(screw);
  });

  return group;
}

export function buildReturnGrilles(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_return_grilles';

  // 4 grilles on different walls at Y≈0.6
  const specs: Array<{ pos: [number, number, number]; rotY: number }> = [
    { pos: [-2.95, 0.6, 0], rotY: Math.PI / 2 },       // West wall
    { pos: [2.95, 0.6, 0], rotY: -Math.PI / 2 },        // East wall
    { pos: [0, 0.6, -2.95], rotY: 0 },                   // North wall
    { pos: [0, 0.6, 2.95], rotY: Math.PI },              // South wall
  ];
  specs.forEach(({ pos, rotY }) => {
    const grille = buildReturnGrille();
    grille.position.set(...pos);
    grille.rotation.y = rotY;
    group.add(grille);
  });

  return group;
}

// ═════════════════════════════════════════════════════════════
// Outdoor Unit (Daikin 12HP, on rooftop)
// ═════════════════════════════════════════════════════════════

export function buildOutdoorUnit(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_outdoor_unit';
  const UW = 1.2, UD = 0.7, UH = 0.9;

  // Outer casing
  const casingMat = matOutdoorUnit();

  // Condenser fin pack (InstancedMesh, ~200 fins, front face)
  const finCount = 200;
  const finGeo = new THREE.PlaneGeometry(0.001, UH * 0.85);
  const finMat = matCoilFin();
  finMat.side = THREE.DoubleSide;
  const fins = new THREE.InstancedMesh(finGeo, finMat, finCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < finCount; i++) {
    dummy.position.set(-UW / 2 + i * UW / finCount, UH * 0.1, UD / 2);
    dummy.rotation.y = Math.PI / 2;
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  group.add(fins);

  // Fins on back face
  const finsBack = new THREE.InstancedMesh(finGeo, finMat, finCount);
  for (let i = 0; i < finCount; i++) {
    dummy.position.set(-UW / 2 + i * UW / finCount, UH * 0.1, -UD / 2);
    dummy.rotation.y = Math.PI / 2;
    dummy.updateMatrix();
    finsBack.setMatrixAt(i, dummy.matrix);
  }
  finsBack.instanceMatrix.needsUpdate = true;
  group.add(finsBack);

  // Top panel with fan hole (Shape + Hole)
  const topShape = new THREE.Shape();
  topShape.moveTo(-UW / 2, -UD / 2);
  topShape.lineTo(UW / 2, -UD / 2);
  topShape.lineTo(UW / 2, UD / 2);
  topShape.lineTo(-UW / 2, UD / 2);
  topShape.closePath();
  const fanHole = new THREE.Path();
  fanHole.absarc(0, 0, UW * 0.37, 0, Math.PI * 2);
  topShape.holes.push(fanHole);
  const topGeo = new THREE.ExtrudeGeometry(topShape, { depth: 0.01, bevelEnabled: false });
  const topPanel = new THREE.Mesh(topGeo, casingMat);
  topPanel.rotation.x = -Math.PI / 2;
  topPanel.position.y = UH;
  group.add(topPanel);

  // Fan guard (concentric wire rings)
  const guardMat = matWireMesh();
  const guardRadius = UW * 0.37;
  for (let r = 1; r <= 4; r++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(guardRadius * r / 4, 0.003, 6, 32),
      guardMat,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = UH + 0.012;
    group.add(ring);
  }

  // 3 propeller fan blades
  const bladeMat = matFanBlade();
  for (let b = 0; b < 3; b++) {
    const angle = (b / 3) * Math.PI * 2;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(UW * 0.35, 0.005, UW * 0.12),
      bladeMat,
    );
    blade.position.set(
      Math.cos(angle) * UW * 0.18,
      UH + 0.014,
      Math.sin(angle) * UW * 0.18,
    );
    blade.rotation.set(0, angle + Math.PI * 0.15, 0);
    group.add(blade);
  }

  // Side panels
  ([-UW / 2, UW / 2] as const).forEach(xSide => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.006, UH, UD), casingMat);
    panel.position.set(xSide, UH / 2, 0);
    group.add(panel);
  });

  // Bottom base pan
  const base = new THREE.Mesh(new THREE.BoxGeometry(UW, 0.04, UD), casingMat);
  base.position.y = 0;
  group.add(base);

  // Anti-vibration rubber feet
  const rubberMat = matRubberGasket();
  ([[-UW / 2 + 0.1, 0, -UD / 2 + 0.1], [UW / 2 - 0.1, 0, -UD / 2 + 0.1],
    [-UW / 2 + 0.1, 0, UD / 2 - 0.1], [UW / 2 - 0.1, 0, UD / 2 - 0.1]] as Vec3).forEach(pos => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.04, 12), rubberMat);
    foot.position.set(pos[0], pos[1], pos[2]);
    group.add(foot);
  });

  // Service valves
  const valveMat = matBrassValve();
  const coverMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, metalness: 0.3 });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.006), coverMat);
  cover.position.set(UW / 2 + 0.003, UH * 0.25, 0.1);
  cover.rotation.y = Math.PI / 2;
  group.add(cover);
  ([[UH * 0.22, 0.04], [UH * 0.28, 0.06]] as const).forEach(([y, r]) => {
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 8), valveMat);
    valve.rotation.z = Math.PI / 2;
    valve.position.set(UW / 2 + 0.03, y, 0.1);
    group.add(valve);
  });

  // Rating nameplate
  const nameplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.1, 0.002),
    new THREE.MeshStandardMaterial({ color: 0xC8CCAA, roughness: 0.6, metalness: 0.2 }),
  );
  nameplate.position.set(0, UH * 0.4, UD / 2 + 0.001);
  group.add(nameplate);

  // Position on rooftop
  group.position.set(4, 5.2, 4);

  return group;
}

type Vec3 = [number, number, number][];

// ═════════════════════════════════════════════════════════════
// Refrigerant Piping (suction + liquid line)
// ═════════════════════════════════════════════════════════════

export function buildRefrigerantPiping(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_refrigerant_pipes';

  // Suction line (large, insulated) — ODU → AHU evaporator
  const suctionPath = [
    new THREE.Vector3(4.0, 5.2, 4.0),
    new THREE.Vector3(4.0, 4.5, 4.0),
    new THREE.Vector3(6.0, 4.0, 2.0),
    new THREE.Vector3(7.0, 2.0, 0.5),
    new THREE.Vector3(7.5, 0.8, 0.5),
  ];
  const suctionCurve = new THREE.CatmullRomCurve3(suctionPath);

  // Black foam insulation
  const suctionInsul = new THREE.Mesh(
    new THREE.TubeGeometry(suctionCurve, 40, 0.035, 12, false),
    matInsulation(),
  );
  group.add(suctionInsul);

  // Copper pipe inside
  const copperMat = matCopper();
  const suctionPipe = new THREE.Mesh(
    new THREE.TubeGeometry(suctionCurve, 40, 0.018, 8, false),
    copperMat,
  );
  group.add(suctionPipe);

  // Liquid line (smaller, parallel)
  const liquidPath = [
    new THREE.Vector3(4.1, 5.2, 4.0),
    new THREE.Vector3(4.1, 4.5, 4.0),
    new THREE.Vector3(6.05, 4.0, 2.0),
    new THREE.Vector3(7.05, 2.0, 0.5),
    new THREE.Vector3(7.5, 0.8, 0.6),
  ];
  const liquidCurve = new THREE.CatmullRomCurve3(liquidPath);
  const liquidInsul = new THREE.Mesh(
    new THREE.TubeGeometry(liquidCurve, 40, 0.018, 8, false),
    matInsulation(),
  );
  group.add(liquidInsul);

  // Support clips every 1.5m
  const totalLength = suctionCurve.getLength();
  const clipCount = Math.floor(totalLength / 1.5);
  const clipMat = matGalvanised();
  for (let i = 1; i < clipCount; i++) {
    const t = i / clipCount;
    const clipPos = suctionCurve.getPoint(t);
    const clip = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.004, 4, 12, Math.PI),
      clipMat,
    );
    clip.position.copy(clipPos);
    group.add(clip);
  }

  return group;
}

// ═════════════════════════════════════════════════════════════
// OR Room Equipment (table, shadowless lamp, pendant)
// ═════════════════════════════════════════════════════════════

export function buildOREquipment(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_or_equipment';

  const tableMat = matOREquipment();
  const padMat = matOperatingPad();

  // Operating table (2100×550mm)
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.55), tableMat);
  tableTop.position.y = 0.9;
  group.add(tableTop);

  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.04, 0.52), padMat);
  pad.position.y = 0.94;
  group.add(pad);

  // Column
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 0.9, 12),
    tableMat,
  );
  column.position.y = 0.45;
  group.add(column);

  // Base plate
  const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.7), tableMat);
  basePlate.position.y = 0.025;
  group.add(basePlate);

  // Shadowless lamp (ceiling-mounted)
  const lampGroup = buildShadowlessLamp();
  lampGroup.position.set(0, 2.8, 0);
  group.add(lampGroup);

  // Surgical pendant
  const pendant = buildSurgicalPendant();
  pendant.position.set(-1.2, 2.5, 0.5);
  group.add(pendant);

  return group;
}

function buildShadowlessLamp(): THREE.Group {
  const group = new THREE.Group();
  const armMat = matStainless();
  const lampEmissive = matLampLED();

  // Ceiling mount
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16), armMat);
  group.add(mount);

  // Arm
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), armMat);
  arm.position.y = -0.3;
  group.add(arm);

  // Lamp body (700mm diameter)
  const lampBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.38, 0.1, 32),
    armMat,
  );
  lampBody.position.y = -0.65;
  group.add(lampBody);

  // LED array (18 emissive discs around circumference)
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8), lampEmissive);
    led.position.set(Math.cos(angle) * 0.28, -0.71, Math.sin(angle) * 0.28);
    led.rotation.x = -Math.PI / 2;
    group.add(led);
  }

  // Spotlight for actual illumination
  const spotlight = new THREE.SpotLight(0xFFFFEE, 2.0, 3.5, Math.PI * 0.3);
  spotlight.position.y = -0.65;
  group.add(spotlight);

  return group;
}

function buildSurgicalPendant(): THREE.Group {
  const group = new THREE.Group();
  const armMat = matStainless();
  const panelMat = matControlPanel();

  // Ceiling column
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 12), armMat);
  group.add(col);

  // First arm
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), armMat);
  arm1.position.set(0.4, -0.35, 0);
  group.add(arm1);

  // Second arm
  const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), armMat);
  arm2.position.set(0.8, -0.7, 0);
  arm2.rotation.y = Math.PI * 0.25;
  group.add(arm2);

  // Utility panel
  const utilPanel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.15), panelMat);
  utilPanel.position.set(0.8, -1.1, 0);
  group.add(utilPanel);

  // Gas outlets (O2=green, Air=yellow, Vac=white, N2O=blue)
  const gasColors = [0x00AA00, 0xFFFF00, 0xFFFFFF, 0x0000AA];
  gasColors.forEach((color, i) => {
    const outletMat = matGasOutlet();
    outletMat.color.setHex(color);
    const outlet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8),
      outletMat,
    );
    outlet.rotation.z = Math.PI / 2;
    outlet.position.set(0.81 + 0.03, -1.0 + i * 0.08, 0);
    group.add(outlet);
  });

  return group;
}

// ═════════════════════════════════════════════════════════════
// Control Panel (AHU electrical cabinet)
// ═════════════════════════════════════════════════════════════

export function buildControlPanel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_control_panel';

  const cpMat = matControlPanel();

  // Cabinet body
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.35), cpMat);
  cabinet.position.y = 0.9;
  group.add(cabinet);

  // Door (slight offset)
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x6B7B8D, roughness: 0.45, metalness: 0.30 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.74, 0.008), doorMat);
  door.position.set(0, 0.9, 0.175 + 0.004);
  group.add(door);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.12, 0.025),
    matStainless(),
  );
  handle.position.set(0.22, 0.9, 0.175 + 0.02);
  group.add(handle);

  // Position near AHU (X=9, Z=0)
  group.position.set(9, 0, 0);

  return group;
}

// ═════════════════════════════════════════════════════════════
// Airflow Particles (supply, return, refrigerant)
// ═════════════════════════════════════════════════════════════

type ParticlePathPoint = [number, number, number];

export function buildAirflowParticles(
  pathPoints: ParticlePathPoint[],
  color: number,
  particleCount = 80,
  speed = 0.005,
): THREE.Points {
  const positions = new Float32Array(particleCount * 3);
  const offsets = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    offsets[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size: 0.04,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, material);

  const curve = new THREE.CatmullRomCurve3(
    pathPoints.map(p => new THREE.Vector3(...p)),
  );

  particles.userData.update = (time: number) => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < particleCount; i++) {
      const t = ((time * speed + offsets[i]) % 1);
      const point = curve.getPoint(t);
      pos.setXYZ(i, point.x, point.y, point.z);
    }
    pos.needsUpdate = true;
  };

  return particles;
}
