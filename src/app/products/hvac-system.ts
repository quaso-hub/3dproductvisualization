import type { Product, HVACComponent, HVACMode } from '../data/products';

// ============================================================
// LEGACY HVAC MODE METADATA
//
// Catatan penting:
// Viewer aktif `HvacSystemBIM3D.tsx` sekarang memakai arsitektur `hvac-bim-v2/*`
// dengan mode runtime:
//   full, supply, return, refrigerant, plan, exploded
// plus scenario states:
//   normal, surgery-peak, purge, setback, fault
//
// Metadata di bawah dipertahankan hanya sebagai compatibility data untuk
// overlay/eksperimen lama yang masih membaca `product.hvacModes`.
// ============================================================

const HVAC_MODES: HVACMode[] = [
  {
    key: 'full-system',
    label: 'Full System',
    icon: '🏥',
    description: 'Tampilan lengkap semua sistem terintegrasi',
    highlightColor: 0x4fc3f7,
  },
  {
    key: 'supply-air',
    label: 'Supply Air',
    icon: '🔵',
    description: 'Jalur udara bersih dari AHU → LAF → OR Room',
    highlightColor: 0x00bcd4,
  },
  {
    key: 'return-air',
    label: 'Return Air',
    icon: '🔴',
    description: 'Jalur udara balik dari low-wall grilles → AHU',
    highlightColor: 0xef9a9a,
  },
  {
    key: 'refrigerant',
    label: 'Refrigerant',
    icon: '🟡',
    description: 'Sirkuit refrigeran CDU ↔ AHU Cooling Coil',
    highlightColor: 0xffb74d,
  },
  {
    key: 'floor-plan',
    label: 'Floor Plan',
    icon: '📐',
    description: 'Denah 2D dari atas (top-down BIM view)',
    highlightColor: 0xb0bec5,
  },
  {
    key: 'exploded',
    label: 'Exploded',
    icon: '💥',
    description: 'Semua layer dipisah vertikal untuk melihat detail',
    highlightColor: 0xa5d6a7,
  },
];

// ============================================================
// HVAC COMPONENTS — Posisi dalam ruang (koordinat meter)
//
// Layout ruang:
//   OR Room: 6m × 6m × 3m, center (0, 0, 0)
//   Mechanical room: x = 7m → 10m, z = -3m → 3m
//   Rooftop: y = 3m → 6m
//   Interstitial ceiling space: y = 3m → 3.5m
// ============================================================

