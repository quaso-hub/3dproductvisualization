import type { Product } from '../data/products';

const LAF_SYSTEM: Product = {
  id: 'laf-system',
  name: 'LAF System',
  fullName: 'Laminar Air Flow (LAF) Ceiling System',
  description:
    'Sistem LAF ceiling-mounted untuk supply udara steril vertikal (unidirectional downward airflow) ' +
    'di atas meja operasi. HEPA H14 filter 6 modul layout 2×3, perforated face diffuser, ' +
    'menciptakan clean zone ISO Class 5 yang melindungi pasien dari kontaminasi udara.',
  category: 'Lainnya',
  badge: 'HVAC',
  badgeColor: 'bg-sky-100 text-sky-700',
  viewerType: 'laf-system',
  views: ['assembled', 'exploded'],

  layers: [
    { name: 'Face Diffuser (Perforated, Powder Coat White)', thickness: 8,   color: 0xeeeee8, roughness: 0.72, metalness: 0.05 },
    { name: 'HEPA Filter H14 (Deep-Pleat Media)',           thickness: 76,  color: 0xf2ece0, roughness: 0.92, metalness: 0.0  },
    { name: 'Plenum Box (Galv. Steel, Powder Coat White)',   thickness: 280, color: 0xedede8, roughness: 0.75, metalness: 0.05 },
  ],

  dimensions: {
    widthMm:    1200,
    heightMm:   370,
    depthMm:    1800,
    sceneWidth:  120,
    sceneHeight: 37,
    sceneDepth:  180,
  },

  specs: [
    { label: 'Material',          value: 'Galvanised Steel, Powder Coating White' },
    { label: 'Dimensi Unit',      value: '1200 × 1800 mm (W×L)' },
    { label: 'Tinggi Overall',    value: '±370 mm (plenum + HEPA + face)' },
    { label: 'Plenum Box',        value: '1200 × 1800 × 280 mm' },
    { label: 'HEPA Filter',       value: 'H14, 99.99%, 24"×48"×3" (610×1220×76mm) × 6 modul' },
    { label: 'Layout Filter',     value: '2 Kolom × 3 Baris = 6 Modul' },
    { label: 'Face Diffuser',     value: 'Perforated ⌀2.4mm, Staggered 6mm, 13% Open Area' },
    { label: 'Central Opening',   value: '200 × 200 mm (Pendant Arm Pass-Through)' },
    { label: 'Suspension',        value: '4× Threaded Rod M8, Zinc Plated' },
    { label: 'Duct Inlet',        value: '⌀350 mm Collar, Galvanised Steel' },
    { label: 'Klasifikasi',       value: 'ISO Class 5 / Class 100 (Cleanroom)' },
    { label: 'Standar',           value: 'DIN 1946, ISO 14644' },
  ],

  cameraPresets: [
    { name: 'View dari Bawah',   position: [80, -100, 120],  target: [0, 18, 0] },
    { name: 'Isometric',         position: [160, 80, 200],   target: [0, 18, 0] },
    { name: 'Tampak Depan',      position: [0, -30, 250],    target: [0, 18, 0] },
    { name: 'Tampak Samping',    position: [250, -30, 0],    target: [0, 18, 0] },
    { name: 'Tampak Atas',       position: [0, 200, 10],     target: [0, 18, 0] },
    { name: 'Detail Grid',      position: [40, -60, 60],    target: [0, 5, 0] },
    { name: 'Perspektif',        position: [130, 50, 180],   target: [0, 18, 0] },
  ],

  assembledCameraStart: [80, -100, 120],
  explodedCameraStart:  [180, 100, 220],
};

export default LAF_SYSTEM;
