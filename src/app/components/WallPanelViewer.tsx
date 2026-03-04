import React, { useRef, useEffect, useState, useCallback } from 'react';

type ViewMode = 'assembled' | 'exploded' | 'implementation';

interface Layer {
  id: string;
  name: string;
  material: string;
  realThk: string;
  thk: number;
  fc: string;
  tc: string;
  sc: string;
  desc: string;
  optional: boolean;
}

const LAYERS: Layer[] = [
  {
    id: 'outer-steel',
    name: 'Face Sheet Baja AZ100 (Luar)',
    material: 'Baja AZ100 (100 gr/m²)',
    realThk: '0.5 mm',
    thk: 5,
    fc: '#C0CED8', tc: '#D4E2EE', sc: '#90A0B0',
    desc: 'Baja AZ100 (100 gr/m²) berlapis coating HRP anti-bacterial dari Blue Scope. Anti korosi, tahan karat. Warna terang tidak menyilaukan sesuai standar Permenkes.',
    optional: false,
  },
  {
    id: 'hrp-coating',
    name: 'Coating HRP Anti-bacterial',
    material: 'High-Performance Coating (Blue Scope)',
    realThk: '< 0.1 mm',
    thk: 2,
    fc: '#C8AADE', tc: '#D8BAEE', sc: '#A888BE',
    desc: 'Lapisan coating HRP (High-Performance) anti-bacterial dari Blue Scope. Memenuhi standar Permenkes untuk fasilitas kesehatan.',
    optional: false,
  },
  {
    id: 'lead',
    name: 'Lapisan Timbal (Pb)',
    material: 'Lead Sheet / Plat Timbal',
    realThk: '2 mm',
    thk: 11,
    fc: '#6E8898', tc: '#809AAC', sc: '#4E6878',
    desc: 'Lapisan timbal 2mm untuk proteksi radiasi. Sesuai persyaratan ruang radiologi (rontgen, CT scan, MRI). Opsional sesuai kebutuhan.',
    optional: true,
  },
  {
    id: 'pir',
    name: 'Core PIR (Polyisocyanurate)',
    material: 'Polyisocyanurate Foam',
    realThk: '50 / 75 / 100 mm',
    thk: 62,
    fc: '#E8D845', tc: '#F5EC65', sc: '#C8B818',
    desc: 'Inti Polyisocyanurate (PIR) — insulasi termal superior, ketahanan api tinggi, anti korosi, anti jamur, tahan karat. Tersedia 50 mm, 75 mm, atau 100 mm.',
    optional: false,
  },
  {
    id: 'inner-steel',
    name: 'Face Sheet Baja AZ100 (Dalam)',
    material: 'Baja AZ100 (100 gr/m²)',
    realThk: '0.5 mm',
    thk: 5,
    fc: '#C0CED8', tc: '#D4E2EE', sc: '#90A0B0',
    desc: 'Baja AZ100 (100 gr/m²) berlapis coating HRP anti-bacterial dari Blue Scope. Permukaan dalam ruangan, anti korosi, anti jamur, tahan karat.',
    optional: false,
  },
];

const PW = 158;
const PH = 118;
const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;
const TOTAL_THK = LAYERS.reduce((s, l) => s + l.thk, 0);

function iso(x: number, y: number, z: number, ox: number, oy: number): [number, number] {
  return [ox + (x - z) * C30, oy + (x + z) * S30 - y];
}

function dkn(hex: string, f: number): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex;
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * f));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * f));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * f));
  return `rgb(${r},${g},${b})`;
}

