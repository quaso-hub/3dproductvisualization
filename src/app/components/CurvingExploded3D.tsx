/**
 * CurvingExploded3D.tsx — EXPLODED VIEW
 * ─────────────────────────────────────────────────────────────
 * Setiap komponen Curving R40 dipisahkan secara "depth-explode"
 * searah sumbu Z (maju-mundur), sehingga profil-L tetap terbaca
 * dari kamera isometric.
 *
 * Urutan layer dari belakang (+Z) ke depan (-Z):
 *   idx 4 — Panel Dinding / Lantai (konteks, paling belakang)
 *   idx 3 — Pop Rivets
 *   idx 2 — White Silicone
 *   idx 1 — Aluminium Angle (posisi referensi tengah)
 *   idx 0 — Anodized Coating (paling depan)
 *
 * Dashed corner lines menghubungkan kontur profil antar layer,
 * mirip explosion diagram teknik.
 *
 * Anotasi: elbow-leader ke kanan, vertikal offset bersih.
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import * as THREE from 'three';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset, downloadPNG, createLabel, createAnnotationDot, createAnnotationLine,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ─── Profile constants (sama dengan Assembled) ───────────────
const W = 40;
const T = 2;
const R = 9;

// ─── Profile Shape (identical copy — keep files independent) ─
function buildCurvingShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-W, W);
  s.lineTo(-W, 0);
  s.lineTo(W, 0);
  s.lineTo(W, T);
  s.lineTo(R - T, T);
  s.quadraticCurveTo(-T, T, -T, T + R);
  s.lineTo(-T, W);
  s.lineTo(-W, W);
  return s;
}

// ─── Helpers ─────────────────────────────────────────────────

function mat(color: number, roughness: number, metalness: number, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
    envMapIntensity: 1.2,
  });
}

/** Dashed line dari p1 ke p2. */
function dashed(p1: THREE.Vector3, p2: THREE.Vector3): THREE.Line {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([p1, p2]),
    new THREE.LineDashedMaterial({
      color: 0x6688aa,
      dashSize: 5,
      gapSize: 4,
      opacity: 0.45,
      transparent: true,
    }),
  );
  line.computeLineDistances();
  return line;
}

// ─── Scene builder ────────────────────────────────────────────

