# 3D Product Catalog — Visualisasi Katalog Medis

Aplikasi React + Three.js untuk visualisasi 3D produk bangunan medis (panel sandwich, pintu hermetic, aluminium profile) dengan kualitas katalog profesional untuk kebutuhan print & marketing.

Figma: https://www.figma.com/design/gU5gGqcZ150U7FsMFd3kfa/3D-Product-Visualization

---

## Stack

| Teknologi | Versi | Kegunaan |
|-----------|-------|---------|
| React | 18 | Framework UI |
| TypeScript | — | Type safety |
| Three.js | 0.183 | Rendering 3D |
| Vite | 6 | Build tool (port 5173) |
| Tailwind CSS | 4 | Styling |

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

---

## Arsitektur

```
src/app/
  data/products.ts          # Type definitions only
  products/
    index.ts                # PRODUCT REGISTRY — edit ini saat tambah produk
    sandwich-radiasi.ts
    sandwich-standard.ts
    cleanroom.ts
    curving-r40.ts
    hermetic-door.ts
  lib/
    three-scene.ts          # Shared Three.js engine (renderer, lights, controls, helpers)
  hooks/
    useThreeScene.ts        # Scene lifecycle hook
  components/
    Sidebar.tsx
    ProductViewer.tsx       # Routing viewer berdasarkan viewerType
    AssembledPanel3D.tsx / ExplodedPanel3D.tsx
    CurvingAssembled3D.tsx / CurvingExploded3D.tsx
    HermeticDoorAssembled3D.tsx / HermeticDoorExploded3D.tsx
    ViewerControls.tsx      # Camera preset + download bar (reusable)
    WallPanelViewer.tsx     # Legacy 2D — jangan diubah
```

---

## Produk (5)

| ID | Nama | Kategori | viewerType |
|----|------|----------|------------|
| `sandwich-radiasi` | Sandwich + Radiasi | Panel Dinding | panel (default) |
| `sandwich-standard` | Sandwich Standard | Panel Dinding | panel (default) |
| `cleanroom` | Cleanroom Panel | Cleanroom | panel (default) |
| `curving-r40` | Curving R40 | Pintu & Partisi | `curving` |
| `hermetic-door` | Hermetic Auto Sliding Door | Pintu & Partisi | `hermetic-door` |

---

## Menambah Produk Baru

**Panel biasa** (tidak perlu custom viewer):

1. Buat `src/app/products/<slug>.ts`
2. Register di `src/app/products/index.ts`

**Custom viewer** (bentuk 3D unik):

1. Tambah literal di `viewerType` union (`data/products.ts`)
2. Buat `<Type>Assembled3D.tsx` + `<Type>Exploded3D.tsx`
3. Routing di `ProductViewer.tsx`
4. Register produk

Template dan detail lengkap → [`.github/copilot-instructions.md`](.github/copilot-instructions.md)

---

## Konvensi

- Skala: **1 scene unit = 10mm** (pintu 1600×2100mm → DW=160, DH=210)
- Semua teks UI & spec dalam **Bahasa Indonesia**
- **Tidak ada auto-rotation** — hanya manual OrbitControls
- Download: `{product.id}-{view}-{angle}.png`
- Jangan gabung assembled/exploded dalam satu komponen
- `WallPanelViewer.tsx` adalah legacy — jangan dimodifikasi

---

## Dokumentasi Teknis

| File | Isi |
|------|-----|
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Arsitektur, API engine, pattern, skills |
| [`VISUALIZATION_3D_GUIDE.md`](VISUALIZATION_3D_GUIDE.md) | Lighting, material, annotation (`placeAnnotations`), pitfalls |
| [`CHANGELOG.md`](CHANGELOG.md) | Riwayat perubahan per sesi |

---

## Skills AI (wajib diaktifkan)

| Pekerjaan | Skill |
|-----------|-------|
| Three.js scene / geometry | `@threejs-skills` + `@3d-web-experience` |
| Komponen React / styling | `@frontend-design` + `@ui-ux-pro-max` |
| GLSL shader / material custom | `@shader-programming-glsl` |
| UI compliance / aksesibilitas | `@web-design-guidelines` |
| Google Stitch UI | `@stitch-ui-design` + `@design-md` |
| Orkestrasi desain multi-step | `@design-orchestration` |

Skills: `C:\Users\warma\.claude\skills\` · `C:\Users\warma\.gemini\antigravity\skills\`
