import type { Product } from '../data/products';

const HVAC_SYSTEM: Product = {
  id: 'hvac-system',
  name: 'HVAC System',
  fullName: 'HVAC System — Operating Theatre (AHU + Ducting + LAF + Control)',
  description:
    'Sistem HVAC terintegrasi untuk ruang operasi (MOT). Terdiri dari 7 komponen: ' +
    'AHU Double Skin 3000 cfm, Outdoor Unit DAIKIN 12 HP, PIU Ducting 20mm insulation, ' +
    'LAF Ceiling HEPA H14, Control Panel PLC+HMI, Refrigerant Piping R410A, dan Return Air Grille. ' +
    'Memenuhi standar DIN 1946, ISO 14644, dan Permenkes RI.',
  category: 'Lainnya',
  badge: 'Integrated System',
  badgeColor: 'bg-emerald-100 text-emerald-700',
  viewerType: 'hvac-system',
  views: ['assembled'],

  layers: [
    { name: 'AHU Body (Aluminium Alloy 25mm)',       thickness: 25,  color: 0xb8c0cc, roughness: 0.55, metalness: 0.20 },
    { name: 'Ducting PIU (Polyurethane 20mm)',        thickness: 20,  color: 0xced4da, roughness: 0.65, metalness: 0.10 },
    { name: 'LAF Frame (Galv. Steel, Powder Coat)',   thickness: 8,   color: 0xd0dce6, roughness: 0.22, metalness: 0.92 },
    { name: 'HEPA H14 Filter Media',                  thickness: 76,  color: 0xf2ece0, roughness: 0.92, metalness: 0.0  },
    { name: 'Pipa Refrigerant Copper ASTM B280',     thickness: 25,  color: 0xb87333, roughness: 0.30, metalness: 0.85 },
    { name: 'Isolasi Harmaflek (Black Foam)',         thickness: 15,  color: 0x2d3436, roughness: 0.90, metalness: 0.0  },
    { name: 'Panel Box (Powder Coat RAL 7035)',       thickness: 2,   color: 0x78909c, roughness: 0.50, metalness: 0.25 },
  ],

  dimensions: {
    widthMm:    6000,
    heightMm:   3500,
    depthMm:    6000,
    sceneWidth:  120,
    sceneHeight: 70,
    sceneDepth:  120,
  },

  specs: [
    { label: 'Sistem',              value: 'HVAC Operating Theatre (MOT) — Terintegrasi' },
    { label: 'AHU Size',            value: '1200 × 3000 × 930 mm, Double Skin 25mm' },
    { label: 'Booster Fan',         value: '±3000 cfm, Tekanan 1000 Pa' },
    { label: 'Heater',              value: '4500W (750W×6), Tube & Fin SS304' },
    { label: 'Pre-Filter',          value: 'G4 Washable, 30-65%, 24"×24"×2"' },
    { label: 'Medium Filter',       value: 'F8/F9, 90-95%, 24"×24"×12"' },
    { label: 'Evaporator Coil',     value: '10 HP, 100.000 BTU/h, 3000 cfm, R410' },
    { label: 'Outdoor Unit',        value: 'DAIKIN 12 HP, 120.000 BTU/h' },
    { label: 'Ducting',             value: 'PIU TDI 20mm, ±100 m², Galv. Grill + Volume Damper' },
    { label: 'LAF',                 value: 'HEPA H14, 99.99%, 24"×48"×3"' },
    { label: 'Control Panel',       value: '900×600×250mm, PLC + HMI 7" + MCB + RST' },
    { label: 'Pipa Refrigerant',    value: 'ASTM B280, Isolasi Harmaflek, Drain' },
    { label: 'Return Air Grille',   value: '600×400mm, Galvanis, Powder Coat White' },
    { label: 'Standar',             value: 'DIN 1946, ISO 14644, Permenkes RI' },
  ],

  cameraPresets: [
    { name: 'Isometric',         position: [12, 10, 12],   target: [3, 2.5, 0] },
    { name: 'Tampak Depan',      position: [3, 2.5, 16],   target: [3, 2.5, 0] },
    { name: 'Tampak Samping',    position: [16, 3, 0],     target: [3, 2.5, 0] },
    { name: 'Tampak Atas',       position: [3, 20, 0.1],   target: [3, 0, 0] },
    { name: 'Detail Rooftop',    position: [8, 8, 6],      target: [4, 5.2, 0] },
    { name: 'Interior OR',       position: [3, 1.5, 5],    target: [3, 1.5, 0] },
    { name: 'AHU Cutaway',       position: [10, 1.5, 3],   target: [7.5, 0.6, 0] },
    { name: 'Perspektif',        position: [10, 8, 14],    target: [3, 2.5, 0] },
  ],

  assembledCameraStart: [12, 10, 12],
  explodedCameraStart:  [14, 14, 14],
  // V3: room 6×6×3m, AHU at X=7.5 (mechanical room X=6→9), outdoor unit at (4,5.2,4)
};

export default HVAC_SYSTEM;
