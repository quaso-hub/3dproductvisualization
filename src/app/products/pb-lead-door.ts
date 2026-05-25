import type { Product } from '../data/products';

/**
 * Automatic Single Swing PB / Lead Door — V2 (ELFATECH Revised)
 * ─────────────────────────────────────────────────────────────
 * Pintu swing otomatis berlapis timbal (Pb) untuk ruang X-Ray,
 * CT Scan, MRI, dan radiologi. Konstruksi baja + plywood + Pb.
 *
 * V2 Changes:
 *   - Dimensi: 1000 × 2200 mm (was 900 × 2100 mm)
 *   - Door closer: Regular Arm 2-piece (was rail+slide block)
 *   - Handle: horizontal bar pull (was lever)
 *   - Hinges: LEFT side butt hinges (was RIGHT)
 *   - Window: 200×300mm rounded corners (was 150×400mm)
 *   - Kickplate: 260mm tall (was 180mm)
 *   - Door bottom seal: aluminum + rubber (new)
 *   - Perimeter seals: P-profile (improved)
 *
 * Konstruksi cross-section (luar → dalam):
 *   Steel 1.2mm | Pb Lead 2mm | Plywood 9mm | PIR 30mm | Hollow Steel | Steel 1.2mm
 * ─────────────────────────────────────────────────────────────
 */

const PB_LEAD_DOOR: Product = {
  id: 'pb-lead-door',
  name: 'PB Lead Door',
  fullName: 'Automatic Single Swing PB / Lead Door',
  description:
    'Pintu swing otomatis berlapis timbal (Pb) untuk proteksi radiasi. ' +
    'Konstruksi Steel Plate + Pb Lead + Plywood 9mm + PIR Insulation. ' +
    'Door closer regular arm 2-piece, bar handle SS, 3× butt hinges, ' +
    'View Glass Timbal dan Mortise X-Ray Special (LBA).',
  category: 'Pintu & Partisi',
  badge: 'Radiasi X-Ray',
  badgeColor: 'bg-yellow-100 text-yellow-700',
  viewerType: 'pb-lead-door',
  views: ['assembled', 'exploded'],

  layers: [
    { name: 'Steel Plate Luar (1.2 mm)',   thickness: 1.5,  color: 0xc5ced8, roughness: 0.28, metalness: 0.72 },
    { name: 'Lapis Timbal Pb (Lead Sheet)', thickness: 3,    color: 0x7a7f85, roughness: 0.45, metalness: 0.65 },
    { name: 'Plywood 9 mm',                thickness: 9,    color: 0xc4a572, roughness: 0.82, metalness: 0.0  },
    { name: 'Insulasi PIR',                thickness: 22,   color: 0xe8d89a, roughness: 0.88, metalness: 0.0  },
    { name: 'Rangka Hollow Steel',          thickness: 4,    color: 0x8a9aa8, roughness: 0.35, metalness: 0.60 },
    { name: 'Steel Plate Dalam (1.2 mm)',   thickness: 1.5,  color: 0xc5ced8, roughness: 0.28, metalness: 0.72 },
    { name: 'View Glass Timbal (Pb Glass)', thickness: 5,    color: 0x88c4d8, roughness: 0.05, metalness: 0.0  },
  ],

  dimensions: {
    widthMm:     1000,
    heightMm:    2200,
    sceneWidth:   100,
    sceneHeight:  220,
  },

  specs: [
    { label: 'Dimensi Bukaan',      value: '1080 × 2300 mm (termasuk frame)' },
    { label: 'Daun Pintu',          value: '1000 × 2200 mm' },
    { label: 'Tebal Daun Pintu',    value: '±47 mm' },
    { label: 'Material Frame',      value: 'Steel Plate 1.5–2 mm, Powder Coat' },
    { label: 'Material Door Leaf',  value: 'Steel Plate 1.2–1.5 mm, Powder Coat' },
    { label: 'Insulasi',            value: 'PB Lead 2 mm + Plywood 9 mm + PIR' },
  { label: 'Lead Equivalent',     value: '2 mmPb shielding layer' },
  { label: 'Continuity Notes',    value: 'Lead lining carried to edge / jamb treatment' },
    { label: 'View Glass',          value: 'View Glass Timbal (Pb) 200×300 mm' },
    { label: 'Door Closer',         value: 'Regular Arm 2-piece Hydraulic' },
    { label: 'Mortise',             value: 'X-Ray Special (Developed by LBA)' },
    { label: 'Handle',              value: 'Bar Pull Handle SS ⌀22×500 mm' },
    { label: 'Engsel',              value: '3× Heavy Duty Butt Hinge' },
    { label: 'Kickplate',           value: 'SS 304 Brushed, 260 mm' },
    { label: 'Seals',               value: 'EPDM P-profile + Bottom Drop Seal' },
    { label: 'Finishing',           value: 'Powder Coating RAL 7035 / Stainless' },
    { label: 'Accessories',         value: 'Onassis, Wilka, Calvis, Griff, Dekson' },
    { label: 'Aplikasi',            value: 'Ruang X-Ray, CT Scan, MRI, Radiologi' },
  ],

  cameraPresets: [
    { name: 'Isometric',           position: [320, 200, 420],  target: [0, 0, 0]   },
    { name: 'Tampak Depan',        position: [0,   0,   500],  target: [0, 0, 0]   },
    { name: 'Tampak Samping',      position: [500, 30,  0],    target: [0, 30, 0]  },
    { name: 'Detail Atas',         position: [120, 280, 320],  target: [0, 90, 0]  },
    { name: 'Detail Closer',       position: [80,  240, 280],  target: [-20, 110, 8] },
    { name: 'Detail Jendela',      position: [80,  100, 280],  target: [0, 80, 0]  },
    { name: 'Detail Lead Edge',    position: [180, 160, 240],  target: [0, 90, 0]  },
  ],

  assembledCameraStart: [320, 200, 420],
  explodedCameraStart:  [400, 100, 600],
};

export default PB_LEAD_DOOR;
