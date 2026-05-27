import type { Product } from '../data/products';

/**
 * SURGICAL CONTROL PANEL TOUCHSCREEN
 * ─────────────────────────────────────────────────────────────
 * Windows Smart Control Panel untuk ruang operasi.
 * Touchscreen control dengan Modbus TCP/IP protocol.
 *
 * Dimensi:
 *   • Panel     : 600 × 500 × 100 mm (W×H×D)
 *   • Screen    : 15.6" diagonal (approx 346 × 194 mm active area)
 *   • Housing   : Stainless steel brushed
 *
 * Fungsi:
 *   • Operating timer display
 *   • Temperature & humidity monitoring
 *   • HVAC control (airflow, pressure)
 *   • Lighting control (OR lights, LED panels)
 *   • Medical gas monitoring
 *   • Emergency controls
 *   • Door interlock status
 *
 * Komponen:
 *   1. Front glass touchscreen (Gorilla Glass equivalent)
 *   2. IPS LCD display panel
 *   3. Touch digitizer layer
 *   4. Mainboard + CPU module
 *   5. Power supply + UPS battery backup
 *   6. I/O connector array (RJ45, USB, RS485)
 *   7. Housing steel frame
 *   8. Mounting brackets
 *
 * Scene scale: 1 unit = 10mm
 * ─────────────────────────────────────────────────────────────
 */

const SURGICAL_CONTROL_PANEL: Product = {
  id: 'surgical-control-panel',
  name: 'Surgical Panel',
  fullName: 'Surgical Control Panel Touchscreen',
  description:
    'Pusat kontrol sistem ruang operasi berbasis Windows Smart Control Panel. ' +
    'Touchscreen 15.6", protocol Modbus TCP/IP, dengan operating timer, monitoring suhu/kelembaban, ' +
    'kontrol HVAC, pencahayaan, dan medical gas. Housing stainless steel dengan IP54 rating.',
  category: 'Peralatan Kontrol',
  badge: 'Smart Control',
  badgeColor: 'bg-indigo-100 text-indigo-800',
  viewerType: 'surgical-control-panel',
  views: ['assembled', 'exploded'],

  /**
   * Layers = exploded view dari depan ke belakang.
   */
  layers: [
    { name: 'Glass Touchscreen',    thickness: 3,    color: 0x1a1a1a, roughness: 0.05, metalness: 0.0 },
    { name: 'LCD Display Panel',    thickness: 8,    color: 0x0a0a0a, roughness: 0.9, metalness: 0.0 },
    { name: 'Touch Digitizer',      thickness: 1.5,  color: 0x2a2a2a, roughness: 0.8, metalness: 0.0 },
    { name: 'Mainboard + CPU',      thickness: 12,   color: 0x1a5f2a, roughness: 0.7, metalness: 0.1 },
    { name: 'Power + UPS Module',    thickness: 15,   color: 0x1a1a1a, roughness: 0.6, metalness: 0.2 },
    { name: 'I/O Connector Array', thickness: 5,    color: 0x4a4a4a, roughness: 0.5, metalness: 0.4 },
    { name: 'Housing Steel Frame',   thickness: 2,    color: 0xc8d4dc, roughness: 0.25, metalness: 0.85 },
    { name: 'Mounting Brackets',     thickness: 3,    color: 0x8a9ba8, roughness: 0.4, metalness: 0.75 },
  ],

  dimensions: {
    widthMm: 600,
    heightMm: 500,
    sceneWidth: 60,   // 1:10 scale
    sceneHeight: 50,
  },

  specs: [
    { label: 'Tipe',             value: 'Windows Smart Control Panel' },
    { label: 'Layar',            value: '15.6" IPS LCD Touchscreen' },
    { label: 'Resolusi',         value: '1920 × 1080 (Full HD)' },
    { label: 'Protocol',         value: 'Modbus TCP/IP' },
    { label: 'Dimensi Panel',    value: '600 × 500 × 100 mm' },
    { label: 'Area Aktif LCD',   value: '346 × 194 mm' },
    { label: 'Housing',          value: 'Stainless Steel Brushed' },
    { label: 'IP Rating',        value: 'IP54' },
    { label: 'Operating Timer',   value: 'Digital Display' },
    { label: 'Monitoring',        value: 'Suhu, Kelembaban, Pressure' },
    { label: 'Kontrol',          value: 'HVAC, Lighting, Gas, Door' },
    { label: 'Power',            value: 'AC 100-240V + UPS Backup' },
    { label: 'I/O Ports',         value: 'RJ45 × 2, USB × 4, RS485' },
    { label: 'Mounting',          value: 'Wall-mounted recessed' },
  ],

  // Camera presets — retuned 2026-05-25 (Item 5 Session 10).
  // Surgical Panel housing: x ±22.5, y ±17.5, z ±3 (assembled).
  //
  // Note: panel is very thin (z extent only ±3) compared to width (x ±22.5)
  // and height (y ±17.5). Conventional isometric angles project the thin
  // panel-edge poorly. We use a "front-3-quarter" view as Isometric
  // (mostly-front camera with slight side+top tilt) — proven framing pattern
  // for slim wall-mounted panels with shallow depth.
  cameraPresets: [
    { name: 'Isometric',        position: [25, 12, 85],     target: [0, 0, 0] },
    { name: 'Tampak Depan',     position: [0, 0, 90],       target: [0, 0, 0] },
    { name: 'Tampak Samping',   position: [90, 0, 0],       target: [0, 0, 0] },
    { name: 'Detail Layar',     position: [-8, 5, 45],      target: [-2.5, -1, 3] },
    { name: 'Detail E-Stop',    position: [38, 22, 50],     target: [18.5, 11, 4] },
    { name: 'Tampak Belakang',  position: [22, 12, -90],    target: [0, 0, -1.5] },
  ],

  assembledCameraStart: [25, 12, 85],
  explodedCameraStart:  [55, 35, 130],
};

export default SURGICAL_CONTROL_PANEL;
