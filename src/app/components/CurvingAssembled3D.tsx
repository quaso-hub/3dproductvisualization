/**
 * CurvingAssembled3D.tsx — ASSEMBLED VIEW
 * ─────────────────────────────────────────────────────────────
 * Profil Curving Aluminium R40 dalam posisi terpasang.
 *
 * Koordinat sistem (world space):
 *   • Sudut dalam profil berada di (0, 0)
 *   • Sayap horizontal melebar ke +X (menuju lantai)
 *   • Sayap vertikal naik ke +Y (menuju dinding)
 *   • Panjang ekstrusi sepanjang ±Z (dipusat di Z=0)
 *
 *  Y ↑ (dinding)
 *    │  ██  ← sayap vertikal (tebal T ke kiri = −X)
 *    │  ██
 *    │  ██░░░░░░░  ← sayap horizontal (tebal T ke bawah = −Y)
 *    └─────────────── X (lantai)
 *
 * Anotasi: sistem elbow-leader — semua label di sisi kanan (+X)
 * dengan vertical offset berbeda agar tidak tumpang tindih.
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

// ─── Profile constants ───────────────────────────────────────
const W = 40;   // lebar sayap (scene units ≈ mm)
const T = 2;    // tebal dinding profil
const R = 9;    // radius fillet sudut dalam (visual ~R40)

// ─── Profile Shape ───────────────────────────────────────────
/**
 * Profil-L dengan sudut dalam melengkung (fillet).
 * Sistem koordinat: origin di sudut luar bawah kiri (0,0).
 *
 * Jalur shape (counter-clockwise):
 *
 *   (-W, W)──────────(-T, W)
 *      │                │
 *      │                │ (sayap vertikal, dalam)
 *      │       fillet   │
 *   (-W, 0)         (-T, T+R)
 *      │           ╭────╯
 *      │      (R-T, T)──────(W, T)
 *      │                       │
 *   (-W, 0)────────────────(W, 0)
 */
function buildCurvingShape(): THREE.Shape {
  const s = new THREE.Shape();

  s.moveTo(-W, W);           // kiri atas (luar sayap vertikal)
  s.lineTo(-W, 0);           // kiri bawah
  s.lineTo(W, 0);            // kanan bawah (ujung sayap H)
  s.lineTo(W, T);            // kanan atas inner (sayap H)
  s.lineTo(R - T, T);        // mendekati fillet
  s.quadraticCurveTo(        // fillet quarter-circle
    -T, T,                   //   control point
    -T, T + R,               //   end point
  );
  s.lineTo(-T, W);           // ujung atas inner (sayap V)
  s.lineTo(-W, W);           // kembali ke start

  return s;
}

// ─── Materials ───────────────────────────────────────────────

function matAluminium() {
  return new THREE.MeshStandardMaterial({
    color: 0xc5d3de,
    roughness: 0.08,
    metalness: 0.92,
    envMapIntensity: 1.4,
  });
}
function matSilicone() {
  return new THREE.MeshStandardMaterial({
    color: 0xf0f0eb,
    roughness: 0.72,
    metalness: 0.0,
  });
}
function matRivet() {
  return new THREE.MeshStandardMaterial({
    color: 0x8fa0ae,
    roughness: 0.12,
    metalness: 0.96,
  });
}

// ─── Scene builder ────────────────────────────────────────────

