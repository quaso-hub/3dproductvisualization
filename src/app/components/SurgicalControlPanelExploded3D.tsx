/**
 * SurgicalControlPanelExploded3D.tsx — REWRITE 2026-05-25
 * ─────────────────────────────────────────────────────────────────
 * Exploded view companion to SurgicalControlPanelAssembled3D.
 *
 * Strategy (mirrors Hermetic / PbLead / Xray exploded patterns):
 *   • Keep the SS housing intact at the world origin (it's small —
 *     stripping it radial like a door wouldn't read clearly).
 *   • Slide each annotated component out along its natural service
 *     axis (the axis you would actually pull it out of the housing).
 *   • Connect each component to its origin position with a dashed
 *     line so a reader can re-assemble the panel mentally.
 *
 * EXPLOSION DIRECTIONS (each component, label-aligned):
 *   screen           : +Z (forward, out of housing toward viewer)
 *   screen-bezel     : +Z (just in front of screen)
 *   emergency-stop   : +Y (lifts up out of top-right)
 *   physical-buttons : +X (slides out right side)
 *   status-leds      : +X (slides out right side, slightly less than buttons)
 *   usb-ports        : -Y (drops out bottom)
 *   brand-label      : -X (slides out left side)
 *   mounting-plate   : -Z (recedes back into wall)
 *   power-cord-port  : -Z then -Y (back-and-down)
 *
 * Reuses createUITexture() from the assembled file so both views
 * stay visually in sync without duplicating ~150 LOC of canvas2d.
 *
 * Coordinate system: Z = depth (toward viewer), 1 unit = 10 mm.
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
import { createUITexture } from './SurgicalControlPanelAssembled3D';

interface Props { product: Product }

// ── DIMENSIONS (must match assembled file) ───────────────────
const W = 45;
const H = 35;
const D = 6;

const SCREEN_W = 34.5;
const SCREEN_H = 19.5;
const SCREEN_X = -2.5;
const SCREEN_Y = -1;
const BEZEL_W = 1.0;

const SCR_L = SCREEN_X - SCREEN_W / 2;
const SCR_R = SCREEN_X + SCREEN_W / 2;
const SCR_T = SCREEN_Y + SCREEN_H / 2;
const SCR_B = SCREEN_Y - SCREEN_H / 2;
const APR_L = SCR_L - BEZEL_W;
const APR_R = SCR_R + BEZEL_W;
const APR_T = SCR_T + BEZEL_W;
const APR_B = SCR_B - BEZEL_W;

const Z_FRONT = D / 2;
const Z_BACK  = -D / 2;
const Z_BACKPLATE_FRONT = Z_BACK + 0.1;
const Z_BACKPLATE_BACK  = Z_BACK - 1.5;

const STRIP_X = 18.5;

// ── EXPLOSION OFFSETS ────────────────────────────────────────
const EXP_SCREEN_Z         = 14;     // forward
const EXP_BEZEL_Z          = 21;     // further forward (in front of screen)
const EXP_ESTOP_Y          = 12;     // up
const EXP_BUTTONS_X        = 22;     // right
const EXP_LEDS_X           = 16;     // right (less than buttons)
const EXP_USB_Y            = -16;    // down
const EXP_BRAND_X          = -22;    // left
const EXP_MOUNTING_Z       = -16;    // back
const EXP_POWER_Z          = -10;
const EXP_POWER_Y          = -8;

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

/**
 * Add a dashed line connecting two world-space points. Used to show
 * "this component pulls out from this slot" relationship.
 */
function addConnector(
  scene: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
): void {
  const lineMat = new THREE.LineDashedMaterial({
    color: 0x94a3b8,
    dashSize: 0.6,
    gapSize: 0.4,
    opacity: 0.55,
    transparent: true,
    depthTest: false,
  });
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, lineMat);
  line.computeLineDistances();
  line.renderOrder = 996;
  scene.add(line);
}

// ── PART BUILDERS — mirror the assembled file but offset ─────
// Each builder accepts an offset Vector3 that shifts the whole
// component group out along its service axis.

