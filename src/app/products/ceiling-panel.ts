import type { Product } from '../data/products';

const CEILING_PANEL: Product = {
  id: 'ceiling-panel',
  name: 'Ceiling Panel System',
  fullName: 'Ceiling Panel System — PIR Sandwich + LED Grid + LAF Integrated',
  description:
    'Sistem plafon modular untuk Operating Room — panel PIR sandwich 75mm dengan HRP Antibacterial 0.5mm, ' +
    'frame aluminium extruded dengan LED terintegrasi 6000K, 1 panel LAF diffuser perforated + HEPA H14, ' +
    'pendant column SUS 304, dan suspension rod. Modul 2×2 grid (2400×2400mm).',
  category: 'Plafon',
  badge: 'Modular OR',
  badgeColor: 'bg-purple-100 text-purple-700',
  viewerType: 'ceiling-panel',
  views: ['assembled', 'exploded'],

  layers: [
    { name: 'Panel PIR Sandwich HRP 0.5mm (Medical White)', thickness: 75,  color: 0xf5f5f3, roughness: 0.72, metalness: 0.0  },
    { name: 'Frame Aluminium Powder Coat (+ LED Channel)',   thickness: 120, color: 0xf2f2f0, roughness: 0.65, metalness: 0.05 },
    { name: 'HEPA H14 Filter (LAF Panel Area)',              thickness: 76,  color: 0xf2ece0, roughness: 0.92, metalness: 0.0  },
  ],

  dimensions: {
    widthMm:    2400,
    heightMm:   200,
    depthMm:    2400,
    sceneWidth:  240,
    sceneHeight: 20,
    sceneDepth:  240,
  },

  specs: [
    { label: 'Module Size',       value: '2400 × 2400 mm (2×2 Grid)' },
    { label: 'Panel Size',        value: '1200 × 1200 mm per panel' },
    { label: 'Panel Thickness',   value: '75 mm PIR Core + HRP 0.5mm' },
    { label: 'Surface',           value: 'HRP Antibacterial 0.5mm (Medical White)' },
    { label: 'Face Sheet',        value: 'Baja AZ100 (100gr/m²)' },
    { label: 'Coating Brand',     value: 'Blue Scope' },
    { label: 'Frame Profile',     value: 'Aluminium Extruded, 80×120mm' },
    { label: 'LED',               value: '6000K Cool White, Integrated, IP67' },
    { label: 'LAF Panel',         value: 'Perforated ⌀2.4mm, 13% Open Area' },
    { label: 'HEPA Filter',       value: 'H14, 99.99% @0.3μm, 610×610×76mm' },
    { label: 'Pendant Support',   value: 'SUS 304 Column ⌀100mm, Plate ⌀200mm' },
    { label: 'Suspension',        value: '4× Threaded Rod M10, Zinc Plated' },
    { label: 'Standar',           value: 'Permenkes RI, sesuai standar OK' },
  ],

  cameraPresets: [
    { name: 'View dari Bawah',  position: [150, -120, 180], target: [0, 6, 0] },
    { name: 'Isometric',        position: [200, 120, 250],  target: [0, 6, 0] },
    { name: 'Tampak Depan',     position: [0, -40, 300],    target: [0, 6, 0] },
    { name: 'Tampak Samping',   position: [300, -40, 0],    target: [0, 6, 0] },
    { name: 'Tampak Atas',      position: [0, 250, 10],     target: [0, 6, 0] },
    { name: 'Detail LED Grid',  position: [60, -80, 80],    target: [0, 2, 0] },
    { name: 'Perspektif',       position: [180, 80, 220],   target: [0, 6, 0] },
  ],

  assembledCameraStart: [150, -120, 180],
  explodedCameraStart:  [220, 150, 280],
};

export default CEILING_PANEL;
