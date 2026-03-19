/**
 * surgical-panel-texture.ts
 * ─────────────────────────────────────────────────────────────
 * Shared Canvas2D SCADA UI texture for Surgical Control Panel.
 * Used by both SurgicalPanelAssembled3D and SurgicalPanelExploded3D.
 *
 * Improvements over the original embedded version:
 *   - Lighter section backgrounds for better readability
 *   - Sharper texture (no mipmaps, LinearFilter)
 *   - ELFATECH SVG logo drawn asynchronously via Image.onload + needsUpdate
 *   - Shared between assembled and exploded views (UI consistency)
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';

// ─── Color palette — improved contrast ───────────────────────
const C = {
  bg:        '#0C1220',  // main background (was #0A0E1A)
  headerBg:  '#142033',  // header bar    (was #0D1B2E)
  sectionBg: '#16243A',  // section cards  (was #0F1C2E)
  border:    '#2E4A66',  // card borders   (was #243446)
  divider:   '#1E3550',  // section dividers
  label:     '#7A95B0',  // small labels   (was #667788)
  white:     '#FFFFFF',
  timer:     '#FF3333',  // countdown timer
  clock:     '#00FF7F',  // clock green
  clockSub:  '#00CC66',
  cyan:      '#4FC3F7',  // temp/humidity
  purple:    '#CE93D8',  // pressure
  amber:     '#FFEB3B',  // gas values
  lampOn:    '#FFD600',  // lamp indicator
  lampFill:  '#FFF9C4',
  lampText:  '#0F1C2E',
  btnL:      '#FFD600',  // L1/L2 buttons
  btnOn:     '#00E676',  // ON button
  btnMute:   '#455A64',  // mute/– button
  btnText:   '#0A0E1A',
  alarmOk:   '#00E676',
  alarmFail: '#FF1744',
  grill:     '#4a6a8a',  // (unused now, logo replaces)
};

// ─── Canvas helpers ───────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function circle(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Main draw function ───────────────────────────────────────

function drawUI(canvas: HTMLCanvasElement) {
  const CW = canvas.width;
  const CH = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // ── 0. Background ──
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CW, CH);

  // ── 1. Header bar (y=0 → y=62) ──
  ctx.fillStyle = C.headerBg;
  ctx.fillRect(0, 0, CW, 62);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 62); ctx.lineTo(CW, 62); ctx.stroke();

  ctx.fillStyle = C.white;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SURGICAL CONTROL PANEL', CW / 2, 32);

  // ── 2. Timer row (y=72 → y=225) ──
  const timerY = 72, timerH = 155;

  // Left: Countdown
  ctx.fillStyle = C.sectionBg;
  rr(ctx, 20, timerY, CW / 2 - 30, timerH, 10);
  ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = C.label;
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('COUNTDOWN TIMER', CW / 4, timerY + 30);

  ctx.fillStyle = C.timer;
  ctx.font = 'bold 72px monospace';
  ctx.fillText('00:18:19', CW / 4, timerY + 103);

  // Right: Clock
  ctx.fillStyle = C.sectionBg;
  rr(ctx, CW / 2 + 10, timerY, CW / 2 - 30, timerH, 10);
  ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = C.label;
  ctx.font = '18px sans-serif';
  ctx.fillText('TIME OF DAY CLOCK', CW * 3 / 4, timerY + 30);

  ctx.fillStyle = C.clock;
  ctx.font = 'bold 72px monospace';
  ctx.fillText('13:45:54', CW * 3 / 4, timerY + 100);

  ctx.fillStyle = C.clockSub;
  ctx.font = '20px sans-serif';
  ctx.fillText('KAMIS · 16-08-2022', CW * 3 / 4, timerY + 138);

  // ── 3. Main content (y=240 → y=820) ──
  const mainY = 240, mainH = 580;
  const col1X = 20,    col1W = 555;
  const col2X = col1X + col1W + 18, col2W = 345;
  const col3X = col2X + col2W + 18, col3W = CW - col3X - 20;

  // --- Col 1: Room Environment ---
  ctx.fillStyle = C.sectionBg;
  rr(ctx, col1X, mainY, col1W, mainH, 10);
  ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = C.label;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROOM 1', col1X + col1W / 2, mainY + 30);

  ctx.strokeStyle = C.divider;
  ctx.beginPath();
  ctx.moveTo(col1X + 20, mainY + 50);
  ctx.lineTo(col1X + col1W - 20, mainY + 50);
  ctx.stroke();

  // Temperature
  const tempY = mainY + 80;
  ctx.fillStyle = C.label;
  ctx.font = '17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TEMPERATURE', col1X + 30, tempY);

  ctx.fillStyle = '#EF5350';
  circle(ctx, col1X + 65, tempY + 65, 22);

  ctx.fillStyle = C.cyan;
  ctx.font = 'bold 62px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('21.4', col1X + col1W / 2 + 30, tempY + 78);
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('°C', col1X + col1W - 48, tempY + 78);

  // Humidity
  const humY = tempY + 150;
  ctx.fillStyle = C.label;
  ctx.font = '17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HUMIDITY', col1X + 30, humY);

  ctx.fillStyle = '#42A5F5';
  circle(ctx, col1X + 65, humY + 65, 22);

  ctx.fillStyle = C.cyan;
  ctx.font = 'bold 62px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('46.9', col1X + col1W / 2 + 30, humY + 78);
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('%', col1X + col1W - 48, humY + 78);

  // Room Pressure
  const presY = humY + 150;
  ctx.fillStyle = C.label;
  ctx.font = '17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ROOM PRESSURE', col1X + 30, presY);

  ctx.fillStyle = '#9575CD';
  circle(ctx, col1X + 65, presY + 65, 22);

  ctx.fillStyle = C.purple;
  ctx.font = 'bold 62px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('09', col1X + col1W / 2 + 30, presY + 78);
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('Pa', col1X + col1W - 48, presY + 78);

  // --- Col 2: Lampu ---
  ctx.fillStyle = C.sectionBg;
  rr(ctx, col2X, mainY, col2W, mainH, 10);
  ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = C.label;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAMPU', col2X + col2W / 2, mainY + 30);

  ctx.strokeStyle = C.divider;
  ctx.beginPath();
  ctx.moveTo(col2X + 20, mainY + 50);
  ctx.lineTo(col2X + col2W - 20, mainY + 50);
  ctx.stroke();

  const lampCX = col2X + col2W / 2;

  // Lamp 1
  ctx.fillStyle = C.lampOn;
  circle(ctx, lampCX, mainY + 145, 40);
  ctx.fillStyle = C.lampFill;
  circle(ctx, lampCX, mainY + 145, 24);
  ctx.fillStyle = C.lampText;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('L1', lampCX, mainY + 150);
  ctx.fillStyle = '#66BB6A';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('ON', lampCX, mainY + 210);

  // Lamp 2
  ctx.fillStyle = C.lampOn;
  circle(ctx, lampCX, mainY + 280, 40);
  ctx.fillStyle = C.lampFill;
  circle(ctx, lampCX, mainY + 280, 24);
  ctx.fillStyle = C.lampText;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('L2', lampCX, mainY + 285);
  ctx.fillStyle = '#66BB6A';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('ON', lampCX, mainY + 345);

  // --- Col 3: Medical Gas ---
  ctx.fillStyle = C.sectionBg;
  rr(ctx, col3X, mainY, col3W, mainH, 10);
  ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = C.label;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MEDICAL GAS  (Bar)', col3X + col3W / 2, mainY + 30);

  ctx.strokeStyle = C.divider;
  ctx.beginPath();
  ctx.moveTo(col3X + 20, mainY + 50);
  ctx.lineTo(col3X + col3W - 20, mainY + 50);
  ctx.stroke();

  // Gas 2×2 grid
  const gasData = [
    { label: 'O₂',  value: '05.7', x: col3X + col3W * 0.28, y: mainY + 110 },
    { label: 'N₂O', value: '00.0', x: col3X + col3W * 0.72, y: mainY + 110 },
    { label: 'Air',  value: '00.0', x: col3X + col3W * 0.28, y: mainY + 220 },
    { label: 'Vac',  value: '0.00', x: col3X + col3W * 0.72, y: mainY + 220 },
  ];
  for (const g of gasData) {
    ctx.fillStyle = C.label;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.label, g.x, g.y - 30);
    ctx.fillStyle = C.amber;
    ctx.font = 'bold 46px monospace';
    ctx.fillText(g.value, g.x, g.y + 18);
  }

  // Divider before alarm
  const alarmY = mainY + 320;
  ctx.strokeStyle = C.divider;
  ctx.beginPath();
  ctx.moveTo(col3X + 20, alarmY - 20);
  ctx.lineTo(col3X + col3W - 20, alarmY - 20);
  ctx.stroke();

  ctx.fillStyle = C.label;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MEDICAL GAS ALARM', col3X + col3W / 2, alarmY);

  const alarmData = [
    { label: 'O₂',  ok: true,  x: col3X + col3W * 0.15 },
    { label: 'N₂O', ok: true,  x: col3X + col3W * 0.40 },
    { label: 'Air',  ok: false, x: col3X + col3W * 0.65 },
    { label: 'Vac',  ok: true,  x: col3X + col3W * 0.90 },
  ];
  for (const a of alarmData) {
    const ay = alarmY + 80;
    ctx.fillStyle = a.ok ? C.alarmOk : C.alarmFail;
    circle(ctx, a.x, ay, 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(a.ok ? '✓' : '✗', a.x, ay + 2);
    ctx.fillStyle = C.label;
    ctx.font = '15px sans-serif';
    ctx.fillText(a.label, a.x, ay + 56);
  }

  // ── 4. Bottom bar (y=835 → y=1068) ──
  const botY = 835;

  // Lampu buttons panel
  ctx.fillStyle = C.sectionBg;
  rr(ctx, 20, botY, 720, 233, 10);
  ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = C.label;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LAMPU', 380, botY + 28);

  ctx.fillStyle = C.btnL;
  rr(ctx, 50, botY + 55, 285, 85, 12);
  ctx.fill();
  ctx.fillStyle = C.btnText;
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('L1 ON', 193, botY + 103);

  ctx.fillStyle = C.btnL;
  rr(ctx, 385, botY + 55, 285, 85, 12);
  ctx.fill();
  ctx.fillStyle = C.btnText;
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('L2 ON', 528, botY + 103);

  // System panel
  ctx.fillStyle = C.sectionBg;
  rr(ctx, 760, botY, 430, 233, 10);
  ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = C.label;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SYSTEM', 975, botY + 28);

  ctx.fillStyle = C.btnOn;
  rr(ctx, 795, botY + 55, 200, 85, 12);
  ctx.fill();
  ctx.fillStyle = C.btnText;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('ON', 895, botY + 103);

  ctx.fillStyle = C.btnMute;
  rr(ctx, 1020, botY + 55, 140, 85, 12);
  ctx.fill();
  ctx.fillStyle = '#CFD8DC';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('–', 1090, botY + 103);

  // Logo placeholder area (drawn async below)
  // Reserve: x=1210 y=botY+10 w=690 h=213
  // Just leave it dark (C.sectionBg) — SVG will draw on top
  ctx.fillStyle = C.sectionBg;
  rr(ctx, 1210, botY, 690, 233, 10);
  ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();
}

// ─── Public factory ───────────────────────────────────────────

export function createScreenUITexture(): THREE.CanvasTexture {
  const CW = 1920, CH = 1080;
  const canvas = document.createElement('canvas');
  canvas.width  = CW;
  canvas.height = CH;

  // Draw all synchronous UI elements
  drawUI(canvas);

  // Create texture with sharp filtering (no mipmap blur)
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace      = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter       = THREE.LinearFilter;
  tex.magFilter       = THREE.LinearFilter;

  // Load SVG logo asynchronously and draw into logo area
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d')!;
    // Correct proportions: SVG ratio = 1754:1299 ≈ 1.35:1
    // Fit comfortably inside panel (690×233): use h=170 → w=229
    const logoW = 229, logoH = 170;
    const lx = 1210 + (690 - logoW) / 2;  // center-x in panel
    const ly = 835  + (233 - logoH) / 2;  // center-y in panel

    // Draw SVG to offscreen canvas, then colorize white
    const off = document.createElement('canvas');
    off.width  = logoW;
    off.height = logoH;
    const offCtx = off.getContext('2d')!;
    offCtx.drawImage(img, 0, 0, logoW, logoH);
    offCtx.globalCompositeOperation = 'source-in';
    offCtx.fillStyle = 'rgba(255,255,255,0.92)';
    offCtx.fillRect(0, 0, logoW, logoH);

    ctx.drawImage(off, lx, ly);
    tex.needsUpdate = true;
  };
  img.onerror = () => {
    // Fallback: draw text branding if SVG fails to load
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#5A8AB0';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ELFATECH', 1555, 835 + 116);
    ctx.fillStyle = '#3A5A7A';
    ctx.font = '20px sans-serif';
    ctx.fillText('PT Teknomed Indo', 1555, 835 + 160);
    tex.needsUpdate = true;
  };
  img.src = '/logo-elfatech.svg';

  return tex;
}
