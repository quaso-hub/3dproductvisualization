/**
 * HermeticDoorExploded3D.tsx - EXPLODED VIEW (Session 10 Item 1 rewrite)
 * ──────────────────────────────────────────────────────────────────
 * Konsisten dengan Assembled: SEMUA komponen pintu di-explode, bukan
 * hanya cross-section panel.
 *
 * Strategi:
 *   • Frame (kusen) → meledak radial keluar (sill bawah, jamb kiri/kanan)
 *   • Housing motor → meledak ke atas
 *   • Track rail + flange → terpisah di antara housing dan frame
 *   • Door panel → cross-section 5-layer di tengah, dipisah dalam Z
 *   • Lead glass → terpisah di depan panel
 *   • Handle SS → terpisah ke depan
 *   • Sensor + indicator LED → terpisah di samping
 *   • Floor guide rail → ke bawah
 *   • EPDM gasket → ke samping panel
 *
 * Semua komponen punya dashed connector ke posisi assembled-nya.
 * ──────────────────────────────────────────────────────────────────
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

// ── Dimensi (mirror dari Assembled) ────────────────────
const DW = 160;
const DH = 210;
const DT = 10;
const WW = 30;
const WH = 40;
const WX = 0;
const WY = 150;
const HW = DW + 20;
const HH = 42;
const HDT = 28;
const FT = 8;

// ── Explosion offsets ─────────────────────────────────
const PANEL_LAYER_GAP = 12;       // gap between cross-section layers (Z)
const FRAME_RADIAL = 75;          // frame components flying outward (X/Y)
const HOUSING_UP = 95;            // housing flying up (Y)
const HANDLE_FORWARD = 75;        // handle flying forward (Z)
const GLASS_FORWARD = 55;         // glass flying forward (Z)
const SENSOR_OUT = 90;            // sensor flying outward (X)
const FLOORGUIDE_DOWN = 55;       // floor guide flying down (Y)
const TRACK_OFFSET = 35;          // track rail flying outward (Y)
const DASH_COLOR = 0x9ca3af;

// ── Materials (mirror Assembled) ──────────────────────
function matSS(roughness = 0.22, metalness = 0.80) {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dde6, roughness, metalness, envMapIntensity: 0.75,
  });
}
function matHousing() {
  return new THREE.MeshStandardMaterial({
    color: 0xb5c4d0, roughness: 0.25, metalness: 0.75,
  });
}
function matGlass() {
  return new THREE.MeshStandardMaterial({
    color: 0x9ed4e8, roughness: 0.03, metalness: 0.0,
    transparent: true, opacity: 0.45, side: THREE.DoubleSide,
  });
}
function matLead() {
  return new THREE.MeshStandardMaterial({
    color: 0x7a7f85, roughness: 0.35, metalness: 0.75,
  });
}
function matFrame() {
  return new THREE.MeshStandardMaterial({
    color: 0x505860, roughness: 0.28, metalness: 0.72,
  });
}
function matSensor() {
  return new THREE.MeshStandardMaterial({
    color: 0x4a5568, roughness: 0.4, metalness: 0.6,
  });
}
function matEpdm() {
  return new THREE.MeshStandardMaterial({
    color: 0x282830, roughness: 0.85, metalness: 0.0,
  });
}

// ── Door panel shape with window cutout ───────────────
function buildDoorShape(): THREE.Shape {
  const half = DW / 2;
  const hh = DH / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, -hh);
  shape.lineTo(half, -hh);
  shape.lineTo(half, hh);
  shape.lineTo(-half, hh);
  shape.closePath();

  const hole = new THREE.Path();
  const wx1 = WX - WW / 2;
  const wx2 = WX + WW / 2;
  const wy1 = WY - DH / 2;
  const wy2 = wy1 + WH;
  hole.moveTo(wx1, wy1);
  hole.lineTo(wx2, wy1);
  hole.lineTo(wx2, wy2);
  hole.lineTo(wx1, wy2);
  hole.closePath();
  shape.holes.push(hole);

  return shape;
}

// ── Dashed connector ──────────────────────────────────
function dashedConnector(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3) {
  const mat = new THREE.LineDashedMaterial({
    color: DASH_COLOR, linewidth: 1, dashSize: 4, gapSize: 3,
    opacity: 0.5, transparent: true,
  });
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  scene.add(line);
}

// ── Scene builder ─────────────────────────────────────
function buildExplodedScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer, layers: Product['layers']) {
  // Environment
  renderer.toneMappingExposure = 0.90;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.background = new THREE.Color(0xf5f5f5);
  pmrem.dispose();

  const annotItems: { anchor: THREE.Vector3; label: string }[] = [];

  // ════════════════════════════════════════════════════
  // 1. PANEL CROSS-SECTION (centered, layers separated in Z)
  // ════════════════════════════════════════════════════
  // Use first 5 layers (SS face, PIR, Pb, PIR, SS face). Glass = layer 5 separated.
  const panelLayers = layers.slice(0, 5);
  const visualTs = panelLayers.map((l) => visualThickness(l));
  const totalVisT = visualTs.reduce((s, t) => s + t, 0);
  const totalSpan = totalVisT + PANEL_LAYER_GAP * (panelLayers.length - 1);
  let currentZ = -totalSpan / 2;

  panelLayers.forEach((layer, i) => {
    const vt = visualTs[i];
    const geo = new THREE.ExtrudeGeometry(buildDoorShape(), {
      depth: vt, bevelEnabled: false,
    });
    const mat = new THREE.MeshStandardMaterial({
      color: layer.color, roughness: layer.roughness, metalness: layer.metalness,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = currentZ;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);

    scene.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x1a2332, opacity: 0.12, transparent: true }),
    )).position.z = currentZ;

    annotItems.push({ anchor: new THREE.Vector3(DW / 2, 0, currentZ + vt / 2), label: layer.name });
    currentZ += vt + PANEL_LAYER_GAP;
  });

  // ════════════════════════════════════════════════════
  // 2. LEAD GLASS (forward Z)
  // ════════════════════════════════════════════════════
  const glassLayer = layers[5];
  if (glassLayer) {
    const glassVT = Math.max(visualThickness(glassLayer), 3);
    const glassZ = currentZ + GLASS_FORWARD;
    const wyC = WY - DH / 2 + WH / 2;

    const glassGeo = new THREE.BoxGeometry(WW, WH, glassVT);
    const glassMat = matGlass();
    glassMat.color.setHex(glassLayer.color);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(WX, wyC, glassZ);
    scene.add(glassMesh);

    // Outline
    const glassEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(glassGeo),
      new THREE.LineBasicMaterial({ color: 0x0284c7, opacity: 0.5, transparent: true }),
    );
    glassEdges.position.copy(glassMesh.position);
    scene.add(glassEdges);

    // Connector to assembled location
    dashedConnector(scene,
      new THREE.Vector3(WX, wyC, glassZ),
      new THREE.Vector3(WX, wyC, currentZ - PANEL_LAYER_GAP - 5));

    annotItems.push({ anchor: new THREE.Vector3(WX + WW / 2, wyC, glassZ), label: glassLayer.name });
  }

  // ════════════════════════════════════════════════════
  // 3. FRAME (kusen): sill, jambL, jambR — radial outward
  // ════════════════════════════════════════════════════
  const frameMat = matFrame();
  const frameZ = -totalSpan / 2 - 25;  // behind panel stack

  // Bottom sill: drops down
  const sillGeo = new THREE.BoxGeometry(DW + FT * 2, FT, DT + 4);
  const sillExploded = new THREE.Mesh(sillGeo, frameMat);
  sillExploded.position.set(0, -DH / 2 - FT / 2 - FRAME_RADIAL, frameZ);
  scene.add(sillExploded);
  dashedConnector(scene,
    new THREE.Vector3(0, -DH / 2 - FT / 2 - FRAME_RADIAL, frameZ),
    new THREE.Vector3(0, -DH / 2 - FT / 2, frameZ));
  annotItems.push({ anchor: new THREE.Vector3(0, -DH / 2 - FT / 2 - FRAME_RADIAL, frameZ), label: 'Sill (Threshold)' });

  // Left jamb: flies left
  const jambGeo = new THREE.BoxGeometry(FT, DH + FT, DT + 4);
  const jambL = new THREE.Mesh(jambGeo, frameMat);
  jambL.position.set(-DW / 2 - FT / 2 - FRAME_RADIAL, 0, frameZ);
  scene.add(jambL);
  dashedConnector(scene,
    new THREE.Vector3(-DW / 2 - FT / 2 - FRAME_RADIAL, 0, frameZ),
    new THREE.Vector3(-DW / 2 - FT / 2, 0, frameZ));
  annotItems.push({ anchor: new THREE.Vector3(-DW / 2 - FT / 2 - FRAME_RADIAL, 0, frameZ), label: 'Jamb Kiri (Kusen)' });

  // Right jamb: flies right
  const jambR = jambL.clone();
  jambR.position.x = DW / 2 + FT / 2 + FRAME_RADIAL;
  scene.add(jambR);
  dashedConnector(scene,
    new THREE.Vector3(DW / 2 + FT / 2 + FRAME_RADIAL, 0, frameZ),
    new THREE.Vector3(DW / 2 + FT / 2, 0, frameZ));
  annotItems.push({ anchor: new THREE.Vector3(DW / 2 + FT / 2 + FRAME_RADIAL, 0, frameZ), label: 'Jamb Kanan (Kusen)' });

  // ════════════════════════════════════════════════════
  // 4. HOUSING (motor enclosure) — flies up
  // ════════════════════════════════════════════════════
  const HR = 7;
  const hProf = new THREE.Shape();
  hProf.moveTo(-HDT / 2, 0);
  hProf.lineTo(-HDT / 2, HH);
  hProf.lineTo(HDT / 2 - HR, HH);
  hProf.quadraticCurveTo(HDT / 2, HH, HDT / 2, HH - HR);
  hProf.lineTo(HDT / 2, HR);
  hProf.quadraticCurveTo(HDT / 2, 0, HDT / 2 - HR, 0);
  hProf.lineTo(-HDT / 2, 0);

  const housingGeo = new THREE.ExtrudeGeometry(hProf, { depth: HW, bevelEnabled: false });
  housingGeo.rotateY(-Math.PI / 2);
  housingGeo.translate(HW / 2, 0, 0);

  const housingY_assembled = DH / 2;
  const housingY_exploded = housingY_assembled + HOUSING_UP;
  const housing = new THREE.Mesh(housingGeo, matHousing());
  housing.position.set(0, housingY_exploded, DT / 2 - 4);
  housing.castShadow = true;
  scene.add(housing);
  dashedConnector(scene,
    new THREE.Vector3(0, housingY_exploded, DT / 2 - 4),
    new THREE.Vector3(0, housingY_assembled, DT / 2 - 4));
  annotItems.push({ anchor: new THREE.Vector3(0, housingY_exploded + HH / 2, DT / 2 - 4), label: 'Motor Housing (Aluminum)' });

  // Housing LED indicator
  const indicatorGeo = new THREE.BoxGeometry(HW - 4, 2.5, 0.2);
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0x3a4350, roughness: 0.5, metalness: 0.4, emissive: 0x1a1f2e,
  });
  const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
  indicator.position.set(0, housingY_exploded + HH * 0.6, 0.15);
  scene.add(indicator);

  // ════════════════════════════════════════════════════
  // 5. TRACK RAIL — slightly above frame, between housing & panel
  // ════════════════════════════════════════════════════
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x404850, roughness: 0.15, metalness: 0.9,
  });
  const trackY_assembled = housingY_assembled + 3;
  const trackY_exploded = trackY_assembled + TRACK_OFFSET;
  const trackGeo = new THREE.BoxGeometry(HW - 6, 4, 5);
  const track = new THREE.Mesh(trackGeo, trackMat);
  track.position.set(0, trackY_exploded, -2);
  scene.add(track);
  dashedConnector(scene,
    new THREE.Vector3(0, trackY_exploded, -2),
    new THREE.Vector3(0, trackY_assembled, -2));
  annotItems.push({ anchor: new THREE.Vector3(0, trackY_exploded, -2), label: 'Sliding Track Rail' });

  // ════════════════════════════════════════════════════
  // 6. HANDLE — flies forward (Z+)
  // ════════════════════════════════════════════════════
  const handleMat = matSS(0.1, 0.94);
  const handleGeo = new THREE.CylinderGeometry(0.9, 0.9, 28, 16);
  const handleX_assembled = DW / 2 - 12;
  const handleZ_exploded = DT / 2 + 3 + HANDLE_FORWARD;
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(handleX_assembled, 0, handleZ_exploded);
  scene.add(handle);
  dashedConnector(scene,
    new THREE.Vector3(handleX_assembled, 0, handleZ_exploded),
    new THREE.Vector3(handleX_assembled, 0, DT / 2 + 3));
  annotItems.push({ anchor: new THREE.Vector3(handleX_assembled, 0, handleZ_exploded), label: 'Handle SS' });

  // ════════════════════════════════════════════════════
  // 7. SENSOR boxes — fly outward (X)
  // ════════════════════════════════════════════════════
  const sensorGeo = new THREE.BoxGeometry(4, 8, 3);
  [-14, 14].forEach((xPos) => {
    const direction = Math.sign(xPos);
    const sensor = new THREE.Mesh(sensorGeo, matSensor());
    const xExploded = xPos + direction * SENSOR_OUT;
    sensor.position.set(xExploded, 0, -12);
    scene.add(sensor);
    dashedConnector(scene,
      new THREE.Vector3(xExploded, 0, -12),
      new THREE.Vector3(xPos, 0, -12));
  });
  annotItems.push({ anchor: new THREE.Vector3(SENSOR_OUT + 14, 0, -12), label: 'Motion Sensor' });

  // Indicator LEDs (green, amber)
  const matGreen = new THREE.MeshStandardMaterial({
    color: 0x22c55e, roughness: 0.2, metalness: 0.1,
    emissive: 0x16a34a, emissiveIntensity: 0.5,
  });
  const matAmber = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, roughness: 0.2, metalness: 0.1,
    emissive: 0xd97706, emissiveIntensity: 0.4,
  });
  const sensorY_exploded = housingY_exploded + HH * 0.55;
  const sGreen = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), matGreen);
  sGreen.position.set(-HW / 2 + 10, sensorY_exploded, 0.15);
  scene.add(sGreen);
  const sAmber = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 8), matAmber);
  sAmber.position.set(-HW / 2 + 18, sensorY_exploded, 0.15);
  scene.add(sAmber);

  // ════════════════════════════════════════════════════
  // 8. FLOOR GUIDE — drops down
  // ════════════════════════════════════════════════════
  const floorGuideY_assembled = -DH / 2 - FT - 1.5;
  const floorGuideY_exploded = floorGuideY_assembled - FLOORGUIDE_DOWN;
  const floorGuide = new THREE.Mesh(
    new THREE.BoxGeometry(DW + FT * 2, 1.5, 5),
    matSS(0.2, 0.85),
  );
  floorGuide.position.set(0, floorGuideY_exploded, 0);
  scene.add(floorGuide);
  dashedConnector(scene,
    new THREE.Vector3(0, floorGuideY_exploded, 0),
    new THREE.Vector3(0, floorGuideY_assembled, 0));
  annotItems.push({ anchor: new THREE.Vector3(0, floorGuideY_exploded, 0), label: 'Floor Guide Rail' });

  // ════════════════════════════════════════════════════
  // 9. PB STRIPE (lead lining at top edge)
  // ════════════════════════════════════════════════════
  const pbStripeY_assembled = DH / 2 - 1.25;
  const pbStripeZ_exploded = currentZ + 25;  // slight forward of last panel layer
  const pbStripe = new THREE.Mesh(
    new THREE.BoxGeometry(DW - 4, 2.5, 2),
    matLead(),
  );
  pbStripe.position.set(0, pbStripeY_assembled, pbStripeZ_exploded);
  scene.add(pbStripe);
  dashedConnector(scene,
    new THREE.Vector3(0, pbStripeY_assembled, pbStripeZ_exploded),
    new THREE.Vector3(0, pbStripeY_assembled, 0));
  annotItems.push({ anchor: new THREE.Vector3(-DW / 2 - 5, pbStripeY_assembled, pbStripeZ_exploded), label: 'Pb Strip 2mm (top edge)' });

  // ════════════════════════════════════════════════════
  // 10. EPDM gasket (representative — top piece flying up slight)
  // ════════════════════════════════════════════════════
  const epdmGeo = new THREE.BoxGeometry(DW, 1.8, DT + 2);
  const epdm = new THREE.Mesh(epdmGeo, matEpdm());
  epdm.position.set(0, DH / 2 + 18, frameZ + 5);
  scene.add(epdm);
  dashedConnector(scene,
    new THREE.Vector3(0, DH / 2 + 18, frameZ + 5),
    new THREE.Vector3(0, DH / 2, 0));
  annotItems.push({ anchor: new THREE.Vector3(-DW / 2 + 10, DH / 2 + 18, frameZ + 5), label: 'EPDM Gasket Seal' });

  // ── Annotations ──
  placeAnnotations(scene, annotItems, DW / 2 + 100, [-DH / 2 - FRAME_RADIAL - 20, DH / 2 + HOUSING_UP + 30]);

  // ── Total thickness dimension marker (panel cross-section span) ──
  const arrowMat = new THREE.LineBasicMaterial({ color: 0x374151, opacity: 0.6, transparent: true });
  const zStart = -totalSpan / 2;
  const zFinal = -totalSpan / 2 + totalSpan;
  const arrowY = -DH / 2 - 25;

  const arrowPts = [
    new THREE.Vector3(-DW / 2 - 25, arrowY, zStart),
    new THREE.Vector3(-DW / 2 - 25, arrowY, zFinal),
  ];
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arrowPts), arrowMat));

  [zStart, zFinal].forEach((zPos) => {
    const tickPts = [
      new THREE.Vector3(-DW / 2 - 30, arrowY, zPos),
      new THREE.Vector3(-DW / 2 - 20, arrowY, zPos),
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tickPts), arrowMat));
  });
}

// ── React component ───────────────────────────────────
export function HermeticDoorExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 100,
      maxDistance: 1400,
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
