/**
 * geometry-blender.ts — Blender-tier geometry helpers
 * ─────────────────────────────────────────────────────────────
 * "Sculpted" geometry primitives for medical/industrial 3D viewers.
 * These eliminate the "boxy primitive" look by adding chamfers,
 * bevels, fillets, and organic curves to every visible edge.
 *
 * Conventions:
 *   - All geometries return THREE.BufferGeometry-compatible meshes
 *   - All take dimensions in scene units (1 unit = 10mm in this project)
 *   - Bevel/chamfer values are SCALED to dimension (proportional)
 *   - Default segment counts target 60fps on M1/Pixel 6 mobile
 *
 * Use these instead of bare BoxGeometry / CylinderGeometry whenever:
 *   - The mesh is hero (visible at <2m camera distance)
 *   - The mesh has a hard-edge silhouette in real life that needs rounding
 *   - The mesh sits next to a hero piece and would expose the boxy look
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';

// ─── Rounded Box (chamfered all 12 edges) ─────────────────────

/**
 * Rounded box via ExtrudeGeometry with multi-segment bevel.
 * 2026 SOTA: chamfered edges sell "manufactured sheet metal" feel.
 *
 * PERFORMANCE TIER:
 *  - segs=2 (default): mid-quality, ~100 verts. Use for SECONDARY parts.
 *  - segs=4: hero quality, ~300 verts. Use ONLY for visible hero pieces (cabinet body, door slab, AHU casing).
 *  - segs=1: tiny chamfer hint, ~50 verts. Use for TERTIARY parts (screws, small hardware).
 *
 * Use BoxGeometry directly (not this) for: lead stripes, gaskets, screws,
 * tiny markers — anything < 5cm visible scale. Save vertex budget.
 *
 * @param w  width (X)
 * @param h  height (Y)
 * @param d  depth (Z)
 * @param r  chamfer radius (default = min(w,h,d) * 0.04)
 * @param segs  bevel segments (DEFAULT 2 = balanced; raise to 4 only for hero)
 */
export function roundedBox(w: number, h: number, d: number, r?: number, segs = 2): THREE.BufferGeometry {
  const radius = r ?? Math.min(w, h, d) * 0.04;
  const halfW = w / 2;
  const halfH = h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfW + radius, -halfH);
  shape.lineTo(halfW - radius, -halfH);
  shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + radius);
  shape.lineTo(halfW, halfH - radius);
  shape.quadraticCurveTo(halfW, halfH, halfW - radius, halfH);
  shape.lineTo(-halfW + radius, halfH);
  shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - radius);
  shape.lineTo(-halfW, -halfH + radius);
  shape.quadraticCurveTo(-halfW, -halfH, -halfW + radius, -halfH);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: radius * 0.6,
    bevelSize: radius * 0.6,
    bevelSegments: segs,
    curveSegments: segs >= 4 ? 8 : 4, // also tier curve segments
  });
  geo.translate(0, 0, -d / 2);
  geo.computeVertexNormals();
  return geo;
}

// ─── Beveled Plate (thin slab with rounded edges, like a panel) ───

/**
 * Thin plate with rounded perimeter + beveled edges.
 * Use for: door leaf, kickplate, mirror, panel.
 */
export function beveledPlate(w: number, h: number, t: number, r = 0.4, segs = 3): THREE.BufferGeometry {
  return roundedBox(w, h, t, r, segs);
}

// ─── Lathe Profile (organic curved bodies of revolution) ─────────

/**
 * Lathe geometry from a 2D profile array.
 *
 * PERFORMANCE TIER:
 *  - segments=20 (default): balanced ~600 verts. Use for SECONDARY (faucet aerator, small handle).
 *  - segments=32: hero quality ~1000+ verts. Use ONLY for visible hero (large dome, prominent faucet).
 *  - segments=12-16: tertiary, small hardware (screw heads, tiny knobs).
 *
 * @param profile  array of [x, y] points; x = radius from axis, y = height
 * @param segments  radial segments (DEFAULT 20 — raise only for hero)
 */
export function latheProfile(profile: Array<[number, number]>, segments = 20): THREE.BufferGeometry {
  const points = profile.map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(points, segments);
  geo.computeVertexNormals();
  return geo;
}

// ─── Pipe with flanges (industrial pipe with bolted flanges at ends) ─

/**
 * Pipe segment with optional flange caps. Use for:
 *   - Refrigerant lines with service valves
 *   - Drain pipes with cleanout caps
 *   - Faucet outlet with aerator screw-on
 *
 * Returns a Group (pipe + 2 flange discs).
 */