function buildAssembledScene(scene: THREE.Scene, L: number) {

  // ── 1. Aluminium Angle body ───────────────────────────────
  const profileGeo = new THREE.ExtrudeGeometry(buildCurvingShape(), {
    depth: L,
    bevelEnabled: false,
  });
  profileGeo.translate(0, 0, -L / 2); // center on Z axis

  const profileMesh = new THREE.Mesh(profileGeo, matAluminium());
  profileMesh.castShadow = profileMesh.receiveShadow = true;
  scene.add(profileMesh);

  // Subtle edge definition
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(profileGeo),
    new THREE.LineBasicMaterial({ color: 0x182838, opacity: 0.18, transparent: true }),
  ));

  // ── 2. White Silicone strips ──────────────────────────────
  // Strip A: pada sisi bawah sayap horizontal (antara profil dan substrat)
  // Sayap horizontal: dari X=(-W) ke X=(W), Y=0 adalah muka bawah sayap
  // Silicone mengisi celah X dari (-W+T) ke (W), tebal 1.5 ke arah -Y
  const siliHLen = W - T;        // panjang strip H = W - T (tidak menutupi sudut fillet)
  const siliH    = new THREE.Mesh(
    new THREE.BoxGeometry(siliHLen, 1.5, L),
    matSilicone(),
  );
  // Tengah strip H: X = -W + T + siliHLen/2 = -W + T + (W-T)/2 = -W/2 + T/2
  siliH.position.set(-W / 2 + T / 2, -0.75, 0);
  siliH.castShadow = true;
  scene.add(siliH);

  // Strip B: pada sisi kiri sayap vertikal (antara profil dan dinding)
  // Sayap vertikal: dari Y=0 ke Y=W, X=-W adalah muka kiri sayap
  // Silicone mengisi Y dari (T+R) ke W, tebal 1.5 ke arah -X
  const siliVLen = W - T - R;    // tidak menutupi area fillet
  const siliV    = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, siliVLen, L),
    matSilicone(),
  );
  // Tengah strip V: X = -W - 0.75, Y = T + R + siliVLen/2
  siliV.position.set(-W - 0.75, T + R + siliVLen / 2, 0);
  siliV.castShadow = true;
  scene.add(siliV);

  // ── 3. Pop Rivets ─────────────────────────────────────────
  // Geometri: cylinder (shaft) + sphere cap
  const shaftGeo = new THREE.CylinderGeometry(1.5, 1.5, T + 2, 20);
  const capGeo   = new THREE.SphereGeometry(1.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const rMat     = matRivet();

  const spacing = 20; // 200 mm dalam skala 1:10
  const nRivets = Math.floor((L - spacing) / spacing);

  for (let i = 0; i <= nRivets; i++) {
    const z = -L / 2 + spacing / 2 + i * spacing;

    // Rivet A: sayap horizontal, menembus dari bawah (axis Y)
    const shA = new THREE.Mesh(shaftGeo, rMat);
    shA.position.set(W * 0.35, 0, z); // di 35% dari tengah sayap H
    scene.add(shA);
    const capA = new THREE.Mesh(capGeo, rMat);
    capA.rotation.x = Math.PI; // cap ke bawah
    capA.position.set(W * 0.35, -(T / 2 + 1), z);
    scene.add(capA);

    // Rivet B: sayap vertikal, menembus dari kiri (axis X)
    const shB = new THREE.Mesh(shaftGeo, rMat);
    shB.rotation.z = Math.PI / 2;
    shB.position.set(-W, W * 0.55, z);
    scene.add(shB);
    const capB = new THREE.Mesh(capGeo, rMat);
    capB.rotation.z = -Math.PI / 2; // cap ke kiri
    capB.position.set(-(W + T / 2 + 1), W * 0.55, z);
    scene.add(capB);
  }

  // ── 4. Annotations ───────────────────────────────────────
  // Semua label di sisi kanan profil (+X), elbow ke atas.

  const zA  = L * 0.28;
  const xL  = W + 55;

  const Y = [W + 46, W + 24, W + 2, -16, -34];

  createAnnotationFull(scene,
    new THREE.Vector3(-W / 2, W * 0.6, zA),
    new THREE.Vector3(xL, Y[0], zA),
    'Aluminium Angle 40×40',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(-W - 0.5, W * 0.4, zA),
    new THREE.Vector3(xL, Y[1], zA),
    'Anodized Coating',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(-W / 2 + T / 2, -0.75, zA),
    new THREE.Vector3(xL, Y[2], zA),
    'White Silicone',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(W * 0.35, -(T / 2 + 1), zA),
    new THREE.Vector3(xL, Y[3], zA),
    'Pop Rivets',
  );
  createAnnotationFull(scene,
    new THREE.Vector3(-W - 0.75, T + R + (W - T - R) * 0.5, zA),
    new THREE.Vector3(xL, Y[4], zA),
    'Sealant Vertikal',
  );
}

// ─── React component ─────────────────────────────────────────

export function CurvingAssembled3D({ product }: Props) {
  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 60,
      maxDistance: 700,
    },
    onInit: (refs) => {
      const L = product.dimensions.sceneHeight;
      buildAssembledScene(refs.scene, L);
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
