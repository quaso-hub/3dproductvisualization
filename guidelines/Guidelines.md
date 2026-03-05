# Guidelines — 3D Product Catalog

> **Baca file ini sebelum melakukan apapun.**
> File ini adalah sumber kebenaran tunggal tentang cara kerja sesi ini.
> README.md = arsitektur teknis. CHANGELOG.md = riwayat perubahan. File ini = aturan kerja AI.

---

## 🧠 Cara Export Konteks AI (Pindah Layanan / Sesi Baru)

Gunakan prompt berikut ketika ingin mengekspor seluruh memori/konteks dari sesi AI manapun:

```
I'm moving to another service and need to export my data. List every memory you have
stored about me, as well as any context you've learned about me from past conversations.
Output everything in a single code block so I can easily copy it.

Format each entry as: [date saved, if available] - memory content.

Make sure to cover all of the following — preserve my words verbatim where possible:
- Instructions I've given you about how to respond (tone, format, style, 'always do X', 'never do Y').
- Projects, goals, and recurring topics.
- Tools, languages, and frameworks I use.
- Preferences and corrections I've made to your behavior.
- Any other stored context not covered above.

Do not summarize, group, or omit any entries.

After the code block, confirm whether that is the complete set or if any remain.
```

---

## ⚡ Mitigasi: Kena Limit / Jaringan Putus / Error di Tengah Task

### Masalah Yang Sering Terjadi
- Token budget habis → AI berhenti di tengah `replace_string_in_file`
- Jaringan putus → tool call tidak selesai, state file tidak jelas
- Error tidak terduga → AI lanjut dari asumsi yang salah

### Protokol Pencegahan (AI WAJIB Ikuti)

#### 1. Baca State Dulu, Baru Kerja
Sebelum menulis kode apapun, AI **harus** membaca file yang relevan terlebih dahulu.
Jangan pernah berasumsi file masih sama seperti sesi sebelumnya.

#### 2. Satu Edit = Satu Perubahan Atomik
Setiap `replace_string_in_file` harus tunggal dan atomik.
Jangan gabungkan 2 perubahan logis berbeda dalam satu replace call.

#### 3. Verifikasi Setelah Setiap Edit
Setelah setiap edit penting, panggil `get_errors` untuk konfirmasi tidak ada TypeScript error.

#### 4. Tandai Progress Secara Eksplisit
Untuk task dengan 3+ langkah, AI wajib membuat daftar langkah dan menandai status setiap langkah.
Ini memungkinkan recovery jika sesi terpotong di tengah.

#### 5. Checkpoint State di CHANGELOG
Setiap sesi yang selesai **harus** dicatat di `CHANGELOG.md` dengan:
- Tanggal
- Daftar file yang diubah
- Apa yang berubah dan mengapa

### Jika Sesi Terpotong — Recovery Protocol

**User** ketik salah satu:
- `"lanjutkan"` — AI baca ulang file terakhir yang diedit, lanjutkan dari titik terputus
- `"resume"` — sama seperti di atas
- `"cek state"` — AI baca CHANGELOG.md + semua file yang disebutkan di entri terakhir

**AI steps saat recovery:**
1. Baca `CHANGELOG.md` → temukan entri terakhir → identifikasi file mana yang sedang dikerjakan
2. Baca file tersebut dengan `read_file` — jangan asumsikan isinya
3. Lanjutkan dari titik terputus

### Template Pesan Recovery untuk User

```
Sesi sebelumnya terpotong. Tolong:
1. Baca CHANGELOG.md untuk tahu apa yang sudah dikerjakan
2. Baca [nama file yang sedang diedit]
3. Lanjutkan dari titik terakhir yang tercatat
Jangan asumsikan — baca langsung filenya dulu.
```

---

## 📋 Konteks Proyek (Untuk AI Baru / Sesi Baru)

### Identitas Proyek
- **Nama**: 3D Product Catalog — Visualisasi Panel Sandwich & Aluminium Profile
- **Owner**: quaso-hub
- **Repo**: `quaso-hub/3dproductvisualization`
- **Branch utama**: `main`
- **Dev server**: `npm run dev` → `http://localhost:5173`
- **Build**: `npm run build` (Vite)

### Stack
React 18.3.1 + Three.js 0.183.2 + TypeScript + Vite 6.3.5 + Tailwind CSS 4.1 + shadcn/ui

