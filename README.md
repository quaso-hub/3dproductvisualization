# 3D Product Visualization — Katalog Panel Sandwich

Aplikasi visualisasi 3D produk panel konstruksi (sandwich panel, aluminium profile, cleanroom) untuk keperluan katalog dan marketing fasilitas kesehatan.

Proyek Figma: https://www.figma.com/design/gU5gGqcZ150U7FsMFd3kfa/3D-Product-Visualization

---

## Stack Teknologi

| Teknologi | Versi | Kegunaan |
|-----------|-------|---------|
| React | 18.3.1 | Framework UI |
| TypeScript | — | Type safety |
| Three.js | 0.183.2 | Rendering 3D |
| Vite | 6.3.5 | Build tool & dev server |
| Tailwind CSS | 4.1 | Styling |
| Radix UI / shadcn/ui | — | Komponen UI |

---

## Cara Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

---

## Arsitektur Proyek

```
src/app/
  data/
    products.ts          ← TYPE DEFINITIONS only (Layer, Product, ViewType, dll.)
  products/
    index.ts             ← PRODUCT REGISTRY — satu-satunya file yang diedit saat tambah produk
    sandwich-radiasi.ts
    sandwich-standard.ts
    cleanroom.ts
    curving.ts
  lib/
    three-scene.ts       ← SHARED Three.js engine (renderer, lights, controls, helpers)
  components/
    Sidebar.tsx          ← Nav kiri (56px collapsed / 260px expanded, hover-expand, pin)
    ProductViewer.tsx    ← Orkestrasi: tab per product.views, routing ke viewer yang tepat
    AssembledPanel3D.tsx ← 3D assembled — sandwich panel
    ExplodedPanel3D.tsx  ← 3D exploded — sandwich panel
    CurvingAssembled3D.tsx ← 3D assembled — aluminium L-profile / curving trim
    CurvingExploded3D.tsx  ← 3D exploded — aluminium L-profile / curving trim
    WallPanelViewer.tsx  ← Legacy 2D canvas (jangan diubah)
  App.tsx                ← Shell: flex h-screen, Sidebar + main
```

---

## Produk Saat Ini (4 produk)

| id | Nama | Kategori | Views | viewerType |
|----|------|----------|-------|------------|
| `sandwich-radiasi` | Sandwich + Radiasi | Panel Dinding | assembled, exploded | *(default)* |
| `sandwich-standard` | Sandwich Standard | Panel Dinding | assembled, exploded | *(default)* |
| `cleanroom` | Cleanroom Panel | Cleanroom | assembled, exploded | *(default)* |
| `curving` | Aluminium Angle 40×40 | Pintu & Partisi | assembled, exploded | `curving` |

---

## Cara Menambah Produk Baru

1. Buat `src/app/products/<slug>.ts`:

```typescript
import type { Product } from '../data/products';

const MY_PANEL: Product = {
  id: 'my-panel',
  name: 'Nama Singkat',
  fullName: 'Nama Lengkap',
  description: '…',
  category: 'Panel Dinding',
  // viewerType: 'curving',  // ← tambahkan hanya jika pakai viewer L-profile
  views: ['assembled', 'exploded'],
  layers: [ … ],
  dimensions: { widthMm: 1200, heightMm: 3000, sceneWidth: 120, sceneHeight: 300 },
  specs: [ … ],
  cameraPresets: [ … ],
  assembledCameraStart: [250, 180, 350],
  explodedCameraStart:  [350, 200, 450],
};
export default MY_PANEL;
```

2. Daftarkan di `src/app/products/index.ts`:
```typescript
import myPanel from './my-panel';
export const PRODUCTS: Product[] = [ …existingProducts, myPanel ];
```

**Tidak ada file lain yang perlu diubah.**

---

## Shared Engine: `lib/three-scene.ts`

| Export | Fungsi |
|--------|--------|
| `createScene({ container, cameraStart })` | Renderer, camera, 4-point lights, OrbitControls, ResizeObserver |
| `startRenderLoop(refs)` | RAF loop → return `stop()` |
| `disposeScene(refs, container)` | Full cleanup |
| `applyCameraPreset(refs, position, target)` | Animasi kamera ke preset |
| `visualThickness(layer)` | Scale layer tipis agar terlihat |
| `buildLayerMesh(layer, w, h, t)` | `THREE.Group` dengan MeshStandardMaterial + EdgesGeometry |
| `createAnnotationFull(scene, anchor, labelPos, text)` | Dot + elbow leader line + sprite label (all-in-one) |
| `downloadPNG(renderer, filename)` | Simpan canvas sebagai PNG |

### Visual Thickness Scaling (jangan diubah)
```typescript
if (layer.thickness < 1) return layer.thickness * 20;  // coating
if (layer.thickness < 5) return layer.thickness * 8;   // timbal dll.
return layer.thickness;                                  // layer normal
```
Simpan selalu **nilai mm asli** di product file. Scaling otomatis.

### Renderer Config (selalu gunakan setting ini)
```typescript
{ antialias: true, alpha: true, preserveDrawingBuffer: true }
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.type = THREE.VSMShadowMap;
```

