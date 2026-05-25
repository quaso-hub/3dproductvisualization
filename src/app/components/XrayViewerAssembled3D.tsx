/**
 * XrayViewerAssembled3D.tsx — REWRITE 2026-05-25
 * ─────────────────────────────────────────────────────────────────
 * Real medical X-Ray Film Viewer LED double-bay (negatoscope).
 * Reference products: MEDIK YA-NS02D, Rooe AOT-1D, Mplent ZG-2.
 * See: docs/research/2026-05-25-xray-viewer-product-references.md
 *
 * KEY ARCHITECTURE FACTS (drives the geometry below):
 *   • Slim wall-mounted illuminator, ~820×500×30mm.
 *   • Two SIDE-BY-SIDE viewing panels (NOT stacked vertical).
 *   • Side-lit LED bars at top + bottom edge of each panel (NOT
 *     a back-mounted LED matrix). Light bounces through a 4mm
 *     acrylic light-guide plate then through the white diffuser.
 *   • Aluminium frame border ~25–40mm, brushed/anodized.
 *   • Silicone film clips along the top edge of each panel.
 *   • Right-side control strip: power button, ▲ ▼ buttons, 2-digit
 *     display, power LED dot.
 *   • Slim ABS rear housing with vent slots + IEC AC inlet.
 *   • VESA-style wall mount bracket on the back.
 *
 * COORDINATE SYSTEM (matches Hermetic/PbLead in this repo):
 *   • X = width (left/right)
 *   • Y = height (up/down)
 *   • Z = depth (out of wall toward viewer; +Z = front)
 *   • 1 unit = 10mm.
 *
 * PART IDS (group-level, proven in PbLead):
 *   frame · diffuser-left · diffuser-right · divider · led-edge ·
 *   film-clips · control-panel · back-housing · wall-bracket
 * ─────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset,
  downloadPNG,
  placeAnnotations,
} from '../lib/three-scene';
import { mat } from '../lib/materials';
import { useThreeScene } from '../hooks/useThreeScene';
import { useHighlightController } from '../hooks/useHighlightController';
import { ViewerControls } from './ViewerControls';

interface Props {
  product: Product;
}

// ── DIMENSIONS (1 unit = 10 mm) ──────────────────────────────
const FW = 82;        // overall width   (820 mm)
const FH = 50;        // overall height  (500 mm)
const FD = 3;         // overall depth   (30 mm)
const BORDER = 4;     // aluminium frame border thickness

const VIEW_W = FW - 2 * BORDER;     // 74 — combined viewing area width
const VIEW_H = FH - 2 * BORDER;     // 42 — viewing area height
const PANEL_GAP = 1.5;              // 15 mm vertical divider between panels
const PANEL_W = (VIEW_W - PANEL_GAP) / 2;  // 36.25
const PANEL_LX = -(PANEL_GAP / 2 + PANEL_W / 2); // -18.875
const PANEL_RX = +(PANEL_GAP / 2 + PANEL_W / 2); // +18.875

// Z-stack (front of unit at +FD/2 = +1.5)
const Z_FRAME_FRONT = FD / 2;             // +1.5
const Z_DIFFUSER_FRONT = FD / 2 - 0.1;    // +1.4 (slightly recessed)
const Z_DIFFUSER_BACK = 1.0;
const Z_LIGHTGUIDE_FRONT = 0.95;
const Z_LIGHTGUIDE_BACK = 0.55;
const Z_HOUSING_FRONT = -0.9;
const Z_HOUSING_BACK = -FD / 2;           // -1.5
const Z_BRACKET_BACK = -2.2;              // sticks slightly behind housing

// ── LOCAL MATERIALS (factories — per-viewer, can be disposed) ──
function matDiffuser() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xfafaf6,
    roughness: 0.55,
    metalness: 0,
    emissive: new THREE.Color(0xfff8e6),
    emissiveIntensity: 0.45,
    clearcoat: 0.2,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.6,
  });
}

function matLightGuide() {
  return new THREE.MeshStandardMaterial({
    color: 0xfffaf0,
    emissive: new THREE.Color(0xfff5e0),
    emissiveIntensity: 0.3,
    roughness: 0.4,
    metalness: 0,
  });
}

function matLEDStrip() {
  return new THREE.MeshStandardMaterial({
    color: 0xfff5d8,
    emissive: new THREE.Color(0xfff0c8),
    emissiveIntensity: 1.6,
    roughness: 0.25,
    metalness: 0,
  });
}

function matSilicone() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8ccd0,
    roughness: 0.55,
    metalness: 0,
  });
}

function matABSPanel() {
  return new THREE.MeshStandardMaterial({
    color: 0xeef0f2,
    roughness: 0.65,
    metalness: 0.05,
  });
}

function matLcdDisplay() {
  return new THREE.MeshStandardMaterial({
    color: 0x12141a,
    roughness: 0.3,
    metalness: 0.1,
    emissive: new THREE.Color(0x0a8d99),
    emissiveIntensity: 0.55,
  });
}

function matPowerLED() {
  return new THREE.MeshStandardMaterial({
    color: 0x66ffaa,
    emissive: new THREE.Color(0x22dd66),
    emissiveIntensity: 1.2,
    roughness: 0.3,
    metalness: 0,
  });
}

// ── HELPERS ──────────────────────────────────────────────────
function addBox(
  parent: THREE.Object3D,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  m: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// ── PART BUILDERS (each one tags userData.partId on a group) ──

function buildFrame(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'frame';
  scene.add(group);

  // Top border
  addBox(group, FW, BORDER, FD, 0, FH / 2 - BORDER / 2, 0, mat.ssBrushed);
  // Bottom border
  addBox(group, FW, BORDER, FD, 0, -FH / 2 + BORDER / 2, 0, mat.ssBrushed);
  // Left border
  addBox(group, BORDER, FH - 2 * BORDER, FD, -FW / 2 + BORDER / 2, 0, 0, mat.ssBrushed);
  // Right border
  addBox(group, BORDER, FH - 2 * BORDER, FD, FW / 2 - BORDER / 2, 0, 0, mat.ssBrushed);

  // Subtle dark inner lip around viewing aperture (gives the diffuser its
  // recessed look — 0.6u thick black trim ringing the inside of the border).
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x16181c,
    roughness: 0.55,
    metalness: 0.3,
  });
  const t = 0.6;
  // top trim
  addBox(group, VIEW_W, t, 0.3, 0, VIEW_H / 2 + t / 2, Z_FRAME_FRONT - 0.15, trimMat);
  // bottom trim
  addBox(group, VIEW_W, t, 0.3, 0, -VIEW_H / 2 - t / 2, Z_FRAME_FRONT - 0.15, trimMat);
  // left trim
  addBox(group, t, VIEW_H + 2 * t, 0.3, -VIEW_W / 2 - t / 2, 0, Z_FRAME_FRONT - 0.15, trimMat);
  // right trim
  addBox(group, t, VIEW_H + 2 * t, 0.3, VIEW_W / 2 + t / 2, 0, Z_FRAME_FRONT - 0.15, trimMat);
}

function buildPanels(scene: THREE.Object3D) {
  const dT = Z_DIFFUSER_FRONT - Z_DIFFUSER_BACK;
  const dCenterZ = (Z_DIFFUSER_FRONT + Z_DIFFUSER_BACK) / 2;

  // Left panel
  const left = new THREE.Mesh(
    new THREE.BoxGeometry(PANEL_W, VIEW_H, dT),
    matDiffuser(),
  );
  left.position.set(PANEL_LX, 0, dCenterZ);
  left.castShadow = true;
  left.receiveShadow = true;
  left.userData.partId = 'diffuser-left';
  scene.add(left);

  // Right panel — separate material instance so highlight can dim them independently
  const right = new THREE.Mesh(
    new THREE.BoxGeometry(PANEL_W, VIEW_H, dT),
    matDiffuser(),
  );
  right.position.set(PANEL_RX, 0, dCenterZ);
  right.castShadow = true;
  right.receiveShadow = true;
  right.userData.partId = 'diffuser-right';
  scene.add(right);
}

function buildDivider(scene: THREE.Object3D) {
  // Thin vertical aluminium bar between the two panels.
  const div = addBox(
    scene,
    PANEL_GAP, VIEW_H, FD * 0.95,
    0, 0, 0,
    mat.ssBrushed,
  );
  div.userData.partId = 'divider';
}

function buildLEDEdges(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'led-edge';
  scene.add(group);

  const ledMat = matLEDStrip();
  const lgMat = matLightGuide();

  const stripH = 0.7;          // edge LED bar height
  const stripD = 0.4;
  const stripZ = (Z_LIGHTGUIDE_FRONT + Z_LIGHTGUIDE_BACK) / 2;
  const topY = VIEW_H / 2 - stripH / 2;
  const botY = -VIEW_H / 2 + stripH / 2;

  for (const px of [PANEL_LX, PANEL_RX]) {
    // Top + bottom edge LED bars
    addBox(group, PANEL_W - 1.0, stripH, stripD, px, topY, stripZ, ledMat);
    addBox(group, PANEL_W - 1.0, stripH, stripD, px, botY, stripZ, ledMat);

    // Light-guide plate (acrylic, very faintly emissive — represents the
    // back-illuminated panel that distributes side-lit LED light evenly).
    addBox(
      group,
      PANEL_W - 0.4, VIEW_H - 2 * stripH - 0.2, Z_LIGHTGUIDE_FRONT - Z_LIGHTGUIDE_BACK,
      px, 0, (Z_LIGHTGUIDE_FRONT + Z_LIGHTGUIDE_BACK) / 2,
      lgMat,
    );
  }
}

function buildFilmClips(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'film-clips';
  scene.add(group);

  const clipMat = matSilicone();
  const clipW = 1.6;
  const clipH = 1.1;
  const clipD = 0.45;
  const clipZ = Z_FRAME_FRONT + clipD / 2 + 0.1;
  const clipY = VIEW_H / 2 - 0.9;   // sits just inside the top of the viewing area

  // 5 clips per panel, evenly spaced.
  for (const px of [PANEL_LX, PANEL_RX]) {
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 6;
      const cx = px - PANEL_W / 2 + t * PANEL_W;
      const clip = addBox(group, clipW, clipH, clipD, cx, clipY, clipZ, clipMat);
      clip.rotation.x = -0.18; // slight tilt — suggests spring tension on top edge
    }
  }
}

function buildControlPanel(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'control-panel';
  scene.add(group);

  // Control strip lives on the right-hand frame border.
  // Right border center: x = FW/2 - BORDER/2.
  const cx = FW / 2 - BORDER / 2;
  const cz = Z_FRAME_FRONT + 0.05; // slightly proud of frame surface

  // Recessed dark backing strip.
  const stripBgMat = new THREE.MeshStandardMaterial({
    color: 0x1c1f24,
    roughness: 0.5,
    metalness: 0.2,
  });
  addBox(group, BORDER * 0.7, 30, 0.18, cx, 0, cz, stripBgMat);

  // 2-digit LCD-style readout near the top.
  addBox(group, BORDER * 0.5, 3.0, 0.12, cx, 11.5, cz + 0.13, matLcdDisplay());

  // Small brand label above the readout.
  const labelMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.4,
    metalness: 0.3,
  });
  addBox(group, BORDER * 0.4, 1.2, 0.06, cx, 13.6, cz + 0.1, labelMat);

  // Four cylindrical buttons (POWER · BRIGHT▲ · BRIGHT▼ · MODE).
  const btnR = 0.7;
  const btnH = 0.4;
  const btnGeo = new THREE.CylinderGeometry(btnR, btnR, btnH, 18);
  for (let i = 0; i < 4; i++) {
    const by = 6 - i * 4;        // 6, 2, -2, -6
    const btn = new THREE.Mesh(btnGeo, mat.ssMatte);
    btn.rotation.x = Math.PI / 2; // axis -> +Z (face viewer)
    btn.position.set(cx, by, cz + btnH / 2 + 0.05);
    btn.castShadow = true;
    group.add(btn);
  }

  // Power LED dot at bottom of strip.
  const ledGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.18, 16);
  const led = new THREE.Mesh(ledGeo, matPowerLED());
  led.rotation.x = Math.PI / 2;
  led.position.set(cx, -11.5, cz + 0.13);
  group.add(led);
}

function buildBackHousing(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'back-housing';
  scene.add(group);

  const housingMat = matABSPanel();

  // Main rear plate (slightly inset from the frame perimeter).
  addBox(
    group,
    FW - 0.6, FH - 0.6, Z_HOUSING_FRONT - Z_HOUSING_BACK,
    0, 0, (Z_HOUSING_FRONT + Z_HOUSING_BACK) / 2,
    housingMat,
  );

  // Vent slot rows along top + bottom of rear plate.
  const ventMat = mat.blackDetail;
  const slotZ = Z_HOUSING_BACK + 0.05;
  for (let i = -3; i <= 3; i++) {
    addBox(group, 4, 0.45, 0.12, i * 6, FH / 2 - 1.5, slotZ, ventMat);
    addBox(group, 4, 0.45, 0.12, i * 6, -FH / 2 + 1.5, slotZ, ventMat);
  }

  // IEC C14 AC inlet at bottom-right rear (recessed, dark).
  addBox(group, 3.0, 1.6, 0.35, FW / 2 - 7, -FH / 2 + 2.0, slotZ - 0.1, ventMat);

  // Brand sticker (small flat plate).
  const stickerMat = new THREE.MeshStandardMaterial({
    color: 0xf2f4f6,
    roughness: 0.6,
    metalness: 0,
  });
  addBox(group, 12, 4, 0.05, -FW / 2 + 12, -FH / 2 + 4, slotZ + 0.02, stickerMat);
}

function buildWallBracket(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'wall-bracket';
  scene.add(group);

  const bracketMat = mat.ssMatte;

  // VESA-style backplate sitting behind the housing.
  addBox(
    group,
    FW * 0.55, FH * 0.45, 0.45,
    0, 0, Z_BRACKET_BACK + 0.225,
    bracketMat,
  );

  // Two top hanging hooks (VESA-style French cleat hooks).
  for (const hx of [-FW * 0.18, FW * 0.18]) {
    // Vertical post
    addBox(group, 1.2, 4.0, 0.7, hx, FH * 0.18, Z_BRACKET_BACK + 0.55, bracketMat);
    // Forward-facing hook lip
    addBox(group, 1.2, 0.6, 1.6, hx, FH * 0.18 + 2.0, Z_BRACKET_BACK + 1.05, bracketMat);
  }

  // Two bottom mounting screws (cosmetic — small chrome dots).
  const screwGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12);
  for (const sx of [-FW * 0.18, FW * 0.18]) {
    const s = new THREE.Mesh(screwGeo, mat.chrome);
    s.rotation.x = Math.PI / 2;
    s.position.set(sx, -FH * 0.18, Z_BRACKET_BACK + 0.55);
    group.add(s);
  }
}

// ── SCENE BUILD ──────────────────────────────────────────────
function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // Environment + tone mapping (clinical look).
  renderer.toneMappingExposure = 0.95;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xeef3f7);
  pmrem.dispose();

  // Lights.
  scene.add(new THREE.AmbientLight(0xf5fafe, 0.35));
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xc8d2dc, 0.5));

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(80, 100, 120);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 500;
  key.shadow.camera.left = -150;
  key.shadow.camera.right = 150;
  key.shadow.camera.top = 100;
  key.shadow.camera.bottom = -100;
  key.shadow.bias = -0.0005;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.45);
  fill.position.set(-80, 60, 60);
  scene.add(fill);

  // Floor (catches contact shadow under the unit).
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    mat.floor,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -FH / 2 - 8;
  floor.receiveShadow = true;
  scene.add(floor);

  // Build hierarchy back-to-front.
  buildWallBracket(scene);
  buildBackHousing(scene);
  buildLEDEdges(scene);
  buildPanels(scene);
  buildDivider(scene);
  buildFrame(scene);
  buildFilmClips(scene);
  buildControlPanel(scene);

  // Annotations.
  placeAnnotations(
    scene,
    [
      { partId: 'frame',          anchor: new THREE.Vector3(-FW / 2 + BORDER / 2, FH / 2 - 2, Z_FRAME_FRONT), label: 'Aluminium Frame Brushed' },
      { partId: 'diffuser-left',  anchor: new THREE.Vector3(PANEL_LX, 0, Z_DIFFUSER_FRONT), label: 'Diffuser Acrylic — Left' },
      { partId: 'diffuser-right', anchor: new THREE.Vector3(PANEL_RX, 0, Z_DIFFUSER_FRONT), label: 'Diffuser Acrylic — Right' },
      { partId: 'divider',        anchor: new THREE.Vector3(0, -VIEW_H / 4, Z_FRAME_FRONT), label: 'Center Divider' },
      { partId: 'led-edge',       anchor: new THREE.Vector3(PANEL_LX, VIEW_H / 2 - 0.5, Z_LIGHTGUIDE_FRONT), label: 'Side-Lit LED 8000K · >10,000 LUX' },
      { partId: 'film-clips',     anchor: new THREE.Vector3(PANEL_RX, VIEW_H / 2 - 0.5, Z_FRAME_FRONT + 0.6), label: 'Silicone Film Clips' },
      { partId: 'control-panel',  anchor: new THREE.Vector3(FW / 2 - BORDER / 2, 6, Z_FRAME_FRONT + 0.4), label: 'Control Panel · PWR ▲▼ · LCD' },
      { partId: 'back-housing',   anchor: new THREE.Vector3(FW / 2 - 7, -FH / 2 + 2, Z_HOUSING_BACK), label: 'ABS Housing + AC Inlet' },
      { partId: 'wall-bracket',   anchor: new THREE.Vector3(0, FH * 0.18, Z_BRACKET_BACK), label: 'Wall Mount Bracket' },
    ],
    FW / 2 + 30,
    [-FH / 2 - 5, FH / 2 + 15],
  );
}

// ── REACT COMPONENT ──────────────────────────────────────────
export function XrayViewerAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );
  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 50,
      maxDistance: 600,
    },
    onInit: (refs) => {
      buildScene(refs.scene, refs.renderer);
      const p = product.cameraPresets[0];
      if (p) applyCameraPreset(refs, p.position, p.target);
      attachHighlight(refs);
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
      setTimeout(() => {
        goTo(p);
        setTimeout(() => dl(p.name), 220);
      }, i * 520),
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

export default XrayViewerAssembled3D;
