import type { Product } from '../data/products';

/**
 * Automatic Single Swing PB / Lead Door
 * ─────────────────────────────────────────────────────────────
 * Pintu swing otomatis berlapis timbal (Pb) untuk ruang X-Ray,
 * CT Scan, MRI, dan radiologi. Konstruksi baja + plywood + Pb.
 *
 * Dimensi bukaan: 1000 × 2200 mm
 * Dimensi daun pintu (door leaf): 900 × 2100 mm
 * Tebal daun pintu: ±45–50 mm
 *
 * Konstruksi cross-section (luar → dalam):
 *   Steel Plate 1.2–1.5mm | Pb Lead Sheet | Plywood 9mm | PIR Insulation | Rangka Hollow Steel | Steel Plate 1.2–1.5mm
 *
 * Mekanisme:
 *   Automatic swing dengan Motise X-Ray Special (Developed by LBA)
 *   Accessories: Onassis, Wilka, Calvis, Griff, Dekson, Kend, dll.
 * ─────────────────────────────────────────────────────────────
 */

const PB_LEAD_DOOR: Product = {
  id: 'pb-lead-door',
  name: 'PB Lead Door',
  fullName: 'Automatic Single Swing PB / Lead Door',
  description:
    'Pintu swing otomatis berlapis timbal (Pb) untuk proteksi radiasi. ' +
    'Konstruksi Steel Plate + Pb Lead + Plywood 9mm + PIR Insulation dengan ' +
    'View Glass Timbal dan Mortise X-Ray Special (Developed by LBA).',
  category: 'Pintu & Partisi',
  badge: 'Radiasi X-Ray',
  badgeColor: 'bg-yellow-100 text-yellow-700',
  viewerType: 'pb-lead-door',
  views: ['assembled', 'exploded'],

  /**
   * Layers = cross-section daun pintu dari luar ke dalam.
   * Digunakan di exploded view untuk visualisasi konstruksi panel.
   * Urutan: material terluar → terdalam
   */
  layers: [
    // Lapisan terluar: steel plate powder coat / SS finish
    { name: 'Steel Plate Luar (1.2–1.5mm)',  thickness: 1.5,  color: 0xc5ced8, roughness: 0.28, metalness: 0.72 },
    // Lapisan pelindung radiasi
    { name: 'Lapis Timbal Pb (Lead Sheet)',    thickness: 3,    color: 0x7a7f85, roughness: 0.45, metalness: 0.65 },
    // Lapisan plywood structural
    { name: 'Plywood 9mm',                    thickness: 9,    color: 0xc4a572, roughness: 0.82, metalness: 0.0  },
    // Insulasi PIR inti
    { name: 'Insulasi PIR',                   thickness: 22,   color: 0xe8d89a, roughness: 0.88, metalness: 0.0  },
    // Rangka hollow steel struktural
    { name: 'Rangka Hollow Steel',            thickness: 4,    color: 0x8a9aa8, roughness: 0.35, metalness: 0.60 },
    // Lapisan terdalam: steel plate
    { name: 'Steel Plate Dalam (1.2–1.5mm)', thickness: 1.5,  color: 0xc5ced8, roughness: 0.28, metalness: 0.72 },
    // Kaca timbal (view glass) — ditampilkan terpisah di exploded
    { name: 'View Glass Timbal (Pb Glass)',   thickness: 5,    color: 0x88c4d8, roughness: 0.05, metalness: 0.0  },
  ],

  dimensions: {
    widthMm:     900,
    heightMm:    2100,
    sceneWidth:   90,   // 1:10 scale
    sceneHeight:  210,
  },

  specs: [
    { label: 'Dimensi Bukaan',      value: '1000 × 2200 mm' },
    { label: 'Daun Pintu',          value: '900 × 2100 mm' },
    { label: 'Tebal Daun Pintu',    value: '±45–50 mm' },
    { label: 'Material Frame',      value: 'Steel Plate 1.5–2 mm / Stainless Steel' },
    { label: 'Material Door Leaf',  value: 'Steel Plate 1.2–1.5 mm / Stainless Steel' },
    { label: 'Insulasi',            value: 'PB Lead (Plywood 9mm + Rangka Hollow) + Insulasi PIR' },
    { label: 'View Glass',          value: 'View Glass Timbal (Pb)' },
    { label: 'Mekanisme',           value: 'Motise X-Ray Special (Developed by LBA)' },
    { label: 'Finishing',           value: 'Powder Coating Color / Stainless Steel' },
    { label: 'Accessories',         value: 'Onassis, Wilka, Calvis, Griff, Dekson, Kend, dll.' },
    { label: 'Aplikasi',            value: 'Ruang X-Ray, CT Scan, MRI, Radiologi, Ruang Operasi' },
  ],

  cameraPresets: [
    { name: 'Isometric',           position: [180, 140, 280],  target: [0, 0, 0]   },
    { name: 'Tampak Depan',        position: [0,   0,   320],  target: [0, 0, 0]   },
    { name: 'Tampak Samping',      position: [300, 30,  0],    target: [0, 30, 0]  },
    { name: 'Detail Atas',         position: [80,  180, 220],  target: [0, 80, 0]  },
    { name: 'Detail Jendela',      position: [60,  80,  200],  target: [0, 80, 0]  },
  ],

  assembledCameraStart: [180, 140, 280],
  explodedCameraStart:  [200, 10, 400],
};

export default PB_LEAD_DOOR;
