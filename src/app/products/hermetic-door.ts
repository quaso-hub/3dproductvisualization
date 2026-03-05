import type { Product } from '../data/products';

/**
 * Hermetic Auto Sliding Door
 * ─────────────────────────────────────────────────────────────
 * Pintu geser otomatis hermetic dengan proteksi radiasi.
 * Konstruksi stainless steel dengan lapisan timbal (Pb) 2mm
 * dan kaca timbal (Lead Glass) 5mm untuk ruang radiologi/operasi.
 *
 * Dimensi:
 *   • Lebar  : 1600 mm
 *   • Tinggi : 2100 mm
 *   • Kaca   : 300 × 400 mm (Lead Glass Pb 5mm)
 *
 * Konstruksi pintu (cross-section):
 *   SS Face 0.8mm | PIR 45mm | Pb 2mm | PIR 45mm | SS Face 0.8mm
 *   Total tebal panel: ~93.6 mm
 *
 * Mekanisme:
 *   Motor listrik + Battery backup
 *   Sensor in/out, foot switch, auto-reversal, safety lights
 * ─────────────────────────────────────────────────────────────
 */

const HERMETIC_DOOR: Product = {
  id: 'hermetic-door',
  name: 'Hermetic Door',
  fullName: 'Hermetic Auto Sliding Door',
  description:
    'Pintu geser otomatis hermetic dengan proteksi radiasi Pb 2mm dan Lead Glass 5mm. ' +
    'Konstruksi stainless steel, motor listrik dengan battery backup, sensor in/out, ' +
    'dan sistem keamanan auto-reversal untuk ruang operasi dan radiologi.',
  category: 'Pintu & Partisi',
  badge: 'Radiasi Shield',
  badgeColor: 'bg-yellow-100 text-yellow-700',
  viewerType: 'hermetic-door',
  views: ['assembled', 'exploded'],

  /**
   * Layers = cross-section pintu dari luar ke dalam.
   * Digunakan di exploded view untuk menampilkan konstruksi panel.
   */
  layers: [
    { name: 'Stainless Steel Face (Luar)', thickness: 0.8, color: 0xc8d4dc, roughness: 0.15, metalness: 0.85 },
    { name: 'PIR Foam Core',               thickness: 45,  color: 0xe8c870, roughness: 0.88, metalness: 0.0  },
    { name: 'Timbal (Pb) 2mm',             thickness: 2,   color: 0x8a9198, roughness: 0.40, metalness: 0.70 },
    { name: 'PIR Foam Core',               thickness: 45,  color: 0xe8c870, roughness: 0.88, metalness: 0.0  },
    { name: 'Stainless Steel Face (Dalam)', thickness: 0.8, color: 0xc8d4dc, roughness: 0.15, metalness: 0.85 },
    { name: 'Kaca Pb (Lead Glass 5mm)',    thickness: 5,   color: 0x88c4d8, roughness: 0.05, metalness: 0.0  },
  ],

  dimensions: {
    widthMm:    1600,
    heightMm:   2100,
    sceneWidth:  160,  // 1:10 scale
    sceneHeight: 210,
  },

  specs: [
    { label: 'Material',          value: 'Stainless Steel' },
    { label: 'Dimensi Pintu',     value: '1600 × 2100 mm' },
    { label: 'Kaca',              value: '5 mm (Lead Glass Pb)' },
    { label: 'Proteksi Radiasi',  value: 'Lapis Pb 2mm + Glass Pb' },
    { label: 'Motor',             value: 'Electric Motor + Battery Backup' },
    { label: 'Sensor',            value: 'In/Out Operating Room' },
    { label: 'Kecepatan',         value: '0,7 m/s (1 daun) / 1,4 m/s (2 daun)' },
    { label: 'Tegangan',          value: '220 VAC, 50/60 Hz' },
    { label: 'Power Auto Volt',   value: '85–264 VAC' },
    { label: 'Saklar Kaki',       value: 'Foot Switch (Labor Assistant)' },
    { label: 'Keamanan',          value: 'Auto-reversal + Safety Lights' },
    { label: 'Aplikasi',          value: 'Ruang Operasi, ICU, Radiologi' },
  ],

  cameraPresets: [
    { name: 'Isometric',        position: [220, 160, 280],  target: [0, 100, 0]  },
    { name: 'Tampak Depan',     position: [0,   105, 350],  target: [0, 105, 0]  },
    { name: 'Tampak Samping',   position: [350, 105, 0],    target: [0, 105, 0]  },
    { name: 'Detail Atas',      position: [80,  280, 200],  target: [0, 210, 0]  },
    { name: 'Detail Jendela',   position: [80,  168, 200],  target: [0, 168, 0]  },
    { name: 'Tampak Atas',      position: [0,   450, 0],    target: [0, 105, 0]  },
  ],

  assembledCameraStart: [220, 160, 280],
  explodedCameraStart:  [220, 105, 420],
};

export default HERMETIC_DOOR;
