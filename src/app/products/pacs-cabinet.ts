import type { Product } from '../data/products';

/**
 * PACS Cabinet Stainless Steel SUS-304
 * ========================================================
 * Lemari penyimpanan medis (Medical Storage Cabinet) untuk
 * Operating Room — menyimpan peralatan, dokumen, atau
 * aksesori steril.
 *
 * Dimensi: 1200 × 2000 × 400 mm (W×H×D)
 * Material: SUS 304, pintu kaca clear 2 sisi swing
 * Interior: 3 rak stainless adjustable
 * ========================================================
 */

const PACS_CABINET: Product = {
  id: 'pacs-cabinet',
  name: 'PACS Cabinet',
  fullName: 'PACS Cabinet Stainless Steel SUS-304',
  description:
    'Lemari penyimpanan medis SUS 304 full-height dengan 2 pintu kaca swing, ' +
    '3 rak stainless interior, concealed hinges, dan cam-lock. ' +
    'Untuk penyimpanan peralatan steril di ruang operasi.',
  category: 'Lainnya',
  badge: 'Storage',
  badgeColor: 'bg-indigo-100 text-indigo-700',
  viewerType: 'pacs-cabinet',
  views: ['assembled', 'exploded'],

  layers: [
    { name: 'SUS 304 Outer (Brushed Vertikal)', thickness: 1.5, color: 0xc8d4dc, roughness: 0.22, metalness: 0.95 },
    { name: 'SUS 304 Inner (Semi-polish)',       thickness: 1.5, color: 0xd8e2ea, roughness: 0.12, metalness: 0.96 },
  ],

  dimensions: {
    widthMm:    1200,
    heightMm:   2000,
    depthMm:     400,
    sceneWidth:  120,
    sceneHeight: 200,
    sceneDepth:   40,
  },

  specs: [
    { label: 'Material',          value: 'Stainless Steel SUS 304' },
    { label: 'Dimensi',           value: '1200 × 2000 × 400 mm (W×H×D)' },
    { label: 'Pintu',             value: '2 pintu swing kaca, center-split' },
    { label: 'Panel Kaca',        value: 'Clear Glass ×4 panel (2 per pintu)' },
    { label: 'Handle',            value: 'Bar handle vertikal SUS 304 polished' },
    { label: 'Lock',              value: 'Cam-lock dengan keyhole' },
    { label: 'Engsel',            value: '3× concealed hinge per pintu' },
    { label: 'Rak Interior',      value: '3 tingkat, SUS 304 semi-polish' },
    { label: 'Finishing Luar',    value: 'Brushed arah vertikal' },
    { label: 'Finishing Dalam',   value: 'Semi-polish (lebih terang)' },
    { label: 'Aplikasi',          value: 'Ruang Operasi, Steril Storage' },
  ],

  cameraPresets: [
    { name: 'Isometric',        position: [220, 130, 220],  target: [0, 100, 0] },
    { name: 'Tampak Depan',     position: [0,   100, 300],  target: [0, 100, 0] },
    { name: 'Tampak Samping',   position: [280, 100, 0],    target: [0, 100, 0] },
    { name: 'Detail Handle',    position: [30,  100, 100],  target: [0, 100, 0] },
    { name: 'Tampak Atas',      position: [0,   380, 10],   target: [0, 100, 0] },
    { name: 'Diagonal',         position: [200, 120, 200],  target: [0, 100, 0] },
  ],

  assembledCameraStart: [220, 130, 220],
  explodedCameraStart:  [260, 150, 260],
};

export default PACS_CABINET;
