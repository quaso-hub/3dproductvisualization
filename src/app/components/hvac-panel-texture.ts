/**
 * hvac-panel-texture.ts
 * ─────────────────────────────────────────────────────────────
 * Simplified Canvas2D HVAC dashboard texture for Control Panel
 * AHU's HMI 7" screen. Used by HvacSystemAssembled3D and
 * HvacSystemExploded3D.
 *
 * Much simpler than the Surgical Panel's full SCADA UI —
 * shows temperature, humidity, pressure + status indicators.
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';

export function createHvacHMITexture(): THREE.CanvasTexture {
  const CW = 480, CH = 320;
  const canvas = document.createElement('canvas');
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, CW, CH);

  // Header
  ctx.fillStyle = '#0e2040';
  ctx.fillRect(0, 0, CW, 40);
  ctx.strokeStyle = '#1a4a70';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(CW, 40); ctx.stroke();

  ctx.fillStyle = '#e0e8f0';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AHU CONTROL SYSTEM', CW / 2, 26);

  // Temperature
  ctx.fillStyle = '#4fc3f7';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('21.4', 120, 100);
  ctx.font = '16px sans-serif';
  ctx.fillText('°C', 180, 100);
  ctx.fillStyle = '#6090b0';
  ctx.font = '11px sans-serif';
  ctx.fillText('TEMPERATURE', 130, 120);

  // Humidity
  ctx.fillStyle = '#4fc3f7';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('46.9', 350, 100);
  ctx.font = '16px sans-serif';
  ctx.fillText('%', 410, 100);
  ctx.fillStyle = '#6090b0';
  ctx.font = '11px sans-serif';
  ctx.fillText('HUMIDITY', 360, 120);

  // Divider
  ctx.strokeStyle = '#1a3a5c';
  ctx.beginPath(); ctx.moveTo(20, 140); ctx.lineTo(CW - 20, 140); ctx.stroke();

  // Pressure
  ctx.fillStyle = '#ce93d8';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('+15 Pa', 130, 180);
  ctx.fillStyle = '#6090b0';
  ctx.font = '11px sans-serif';
  ctx.fillText('ROOM PRESSURE', 130, 200);

  // Filter status
  ctx.fillStyle = '#00e676';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('FILTER OK', 350, 175);
  ctx.fillStyle = '#6090b0';
  ctx.font = '11px sans-serif';
  ctx.fillText('G4 + F8/F9', 350, 200);

  // Bottom status bar
  ctx.fillStyle = '#0e2040';
  ctx.fillRect(0, CH - 50, CW, 50);
  ctx.strokeStyle = '#1a4a70';
  ctx.beginPath(); ctx.moveTo(0, CH - 50); ctx.lineTo(CW, CH - 50); ctx.stroke();

  // Status indicators
  const indicators = [
    { label: 'FAN', color: '#00e676', x: 80 },
    { label: 'HEAT', color: '#ff9800', x: 180 },
    { label: 'COOL', color: '#4fc3f7', x: 280 },
    { label: 'UV-C', color: '#ce93d8', x: 380 },
  ];
  for (const ind of indicators) {
    ctx.fillStyle = ind.color;
    ctx.beginPath();
    ctx.arc(ind.x, CH - 30, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a0b0c0';
    ctx.font = '10px sans-serif';
    ctx.fillText(ind.label, ind.x, CH - 12);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
