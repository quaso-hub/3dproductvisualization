import type { Product } from '../data/products';

/**
 * X-RAY VIEWER (Double Screen LED Illuminator)
 * ─────────────────────────────────────────────────────────────
 * Medical X-Ray film viewing illuminator dengan 2 layar LED side-by-side.
 * Wall-mounted, slim profile (~30mm), aluminium frame.
 *
 * Dimensi (rev 2026-05-25 — match real product specs):
 *   • Frame     : 820 × 500 × 30 mm  (W×H×D)
 *   • Viewing   : 720 × 420 mm combined (2 panels side-by-side)
 *   • Per panel : ~355 × 420 mm
 *
 * Spesifikasi:
 *   • Brightness  : >10,000 LUX (≈ 4,000–6,000 cd/m² per panel)
 *   • Color Temp  : 8,000K (adjustable 5,900 – 9,000K models)
 *   • Uniformity  : ≥ 90 %
 *   • CRI         : 93
 *   • Dimming     : 0–100% PWM, 9-step buttons
 *   • Power       : 30–60 W, AC 100–240 V, 50/60 Hz
 *   • LED life    : >50,000 h
 *   • Material    : Aluminium frame, ABS rear housing,
 *                   acrylic diffuser + light-guide plate
 *
 * Konstruksi (back → front):
 *   1. Wall-mount bracket (VESA-style + hooks)
 *   2. ABS rear housing (vent slots + IEC AC inlet)
 *   3. Side-lit LED edge bars + acrylic light-guide plate
 *   4. Acrylic diffuser panels × 2 (left + right)
 *   5. Center divider strip
 *   6. Aluminium frame border + control panel + film clips
 *
 * Reference products:
 *   • MEDIK YA-NS02D       (810 × 500 × 25 mm)
 *   • Mplent ZG-2          (840 × 502 × 38 mm)
 *   • Rooe AOT-1D          (slim aero profile + ABS)
 *
 * See: docs/research/2026-05-25-xray-viewer-product-references.md
 *
 * Scene scale: 1 unit = 10mm. Coordinate system:
 *   X = width, Y = height, +Z = front (out of wall toward viewer).
 * ─────────────────────────────────────────────────────────────
 */

const XRAY_VIEWER: Product = {
  id: 'xray-viewer',
  name: 'X-Ray Viewer',
  fullName: 'X-Ray Viewer Double Screen LED',
  description:
    'Illuminator X-Ray film dengan 2 layar LED high-brightness (>10,000 LUX). ' +
    'Frame aluminium anodized, dimming 20-100%, color temperature adjustable 5,900-9,000K. ' +
    'CRI 93, power 30W. Wall-mounted recessed untuk ruang radiologi dan operasi.',
  category: 'Peralatan Medis',
  badge: 'LED High-Brightness',
  badgeColor: 'bg-sky-100 text-sky-800',
  viewerType: 'xray-viewer',
  views: ['assembled', 'exploded'],

  /**
   * Layers = ringkasan stack-up komponen dari belakang ke depan,
   * digunakan oleh spec panel. Tidak dipakai langsung oleh viewer 3D
   * (geometry dibuat eksplisit di XrayViewerAssembled3D / Exploded3D
   * berdasarkan blueprint produk asli).
   */
  layers: [
    { name: 'Wall Mount Bracket',           thickness: 0.5, color: 0xc8d4dc, roughness: 0.35, metalness: 1.0 },
    { name: 'ABS Rear Housing',             thickness: 0.8, color: 0xeef0f2, roughness: 0.65, metalness: 0.05 },
    { name: 'Light Guide Plate (Acrylic)',  thickness: 0.4, color: 0xfffaf0, roughness: 0.45, metalness: 0.0  },
    { name: 'Side-Lit LED Edge Bars',       thickness: 0.4, color: 0xfff5d8, roughness: 0.25, metalness: 0.0  },
    { name: 'Diffuser (Acrylic)',           thickness: 0.4, color: 0xfafaf6, roughness: 0.55, metalness: 0.0  },
    { name: 'Aluminium Frame',              thickness: 0.6, color: 0xc2cad2, roughness: 0.40, metalness: 1.0  },
  ],

  dimensions: {
    widthMm: 820,
    heightMm: 500,
    sceneWidth: 82,   // 1:10 scale
    sceneHeight: 50,
  },

  specs: [
    { label: 'Tipe',           value: 'Double-Bay LED Film Viewer (Negatoscope)' },
    { label: 'Dimensi Frame',  value: '820 × 500 × 30 mm' },
    { label: 'Viewing Area',   value: '720 × 420 mm (combined, 2 panels)' },
    { label: 'Per Panel',      value: '355 × 420 mm' },
    { label: 'Brightness',     value: '>10,000 LUX (4,000–6,000 cd/m² per panel)' },
    { label: 'Color Temp',     value: '8,000K (5,900–9,000K adjustable)' },
    { label: 'CRI',            value: '93' },
    { label: 'Dimming',        value: '0–100% PWM (9-step buttons)' },
    { label: 'Uniformity',     value: '≥ 90 %' },
    { label: 'Power',          value: '30–60 W' },
    { label: 'Input Voltage',  value: 'AC 100–240 V, 50/60 Hz' },
    { label: 'LED Lifespan',   value: '>50,000 h' },
    { label: 'Material Frame', value: 'Aluminium Anodized + ABS rear' },
    { label: 'Light Source',   value: 'Side-Lit SMD LED + acrylic light-guide plate' },
    { label: 'Film Clips',     value: 'Silicone, 5 per panel (top edge)' },
    { label: 'Installation',   value: 'Wall-mount (VESA-style backplate) atau desktop bracket' },
    { label: 'Aplikasi',       value: 'Ruang Radiologi, Operasi' },
  ],

  /**
   * Camera presets — retuned 2026-05-25 untuk geometri baru
   * (wide 82×50, slim Z=3). Old presets yang menatap stack vertikal
   * 50W×50H sudah tidak relevan.
   */
  cameraPresets: [
    { name: 'Isometric',       position: [110, 70, 110],  target: [0, 0, 0] },
    { name: 'Tampak Depan',    position: [0, 0, 130],     target: [0, 0, 0] },
    { name: 'Tampak Samping',  position: [130, 0, 0],     target: [0, 0, 0] },
    { name: 'Detail Layar',    position: [-25, 5, 60],    target: [-18, 0, 1.4] },
    { name: 'Detail Kontrol',  position: [55, 5, 60],     target: [37, 0, 1.6] },
    { name: 'Tampak Belakang', position: [0, 10, -120],   target: [0, 0, -1.5] },
  ],

  assembledCameraStart: [110, 70, 110],
  explodedCameraStart:  [140, 70, 170],
};

export default XRAY_VIEWER;