export function pipeFlanged(
  length: number,
  pipeRadius: number,
  flangeRadius?: number,
  flangeThickness = 0.3,
  pipeSegments = 24,
): THREE.BufferGeometry[] {
  const fr = flangeRadius ?? pipeRadius * 1.6;
  const pipe = new THREE.CylinderGeometry(pipeRadius, pipeRadius, length, pipeSegments, 1, false);
  const flangeA = new THREE.CylinderGeometry(fr, fr, flangeThickness, pipeSegments);
  flangeA.translate(0, length / 2 - flangeThickness / 2, 0);
  const flangeB = new THREE.CylinderGeometry(fr, fr, flangeThickness, pipeSegments);
  flangeB.translate(0, -length / 2 + flangeThickness / 2, 0);
  return [pipe, flangeA, flangeB];
}

// ─── Smooth Curve Tube (CatmullRom-driven hero piping) ────────

/**
 * High-resolution tube along a CatmullRom curve.
 *
 * PERFORMANCE TIER:
 *  - tubularSegments=32, radialSegments=12 (default): mid-quality, ~400 verts.
 *  - 48×16: hero quality ~800 verts. Use for visible main faucet/pipe.
 *  - 64×24: silky studio shot ~1500 verts. ONLY for hero close-up renders.
 *
 * @param points  3D control points (CatmullRom curve)
 * @param radius  tube radius
 * @param tubularSegments  along-curve subdivision (DEFAULT 32 = balanced)
 * @param radialSegments  cross-section facets (DEFAULT 12 = balanced)
 */
export function smoothTube(
  points: THREE.Vector3[],
  radius: number,
  tubularSegments = 32,
  radialSegments = 12,
  closed = false,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.5);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
  return geo;
}

// ─── Knurled Cylinder (textured grip surface) ────────────────────

/**
 * Cylinder with knurled (cross-hatched) grip pattern for:
 *   - Door handle middle section
 *   - Valve wheels
 *   - Lock cylinder caps
 *
 * Implementation: high radial segment count + slight vertex displacement
 * gives the appearance of knurling without normal map (mobile-cheap).
 */
export function knurledCylinder(
  radius: number,
  height: number,
  segments = 32,
  knurlDepth = 0.08,
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius, radius, height, segments, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    // Skip top/bottom caps
    if (Math.abs(py) > height / 2 - 0.05) continue;
    const angle = Math.atan2(pz, px);
    const r = Math.hypot(px, pz);
    // Cross-hatch knurl: combine angle + height waves
    const knurl = Math.sin(angle * segments) * Math.cos(py * 8) * knurlDepth;
    const newR = r + knurl;
    pos.setX(i, Math.cos(angle) * newR);
    pos.setZ(i, Math.sin(angle) * newR);
  }
  geo.computeVertexNormals();
  return geo;
}

// ─── Bar Pull Handle (capped bar with hemispherical ends) ────────

/**
 * D-pull / bar pull handle with hemispherical end caps.
 * Use for: door handles (bar pull SS ⌀22×500mm), drawer pulls.
 *
 * Returns array of geometries: [bar, capA (top), capB (bottom)].
 */
