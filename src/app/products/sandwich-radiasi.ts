import type { Product } from '../data/products';

const PANEL_SANDWICH_RADIASI: Product = {
  id: 'sandwich-radiasi',
  name: 'Sandwich + Radiasi',
  fullName: 'Panel Dinding Sandwich - Proteksi Radiasi',
  description:
    'Panel 5 lapisan dengan timbal 2mm untuk proteksi radiasi. Cocok untuk ruang radiologi, CT scan, MRI.',
  category: 'Panel Dinding',
  badge: 'Proteksi Radiasi',
  badgeColor: 'bg-yellow-100 text-yellow-700',
  views: ['assembled', 'exploded'],
  layers: [
    { name: 'Baja AZ100 (Dalam)',  thickness: 0.5,  color: 0xc0ced8, roughness: 0.2, metalness: 0.8 },
    { name: 'Core PIR Foam',       thickness: 75,   color: 0xe8d845, roughness: 0.7, metalness: 0.0 },
    { name: 'Timbal 2mm',          thickness: 2,    color: 0x6e8898, roughness: 0.3, metalness: 0.7 },
    { name: 'Coating HRP',         thickness: 0.05, color: 0xc8aade, roughness: 0.1, metalness: 0.1 },
    { name: 'Baja AZ100 (Luar)',   thickness: 0.5,  color: 0xc0ced8, roughness: 0.2, metalness: 0.8 },
  ],
  dimensions: { widthMm: 1200, heightMm: 3000, sceneWidth: 120, sceneHeight: 300 },
  specs: [
    { label: 'Dimensi Standar',  value: '1200 × 3000 mm' },
    { label: 'Ketebalan Core',   value: '50 / 75 / 100 mm' },
    { label: 'Face Sheet',       value: 'Baja AZ100' },
    { label: 'Core Material',    value: 'PIR Foam' },
    { label: 'Proteksi Radiasi', value: 'Timbal 2 mm' },
    { label: 'Coating',          value: 'HRP Anti-bacterial' },
    { label: 'Sertifikasi',      value: 'Permenkes RI' },
    { label: 'Aplikasi',         value: 'Radiologi, CT Scan, MRI' },
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

export default PANEL_SANDWICH_RADIASI;