function buildHousing(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'housing';
  scene.add(group);

  // Same 4-strip layout as assembled (housing stays at origin).
  addBox(group, W, H / 2 - APR_T, D, 0, (APR_T + H / 2) / 2, 0, mat.ssBrushed);
  addBox(group, W, APR_B + H / 2, D, 0, (APR_B - H / 2) / 2, 0, mat.ssBrushed);
  addBox(group, W / 2 + APR_L, APR_T - APR_B, D, (APR_L - W / 2) / 2, (APR_T + APR_B) / 2, 0, mat.ssBrushed);
  addBox(group, W / 2 - APR_R, APR_T - APR_B, D, (APR_R + W / 2) / 2, (APR_T + APR_B) / 2, 0, mat.ssBrushed);

  // Inner aperture trim
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x16181c,
    roughness: 0.55,
    metalness: 0.3,
  });
  const tT = 0.4;
  addBox(group, APR_R - APR_L, tT, 0.3, (APR_R + APR_L) / 2, APR_T - tT / 2, Z_FRONT - 0.08, trimMat);
  addBox(group, APR_R - APR_L, tT, 0.3, (APR_R + APR_L) / 2, APR_B + tT / 2, Z_FRONT - 0.08, trimMat);
  addBox(group, tT, APR_T - APR_B, 0.3, APR_L + tT / 2, (APR_T + APR_B) / 2, Z_FRONT - 0.08, trimMat);
  addBox(group, tT, APR_T - APR_B, 0.3, APR_R - tT / 2, (APR_T + APR_B) / 2, Z_FRONT - 0.08, trimMat);
}

function buildScreen(scene: THREE.Object3D, uiTexture: THREE.CanvasTexture) {
  const group = new THREE.Group();
  group.userData.partId = 'screen';
  group.position.set(0, 0, EXP_SCREEN_Z);
  scene.add(group);

  const screenMat = new THREE.MeshStandardMaterial({
    map: uiTexture,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: uiTexture,
    emissiveIntensity: 0.95,
    roughness: 0.18,
    metalness: 0.0,
  });
  const lcd = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN_W, SCREEN_H),
    screenMat,
  );
  lcd.position.set(SCREEN_X, SCREEN_Y, 0);
  group.add(lcd);

  // Slim LCD frame backing (thin SS strip — what a real LCD module looks like)
  const backMat = mat.ssMatte;
  addBox(group, SCREEN_W + 0.6, SCREEN_H + 0.6, 0.3, SCREEN_X, SCREEN_Y, -0.2, backMat);

  // Connector ribbon (small dark tail, suggests the FFC cable)
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0x14171b,
    roughness: 0.7,
    metalness: 0.2,
  });
  addBox(group, 4.0, 0.5, 0.1, SCREEN_X, SCR_B - 0.6, -0.25, ribbonMat);

  // Connector to housing aperture center
  addConnector(
    scene,
    new THREE.Vector3(SCREEN_X, SCREEN_Y, 0),       // housing aperture
    new THREE.Vector3(SCREEN_X, SCREEN_Y, EXP_SCREEN_Z), // exploded position
  );
}

function buildScreenBezel(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'screen-bezel';
  group.position.set(0, 0, EXP_BEZEL_Z);
  scene.add(group);

  const bezelMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0e12,
    roughness: 0.25,
    metalness: 0.0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.9,
  });

  const bD = 0.6;
  // Top
  addBox(group, APR_R - APR_L, BEZEL_W, bD, (APR_R + APR_L) / 2, SCR_T + BEZEL_W / 2, 0, bezelMat);
  // Bottom
  addBox(group, APR_R - APR_L, BEZEL_W, bD, (APR_R + APR_L) / 2, SCR_B - BEZEL_W / 2, 0, bezelMat);
  // Left
  addBox(group, BEZEL_W, SCREEN_H, bD, SCR_L - BEZEL_W / 2, SCREEN_Y, 0, bezelMat);
  // Right
  addBox(group, BEZEL_W, SCREEN_H, bD, SCR_R + BEZEL_W / 2, SCREEN_Y, 0, bezelMat);

  addConnector(
    scene,
    new THREE.Vector3(SCREEN_X, SCREEN_Y, Z_FRONT),
    new THREE.Vector3(SCREEN_X, SCREEN_Y, EXP_BEZEL_Z),
  );
}