export function barPullHandle(length: number, radius: number, segments = 16): THREE.BufferGeometry[] {
  const bar = new THREE.CylinderGeometry(radius, radius, length, segments, 1, false);
  const capA = new THREE.SphereGeometry(radius, segments, Math.floor(segments / 2), 0, Math.PI * 2, 0, Math.PI / 2);
  capA.translate(0, length / 2, 0);
  const capB = new THREE.SphereGeometry(radius, segments, Math.floor(segments / 2), 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  capB.translate(0, -length / 2, 0);
  return [bar, capA, capB];
}

// ─── Hinge Knuckle Stack (real heavy-duty butt hinge) ────────────

/**
 * 5-knuckle butt hinge with alternating leaves. Returns:
 *   { leafA, leafB, pin, knuckles: [...5] }
 *
 * Real hospital security door hinge: 5 alternating knuckles + NRP pin,
 * 5"×4½" face × 0.3" thickness, knuckle barrel ⌀10mm.
 */
export interface HingeKnuckleStackResult {
  leafA: THREE.BufferGeometry; // attached to door
  leafB: THREE.BufferGeometry; // attached to frame
  pin: THREE.BufferGeometry;
  knuckles: THREE.BufferGeometry[];
}

export function hingeKnuckleStack(
  leafW: number,
  leafH: number,
  leafThickness: number,
  knuckleRadius: number,
  pinRadius: number,
  knuckleSegments = 16,
): HingeKnuckleStackResult {
  const leafA = roundedBox(leafW, leafH, leafThickness, leafThickness * 0.4, 2);
  const leafB = roundedBox(leafW, leafH, leafThickness, leafThickness * 0.4, 2);

  // Pin runs full length
  const pin = new THREE.CylinderGeometry(pinRadius, pinRadius, leafH * 1.05, 16);

  // 5 knuckle barrels, alternating Y positions
  const knuckles: THREE.BufferGeometry[] = [];
  const knuckleH = leafH / 5.5;
  const yPositions = [-2.4, -1.2, 0, 1.2, 2.4].map((y) => (y / 5) * leafH);
  yPositions.forEach((py) => {
    const k = new THREE.CylinderGeometry(knuckleRadius, knuckleRadius, knuckleH, knuckleSegments);
    k.translate(0, py, 0);
    knuckles.push(k);
  });

  return { leafA, leafB, pin, knuckles };
}

// ─── Beveled Disc (chamfered cylinder cap, like a button) ────────

/**
 * Disc with chamfered top edge. Use for:
 *   - Buttons / pump heads
 *   - Drain strainer covers
 *   - Lock cylinder collars
 */
export function beveledDisc(radius: number, height: number, chamfer = 0.15, segments = 16): THREE.BufferGeometry {
  const r = Math.min(chamfer, radius * 0.3);
  const profile: Array<[number, number]> = [
    [0, 0],
    [radius, 0],
    [radius, height - r],
    [radius - r, height],
    [0, height],
  ];
  return latheProfile(profile, segments);
}

// ─── Dome (hemispherical cover for sensors/lights) ───────────────

/**
 * Dome / hemisphere with optional rim. Use for:
 *   - Surgical light heads
 *   - Sensor LED covers
 *   - Mushroom-shaped buttons
 */
export function dome(radius: number, segments = 24, withRim = true): THREE.BufferGeometry {
  if (withRim) {
    // Lathe profile: thin rim + hemisphere
    const rimH = radius * 0.08;
    const profile: Array<[number, number]> = [
      [0, -rimH],
      [radius, -rimH],
      [radius * 1.05, -rimH * 0.5],
      [radius * 1.05, 0],
    ];
    // Add hemisphere points
    const hemiSegs = 16;
    for (let i = 0; i <= hemiSegs; i++) {
      const angle = (i / hemiSegs) * (Math.PI / 2);
      profile.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }
    return latheProfile(profile, segments);
  }
  return new THREE.SphereGeometry(radius, segments, Math.floor(segments / 2), 0, Math.PI * 2, 0, Math.PI / 2);
}

// ─── Faucet Spout (gooseneck with smooth taper) ──────────────────

/**
 * Hospital-grade gooseneck faucet shape:
 *   - Vertical base column (slightly tapered)
 *   - Single-sweep arc to horizontal
 *   - Tapered spout pointing down
 *   - Aerator at tip
 *
 * Returns geometries: [body, aerator, sensorRecess].
 *
 * @param baseY   Y of faucet base (mounting deck)
 * @param tipY    Y of spout tip
 * @param tipZ    Z of spout tip (forward from base)
 * @param baseRadius  base column radius
 */
export function faucetSpout(
  baseY: number,
  tipY: number,
  tipZ: number,
  baseRadius = 1.4,
  fX = 0,
): { body: THREE.BufferGeometry; aerator: THREE.BufferGeometry; sensorRecess: THREE.BufferGeometry } {
  // Curve: vertical → arch → horizontal → tip down
  const points: THREE.Vector3[] = [
    new THREE.Vector3(fX, baseY, -22),
    new THREE.Vector3(fX, baseY + 8, -22),
    new THREE.Vector3(fX, baseY + 14, -16),
    new THREE.Vector3(fX, baseY + 14, -8),
    new THREE.Vector3(fX, baseY + 14, -2),
    new THREE.Vector3(fX, baseY + 8, tipZ + 2),
    new THREE.Vector3(fX, tipY, tipZ),
  ];
  const body = smoothTube(points, baseRadius * 0.85, 48, 16, false);

  // Aerator at tip (small tapered disc)
  const aerator = latheProfile(
    [
      [0, -1.0],
      [baseRadius * 1.1, -0.7],
      [baseRadius * 1.05, 0.0],
      [baseRadius * 0.7, 0.5],
      [0, 0.5],
    ],
    20,
  );
  aerator.translate(fX, tipY - 0.5, tipZ);

  // Sensor IR recess (small disc inset into faucet body)
  const sensorRecess = latheProfile(
    [
      [0, 0],
      [0.9, 0],
      [0.9, 0.3],
      [0.6, 0.4],
      [0, 0.4],
    ],
    14,
  );
  sensorRecess.rotateX(Math.PI / 2);
  sensorRecess.translate(fX, tipY - 2.4, tipZ - 0.5);

  return { body, aerator, sensorRecess };
}

// ─── Helper: dispose a geometry array ───────────────────────────

export function disposeGeoArray(geos: THREE.BufferGeometry[]): void {
  geos.forEach((g) => g.dispose());
}
