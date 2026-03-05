/**
 * src/app/products/index.ts — PRODUCT REGISTRY
 * ─────────────────────────────────────────────
 * Untuk menambah produk baru:
 *   1. Buat file baru di folder ini, e.g. plafon-steel.ts
 *   2. Import dan tambahkan ke array PRODUCTS di bawah.
 *
 * Urutan array = urutan tampil di sidebar.
 * ─────────────────────────────────────────────
 */

import type { Product } from '../data/products';

import sandwichRadiasi  from './sandwich-radiasi';
import sandwichStandard from './sandwich-standard';
import cleanroom        from './cleanroom';
import curvingR40       from './curving';
// import plafonSteel   from './plafon-steel';   // ← tambah di sini

export const PRODUCTS: Product[] = [
  sandwichRadiasi,
  sandwichStandard,
  cleanroom,
  curvingR40,
  // plafonSteel,
];

/** Cari produk berdasarkan id slug. */
export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