### Pattern useEffect Semua Viewer (ResizeObserver — jangan pakai setTimeout)
```typescript
useEffect(() => {
  if (!mountRef.current) return;
  const container = mountRef.current;
  let initialized = false;
  let stopRender: (() => void) | undefined;

  const init = () => {
    if (initialized || container.clientWidth < 1 || container.clientHeight < 1) return;
    initialized = true;
    ro.disconnect();
    const refs = createScene({ container, cameraStart: … });
    refsRef.current = refs;
    // … build scene …
    stopRender = startRenderLoop(refs);
  };

  const ro = new ResizeObserver(init);
  ro.observe(container);
  init(); // coba langsung jika container sudah punya ukuran

  return () => {
    ro.disconnect();
    if (stopRender) stopRender();
    if (refsRef.current) { disposeScene(refsRef.current, container); refsRef.current = null; }
  };
}, [product]);
```

---

## Konvensi

- Semua teks UI dan spec dalam **Bahasa Indonesia**
- `sceneWidth/sceneHeight` = Three.js units (120 ≈ 1200 mm)
- Nama file unduhan: `{product.id}-assembled-{angle}.png`
- Jangan gabungkan logika assembled/exploded dalam satu komponen
- Tidak ada auto-rotation — OrbitControls manual saja
- `WallPanelViewer.tsx` adalah legacy — **jangan dimodifikasi** kecuali diminta eksplisit

---

## Dokumentasi Teknis

Lihat [`VISUALIZATION_3D_GUIDE.md`](./VISUALIZATION_3D_GUIDE.md) untuk panduan detail: setup pencahayaan, material system, annotation, exploded view, download.


Aplikasi visualisasi 3D produk **Panel Dinding Sandwich** untuk keperluan katalog dan marketing fasilitas kesehatan (rumah sakit, ruang radiologi, ruang operasi, dll).

Proyek asli tersedia di: https://www.figma.com/design/gU5gGqcZ150U7FsMFd3kfa/3D-Product-Visualization

---

## Apa Itu Proyek Ini?

Ini adalah aplikasi web berbasis **React + Three.js + TypeScript** yang menampilkan dua mode visualisasi 3D panel berlapis (*sandwich panel*) secara interaktif:

1. **Assembled View (Tampilan Utuh)** — Panel tersusun lengkap, siap dipasang.
2. **Exploded View (Tampilan Terpisah)** — Setiap lapisan dipisahkan agar detail material terlihat jelas.

Pengguna dapat memutar, zoom, dan memindahkan kamera secara bebas, serta mengunduh gambar dari berbagai sudut kamera profesional.

---

## Struktur Panel (5 Lapisan)

| # | Nama Layer | Ketebalan | Fungsi |
|---|-----------|-----------|--------|
| 1 | Baja AZ100 (Dalam) | 0.5 mm | Lapisan baja dalam |
| 2 | Core PIR Foam | 75 mm | Insulasi termal utama |
| 3 | Timbal 2mm (opsional) | 2 mm | Proteksi radiasi |
| 4 | Coating HRP | 0.05 mm | Anti-bakteri |
| 5 | Baja AZ100 (Luar) | 0.5 mm | Lapisan baja luar |

---

## Struktur Proyek

```
src/
├── main.tsx                         # Entry point React
└── app/
    ├── App.tsx                      # Halaman utama (layout + spesifikasi)
    └── components/
        ├── AssembledPanel3D.tsx     # Komponen visualisasi panel utuh
        ├── ExplodedPanel3D.tsx      # Komponen visualisasi panel terpisah
        └── ui/                      # Komponen UI (shadcn/ui)
```

---

## Teknologi yang Digunakan

| Teknologi | Versi | Kegunaan |
|----------|-------|---------|
| React | 18.3.1 | Framework UI |
| TypeScript | — | Type safety |
| Three.js | 0.183.2 | Rendering 3D |
| Vite | 6.3.5 | Build tool & dev server |
| Tailwind CSS | 4.1 | Styling |
| Radix UI / shadcn/ui | — | Komponen UI |

---

## Fitur Utama

- 🧊 **Dua mode 3D**: Assembled (utuh) & Exploded (terpisah)
- 📸 **6 camera preset** profesional untuk katalog (Front Isometric, Side Detail, Top View, dll.)
- 📥 **Download** gambar PNG dari sudut manapun, atau semua 6 sudut sekaligus
- 🏷️ **Anotasi layer** otomatis dengan label teks yang jelas
- 🖱️ **Kontrol interaktif**: Drag untuk rotasi, scroll untuk zoom, klik kanan untuk geser
- 🔦 **Pencahayaan 4-titik** (ambient, key, fill, rim) berkualitas katalog

---

## Cara Menjalankan

```bash
# Install dependensi
npm install

# Jalankan development server (http://localhost:5173)
npm run dev

# Build untuk production
npm run build

# Preview build production
npm run preview
```

---

## Dokumentasi Teknis

Lihat file [`VISUALIZATION_3D_GUIDE.md`](./VISUALIZATION_3D_GUIDE.md) untuk panduan lengkap pengembangan, termasuk:
- Setup pencahayaan
- Sistem material (metalness/roughness)
- Scaling layer tipis agar tetap terlihat
- Konfigurasi anotasi
- Exploded view & connection lines
- Sistem download gambar
  