function buildEmergencyStop(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'emergency-stop';
  group.position.set(0, EXP_ESTOP_Y, 0);
  scene.add(group);

  const cx = STRIP_X;
  const cy = APR_T + 2.5;
  const proud = 2.5;

  const collarMat = new THREE.MeshStandardMaterial({
    color: 0xf4c91b,
    roughness: 0.55,
    metalness: 0.1,
  });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.6, 28), collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(cx, cy, Z_FRONT + 0.3);
  collar.castShadow = true;
  group.add(collar);

  const trim = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.35, 24), mat.chrome);
  trim.rotation.x = Math.PI / 2;
  trim.position.set(cx, cy, Z_FRONT + 0.7);
  group.add(trim);

  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8201a,
    roughness: 0.42,
    metalness: 0.05,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    emissive: new THREE.Color(0x4a0a08),
    emissiveIntensity: 0.18,
  });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.65, proud, 28), headMat);
  head.rotation.x = Math.PI / 2;
  head.position.set(cx, cy, Z_FRONT + 0.85 + proud / 2);
  head.castShadow = true;
  group.add(head);

  const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16), mat.blackDetail);
  dot.rotation.x = Math.PI / 2;
  dot.position.set(cx, cy, Z_FRONT + 0.85 + proud + 0.04);
  group.add(dot);

  // Mounting stem (drops down into housing — visible because exploded)
  const stemMat = mat.ssMatte;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 18), stemMat);
  stem.rotation.x = Math.PI / 2;
  stem.position.set(cx, cy, Z_FRONT - 0.4);
  group.add(stem);

  addConnector(
    scene,
    new THREE.Vector3(cx, cy, Z_FRONT + 1),
    new THREE.Vector3(cx, cy + EXP_ESTOP_Y, Z_FRONT + 1),
  );
}

function buildPhysicalButtons(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'physical-buttons';
  group.position.set(EXP_BUTTONS_X, 0, 0);
  scene.add(group);

  const buttonBase = new THREE.MeshStandardMaterial({
    color: 0x2a2e34,
    roughness: 0.55,
    metalness: 0.35,
  });

  const cx = STRIP_X;
  const positions: Array<{ y: number; label: 'reset' | 'menu' }> = [
    { y: -3.5, label: 'reset' },
    { y: -7.0, label: 'menu'  },
  ];
  for (const p of positions) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.25, 22), mat.ssMatte);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, p.y, Z_FRONT + 0.13);
    group.add(ring);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.45, 22), buttonBase);
    cap.rotation.x = Math.PI / 2;
    cap.position.set(cx, p.y, Z_FRONT + 0.45);
    cap.castShadow = true;
    group.add(cap);

    const symMat = new THREE.MeshStandardMaterial({
      color: p.label === 'reset' ? 0xf4c91b : 0xc8d4dc,
      roughness: 0.4,
      metalness: 0.4,
    });
    const sym = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 14), symMat);
    sym.rotation.x = Math.PI / 2;
    sym.position.set(cx, p.y, Z_FRONT + 0.7);
    group.add(sym);

    // Switch body behind cap (a small dark cylinder)
    const switchMat = new THREE.MeshStandardMaterial({
      color: 0x1a1d22,
      roughness: 0.7,
      metalness: 0.2,
    });
    const sw = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.0, 16), switchMat);
    sw.rotation.x = Math.PI / 2;
    sw.position.set(cx, p.y, Z_FRONT - 0.4);
    group.add(sw);
  }

  addConnector(
    scene,
    new THREE.Vector3(STRIP_X, -5.2, Z_FRONT),
    new THREE.Vector3(STRIP_X + EXP_BUTTONS_X, -5.2, Z_FRONT),
  );
}

function buildStatusLeds(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'status-leds';
  group.position.set(EXP_LEDS_X, 0, 0);
  scene.add(group);

  const cx = STRIP_X;
  const leds: Array<{ y: number; color: number; em: number }> = [
    { y:  4.8, color: 0x33ff66, em: 1.4 },
    { y:  2.6, color: 0x4488ff, em: 1.2 },
    { y:  0.4, color: 0xff3333, em: 0.25 },
  ];
  for (const l of leds) {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 18), mat.blackDetail);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(cx, l.y, Z_FRONT + 0.13);
    group.add(housing);

    const ledMat = new THREE.MeshStandardMaterial({
      color: l.color,
      emissive: new THREE.Color(l.color),
      emissiveIntensity: l.em,
      roughness: 0.3,
      metalness: 0.0,
    });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.18, 16), ledMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(cx, l.y, Z_FRONT + 0.3);
    group.add(lens);

    // PCB tail
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0x1a5f2a,
      roughness: 0.7,
      metalness: 0.1,
    });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.5), tailMat);
    tail.position.set(cx, l.y, Z_FRONT - 0.25);
    group.add(tail);
  }

  addConnector(
    scene,
    new THREE.Vector3(STRIP_X, 2.6, Z_FRONT),
    new THREE.Vector3(STRIP_X + EXP_LEDS_X, 2.6, Z_FRONT),
  );
}