function buildExplodedScene(scene: THREE.Scene, L: number) {

  // Setiap layer mempunyai posisi Z-offset (explode dalam arah depth).
  // Kita pakai gap = 50 scene-units antar layer.
  const GAP = 50;

  // Posisi Z center tiap layer (dari belakang ke depan):
  // Layer index: 0=Anodized(depan), 1=Aluminium, 2=Silicone, 3=Rivets, 4=Panel(belakang)
  const zPos = [
    -GAP * 2,   // Anodized Coating (paling depan)
    -GAP,       // Aluminium Angle
    0,          // White Silicone
    GAP,        // Pop Rivets
    GAP * 2,    // Panel konteks (paling belakang)
  ];

  // Ukuran slice yang di-extrude setiap layer (tipis = 2 unit)
  const SL = 4; // slice thickness

  // Panjang display pendek di exploded: 80 unit saja agar proporsional
  const LE = 80;

  // ── Layer 0: Anodized Coating ─────────────────────────────
  // Representasi: dua plat tipis melapisi sisi luar profil
  const coatGeoV = new THREE.BoxGeometry(1.2, W, LE);
  const coatV    = new THREE.Mesh(coatGeoV, mat(0xb8ccd8, 0.06, 0.97));
  coatV.position.set(-W - 0.6, W / 2, zPos[0]);
  coatV.castShadow = true;
  scene.add(coatV);

  const coatGeoH = new THREE.BoxGeometry(W, 1.2, LE);
  const coatH    = new THREE.Mesh(coatGeoH, mat(0xb8ccd8, 0.06, 0.97));
  coatH.position.set(0, -0.6, zPos[0]);
  coatH.castShadow = true;
  scene.add(coatH);

  // ── Layer 1: Aluminium Angle body ────────────────────────
  const profileGeo = new THREE.ExtrudeGeometry(buildCurvingShape(), {
    depth: LE,
    bevelEnabled: false,
  });
  profileGeo.translate(0, 0, -LE / 2);

  const profileMesh = new THREE.Mesh(profileGeo, mat(0xc5d3de, 0.08, 0.92));
  profileMesh.position.z = zPos[1];
  profileMesh.castShadow = profileMesh.receiveShadow = true;
  scene.add(profileMesh);

  const edgeLines = new THREE.LineSegments(
    new THREE.EdgesGeometry(profileGeo),
    new THREE.LineBasicMaterial({ color: 0x182838, opacity: 0.20, transparent: true }),
  );
  edgeLines.position.z = zPos[1];
  scene.add(edgeLines);

  // ── Layer 2: White Silicone ───────────────────────────────
  // Dua strip tipis (H dan V)
  const sHLen = W - T * 2;
  const siliH = new THREE.Mesh(
    new THREE.BoxGeometry(sHLen, 2.5, LE),
    mat(0xf0f0ea, 0.72, 0.0),
  );
  siliH.position.set((-T + W) / 2 - W / 2 + T / 2, -1.25, zPos[2]);
  siliH.castShadow = true;
  scene.add(siliH);

  const sVLen = W - T * 2; // lebar strip silicone vertikal
  const siliV = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, sVLen, LE),
    mat(0xf0f0ea, 0.72, 0.0),
  );
  siliV.position.set(-W - 1.25, T + sVLen / 2, zPos[2]);
  siliV.castShadow = true;
  scene.add(siliV);

  // ── Layer 3: Pop Rivets ───────────────────────────────────
  // Tampilkan hanya beberapa rivet representatif (3 buah)
  const rMat       = mat(0x8fa0ae, 0.12, 0.96);
  const shaftGeo   = new THREE.CylinderGeometry(1.5, 1.5, T + 2, 20);
  const capGeo     = new THREE.SphereGeometry(1.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const rivetZs    = [-LE * 0.3, 0, LE * 0.3];

  rivetZs.forEach(rz => {
    const z = zPos[3] + rz;

    // Rivet H (sayap horizontal)
    const shA = new THREE.Mesh(shaftGeo, rMat);
    shA.position.set(W * 0.35, 0, z);
    scene.add(shA);
    const cA = new THREE.Mesh(capGeo, rMat);
    cA.rotation.x = Math.PI;
    cA.position.set(W * 0.35, -(T / 2 + 1), z);
    scene.add(cA);

    // Rivet V (sayap vertikal)
    const shB = new THREE.Mesh(shaftGeo, rMat);
    shB.rotation.z = Math.PI / 2;
    shB.position.set(-W, W * 0.55, z);
    scene.add(shB);
    const cB = new THREE.Mesh(capGeo, rMat);
    cB.rotation.z = -Math.PI / 2;
    cB.position.set(-(W + T / 2 + 1), W * 0.55, z);
    scene.add(cB);
  });

  // ── Layer 4: Panel Dinding & Lantai (konteks) ─────────────
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(SL, W * 2.8, LE),
    mat(0xd0e2f0, 0.40, 0.45, 0.65),
  );
  wall.position.set(-W - SL / 2, W * 0.9, zPos[4]);
  scene.add(wall);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(W * 2.8, SL, LE),
    mat(0xd0e2f0, 0.40, 0.45, 0.65),
  );
  floor.position.set(W * 0.9, -SL / 2, zPos[4]);
  scene.add(floor);

  // ── Dashed connection lines ───────────────────────────────
  // Garis sudut profil: 4 titik di kontur profil-L, dihubungkan antar layer
  // 4 corner points profil (dalam world space):
  //   TL = (-W, W)  TR = (-T, W)  BL = (-W, 0)  BR = (W, 0)
  //   inner corner ≈ (-T, T)
  const corners2D: [number, number][] = [
    [-W, W],     // TL (atas kiri luar)
    [-T, W],     // TR (atas kanan dalam)
    [-W, 0],     // BL (bawah kiri)
    [W,  0],     // BR (bawah kanan)
    [W,  T],     // BR inner
  ];

  // Hubungkan Anodized ↔ Aluminium ↔ Silicone ↔ Rivet ↔ Panel
  const layerZOrder = [zPos[0], zPos[1], zPos[2], zPos[3], zPos[4]];
  corners2D.forEach(([cx, cy]) => {
    for (let k = 0; k < layerZOrder.length - 1; k++) {
      scene.add(dashed(
        new THREE.Vector3(cx, cy, layerZOrder[k] + LE / 2),
        new THREE.Vector3(cx, cy, layerZOrder[k + 1] - LE / 2),
      ));
    }
  });

  // ── Annotations (CSS2D) ───────────────────────────────────
  const annotData = [
    { anchor: new THREE.Vector3(-W - 0.6, W * 0.6, zPos[0]),                   label: 'Anodized Coating' },
    { anchor: new THREE.Vector3(-W / 2, W * 0.5, zPos[1]),                     label: 'Aluminium Angle 40×40' },
    { anchor: new THREE.Vector3(-W - 1.25, T + (W - T * 2) * 0.5, zPos[2]),   label: 'White Silicone' },
    { anchor: new THREE.Vector3(W * 0.35, -(T / 2 + 1.5), zPos[3]),           label: 'Pop Rivets' },
    { anchor: new THREE.Vector3(W + 1, -2, zPos[4]),                           label: 'Panel Dinding / Lantai' },
  ];

  annotData.forEach(({ anchor, label }) => {
    const labelPos = anchor.clone().add(new THREE.Vector3(55, 0, 0));
    scene.add(createAnnotationDot(anchor));
    createAnnotationLine(scene, anchor, labelPos);
    createLabel(scene, labelPos, label);
  });
}

// ─── React component ─────────────────────────────────────────

export function CurvingExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 80,
      maxDistance: 900,
    },
    onInit: (refs) => {
      const L = product.dimensions.sceneHeight;
      buildExplodedScene(refs.scene, L);
    },
    deps: [product],
  });

  const goTo = (p: CameraPreset) => {
    if (refsRef.current) applyCameraPreset(refsRef.current, p.position, p.target);
    setActivePreset(p.name);
  };
  const dl    = (name: string) => refsRef.current && downloadPNG(refsRef.current.renderer, `${product.id}-exploded-${name.toLowerCase().replace(/\s+/g, '-')}.png`);
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
