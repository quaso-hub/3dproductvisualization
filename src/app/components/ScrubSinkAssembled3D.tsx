import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ─── Scene constants (1 scene unit = 10mm) ───────────────────────────────────
const W         = 160;  // 1600mm total width
const D         = 60;   // 600mm depth
const T_BASE    = 6;    // base trim: 60mm  (Y = 0 → 6)
const T_CAB     = 70;   // main cabinet body: 700mm (Y = 6 → 76)
const T_CT      = 4;    // countertop: 40mm (Y = 76 → 80)
const Y_CAB_TOP = 76;   // top of cabinet = bottom of countertop
const Y_CT_TOP  = 80;   // top of countertop surface
const CT_CY     = 78;   // centre Y of the 4-unit countertop slab
const BP_Z      = -29;  // back panel Z centre (flush with cabinet back)

// ─── Material factories ───────────────────────────────────────────────────────
function matSSPolished() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dce8,
    roughness: 0.08,
    metalness: 0.92,
    envMapIntensity: 1.2,
  });
}

function matSSMatte() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4dc,
    roughness: 0.30,
    metalness: 0.80,
    envMapIntensity: 0.9,
  });
}

function matMirror() {
  return new THREE.MeshStandardMaterial({
    color: 0xa8d8ea,
    roughness: 0.02,
    metalness: 0.10,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    envMapIntensity: 1.5,
  });
}

function matChrome() {
  return new THREE.MeshStandardMaterial({
    color: 0xe8f2f8,
    roughness: 0.04,
    metalness: 0.98,
    envMapIntensity: 1.8,
  });
}

function matPedal() {
  return new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.45,
    metalness: 0.30,
  });
}

function matBasinInterior() {
  return new THREE.MeshStandardMaterial({
    color: 0x8090a8,
    roughness: 0.18,
    metalness: 0.80,
    envMapIntensity: 0.9,
  });
}

