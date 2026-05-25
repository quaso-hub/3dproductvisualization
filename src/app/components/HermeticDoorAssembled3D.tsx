/**
 * HermeticDoorAssembled3D.tsx - ASSEMBLED VIEW (Production Quality)
 * ------------------------------─
 * Hermetic Auto Sliding Door in realistic closed position.
 * Features:
 * - RoomEnvironment for realistic PBR reflections
 * - Brushed stainless steel with proper metalness/roughness
 * - Door slightly offset to show sliding mechanism
 * - Professional medical/cleanroom aesthetic
 * ------------------------------─
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset, downloadPNG, placeAnnotations,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { useHighlightController } from '../hooks/useHighlightController';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// -─ Dimensi pintu (scene units, 1 unit = 10mm) -------
const DW  = 160;  // lebar pintu
const DH  = 210;  // tinggi pintu
const DT  = 6;    // tebal panel pintu (60 mm — research-driven, was 10/100mm)
                  // Real spec: BCMS 50mm, TanAc 60mm, Lesho 50mm. 100mm was thick.
const DOOR_OFFSET = 0;    // Pintu dalam posisi tertutup (closed)

// Window dalam pintu
const WW  = 30;
const WH  = 40;
const WX  = 0;
const WY  = 150;
const WT  = 0.6;

// Housing overhead - large D-profile aluminum extrusion
// Housing — overhead operator track + motor enclosure.
// BUGFIX 2026-05-25 (research-driven): previously HW=DW+20 (too narrow —
// real housing must span door-width × ~2 because door slides INTO it).
// HH=42 was too tall (real housings are 180-280mm = 18-28 scene units).
// HDT=28 was slightly thick (real ~200mm = 20 units). Fixed to match
// Portalp HDS / Lesho / TanAc datasheets.
// See: docs/research/2026-05-25-hermetic-door-references.md (§3, §6).
const HW  = DW * 2 - 10;  // 310 — door-width × 2 so door can slide INTO housing
const HH  = 22;           // 220mm — real-world housing height range 180-280
const HDT = 20;           // 200mm — real-world housing depth Portalp 201mm

// Frame
const FT  = 8;

// (Wall context removed Session 10 Item 1 — was blocking open/close scenario view.)

// -─ Materials -----------------------─

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
// (matWall retained as reference; no longer used after wall removal Session 10 Item 1.)
void matWall;

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

// -─ Door panel shape (dengan lubang jendela) --------

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

// -─ Scene builder ----------------------

function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {

  // - 0a. RoomEnvironment for realistic reflections (PBR) --
  renderer.toneMappingExposure = 0.90;  // reduce from default 1.2 - less silau
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.background = new THREE.Color(0xf5f5f5);
  pmrem.dispose();

  // - 0b. (Wall removed Session 10 Item 1 — clean scene for open/close scenario.)

  // - 1. Door frame (kusen) ----------------
  const frameMat = matFrame();

  // Bottom sill
  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(DW + FT * 2, FT, DT + 4),
    frameMat,
  );
  sill.position.set(0, -DH / 2 - FT / 2, 0);
  sill.castShadow = true;
  sill.userData.partId = 'frame';
  scene.add(sill);

  // Left jamb
  const jambL = new THREE.Mesh(
    new THREE.BoxGeometry(FT, DH + FT, DT + 4),
    frameMat,
  );
  jambL.position.set(-DW / 2 - FT / 2, 0, 0);
  jambL.castShadow = true;
  jambL.userData.partId = 'frame';
  scene.add(jambL);

  // Right jamb
  const jambR = jambL.clone();
  jambR.position.x = DW / 2 + FT / 2;
  jambR.userData.partId = 'frame';
  scene.add(jambR);

  // No separate top head - housing serves as the top structure (matches real hermetic doors)

  // - 2. Door panel with window cutout (OFFSET to show sliding) -
  const doorGeo = new THREE.ExtrudeGeometry(buildDoorShape(), {
    depth: DT,
    bevelEnabled: false,
  });
  doorGeo.translate(0, 0, -DT / 2);

  const doorMesh = new THREE.Mesh(doorGeo, matSS());
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  doorMesh.position.x = DOOR_OFFSET;  // Offset left to show sliding
  doorMesh.userData.partId = 'door-panel';
  scene.add(doorMesh);

  // Subtle edges
  scene.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo),
    new THREE.LineBasicMaterial({ color: 0x1a2332, opacity: 0.1, transparent: true }),
  )).position.copy(doorMesh.position);

  // - 2b. EPDM rubber gasket strips (dark seal around door perimeter) -
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

  // - 2c. Horizontal bump guard strip (stainless, lower third) ─
  const bumpGuard = new THREE.Mesh(
    new THREE.BoxGeometry(DW - 8, 5, 2),
    matSS(0.12, 0.92),
  );
  bumpGuard.position.set(0, -DH / 4, DT / 2 + 0.5);
  scene.add(bumpGuard);

  // - 3. Lead Glass in window cutout -----------─
  const glassGeo = new THREE.BoxGeometry(WW, WH, WT);
  const glassMesh = new THREE.Mesh(glassGeo, matGlass());
  glassMesh.position.set(DOOR_OFFSET + WX, WY + WH / 2 - DH / 2, 0);
  glassMesh.userData.partId = 'lead-glass';
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

  // - 4. Pb lead stripe (visible at top edge, full width) --─
  const pbStripe = new THREE.Mesh(
    new THREE.BoxGeometry(DW - 4, 2.5, 2),
    matLead(),
  );
  pbStripe.position.set(DOOR_OFFSET, DH / 2 - 1.25, 0);
  pbStripe.userData.partId = 'pb-stripe';
  scene.add(pbStripe);

  // ── 5. RECESSED FLUSH PULL (cleanroom-correct, NOT a protruding bar) ──
  // BUGFIX 2026-05-25 (research-driven): previously used a vertical
  // CylinderGeometry(0.9, 0.9, 28) protruding 3+ units from door face plus
  // 2 horizontal bracket cylinders. Real OR hermetic doors are FLUSH —
  // confirmed across TanAc TH8 ("60mm flush door leaf and flush integrated
  // components"), Door Studio Asia, Grupsa, Portalp, Manusa, Dortek. The
  // protruding bar handle was the user's "kapal pecah" complaint.
  // Replacement: recessed pull pocket (rectangular cutout reading) on
  // cleanroom side. Real hermetic doors use either a finger pull (palm-size
  // rectangular recess ~120×40mm) or a low-profile push-plate.
  // See: docs/research/2026-05-25-hermetic-door-references.md.
  const handleMat = matSS(0.1, 0.94);
  // Outer recessed bezel — sunken pocket frame, slightly proud of door face
  const pullPocketGeo = new THREE.BoxGeometry(2.5, 12, 0.4);
  const pullPocket = new THREE.Mesh(pullPocketGeo, handleMat);
  pullPocket.position.set(DW / 2 - 8, 0, DT / 2 + 0.2);
  pullPocket.userData.partId = 'handle';
  pullPocket.castShadow = true;
  scene.add(pullPocket);
  // Inner dark recess — pocket interior (shadow read for finger grip)
  const pullRecessMat = new THREE.MeshStandardMaterial({
    color: 0x1a1d22,
    roughness: 0.85,
    metalness: 0.15,
  });
  const pullRecessGeo = new THREE.BoxGeometry(1.4, 10, 0.45);
  const pullRecess = new THREE.Mesh(pullRecessGeo, pullRecessMat);
  pullRecess.position.set(DW / 2 - 8, 0, DT / 2 - 0.05);
  pullRecess.userData.partId = 'handle';
  scene.add(pullRecess);

  // - 6. Overhead housing - D-profile aluminum extrusion ---─
  const housingMat = matHousing();
  const housingY   = DH / 2;  // housing bottom flush with door top

  // Cross-section profile: rounded front corners, flat back
  // shape.x = world-Z (depth), shape.y = world-Y (height)
  const HR = 7;  // front corner radius
  const hProf = new THREE.Shape();
  hProf.moveTo(-HDT / 2, 0);
  hProf.lineTo(-HDT / 2, HH);
  hProf.lineTo(HDT / 2 - HR, HH);
  hProf.quadraticCurveTo(HDT / 2, HH, HDT / 2, HH - HR);
  hProf.lineTo(HDT / 2, HR);
  hProf.quadraticCurveTo(HDT / 2, 0, HDT / 2 - HR, 0);
  hProf.lineTo(-HDT / 2, 0);

  const housingGeo = new THREE.ExtrudeGeometry(hProf, { depth: HW, bevelEnabled: false });
  housingGeo.rotateY(-Math.PI / 2);         // extrusion axis → world X
  housingGeo.translate(HW / 2, 0, 0);       // center in X

  const housing = new THREE.Mesh(housingGeo, housingMat);
  housing.position.set(0, housingY, DT / 2 - 4);  // protrudes forward from door face
  housing.castShadow = true;
  housing.userData.partId = 'housing';
  scene.add(housing);

  // Housing indicator LED strip (on front face)
  const indicatorGeo = new THREE.BoxGeometry(HW - 4, 2.5, 0.2);
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0x3a4350,
    roughness: 0.5,
    metalness: 0.4,
    emissive: 0x1a1f2e,
  });
  const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
  indicator.position.set(0, housingY + HH * 0.6, 0.15);
  indicator.userData.partId = 'housing';
  scene.add(indicator);

  // - 6b. Floor bottom guide rail -------------
  const floorGuide = new THREE.Mesh(
    new THREE.BoxGeometry(DW + FT * 2, 1.5, 5),
    matSS(0.2, 0.85),
  );
  floorGuide.position.set(0, -DH / 2 - FT - 1.5, 0);
  scene.add(floorGuide);

  // - 7. Sensor boxes (left/right of frame) --------
  const sensorGeo = new THREE.BoxGeometry(4, 8, 3);
  const sensorMat = matSensor();
  [-14, 14].forEach((xPos) => {
    const sensor = new THREE.Mesh(sensorGeo, sensorMat);
    sensor.position.set(xPos, 0, -12);
    sensor.userData.partId = 'sensor';
    scene.add(sensor);
  });

  // - 8. Sliding track rail + carriage hanger brackets ----
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x404850,
    roughness: 0.15,
    metalness: 0.9,
  });

  // Track rail: integrated at housing bottom, near front face
  const trackY      = housingY + 3;   // = 108, just inside housing bottom
  const track = new THREE.Mesh(
    new THREE.BoxGeometry(HW - 6, 4, 5),
    trackMat,
  );
  track.position.set(0, trackY, -2);
  track.userData.partId = 'track';
  scene.add(track);

  // Housing bottom flange: thin connecting lip that bridges housing base to frame jambs
  // Spans full frame width at housing bottom, creating seamless visual connection
  const flangeH = 4;
  const flange = new THREE.Mesh(
    new THREE.BoxGeometry(DW + FT * 2, flangeH, DT + 4),
    matSS(0.18, 0.80),
  );
  flange.position.set(0, housingY + flangeH / 2, 0);
  scene.add(flange);

  // - 9. Sensor indicator lights (front face, left side) --─
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

  const sensorFaceZ = 0.15;                    // housing front face at Z=0
  const housingYRef = housingY;
  const sensorY     = housingYRef + HH * 0.55;

  const sGreen = new THREE.Mesh(sensorGeoGreen, matGreen);
  sGreen.position.set(-HW / 2 + 10, sensorY, sensorFaceZ);
  sGreen.userData.partId = 'sensor';
  scene.add(sGreen);

  const sAmber = new THREE.Mesh(sensorGeoAmber, matAmber);
  sAmber.position.set(-HW / 2 + 18, sensorY, sensorFaceZ);
  sAmber.userData.partId = 'sensor';
  scene.add(sAmber);

  // - 10. Annotations (CSS2D) -----------------
  const zA  = 0;
  const hYR = housingY;

  placeAnnotations(
    scene,
    [
      { partId: 'housing',     anchor: new THREE.Vector3(0, hYR + HH / 2, zA),                         label: 'Electric Motor Housing' },
      { partId: 'track',       anchor: new THREE.Vector3(0, trackY, zA),                                label: 'Sliding Track Rail' },
      { partId: 'sensor',      anchor: new THREE.Vector3(-HW / 2 + 14, sensorY, zA),                   label: 'Sensor Indicator' },
      { partId: 'lead-glass',  anchor: new THREE.Vector3(DOOR_OFFSET + WX + WW / 2, WY + WH / 2 - DH / 2, zA), label: 'Lead Glass Pb 5mm' },
      { partId: 'door-panel',  anchor: new THREE.Vector3(DOOR_OFFSET - DW / 2, 0, zA),                 label: 'Stainless Steel' },
      { partId: 'pb-stripe',   anchor: new THREE.Vector3(DOOR_OFFSET, DH / 2 - 1.25, zA),              label: 'Lapis Pb 2mm' },
      { partId: 'handle',      anchor: new THREE.Vector3(DW / 2 - 12, 0, zA),                          label: 'Handle SS' },
    ],
    HW / 2 + 35,
    [-DH / 2 + 10, DH / 2 + HH + 10],
  );
}

// -─ React component --------------------─

export function HermeticDoorAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );
  const { attachHighlight } = useHighlightController();

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
      // Highlight system: scan scene for userData.partId + label data-part-id.
      attachHighlight(refs);
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
