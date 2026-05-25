/**
 * XrayViewerExploded3D.tsx — REWRITE 2026-05-25
 * ─────────────────────────────────────────────────────────────────
 * Exploded counterpart of XrayViewerAssembled3D.
 *
 * Each major part is built once at its assembled position, then translated
 * outward along an axis that makes the construction visible:
 *
 *   • Frame        → split into 4 strips, each pushed radially +Y/-Y/+X/-X
 *   • Diffusers    → forward (+Z) — front layer
 *   • LED edges    → middle Z, slight forward shift to show light path
 *   • Light-guide  → middle Z (bundled with led-edge group)
 *   • Film clips   → up (+Y) above frame
 *   • Divider      → forward (+Z), centered
 *   • Control panel→ right (+X) outward beyond frame
 *   • Back housing → backward (−Z)
 *   • Wall bracket → far backward (−Z), past housing
 *
 * Dashed connectors link each exploded position to its assembled anchor.
 *
 * Coordinate convention identical to the assembled file.
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

// ── DIMENSIONS (mirror Assembled, 1 unit = 10 mm) ────────────
const FW = 82;
const FH = 50;
const FD = 3;
const BORDER = 4;

const VIEW_W = FW - 2 * BORDER;
const VIEW_H = FH - 2 * BORDER;
const PANEL_GAP = 1.5;
const PANEL_W = (VIEW_W - PANEL_GAP) / 2;
const PANEL_LX = -(PANEL_GAP / 2 + PANEL_W / 2);
const PANEL_RX = +(PANEL_GAP / 2 + PANEL_W / 2);

// Z stack (assembled positions used for dashed-line anchors).
const Z_FRAME = 0;
const Z_DIFFUSER = 1.2;
const Z_LIGHT = 0.75;
const Z_HOUSING = -1.2;
const Z_BRACKET = -2.0;

// Explode offsets.
const EXPLODE_FRAME = 12;       // frame strips fly outward by this much
const EXPLODE_DIFFUSER_Z = 22;  // diffusers fly forward
const EXPLODE_LED_Z = 14;       // LED layer forward, but less than diffusers
const EXPLODE_DIVIDER_Z = 32;   // divider farther forward
const EXPLODE_CLIPS_Y = 14;     // clips fly straight up
const EXPLODE_CONTROL_X = 18;   // control panel flies right
const EXPLODE_HOUSING_Z = -14;  // housing flies back
const EXPLODE_BRACKET_Z = -28;  // bracket flies further back

const DASH_COLOR = 0x4b6075;

// ── LOCAL MATERIALS (factories — identical to assembled) ─────
function matDiffuser() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xfafaf6,
    roughness: 0.55,
    metalness: 0,
    emissive: new THREE.Color(0xfff8e6),
    emissiveIntensity: 0.35,
    clearcoat: 0.2,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.6,
    transparent: true,
    opacity: 0.92,
  });
}
function matLightGuide() {
  return new THREE.MeshStandardMaterial({
    color: 0xfffaf0,
    emissive: new THREE.Color(0xfff5e0),
    emissiveIntensity: 0.25,
    roughness: 0.45,
    metalness: 0,
    transparent: true,
    opacity: 0.85,
  });
}
function matLEDStrip() {
  return new THREE.MeshStandardMaterial({
    color: 0xfff5d8,
    emissive: new THREE.Color(0xfff0c8),
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0,
  });
}
function matSilicone() {
  return new THREE.MeshStandardMaterial({
    color: 0xc8ccd0, roughness: 0.55, metalness: 0,
  });
}
function matABSPanel() {
  return new THREE.MeshStandardMaterial({
    color: 0xeef0f2, roughness: 0.65, metalness: 0.05,
  });
}
function matLcdDisplay() {
  return new THREE.MeshStandardMaterial({
    color: 0x12141a,
    roughness: 0.3, metalness: 0.1,
    emissive: new THREE.Color(0x0a8d99),
    emissiveIntensity: 0.55,
  });
}
function matPowerLED() {
  return new THREE.MeshStandardMaterial({
    color: 0x66ffaa,
    emissive: new THREE.Color(0x22dd66),
    emissiveIntensity: 1.2,
    roughness: 0.3, metalness: 0,
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

function dashedConnector(scene: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  const m = new THREE.LineDashedMaterial({
    color: DASH_COLOR,
    linewidth: 1,
    dashSize: 1.4,
    gapSize: 1.0,
    opacity: 0.55,
    transparent: true,
  });
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, m);
  line.computeLineDistances();
  scene.add(line);
}

// ── PART BUILDERS (each returns the visual anchor of its exploded copy) ──

function buildFrameExploded(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'frame';
  scene.add(group);

  // Top strip — pushed up.
  const topAssembledY = FH / 2 - BORDER / 2;
  const topY = topAssembledY + EXPLODE_FRAME;
  addBox(group, FW, BORDER, FD, 0, topY, Z_FRAME, mat.ssBrushed);
  dashedConnector(group,
    new THREE.Vector3(0, topAssembledY, Z_FRAME),
    new THREE.Vector3(0, topY - BORDER / 2, Z_FRAME));

  // Bottom strip — pushed down.
  const botAssembledY = -FH / 2 + BORDER / 2;
  const botY = botAssembledY - EXPLODE_FRAME;
  addBox(group, FW, BORDER, FD, 0, botY, Z_FRAME, mat.ssBrushed);
  dashedConnector(group,
    new THREE.Vector3(0, botAssembledY, Z_FRAME),
    new THREE.Vector3(0, botY + BORDER / 2, Z_FRAME));

  // Left strip — pushed left.
  const leftAssembledX = -FW / 2 + BORDER / 2;
  const leftX = leftAssembledX - EXPLODE_FRAME;
  addBox(group, BORDER, FH - 2 * BORDER, FD, leftX, 0, Z_FRAME, mat.ssBrushed);
  dashedConnector(group,
    new THREE.Vector3(leftAssembledX, 0, Z_FRAME),
    new THREE.Vector3(leftX + BORDER / 2, 0, Z_FRAME));

  // Right strip — pushed right.
  const rightAssembledX = FW / 2 - BORDER / 2;
  const rightX = rightAssembledX + EXPLODE_FRAME;
  addBox(group, BORDER, FH - 2 * BORDER, FD, rightX, 0, Z_FRAME, mat.ssBrushed);
  dashedConnector(group,
    new THREE.Vector3(rightAssembledX, 0, Z_FRAME),
    new THREE.Vector3(rightX - BORDER / 2, 0, Z_FRAME));
}

function buildDiffuserExploded(scene: THREE.Object3D) {
  const dT = 0.4;
  const z = Z_DIFFUSER + EXPLODE_DIFFUSER_Z;

  const left = new THREE.Mesh(
    new THREE.BoxGeometry(PANEL_W, VIEW_H, dT),
    matDiffuser(),
  );
  left.position.set(PANEL_LX, 0, z);
  left.castShadow = true;
  left.receiveShadow = true;
  left.userData.partId = 'diffuser-left';
  scene.add(left);
  dashedConnector(scene,
    new THREE.Vector3(PANEL_LX, 0, Z_DIFFUSER),
    new THREE.Vector3(PANEL_LX, 0, z - dT / 2));

  const right = new THREE.Mesh(
    new THREE.BoxGeometry(PANEL_W, VIEW_H, dT),
    matDiffuser(),
  );
  right.position.set(PANEL_RX, 0, z);
  right.castShadow = true;
  right.receiveShadow = true;
  right.userData.partId = 'diffuser-right';
  scene.add(right);
  dashedConnector(scene,
    new THREE.Vector3(PANEL_RX, 0, Z_DIFFUSER),
    new THREE.Vector3(PANEL_RX, 0, z - dT / 2));
}

function buildLightEngineExploded(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'led-edge';
  scene.add(group);

  const z = Z_LIGHT + EXPLODE_LED_Z;
  const ledMat = matLEDStrip();
  const lgMat = matLightGuide();

  const stripH = 0.7;
  const stripD = 0.4;
  const lgT = 0.4;

  for (const px of [PANEL_LX, PANEL_RX]) {
    const topY = VIEW_H / 2 - stripH / 2;
    const botY = -VIEW_H / 2 + stripH / 2;
    addBox(group, PANEL_W - 1.0, stripH, stripD, px, topY, z + 0.6, ledMat);
    addBox(group, PANEL_W - 1.0, stripH, stripD, px, botY, z + 0.6, ledMat);

    // Light-guide plate.
    addBox(
      group,
      PANEL_W - 0.4, VIEW_H - 2 * stripH - 0.2, lgT,
      px, 0, z,
      lgMat,
    );

    // Single connector per panel from LG plate center back to assembled.
    dashedConnector(group,
      new THREE.Vector3(px, 0, Z_LIGHT),
      new THREE.Vector3(px, 0, z - lgT / 2));
  }
}

function buildDividerExploded(scene: THREE.Object3D) {
  const z = Z_FRAME + EXPLODE_DIVIDER_Z;
  const div = addBox(
    scene,
    PANEL_GAP, VIEW_H, FD * 0.95,
    0, 0, z,
    mat.ssBrushed,
  );
  div.userData.partId = 'divider';
  dashedConnector(scene,
    new THREE.Vector3(0, 0, Z_FRAME),
    new THREE.Vector3(0, 0, z - FD / 2));
}

function buildFilmClipsExploded(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'film-clips';
  scene.add(group);

  const clipMat = matSilicone();
  const clipW = 1.6;
  const clipH = 1.1;
  const clipD = 0.45;
  const yLift = EXPLODE_CLIPS_Y;
  const baseY = VIEW_H / 2 - 0.9;
  const clipY = baseY + yLift;
  const clipZ = Z_FRAME + 1.6;

  for (const px of [PANEL_LX, PANEL_RX]) {
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 6;
      const cx = px - PANEL_W / 2 + t * PANEL_W;
      const clip = addBox(group, clipW, clipH, clipD, cx, clipY, clipZ, clipMat);
      clip.rotation.x = -0.18;
    }
    // One connector per panel cluster (from cluster centroid down to assembled top edge).
    dashedConnector(group,
      new THREE.Vector3(px, baseY, clipZ),
      new THREE.Vector3(px, clipY - clipH / 2, clipZ));
  }
}

function buildControlPanelExploded(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'control-panel';
  scene.add(group);

  const cxAssembled = FW / 2 - BORDER / 2;
  const cx = cxAssembled + EXPLODE_CONTROL_X;
  const cz = Z_FRAME + 1.6;

  // Backing strip.
  const stripBgMat = new THREE.MeshStandardMaterial({
    color: 0x1c1f24, roughness: 0.5, metalness: 0.2,
  });
  addBox(group, BORDER * 0.7, 30, 0.18, cx, 0, cz, stripBgMat);

  // LCD readout.
  addBox(group, BORDER * 0.5, 3.0, 0.12, cx, 11.5, cz + 0.13, matLcdDisplay());

  // Brand label.
  const labelMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.4, metalness: 0.3,
  });
  addBox(group, BORDER * 0.4, 1.2, 0.06, cx, 13.6, cz + 0.1, labelMat);

  // Buttons.
  const btnR = 0.7;
  const btnH = 0.4;
  const btnGeo = new THREE.CylinderGeometry(btnR, btnR, btnH, 18);
  for (let i = 0; i < 4; i++) {
    const by = 6 - i * 4;
    const btn = new THREE.Mesh(btnGeo, mat.ssMatte);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(cx, by, cz + btnH / 2 + 0.05);
    btn.castShadow = true;
    group.add(btn);
  }

  // Power LED.
  const led = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.18, 16),
    matPowerLED(),
  );
  led.rotation.x = Math.PI / 2;
  led.position.set(cx, -11.5, cz + 0.13);
  group.add(led);

  // Connector — from outside edge of frame to backing strip back face.
  dashedConnector(group,
    new THREE.Vector3(cxAssembled, 0, cz),
    new THREE.Vector3(cx - BORDER * 0.35, 0, cz));
}

function buildBackHousingExploded(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'back-housing';
  scene.add(group);

  const housingMat = matABSPanel();
  const z = Z_HOUSING + EXPLODE_HOUSING_Z;
  const housingT = 0.6;

  addBox(group, FW - 0.6, FH - 0.6, housingT, 0, 0, z, housingMat);

  const ventMat = mat.blackDetail;
  const slotZ = z - housingT / 2 - 0.06;
  for (let i = -3; i <= 3; i++) {
    addBox(group, 4, 0.45, 0.12, i * 6, FH / 2 - 1.5, slotZ, ventMat);
    addBox(group, 4, 0.45, 0.12, i * 6, -FH / 2 + 1.5, slotZ, ventMat);
  }

  // IEC AC inlet recess.
  addBox(group, 3.0, 1.6, 0.35, FW / 2 - 7, -FH / 2 + 2.0, slotZ - 0.1, ventMat);

  // Brand sticker.
  const stickerMat = new THREE.MeshStandardMaterial({
    color: 0xf2f4f6, roughness: 0.6, metalness: 0,
  });
  addBox(group, 12, 4, 0.05, -FW / 2 + 12, -FH / 2 + 4, slotZ + 0.02, stickerMat);

  dashedConnector(group,
    new THREE.Vector3(0, 0, Z_HOUSING),
    new THREE.Vector3(0, 0, z + housingT / 2));
}

function buildWallBracketExploded(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'wall-bracket';
  scene.add(group);

  const bracketMat = mat.ssMatte;
  const z = Z_BRACKET + EXPLODE_BRACKET_Z;

  // VESA backplate.
  addBox(group, FW * 0.55, FH * 0.45, 0.45, 0, 0, z + 0.225, bracketMat);

  // Hooks.
  for (const hx of [-FW * 0.18, FW * 0.18]) {
    addBox(group, 1.2, 4.0, 0.7, hx, FH * 0.18, z + 0.55, bracketMat);
    addBox(group, 1.2, 0.6, 1.6, hx, FH * 0.18 + 2.0, z + 1.05, bracketMat);
  }

  // Screws.
  const screwGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12);
  for (const sx of [-FW * 0.18, FW * 0.18]) {
    const s = new THREE.Mesh(screwGeo, mat.chrome);
    s.rotation.x = Math.PI / 2;
    s.position.set(sx, -FH * 0.18, z + 0.55);
    group.add(s);
  }

  dashedConnector(group,
    new THREE.Vector3(0, 0, Z_BRACKET),
    new THREE.Vector3(0, 0, z + 0.45));
}

// ── SCENE BUILDER ────────────────────────────────────────────
function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  renderer.toneMappingExposure = 0.95;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xeef3f7);
  pmrem.dispose();

  // Lights.
  scene.add(new THREE.AmbientLight(0xf5fafe, 0.4));
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xc8d2dc, 0.5));

  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(80, 110, 140);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 600;
  key.shadow.camera.left = -180;
  key.shadow.camera.right = 180;
  key.shadow.camera.top = 120;
  key.shadow.camera.bottom = -120;
  key.shadow.bias = -0.0005;
  scene.add(key);

  scene.add((() => {
    const f = new THREE.DirectionalLight(0xc8d8ff, 0.45);
    f.position.set(-80, 60, 60);
    return f;
  })());

  // Floor.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), mat.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -FH / 2 - 14;
  floor.receiveShadow = true;
  scene.add(floor);

  // Build all parts in their exploded positions.
  buildWallBracketExploded(scene);
  buildBackHousingExploded(scene);
  buildLightEngineExploded(scene);
  buildDiffuserExploded(scene);
  buildDividerExploded(scene);
  buildFrameExploded(scene);
  buildFilmClipsExploded(scene);
  buildControlPanelExploded(scene);

  // Annotations sit at each exploded part centroid.
  placeAnnotations(
    scene,
    [
      { partId: 'frame',          anchor: new THREE.Vector3(0, FH / 2 + EXPLODE_FRAME, Z_FRAME), label: 'Aluminium Frame (4 strips)' },
      { partId: 'diffuser-left',  anchor: new THREE.Vector3(PANEL_LX, 0, Z_DIFFUSER + EXPLODE_DIFFUSER_Z), label: 'Diffuser — Left' },
      { partId: 'diffuser-right', anchor: new THREE.Vector3(PANEL_RX, 0, Z_DIFFUSER + EXPLODE_DIFFUSER_Z), label: 'Diffuser — Right' },
      { partId: 'led-edge',       anchor: new THREE.Vector3(PANEL_LX, 0, Z_LIGHT + EXPLODE_LED_Z), label: 'Side-Lit LED + Light Guide' },
      { partId: 'divider',        anchor: new THREE.Vector3(0, VIEW_H / 4, Z_FRAME + EXPLODE_DIVIDER_Z), label: 'Center Divider' },
      { partId: 'film-clips',     anchor: new THREE.Vector3(0, VIEW_H / 2 + EXPLODE_CLIPS_Y, Z_FRAME + 1.6), label: 'Silicone Film Clips' },
      { partId: 'control-panel',  anchor: new THREE.Vector3(FW / 2 + EXPLODE_CONTROL_X, 0, Z_FRAME + 1.6), label: 'Control Panel' },
      { partId: 'back-housing',   anchor: new THREE.Vector3(0, 0, Z_HOUSING + EXPLODE_HOUSING_Z), label: 'ABS Rear Housing' },
      { partId: 'wall-bracket',   anchor: new THREE.Vector3(0, 0, Z_BRACKET + EXPLODE_BRACKET_Z), label: 'Wall Mount Bracket' },
    ],
    FW / 2 + EXPLODE_CONTROL_X + 25,
    [-FH / 2 - 10, FH / 2 + EXPLODE_CLIPS_Y + 10],
  );
}

// ── REACT COMPONENT ──────────────────────────────────────────
export function XrayViewerExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );
  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 60,
      maxDistance: 800,
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
      `${product.id}-exploded-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
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

export default XrayViewerExploded3D;
