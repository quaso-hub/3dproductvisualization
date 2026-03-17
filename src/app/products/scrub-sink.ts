import type { Product } from '../data/products';

/**
 * Scrub Sink 2 Bay (Wastafel Scrub Stainless Steel 2 Bak)
 * ========================================================
 * Wastafel scrub stainless steel 2 bak untuk area scrub sebelum
 * operasi. Dirancang untuk ruang operasi, IGD, dan cleanroom medis.
 *
 * Dimensi keseluruhan unit:
 *   Lebar  : 1600 mm
 *   Tinggi : 1550 mm (cabinet + countertop + backsplash + mirror + canopy)
 *   Dalam  : 600 mm
 *
 * Design: Professional Hospital Scrub Sink
 *   . Flat horizontal countertop (40mm visual thickness)
 *   . 2 recessed rectangular basins (600×450×220mm each, centered under faucets)
 *   . Rounded inner corners (40-60mm radius) for ergonomic use
 *   . Vertical front cabinet face aligned with doors (no slope)
 *   . Integrated drainage + sensor-operated gooseneck faucets
 *
 * Zona Konstruksi (bottom to top):
 *   Zone 1 (Cabinet Base):  60 mm  - SS 304, 2x foot pedals, 4x adjustable feet
 *   Zone 2 (Countertop):    40 mm  - SS 304 flat + 2x recessed basins (220mm deep)
 *   Zone 3 (Mirror+Top):    750 mm - Backsplash + 2x mirror panels + canopy + LED UV
 *
 * Fitur:
 *   . 2 bak stainless steel 304 recessed (tidak menonjol dari permukaan)
 *   . 2 faucet gooseneck dengan IR sensor (kontrol tanpa sentuhan)
 *   . 2 foot pedals stainless untuk aktivasi hands-free
 *   . Backsplash integral 10 mm SS 304
 *   . Mirror panel 2x dengan frame stainless + canopy ledge
 *   . LED UV strip di canopy untuk sterilisasi
 *   . Drainase 50 mm tiap basin
 *   . Kaki adjustable 4 titik
 * ========================================================
 */

const SCRUB_SINK_2BAY: Product = {
  id: 'scrub-sink-2bay',
  name: 'Scrub Sink 2 Bay',
  fullName: 'Wastafel Scrub Stainless Steel 2 Bay',
  description:
    'Wastafel scrub stainless steel professional 2 bak dengan flat countertop dan recessed basins. ' +
    'Kontruksi SS 304, backsplash integral, gooseneck faucet sensor (IR), mirror dengan LED UV canopy, ' +
    'dan foot pedals hands-free. Ideal untuk ruang operasi, IGD, dan cleanroom medis high-standard.',
  category: 'Lainnya',
  badge: 'Surgical Grade',
  badgeColor: 'bg-cyan-100 text-cyan-700',
  viewerType: 'scrub-sink',
  views: ['assembled', 'exploded'],

  /**
   * Layers = cross-section dinding basin dari luar ke dalam.
   * Dipakai di exploded view untuk menampilkan konstruksi dinding.
   */
  layers: [
    { name: 'SS 304 Face (Luar)',        thickness: 1.2,  color: 0xc8d4dc, roughness: 0.12, metalness: 0.88 },
    { name: 'Mineral Insulation',         thickness: 30,   color: 0xd9c8a0, roughness: 0.90, metalness: 0.0  },
    { name: 'SS 304 Inner (Dalam)',       thickness: 1.2,  color: 0xc8d4dc, roughness: 0.12, metalness: 0.88 },
  ],

  dimensions: {
    widthMm:    1600,
    heightMm:   1550,
    depthMm:    600,
    sceneWidth:  160,  // 1:10 scale
    sceneHeight: 155,
    sceneDepth:   60,
  },

  specs: [
    { label: 'Material',          value: 'Stainless Steel 304' },
    { label: 'Finishing',         value: 'Mirror Polish / Hairline' },
    { label: 'Dimensi Unit',      value: '1600 × 1550 × 600 mm (W×H×D)' },
    { label: 'Jumlah Bak',        value: '2 (Side by Side, Recessed)' },
    { label: 'Dimensi Bak',       value: '600 × 450 × 220 mm (tiap bak)' },
    { label: 'Countertop',        value: 'Flat, 40mm visual thickness' },
    { label: 'Drainase',          value: '50 mm (tiap bak center)' },
    { label: 'Backsplash',        value: '10 mm integral SS 304' },
    { label: 'Faucet',            value: '2x Gooseneck + IR Sensor (hands-free)' },
    { label: 'Foot Pedal',        value: '2x stainless oval (emergency activation)' },
    { label: 'Kaki',              value: '4 pc., adjustable height' },
    { label: 'Mirror Panel',      value: '2x dengan frame SS + LED UV canopy' },
    { label: 'Kapasitas Bak',     value: '~55 L total' },
    { label: 'Beban Maks',        value: '200 kg' },
    { label: 'Aplikasi',          value: 'Ruang Operasi, IGD, Cleanroom Medis' },
  ],

  cameraPresets: [
    { name: 'Isometric',        position: [320, 140, 380],  target: [0, 80, 0]  },
    { name: 'Tampak Depan',     position: [0,   120, 500],  target: [0, 80, 0]  },
    { name: 'Tampak Samping',   position: [500, 120, 0],    target: [0, 80, 0]  },
    { name: 'Tampak Atas',      position: [0,   550, 0],    target: [0, 80, 0]  },
    { name: 'Exploded View',    position: [400, 230, 550],  target: [0, 165, 0] },
  ],

  assembledCameraStart: [320, 140, 380],
  explodedCameraStart:  [400, 230, 550],
};

export default SCRUB_SINK_2BAY;