const HVAC_COMPONENTS: HVACComponent[] = [
  // ── 1. BUILDING SHELL ──────────────────────────────────────
  {
    id: 'building-or-room',
    type: 'building-shell',
    label: 'OR Room',
    procedural: true,
    position: { x: 0, y: 1.5, z: 0 },
    dimensions: { w: 6, h: 3, d: 6 },
    color: 0xe0e8f0,
    visibleInModes: ['full-system', 'supply-air', 'return-air', 'refrigerant', 'exploded'],
    opacityInModes: {
      'full-system': 0.12,
      'supply-air': 0.06,
      'return-air': 0.06,
      'refrigerant': 0.06,
      'exploded': 0.05,
    },
    specs: {
      'Ukuran': '6m × 6m × 3m',
      'Standar': 'ASHRAE 170:2021',
      'Tekanan': '+8 Pa (positif)',
    },
  },
  {
    id: 'building-mechanical-room',
    type: 'building-shell',
    label: 'Mechanical Room',
    procedural: true,
    position: { x: 8.5, y: 1.5, z: 0 },
    dimensions: { w: 3, h: 3, d: 6 },
    color: 0xd0d8e0,
    visibleInModes: ['full-system', 'supply-air', 'return-air', 'refrigerant'],
    opacityInModes: { 'full-system': 0.08, 'supply-air': 0.06, 'return-air': 0.06, 'refrigerant': 0.08 },
    specs: { 'Fungsi': 'Ruang mesin AHU' },
  },

  // ── 2. AHU (Air Handling Unit) ─────────────────────────────
  {
    id: 'ahu',
    type: 'ahu',
    label: 'AHU (Air Handling Unit)',
    glbPath: '/models/hvac/ahu.glb',
    procedural: false,
    position: { x: 8.5, y: 0.8, z: 0 },
    dimensions: { w: 1.8, h: 1.6, d: 2.4 },
    color: 0x78909c,
    visibleInModes: ['full-system', 'supply-air', 'return-air', 'refrigerant', 'exploded'],
    highlightInModes: {
      'supply-air': 0x00bcd4,
      'return-air': 0xef9a9a,
      'refrigerant': 0xffb74d,
    },
    opacityInModes: {
      'full-system': 1.0,
      'supply-air': 1.0,
      'return-air': 1.0,
      'refrigerant': 1.0,
      'exploded': 0.9,
    },
    specs: {
      'Model': 'ELFATECH AHU-OR-25',
      'Kapasitas': '3,000 CFM',
      'Cooling Coil': '8 kW',
      'Heater': '2 kW electric',
      'Pre-filter': 'G4 (EU4)',
      'Medium filter': 'F7 (EU7)',
      'Fan type': 'Centrifugal backward-curved',
      'Sound level': '< 45 dB(A)',
    },
  },

  // ── 3. CDU / Outdoor Condensing Unit ───────────────────────
  {
    id: 'cdu',
    type: 'cdu',
    label: 'CDU (Condensing Unit)',
    glbPath: '/models/hvac/cdu.glb',
    procedural: false,
    position: { x: 8.5, y: 4.2, z: 0 },
    dimensions: { w: 0.9, h: 0.7, d: 1.1 },
    color: 0x546e7a,
    visibleInModes: ['full-system', 'refrigerant', 'exploded'],
    highlightInModes: { 'refrigerant': 0xffb74d },
    specs: {
      'Model': 'ELFATECH CDU-8',
      'Refrigerant': 'R-410A',
      'Kapasitas': '8 kW',
      'COP': '3.5',
      'Lokasi': 'Rooftop',
    },
  },

  // ── 4. LAF — Laminar Air Flow Unit ─────────────────────────
  {
    id: 'laf-unit',
    type: 'laf',
    label: 'LAF — Laminar Air Flow',
    glbPath: '/models/hvac/laf.glb',
    procedural: false,
    position: { x: 0, y: 2.85, z: 0 },
    dimensions: { w: 2.4, h: 0.3, d: 1.8 },
    color: 0xb0bec5,
    visibleInModes: ['full-system', 'supply-air', 'exploded'],
    highlightInModes: { 'supply-air': 0x00e5ff },
    specs: {
      'Filter': 'HEPA H14 (99.995%)',
      'Ukuran': '2.4m × 1.8m',
      'Airflow': 'Unidirectional vertikal',
      'Velocity': '0.25–0.45 m/s',
      'Recovery time': '< 15 menit',
    },
  },

  // ── 5. SUPPLY DUCT UTAMA (dari AHU ke ceiling plenum) ──────
  {
    id: 'supply-duct-main',
    type: 'supply-duct',
    label: 'Main Supply Duct',
    procedural: true,
    position: { x: 7.6, y: 3.1, z: 0 },
    color: 0x00bcd4,
    visibleInModes: ['full-system', 'supply-air', 'exploded'],
    highlightInModes: { 'supply-air': 0x00e5ff },
    opacityInModes: {
      'full-system': 0.9,
      'supply-air': 1.0,
      'return-air': 0.15,
      'refrigerant': 0.15,
      'exploded': 0.85,
    },
    specs: {
      'Ukuran penampang': '500 × 300 mm',
      'Material': 'Galvanized steel (BJLS 0.8)',
      'Insulasi': 'Glasswool 25mm + aluminium foil',
      'Warna coding': 'Cyan/Blue (ASHRAE standard)',
    },
  },

  // ── 6. SUPPLY DUCT BRANCH (ke LAF dan diffuser) ────────────
  {
    id: 'supply-duct-branch-laf',
    type: 'supply-duct',
    label: 'Supply Branch → LAF',
    procedural: true,
    position: { x: 3.0, y: 3.1, z: 0 },
    color: 0x00bcd4,
    visibleInModes: ['full-system', 'supply-air', 'exploded'],
    highlightInModes: { 'supply-air': 0x00e5ff },
    opacityInModes: {
      'full-system': 0.9, 'supply-air': 1.0,
      'return-air': 0.15, 'refrigerant': 0.15, 'exploded': 0.85,
    },
    specs: {
      'Ukuran': '300 × 200 mm',
      'Transisi': 'Tapered diffuser box sebelum HEPA',
    },
  },

  // ── 7. FRESH AIR INTAKE ────────────────────────────────────
  {
    id: 'fresh-air-intake',
    type: 'fresh-air-intake',
    label: 'Fresh Air Intake (OAI)',
    procedural: true,
    position: { x: 9.0, y: 2.5, z: -2.5 },
    dimensions: { w: 0.4, h: 0.3, d: 0.5 },
    color: 0x80cbc4,
    visibleInModes: ['full-system', 'supply-air', 'exploded'],
    highlightInModes: { 'supply-air': 0x00e5ff },
    specs: {
      'Rasio': '20–30% dari total airflow',
      'Filter': 'G2 pre-filter di inlet',
      'Proteksi': 'Bird screen + rain louver',
      'Fungsi': 'Menjaga tekanan positif ruangan',
    },
  },

  // ── 8. RETURN DUCT ─────────────────────────────────────────
  {
    id: 'return-duct-main',
    type: 'return-duct',
    label: 'Main Return Duct',
    procedural: true,
    position: { x: 7.6, y: 2.6, z: 1.5 },
    color: 0xef9a9a,
    visibleInModes: ['full-system', 'return-air', 'exploded'],
    highlightInModes: { 'return-air': 0xff5252 },
    opacityInModes: {
      'full-system': 0.9, 'return-air': 1.0,
      'supply-air': 0.15, 'refrigerant': 0.15, 'exploded': 0.85,
    },
    specs: {
      'Ukuran': '600 × 250 mm',
      'Posisi grille': 'Low-wall, Y = 0.3–0.9m (ASHRAE 170)',
      'Jumlah grille': '4 (2 per sisi)',
      'Recirkulasi': '70–80% total airflow',
    },
  },

  // ── 9. RETURN AIR GRILLE (low-wall, 4 unit) ────────────────
  {
    id: 'return-grille-left-1',
    type: 'return-grille',
    label: 'Return Grille — Kiri Depan',
    procedural: true,
    position: { x: -3.0, y: 0.6, z: -1.5 },
    dimensions: { w: 0.6, h: 0.4, d: 0.05 },
    color: 0xef9a9a,
    visibleInModes: ['full-system', 'return-air', 'exploded'],
    highlightInModes: { 'return-air': 0xff5252 },
    specs: { 'Ukuran': '600 × 400 mm', 'Posisi': '600mm dari lantai' },
  },
  {
    id: 'return-grille-left-2',
    type: 'return-grille',
    label: 'Return Grille — Kiri Belakang',
    procedural: true,
    position: { x: -3.0, y: 0.6, z: 1.5 },
    dimensions: { w: 0.6, h: 0.4, d: 0.05 },
    color: 0xef9a9a,
    visibleInModes: ['full-system', 'return-air', 'exploded'],
    highlightInModes: { 'return-air': 0xff5252 },
    specs: { 'Ukuran': '600 × 400 mm' },
  },
  {
    id: 'return-grille-right-1',
    type: 'return-grille',
    label: 'Return Grille — Kanan Depan',
    procedural: true,
    position: { x: 3.0, y: 0.6, z: -1.5 },
    dimensions: { w: 0.6, h: 0.4, d: 0.05 },
    color: 0xef9a9a,
    visibleInModes: ['full-system', 'return-air', 'exploded'],
    highlightInModes: { 'return-air': 0xff5252 },
    specs: { 'Ukuran': '600 × 400 mm' },
  },
  {
    id: 'return-grille-right-2',
    type: 'return-grille',
    label: 'Return Grille — Kanan Belakang',
    procedural: true,
    position: { x: 3.0, y: 0.6, z: 1.5 },
    dimensions: { w: 0.6, h: 0.4, d: 0.05 },
    color: 0xef9a9a,
    visibleInModes: ['full-system', 'return-air', 'exploded'],
    highlightInModes: { 'return-air': 0xff5252 },
    specs: { 'Ukuran': '600 × 400 mm' },
  },

  // ── 10. EXHAUST / AGSS DUCT ────────────────────────────────
  {
    id: 'exhaust-agss',
    type: 'exhaust-duct',
    label: 'AGSS Exhaust (Anesthetic Gas)',
    procedural: true,
    position: { x: 0.5, y: 3.0, z: -2.5 },
    color: 0xffb74d,
    visibleInModes: ['full-system', 'exploded'],
    opacityInModes: { 'full-system': 0.8, 'exploded': 0.9 },
    specs: {
      'Standar': 'NFPA 99 / ASHRAE 170 Section 7.2',
      'Fungsi': 'Pembuangan sisa gas anestesi (N₂O, Halothane)',
      'Warna': 'Amber/Orange (AGSS coding)',
      'Outlet': 'Dedicated exhaust fan, tidak boleh recirculate',
    },
  },

  // ── 11. REFRIGERANT PIPE (CDU ↔ AHU) ──────────────────────
  {
    id: 'refrigerant-pipe-liquid',
    type: 'refrigerant-pipe',
    label: 'Pipa Refrigeran — Liquid Line',
    procedural: true,
    position: { x: 8.5, y: 3.8, z: 0.3 },
    color: 0xffb74d,
    visibleInModes: ['full-system', 'refrigerant', 'exploded'],
    highlightInModes: { 'refrigerant': 0xffd54f },
    opacityInModes: {
      'full-system': 0.85, 'refrigerant': 1.0,
      'supply-air': 0.1, 'return-air': 0.1, 'exploded': 0.9,
    },
    specs: {
      'Refrigerant': 'R-410A',
      'Diameter': 'Ø 15.88 mm (liquid line)',
      'Insulasi': 'Armaflex 13mm (hitam)',
      'Material': 'Copper ACR tube',
    },
  },
  {
    id: 'refrigerant-pipe-suction',
    type: 'refrigerant-pipe',
    label: 'Pipa Refrigeran — Suction Line',
    procedural: true,
    position: { x: 8.5, y: 3.8, z: -0.3 },
    color: 0xffb74d,
    visibleInModes: ['full-system', 'refrigerant', 'exploded'],
    highlightInModes: { 'refrigerant': 0xffd54f },
    opacityInModes: {
      'full-system': 0.85, 'refrigerant': 1.0,
      'supply-air': 0.1, 'return-air': 0.1, 'exploded': 0.9,
    },
    specs: {
      'Diameter': 'Ø 28.58 mm (suction line)',
      'Insulasi': 'Armaflex 19mm (hitam)',
    },
  },

  // ── 12. DRAIN PIPE ─────────────────────────────────────────
  {
    id: 'drain-pipe-ahu',
    type: 'drain-pipe',
    label: 'Condensate Drain Pipe',
    procedural: true,
    position: { x: 8.0, y: 0.4, z: 0.8 },
    color: 0x90a4ae,
    visibleInModes: ['full-system', 'exploded'],
    specs: {
      'Diameter': 'Ø 32 mm PVC',
      'Slope': 'Min. 1:50 ke floor drain',
      'P-trap': 'Wajib ada untuk seal udara',
    },
  },

  // ── 13. SURGICAL CONTROL PANEL ─────────────────────────────
  {
    id: 'surgical-panel',
    type: 'surgical-panel',
    label: 'Surgical Control Panel',
    glbPath: '/models/hvac/surgical-panel.glb',
    procedural: false,
    position: { x: -2.85, y: 1.5, z: -1.0 },
    dimensions: { w: 0.6, h: 0.5, d: 0.08 },
    color: 0x37474f,
    visibleInModes: ['full-system', 'exploded'],
    specs: {
      'Display': '10.4" Touchscreen',
      'Monitoring': 'Temp, RH, ΔP, AHU status',
      'Kontrol': 'Lighting, HVAC, Surgical Lamp, Clock',
      'Alert': 'Audio + visual alarm untuk anomali tekanan',
      'IP Rating': 'IP54 (splash-proof)',
    },
  },

  // ── 14. DIFFERENTIAL PRESSURE SENSOR ───────────────────────
  {
    id: 'pressure-sensor-door',
    type: 'pressure-sensor',
    label: 'Differential Pressure Sensor',
    procedural: true,
    position: { x: -2.85, y: 1.8, z: 0.5 },
    dimensions: { w: 0.08, h: 0.12, d: 0.05 },
    color: 0xffffff,
    visibleInModes: ['full-system', 'exploded'],
    specs: {
      'Range': '0–50 Pa',
      'Akurasi': '±0.5 Pa',
      'Output': '4–20 mA ke BMS',
      'Lokasi': 'Di frame pintu masuk OR',
    },
  },

  // ── 15. OPERATING TABLE (referensi posisi) ─────────────────
  {
    id: 'operating-table',
    type: 'operating-table',
    label: 'Operating Table',
    procedural: true,
    position: { x: 0, y: 0.9, z: 0 },
    dimensions: { w: 0.55, h: 0.15, d: 2.0 },
    color: 0x607d8b,
    visibleInModes: ['full-system', 'exploded'],
    specs: {
      'Fungsi': 'Referensi posisi critical zone',
      'Critical zone': '1m radius dari bidang operasi',
    },
  },

  // ── 16. VIBRATION ISOLATOR (AHU mounts) ───────────────────
  {
    id: 'vibration-isolator-ahu',
    type: 'vibration-isolator',
    label: 'Spring Isolator (AHU)',
    procedural: true,
    position: { x: 8.5, y: 0.0, z: 0 },
    color: 0x4fc3f7,
    visibleInModes: ['full-system', 'exploded'],
    specs: {
      'Tipe': 'Spring vibration isolator',
      'Natural freq': '3–5 Hz',
      'Static deflection': '25 mm',
      'Fungsi': 'Mencegah rambatan getaran AHU ke struktur',
    },
  },
];

