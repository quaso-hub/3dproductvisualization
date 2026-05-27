/**
 * hvac-v3-equipment.ts
 * ─────────────────────────────────────────────────────────────
 * V4 Equipment: 2× LAF units, outdoor unit, refrigerant pipes,
 * control panel, OR equipment (table + lamp + pendant),
 * airflow particle systems.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { MAT } from './hvac-bim-materials';

/* ═══════════════════════════════════════════════════════════ */
/* LAF Ceiling Unit                                          */
/* ═══════════════════════════════════════════════════════════ */

function buildLAFUnit(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const W = 1.2, D = 1.8, Hp = 0.4;

  // Plenum box (5 panels: 4 walls + top)
  const panels: [number, number, number, number, number, number][] = [
    [0, 0, D / 2, W, Hp, 0.006],
    [0, 0, -D / 2, W, Hp, 0.006],
    [W / 2, 0, 0, 0.006, Hp, D],
    [-W / 2, 0, 0, 0.006, Hp, D],
    [0, Hp / 2, 0, W, 0.006, D],
  ];
  panels.forEach(([px, py, pz, w, h, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.lafPlenum);
    m.position.set(px, py, pz);
    group.add(m);
  });

  // HEPA H14 filters (2×3 grid = 6)
  const filterW = 0.55, filterD = 0.55, filterH = 0.075;
  const fPositions: [number, number][] = [
    [-W / 4, -D / 3], [-W / 4, 0], [-W / 4, D / 3],
    [W / 4, -D / 3], [W / 4, 0], [W / 4, D / 3],
  ];
  fPositions.forEach(([fx, fz]) => {
    const filter = new THREE.Mesh(
      new THREE.BoxGeometry(filterW - 0.02, filterH * 0.8, filterD - 0.02),
      MAT.lafFilter,
    );
    filter.position.set(fx, -Hp / 2 + filterH / 2, fz);
    group.add(filter);

    // Edge lines
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(filterW, filterH, filterD)),
      new THREE.LineBasicMaterial({ color: 0x90A4AE }),
    );
    edges.position.set(fx, -Hp / 2 + filterH / 2, fz);
    group.add(edges);
  });

  // Perforated diffuser face (bottom)
  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.008, D),
    MAT.lafDiffuser,
  );
  diffuser.position.y = -Hp / 2 - 0.004;
  group.add(diffuser);

  // Grid lines on diffuser
  const lineMat = new THREE.LineBasicMaterial({ color: 0xBDBDBD, transparent: true, opacity: 0.5 });
  for (let i = -5; i <= 5; i++) {
    const pts1 = [new THREE.Vector3(i * W / 10, -Hp / 2 - 0.009, -D / 2), new THREE.Vector3(i * W / 10, -Hp / 2 - 0.009, D / 2)];
    const l1 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), lineMat);
    group.add(l1);
    const pts2 = [new THREE.Vector3(-W / 2, -Hp / 2 - 0.009, i * D / 10), new THREE.Vector3(W / 2, -Hp / 2 - 0.009, i * D / 10)];
    const l2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), lineMat);
    group.add(l2);
  }

  // Suspension rods (4 corners)
  const rodLen = 0.25;
  const corners: [number, number][] = [
    [-W / 2 + 0.05, -D / 2 + 0.05], [-W / 2 + 0.05, D / 2 - 0.05],
    [W / 2 - 0.05, -D / 2 + 0.05], [W / 2 - 0.05, D / 2 - 0.05],
  ];
  corners.forEach(([rx, rz]) => {
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, rodLen, 6),
      MAT.lafPlenum,
    );
    rod.position.set(rx, Hp / 2 + rodLen / 2, rz);
    group.add(rod);
  });

  group.position.copy(position);
  return group;
}

export function buildLAFUnits(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_laf_units';
  group.add(buildLAFUnit(new THREE.Vector3(-1.5, 3.22, -0.5)));
  group.add(buildLAFUnit(new THREE.Vector3(1.5, 3.22, -0.5)));
  return group;
}

/* ═══════════════════════════════════════════════════════════ */
/* Outdoor Unit (on rooftop, above mechanical room)          */
/* ═══════════════════════════════════════════════════════════ */

