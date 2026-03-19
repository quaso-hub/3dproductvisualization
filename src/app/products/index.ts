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
import hermeticDoor    from './hermetic-door';
import pbLeadDoor       from './pb-lead-door';
import scrubSink        from './scrub-sink';
import passBox          from './pass-box';
import pacsCabinet      from './pacs-cabinet';
import returnAirGrille  from './return-air-grille';
import lafSystem        from './laf-system';
import ceilingPanel     from './ceiling-panel';
import surgicalPanel    from './surgical-panel';
import hvacSystem       from './hvac-system';

export const PRODUCTS: Product[] = [
  sandwichRadiasi,
  sandwichStandard,
  cleanroom,
  curvingR40,
  hermeticDoor,
  pbLeadDoor,
  scrubSink,
  passBox,
  pacsCabinet,
  returnAirGrille,
  lafSystem,
  ceilingPanel,
  surgicalPanel,
  hvacSystem,
];

/** Cari produk berdasarkan id slug. */
export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