function buildUsbPorts(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'usb-ports';
  group.position.set(0, EXP_USB_Y, 0);
  scene.add(group);

  const bayY = APR_B - 2.4;
  const bayCx = SCREEN_X;
  const bayW = 12.5;
  const bayH = 1.6;

  const bayMat = new THREE.MeshStandardMaterial({
    color: 0x111418,
    roughness: 0.65,
    metalness: 0.2,
  });
  addBox(group, bayW, bayH, 0.7, bayCx, bayY, Z_FRONT - 0.25, bayMat);

  const portShellMat = new THREE.MeshStandardMaterial({
    color: 0x2c3036,
    roughness: 0.55,
    metalness: 0.4,
  });
  const portInsertMat = new THREE.MeshStandardMaterial({
    color: 0xe6ecef,
    roughness: 0.4,
    metalness: 0.0,
  });

  const slotW = 1.5;
  const slotH = 0.65;
  const pitch = 2.6;
  for (let i = 0; i < 4; i++) {
    const px = bayCx - (1.5 * pitch) + i * pitch;
    addBox(group, slotW, slotH + 0.2, 0.45, px, bayY, Z_FRONT - 0.15, portShellMat);
    addBox(group, slotW - 0.35, slotH, 0.25, px, bayY, Z_FRONT - 0.05, portInsertMat);
  }

  const iconMat = new THREE.MeshStandardMaterial({
    color: 0xa8b4bc,
    roughness: 0.5,
    metalness: 0.6,
  });
  addBox(group, 1.2, 0.5, 0.1, bayCx + bayW / 2 + 0.9, bayY, Z_FRONT + 0.05, iconMat);

  addConnector(
    scene,
    new THREE.Vector3(bayCx, bayY, Z_FRONT - 0.1),
    new THREE.Vector3(bayCx, bayY + EXP_USB_Y, Z_FRONT - 0.1),
  );
}

function buildBrandLabel(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'brand-label';
  group.position.set(EXP_BRAND_X, 0, 0);
  scene.add(group);

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x0e1116,
    roughness: 0.35,
    metalness: 0.55,
  });
  addBox(group, 9.5, 1.6, 0.08, -14, APR_T + 1.4, Z_FRONT + 0.04, plateMat);

  const dotMat = new THREE.MeshStandardMaterial({
    color: 0xc8d4dc,
    roughness: 0.4,
    metalness: 0.7,
  });
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), dotMat);
  dot.rotation.x = Math.PI / 2;
  dot.position.set(-18, APR_T + 1.4, Z_FRONT + 0.09);
  group.add(dot);

  addConnector(
    scene,
    new THREE.Vector3(-14, APR_T + 1.4, Z_FRONT),
    new THREE.Vector3(-14 + EXP_BRAND_X, APR_T + 1.4, Z_FRONT),
  );
}

function buildMountingPlate(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'mounting-plate';
  group.position.set(0, 0, EXP_MOUNTING_Z);
  scene.add(group);

  const backMat = mat.equipment;
  addBox(
    group,
    W - 4, H - 4, Z_BACKPLATE_FRONT - Z_BACKPLATE_BACK,
    0, 0, (Z_BACKPLATE_FRONT + Z_BACKPLATE_BACK) / 2,
    backMat,
  );

  const tabMat = mat.ssMatte;
  const tabT = 0.35;
  const tabSize = 3.0;
  const tabZ = Z_BACKPLATE_BACK + tabT / 2;
  const corners: Array<[number, number]> = [
    [-W / 2 + 1.5,  H / 2 - 1.5],
    [ W / 2 - 1.5,  H / 2 - 1.5],
    [-W / 2 + 1.5, -H / 2 + 1.5],
    [ W / 2 - 1.5, -H / 2 + 1.5],
  ];
  for (const [tx, ty] of corners) {
    addBox(group, tabSize, tabSize, tabT, tx, ty, tabZ, tabMat);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12), mat.chrome);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(tx, ty, tabZ + tabT / 2 + 0.09);
    group.add(screw);
  }

  addConnector(
    scene,
    new THREE.Vector3(0, 0, Z_BACK),
    new THREE.Vector3(0, 0, Z_BACK + EXP_MOUNTING_Z),
  );
}

