import type { Product } from '../data/products';

/**
 * Pass Box Stainless Steel SUS-304
 * ========================================================
 * Pass Box untuk transfer material steril antar ruang bersih
 * (cleanroom) dengan sistem interlock dua pintu — salah satu
 * pintu hanya bisa dibuka jika pintu lainnya tertutup.
 *
 * Dimensi keseluruhan unit:
 *   Lebar  : 800 mm (W)
 *   Tinggi : 800 mm (H)
 *   Dalam  : 500 mm (D)
 *
 * Dimensi Interior:
 *   Lebar  : 500 mm
 *   Tinggi : 500 mm
 *   Dalam  : 600 mm (termasuk bukaan pintu depan+belakang)
 *
 * Design: Professional Cleanroom Pass Box
 *   . Dua pintu identik (depan & belakang) dengan interlock PLC
 *   . Kaca jendela Clear Glass 12mm di setiap pintu (~60% area)
 *   . Rubber gasket seal sekeliling frame pintu
 *   . Handle horizontal bar SS 304 + cam-lock latch
 *   . 3 engsel heavy-duty per pintu (sisi kanan)
 *   . Lampu UV di ceiling interior untuk sterilisasi
 *   . Control panel (power switch + LED indicator)
 *
 * Fitur:
 *   . Material: SUS 304 (brushed exterior, mirror interior)
 *   . PLC Interlock System (hanya 1 pintu bisa dibuka)
 *   . Magnetic Interlock + Timer Activation
 *   . Lampu UV sterilisasi di ceiling interior
 *   . Clear Glass 12mm tiap pintu (sudut rounded)
 *   . Rubber gasket seal (medical grade)
 *   . Handle SS 304 horizontal bar + cam-lock
 *   . 3× heavy-duty hinge per pintu
 *   . LED indicator + power switch panel
 * ========================================================
 */

const PASS_BOX: Product = {
  id: 'pass-box',
  name: 'Pass Box SUS 304',
  fullName: 'Pass Box Stainless Steel SUS-304',
  description:
    'Pass Box stainless steel SUS-304 untuk transfer material steril antar ruang bersih. ' +
    'Dilengkapi sistem interlock PLC dua pintu, kaca jendela clear glass 12mm, rubber gasket seal, ' +
    'lampu UV sterilisasi, dan handle cam-lock. Ideal untuk cleanroom, laboratorium, dan farmasi.',
  category: 'Lainnya',
  badge: 'Cleanroom',
  badgeColor: 'bg-teal-100 text-teal-700',
  viewerType: 'pass-box',
  views: ['assembled', 'exploded'],

  /**
   * Layers = cross-section dinding pass box (luar ke dalam).
   */
  layers: [
    { name: 'SUS 304 Outer (Brushed)', thickness: 1.5, color: 0xc8d4dc, roughness: 0.22, metalness: 0.92 },
    { name: 'Insulasi',                thickness: 25,  color: 0xd9c8a0, roughness: 0.90, metalness: 0.0  },
    { name: 'SUS 304 Inner (Mirror)',  thickness: 1.5, color: 0xd8e2ea, roughness: 0.04, metalness: 0.97 },
  ],

  dimensions: {
    widthMm:    800,
    heightMm:   800,
    depthMm:    500,
    sceneWidth:  80,
    sceneHeight: 80,
    sceneDepth:  50,
  },

  specs: [
    { label: 'Material',          value: 'Stainless Steel SUS 304' },
    { label: 'Dimensi Luar',      value: '800 × 800 × 500 mm (W×H×D)' },
    { label: 'Dimensi Dalam',     value: '500 × 500 × 600 mm (W×H×D)' },
    { label: 'Kaca Jendela',      value: 'Clear Glass 12 mm (tiap pintu)' },
    { label: 'Seal',              value: 'Rubber Gasket Sekeliling Frame' },
    { label: 'Interlock',         value: 'PLC + Magnetic Interlock' },
    { label: 'Timer',             value: 'Timer Activation Included' },
    { label: 'Lampu UV',          value: 'UV Lamp di Ceiling Interior' },
    { label: 'Handle',            value: 'SS 304 Horizontal Bar + Cam-Lock' },
    { label: 'Engsel',            value: '3× Heavy-Duty per Pintu' },
    { label: 'Finishing Luar',    value: 'Brushed Stainless' },
    { label: 'Finishing Dalam',   value: 'Mirror Polish' },
    { label: 'Aplikasi',          value: 'Cleanroom, Laboratorium, Farmasi' },
  ],

  cameraPresets: [
    { name: 'Isometric',        position: [160, 70, 180],   target: [0, 40, 0] },
    { name: 'Tampak Depan',     position: [0,   40, 250],   target: [0, 40, 0] },
    { name: 'Tampak Samping',   position: [250, 40, 0],     target: [0, 40, 0] },
    { name: 'Tampak Atas',      position: [0,  250, 0],     target: [0, 40, 0] },
    { name: 'Pintu Terbuka',    position: [180, 80, 200],   target: [0, 40, 0] },
  ],

  assembledCameraStart: [160, 70, 180],
  explodedCameraStart:  [180, 80, 200],
};

export default PASS_BOX;
