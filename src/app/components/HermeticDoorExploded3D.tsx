/**
 * HermeticDoorExploded3D.tsx — EXPLODED VIEW (Improved)
 * ─────────────────────────────────────────────────────────────
 * Cross-section panel pintu Hermetic dipisah per lapisan,
 * ditampilkan dalam susunan Z dengan gap antar lapisan.
 * Anotasi diperbaiki: setiap label selaras dengan Z-nya layer.
 *
 * Urutan layer (luar → dalam, arah +Z):
 *   0. SS Face (luar)
 *   1. PIR Foam Core
 *   2. Timbal (Pb) 2mm
 *   3. PIR Foam Core
 *   4. SS Face (dalam)
 *   5. Kaca Pb (Lead Glass) — setelah layer 4 dengan gap
 *
 * Dashed corner connector lines menunjukkan layer relationship.
 * ─────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset, downloadPNG, placeAnnotations, visualThickness,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ─── Dimensi panel (sama dengan assembled) ───────────────────
const DW = 160;
const DH = 210;
const EXPLOSION_GAP = 35;  // Wider gap untuk clarity

// Window
const WW = 30;
const WH = 40;
const WX = 0;
const WY = 150;

// ─── Door shape dengan window hole ───────────────────────────

// ─── Door shape dengan window hole (centred at y=0) ──────────

function buildDoorShape(): THREE.Shape {
  const half = DW / 2;
  const hh   = DH / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, -hh);
  shape.lineTo(half,  -hh);
  shape.lineTo(half,   hh);
  shape.lineTo(-half,  hh);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(WX - WW / 2, WY - DH / 2);
  hole.lineTo(WX + WW / 2, WY - DH / 2);
  hole.lineTo(WX + WW / 2, WY - DH / 2 + WH);
  hole.lineTo(WX - WW / 2, WY - DH / 2 + WH);
  hole.closePath();
  shape.holes.push(hole);

  return shape;
}

// ─── Dashed connector lines helper ────────────────────────────

function createDashedCornerLines(
  scene: THREE.Scene,
  layer: Product['layers'][number],
  zStart: number,
  zEnd: number,
) {
  const corners = [
    [-DW / 2, -DH / 2],
    [ DW / 2, -DH / 2],
    [ DW / 2,  DH / 2],
    [-DW / 2,  DH / 2],
  ];

  const lineMat = new THREE.LineDashedMaterial({
    color: 0x9ca3af,
    linewidth: 1,
    dashSize: 6,
    gapSize: 4,
    opacity: 0.4,
    transparent: true,
  });

  corners.forEach(([x, y]) => {
    const pts = [
      new THREE.Vector3(x, y, zStart),
      new THREE.Vector3(x, y, zEnd),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, lineMat);
    line.computeLineDistances();
    scene.add(line);
  });
}

// ─── Scene builder ────────────────────────────────────────────

function buildExplodedScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer, layers: Product['layers']) {
  // ── RoomEnvironment for realistic PBR reflections ────────────
  renderer.toneMappingExposure = 0.90;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.background = new THREE.Color(0xf5f5f5);
  pmrem.dispose();

  // Calculate visual thicknesses for first 5 layers (panel layers)
  const visualTs = layers.slice(0, 5).map((l) => visualThickness(l));
  const totalVisT = visualTs.reduce((s, t) => s + t, 0);
  const totalSpan = totalVisT + EXPLOSION_GAP * (visualTs.length - 1);

  // Center the stack at Z=0
  let currentZ = -totalSpan / 2;

  // ── Collect annotation items as we build panel layers ────
  const annotItems: { anchor: THREE.Vector3; label: string; labelZ: number }[] = [];

  // ── Panel layers (0-4) ────────────────────────────────────
  layers.slice(0, 5).forEach((layer, i) => {
    const vt = visualTs[i];

    // Door-shape panel per layer
    const geo = new THREE.ExtrudeGeometry(buildDoorShape(), {
      depth: vt,
      bevelEnabled: false,
    });
    geo.translate(0, 0, 0);

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
      new THREE.LineBasicMaterial({ color: 0x1a2332, opacity: 0.12, transparent: true }),
    );
    edges.position.z = currentZ;
    scene.add(edges);

    // Dashed corner connector lines (connect this layer to next)
    if (i < 4) {  // Don't draw for last panel layer
      createDashedCornerLines(scene, layer, currentZ + vt / 2, currentZ + vt + EXPLOSION_GAP - vt / 2);
    }

    // Collect annotation
    const layerCenterZ = currentZ + vt / 2;
    annotItems.push({ anchor: new THREE.Vector3(DW / 2, 0, layerCenterZ), label: layer.name, labelZ: layerCenterZ });

    currentZ += vt + EXPLOSION_GAP;
  });

  // ── Lead Glass (layer[5]) — positioned after last panel layer ──
  const glassLayer = layers[5];
  const glassVT = Math.max(visualThickness(glassLayer), 3);
  const glassZ = currentZ;  // After last panel layer

  const glassMat = new THREE.MeshStandardMaterial({
    color: glassLayer.color,
    roughness: glassLayer.roughness,
    metalness: glassLayer.metalness,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });

  const glassGeo = new THREE.BoxGeometry(WW, WH, glassVT);
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  // centred y: WY - DH/2 + WH/2
  glassMesh.position.set(WX, WY - DH / 2 + WH / 2, glassZ);
  scene.add(glassMesh);

  // Glass outline
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(glassGeo),
    new THREE.LineBasicMaterial({ color: 0x0284c7, opacity: 0.4, transparent: true }),
  )).position.copy(glassMesh.position);

  // Glass annotation — add to shared list
  const glassAnchor = new THREE.Vector3(WX + WW / 2, WY - DH / 2 + WH / 2, glassZ);
  annotItems.push({ anchor: glassAnchor, label: glassLayer.name, labelZ: glassZ });

  // Render all annotations with even Y distribution
  placeAnnotations(scene, annotItems, DW / 2 + 70, [-DH / 2 - 15, DH / 2 + 15]);

  // ── Dimension indicator: total thickness arrow + tick marks ──
  const arrowMat = new THREE.LineBasicMaterial({ color: 0x374151, opacity: 0.6, transparent: true, linewidth: 2 });
  const zStart = -totalSpan / 2;
  const zFinal = currentZ + glassVT / 2;
  const arrowY = 0;  // centred

  const arrowPts = [
    new THREE.Vector3(-DW / 2 - 25, arrowY, zStart),
    new THREE.Vector3(-DW / 2 - 25, arrowY, zFinal),
  ];
  const arrowGeo = new THREE.BufferGeometry().setFromPoints(arrowPts);
  scene.add(new THREE.Line(arrowGeo, arrowMat));

  const tickH = 5;
  [zStart, zFinal].forEach((zPos) => {
    const tickPts = [
      new THREE.Vector3(-DW / 2 - 27, arrowY - tickH / 2, zPos),
      new THREE.Vector3(-DW / 2 - 23, arrowY - tickH / 2, zPos),
    ];
    const tickGeo = new THREE.BufferGeometry().setFromPoints(tickPts);
    scene.add(new THREE.Line(tickGeo, arrowMat));
  });

  const thickDot = new THREE.Vector3(-DW / 2 - 25, arrowY, 0);
  placeAnnotations(scene, [{ anchor: thickDot, label: 'Tebal Total ~94mm', labelZ: 0 }], -DW / 2 - 40, [arrowY, arrowY]);
}

// ─── React component ─────────────────────────────────────────

export function HermeticDoorExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 100,
      maxDistance: 1200,
    },
    onInit: (refs) => {
      buildExplodedScene(refs.scene, refs.renderer, product.layers);
      const p = product.cameraPresets[0];
      applyCameraPreset(refs, p.position, p.target);
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
