/**
 * PbLeadDoorAssembled3D.tsx — ASSEMBLED VIEW (v3 — Reference-accurate)
 * ─────────────────────────────────────────────────────────────
 * Automatic Single Swing PB / Lead Door — tampilan utuh sesuai referensi.
 *
 * Referensi visual (dari foto produk nyata):
 * - Daun pintu: warna PUTIH / off-white (powder coat medis standar)
 * - Jendela lead glass: PORTRAIT (sempit + tinggi) di area atas, agak ke kiri-tengah
 * - Kick plate SS: strip lebar horizontal menonjol di area tengah-bawah
 * - Automatic door closer: body silver di ATAS header, arm turun ke bracket di atas pintu
 * - Engsel (3x): di sisi KANAN pintu
 * - Handle lever: di sisi KIRI (opposite hinges)
 * - Kusen: steel plate tipis, semua sisi
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset, downloadPNG, placeAnnotations,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ─── Dimensi (scene units, 1 unit = 10 mm) ───────────────────
// Door leaf: 900 × 2100 mm, thickness ±48 mm
const DW = 90;   // door leaf width  900 mm
const DH = 210;  // door leaf height 2100 mm
const DT = 4.8;  // door leaf thickness ~48 mm

// Frame: jamb face width 70 mm
const FW = 7;
const FD = DT + 8; // frame depth

// View Glass Timbal — PORTRAIT: narrow width, tall height
// Ref: roughly 150 mm wide × 400 mm tall, upper area, slightly left of center
const GW = 15;   // glass width  ≈150 mm
const GH = 40;   // glass height ≈400 mm
const GX = -8;   // slightly left of center
const gYCenter = DH / 2 - 30 - GH / 2; // 300 mm from top

// SS Kick plate — prominent, ≈1/3 from bottom
const KPH = 18;  // kick plate height ≈180 mm
const KPW = DW - 4;
const kickYCenter = -DH / 2 + 30 + KPH / 2;

// Wall context size
const WALL_W = DW + FW * 4 + 30;
const WALL_H = DH + FW * 4 + 30;

// ─── Materials ───────────────────────────────────────────────

function matDoorWhite() {
  return new THREE.MeshStandardMaterial({
    color: 0xdde8ec,   // off-white / light blue-white (medical powder coat)
    roughness: 0.55,
    metalness: 0.08,
    envMapIntensity: 0.45,
  });
}

function matFrame() {
  return new THREE.MeshStandardMaterial({
    color: 0xc0ccd5,
    roughness: 0.25,
    metalness: 0.72,
    envMapIntensity: 0.8,
  });
}

function matSS(roughness = 0.12, metalness = 0.92) {
  return new THREE.MeshStandardMaterial({
    color: 0xd4dde5,
    roughness,
    metalness,
    envMapIntensity: 1.1,
  });
}

function matLeadGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0xbde0e8,
    roughness: 0.04,
    metalness: 0.0,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    envMapIntensity: 1.2,
  });
}

function matLead() {
  return new THREE.MeshStandardMaterial({
    color: 0x6b7078,
    roughness: 0.50,
    metalness: 0.55,
  });
}

function matRubber() {
  return new THREE.MeshStandardMaterial({
    color: 0x1e2228,
    roughness: 0.92,
    metalness: 0.0,
  });
}

function matWall() {
  return new THREE.MeshStandardMaterial({
    color: 0xb8ccd8,
    roughness: 0.90,
    metalness: 0.0,
  });
}

function box(w: number, h: number, d: number) {
  return new THREE.BoxGeometry(w, h, d);
}

// ─── Scene builder ────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {

  // ── 0. PBR Environment ──────────────────────────────────────
  renderer.toneMappingExposure = 0.72;   // reduced from 0.95 — less glare
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
  scene.background = new THREE.Color(0xedf2f5);
  pmrem.dispose();

  // ── 0b. Wall (blue-grey medical room reference) — FIX: closer to frame ────
  const wall = new THREE.Mesh(box(WALL_W, WALL_H, 3), matWall());
  wall.position.set(0, 2.5, -(DT / 2 + FD / 2 + 1)); // FIX: reduced from 3 to 1 for better connection
  wall.receiveShadow = true;
  scene.add(wall);

  // ── 1. DOOR FRAME ────────────────────────────────────────────
  const fMat = matFrame();

  // Left jamb (handle side)
  const jambL = new THREE.Mesh(box(FW, DH, FD), fMat);
  jambL.position.set(-DW / 2 - FW / 2, -FW / 2, 0);
  jambL.castShadow = true;
  scene.add(jambL);

  // Right jamb (hinge side)
  const jambR = new THREE.Mesh(box(FW, DH, FD), fMat);
  jambR.position.set(DW / 2 + FW / 2, -FW / 2, 0);
  jambR.castShadow = true;
  scene.add(jambR);

  // Top header
  const header = new THREE.Mesh(box(DW + FW * 2, FW, FD), fMat);
  header.position.set(0, DH / 2 + FW / 2, 0);
  header.castShadow = true;
  scene.add(header);

  // Bottom threshold
  const threshold = new THREE.Mesh(box(DW + FW * 2, FW * 0.4, FD * 0.6), fMat);
  threshold.position.set(0, -DH / 2 - FW * 0.2, 0);
  scene.add(threshold);

  // Door stop bead (left jamb, rubber)
  const stopBead = new THREE.Mesh(box(1.2, DH, DT * 0.4), matRubber());
  stopBead.position.set(-DW / 2 - 0.4, -FW / 2, DT * 0.15);
  scene.add(stopBead);

  // ── 2. DOOR LEAF ──────────────────────────────────────────────
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-DW / 2, -DH / 2);
  doorShape.lineTo( DW / 2, -DH / 2);
  doorShape.lineTo( DW / 2,  DH / 2);
  doorShape.lineTo(-DW / 2,  DH / 2);
  doorShape.closePath();

  const glassHole = new THREE.Path();
  glassHole.moveTo(GX - GW / 2, gYCenter - GH / 2);
  glassHole.lineTo(GX + GW / 2, gYCenter - GH / 2);
  glassHole.lineTo(GX + GW / 2, gYCenter + GH / 2);
  glassHole.lineTo(GX - GW / 2, gYCenter + GH / 2);
  glassHole.closePath();
  doorShape.holes.push(glassHole);

  const doorGeo = new THREE.ExtrudeGeometry(doorShape, {
    depth: DT,
    bevelEnabled: false,
  });
  doorGeo.translate(0, 0, -DT / 2);

  const doorMesh = new THREE.Mesh(doorGeo, matDoorWhite());
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  scene.add(doorMesh);

  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x8aa0b0, opacity: 0.12, transparent: true }),
  );
  scene.add(doorEdges);

  // ── 2a. Pb lead edge stripe (top edge — lining visible) ──────
  const pbEdge = new THREE.Mesh(box(DW - 3, 2.8, DT * 0.9), matLead());
  pbEdge.position.set(0, DH / 2 - 1.4, 0);
  scene.add(pbEdge);

  // ── 2b. EPDM perimeter gasket ────────────────────────────────
  const ES = 1.4;
  const epdmMat = matRubber();
  const epdmItems: [THREE.BoxGeometry, [number, number, number]][] = [
    [box(DW - ES * 2, ES, DT + 2), [0,        DH / 2,  0]],
    [box(DW - ES * 2, ES, DT + 2), [0,       -DH / 2,  0]],
    [box(ES, DH,       DT + 2),    [-DW / 2,  0,        0]],
    [box(ES, DH,       DT + 2),    [ DW / 2,  0,        0]],
  ];
  epdmItems.forEach(([g, p]) => {
    const m = new THREE.Mesh(g, epdmMat);
    m.position.set(...p);
    scene.add(m);
  });

  // ── 3. LEAD GLASS WINDOW (portrait) ──────────────────────────
  const glassMesh = new THREE.Mesh(box(GW, GH, 0.6), matLeadGlass());
  glassMesh.position.set(GX, gYCenter, 0.1);
  scene.add(glassMesh);

  // SS glass frame border
  const gfT = 1.0;
  const gfMat = matSS(0.10, 0.90);
  [
    { pos: [GX,             gYCenter + GH / 2 + gfT / 2, 0] as [number,number,number], size: [GW + gfT * 2, gfT, DT * 0.5] as [number,number,number] },
    { pos: [GX,             gYCenter - GH / 2 - gfT / 2, 0] as [number,number,number], size: [GW + gfT * 2, gfT, DT * 0.5] as [number,number,number] },
    { pos: [GX - GW / 2 - gfT / 2, gYCenter, 0]           as [number,number,number], size: [gfT, GH, DT * 0.5]           as [number,number,number] },
    { pos: [GX + GW / 2 + gfT / 2, gYCenter, 0]           as [number,number,number], size: [gfT, GH, DT * 0.5]           as [number,number,number] },
  ].forEach(({ pos, size }) => {
    const m = new THREE.Mesh(box(...size), gfMat);
    m.position.set(...pos);
    scene.add(m);
  });

  // ── 4. SS KICK PLATE (prominent lower strip) ──────────────────
  const kickMat = matSS(0.08, 0.95);
  const kickPlate = new THREE.Mesh(box(KPW, KPH, 1.5), kickMat);
  kickPlate.position.set(0, kickYCenter, DT / 2 + 0.5);
  kickPlate.castShadow = true;
  scene.add(kickPlate);

  const kickEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(box(KPW, KPH, 1.5)),
    new THREE.LineBasicMaterial({ color: 0x5580a0, opacity: 0.25, transparent: true }),
  );
  kickEdges.position.copy(kickPlate.position);
  scene.add(kickEdges);

  // 4 fixing screws on kick plate
  const screwMat = matSS(0.20, 0.80);
  const screwGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10);
  [-KPW / 2 + 4, -KPW / 2 + 14, KPW / 2 - 14, KPW / 2 - 4].forEach((sx) => {
    [kickYCenter + 5, kickYCenter - 5].forEach((sy) => {
      const screw = new THREE.Mesh(screwGeo, screwMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sx, sy, DT / 2 + 1.7);
      scene.add(screw);
    });
  });

  // ── 5. HANDLE — lever on LEFT side (opposite hinges) ─────────
  const lvMat = matSS(0.10, 0.93);
  const handleX = -DW / 2 + 12;
  const handleY = -10;

  // Rose plate (escutcheon)
  const rose = new THREE.Mesh(box(3.5, 16, 1.0), matSS(0.15, 0.85));
  rose.position.set(handleX, handleY, DT / 2 + 0.7);
  scene.add(rose);

  // Lever bar — horizontal
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 14, 16), lvMat);
  lever.rotation.z = Math.PI / 2;
  lever.position.set(handleX + 5, handleY, DT / 2 + 4);
  scene.add(lever);

  // Lever knob end
  const lvKnob = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), lvMat);
  lvKnob.position.set(handleX + 12, handleY, DT / 2 + 4);
  scene.add(lvKnob);

  // Cylinder lock
  const cylLock = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 1.2, 16), matSS(0.18, 0.80));
  cylLock.rotation.x = Math.PI / 2;
  cylLock.position.set(handleX, handleY - 9, DT / 2 + 0.6);
  scene.add(cylLock);

  // Mortise body on left door edge
  const mortise = new THREE.Mesh(box(2.2, 20, DT), matSS(0.22, 0.78));
  mortise.position.set(-DW / 2, handleY, 0);
  scene.add(mortise);

  // Latch bolt
  const latchBolt = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.5, 10), matSS(0.12, 0.90));
  latchBolt.rotation.z = Math.PI / 2;
  latchBolt.position.set(-DW / 2 - 1.8, handleY, 0);
  scene.add(latchBolt);

  // ── 6. HINGES — 3× on RIGHT side ────────────────────────────
  const hMat = matSS(0.12, 0.88);
  [DH / 2 - 20, 0, -DH / 2 + 20].forEach((hy) => {
    const hDoor = new THREE.Mesh(box(2.2, 12, DT * 0.65), hMat);
    hDoor.position.set(DW / 2, hy, 0);
    scene.add(hDoor);

    const hFrame = new THREE.Mesh(box(FW * 0.7, 12, FD * 0.6), hMat);
    hFrame.position.set(DW / 2 + FW * 0.5, hy, 0);
    scene.add(hFrame);

    const pin = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 13, 12), hMat);
    pin.position.set(DW / 2 + 0.1, hy, 0);
    scene.add(pin);

    const scrGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
    [-3.5, 3.5].forEach((dy) => {
      const sc = new THREE.Mesh(scrGeo, hMat);
      sc.rotation.x = Math.PI / 2;
      sc.position.set(DW / 2 + 0.1, hy + dy, DT * 0.3);
      scene.add(sc);
    });
  });

  // ── 7. AUTOMATIC DOOR CLOSER ────────────────────────────────
  // Header (from section 1): box(DW+FW*2, FW, FD) at (0, DH/2+FW/2, 0)
  const HDR_CY = DH / 2 + FW / 2;   // 108.5
  const HDR_FZ = FD / 2;             //   6.4  front face Z
  const DR_TOP = DH / 2;             // 105.0  door top Y
  const DR_FZ  = DT / 2;             //   2.4  door front Z

  const mSilver = new THREE.MeshStandardMaterial({ color: 0xb0bcc8, roughness: 0.78, metalness: 0.18, envMapIntensity: 0.20 });
  const mDark   = new THREE.MeshStandardMaterial({ color: 0x606870, roughness: 0.85, metalness: 0.10, envMapIntensity: 0.12 });
  const mKnk    = new THREE.MeshStandardMaterial({ color: 0xc8d0d8, roughness: 0.72, metalness: 0.16 });

  // 7A  HOUSING — sits on header front face, same height as header
  //   centerY = HDR_CY  →  top/bot coincide with header top/bot  (gap = 0)
  //   backZ   = HDR_FZ  →  flush against header front face        (gap = 0)
  const HH = FW;            // 7.0  = header height exactly
  const HW = DW * 0.55;    // 49.5
  const HD = 4.0;           // 40 mm depth
  const hCX = DW * 0.08;   // 7.2  hinge-side offset
  const hCY = HDR_CY;       // ← directly from header center
  const hCZ = HDR_FZ + HD / 2;

  const closerY = hCY;

  const housingMesh = new THREE.Mesh(box(HW, HH, HD), mSilver);
  housingMesh.position.set(hCX, hCY, hCZ);
  housingMesh.castShadow = true;
  scene.add(housingMesh);
  [-1, 1].forEach(s => {
    const cap = new THREE.Mesh(box(1.0, HH, HD), mDark);
    cap.position.set(hCX + s * (HW / 2 + 0.5), hCY, hCZ);
    scene.add(cap);
  });

  // 7B  RAIL — thin strip, sits flush UNDER the housing (top of rail = bottom of housing)
  //   top Y = HDR_CY - HH/2 = HDR_BOT  →  attached to housing bottom, no float
  //   backZ = HDR_FZ  →  same plane as housing
  const RH = 1.2, RW = DW * 0.88, RD = HD - 1.0;
  const rTopY = hCY - HH / 2;         // = HDR_BOT = 105.0  — touching housing
  const rCY   = rTopY - RH / 2;       // rail center Y
  const rCZ   = HDR_FZ + RD / 2;

  const railMesh = new THREE.Mesh(box(RW, RH, RD), mSilver);
  railMesh.position.set(0, rCY, rCZ);
  scene.add(railMesh);

  // 7C  SLIDE BLOCK — wraps the rail, same centerY/Z as rail
  const CBW = 5.5, CBH = RH + 2.5, CBD = RD + 1.5;
  const cCX = hCX, cCY = rCY, cCZ = rCZ;
  const blockMesh = new THREE.Mesh(box(CBW, CBH, CBD), mSilver);
  blockMesh.position.set(cCX, cCY, cCZ);
  scene.add(blockMesh);

  // 7D  BRACKET — on door top front edge, X offset from block so arm is diagonal
  //   bottomY = DR_TOP  (rests on door top, gap = 0)
  //   backZ   = DR_FZ   (against door front face, gap = 0)
  const BH = 2.5, BW = 8.0, BD2 = 3.5;
  const bCX = cCX - 20.0;
  const bCY = DR_TOP + BH / 2;
  const bCZ = DR_FZ + BD2 / 2;
  const bracketMesh = new THREE.Mesh(box(BW, BH, BD2), mSilver);
  bracketMesh.position.set(bCX, bCY, bCZ);
  bracketMesh.castShadow = true;
  scene.add(bracketMesh);
  const flangeMesh = new THREE.Mesh(box(BW + 1.0, 0.6, BD2 + 0.8), mDark);
  flangeMesh.position.set(bCX, DR_TOP + BH + 0.3, bCZ);
  scene.add(flangeMesh);

  // 7E  ARM  — block bottom-front  →  bracket flange top
  //   armTopZ = rCZ + CBD/2  (block front face — well in front of header ✓)
  //   armBotZ = bCZ          (in front of door ✓)
  const armPiv = new THREE.Vector3(cCX, cCY - CBH / 2, cCZ + CBD / 2);
  const armEnd = new THREE.Vector3(bCX, DR_TOP + BH + 0.3, bCZ);

  const armMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(armPiv, armEnd), 1, 1.2, 10, false), mSilver);
  scene.add(armMesh);

  [{ pos: armPiv, r: 1.8 }, { pos: armEnd, r: 1.5 }].forEach(({ pos, r }) => {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3.0, 14), mKnk);
    k.rotation.x = Math.PI / 2;
    k.position.copy(pos);
    scene.add(k);
  });

  const bracketX_a = bCX;
  const armMidY    = (armPiv.y + armEnd.y) / 2;

  // ── 8. ANNOTATIONS ───────────────────────────────────────────
  const annotTop    = DH / 2 + FW + HH + 6;
  const annotBottom = -DH / 2 - FW - 4;

  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3(0, closerY + HH * 0.4, 0),              label: 'Automatic Door Closer' },
      { anchor: new THREE.Vector3(bracketX_a, armMidY, 0),                 label: 'Arm + Bracket Closer' },
      { anchor: new THREE.Vector3(GX + GW / 2, gYCenter, 0),               label: 'View Glass Timbal (Pb)' },
      { anchor: new THREE.Vector3(DW / 6, DH / 2 - 1.4, 0),               label: 'Lapis Timbal Pb (Lead Lining)' },
      { anchor: new THREE.Vector3(handleX + 6, handleY, DT / 2 + 4),       label: 'Handle Lever SS' },
      { anchor: new THREE.Vector3(-DW / 2, handleY, 0),                    label: 'Mortise X-Ray Special (LBA)' },
      { anchor: new THREE.Vector3(0, kickYCenter, DT / 2 + 1.2),           label: 'Kick Plate Stainless Steel' },
      { anchor: new THREE.Vector3(DW / 2, 0, 0),                           label: 'Engsel Heavy Duty (3×)' },
      { anchor: new THREE.Vector3(-DW / 2 - FW / 2, DH / 4, 0),           label: 'Kusen Steel Plate 1.5–2 mm' },
    ],
    DW / 2 + 58,
    [annotBottom, annotTop],
  );
}

// ─── React component ──────────────────────────────────────────

export function PbLeadDoorAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 60,
      maxDistance: 900,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      const p = product.cameraPresets[0];
      applyCameraPreset(refs, p.position, p.target);
    },
    deps: [product],
  });

  const goTo = (p: CameraPreset) => {
    if (refsRef.current) applyCameraPreset(refsRef.current, p.position, p.target);
    setActivePreset(p.name);
  };
  const dl = (name: string) =>
    refsRef.current && downloadPNG(
      refsRef.current.renderer,
      `${product.id}-assembled-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
    );
  const dlAll = () =>
    product.cameraPresets.forEach((p, i) =>
      setTimeout(() => { goTo(p); setTimeout(() => dl(p.name), 220); }, i * 520),
    );

  return (
    <div className="w-full h-full flex flex-col">
      <ViewerControls
        presets={product.cameraPresets}
        activePreset={activePreset}
        onPreset={goTo}
        onDownload={dl}
        onDownloadAll={dlAll}
      />
      <div className="flex-1 min-h-0">
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  );
}