function matLEDStrip() {
  return new THREE.MeshStandardMaterial({
    color: 0xb8f7ff,
    roughness: 0.20,
    metalness: 0.0,
    emissive: new THREE.Color(0x60e8ff),
    emissiveIntensity: 1.2,
  });
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────
function addBox(
  scene: THREE.Scene,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  mat: THREE.Material,
  shadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (shadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
  scene.add(mesh);
  return mesh;
}

function addCyl(
  scene: THREE.Scene,
  rTop: number, rBot: number, h: number, seg: number,
  x: number, y: number, z: number,
  mat: THREE.Material,
  rotX = 0, rotZ = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rotX;
  mesh.rotation.z = rotZ;
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

// ─── Scene builder ────────────────────────────────────────────────────────────
function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {

  // ── 0. PBR Environment ────────────────────────────────────────────────────
  renderer.toneMappingExposure = 0.85;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(120, 180, 100);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd0e8ff, 0.8);
  fill.position.set(-80, 100, -80);
  scene.add(fill);

  // ── 1. Base trim (Y = 0 → T_BASE = 6) ───────────────────────────────────
  addBox(scene, W, T_BASE, D,   0, T_BASE / 2, 0,    matSSMatte());
  addBox(scene, W, T_BASE, 1,   0, T_BASE / 2, 30.5, matSSPolished()); // front face

  // ── 2. Adjustable feet — 4 corners ──────────────────────────────────────
  const ftMat = matSSPolished();
  ([[-70, -24], [-70, 24], [70, -24], [70, 24]] as [number, number][]).forEach(([fx, fz]) => {
    addCyl(scene, 1.5, 2.0, 3, 12, fx, 1.5, fz, ftMat);
  });

  // ── 3. Foot pedals — 2×, hands-free (under each basin centre) ───────────
  const pedalMat = matPedal();
  const rodMat   = matSSMatte();
  ([-40, 40]).forEach((px) => {
    addBox(scene, 18, 2.5, 12, px, 1.25, 36, pedalMat);
    addCyl(scene, 0.8, 0.8, 10, 8, px, 2, 32.5, rodMat, Math.PI / 2);
  });

  // ── 4. Main cabinet body (Y = T_BASE → Y_CAB_TOP = 6 → 76, 700mm) ──────
  const cabMatte    = matSSMatte();
  const cabPolished = matSSPolished();
  const divMat = new THREE.MeshStandardMaterial({
    color: 0x8898a8, roughness: 0.25, metalness: 0.78,
  });

  // Structural body (back + sides)
  addBox(scene, W, T_CAB, D, 0, T_BASE + T_CAB / 2, 0, cabMatte);
  // Polished front face panel
  addBox(scene, W, T_CAB, 1, 0, T_BASE + T_CAB / 2, 30.5, cabPolished);
  // Sliding door panels — two halves, slightly proud of face panel
  addBox(scene, W / 2 - 3, T_CAB - 4, 0.8, -(W / 4 + 1), T_BASE + T_CAB / 2, 31.2, cabMatte);
  addBox(scene, W / 2 - 3, T_CAB - 4, 0.8,  (W / 4 + 1), T_BASE + T_CAB / 2, 31.2, cabMatte);
  // Centre door divider strip
  addBox(scene, 1, T_CAB, 0.8, 0, T_BASE + T_CAB / 2, 31.2, divMat);
  // Door rail at top of cabinet
  addBox(scene, W + 4, 2, 2, 0, Y_CAB_TOP - 1, 30.5, cabPolished);
  // Door handles — small pull bars
  addBox(scene, 1.5, 6, 2, -(W / 4 + 15), T_BASE + T_CAB / 2, 32, matChrome());
  addBox(scene, 1.5, 6, 2,  (W / 4 + 15), T_BASE + T_CAB / 2, 32, matChrome());

  // ── 5. Countertop — 7 separate boxes to expose basin openings ────────────
  // Basin opening X: left [-70,−10], right [+10,+70]; Z depth 45 at z∈[−30,+15]
  const ctMat = matSSPolished();

  addBox(scene, 10, T_CT, D,    -75, CT_CY, 0,       ctMat); // outer left strip
  addBox(scene, 20, T_CT, D,      0, CT_CY, 0,       ctMat); // centre divider
  addBox(scene, 10, T_CT, D,     75, CT_CY, 0,       ctMat); // outer right strip
  addBox(scene, 60, T_CT, 15,   -40, CT_CY, 22.5,    ctMat); // front rim left basin
  addBox(scene, 60, T_CT, 15,    40, CT_CY, 22.5,    ctMat); // front rim right basin
  addBox(scene, 60, T_CT, 7.5,  -40, CT_CY, -26.25,  ctMat); // back rim left basin
  addBox(scene, 60, T_CT, 7.5,   40, CT_CY, -26.25,  ctMat); // back rim right basin

  // ── 6. Basin inserts — FIX: integrated with countertop ───────────────────
  // Height = 22, centre Y = Y_CT_TOP − 11 = 69 → top at 69+11=80 ✓
  // FIX: raised by 2 units to overlap with countertop for better integration
  const basinMat = matBasinInterior();
  addBox(scene, 60, 22, 45, -40, 71, -7.5, basinMat); // raised from 69 to 71
  addBox(scene, 60, 22, 45,  40, 71, -7.5, basinMat); // raised from 69 to 71

  // ── 7. Back panel / backsplash (Y = Y_CT_TOP → +75 = 80 → 155) ──────────
  addBox(scene, W, 75, 2, 0, 117.5, BP_Z, matSSMatte());

  // ── 8. Gooseneck faucets — 2× chrome with IR sensors ────────────────────
  // Faucets mount at backsplash, base at Y_CT_TOP = 80
  const chromeMat = matChrome();
  const sensorBodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, roughness: 0.4, metalness: 0.3,
  });
  const sensorDotMat = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    emissive: new THREE.Color(0xff2020),
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.0,
  });

  ([-40, 40]).forEach((fX) => {
    // Vertical stem: centre Y=90, spans Y=80→100
    addCyl(scene, 1.5, 1.5, 20, 16, fX, 90, -20, chromeMat);
    // Horizontal arm: centre Z=−13, spans Z=−20→−6, rotX=π/2
    addCyl(scene, 1.5, 1.5, 14, 16, fX, 100, -13, chromeMat, Math.PI / 2);
    // Angled spout: 45° forward-down
    addCyl(scene, 1.5, 1.0, 12, 16, fX, 95, -3, chromeMat, Math.PI / 4);
    // Outlet disc (pointing down)
    addCyl(scene, 1.2, 1.2, 1.5, 16, fX, 91, 1, chromeMat, Math.PI / 2);
    // IR sensor body
    addBox(scene, 3, 2.5, 1.5, fX, 92, -18.5, sensorBodyMat);
    // Sensor indicator (emissive red dot)
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), sensorDotMat);
    dot.position.set(fX, 92, -17.5);
    scene.add(dot);
  });

  // ── 9. Mirrors — 2× transparent + SS frames ─────────────────────────────
  // Mirror glass: Y = 83 → 143 (60 units tall, centre Y=113), Z=−28.5
  const mirrorMat = matMirror();
  const frameMat  = matSSPolished();

  ([-40, 40]).forEach((mx) => {
    addBox(scene, 55, 60, 1,   mx,         113, -28.5, mirrorMat, false); // glass
    addBox(scene, 59, 2,  1.2, mx,         145, -28.5, frameMat);         // top bar
    addBox(scene, 59, 2,  1.2, mx,          83, -28.5, frameMat);         // bottom bar
    addBox(scene, 2,  60, 1.2, mx - 28.5,  113, -28.5, frameMat);        // left bar
    addBox(scene, 2,  60, 1.2, mx + 28.5,  113, -28.5, frameMat);        // right bar
  });

  // ── 10. Canopy + LED UV strip ─────────────────────────────────────────────
  // Canopy: Y = 150 → 155 (centre 152.5), protrudes 7 units forward from back panel
  addBox(scene, 164, 5, 14, 0, 152.5, -22, matSSPolished());
  // LED strip underside at Y=150.1 (no shadow — avoids artifacts on mirror)
  addBox(scene, 158, 0.8, 12, 0, 150.1, -22, matLEDStrip(), false);

  // ── 11. Soap dispensers — 2×, outside each basin on countertop ───────────
  const dispMat = matSSMatte();
  ([-72, 72]).forEach((dx) => {
    addBox(scene, 8, 14, 6, dx, 87,  -4, dispMat);
    addBox(scene, 3,  6, 3, dx, 95,  -4, dispMat);
    addCyl(scene, 1.8, 1.8, 4, 12, dx, 98, -4, matChrome());
  });

  // ── 12. Annotations ───────────────────────────────────────────────────────
  placeAnnotations(
    scene,
    [
      { anchor: new THREE.Vector3( 60, 152.5, -22),  label: 'LED UV Canopy Strip' },
      { anchor: new THREE.Vector3(-10, 120,   -28.5), label: 'Mirror Panel + Frame SS' },
      { anchor: new THREE.Vector3(-40,  92,   -18),  label: 'Sensor IR Gooseneck Faucet' },
      { anchor: new THREE.Vector3(-72,  90,    -4),  label: 'Soap Dispenser' },
      { anchor: new THREE.Vector3(-40, Y_CT_TOP, 15), label: 'Recessed Basin SS 304 (600×450mm)' },
      { anchor: new THREE.Vector3( 50, 100,   -29),  label: 'Backsplash Integral SS 304' },
      { anchor: new THREE.Vector3( 60, CT_CY,   0),  label: 'Countertop SS 304 (40mm)' },
      { anchor: new THREE.Vector3( 60, T_BASE + T_CAB / 2, 31), label: 'Cabinet Body SS 304 (Sliding Door)' },
      { anchor: new THREE.Vector3( 60, 3,      30),  label: 'Base Trim + Adjustable Feet' },
      { anchor: new THREE.Vector3(  0, 1.25,   36),  label: 'Foot Pedal Hands-Free (2 pc.)' },
    ],
    W / 2 + 40,  // labelX = 120
    [0, 158],    // yRange — spans full unit height
  );
}

// ─── React component ──────────────────────────────────────────────────────────
export function ScrubSinkAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 80,
      maxDistance: 1200,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      const p = product.cameraPresets[0];
      if (p) applyCameraPreset(refs, p.position, p.target);
    },
    deps: [product],
  });

  const goTo = (p: CameraPreset) => {
    if (refsRef.current) applyCameraPreset(refsRef.current, p.position, p.target);
    setActivePreset(p.name);
  };

  const dl = (name: string) =>
    refsRef.current &&
    downloadPNG(
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
