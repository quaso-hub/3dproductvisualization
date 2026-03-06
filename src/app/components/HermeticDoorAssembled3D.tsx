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

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset, downloadPNG, createAnnotationFull,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ─── Dimensi pintu (scene units, 1 unit = 10mm) ──────────────
const DW  = 160;  // lebar pintu
const DH  = 210;  // tinggi pintu
const DT  = 10;   // tebal panel pintu
const DOOR_OFFSET = -40;  // Offset ke kiri untuk simulasi sliding door

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
const HY  = DH + 2;

// Frame
const FT  = 8;

// Wall context
const WALL_DEPTH = 50;
const WALL_WIDTH = DW + FT * 4;
const WALL_HEIGHT = DH + FT * 2;

// ─── Materials ───────────────────────────────────────────────

function matSS(roughness = 0.08, metalness = 0.92) {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dde6,
    roughness,
    metalness,
    envMapIntensity: 1.5,
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
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(half, DH);
  shape.lineTo(-half, DH);
  shape.closePath();

  const hole = new THREE.Path();
  const wx1 = WX - WW / 2;
  const wx2 = WX + WW / 2;
  const wy1 = WY;
  const wy2 = WY + WH;
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
  wallMesh.position.set(0, WALL_HEIGHT / 2 - FT, -WALL_DEPTH);
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);

  // ── 1. Door frame (kusen) ────────────────────────────────
  const frameMat = matFrame();

  // Bottom sill
  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(DW + FT * 2, FT, DT + 4),
    frameMat,
  );
  sill.position.set(0, -FT / 2, 0);
  sill.castShadow = true;
  scene.add(sill);

  // Left jamb
  const jambL = new THREE.Mesh(
    new THREE.BoxGeometry(FT, DH + FT, DT + 4),
    frameMat,
  );
  jambL.position.set(-DW / 2 - FT / 2, DH / 2 - FT / 2, 0);
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
  head.position.set(0, DH + FT / 2, 0);
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

  // ── 3. Lead Glass in window cutout ───────────────────────
  const glassGeo = new THREE.BoxGeometry(WW, WH, WT);
  const glassMesh = new THREE.Mesh(glassGeo, matGlass());
  glassMesh.position.set(DOOR_OFFSET + WX, WY + WH / 2, 0);
  scene.add(glassMesh);

  // Glass frame (thin SS border around window)
  const gfT = 1.2;
  const glassFrMat = matSS(0.15);
  [
    { pos: [DOOR_OFFSET + WX, WY + WH + gfT / 2, 0], size: [WW + gfT * 2, gfT, DT * 0.4] },
    { pos: [DOOR_OFFSET + WX, WY - gfT / 2, 0], size: [WW + gfT * 2, gfT, DT * 0.4] },
    { pos: [DOOR_OFFSET + WX - WW / 2 - gfT / 2, WY + WH / 2, 0], size: [gfT, WH, DT * 0.4] },
    { pos: [DOOR_OFFSET + WX + WW / 2 + gfT / 2, WY + WH / 2, 0], size: [gfT, WH, DT * 0.4] },
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
  pbStripe.position.set(DOOR_OFFSET, DH - 1.25, 0);
  scene.add(pbStripe);

  // ── 5. Horizontal D-handle (right side) ──────────────────
  const handleMat = matSS(0.1, 0.94);
  const handleGeo = new THREE.CylinderGeometry(0.8, 0.8, 18, 12);
  const handleBar = new THREE.Mesh(handleGeo, handleMat);
  handleBar.rotation.z = Math.PI / 2;
  handleBar.position.set(DOOR_OFFSET + DW / 2 - 10, DH / 2 + 3, DT / 2 + 3);
  scene.add(handleBar);

  // Handle brackets
  const bracketGeo = new THREE.CylinderGeometry(1.2, 1.2, 6, 12);
  [-19, -1].forEach((offset) => {
    const bracket = new THREE.Mesh(bracketGeo, handleMat);
    bracket.rotation.x = Math.PI / 2;
    bracket.position.set(DOOR_OFFSET + DW / 2 + offset, DH / 2 + 3, DT / 2 + 1);
    scene.add(bracket);
  });

  // ── 6. Overhead housing ───────────────────────────────────
  const housingMat = matHousing();
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(HW, HH, HDT),
    housingMat,
  );
  housing.position.set(0, HY + HH / 2, -(HDT - DT) / 2);
  housing.castShadow = true;
  scene.add(housing);

  // Housing edge definition
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(HW, HH, HDT)),
    new THREE.LineBasicMaterial({ color: 0x1a2332, opacity: 0.1, transparent: true }),
  )).position.copy(housing.position);

  // Housing motor detail (3 horizontal rib lines)
  const ribMat = new THREE.LineBasicMaterial({ color: 0x3a4350, opacity: 0.6, transparent: true, linewidth: 2 });
  [HY + HH * 0.75, HY + HH * 0.5, HY + HH * 0.25].forEach((ribY) => {
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
  indicator.position.set(0, HY + HH * 0.88, -(HDT - DT) / 2 + HDT / 2 + 0.1);
  scene.add(indicator);

  // ── 7. Sensor boxes (left/right of frame) ────────────────
  const sensorGeo = new THREE.BoxGeometry(4, 8, 3);
  const sensorMat = matSensor();
  [-14, 14].forEach((xPos) => {
    const sensor = new THREE.Mesh(sensorGeo, sensorMat);
    sensor.position.set(xPos, DH / 2, -12);
    scene.add(sensor);
  });

  // ── 8. Sliding track inside housing ──────────────────────
  const trackGeo = new THREE.BoxGeometry(HW - 10, 3, 3);
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x404850,
    roughness: 0.15,
    metalness: 0.9,
  });
  const track = new THREE.Mesh(trackGeo, trackMat);
  track.position.set(0, HY + HH * 0.3, -(HDT - DT) / 2 - 2);
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
    roller.position.set(xOff, HY + HH * 0.3, -(HDT - DT) / 2 - 2);
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
  const sensorY = HY + HH * 0.55;

  const sGreen = new THREE.Mesh(sensorGeoGreen, matGreen);
  sGreen.position.set(-HW / 2 + 10, sensorY, sensorFaceZ);
  scene.add(sGreen);

  const sAmber = new THREE.Mesh(sensorGeoAmber, matAmber);
  sAmber.position.set(-HW / 2 + 18, sensorY, sensorFaceZ);
  scene.add(sAmber);

  // ── 10. Annotations (split left/right) ────────────────────
  const zA = 0;
  const xR = DW / 2 + 75;
  const YsR = [DH + 55, DH + 25, DH - 10, WY + WH / 2 + 20];

  createAnnotationFull(scene,
    new THREE.Vector3(0, HY + HH / 2, zA),
    new THREE.Vector3(xR, YsR[0], zA),
    'Electric Motor Housing',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(0, HY + HH * 0.3, zA),
    new THREE.Vector3(xR, YsR[1], zA),
    'Sliding Track Rail',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(-HW / 2 + 14, sensorY, zA),
    new THREE.Vector3(xR, YsR[2], zA),
    'Sensor Indicator',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(DOOR_OFFSET + WX + WW / 2, WY + WH / 2, zA),
    new THREE.Vector3(xR, YsR[3], zA),
    'Lead Glass Pb 5mm',
  );

  const xL = -DW / 2 - 75;
  const YsL = [DH * 0.75, DH * 0.50, DH * 0.25];

  createAnnotationFull(scene,
    new THREE.Vector3(DOOR_OFFSET - DW / 2, DH * 0.5, zA),
    new THREE.Vector3(xL, YsL[0], zA),
    'Stainless Steel',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(DOOR_OFFSET, DH - 1.25, zA),
    new THREE.Vector3(xL, YsL[1], zA),
    'Lapis Pb 2mm',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(DOOR_OFFSET + DW / 2 - 10, DH / 2 + 3, zA),
    new THREE.Vector3(xL, YsL[2], zA),
    'Handle SS',
  );
}

// ─── React component ─────────────────────────────────────────

export function HermeticDoorAssembled3D({ product }: Props) {
  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 80,
      maxDistance: 900,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      const p = product.cameraPresets[0];  // Isometric: sets both camera.position + controls.target
      applyCameraPreset(refs, p.position, p.target);
    },
    deps: [product],
  });

  const goTo  = (p: CameraPreset) => refsRef.current && applyCameraPreset(refsRef.current, p.position, p.target);
  const dl    = (name: string)    => refsRef.current && downloadPNG(refsRef.current.renderer, `${product.id}-assembled-${name.toLowerCase().replace(/\s+/g, '-')}.png`);
  const dlAll = () => product.cameraPresets.forEach((p, i) =>
    setTimeout(() => { goTo(p); setTimeout(() => dl(p.name), 220); }, i * 520));

  return (
    <div className="w-full h-full flex flex-col">
      <ViewerControls presets={product.cameraPresets} onPreset={goTo} onDownload={dl} onDownloadAll={dlAll} />
      <div className="flex-1 min-h-0">
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  );
}
