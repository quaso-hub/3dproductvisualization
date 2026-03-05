/**
 * HermeticDoorAssembled3D.tsx — ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * Hermetic Auto Sliding Door dalam posisi terpasang.
 *
 * Koordinat sistem (world space):
 *   • Pintu dipusat di X=0, Y=105 (setengah tinggi 210)
 *   • Bagian bawah pintu di Y=0, atas di Y=210
 *   • Housing overhead di atas pintu: Y=210 ke Y=232
 *   • Ketebalan ke arah ±Z, dipusat di Z=0
 *
 * Komponen yang dirender:
 *   1. Frame dinding (alur pintu + kusen)
 *   2. Panel pintu utama (dengan lubang jendela)
 *   3. Kaca Lead Glass di lubang jendela
 *   4. Housing overhead (casing motor)
 *   5. Track rail di dalam housing
 *   6. Sensor indicator lights
 *   7. Handle pintu (kanan)
 *   8. Anotasi elbow-leader
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
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
const DT  = 10;   // tebal panel pintu (visual, actual ~94mm)

// Window dalam pintu
const WW  = 30;   // lebar jendela
const WH  = 40;   // tinggi jendela
const WX  = 0;    // center X jendela
const WY  = 150;  // Y bawah jendela (dari bottom of door)
const WT  = 0.6;  // tebal kaca

// Housing overhead
const HW  = DW + 40;  // lebar housing (lebih lebar dari pintu)
const HH  = 22;       // tinggi housing
const HDT = 16;       // kedalaman housing (Z)
const HY  = DH + 2;   // Y bawah housing

// Frame
const FT  = 6;    // tebal frame (scene units)

// ─── Materials ───────────────────────────────────────────────

function matSS(roughness = 0.15) {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4dc,
    roughness,
    metalness: 0.85,
    envMapIntensity: 1.2,
  });
}

function matHousing() {
  return new THREE.MeshStandardMaterial({
    color: 0xa8b8c4,
    roughness: 0.25,
    metalness: 0.75,
  });
}

function matGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0x88c4d8,
    roughness: 0.04,
    metalness: 0.0,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
}

function matLead() {
  return new THREE.MeshStandardMaterial({
    color: 0x8a9198,
    roughness: 0.4,
    metalness: 0.7,
  });
}

function matFrame() {
  return new THREE.MeshStandardMaterial({
    color: 0x606870,
    roughness: 0.3,
    metalness: 0.65,
  });
}

function matTrack() {
  return new THREE.MeshStandardMaterial({
    color: 0x505860,
    roughness: 0.2,
    metalness: 0.85,
  });
}

// ─── Door panel shape (dengan lubang jendela) ────────────────

function buildDoorShape(): THREE.Shape {
  const half = DW / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo( half, 0);
  shape.lineTo( half, DH);
  shape.lineTo(-half, DH);
  shape.closePath();

  // Window hole
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

function buildScene(scene: THREE.Scene) {

  // ── 1. Door frame (kusen) ──────────────────────────────────
  // Bottom sill
  const frameMat = matFrame();
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

  // ── 2. Door panel with window cutout ──────────────────────
  const doorGeo = new THREE.ExtrudeGeometry(buildDoorShape(), {
    depth: DT,
    bevelEnabled: false,
  });
  doorGeo.translate(0, 0, -DT / 2);

  const doorMesh = new THREE.Mesh(doorGeo, matSS());
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  scene.add(doorMesh);

  // Subtle edges
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x182838, opacity: 0.15, transparent: true }),
  ));

  // ── 3. Lead Glass in window cutout ───────────────────────
  const glassGeo = new THREE.BoxGeometry(WW, WH, WT);
  const glassMesh = new THREE.Mesh(glassGeo, matGlass());
  glassMesh.position.set(WX, WY + WH / 2, 0);
  scene.add(glassMesh);

  // Glass frame (thin SS border around window)
  const gfT = 1.2; // glass frame thickness
  const glassFrMat = matSS(0.2);
  // top bar
  const gfTop = new THREE.Mesh(new THREE.BoxGeometry(WW + gfT * 2, gfT, DT * 0.4), glassFrMat);
  gfTop.position.set(WX, WY + WH + gfT / 2, 0);
  scene.add(gfTop);
  // bottom bar
  const gfBot = gfTop.clone();
  gfBot.position.y = WY - gfT / 2;
  scene.add(gfBot);
  // left bar
  const gfLeft = new THREE.Mesh(new THREE.BoxGeometry(gfT, WH, DT * 0.4), glassFrMat);
  gfLeft.position.set(WX - WW / 2 - gfT / 2, WY + WH / 2, 0);
  scene.add(gfLeft);
  // right bar
  const gfRight = gfLeft.clone();
  gfRight.position.x = WX + WW / 2 + gfT / 2;
  scene.add(gfRight);

  // ── 4. Pb lead strip visible at door edge (cross-section hint) ─
  // Small lead stripe visible at the right side of door cross section
  const pbStripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, DH * 0.6, 2),
    matLead(),
  );
  pbStripe.position.set(DW / 2 - 0.75, DH / 2, 0);
  scene.add(pbStripe);

  // ── 5. Handle (right side) ────────────────────────────────
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0xe0e8ec,
    roughness: 0.1,
    metalness: 0.92,
  });

  // Vertical bar
  const barGeo = new THREE.CylinderGeometry(1.2, 1.2, 24, 16);
  const bar = new THREE.Mesh(barGeo, handleMat);
  bar.position.set(DW / 2 - 8, DH / 2, DT / 2 + 4);
  scene.add(bar);

  // Top bracket
  const bktGeo = new THREE.CylinderGeometry(1.0, 1.0, 8, 12);
  const bktTop = new THREE.Mesh(bktGeo, handleMat);
  bktTop.rotation.x = Math.PI / 2;
  bktTop.position.set(DW / 2 - 8, DH / 2 + 10, DT / 2 + 0.5);
  scene.add(bktTop);

  const bktBot = bktTop.clone();
  bktBot.position.y = DH / 2 - 10;
  scene.add(bktBot);

  // ── 6. Overhead housing ───────────────────────────────────
  const housingMat = matHousing();
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(HW, HH, HDT),
    housingMat,
  );
  housing.position.set(0, HY + HH / 2, -(HDT - DT) / 2);
  housing.castShadow = true;
  scene.add(housing);

  // Housing bottom face line (definition)
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(HW, HH, HDT)),
    new THREE.LineBasicMaterial({ color: 0x182838, opacity: 0.12, transparent: true }),
  )).position.copy(housing.position);

  // ── 7. Sliding track inside housing ──────────────────────
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(HW - 10, 3, 3),
    matTrack(),
  );
  track.position.set(0, HY + HH * 0.3, -(HDT - DT) / 2 - 2);
  scene.add(track);

  // Track wheels (rollers)
  const rollerGeo = new THREE.CylinderGeometry(2, 2, 3, 16);
  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x303840, roughness: 0.1, metalness: 0.9 });
  [-30, 0, 30].forEach((xOff) => {
    const roller = new THREE.Mesh(rollerGeo, rollerMat);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(xOff, HY + HH * 0.3, -(HDT - DT) / 2 - 2);
    scene.add(roller);
  });

  // ── 8. Sensor lights on housing front face ────────────────
  const sensorGeoGreen = new THREE.SphereGeometry(1.6, 12, 8);
  const sensorGeoAmber = new THREE.SphereGeometry(1.6, 12, 8);
  const matGreen = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2, metalness: 0.1, emissive: 0x16a34a, emissiveIntensity: 0.6 });
  const matAmber = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.1, emissive: 0xd97706, emissiveIntensity: 0.5 });

  const sensorFaceZ = -(HDT - DT) / 2 + HDT / 2 + 0.1;
  const sensorY    = HY + HH * 0.68;

  // Green indicator (open/ready)
  const sGreen = new THREE.Mesh(sensorGeoGreen, matGreen);
  sGreen.position.set(-HW / 2 + 12, sensorY, sensorFaceZ);
  scene.add(sGreen);

  // Amber indicator
  const sAmber = new THREE.Mesh(sensorGeoAmber, matAmber);
  sAmber.position.set(-HW / 2 + 20, sensorY, sensorFaceZ);
  scene.add(sAmber);

  // Red (off) indicator
  const matRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.1 });
  const sRed = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), matRed);
  sRed.position.set(-HW / 2 + 28, sensorY, sensorFaceZ);
  scene.add(sRed);

  // ── 9. Annotations ────────────────────────────────────────
  // All labels on right side (+X), elbow to the right
  const zA  = 0;          // front face slice
  const xL  = DW / 2 + 70; // label X position

  const Ys = [DH + 40, DH + 20, DH, DH - 20, DH - 40, DH - 70, DH - 100];

  createAnnotationFull(scene,
    new THREE.Vector3(0, HY + HH / 2, zA),
    new THREE.Vector3(xL, Ys[0], zA),
    'Electric Motor Housing',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(0, HY + HH * 0.3, zA),
    new THREE.Vector3(xL, Ys[1], zA),
    'Sliding Track Rail',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(-HW / 2 + 20, sensorY, zA),
    new THREE.Vector3(xL, Ys[2], zA),
    'Sensor Indicator',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(DW / 2, DH * 0.75, zA),
    new THREE.Vector3(xL, Ys[3], zA),
    'Stainless Steel',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(WX + WW / 2, WY + WH / 2, zA),
    new THREE.Vector3(xL, Ys[4], zA),
    'Lead Glass Pb 5mm',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(DW / 2 - 0.75, DH / 2, zA),
    new THREE.Vector3(xL, Ys[5], zA),
    'Lapis Pb 2mm',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(DW / 2 - 8, DH / 2, zA),
    new THREE.Vector3(xL, Ys[6], zA),
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
      buildScene(refs.scene);
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
