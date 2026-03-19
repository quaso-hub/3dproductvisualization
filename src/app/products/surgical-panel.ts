import type { Product } from '../data/products';

const SURGICAL_PANEL: Product = {
  id: 'surgical-panel',
  name: 'Surgical Control Panel',
  fullName: 'Surgical Control Panel Room Touchscreen — Modbus TCP/IP',
  description:
    'Panel kontrol terpusat touchscreen 15.6" untuk ruang operasi. ' +
    'Monitoring temperatur, kelembaban, tekanan ruang, gas medis, ' +
    'pencahayaan, dan alarm — flush-mount di dinding panel OR.',
  category: 'Lainnya',
  badge: 'Smart System',
  badgeColor: 'bg-indigo-100 text-indigo-700',
  viewerType: 'surgical-panel',
  views: ['assembled', 'exploded'],

  layers: [
    { name: 'Housing SUS 304 Brushed',          thickness: 85,  color: 0xd0dde6, roughness: 0.20, metalness: 0.94 },
    { name: 'LCD Touchscreen 15.6" Full HD',     thickness: 3,   color: 0x0a0e1a, roughness: 0.02, metalness: 0.0  },
    { name: 'Tempered Glass Cover (IP65)',        thickness: 3,   color: 0x9ed4e8, roughness: 0.02, metalness: 0.0  },
  ],

  dimensions: {
    widthMm:     450,
    heightMm:    310,
    depthMm:     85,
    sceneWidth:   45,
    sceneHeight:  31,
    sceneDepth:    8.5,
  },

  specs: [
    { label: 'Housing',         value: 'Stainless Steel SUS 304 Brushed' },
    { label: 'Dimensi',         value: '450 × 310 × 85 mm (W×H×D)' },
    { label: 'Layar',           value: '15.6" Full HD Touchscreen (1920×1080)' },
    { label: 'Sistem Operasi',  value: 'System Windows Smart Control Panel' },
    { label: 'Protokol',        value: 'Modbus TCP/IP' },
    { label: 'Proteksi',        value: 'IP65 Front Face' },
    { label: 'Monitoring',      value: 'Temperatur, Kelembaban, Tekanan, Gas Medis' },
    { label: 'Gas Medis',       value: 'O₂, N₂O, Air, Vacuum — dengan alarm' },
    { label: 'Timer',           value: 'Countdown + Elapsed Time (Surgery Timer)' },
    { label: 'Kontrol',         value: 'Lampu OR (L1/L2), System ON/OFF' },
    { label: 'Pemasangan',      value: 'Flush-Mount di Dinding Panel OR' },
    { label: 'Power',           value: '220V 50Hz' },
    { label: 'Standar',         value: 'Permenkes RI, Standar Ruang Operasi' },
  ],

  cameraPresets: [
    { name: 'View Utama',       position: [40, 20, 50],   target: [0, 15.5, 0] },
    { name: 'Tampak Depan',     position: [0, 15.5, 60],  target: [0, 15.5, 0] },
    { name: 'Tampak Samping',   position: [60, 15.5, 0],  target: [0, 15.5, 0] },
    { name: 'Detail Layar',     position: [10, 18, 35],   target: [0, 15.5, 2] },
    { name: 'Tampak Atas',      position: [0, 70, 10],    target: [0, 15.5, 0] },
    { name: 'Perspektif',       position: [50, 25, 55],   target: [0, 15.5, 0] },
  ],

  assembledCameraStart: [40, 20, 50],
  explodedCameraStart:  [60, 30, 80],
};

export default SURGICAL_PANEL;