function fillPoly(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  fill: string | CanvasGradient,
  stroke?: string,
  lw = 0.8
) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function pip(mx: number, my: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > my) !== (yj > my) && mx < ((xj - xi) * (my - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

interface BoxPts {
  fbl: [number,number]; fbr: [number,number]; ftr: [number,number]; ftl: [number,number];
  bbl: [number,number]; bbr: [number,number]; btr: [number,number]; btl: [number,number];
}

function getBoxPts(xOff: number, zS: number, d: number, ox: number, oy: number): BoxPts {
  const p = (x: number, y: number, z: number): [number,number] => iso(x + xOff, y, z, ox, oy);
  return {
    fbl: p(0, 0, zS), fbr: p(PW, 0, zS), ftr: p(PW, PH, zS), ftl: p(0, PH, zS),
    bbl: p(0, 0, zS+d), bbr: p(PW, 0, zS+d), btr: p(PW, PH, zS+d), btl: p(0, PH, zS+d),
  };
}

function drawLayerBox(
  ctx: CanvasRenderingContext2D,
  pts: BoxPts,
  layer: Layer,
  opts: { hl?: boolean; alpha?: number; back?: boolean }
) {
  const { hl = false, alpha = 1, back = false } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  const stroke = hl ? '#FFD040' : 'rgba(8,16,48,0.45)';
  const lw = hl ? 2 : 0.85;

  if (back) {
    fillPoly(ctx, [pts.bbl, pts.bbr, pts.btr, pts.btl], dkn(layer.fc, 0.52), stroke, lw);
  }

  // Side face
  fillPoly(ctx, [pts.fbr, pts.bbr, pts.btr, pts.ftr], layer.sc, stroke, lw);

  // Top face
  const tg = ctx.createLinearGradient(pts.ftl[0], pts.ftl[1], pts.btr[0], pts.btr[1]);
  tg.addColorStop(0, layer.tc);
  tg.addColorStop(1, dkn(layer.tc, 0.75));
  fillPoly(ctx, [pts.ftl, pts.ftr, pts.btr, pts.btl], tg, stroke, lw);

  // Front face
  const fg = ctx.createLinearGradient(pts.ftl[0], pts.ftl[1], pts.fbl[0], pts.fbl[1]);
  fg.addColorStop(0, dkn(layer.fc, 1.0));
  fg.addColorStop(1, dkn(layer.fc, 0.88));
  fillPoly(ctx, [pts.fbl, pts.fbr, pts.ftr, pts.ftl], fg, stroke, lw);

  ctx.restore();
}

function getAssembledZStarts(): number[] {
  const out: number[] = [];
  let z = 0;
  for (const l of LAYERS) { out.push(z); z += l.thk; }
  return out;
}

function getExplodedZStarts(gap: number): number[] {
  const out: number[] = [];
  let z = 0;
  for (const l of LAYERS) { out.push(z); z += l.thk + gap; }
  return out;
}

// ===== ASSEMBLED VIEW =====
function drawAssembledView(
  ctx: CanvasRenderingContext2D,
  hoverId: string | null
): { id: string; face: [number,number][] }[] {
  const ox = 220, oy = 282;
  const zs = getAssembledZStarts();
  const hits: { id: string; face: [number,number][] }[] = [];

  // Draw layers back to front
  for (let i = LAYERS.length - 1; i >= 0; i--) {
    const pts = getBoxPts(0, zs[i], LAYERS[i].thk, ox, oy);
    drawLayerBox(ctx, pts, LAYERS[i], { hl: hoverId === LAYERS[i].id });
    // Register right-face strip as hit area
    hits.push({
      id: LAYERS[i].id,
      face: [pts.fbr, pts.bbr, pts.btr, pts.ftr],
    });
  }

  // Labels with leader lines on right side
  const labelX = 490;
  const labelYs = [148, 202, 256, 318, 378];

  for (let i = 0; i < LAYERS.length; i++) {
    const zMid = zs[i] + LAYERS[i].thk / 2;
    const [ax, ay] = iso(PW, PH / 2, zMid, ox, oy);
    const lx = labelX;
    const ly = labelYs[i];
    const hl = hoverId === LAYERS[i].id;

    // Draw leader line
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(lx - 8, ly);
    ctx.strokeStyle = hl ? '#FFD040' : 'rgba(80,120,180,0.55)';
    ctx.lineWidth = hl ? 1.4 : 0.9;
    ctx.setLineDash(hl ? [] : [3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Anchor dot
    ctx.beginPath();
    ctx.arc(ax, ay, hl ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = hl ? '#FFD040' : LAYERS[i].fc;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Label background on hover
    if (hl) {
      ctx.font = 'bold 10.5px Arial';
      const nw = ctx.measureText(LAYERS[i].name).width;
      ctx.fillStyle = 'rgba(30,50,100,0.9)';
      ctx.beginPath();
      ctx.rect(lx - 3, ly - 16, nw + 18, 32);
      ctx.fill();
    }

    // Color dot
    ctx.beginPath();
    ctx.arc(lx + 5, ly - 4, 4, 0, Math.PI * 2);
    ctx.fillStyle = LAYERS[i].fc;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Layer name
    ctx.font = hl ? 'bold 10.5px Arial' : 'bold 10px Arial';
    ctx.fillStyle = hl ? '#FFFFFF' : '#D8EAF8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(LAYERS[i].name, lx + 14, ly - 4);

    // Thickness + optional badge
    ctx.font = '9px Arial';
    ctx.fillStyle = hl ? '#A8D0F0' : '#6A8EAC';
    const thkStr = LAYERS[i].realThk + (LAYERS[i].optional ? '  ★ Opsional' : '');
    ctx.fillText(thkStr, lx + 14, ly + 8);
  }

  // === Dimension Lines ===
  // Height dim (left side)
  const [htlx, htly] = iso(0, PH, 0, ox, oy);
  const [hblx, hbly] = iso(0, 0, 0, ox, oy);
  const hDimX = htlx - 32;

  ctx.beginPath();
  ctx.moveTo(htlx - 4, htly); ctx.lineTo(hDimX, htly);
  ctx.moveTo(hblx - 4, hbly); ctx.lineTo(hDimX, hbly);
  ctx.moveTo(hDimX, htly); ctx.lineTo(hDimX, hbly);
  ctx.strokeStyle = '#5A7A9A';
  ctx.lineWidth = 1;
  ctx.stroke();
  ([{y: htly, d:-1},{y: hbly, d:1}] as {y:number;d:number}[]).forEach(({y,d}) => {
    ctx.beginPath();
    ctx.moveTo(hDimX-3, y+d*5); ctx.lineTo(hDimX, y); ctx.lineTo(hDimX+3, y+d*5);
    ctx.strokeStyle = '#5A7A9A'; ctx.stroke();
  });
  ctx.save();
  ctx.translate(hDimX - 13, (htly + hbly) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#78A0C0';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Tinggi: 3000 mm', 0, 0);
  ctx.restore();

  // Width dim (top)
  const [wtlx, wtly] = iso(0, PH, 0, ox, oy);
  const [wtrx, wtry] = iso(PW, PH, 0, ox, oy);
  const wDimY = Math.min(wtly, wtry) - 20;
  ctx.beginPath();
  ctx.moveTo(wtlx, wtly-4); ctx.lineTo(wtlx, wDimY);
  ctx.moveTo(wtrx, wtry-4); ctx.lineTo(wtrx, wDimY);
  ctx.moveTo(wtlx, wDimY); ctx.lineTo(wtrx, wDimY);
  ctx.strokeStyle = '#5A7A9A'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#78A0C0';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('Lebar: 1200 mm', (wtlx+wtrx)/2, wDimY - 2);

  // Thickness dim
  const [ftrx, ftry] = iso(PW, PH, 0, ox, oy);
  const [btrx, btry] = iso(PW, PH, TOTAL_THK, ox, oy);
  ctx.beginPath();
  ctx.moveTo(ftrx, ftry - 10); ctx.lineTo(btrx, btry - 10);
  ctx.strokeStyle = '#5A7A9A'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#78A0C0';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('50 / 75 / 100 mm', (ftrx+btrx)/2, (ftry+btry)/2 - 12);

  return hits;
}

// ===== EXPLODED VIEW =====
function drawExplodedView(
  ctx: CanvasRenderingContext2D,
  hoverId: string | null
): { id: string; face: [number,number][] }[] {
  const ox = 335, oy = 198;
  const gap = 30;
  const zs = getExplodedZStarts(gap);
  const hits: { id: string; face: [number,number][] }[] = [];

  // Draw from back to front
  for (let i = LAYERS.length - 1; i >= 0; i--) {
    const pts = getBoxPts(0, zs[i], LAYERS[i].thk, ox, oy);
    drawLayerBox(ctx, pts, LAYERS[i], { hl: hoverId === LAYERS[i].id, back: true });
    hits.push({ id: LAYERS[i].id, face: [pts.fbl, pts.fbr, pts.ftr, pts.ftl] });

    // Connecting dashed lines between layers
    if (i < LAYERS.length - 1) {
      const zBackEdge = zs[i] + LAYERS[i].thk;
      const zNextFront = zs[i + 1];
      ([[PW, 0], [PW, PH], [0, PH]] as [number,number][]).forEach(([cx, cy]) => {
        const [x1, y1] = iso(cx, cy, zBackEdge, ox, oy);
        const [x2, y2] = iso(cx, cy, zNextFront, ox, oy);
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(80,120,200,0.3)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  }

  // Labels for each layer
  for (let i = 0; i < LAYERS.length; i++) {
    const zMid = zs[i] + LAYERS[i].thk / 2;
    const [rx, ry] = iso(PW + 6, PH / 2, zMid, ox, oy);
    const hl = hoverId === LAYERS[i].id;

    const lx = rx + 52;
    const ly = ry;

    // Leader line
    ctx.beginPath();
    ctx.moveTo(rx, ry); ctx.lineTo(lx - 8, ly);
    ctx.strokeStyle = hl ? '#FFD040' : (LAYERS[i].fc + 'CC');
    ctx.lineWidth = hl ? 1.6 : 1.1;
    ctx.stroke();

    // Anchor dot
    ctx.beginPath();
    ctx.arc(rx, ry, hl ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = hl ? '#FFD040' : LAYERS[i].fc;
    ctx.fill();

    // Label box
    ctx.font = 'bold 10px Arial';
    const nw = ctx.measureText(LAYERS[i].name).width;
    ctx.font = '8.5px Arial';
    const bw = Math.max(nw, ctx.measureText(LAYERS[i].realThk).width + 30) + 16;
    const bh = 30;
    const bx = lx - 4, by = ly - 17;

    ctx.fillStyle = hl ? 'rgba(35,55,110,0.95)' : 'rgba(8,16,36,0.82)';
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.fill();

    ctx.strokeStyle = hl ? '#FFD040' : (LAYERS[i].fc + '88');
    ctx.lineWidth = hl ? 1.3 : 0.6;
    ctx.stroke();

    // Color dot in label
    ctx.beginPath();
    ctx.arc(lx + 6, ly - 5, 4, 0, Math.PI * 2);
    ctx.fillStyle = LAYERS[i].fc;
    ctx.fill();

    // Name text
    ctx.font = hl ? 'bold 10.5px Arial' : 'bold 10px Arial';
    ctx.fillStyle = hl ? '#FFFFFF' : '#D4E8F8';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(LAYERS[i].name, lx + 16, ly - 5);

    // Thickness + optional
    ctx.font = '8.5px Arial';
    ctx.fillStyle = hl ? '#A8D0F0' : '#6080A0';
    const thkLabel = LAYERS[i].realThk + (LAYERS[i].optional ? '  ★ Opsional' : '');
    ctx.fillText(thkLabel, lx + 16, ly + 7);
  }

  return hits;
}

// ===== IMPLEMENTATION VIEW =====
function drawImplementationView(
  ctx: CanvasRenderingContext2D,
  hoverId: string | null
): { id: string; face: [number,number][] }[] {
  const ox = 175, oy = 218;
  const nPanels = 3;
  const zs = getAssembledZStarts();
  const hits: { id: string; face: [number,number][] }[] = [];

  // Draw floor
  const totalW = nPanels * PW;
  const floorD = 38;
  const floorH = 6;
  const fp = (x: number, y: number, z: number): [number,number] => iso(x, y, z, ox, oy + floorH);
  const ff = {
    fbl: fp(-10,0,0), fbr: fp(totalW+10,0,0), ftr: fp(totalW+10,floorH,0), ftl: fp(-10,floorH,0),
    bbl: fp(-10,0,floorD), bbr: fp(totalW+10,0,floorD), btr: fp(totalW+10,floorH,floorD), btl: fp(-10,floorH,floorD),
  };
  const floorSideG = ctx.createLinearGradient(ff.fbr[0],ff.fbr[1],ff.bbr[0],ff.bbr[1]);
  floorSideG.addColorStop(0,'#384858'); floorSideG.addColorStop(1,'#283848');
  fillPoly(ctx,[ff.fbr,ff.bbr,ff.btr,ff.ftr],floorSideG,'rgba(0,0,0,0.5)',0.8);
  const floorTopG = ctx.createLinearGradient(ff.ftl[0],ff.ftl[1],ff.btr[0],ff.btr[1]);
  floorTopG.addColorStop(0,'#546474'); floorTopG.addColorStop(1,'#3A4A5A');
  fillPoly(ctx,[ff.ftl,ff.ftr,ff.btr,ff.btl],floorTopG,'rgba(0,0,0,0.5)',0.8);
  fillPoly(ctx,[ff.fbl,ff.fbr,ff.ftr,ff.ftl],'#6A7A8A','rgba(0,0,0,0.5)',0.8);

  // Draw panels back to front
  for (let p = nPanels - 1; p >= 0; p--) {
    const xOff = p * PW;
    const isHl = hoverId === `panel-${p}`;
    for (let i = LAYERS.length - 1; i >= 0; i--) {
      const pts = getBoxPts(xOff, zs[i], LAYERS[i].thk, ox, oy);
      drawLayerBox(ctx, pts, LAYERS[i], { hl: isHl });
    }
    // Hit region
    const fullPts = getBoxPts(xOff, 0, TOTAL_THK, ox, oy);
    hits.push({ id: `panel-${p}`, face: [fullPts.fbl, fullPts.fbr, fullPts.ftr, fullPts.ftl] });

    // Panel label
    const [cx, cy] = iso(xOff + PW / 2, PH / 2, 0, ox, oy);
    ctx.font = '9px Arial';
    ctx.fillStyle = 'rgba(180,210,240,0.55)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`Panel ${p + 1}`, cx, cy + 10);
  }

  // Joint lines between panels
  for (let p = 1; p < nPanels; p++) {
    const [jt] = [iso(p * PW, PH, 0, ox, oy)];
    const [jb] = [iso(p * PW, 0, 0, ox, oy)];
    ctx.beginPath();
    ctx.moveTo(jt[0], jt[1]); ctx.lineTo(jb[0], jb[1]);
    ctx.strokeStyle = 'rgba(160,200,240,0.65)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Joint label
    ctx.font = '8px Arial';
    ctx.fillStyle = 'rgba(140,180,220,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('Sambungan', (jt[0]+jb[0])/2 + 18, (jt[1]+jb[1])/2 + 8);
  }

  // Height dimension
  const [htlx, htly] = iso(0, PH, 0, ox, oy);
  const [hblx, hbly] = iso(0, 0, 0, ox, oy);
  const hDimX = htlx - 30;
  ctx.beginPath();
  ctx.moveTo(htlx-4,htly); ctx.lineTo(hDimX,htly);
  ctx.moveTo(hblx-4,hbly); ctx.lineTo(hDimX,hbly);
  ctx.moveTo(hDimX,htly); ctx.lineTo(hDimX,hbly);
  ctx.strokeStyle='#5A7A9A'; ctx.lineWidth=1; ctx.stroke();
  ([{y:htly,d:-1},{y:hbly,d:1}] as {y:number;d:number}[]).forEach(({y,d}) => {
    ctx.beginPath();
    ctx.moveTo(hDimX-3,y+d*5); ctx.lineTo(hDimX,y); ctx.lineTo(hDimX+3,y+d*5);
    ctx.strokeStyle='#5A7A9A'; ctx.stroke();
  });
  ctx.save();
  ctx.translate(hDimX-13,(htly+hbly)/2);
  ctx.rotate(-Math.PI/2);
  ctx.font='bold 10px Arial'; ctx.fillStyle='#78A0C0';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Tinggi: 3000 mm',0,0);
  ctx.restore();

  // Width dimension per panel
  const [wblx, wbly] = iso(0, PH, 0, ox, oy);
  const [wbrx, wbry] = iso(PW, PH, 0, ox, oy);
  const wDimY = Math.min(wbly, wbry) - 18;
  ctx.beginPath();
  ctx.moveTo(wblx,wbly-4); ctx.lineTo(wblx,wDimY);
  ctx.moveTo(wbrx,wbry-4); ctx.lineTo(wbrx,wDimY);
  ctx.moveTo(wblx,wDimY); ctx.lineTo(wbrx,wDimY);
  ctx.strokeStyle='#5A7A9A'; ctx.lineWidth=1; ctx.stroke();
  ctx.font='bold 10px Arial'; ctx.fillStyle='#78A0C0';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('1200 mm',(wblx+wbrx)/2,wDimY-2);

  // Specs panel
  const sx = 545, sy = 68;
  ctx.fillStyle = 'rgba(10,20,42,0.75)';
  ctx.beginPath(); ctx.rect(sx, sy, 248, 200); ctx.fill();
  ctx.strokeStyle = 'rgba(80,120,180,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();

  ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#90B8D8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('SPESIFIKASI PANEL', sx + 12, sy + 12);

  ctx.beginPath();
  ctx.moveTo(sx + 10, sy + 28); ctx.lineTo(sx + 238, sy + 28);
  ctx.strokeStyle = 'rgba(80,120,180,0.35)'; ctx.lineWidth = 0.7; ctx.stroke();

  const specs = [
    { label: 'Dimensi', val: '1200 × 3000 mm' },
    { label: 'Ketebalan', val: '50 / 75 / 100 mm' },
    { label: 'Material inti', val: 'PIR (Polyisocyanurate)' },
    { label: 'Face sheet', val: 'Baja AZ100 (100 gr/m²)' },
    { label: 'Coating', val: 'HRP Anti-bacterial (Blue Scope)' },
    { label: 'Proteksi radiasi', val: 'Timbal 2 mm (opsional)' },
    { label: 'Standar', val: 'Permenkes' },
    { label: 'Sifat', val: 'Anti korosi, anti jamur, tahan api' },
  ];

  specs.forEach((s, i) => {
    const y = sy + 36 + i * 20;
    ctx.font = '9px Arial'; ctx.fillStyle = '#5A7A9A';
    ctx.fillText('•', sx + 12, y);
    ctx.fillStyle = '#6A8AAC';
    ctx.fillText(s.label + ':', sx + 22, y);
    ctx.fillStyle = '#A8C8E8';
    ctx.font = 'bold 9px Arial';
    ctx.fillText(s.val, sx + 22, y + 11);
  });

  return hits;
}

// ===== MAIN COMPONENT =====
export function WallPanelViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<ViewMode>('assembled');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; layer: Layer } | null>(null);
  const hitsRef = useRef<{ id: string; face: [number,number][] }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Background
    const bg = ctx.createRadialGradient(cw/2, ch/2, 0, cw/2, ch/2, cw * 0.75);
    bg.addColorStop(0, '#0E1C30');
    bg.addColorStop(1, '#080E1C');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    // Subtle grid
    ctx.strokeStyle = 'rgba(40,65,110,0.18)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx < cw; gx += 35) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ch); ctx.stroke();
    }
    for (let gy = 0; gy < ch; gy += 35) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cw, gy); ctx.stroke();
    }

    // View watermark label
    const viewLabel: Record<ViewMode, string> = {
      assembled: 'ASSEMBLED 3D VIEW',
      exploded: 'EXPLODED VIEW',
      implementation: 'IMPLEMENTATION VIEW',
    };
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = 'rgba(80,130,200,0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(viewLabel[view], cw / 2, 10);

    let hits: { id: string; face: [number,number][] }[];
    if (view === 'assembled') hits = drawAssembledView(ctx, hoverId);
    else if (view === 'exploded') hits = drawExplodedView(ctx, hoverId);
    else hits = drawImplementationView(ctx, hoverId);

    hitsRef.current = hits;
  }, [view, hoverId]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let found: string | null = null;
    for (const hit of hitsRef.current) {
      if (pip(mx, my, hit.face)) { found = hit.id; break; }
    }

    if (found !== hoverId) setHoverId(found);

    if (found) {
      const layerId = found.startsWith('panel-') ? LAYERS[0].id : found;
      const layer = found.startsWith('panel-')
        ? ({ ...LAYERS[0], name: 'Wall Panel (Assembled)', desc: 'Panel dinding sandwich terdiri dari 5 lapisan: Face Sheet Baja AZ100, Coating HRP Anti-bacterial, Lapisan Timbal (opsional), Core PIR, dan Face Sheet bagian dalam. Dimensi standar 1200×3000mm.' } as Layer)
        : LAYERS.find(l => l.id === found);
      if (layer) setTooltip({ x: e.clientX, y: e.clientY, layer });
    } else {
      setTooltip(null);
    }
  }, [hoverId]);

  const handleMouseLeave = useCallback(() => {
    setHoverId(null);
    setTooltip(null);
  }, []);

  const tabs = [
    { v: 'assembled' as ViewMode, label: 'Assembled 3D', icon: '◈' },
    { v: 'exploded' as ViewMode, label: 'Exploded View', icon: '⊞' },
    { v: 'implementation' as ViewMode, label: 'Implementasi', icon: '⊟' },
  ];

  return (
    <div className="relative w-full select-none">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(({ v, label, icon }) => (
          <button
            key={v}
            onClick={() => { setView(v); setHoverId(null); setTooltip(null); }}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              view === v
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/60 ring-1 ring-blue-400/40'
                : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700 hover:text-gray-200 ring-1 ring-gray-700'
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center text-xs text-gray-500 pr-1">
          {view === 'exploded' && '🖱 Hover tiap lapisan untuk detail'}
          {view === 'assembled' && '🖱 Hover tepi panel untuk detail lapisan'}
          {view === 'implementation' && '🖱 Hover panel untuk info spesifikasi'}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden ring-1 ring-gray-700/60 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={820}
          height={490}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full block"
          style={{ cursor: hoverId ? 'pointer' : 'default', backgroundColor: '#080E1C' }}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 px-1">
        {LAYERS.map(l => (
          <div key={l.id} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: l.fc, boxShadow: `0 0 4px ${l.fc}80` }}
            />
            <span className="text-xs text-gray-400">{l.name}</span>
            {l.optional && (
              <span className="text-xs text-amber-500/70">★</span>
            )}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 16, top: tooltip.y - 14 }}
        >
          <div
            className="rounded-xl p-3.5 shadow-2xl max-w-xs"
            style={{
              backgroundColor: 'rgba(8,16,36,0.97)',
              border: `1px solid ${tooltip.layer.fc}88`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-start gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0"
                style={{ backgroundColor: tooltip.layer.fc, boxShadow: `0 0 6px ${tooltip.layer.fc}` }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-bold leading-tight">{tooltip.layer.name}</span>
                  {tooltip.layer.optional && (
                    <span className="text-xs bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/40">
                      Opsional
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1 mb-2">
              <div className="flex gap-1.5">
                <span className="text-gray-500 text-xs w-16 flex-shrink-0">Material</span>
                <span className="text-gray-200 text-xs">{tooltip.layer.material}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-gray-500 text-xs w-16 flex-shrink-0">Ketebalan</span>
                <span className="text-emerald-300 text-xs font-bold">{tooltip.layer.realThk}</span>
              </div>
            </div>
            <div
              className="h-px w-full mb-2"
              style={{ backgroundColor: `${tooltip.layer.fc}40` }}
            />
            <p className="text-gray-400 text-xs leading-relaxed">{tooltip.layer.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
