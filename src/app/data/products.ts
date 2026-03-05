/**
 * products.ts — TYPE DEFINITIONS only.
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  Untuk menambah produk baru:                        │
 * │  1. Buat file di src/app/products/<nama>.ts         │
 * │  2. Daftarkan di src/app/products/index.ts          │
 * │  Tidak perlu ubah file ini.                         │
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
  /** Three.js scene units (120 ≈ 1200 mm) */
  sceneWidth: number;
  /** Three.js scene units (300 ≈ 3000 mm) */
  sceneHeight: number;
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
 * Tambah entry baru jika perlu kategori baru.
 */
export type ProductCategory =
  | 'Panel Dinding'
  | 'Cleanroom'
  | 'Plafon'
  | 'Lantai'
  | 'Pintu & Partisi'
  | 'Lainnya';

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
   * Tipe renderer 3D.
   * 'panel'   = flat sandwich panel (default, AssembledPanel3D / ExplodedPanel3D)
   * 'curving' = profil-L aluminium dengan radius (CurvingAssembled3D / CurvingExploded3D)
   */
  viewerType?: 'panel' | 'curving';
  layers: Layer[];
  dimensions: PanelDimensions;
  specs: ProductSpec[];
  cameraPresets: CameraPreset[];
  assembledCameraStart: [number, number, number];
  explodedCameraStart: [number, number, number];
}
