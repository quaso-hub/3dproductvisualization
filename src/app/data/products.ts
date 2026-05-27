/**
 * products.ts — TYPE DEFINITIONS only.
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  Untuk menambah produk baru:                        │
 * │  1. Buat file di src/app/products/<nama>.ts         │
 * │  2. Daftarkan di src/app/products/index.ts          │
 * │  3. Tambah viewerType ke VIEWER_TYPES jika custom   │
 * │  4. Daftarkan komponen di data/viewerRegistry.ts     │
 * └─────────────────────────────────────────────────────┘
 */

export interface Layer {
  name: string;
  thickness: number; // mm — nilai nyata; scaling visual ditangani oleh three-scene.ts
  color: number;     // Three.js hex color (e.g. 0xc0ced8)
  roughness: number; // PBR 0–1
  metalness: number; // PBR 0–1
}

export interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface PanelDimensions {
  widthMm: number;
  heightMm: number;
  /** Optional depth for 3-D products (sinks, cabinets). */
  depthMm?: number;
  /** Three.js scene units (120 ≈ 1200 mm) */
  sceneWidth: number;
  /** Three.js scene units (300 ≈ 3000 mm) */
  sceneHeight: number;
  /** Three.js scene units — optional depth axis. */
  sceneDepth?: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

/**
 * View types supported.
 * 'assembled' = panel utuh | 'exploded' = layer dipisah
 * Tambah string literal baru di sini jika butuh view jenis lain.
 */
export type ViewType = 'assembled' | 'exploded';

/**
 * Kategori produk — untuk grouping di sidebar.
 * Nama sesuai katalog resmi ELFATECH (bahasa Inggris).
 * Tambah entry baru jika perlu kategori baru.
 */
export type ProductCategory =
  | 'Wall Panel Element'   // panel dinding sandwich PIR/GI - sebelumnya 'Panel Dinding' + 'Cleanroom'
  | 'Plafon'
  | 'Lantai'
  | 'Pintu & Partisi'
  | 'Peralatan Medis'      // X-Ray Viewer, illuminator, dll
  | 'Peralatan Kontrol'    // Surgical Control Panel, BMS interface
  | 'Lainnya';

// ============================================================
// VIEWER TYPES — Central Definition
// ============================================================

/**
 * Semua viewerType yang terdaftar.
 * UBAH DI SINI jika ada viewerType baru.
 * 
 * viewerType memetakan ke komponen di data/viewerRegistry.ts
 */
export const VIEWER_TYPES = [
  'panel',           // default
  'curving',
  'hermetic-door',
  'pb-lead-door',
  'scrub-sink',
  'pass-box',
  'pacs-cabinet',
  'return-air-grille',
  'laf-system',
  'ceiling-panel',
  'surgical-panel',
  'hvac-system',
] as const;

/**
 * Type dari viewerType — otomatis dari VIEWER_TYPES
 */
export type ViewerType = typeof VIEWER_TYPES[number];

export interface Product {
  /** Slug unik — dipakai di URL & nama file download. */
  id: string;
  /** Nama singkat — ditampilkan di sidebar. */
  name: string;
  /** Nama lengkap — ditampilkan di heading viewer. */
  fullName: string;
  description: string;
  /** Kategori untuk grouping sidebar. */
  category: ProductCategory;
  badge?: string;
  /** Tailwind color class pair, e.g. "bg-yellow-100 text-yellow-700". */
  badgeColor?: string;
  /** View mana saja yang tersedia untuk produk ini. */
  views: ViewType[];
  /**
   * Tipe renderer 3D — memetakan ke komponen di viewerRegistry.ts.
   * 
   * Lihat VIEWER_TYPES untuk daftar lengkap.
   * Jika tidak di-set, default ke 'panel' (AssembledPanel3D / ExplodedPanel3D).
   */
  viewerType?: ViewerType;
  layers: Layer[];
  dimensions: PanelDimensions;
  specs: ProductSpec[];
  cameraPresets: CameraPreset[];
  assembledCameraStart: [number, number, number];
  explodedCameraStart: [number, number, number];

  /** HVAC-specific legacy metadata for older overlays; active BIM v2 runtime mainly reads hvacSpecs. */
  hvacComponents?: HVACComponent[];
  /** HVAC-specific legacy metadata for older overlays; active BIM v2 runtime defines modes in hvac-bim-v2/*. */
  hvacModes?: HVACMode[];
  /** HVAC-specific: Technical baseline still consumed by the active BIM v2 overlay. */
  hvacSpecs?: HVACSpecs;
}

// ============================================================
// HVAC-SPECIFIC TYPES
// ============================================================

export type HVACModeKey =
  | 'full-system'
  | 'supply-air'
  | 'return-air'
  | 'refrigerant'
  | 'floor-plan'
  | 'exploded';

export interface HVACMode {
  key: HVACModeKey;
  label: string;
  icon: string;
  description: string;
  highlightColor?: number;
}

export type HVACComponentType =
  | 'ahu'
  | 'cdu'
  | 'laf'
  | 'supply-duct'
  | 'return-duct'
  | 'exhaust-duct'
  | 'fresh-air-intake'
  | 'refrigerant-pipe'
  | 'drain-pipe'
  | 'return-grille'
  | 'supply-diffuser'
  | 'surgical-panel'
  | 'pressure-sensor'
  | 'building-shell'
  | 'operating-table'
  | 'vibration-isolator';

export interface HVACComponent {
  id: string;
  type: HVACComponentType;
  label: string;
  glbPath?: string;
  procedural: boolean;
  position: { x: number; y: number; z: number };
  dimensions?: { w: number; h: number; d: number };
  color?: number;
  visibleInModes: HVACModeKey[];
  highlightInModes?: Partial<Record<HVACModeKey, number>>;
  opacityInModes?: Partial<Record<HVACModeKey, number>>;
  specs?: Record<string, string>;
}

export interface HVACSpecs {
  standard: string;
  airChanges: string;
  supplyTemp: string;
  positivePresure: string;
  hepaFilter: string;
  noiseLevel: string;
  coolingCapacity: string;
  freshAirRatio: string;
}