### Arsitektur Inti (Wajib Dipahami)
- `src/app/products/index.ts` — **satu-satunya file yang diedit** saat tambah produk
- `src/app/lib/three-scene.ts` — **semua boilerplate Three.js ada di sini**, jangan duplikasi
- `src/app/data/products.ts` — **type definitions only**, tidak ada data produk
- Setiap produk punya file sendiri: `src/app/products/<slug>.ts`

### Viewer Types
| `viewerType` | Komponen Assembled | Komponen Exploded |
|---|---|---|
| *(tidak ada / undefined)* | `AssembledPanel3D` | `ExplodedPanel3D` |
| `'curving'` | `CurvingAssembled3D` | `CurvingExploded3D` |

### Produk Aktif (per 2026-03-04)
| id | Nama | Kategori | viewerType |
|----|------|----------|------------|
| `sandwich-radiasi` | Sandwich + Radiasi | Panel Dinding | default |
| `sandwich-standard` | Sandwich Standard | Panel Dinding | default |
| `cleanroom` | Cleanroom Panel | Cleanroom | default |
| `curving` | Aluminium Angle 40x40 | Pintu & Partisi | `curving` |

---

## ✅ Konvensi Wajib

### Bahasa
- Semua teks UI, label spec, nama kategori → **Bahasa Indonesia**
- Kode, variabel, komentar → **Bahasa Inggris**
- Jangan gunakan em dash dalam nilai string yang ditampilkan ke user

### Three.js
- `visualThickness()` selalu dipakai untuk scaling layer tipis — **jangan override manual**
- Simpan `thickness` dalam **mm asli** di product file — scaling otomatis
- Shadow: `THREE.VSMShadowMap` (bukan `PCFSoftShadowMap` — sudah deprecated)
- Renderer: `{ antialias: true, alpha: true, preserveDrawingBuffer: true }`
- Canvas sizing: `style.width/height = '100%'` (CSS) + `renderer.setSize(w,h)` via ResizeObserver
- **Jangan pakai `setTimeout` untuk init scene** — gunakan ResizeObserver pattern (lihat README.md)
- **Jangan pakai `position: absolute` untuk canvas** — container tidak punya intrinsic height

### Anotasi
- Gunakan `createAnnotationFull()` dari `lib/three-scene.ts` — bukan manual dot+line+sprite
- Elbow leader: anchor → (pivot: same Y as label, same X/Z as anchor) → labelPos

### Layout
- Canvas container: `flex-1 min-h-0` agar flex chain mengalir sampai canvas
- Viewer root: `w-full h-full flex flex-col`
- Control bar: `flex-shrink-0` di atas; canvas area: `flex-1 min-h-0` di bawah
- Jangan hardcode `minHeight` pada viewer container

### Komponen
- Jangan gabungkan logika assembled + exploded dalam satu komponen
- `WallPanelViewer.tsx` = legacy, **jangan dimodifikasi** kecuali diminta eksplisit
- `AssembledPanel3D` mengexport `ViewerControls` — diimpor oleh `ExplodedPanel3D`
- `CurvingAssembled3D` mengexport `CurvingViewerControls` — diimpor oleh `CurvingExploded3D`

### Download
- Filename format: `{product.id}-assembled-{angle}.png` / `{product.id}-exploded-{angle}.png`

---

## ❌ Hal yang Tidak Boleh Dilakukan

- Jangan tambah auto-rotation — OrbitControls manual saja
- Jangan pakai `position: absolute` untuk canvas viewer
- Jangan pakai `setTimeout` untuk init Three.js scene
- Jangan duplikasi boilerplate Three.js di luar `lib/three-scene.ts`
- Jangan edit `WallPanelViewer.tsx` kecuali diminta eksplisit
- Jangan simpan data produk di `data/products.ts` (hanya types)
- Jangan hardcode `minHeight` pada viewer container
- Jangan gunakan em dash dalam string yang tampil ke user

---

## 📁 File Referensi Penting

| File | Isi |
|------|-----|
| `README.md` | Arsitektur, cara tambah produk, shared engine API, ResizeObserver pattern |
| `CHANGELOG.md` | Riwayat perubahan per sesi — **baca ini dulu saat recovery** |
| `VISUALIZATION_3D_GUIDE.md` | Panduan detail Three.js: lighting, material, annotation, exploded view |
| `.github/copilot-instructions.md` | Instruksi ringkas untuk GitHub Copilot in-editor |
| `guidelines/Guidelines.md` | **File ini** — aturan kerja, recovery protocol, AI context export |