export function buildOutdoorUnit(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_outdoor_unit';
  const UW = 1.2, UD = 0.7, UH = 0.9;

  // Side panels
  ([-UW / 2, UW / 2] as const).forEach(xSide => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.006, UH, UD), MAT.outerCasing);
    panel.position.set(xSide, UH / 2, 0);
    group.add(panel);
  });

  // Bottom base
  const base = new THREE.Mesh(new THREE.BoxGeometry(UW, 0.04, UD), MAT.outerCasing);
  base.position.y = 0.02;
  group.add(base);

  // Condenser fins (InstancedMesh, ~160 fins, front face)
  const finCount = 160;
  const finGeo = new THREE.PlaneGeometry(0.001, UH * 0.85);
  const fins = new THREE.InstancedMesh(finGeo, MAT.outerFin, finCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < finCount; i++) {
    dummy.position.set(-UW / 2 + 0.02 + i * (UW - 0.04) / finCount, UH * 0.5, UD / 2);
    dummy.rotation.y = Math.PI / 2;
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  group.add(fins);

  // Fan guard rings (4 concentric)
  const guardRadius = UW * 0.37;
  const guardMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide });
  for (let r = 1; r <= 4; r++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(guardRadius * r / 4, 0.003, 6, 32),
      guardMat,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = UH + 0.012;
    group.add(ring);
  }

  // 3 fan blades
  for (let b = 0; b < 3; b++) {
    const angle = (b / 3) * Math.PI * 2;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(UW * 0.35, 0.005, UW * 0.12),
      MAT.fanBlade,
    );
    blade.position.set(Math.cos(angle) * UW * 0.18, UH + 0.014, Math.sin(angle) * UW * 0.18);
    blade.rotation.y = angle + Math.PI * 0.15;
    group.add(blade);
  }

  // Rubber feet (4 corners)
  const footMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.85 });
  ([[-UW / 2 + 0.1, -UD / 2 + 0.1], [UW / 2 - 0.1, -UD / 2 + 0.1],
    [-UW / 2 + 0.1, UD / 2 - 0.1], [UW / 2 - 0.1, UD / 2 - 0.1]] as const).forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.04, 12), footMat);
    foot.position.set(fx, 0, fz);
    group.add(foot);
  });

  // Nameplate
  const nameplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.1, 0.002),
    new THREE.MeshStandardMaterial({ color: 0xC8CCAA, roughness: 0.6, metalness: 0.2 }),
  );
  nameplate.position.set(0, UH * 0.4, UD / 2 + 0.001);
  group.add(nameplate);

  // Position on rooftop (V4 spec: X=6.0→7.2, Y=5.0→5.9)
  group.position.set(6.6, 5.0, 0);

  return group;
}

/* ═══════════════════════════════════════════════════════════ */
/* Refrigerant Piping (axis-aligned, V4 coordinates)         */
/* ═══════════════════════════════════════════════════════════ */

export function buildRefrigerantPipes(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_refrigerant_pipes';

  // Suction line (large, insulated): ODU → down → horizontal → down to AHU
  // Vertical: (7.1, 5.0→3.5)
  addInsulatedPipe(group, 7.1, 3.5, 5.0, 0, 0.035, 'vertical');
  // Horizontal X: (7.1→8.5, 3.5)
  addInsulatedPipe(group, 7.1, 8.5, 3.5, 0, 0.035, 'horizontal-x');
  // Vertical: (8.5, 3.5→0.7)
  addInsulatedPipe(group, 8.5, 0.7, 3.5, 0, 0.035, 'vertical');

  // Liquid line (smaller, parallel, offset Z=+0.08)
  addInsulatedPipe(group, 7.1, 3.5, 5.0, 0.08, 0.022, 'vertical');
  addInsulatedPipe(group, 7.1, 8.5, 3.5, 0.08, 0.022, 'horizontal-x');
  addInsulatedPipe(group, 8.5, 0.7, 3.5, 0.08, 0.022, 'vertical');

  return group;
}

function addInsulatedPipe(
  parent: THREE.Group,
  a: number, b: number, c: number, zOff: number,
  radius: number,
  orient: 'vertical' | 'horizontal-x',
): void {
  const len = Math.abs(b - a);
  if (len < 0.01) return;

  // Black insulation
  const insul = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 10),
    MAT.insulation,
  );
  // Copper core
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, len, 8),
    MAT.copper,
  );

  if (orient === 'vertical') {
    const mid = (a + b) / 2; // a=x, b=y range doesn't apply here
    // For vertical: a=x, first number is y1, second is y2
    insul.position.set(a, (b + c) / 2, zOff); // WRONG — let me recalculate
    // Actually: vertical means Y axis. a=X pos, b=y1, c=y2... no.
    // Rethink: (x, y1→y2, z)
    // Called as: addInsulatedPipe(group, 7.1, 3.5, 5.0, 0, ..., 'vertical')
    // = x=7.1, y range 3.5→5.0, z=0+zOff
    const yMid = (b + c) / 2;
    const yLen = Math.abs(c - b);
    insul.position.set(a, yMid, zOff);
    pipe.position.set(a, yMid, zOff);
    // CylinderGeometry is vertical by default
    const geoI = new THREE.CylinderGeometry(radius, radius, yLen, 10);
    const geoP = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, yLen, 8);
    insul.geometry.dispose();
    pipe.geometry.dispose();
    insul.geometry = geoI;
    pipe.geometry = geoP;
  } else {
    // horizontal-x: a=x1, b=x2, c=Y, z=zOff
    const xMid = (a + b) / 2;
    const xLen = Math.abs(b - a);
    const geoI = new THREE.CylinderGeometry(radius, radius, xLen, 10);
    const geoP = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, xLen, 8);
    insul.geometry.dispose();
    pipe.geometry.dispose();
    insul.geometry = geoI;
    pipe.geometry = geoP;
    insul.rotation.z = Math.PI / 2;
    pipe.rotation.z = Math.PI / 2;
    insul.position.set(xMid, c, zOff);
    pipe.position.set(xMid, c, zOff);
  }

  parent.add(insul);
  parent.add(pipe);
}

