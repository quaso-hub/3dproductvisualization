/**
 * PbLeadDoorExploded3D.tsx — EXPLODED VIEW
 * ─────────────────────────────────────────────────────────────
 * Cross-section konstruksi daun pintu PB Lead Door, dipisah
 * per lapisan sepanjang sumbu Z.
 *
 * Urutan layer (luar → dalam, arah +Z):
 *   0. Steel Plate Luar (1.5mm)
 *   1. Lapis Timbal Pb (Lead Sheet)
 *   2. Plywood 9mm
 *   3. Insulasi PIR
 *   4. Rangka Hollow Steel
 *   5. Steel Plate Dalam (1.5mm)
 *   6. View Glass Timbal — ditampilkan terpisah (floating, offset ke kanan atas)
 *
 * Setiap layer ditampilkan sebagai ExtrudeGeometry dengan bentuk
 * daun pintu (termasuk window hole untuk layer terluar/terdalam).
 * Dashed corner lines menghubungkan antar layer.
 * placeAnnotations() dengan labelZ per layer untuk label sejajar.
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

// ─── Dimensi (sama dengan assembled, 1 unit = 10mm) ──────────
const DW  = 90;
const DH  = 210;
const EXPLOSION_GAP = 32;  // gap antar layer

// Window (lead glass) — upper portion
const GW  = 22;
const GH  = 32;
const GX  = 0;
const GY  = 65;   // from top

// ─── Door shape (full panel — no window hole for inner layers) ─
function buildFullDoorShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-DW / 2, -DH / 2);
  shape.lineTo( DW / 2, -DH / 2);
  shape.lineTo( DW / 2,  DH / 2);
  shape.lineTo(-DW / 2,  DH / 2);
  shape.closePath();
  return shape;
}

// ─── Door shape with window hole (outer / inner face layers) ──
function buildDoorShapeWithHole(): THREE.Shape {
  const shape = buildFullDoorShape();
  const gYCenter = DH / 2 - GY - GH / 2;
  const hole = new THREE.Path();
  hole.moveTo(GX - GW / 2, gYCenter - GH / 2);
  hole.lineTo(GX + GW / 2, gYCenter - GH / 2);
  hole.lineTo(GX + GW / 2, gYCenter + GH / 2);
  hole.lineTo(GX - GW / 2, gYCenter + GH / 2);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

// ─── Dashed corner connector lines between layers ──────────────
function createDashedCorners(
  scene: THREE.Scene,
  zStart: number,
  zEnd: number,
) {
  const corners: [number, number][] = [
    [-DW / 2, -DH / 2],
    [ DW / 2, -DH / 2],
    [ DW / 2,  DH / 2],
    [-DW / 2,  DH / 2],
  ];
  const lineMat = new THREE.LineDashedMaterial({
    color: 0x94a3b8,
    linewidth: 1,
    dashSize: 5,
    gapSize: 3.5,
    opacity: 0.35,
    transparent: true,
  });
  corners.forEach(([x, y]) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, zStart),
      new THREE.Vector3(x, y, zEnd),
    ]);
    const line = new THREE.Line(geo, lineMat);
    line.computeLineDistances();
    scene.add(line);
  });
}

// ─── Scene builder ────────────────────────────────────────────

function buildExplodedScene(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  layers: Product['layers'],
) {
  // ── Environment ──────────────────────────────────────────────
  renderer.toneMappingExposure = 0.88;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.background = new THREE.Color(0xf0f4f7);
  pmrem.dispose();

  // ── Panel layers (indices 0–5) ───────────────────────────────
  const panelLayers = layers.slice(0, 6);
  const visualTs = panelLayers.map((l) => visualThickness(l));
  const totalVisT  = visualTs.reduce((s, t) => s + t, 0);
  const totalSpan  = totalVisT + EXPLOSION_GAP * (panelLayers.length - 1);

  // Center the whole stack at Z = 0
  let currentZ = -totalSpan / 2;

  const annotItems: { anchor: THREE.Vector3; label: string; labelZ: number }[] = [];

  panelLayers.forEach((layer, i) => {
    const vt = visualTs[i];

    // Outer / inner steel faces get the window hole; structural layers are solid
    const useHole = i === 0 || i === 5;
    const shapeGeo = new THREE.ExtrudeGeometry(
      useHole ? buildDoorShapeWithHole() : buildFullDoorShape(),
      { depth: vt, bevelEnabled: false },
    );

    const mat = new THREE.MeshStandardMaterial({
      color: layer.color,
      roughness: layer.roughness,
      metalness: layer.metalness,
      side: THREE.DoubleSide,
      envMapIntensity: 0.9,
    });

    const mesh = new THREE.Mesh(shapeGeo, mat);
    mesh.position.z = currentZ;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);

    // Edge outline
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(shapeGeo),
      new THREE.LineBasicMaterial({ color: 0x1a2332, opacity: 0.10, transparent: true }),
    );
    edges.position.z = currentZ;
    scene.add(edges);

    // Dashed corner connectors to next layer
    if (i < panelLayers.length - 1) {
      createDashedCorners(scene, currentZ + vt / 2, currentZ + vt + EXPLOSION_GAP - vt / 2);
    }

    // Annotation anchor — right edge, Y=0, at layer center Z
    const layerCenterZ = currentZ + vt / 2;
    annotItems.push({
      anchor: new THREE.Vector3(DW / 2, 0, layerCenterZ),
      label: layer.name,
      labelZ: layerCenterZ,
    });

    currentZ += vt + EXPLOSION_GAP;
  });

  // ── Lead Glass (layer[6]) — floating near last panel ──────────
  const glassLayer  = layers[6];
  const glassVT     = Math.max(visualThickness(glassLayer), 3.5);
  // Offset it to the right and above the last steel layer for visibility
  const glassZ      = currentZ + 12;  // beyond last panel layer
  const gYCenter    = DH / 2 - GY - GH / 2;

  const glassMat = new THREE.MeshStandardMaterial({
    color: glassLayer.color,
    roughness: glassLayer.roughness,
    metalness: glassLayer.metalness,
    transparent: true,
    opacity: 0.50,
    side: THREE.DoubleSide,
    envMapIntensity: 1.2,
  });

  const glassGeo  = new THREE.BoxGeometry(GW, GH, glassVT);
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(GX, gYCenter, glassZ);
  scene.add(glassMesh);

  // Glass frame border
  const gfMat = new THREE.MeshStandardMaterial({
    color: 0xb0c0cc,
    roughness: 0.20,
    metalness: 0.75,
  });
  const gfT = 1.0;
  [
    { pos: [GX, gYCenter + GH / 2 + gfT / 2, glassZ], size: [GW + gfT * 2, gfT, glassVT] },
    { pos: [GX, gYCenter - GH / 2 - gfT / 2, glassZ], size: [GW + gfT * 2, gfT, glassVT] },
    { pos: [GX - GW / 2 - gfT / 2, gYCenter, glassZ], size: [gfT, GH, glassVT] },
    { pos: [GX + GW / 2 + gfT / 2, gYCenter, glassZ], size: [gfT, GH, glassVT] },
  ].forEach(({ pos, size }) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(...size as [number, number, number]),
      gfMat,
    );
    m.position.set(...pos as [number, number, number]);
    scene.add(m);
  });

  // Glass edge outline
  const glassEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(glassGeo),
    new THREE.LineBasicMaterial({ color: 0x0284c7, opacity: 0.45, transparent: true }),
  );
  glassEdges.position.copy(glassMesh.position);
  scene.add(glassEdges);

  // Dashed connector from last panel layer to glass
  const lastPanelEndZ = currentZ - EXPLOSION_GAP / 2;
  createDashedCorners(scene, lastPanelEndZ, glassZ - glassVT / 2);

  // Glass annotation
  annotItems.push({
    anchor: new THREE.Vector3(GX + GW / 2, gYCenter, glassZ),
    label: glassLayer.name,
    labelZ: glassZ,
  });

  // ── All annotations ─────────────────────────────────────────
  placeAnnotations(scene, annotItems, DW / 2 + 70, [-DH / 2 - 10, DH / 2 + 10]);
}

// ─── React component ──────────────────────────────────────────

export function PbLeadDoorExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 80,
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
  const dl    = (name: string) =>
    refsRef.current && downloadPNG(
      refsRef.current.renderer,
      `${product.id}-exploded-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
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