// ============================================================
// HVAC PRODUCT OBJECT
// ============================================================

const HVAC_SYSTEM: Product = {
  id: 'hvac-system',
  name: 'HVAC & Laminar Air Flow',
  fullName: 'Modular Operating Theatre — HVAC & Laminar Air Flow System',
  description:
    'Sistem tata udara lengkap untuk Modular Operating Theatre (MOT): ' +
    'AHU dengan filter bertingkat, LAF HEPA H14, positive pressure control, ' +
    'fresh air intake, AGSS exhaust, dan surgical control panel terintegrasi.',
  category: 'Lainnya',
  badge: 'Integrated System',
  badgeColor: 'bg-emerald-100 text-emerald-700',
  viewerType: 'hvac-system',

  // HVAC active viewer uses its own internal mode/scenario UI, not the standard tabs.
  views: ['assembled'],

  // Legacy metadata retained for backward compatibility with older overlays/tools.
  hvacModes: HVAC_MODES,
  hvacComponents: HVAC_COMPONENTS,
  hvacSpecs: {
    standard: 'ASHRAE 170:2021 / NFPA 99',
    airChanges: '20 ACH (minimum untuk OR)',
    supplyTemp: '18–24°C adjustable',
    positivePresure: '+8 Pa (differential vs koridor)',
    hepaFilter: 'HEPA H14 (EN 1822) — 99.995%',
    noiseLevel: '< 45 dB(A) in-room NC-35',
    coolingCapacity: '8 kW (CDU outdoor)',
    freshAirRatio: '20–30% dari total supply',
  },

  // Layer kosong (HVAC tidak pakai layer stack)
  layers: [],

  // Dimensi untuk reference (OR room) — 1 unit = 1 meter
  dimensions: {
    widthMm: 6000,
    heightMm: 3000,
    depthMm: 6000,
    sceneWidth: 6,
    sceneHeight: 3,
  },

  specs: [
    { label: 'Standar', value: 'ASHRAE 170:2021 / NFPA 99' },
    { label: 'Air Changes', value: '20 ACH (minimum OR)' },
    { label: 'Supply Temp', value: '18–24°C adjustable' },
    { label: 'Tekanan Positif', value: '+8 Pa vs koridor' },
    { label: 'HEPA Filter', value: 'H14 (EN 1822) — 99.995%' },
    { label: 'Noise Level', value: '< 45 dB(A) NC-35' },
    { label: 'Cooling', value: '8 kW (CDU outdoor R-410A)' },
    { label: 'Fresh Air', value: '20–30% dari total supply' },
  ],

  // Camera presets for reference/export workflows. The active BIM v2 viewer
  // uses its own camera pose system from `hvac-bim-v2/scene.ts`.
  cameraPresets: [
    { name: 'Full System',   position: [12, 10, 12], target: [3, 1.5, 0] },
    { name: 'Supply Air',    position: [9, 8, 9],    target: [1.2, 2.6, 0] },
    { name: 'Return Air',    position: [11, 6, 7],   target: [0, 1.1, 1.2] },
    { name: 'DX Circuit',    position: [14, 6, 2],   target: [8.2, 2.8, 0] },
    { name: 'Plan View',     position: [3, 18, 0],   target: [3, 0, 0] },
    { name: 'Exploded',      position: [10, 12, 10], target: [3, 2.4, 0] },
  ],

  assembledCameraStart: [12, 10, 12],
  explodedCameraStart: [12, 10, 12],
};

export default HVAC_SYSTEM;
