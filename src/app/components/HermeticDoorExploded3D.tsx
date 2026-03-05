/**
 * HermeticDoorExploded3D.tsx — EXPLODED VIEW
 * ─────────────────────────────────────────────────────────────
 * Cross-section panel pintu Hermetic dipisah per lapisan,
 * ditampilkan dalam susunan Z dengan gap antar lapisan.
 *
 * Urutan layer (luar → dalam, arah +Z):
 *   0. SS Face (luar)
 *   1. PIR Foam Core
 *   2. Timbal (Pb) 2mm
 *   3. PIR Foam Core
 *   4. SS Face (dalam)
 *   5. Kaca Pb (Lead Glass) — diposisikan di area jendela
 *
 * Anotasi: elbow-leader ke sisi kanan (+X)
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset, downloadPNG, createAnnotationFull, visualThickness,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ─── Dimensi panel (sama dengan assembled) ───────────────────
const DW = 160;
const DH = 210;
const EXPLOSION_GAP = 28;

// Window
const WW = 30;
const WH = 40;
const WX = 0;
const WY = 150;

// ─── Door shape dengan window hole ───────────────────────────

function buildDoorShape(): THREE.Shape {
  const half = DW / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo( half, 0);
  shape.lineTo( half, DH);
  shape.lineTo(-half, DH);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(WX - WW / 2, WY);
  hole.lineTo(WX + WW / 2, WY);
  hole.lineTo(WX + WW / 2, WY + WH);
  hole.lineTo(WX - WW / 2, WY + WH);
  hole.closePath();
  shape.holes.push(hole);

  return shape;
}

// ─── Scene builder ────────────────────────────────────────────

function buildExplodedScene(scene: THREE.Scene, layers: Product['layers']) {
  // Calculate visual thicknesses
  const visualTs = layers.slice(0, 5).map((l) => visualThickness(l));
  const totalVisT = visualTs.reduce((s, t) => s + t, 0);
  const totalSpan = totalVisT + EXPLOSION_GAP * (visualTs.length - 1);

  // Center the stack at Z=0
  let currentZ = -totalSpan / 2;

  const xL  = DW / 2 + 70;  // label X
  const annotZ = 0;          // annotation Z slice (center, will be overridden per layer)

  layers.slice(0, 5).forEach((layer, i) => {
    const vt = visualTs[i];

    // Door-shape panel per layer
    const geo = new THREE.ExtrudeGeometry(buildDoorShape(), {
      depth: vt,
      bevelEnabled: false,
    });
    geo.translate(0, 0, 0); // front face at Z=0 of local geo

    const mat = new THREE.MeshStandardMaterial({
      color: layer.color,
      roughness: layer.roughness,
      metalness: layer.metalness,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = currentZ;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);

    // Edge outlines
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x182838, opacity: 0.15, transparent: true }),
    );
    edges.position.z = currentZ;
    scene.add(edges);

    // Annotation: anchor at right-center of this layer slab
    const layerCenterZ = currentZ + vt / 2;
    const annotY = [DH * 0.82, DH * 0.65, DH * 0.5, DH * 0.35, DH * 0.18];

    createAnnotationFull(scene,
      new THREE.Vector3(DW / 2, annotY[i], layerCenterZ),
      new THREE.Vector3(xL, annotY[i], annotZ),
      `${layer.name} (${layer.thickness}mm)`,
    );

    currentZ += vt + EXPLOSION_GAP;
  });

  // ── Lead Glass (layer[5]) — floating at window position ──
  const glassLayer = layers[5];
  const glassVT = Math.max(visualThickness(glassLayer), 3);
  const glassZ  = 0; // float at center of the stack

  const glassMat = new THREE.MeshStandardMaterial({
    color: glassLayer.color,
    roughness: glassLayer.roughness,
    metalness: glassLayer.metalness,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });

  const glassGeo = new THREE.BoxGeometry(WW, WH, glassVT);
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(WX, WY + WH / 2, glassZ);
  scene.add(glassMesh);

  // Glass outline
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(glassGeo),
    new THREE.LineBasicMaterial({ color: 0x0284c7, opacity: 0.4, transparent: true }),
  )).position.copy(glassMesh.position);

  // Glass annotation
  createAnnotationFull(scene,
    new THREE.Vector3(WX + WW / 2, WY + WH * 0.7, glassZ),
    new THREE.Vector3(xL, DH * 0.6, annotZ),
    `${glassLayer.name}`,
  );

  // ── Dimension indicator: total thickness arrow ────────────
  const arrowMat = new THREE.LineBasicMaterial({ color: 0x374151, opacity: 0.5, transparent: true });
  const arrowPts = [
    new THREE.Vector3(-DW / 2 - 20, DH * 0.5, -totalSpan / 2),
    new THREE.Vector3(-DW / 2 - 20, DH * 0.5,  totalSpan / 2),
  ];
  const arrowGeo = new THREE.BufferGeometry().setFromPoints(arrowPts);
  scene.add(new THREE.Line(arrowGeo, arrowMat));

  createAnnotationFull(scene,
    new THREE.Vector3(-DW / 2 - 20, DH * 0.5, 0),
    new THREE.Vector3(-DW / 2 - 80, DH * 0.5, 0),
    `Tebal Total: ~94mm`,
  );
}

// ─── React component ─────────────────────────────────────────

export function HermeticDoorExploded3D({ product }: Props) {
  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 100,
      maxDistance: 1200,
    },
    onInit: (refs) => {
      buildExplodedScene(refs.scene, product.layers);
    },
    deps: [product],
  });

  const goTo  = (p: CameraPreset) => refsRef.current && applyCameraPreset(refsRef.current, p.position, p.target);
  const dl    = (name: string)    => refsRef.current && downloadPNG(refsRef.current.renderer, `${product.id}-exploded-${name.toLowerCase().replace(/\s+/g, '-')}.png`);
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
