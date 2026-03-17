import type { Product } from '../data/products';

const RETURN_AIR_GRILLE: Product = {
  id: 'return-air-grille',
  name: 'Return Air Grille',
  fullName: 'Wall Corner Return Air Grille SUS-304',
  description:
    'Return air grille stainless steel SUS-304 untuk sudut dinding ruang operasi. ' +
    'Dimensi 600×400 mm landscape, dipasang ±15 cm dari lantai. ' +
    'Panel face perforated dengan filter G4 pre-filter washable.',
  category: 'Lainnya',
  badge: 'HVAC',
  badgeColor: 'bg-sky-100 text-sky-700',
  viewerType: 'return-air-grille',
  views: ['assembled', 'exploded'],

  layers: [
    { name: 'Face Panel SUS 304 (Perforated)', thickness: 1.5, color: 0xd0dce6, roughness: 0.10, metalness: 0.95 },
    { name: 'Filter G4 Pre-Filter',            thickness: 20,  color: 0xf5e6c8, roughness: 0.95, metalness: 0.0  },
    { name: 'Frame Housing SUS 304 (Brushed)',  thickness: 80,  color: 0xc8d4dc, roughness: 0.22, metalness: 0.92 },
  ],

  dimensions: {
    widthMm:    600,
    heightMm:   400,
    depthMm:    100,
    sceneWidth:  60,
    sceneHeight: 40,
    sceneDepth:  10,
  },

  specs: [
    { label: 'Material',          value: 'Stainless Steel SUS 304' },
    { label: 'Dimensi Luar',      value: '600 × 400 mm (W×H, Landscape)' },
    { label: 'Kedalaman Frame',   value: '100 mm (masuk ke dinding)' },
    { label: 'Face Panel',        value: 'Perforated ⌀3 mm, pitch 5 mm, SUS 304 Polished' },
    { label: 'Bukaan Face',       value: '560 × 360 mm (frame border 20 mm per sisi)' },
    { label: 'Filter',            value: 'G4 Pre-Filter Washable, 540 × 340 × 20 mm' },
    { label: 'Mounting Flange',   value: '15 mm overhang pada permukaan dinding' },
    { label: 'Posisi Pemasangan', value: 'Sudut ruang OR, ±15 cm dari lantai' },
    { label: 'Fungsi',            value: 'Return air module ke sistem HVAC' },
    { label: 'Finishing',         value: 'Brushed (frame), Polished (face panel)' },
  ],

  cameraPresets: [
    { name: 'Isometric',        position: [80, 30, 100],  target: [0, 20, 0] },
    { name: 'Tampak Depan',     position: [0, 20, 120],   target: [0, 20, 0] },
    { name: 'Tampak Samping',   position: [120, 20, 0],   target: [0, 20, 0] },
    { name: 'Detail Perforasi', position: [15, 25, 50],   target: [0, 20, 0] },
    { name: 'Tampak Atas',      position: [0, 120, 10],   target: [0, 20, 0] },
    { name: 'Perspektif',       position: [90, 40, 90],   target: [0, 20, 0] },
  ],

  assembledCameraStart: [80, 30, 100],
  explodedCameraStart:  [100, 40, 120],
};

export default RETURN_AIR_GRILLE;