function buildPowerCordPort(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'power-cord-port';
  group.position.set(0, EXP_POWER_Y, EXP_POWER_Z);
  scene.add(group);

  const inletMat = new THREE.MeshStandardMaterial({
    color: 0x14171b,
    roughness: 0.7,
    metalness: 0.2,
  });

  addBox(group, 3.0, 1.6, 0.6, -7, -H / 2 + 2.2, Z_BACKPLATE_BACK - 0.15, inletMat);
  for (let i = -1; i <= 1; i++) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 10), mat.chrome);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(-7 + i * 0.7, -H / 2 + 2.2, Z_BACKPLATE_BACK - 0.05);
    group.add(pin);
  }

  addBox(group, 1.6, 1.4, 0.5, 7, -H / 2 + 2.2, Z_BACKPLATE_BACK - 0.1, inletMat);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.35,
    metalness: 0.85,
  });
  addBox(group, 1.2, 0.25, 0.04, 7, -H / 2 + 2.5, Z_BACKPLATE_BACK + 0.1, goldMat);

  addConnector(
    scene,
    new THREE.Vector3(0, -H / 2 + 2.2, Z_BACKPLATE_BACK),
    new THREE.Vector3(0, -H / 2 + 2.2 + EXP_POWER_Y, Z_BACKPLATE_BACK + EXP_POWER_Z),
  );
}

// ── SCENE BUILD ──────────────────────────────────────────────
function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  renderer.toneMappingExposure = 1.0;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xeef3f7);
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xf5fafe, 0.4));
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xc8d2dc, 0.55));

  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(80, 100, 160);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 500;
  key.shadow.camera.left = -120;
  key.shadow.camera.right = 120;
  key.shadow.camera.top = 100;
  key.shadow.camera.bottom = -100;
  key.shadow.bias = -0.0005;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.45);
  fill.position.set(-90, 60, 80);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    mat.floor,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -H / 2 - 22;
  floor.receiveShadow = true;
  scene.add(floor);

  const uiTexture = createUITexture();

  // Build order back-to-front for transparency stacking.
  buildMountingPlate(scene);
  buildPowerCordPort(scene);
  buildHousing(scene);
  buildScreen(scene, uiTexture);
  buildScreenBezel(scene);
  buildBrandLabel(scene);
  buildStatusLeds(scene);
  buildPhysicalButtons(scene);
  buildEmergencyStop(scene);
  buildUsbPorts(scene);

  // Annotations — anchors point at the EXPLODED position so the elbow
  // line lands on the floating component, not the housing slot.
  placeAnnotations(
    scene,
    [
      { partId: 'housing',          anchor: new THREE.Vector3(-W / 2 + 2, H / 2 - 2, Z_FRONT), label: 'Housing Stainless Steel Brushed' },
      { partId: 'screen',           anchor: new THREE.Vector3(SCREEN_X, SCREEN_Y, EXP_SCREEN_Z), label: '15.6" IPS LCD Touchscreen' },
      { partId: 'screen-bezel',     anchor: new THREE.Vector3(SCREEN_X, SCR_T + BEZEL_W / 2, EXP_BEZEL_Z), label: 'Black Bezel (10mm)' },
      { partId: 'emergency-stop',   anchor: new THREE.Vector3(STRIP_X, APR_T + 2.5 + EXP_ESTOP_Y, Z_FRONT + 3), label: 'Emergency Stop (twist-to-release)' },
      { partId: 'status-leds',      anchor: new THREE.Vector3(STRIP_X + EXP_LEDS_X, 2.6, Z_FRONT + 0.4), label: 'Status LEDs PWR \u00b7 NET \u00b7 ERR' },
      { partId: 'physical-buttons', anchor: new THREE.Vector3(STRIP_X + EXP_BUTTONS_X, -5.2, Z_FRONT + 0.5), label: 'Reset \u00b7 Menu Buttons' },
      { partId: 'usb-ports',        anchor: new THREE.Vector3(SCREEN_X, APR_B - 2.4 + EXP_USB_Y, Z_FRONT + 0.1), label: 'USB-A \u00d7 4 (recessed)' },
      { partId: 'brand-label',      anchor: new THREE.Vector3(-14 + EXP_BRAND_X, APR_T + 1.4, Z_FRONT + 0.1), label: 'Smart Control Plate' },
      { partId: 'mounting-plate',   anchor: new THREE.Vector3(-W / 2 + 1.5, H / 2 - 1.5, Z_BACKPLATE_BACK + EXP_MOUNTING_Z), label: 'Wall Mount Bracket' },
      { partId: 'power-cord-port',  anchor: new THREE.Vector3(0, -H / 2 + 2.2 + EXP_POWER_Y, Z_BACKPLATE_BACK + EXP_POWER_Z), label: 'IEC C14 + RJ45' },
    ],
    W / 2 + EXP_BUTTONS_X + 14,
    [-H / 2 - 16, H / 2 + 16],
  );
}

// ── REACT COMPONENT ──────────────────────────────────────────
export function SurgicalControlPanelExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );
  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 60,
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

export default SurgicalControlPanelExploded3D;
