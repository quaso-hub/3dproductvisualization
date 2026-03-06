/**
 * HermeticDoorAssembled3D.tsx — ASSEMBLED VIEW (Production Quality)
 * ─────────────────────────────────────────────────────────────
 * Hermetic Auto Sliding Door in realistic closed position.
 * Features:
 * - RoomEnvironment for realistic PBR reflections
 * - Brushed stainless steel with proper metalness/roughness
 * - Door slightly offset to show sliding mechanism
 * - Professional medical/cleanroom aesthetic
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset, downloadPNG, createLabel, createAnnotationDot, createAnnotationLine,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ─── Dimensi pintu (scene units, 1 unit = 10mm) ──────────────
const DW  = 160;  // lebar pintu
const DH  = 210;  // tinggi pintu
const DT  = 10;   // tebal panel pintu
const DOOR_OFFSET = 0;    // Pintu dalam posisi tertutup (closed)

// Window dalam pintu
const WW  = 30;
const WH  = 40;
const WX  = 0;
const WY  = 150;
const WT  = 0.6;

// Housing overhead
const HW  = DW + 50;
const HH  = 22;
const HDT = 16;

// Frame
const FT  = 8;

// Wall context
const WALL_DEPTH = 50;
const WALL_WIDTH = DW + FT * 4;
const WALL_HEIGHT = DH + FT * 2;

// ─── Materials ───────────────────────────────────────────────

function matSS(roughness = 0.22, metalness = 0.80) {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dde6,
    roughness,
    metalness,
    envMapIntensity: 0.75,
  });
}

function matWall() {
  return new THREE.MeshStandardMaterial({
    color: 0xd8dfe6,
    roughness: 0.9,
    metalness: 0.0,
  });
}

function matHousing() {
  return new THREE.MeshStandardMaterial({
    color: 0xb5c4d0,
    roughness: 0.25,
    metalness: 0.75,
  });
}

function matGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0x9ed4e8,
    roughness: 0.03,
    metalness: 0.0,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
}

function matLead() {
  return new THREE.MeshStandardMaterial({
    color: 0x7a7f85,
    roughness: 0.35,
    metalness: 0.75,
  });
}

function matFrame() {
  return new THREE.MeshStandardMaterial({
    color: 0x505860,
    roughness: 0.28,
    metalness: 0.72,
  });
}

function matSensor() {
  return new THREE.MeshStandardMaterial({
    color: 0x4a5568,
    roughness: 0.4,
    metalness: 0.6,
  });
}

// ─── Door panel shape (dengan lubang jendela) ────────────────

function buildDoorShape(): THREE.Shape {
  const half = DW / 2;
  const hh   = DH / 2;   // centred: y from -hh to +hh
  const shape = new THREE.Shape();
  shape.moveTo(-half, -hh);
  shape.lineTo(half, -hh);
  shape.lineTo(half, hh);
  shape.lineTo(-half, hh);
  shape.closePath();

  const hole = new THREE.Path();
  const wx1 = WX - WW / 2;
  const wx2 = WX + WW / 2;
  const wy1 = WY - DH / 2;          // shift window Y to centred space
  const wy2 = wy1 + WH;
  hole.moveTo(wx1, wy1);
  hole.lineTo(wx2, wy1);
  hole.lineTo(wx2, wy2);
  hole.lineTo(wx1, wy2);
  hole.closePath();
  shape.holes.push(hole);

  return shape;
}

// ─── Scene builder ────────────────────────────────────────────

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {

  // ── 0a. RoomEnvironment for realistic reflections (PBR) ────
  renderer.toneMappingExposure = 0.90;  // reduce from default 1.2 — less silau
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.background = new THREE.Color(0xf5f5f5);
  pmrem.dispose();

  // ── 0b. Wall context (back plane) ───────────────────────────
  const wallMesh = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_WIDTH, WALL_HEIGHT, 2),
    matWall(),
  );
  wallMesh.position.set(0, 0, -WALL_DEPTH);
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);

  // ── 1. Door frame (kusen) ────────────────────────────────
  const frameMat = matFrame();

  // Bottom sill
  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(DW + FT * 2, FT, DT + 4),
    frameMat,
  );
  sill.position.set(0, -DH / 2 - FT / 2, 0);
  sill.castShadow = true;
  scene.add(sill);

  // Left jamb
  const jambL = new THREE.Mesh(
    new THREE.BoxGeometry(FT, DH + FT, DT + 4),
    frameMat,
  );
  jambL.position.set(-DW / 2 - FT / 2, 0, 0);
  jambL.castShadow = true;
  scene.add(jambL);

  // Right jamb
  const jambR = jambL.clone();
  jambR.position.x = DW / 2 + FT / 2;
  scene.add(jambR);

  // Head (top frame)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(DW + FT * 2, FT, DT + 4),
    frameMat,
  );
  head.position.set(0, DH / 2 + FT / 2, 0);
  head.castShadow = true;
  scene.add(head);

  // ── 2. Door panel with window cutout (OFFSET to show sliding) ──
  const doorGeo = new THREE.ExtrudeGeometry(buildDoorShape(), {
    depth: DT,
    bevelEnabled: false,
  });
  doorGeo.translate(0, 0, -DT / 2);

  const doorMesh = new THREE.Mesh(doorGeo, matSS());
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  doorMesh.position.x = DOOR_OFFSET;  // Offset left to show sliding
  scene.add(doorMesh);

  // Subtle edges
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x1a2332, opacity: 0.1, transparent: true }),
  )).position.copy(doorMesh.position);

  // ── 2b. EPDM rubber gasket strips (dark seal around door perimeter) ──
  const epdmMat = new THREE.MeshStandardMaterial({
    color: 0x282830,
    roughness: 0.85,
    metalness: 0.0,
  });
  const ES = 1.8;  // EPDM strip width
  const epdmItems: [THREE.BoxGeometry, [number, number, number]][] = [
    [new THREE.BoxGeometry(DW, ES, DT + 2), [0, DH / 2, 0]],          // top
    [new THREE.BoxGeometry(DW, ES, DT + 2), [0, -DH / 2, 0]],         // bottom
    [new THREE.BoxGeometry(ES, DH + ES * 2, DT + 2), [-DW / 2, 0, 0]], // left
    [new THREE.BoxGeometry(ES, DH + ES * 2, DT + 2), [DW / 2, 0, 0]],  // right
  ];
  epdmItems.forEach(([geo, pos]) => {
    const m = new THREE.Mesh(geo, epdmMat);
    m.position.set(...pos);
    scene.add(m);
  });

  // ── 2c. Horizontal bump guard strip (stainless, lower third) ─
  const bumpGuard = new THREE.Mesh(
    new THREE.BoxGeometry(DW - 8, 5, 2),
    matSS(0.12, 0.92),
  );
  bumpGuard.position.set(0, -DH / 4, DT / 2 + 0.5);
  scene.add(bumpGuard);

  // ── 3. Lead Glass in window cutout ───────────────────────
  const glassGeo = new THREE.BoxGeometry(WW, WH, WT);
  const glassMesh = new THREE.Mesh(glassGeo, matGlass());
  glassMesh.position.set(DOOR_OFFSET + WX, WY + WH / 2 - DH / 2, 0);
  scene.add(glassMesh);

  // Glass frame (thin SS border around window)
  const gfT = 1.2;
  const glassFrMat = matSS(0.15);
  const wyC = WY + WH / 2 - DH / 2;  // centred window Y
  [
    { pos: [DOOR_OFFSET + WX, wyC + WH / 2 + gfT / 2, 0], size: [WW + gfT * 2, gfT, DT * 0.4] },
    { pos: [DOOR_OFFSET + WX, wyC - WH / 2 - gfT / 2, 0], size: [WW + gfT * 2, gfT, DT * 0.4] },
    { pos: [DOOR_OFFSET + WX - WW / 2 - gfT / 2, wyC, 0], size: [gfT, WH, DT * 0.4] },
    { pos: [DOOR_OFFSET + WX + WW / 2 + gfT / 2, wyC, 0], size: [gfT, WH, DT * 0.4] },
  ].forEach(({ pos, size }) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), glassFrMat);
    frame.position.set(...pos as [number, number, number]);
    scene.add(frame);
  });

  // ── 4. Pb lead stripe (visible at top edge, full width) ─────
  const pbStripe = new THREE.Mesh(
    new THREE.BoxGeometry(DW - 4, 2.5, 2),
    matLead(),
  );
  pbStripe.position.set(DOOR_OFFSET, DH / 2 - 1.25, 0);
  scene.add(pbStripe);

  // ── 5. Vertical bar handle (right side, mid-height) ─────
  const handleMat = matSS(0.1, 0.94);
  const handleGeo = new THREE.CylinderGeometry(0.9, 0.9, 28, 16);
  const handleBar = new THREE.Mesh(handleGeo, handleMat);
  // No rotation — cylinder stands vertical by default
  handleBar.position.set(DW / 2 - 12, 0, DT / 2 + 3);
  scene.add(handleBar);

  // Handle wall-mount brackets (horizontal pins into door face)
  const bracketGeo = new THREE.CylinderGeometry(1.2, 1.2, 5, 12);
  [-12, 12].forEach((yOff) => {
    const bracket = new THREE.Mesh(bracketGeo, handleMat);
    bracket.rotation.x = Math.PI / 2;
    bracket.position.set(DW / 2 - 12, yOff, DT / 2 + 1);
    scene.add(bracket);
  });

  // ── 6. Overhead housing ───────────────────────────────────
  const housingMat = matHousing();
  const housingY   = DH / 2 + 2;   // just above door top (centred geometry)
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(HW, HH, HDT),
    housingMat,
  );
  housing.position.set(0, housingY + HH / 2, -(HDT - DT) / 2);
  housing.castShadow = true;
  scene.add(housing);

  // Housing edge definition
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(HW, HH, HDT)),
    new THREE.LineBasicMaterial({ color: 0x1a2332, opacity: 0.1, transparent: true }),
  )).position.copy(housing.position);

  // Housing motor detail (3 horizontal rib lines)
  const ribMat = new THREE.LineBasicMaterial({ color: 0x3a4350, opacity: 0.6, transparent: true, linewidth: 2 });
  [housingY + HH * 0.75, housingY + HH * 0.5, housingY + HH * 0.25].forEach((ribY) => {
    const ribPts = [
      new THREE.Vector3(-HW / 2 + 2, ribY, -(HDT - DT) / 2 + HDT / 2),
      new THREE.Vector3(HW / 2 - 2, ribY, -(HDT - DT) / 2 + HDT / 2),
    ];
    const ribGeo = new THREE.BufferGeometry().setFromPoints(ribPts);
    scene.add(new THREE.Line(ribGeo, ribMat));
  });

  // Housing indicator LED strip
  const indicatorGeo = new THREE.BoxGeometry(HW - 4, 2, 0.2);
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0x3a4350,
    roughness: 0.5,
    metalness: 0.4,
    emissive: 0x1a1f2e,
  });
  const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
  indicator.position.set(0, housingY + HH * 0.88, -(HDT - DT) / 2 + HDT / 2 + 0.1);
  scene.add(indicator);

  // ── 6b. Floor bottom guide rail ──────────────────────────
  const floorGuide = new THREE.Mesh(
    new THREE.BoxGeometry(DW + FT * 2, 1.5, 5),
    matSS(0.2, 0.85),
  );
  floorGuide.position.set(0, -DH / 2 - FT - 1.5, 0);
  scene.add(floorGuide);

  // ── 7. Sensor boxes (left/right of frame) ────────────────
  const sensorGeo = new THREE.BoxGeometry(4, 8, 3);
  const sensorMat = matSensor();
  [-14, 14].forEach((xPos) => {
    const sensor = new THREE.Mesh(sensorGeo, sensorMat);
    sensor.position.set(xPos, 0, -12);
    scene.add(sensor);
  });

  // ── 8. Sliding track inside housing ──────────────────────
  const trackGeo = new THREE.BoxGeometry(HW - 10, 3, 3);
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x404850,
    roughness: 0.15,
    metalness: 0.9,
  });
  const trackY = DH / 2 + 2 + HH * 0.3;
  const track = new THREE.Mesh(trackGeo, trackMat);
  track.position.set(0, trackY, -(HDT - DT) / 2 - 2);
  scene.add(track);

  // Track wheels (rollers)
  const rollerGeo = new THREE.CylinderGeometry(2, 2, 3, 16);
  const rollerMat = new THREE.MeshStandardMaterial({
    color: 0x303840,
    roughness: 0.1,
    metalness: 0.92,
  });
  [-30, 0, 30].forEach((xOff) => {
    const roller = new THREE.Mesh(rollerGeo, rollerMat);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(xOff, trackY, -(HDT - DT) / 2 - 2);
    scene.add(roller);
  });

  // ── 9. Sensor indicator lights (front face, left side) ─────
  const sensorGeoGreen = new THREE.SphereGeometry(1.4, 12, 8);
  const sensorGeoAmber = new THREE.SphereGeometry(1.4, 12, 8);
  const matGreen = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0x16a34a,
    emissiveIntensity: 0.5,
  });
  const matAmber = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
  });

  const sensorFaceZ = -(HDT - DT) / 2 + HDT / 2 + 0.1;
  const housingYRef = DH / 2 + 2;
  const sensorY     = housingYRef + HH * 0.55;

  const sGreen = new THREE.Mesh(sensorGeoGreen, matGreen);
  sGreen.position.set(-HW / 2 + 10, sensorY, sensorFaceZ);
  scene.add(sGreen);

  const sAmber = new THREE.Mesh(sensorGeoAmber, matAmber);
  sAmber.position.set(-HW / 2 + 18, sensorY, sensorFaceZ);
  scene.add(sAmber);

  // ── 10. Annotations (CSS2D) ──────────────────────────────────
  const zA  = 0;
  const hYR = DH / 2 + 2;

  const annotList = [
    { pos: new THREE.Vector3(0, hYR + HH / 2, zA),                         label: 'Electric Motor Housing' },
    { pos: new THREE.Vector3(0, trackY, zA),                                label: 'Sliding Track Rail' },
    { pos: new THREE.Vector3(-HW / 2 + 14, sensorY, zA),                   label: 'Sensor Indicator' },
    { pos: new THREE.Vector3(DOOR_OFFSET + WX + WW / 2, WY + WH / 2 - DH / 2, zA), label: 'Lead Glass Pb 5mm' },
    { pos: new THREE.Vector3(DOOR_OFFSET - DW / 2, 0, zA),                 label: 'Stainless Steel' },
    { pos: new THREE.Vector3(DOOR_OFFSET, DH / 2 - 1.25, zA),              label: 'Lapis Pb 2mm' },
    { pos: new THREE.Vector3(DW / 2 - 12, 0, zA),                          label: 'Handle SS' },
  ];

  const LABEL_X = HW / 2 + 30;  // 135 — clear of housing right edge
  annotList.forEach(({ pos, label }) => {
    const labelPos = new THREE.Vector3(LABEL_X, pos.y, pos.z);
    scene.add(createAnnotationDot(pos));
    createAnnotationLine(scene, pos, labelPos);
    createLabel(scene, labelPos, label);
  });
}

// ─── React component ─────────────────────────────────────────

export function HermeticDoorAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 80,
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
  const dl    = (name: string) => refsRef.current && downloadPNG(refsRef.current.renderer, `${product.id}-assembled-${name.toLowerCase().replace(/\s+/g, '-')}.png`);
  const dlAll = () => product.cameraPresets.forEach((p, i) =>
    setTimeout(() => { goTo(p); setTimeout(() => dl(p.name), 220); }, i * 520));

  return (
    <div className="w-full h-full flex flex-col">
      <ViewerControls presets={product.cameraPresets} activePreset={activePreset} onPreset={goTo} onDownload={dl} onDownloadAll={dlAll} />
      <div className="flex-1 min-h-0">
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  );
}
