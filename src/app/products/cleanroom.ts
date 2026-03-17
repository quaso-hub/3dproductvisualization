import type { Product } from '../data/products';

const PANEL_CLEANROOM: Product = {
  id: 'cleanroom',
  name: 'Cleanroom',
  fullName: 'Wall Panel Element — Cleanroom Farmasi (GI + Mineral Wool + HPL)',
  description:
    'Panel dinding untuk area produksi farmasi & cleanroom. Face Sheet Baja GI Galvanis, ' +
    'Core Mineral Wool, permukaan HPL ultra-halus anti-bakteri. Mudah dibersihkan, sesuai GMP.',
  category: 'Wall Panel Element',
  badge: 'Cleanroom',
  badgeColor: 'bg-green-100 text-green-700',
  views: ['assembled', 'exploded'],
  layers: [
    { name: 'Face Sheet Baja GI Galvanis (Dalam)',  thickness: 0.5, color: 0xd0e4f0, roughness: 0.15, metalness: 0.9 },
    { name: 'Core Mineral Wool (Non-Combustible)',   thickness: 50,  color: 0xf5cba7, roughness: 0.8,  metalness: 0.0 },
    { name: 'Lapisan HPL Ultra-halus (Anti-bakteri)',thickness: 1,   color: 0xf9f9f7, roughness: 0.05, metalness: 0.0 },
    { name: 'Face Sheet Baja GI Galvanis (Luar)',    thickness: 0.5, color: 0xd0e4f0, roughness: 0.15, metalness: 0.9 },
  ],
  dimensions: { widthMm: 1200, heightMm: 2800, sceneWidth: 120, sceneHeight: 280 },
  specs: [
    { label: 'Dimensi Standar', value: '1200 × 2800 mm' },
    { label: 'Ketebalan Core',  value: '50 / 75 mm' },
    { label: 'Face Sheet',      value: 'Baja GI Galvanis' },
    { label: 'Core Material',   value: 'Mineral Wool (Non-Combustible)' },
    { label: 'Permukaan',       value: 'HPL Ultra-halus Anti-bakteri' },
    { label: 'Sifat',           value: 'Mudah dibersihkan, GMP compliant' },
    { label: 'Klasifikasi',     value: 'ISO 7 / ISO 8 Cleanroom' },
    { label: 'Aplikasi',        value: 'Farmasi, Lab Steril, Food Grade' },
  ],
  cameraPresets: [
    { name: 'Front Isometric', position: [250, 180, 320], target: [0, 0, 0] },
    { name: 'Side Detail',     position: [380, 100, 50],  target: [0, 0, 0] },
    { name: 'Top View',        position: [0, 420, 0],     target: [0, 0, 0] },
    { name: 'Layer Detail',    position: [140, 80, 260],  target: [0, 0, 0] },
    { name: 'Front Elevation', position: [0, 0, 380],     target: [0, 0, 0] },
    { name: 'Side Elevation',  position: [380, 0, 0],     target: [0, 0, 0] },
  ],
  assembledCameraStart: [250, 180, 320],
  explodedCameraStart:  [350, 200, 420],
};

export default PANEL_CLEANROOM;
