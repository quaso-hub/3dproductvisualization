import type { Product } from '../data/products';

const PANEL_SANDWICH_STANDARD: Product = {
  id: 'sandwich-standard',
  name: 'Sandwich Standard',
  fullName: 'Wall Panel Element — Standar (PIR, tanpa Pb)',
  description:
    'Panel dinding sandwich PIR 75mm dengan HRP Anti-bacterial 0.5mm. ' +
    'Face Sheet Baja AZ100 (100gr/m²), anti-korosi, anti-jamur, tahan api. Untuk ruang operasi dan area non-radiasi.',
  category: 'Wall Panel Element',
  badge: 'Standard',
  badgeColor: 'bg-blue-100 text-blue-700',
  views: ['assembled', 'exploded'],
  layers: [
    { name: 'Face Sheet AZ100 (Dalam, 100gr/m²)', thickness: 0.5,  color: 0xc0ced8, roughness: 0.2, metalness: 0.8 },
    { name: 'Core PIR (Polyisocyanurate) Foam',    thickness: 75,   color: 0xe8d845, roughness: 0.7, metalness: 0.0 },
    { name: 'HRP Anti-bacterial Coating 0.5mm',    thickness: 0.05, color: 0xc8aade, roughness: 0.1, metalness: 0.1 },
    { name: 'Face Sheet AZ100 (Luar, 100gr/m²)',   thickness: 0.5,  color: 0xc0ced8, roughness: 0.2, metalness: 0.8 },
  ],
  dimensions: { widthMm: 1200, heightMm: 3000, sceneWidth: 120, sceneHeight: 300 },
  specs: [
    { label: 'Dimensi Standar', value: '1200 × 3000 mm' },
    { label: 'Ketebalan Core',  value: '75 mm (standar MA7) / 50 / 100 mm' },
    { label: 'Face Sheet',      value: 'Baja AZ100 (100gr/m²)' },
    { label: 'Core Material',   value: 'PIR (Polyisocyanurate) Foam' },
    { label: 'Coating',         value: 'HRP Anti-bacterial 0.5 mm' },
    { label: 'Coating Brand',   value: 'Blue Scope' },
    { label: 'Sifat',           value: 'Anti-korosi, anti-jamur, tahan api' },
    { label: 'Standar',         value: 'Permenkes RI' },
    { label: 'Aplikasi',        value: 'Ruang Operasi, Ruang Bersih, Partisi Umum' },
  ],
  cameraPresets: [
    { name: 'Front Isometric', position: [250, 180, 350], target: [0, 0, 0] },
    { name: 'Side Detail',     position: [400, 100, 50],  target: [0, 0, 0] },
    { name: 'Top View',        position: [0, 450, 0],     target: [0, 0, 0] },
    { name: 'Layer Detail',    position: [150, 80, 280],  target: [0, 0, 0] },
    { name: 'Front Elevation', position: [0, 0, 400],     target: [0, 0, 0] },
    { name: 'Side Elevation',  position: [400, 0, 0],     target: [0, 0, 0] },
  ],
  assembledCameraStart: [250, 180, 350],
  explodedCameraStart:  [350, 200, 450],
};

export default PANEL_SANDWICH_STANDARD;