/* ═══════════════════════════════════════════════════════════ */
/* Control Panel                                             */
/* ═══════════════════════════════════════════════════════════ */

export function buildControlPanel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_control_panel';

  // Cabinet body
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.35), MAT.panel);
  cabinet.position.y = 0.9;
  group.add(cabinet);

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.74, 0.008), MAT.panelDoor);
  door.position.set(0, 0.9, 0.179);
  group.add(door);

  // HMI screen
  const hmi = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.008), MAT.hmi);
  hmi.position.set(0, 1.2, 0.184);
  group.add(hmi);

  // Handle
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.12, 0.025),
    MAT.flange,
  );
  handle.position.set(0.22, 0.9, 0.20);
  group.add(handle);

  // Position near AHU
  group.position.set(9.2, 0, 0);
  return group;
}

/* ═══════════════════════════════════════════════════════════ */
/* OR Room Equipment (operating table, lamp, pendant)        */
/* ═══════════════════════════════════════════════════════════ */

export function buildOREquipment(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'grp_or_equipment';

  // Operating table
  // Column
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 0.88, 12),
    MAT.tableMetal,
  );
  column.position.set(0, 0.44, 0);
  group.add(column);

  // Table top
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.55), MAT.tableMetal);
  top.position.set(0, 0.92, 0);
  group.add(top);

  // Pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.04, 0.52), MAT.tablePad);
  pad.position.set(0, 0.96, 0);
  group.add(pad);

  // Base plate
  const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.7), MAT.tableMetal);
  basePlate.position.set(0, 0.025, 0);
  group.add(basePlate);

  // Shadowless lamp (ceiling-mounted)
  const lampGroup = new THREE.Group();

  // Mount
  const mount = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16),
    MAT.pendantArm,
  );
  mount.position.y = 3.44;
  lampGroup.add(mount);

  // Arm
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8),
    MAT.pendantArm,
  );
  arm.position.y = 3.1;
  lampGroup.add(arm);

  // Lamp head
  const lampHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.38, 0.1, 32),
    MAT.pendantArm,
  );
  lampHead.position.y = 2.75;
  lampGroup.add(lampHead);

  // LED array (18 discs)
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8), MAT.lampWhite);
    led.position.set(Math.cos(angle) * 0.28, 2.69, Math.sin(angle) * 0.28);
    led.rotation.x = -Math.PI / 2;
    lampGroup.add(led);
  }

  // SpotLight for illumination
  const spotlight = new THREE.SpotLight(0xFFFFEE, 2.0, 3.5, Math.PI * 0.3);
  spotlight.position.y = 2.75;
  lampGroup.add(spotlight);

  group.add(lampGroup);

  // Surgical pendant (side-mounted)
  const pendantGroup = new THREE.Group();

  // Ceiling column
  const pcol = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.5, 12),
    MAT.pendantArm,
  );
  pcol.position.set(-1.2, 3.25, 0.5);
  pendantGroup.add(pcol);

  // Arms
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), MAT.pendantArm);
  arm1.position.set(-0.8, 2.9, 0.5);
  pendantGroup.add(arm1);

  // Utility column
  const utilCol = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.15), MAT.panel);
  utilCol.position.set(-0.5, 2.5, 0.5);
  pendantGroup.add(utilCol);

  // Gas outlets (4: O2, Air, Vac, N2O)
  const gasColors = [0x00AA00, 0xFFFF00, 0xFFFFFF, 0x0000AA];
  gasColors.forEach((color, i) => {
    const outlet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 }),
    );
    outlet.rotation.z = Math.PI / 2;
    outlet.position.set(-0.39, 2.35 + i * 0.08, 0.5);
    pendantGroup.add(outlet);
  });

  group.add(pendantGroup);

  return group;
}

/* ═══════════════════════════════════════════════════════════ */
/* Airflow Particles (CatmullRomCurve3-based)                */
/* ═══════════════════════════════════════════════════════════ */

type PathPoint = [number, number, number];

export function createParticleSystem(
  pathPoints: PathPoint[],
  color: number,
  count = 80,
  speed = 0.005,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  const offsets = new Float32Array(count);
  for (let i = 0; i < count; i++) offsets[i] = Math.random();

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
  const curve = new THREE.CatmullRomCurve3(pathPoints.map(p => new THREE.Vector3(...p)));

  particles.userData.update = (time: number) => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const t = (time * speed + offsets[i]) % 1;
      const point = curve.getPoint(t);
      pos.setXYZ(i, point.x, point.y, point.z);
    }
    pos.needsUpdate = true;
  };

  return particles;
}

/** Update all particle systems — call from onTick */
export function updateParticles(
  particles: THREE.Points[],
  time: number,
): void {
  for (const p of particles) {
    if (p.userData.update) p.userData.update(time);
  }
}
