/**
 * SurgicalControlPanelAssembled3D.tsx — REWRITE 2026-05-25
 * ─────────────────────────────────────────────────────────────────
 * Real OR Surgical Control Panel touchscreen — wall-mounted.
 * Reference products: Maquet Tegris, Trumpf TruSystem, Mediray OR
 * Control, Skytron OR Integration Wall Panel, Elfatech 15.6" Modbus.
 * See: docs/research/2026-05-25-surgical-control-panel-references.md
 *
 * WHY THIS FILE EXISTS (rewrite reason):
 *   The previous version rendered a blank canvas because (a) the
 *   front "glass" was a 95% opaque slab in front of the LCD and
 *   (b) Y/Z axis convention fought itself across nine layers, so
 *   the camera frustum missed the geometry. This rewrite uses the
 *   project-standard convention (Z = depth toward viewer) and the
 *   group-level partId pattern proven in PbLead + Xray Item 4.
 *
 * KEY ARCHITECTURE FACTS:
 *   • Wall-mounted slim panel, ~450×350×60mm
 *   • Brushed stainless steel front face (4 strips around aperture)
 *   • Black glossy bezel ~10mm around 15.6" IPS LCD (16:9, 345×195mm)
 *   • Right-side vertical strip: status LEDs + Reset/Menu buttons
 *   • Top-right red mushroom Emergency Stop (proud +25mm)
 *   • Bottom edge: 4× USB-A recessed bay
 *   • Rear: IEC C14 power inlet + RJ45 + recessed back box
 *   • IP54 (front face only)
 *
 * COORDINATE SYSTEM (matches Hermetic/PbLead/Xray):
 *   • X = width  (left/right)
 *   • Y = height (up/down)
 *   • Z = depth  (out of wall toward viewer; +Z = front)
 *   • 1 unit = 10 mm
 *
 * PART IDS (group-level, proven pattern):
 *   housing · screen-bezel · screen · emergency-stop · physical-buttons ·
 *   status-leds · usb-ports · mounting-plate · brand-label · power-cord-port
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

interface Props { product: Product }

// ── DIMENSIONS (1 unit = 10 mm) ──────────────────────────────
const W = 45;             // overall width   (450 mm)
const H = 35;             // overall height  (350 mm)
const D = 6;              // overall depth   (60 mm)

const SCREEN_W = 34.5;    // 15.6" 16:9 active width
const SCREEN_H = 19.5;    // 15.6" 16:9 active height
const SCREEN_X = -2.5;    // shift screen left to leave room for right-side controls
const SCREEN_Y = -1;      // slightly below center (more headroom for E-stop + brand)
const BEZEL_W = 1.0;      // black bezel border around LCD

// Aperture edges (precomputed once)
const SCR_L = SCREEN_X - SCREEN_W / 2;        // -19.75
const SCR_R = SCREEN_X + SCREEN_W / 2;        //  14.75
const SCR_T = SCREEN_Y + SCREEN_H / 2;        //   8.75
const SCR_B = SCREEN_Y - SCREEN_H / 2;        // -10.75
const APR_L = SCR_L - BEZEL_W;                // aperture (housing cutout) outer edges
const APR_R = SCR_R + BEZEL_W;
const APR_T = SCR_T + BEZEL_W;
const APR_B = SCR_B - BEZEL_W;

// Z stack
const Z_FRONT          = D / 2;               // +3
const Z_BACK           = -D / 2;              // -3
const Z_BEZEL_FRONT    = Z_FRONT + 0.02;      // bezel sits flush with housing front
const Z_BEZEL_DEPTH    = 0.6;
const Z_BEZEL_BACK     = Z_BEZEL_FRONT - Z_BEZEL_DEPTH;
const Z_LCD            = Z_BEZEL_BACK + 0.05; // LCD UI plane just behind bezel
const Z_BACKPLATE_FRONT = Z_BACK + 0.1;
const Z_BACKPLATE_BACK  = Z_BACK - 1.5;

// Right-hand control column
const STRIP_X = 18.5;

// ═══════════════════════════════════════════════════════════════
// CREATE UI TEXTURE (CanvasTexture for LCD Display)
// Exported because exploded view also uses this texture.
// ═══════════════════════════════════════════════════════════════
export function createUITexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 576; // 16:9 aspect ratio

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background — dark medical interface
  ctx.fillStyle = '#0a1420';
  ctx.fillRect(0, 0, width, height);

  // Grid pattern
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // ── Operating timer ──
  ctx.fillStyle = '#0f1a24';
  roundRect(ctx, width / 2 - 180, 20, 360, 80, 8);
  ctx.fill();
  ctx.strokeStyle = '#2a4a6a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 48px "JetBrains Mono", monospace';
  ctx.fillStyle = '#00ff88';
  ctx.textAlign = 'center';
  ctx.fillText('02:34:17', width / 2, 75);
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText('OPERATING TIME', width / 2, 40);

  // ── Temperature / humidity ──
  ctx.fillStyle = '#0f1a24';
  roundRect(ctx, 20, 120, 280, 180, 8);
  ctx.fill();
  ctx.strokeStyle = '#2a4a6a';
  ctx.stroke();
  ctx.font = 'bold 56px "JetBrains Mono", monospace';
  ctx.fillStyle = '#00d4ff';
  ctx.textAlign = 'left';
  ctx.fillText('22.5', 50, 195);
  ctx.font = '28px sans-serif';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText('°C', 160, 195);
  ctx.font = 'bold 40px "JetBrains Mono", monospace';
  ctx.fillStyle = '#00ff88';
  ctx.fillText('55', 50, 260);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText('%RH', 100, 260);
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#4a6a8a';
  ctx.fillText('TEMPERATURE', 40, 140);
  ctx.fillText('HUMIDITY', 40, 220);

  // ── HVAC status ──
  ctx.fillStyle = '#0f1a24';
  roundRect(ctx, width - 300, 120, 280, 180, 8);
  ctx.fill();
  ctx.strokeStyle = '#2a4a6a';
  ctx.stroke();
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#4a6a8a';
  ctx.textAlign = 'left';
  ctx.fillText('HVAC STATUS', width - 280, 140);

  const statusItems = [
    { label: 'ACH',      value: '20',  unit: '/h',  color: '#00ff88' },
    { label: 'PRESSURE', value: '+15', unit: 'Pa',  color: '#00d4ff' },
    { label: 'AIRFLOW',  value: '850', unit: 'CFM', color: '#00ff88' },
  ];
  statusItems.forEach((item, i) => {
    const y = 165 + i * 40;
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#6a8aaa';
    ctx.fillText(item.label, width - 280, y);
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillStyle = item.color;
    ctx.textAlign = 'right';
    ctx.fillText(item.value, width - 100, y + 5);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#4a6a8a';
    ctx.fillText(item.unit, width - 80, y + 5);
    ctx.textAlign = 'left';
  });

  // ── Medical gas ──
  ctx.fillStyle = '#0f1a24';
  roundRect(ctx, 20, 320, 280, 140, 8);
  ctx.fill();
  ctx.strokeStyle = '#2a4a6a';
  ctx.stroke();
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#4a6a8a';
  ctx.fillText('MEDICAL GAS', 40, 340);
  const gases = [
    { label: 'O\u2082',  pressure: '55', unit: 'psi', color: '#00d4ff' },
    { label: 'N\u2082O', pressure: '48', unit: 'psi', color: '#00ff88' },
    { label: 'AIR',      pressure: '52', unit: 'psi', color: '#ffaa00' },
  ];
  gases.forEach((gas, i) => {
    const x = 40 + i * 90;
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillStyle = gas.color;
    ctx.fillText(gas.label, x, 365);
    ctx.font = 'bold 32px "JetBrains Mono", monospace';
    ctx.fillText(gas.pressure, x, 400);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#4a6a8a';
    ctx.fillText(gas.unit, x + 50, 400);
  });

  // ── Lighting controls ──
  ctx.fillStyle = '#0f1a24';
  roundRect(ctx, width / 2 - 140, 320, 280, 140, 8);
  ctx.fill();
  ctx.strokeStyle = '#2a4a6a';
  ctx.stroke();
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#4a6a8a';
  ctx.textAlign = 'center';
  ctx.fillText('LIGHTING CONTROL', width / 2, 340);
  const lights = [
    { label: 'OR MAIN',  level: 85,  color: '#ffdd00' },
    { label: 'SURGICAL', level: 100, color: '#ffaa00' },
    { label: 'AMBIENT',  level: 30,  color: '#88ccff' },
  ];
  lights.forEach((light, i) => {
    const y = 355 + i * 35;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#6a8aaa';
    ctx.textAlign = 'left';
    ctx.fillText(light.label, width / 2 - 120, y);
    ctx.fillStyle = '#1a2a3a';
    roundRect(ctx, width / 2 - 40, y - 10, 100, 12, 2);
    ctx.fill();
    ctx.fillStyle = light.color;
    roundRect(ctx, width / 2 - 38, y - 8, (light.level / 100) * 96, 8, 2);
    ctx.fill();
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = light.color;
    ctx.textAlign = 'right';
    ctx.fillText(`${light.level}%`, width / 2 + 100, y);
  });

  // ── Quick controls ──
  ctx.fillStyle = '#0f1a24';
  roundRect(ctx, width - 300, 320, 280, 140, 8);
  ctx.fill();
  ctx.strokeStyle = '#2a4a6a';
  ctx.stroke();
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#4a6a8a';
  ctx.textAlign = 'left';
  ctx.fillText('QUICK CONTROLS', width - 280, 340);
  const buttons = [
    { label: 'EMERGENCY', color: '#ff4444', y: 360 },
    { label: 'DOOR LOCK', color: '#ffaa00', y: 395 },
    { label: 'ALL ON',    color: '#00ff88', y: 430 },
  ];
  buttons.forEach((btn) => {
    ctx.fillStyle = btn.color;
    ctx.globalAlpha = 0.8;
    roundRect(ctx, width - 280, btn.y - 15, 120, 28, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(btn.label, width - 220, btn.y + 4);
  });

  // ── Status bar ──
  ctx.fillStyle = '#0a1420';
  ctx.fillRect(0, height - 30, width, 30);
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#00ff88';
  ctx.textAlign = 'left';
  ctx.fillText('\u25CF SYSTEM OK', 20, height - 12);
  ctx.fillStyle = '#4a6a8a';
  ctx.textAlign = 'center';
  ctx.fillText('MODBUS TCP/IP \u2022 192.168.1.100', width / 2, height - 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText('OR-001 \u2022 2026-05-25', width - 20, height - 12);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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

// ── PART BUILDERS (each tags userData.partId on a group) ─────

function buildHousing(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'housing';
  scene.add(group);

  // Front face = 4 brushed-SS strips framing the screen aperture.
  // Top strip
  addBox(group, W, H / 2 - APR_T, D, 0, (APR_T + H / 2) / 2, 0, mat.ssBrushed);
  // Bottom strip
  addBox(group, W, APR_B + H / 2, D, 0, (APR_B - H / 2) / 2, 0, mat.ssBrushed);
  // Left strip
  addBox(group, W / 2 + APR_L, APR_T - APR_B, D, (APR_L - W / 2) / 2, (APR_T + APR_B) / 2, 0, mat.ssBrushed);
  // Right strip (under the button column — covers full height including controls)
  addBox(group, W / 2 - APR_R, APR_T - APR_B, D, (APR_R + W / 2) / 2, (APR_T + APR_B) / 2, 0, mat.ssBrushed);

  // Subtle inner-aperture trim (1px black ring framing the bezel)
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x16181c,
    roughness: 0.55,
    metalness: 0.3,
  });
  const tT = 0.4;
  // Top inner trim
  addBox(group, APR_R - APR_L, tT, 0.3, (APR_R + APR_L) / 2, APR_T - tT / 2, Z_FRONT - 0.08, trimMat);
  // Bottom inner trim
  addBox(group, APR_R - APR_L, tT, 0.3, (APR_R + APR_L) / 2, APR_B + tT / 2, Z_FRONT - 0.08, trimMat);
  // Left inner trim
  addBox(group, tT, APR_T - APR_B, 0.3, APR_L + tT / 2, (APR_T + APR_B) / 2, Z_FRONT - 0.08, trimMat);
  // Right inner trim
  addBox(group, tT, APR_T - APR_B, 0.3, APR_R - tT / 2, (APR_T + APR_B) / 2, Z_FRONT - 0.08, trimMat);
}

function buildScreenBezel(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'screen-bezel';
  scene.add(group);

  // Glossy black plastic bezel ring — sits inside aperture, in front of LCD.
  const bezelMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0e12,
    roughness: 0.25,
    metalness: 0.0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.9,
  });

  const bD = Z_BEZEL_DEPTH;
  const bZ = (Z_BEZEL_FRONT + Z_BEZEL_BACK) / 2;
  // Top
  addBox(group, APR_R - APR_L, BEZEL_W, bD, (APR_R + APR_L) / 2, SCR_T + BEZEL_W / 2, bZ, bezelMat);
  // Bottom
  addBox(group, APR_R - APR_L, BEZEL_W, bD, (APR_R + APR_L) / 2, SCR_B - BEZEL_W / 2, bZ, bezelMat);
  // Left
  addBox(group, BEZEL_W, SCREEN_H, bD, SCR_L - BEZEL_W / 2, SCREEN_Y, bZ, bezelMat);
  // Right
  addBox(group, BEZEL_W, SCREEN_H, bD, SCR_R + BEZEL_W / 2, SCREEN_Y, bZ, bezelMat);
}

function buildScreen(scene: THREE.Object3D, uiTexture: THREE.CanvasTexture) {
  const group = new THREE.Group();
  group.userData.partId = 'screen';
  scene.add(group);

  // Active LCD panel — emissive UI mockup. Sits in front so the texture
  // is what the camera sees, not a black slab.
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
  lcd.position.set(SCREEN_X, SCREEN_Y, Z_LCD);
  group.add(lcd);

  // Thin glass cover plate — VERY subtle, NOT a black slab.
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.95,
    thickness: 0.1,
    ior: 1.5,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    envMapIntensity: 1.4,
  });
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN_W + 0.4, SCREEN_H + 0.4),
    glassMat,
  );
  glass.position.set(SCREEN_X, SCREEN_Y, Z_FRONT + 0.01);
  group.add(glass);
}

function buildEmergencyStop(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'emergency-stop';
  scene.add(group);

  // Top-right corner, proud of the SS face by ~25mm (real spec).
  const cx = STRIP_X;
  const cy = APR_T + 2.5;
  const proud = 2.5;

  // Yellow safety collar (twist-to-release ring base)
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0xf4c91b,
    roughness: 0.55,
    metalness: 0.1,
  });
  const collarGeo = new THREE.CylinderGeometry(2.0, 2.2, 0.6, 28);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(cx, cy, Z_FRONT + 0.3);
  collar.castShadow = true;
  group.add(collar);

  // Chrome trim ring
  const trimGeo = new THREE.CylinderGeometry(1.7, 1.7, 0.35, 24);
  const trim = new THREE.Mesh(trimGeo, mat.chrome);
  trim.rotation.x = Math.PI / 2;
  trim.position.set(cx, cy, Z_FRONT + 0.7);
  group.add(trim);

  // Red mushroom head
  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8201a,
    roughness: 0.42,
    metalness: 0.05,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    emissive: new THREE.Color(0x4a0a08),
    emissiveIntensity: 0.18,
  });
  const headGeo = new THREE.CylinderGeometry(1.5, 1.65, proud, 28);
  const head = new THREE.Mesh(headGeo, headMat);
  head.rotation.x = Math.PI / 2;
  head.position.set(cx, cy, Z_FRONT + 0.85 + proud / 2);
  head.castShadow = true;
  group.add(head);

  // Stop pictogram disc (small dark dot on top)
  const dotGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16);
  const dot = new THREE.Mesh(dotGeo, mat.blackDetail);
  dot.rotation.x = Math.PI / 2;
  dot.position.set(cx, cy, Z_FRONT + 0.85 + proud + 0.04);
  group.add(dot);
}

function buildPhysicalButtons(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'physical-buttons';
  scene.add(group);

  const buttonBase = new THREE.MeshStandardMaterial({
    color: 0x2a2e34,
    roughness: 0.55,
    metalness: 0.35,
  });

  // 2 momentary buttons, vertical arrangement on right strip
  // (Reset above Menu, both below the status LEDs).
  const cx = STRIP_X;
  const positions: Array<{ y: number; label: 'reset' | 'menu' }> = [
    { y: -3.5, label: 'reset' },
    { y: -7.0, label: 'menu'  },
  ];
  for (const p of positions) {
    // Recessed bezel ring
    const ringGeo = new THREE.CylinderGeometry(1.05, 1.15, 0.25, 22);
    const ring = new THREE.Mesh(ringGeo, mat.ssMatte);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, p.y, Z_FRONT + 0.13);
    group.add(ring);

    // Cap
    const capGeo = new THREE.CylinderGeometry(0.85, 0.9, 0.45, 22);
    const cap = new THREE.Mesh(capGeo, buttonBase);
    cap.rotation.x = Math.PI / 2;
    cap.position.set(cx, p.y, Z_FRONT + 0.45);
    cap.castShadow = true;
    group.add(cap);

    // Symbol etch (tiny disc on top)
    const symMat = new THREE.MeshStandardMaterial({
      color: p.label === 'reset' ? 0xf4c91b : 0xc8d4dc,
      roughness: 0.4,
      metalness: 0.4,
    });
    const symGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 14);
    const sym = new THREE.Mesh(symGeo, symMat);
    sym.rotation.x = Math.PI / 2;
    sym.position.set(cx, p.y, Z_FRONT + 0.7);
    group.add(sym);
  }
}

function buildStatusLeds(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'status-leds';
  scene.add(group);

  // 3 LEDs vertical, between E-stop and physical buttons
  const cx = STRIP_X;
  const leds: Array<{ y: number; color: number; em: number }> = [
    { y:  4.8, color: 0x33ff66, em: 1.4 }, // PWR (green, on)
    { y:  2.6, color: 0x4488ff, em: 1.2 }, // NET (blue, on)
    { y:  0.4, color: 0xff3333, em: 0.25 }, // ERR (red, dim — no error)
  ];
  for (const l of leds) {
    // Recessed dark housing
    const housingGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.25, 18);
    const housing = new THREE.Mesh(housingGeo, mat.blackDetail);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(cx, l.y, Z_FRONT + 0.13);
    group.add(housing);

    // Glowing lens
    const ledMat = new THREE.MeshStandardMaterial({
      color: l.color,
      emissive: new THREE.Color(l.color),
      emissiveIntensity: l.em,
      roughness: 0.3,
      metalness: 0.0,
    });
    const lensGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.18, 16);
    const lens = new THREE.Mesh(lensGeo, ledMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(cx, l.y, Z_FRONT + 0.3);
    group.add(lens);
  }
}

function buildUsbPorts(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'usb-ports';
  scene.add(group);

  // 4× USB-A type, recessed bay below the screen.
  // Bay is centered horizontally under the screen.
  const bayY = APR_B - 2.4;     // ~2.4 below aperture bottom
  const bayCx = SCREEN_X;       // align with screen
  const bayW = 12.5;
  const bayH = 1.6;

  // Recessed dark backing (the bay)
  const bayMat = new THREE.MeshStandardMaterial({
    color: 0x111418,
    roughness: 0.65,
    metalness: 0.2,
  });
  addBox(group, bayW, bayH, 0.7, bayCx, bayY, Z_FRONT - 0.25, bayMat);

  // 4 USB-A ports — small white inserts inside dark slots
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
    // Outer shell
    addBox(group, slotW, slotH + 0.2, 0.45, px, bayY, Z_FRONT - 0.15, portShellMat);
    // Inner insert (white plastic)
    addBox(group, slotW - 0.35, slotH, 0.25, px, bayY, Z_FRONT - 0.05, portInsertMat);
  }

  // Tiny USB icon plate above bay
  const iconMat = new THREE.MeshStandardMaterial({
    color: 0xa8b4bc,
    roughness: 0.5,
    metalness: 0.6,
  });
  addBox(group, 1.2, 0.5, 0.1, bayCx + bayW / 2 + 0.9, bayY, Z_FRONT + 0.05, iconMat);
}

function buildBrandLabel(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'brand-label';
  scene.add(group);

  // Etched plate top-left of the screen.
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x0e1116,
    roughness: 0.35,
    metalness: 0.55,
  });
  addBox(group, 9.5, 1.6, 0.08, -14, APR_T + 1.4, Z_FRONT + 0.04, plateMat);

  // Dot accent (model indicator, looks like an etched logo dot)
  const dotMat = new THREE.MeshStandardMaterial({
    color: 0xc8d4dc,
    roughness: 0.4,
    metalness: 0.7,
  });
  const dotGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14);
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.rotation.x = Math.PI / 2;
  dot.position.set(-18, APR_T + 1.4, Z_FRONT + 0.09);
  group.add(dot);
}

function buildMountingPlate(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'mounting-plate';
  scene.add(group);

  // Recessed back box (sits behind the front housing — partly hidden).
  const backMat = mat.equipment;
  addBox(
    group,
    W - 4, H - 4, Z_BACKPLATE_FRONT - Z_BACKPLATE_BACK,
    0, 0, (Z_BACKPLATE_FRONT + Z_BACKPLATE_BACK) / 2,
    backMat,
  );

  // 4 corner mounting tabs sticking out (where the wall screws go)
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
    // Screw head
    const screwGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12);
    const screw = new THREE.Mesh(screwGeo, mat.chrome);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(tx, ty, tabZ + tabT / 2 + 0.09);
    group.add(screw);
  }
}

function buildPowerCordPort(scene: THREE.Object3D) {
  const group = new THREE.Group();
  group.userData.partId = 'power-cord-port';
  scene.add(group);

  // Bottom-rear edge: IEC C14 inlet + RJ45 jack.
  const inletMat = new THREE.MeshStandardMaterial({
    color: 0x14171b,
    roughness: 0.7,
    metalness: 0.2,
  });

  // IEC C14 (3-prong) — D-shaped recess simplified as a chamfered box
  addBox(group, 3.0, 1.6, 0.6, -7, -H / 2 + 2.2, Z_BACKPLATE_BACK - 0.15, inletMat);
  // 3 pin slots inside
  const pinMat = mat.chrome;
  for (let i = -1; i <= 1; i++) {
    const pinGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 10);
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(-7 + i * 0.7, -H / 2 + 2.2, Z_BACKPLATE_BACK - 0.05);
    group.add(pin);
  }

  // RJ45 jack
  addBox(group, 1.6, 1.4, 0.5, 7, -H / 2 + 2.2, Z_BACKPLATE_BACK - 0.1, inletMat);
  // RJ45 inner contacts (gold)
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.35,
    metalness: 0.85,
  });
  addBox(group, 1.2, 0.25, 0.04, 7, -H / 2 + 2.5, Z_BACKPLATE_BACK + 0.1, goldMat);
}

// ── SCENE BUILD ──────────────────────────────────────────────
function buildScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  // Environment + tone (clinical look)
  renderer.toneMappingExposure = 1.0;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xeef3f7);
  pmrem.dispose();

  // Lights
  scene.add(new THREE.AmbientLight(0xf5fafe, 0.4));
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0xc8d2dc, 0.55));

  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(70, 90, 140);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 400;
  key.shadow.camera.left = -100;
  key.shadow.camera.right = 100;
  key.shadow.camera.top = 80;
  key.shadow.camera.bottom = -80;
  key.shadow.bias = -0.0005;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.45);
  fill.position.set(-80, 50, 60);
  scene.add(fill);

  // Floor (catches contact shadow under unit)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    mat.floor,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -H / 2 - 8;
  floor.receiveShadow = true;
  scene.add(floor);

  // UI texture for LCD
  const uiTexture = createUITexture();

  // Build hierarchy back-to-front so transparency stacks correctly.
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

  // Annotations
  placeAnnotations(
    scene,
    [
      { partId: 'housing',          anchor: new THREE.Vector3(-W / 2 + 2, H / 2 - 2, Z_FRONT), label: 'Housing Stainless Steel Brushed' },
      { partId: 'screen-bezel',     anchor: new THREE.Vector3(SCR_R + BEZEL_W / 2, SCR_T - 1, Z_BEZEL_FRONT), label: 'Black Bezel (10mm)' },
      { partId: 'screen',           anchor: new THREE.Vector3(SCREEN_X, SCREEN_Y, Z_LCD + 0.5), label: '15.6" IPS LCD Touchscreen' },
      { partId: 'emergency-stop',   anchor: new THREE.Vector3(STRIP_X, APR_T + 2.5, Z_FRONT + 3), label: 'Emergency Stop (twist-to-release)' },
      { partId: 'status-leds',      anchor: new THREE.Vector3(STRIP_X, 2.6, Z_FRONT + 0.4), label: 'Status LEDs PWR \u00b7 NET \u00b7 ERR' },
      { partId: 'physical-buttons', anchor: new THREE.Vector3(STRIP_X, -5.2, Z_FRONT + 0.5), label: 'Reset \u00b7 Menu Buttons' },
      { partId: 'usb-ports',        anchor: new THREE.Vector3(SCREEN_X, APR_B - 2.4, Z_FRONT + 0.1), label: 'USB-A \u00d7 4 (recessed)' },
      { partId: 'brand-label',      anchor: new THREE.Vector3(-14, APR_T + 1.4, Z_FRONT + 0.1), label: 'Smart Control Plate' },
      { partId: 'mounting-plate',   anchor: new THREE.Vector3(-W / 2 + 1.5, H / 2 - 1.5, Z_BACKPLATE_BACK), label: 'Wall Mount Bracket' },
      { partId: 'power-cord-port',  anchor: new THREE.Vector3(0, -H / 2 + 2.2, Z_BACKPLATE_BACK - 0.1), label: 'IEC C14 + RJ45' },
    ],
    W / 2 + 25,
    [-H / 2 - 4, H / 2 + 12],
  );
}

// ── REACT COMPONENT ──────────────────────────────────────────
export function SurgicalControlPanelAssembled3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );
  const { attachHighlight } = useHighlightController();

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.assembledCameraStart,
      minDistance: 40,
      maxDistance: 400,
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

export default SurgicalControlPanelAssembled3D;
