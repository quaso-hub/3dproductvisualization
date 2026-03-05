# MCP Design Tools — Panduan untuk Project MOT Elfatech
> Version: 2.0 | Updated: 2026-03-05
> Scope: Claude Code + Claude Desktop yang bekerja di repo `brosur-lin/`

---

## KONTEKS: KENAPA MCP TOOLS INI ADA

Project ini menghasilkan katalog cetak MOT (Modular Operating Theatre) untuk
PT Teknomed Indo Timur. Selain print catalog, project juga butuh:

1. **3D product visualization** — render produk (panel sandwich, curving, cleanroom)
   untuk dipakai sebagai gambar produk di katalog cetak.
2. **UI komponen** — untuk 3D viewer web (`3d/3dproductvisualization/`) dan
   nanti juga untuk web version katalog (post-migrasi Astro).

Blender/FreeCAD sudah dicoba tapi tidak reliable melalui MCP. Solusi yang
berhasil: **Three.js web viewer** yang bisa di-screenshot untuk katalog cetak.

---

## TOOLS YANG TERPASANG

| # | Tool | Tipe | Fungsi di Project Ini |
|---|------|------|----------------------|
| 1 | **Stitch MCP** | MCP Server | Generate mockup layout halaman katalog / UI viewer |
| 2 | **Nano Banana** | MCP Server | Generate gambar hero, background, ilustrasi untuk katalog |
| 3 | **UI UX Pro Max** | Skill | Design intelligence: palette, font, style consistency check |
| 4 | **21st.dev Magic** | MCP Server | Generate React komponen untuk 3D viewer dan web catalog |

---

## KAPAN PAKAI TOOL MANA

### Untuk Katalog Cetak (catalog/)

| Kebutuhan | Tool | Contoh Prompt |
|-----------|------|---------------|
| Layout halaman baru | Stitch MCP | "Generate mockup halaman product page untuk hermetic door, A4 portrait, brand Elfatech navy/teal" |
| Hero image cover | Nano Banana | "Generate foto ruang operasi modern, clean, pencahayaan terang, sudut lebar, tanpa pasien, style professional photography" |
| Background texture | Nano Banana | "Generate abstract medical pattern, navy blue dan teal, subtle, untuk background section divider" |
| Review konsistensi warna | UI UX Pro Max | "Review apakah halaman 27-28 HVAC konsisten dengan brand palette Navy #003366, Teal #0d9488" |

### Untuk 3D Product Viewer (3d/3dproductvisualization/)

| Kebutuhan | Tool | Contoh Prompt |
|-----------|------|---------------|
| Komponen UI viewer baru | 21st.dev Magic | "Generate sidebar navigation untuk product catalog, React + Tailwind + shadcn/ui, dark theme" |
| Perbaikan layout viewer | UI UX Pro Max | "Review layout sidebar + canvas viewer, apakah responsive dan aksesibel" |
| Referensi visual produk | Stitch MCP | "Generate wireframe panel dinding sandwich 3-layer dengan anotasi dimensi" |

### JANGAN dipakai untuk:

| Situasi | Alasan |
|---------|--------|
| Generate angka spec produk | Sumber kebenaran = XLSX, bukan AI generated |
| Generate model label / kode produk | Hanya pakai yang ada di XLSX |
| Replace SVG diagram yang sudah final | 17 SVG sudah finalized, jangan ganti |
| Generate logo atau badge | Asset brand sudah final |

---

## WORKFLOW UNTUK MEMBUAT GAMBAR PRODUK BARU

Ini adalah workflow yang sudah terbukti berhasil untuk project ini:

### Langkah 1 — Buat 3D model di Three.js viewer
```
File: 3d/3dproductvisualization/src/app/products/<nama-produk>.ts

Definisikan:
- layers[] dengan thickness (mm asli), color, material PBR
- dimensions (widthMm, heightMm, sceneWidth, sceneHeight)
- specs[] (label + value dari XLSX)
- cameraPresets[] (angle yang diinginkan untuk katalog)
- annotations[] (label dimensi/material)

Daftarkan di: src/app/products/index.ts
```

### Langkah 2 — Iterasi di browser
```
cd 3d/3dproductvisualization
npm run dev
```
Buka `http://localhost:5173`, pilih produk, atur angle + anotasi.
**Expect 5-10 iterasi per produk** sampai visual sesuai keinginan.

### Langkah 3 — Download screenshot
Gunakan tombol download di viewer. Format: `{product-id}-{view}-{angle}.png`

### Langkah 4 — Pakai di katalog
Copy file ke `catalog/assets/images/`, ganti placeholder di `index.html`.

### Di mana MCP tools membantu:
- **Langkah 1**: UI UX Pro Max bisa review apakah warna material PBR sesuai brand
- **Langkah 2**: Nano Banana bisa generate referensi visual jika bingung tampilan target
- **Langkah 4**: Stitch bisa generate mockup layout halaman dengan gambar baru

---

## PRODUK YANG SUDAH ADA DI 3D VIEWER

(Per 2026-03-04)

| ID | Nama | Kategori | Status |
|----|------|----------|--------|
| `sandwich-radiasi` | Sandwich Panel + Lead Radiation | Panel Dinding | Done |
| `sandwich-standard` | Sandwich Panel Standard PIR | Panel Dinding | Done |
| `cleanroom` | Cleanroom Panel | Cleanroom | Done |
| `curving` | Aluminium Angle R40 | Pintu & Partisi | Done |

### Produk yang BELUM dibuat tapi ada di katalog:
Lihat `docs/workflow/20260304-catalog-fixes-directive.md` section "IMAGE MAP"
untuk daftar lengkap 22 produk yang masih placeholder.

Yang paling high-priority untuk dibuat 3D-nya:
1. Wall Panel PIR 75mm (`product-wall-panel-pir.png`)
2. Ceiling Panel (`product-ceiling-panel.png`)
3. Hermetic Sliding Door (`product-hermetic-door.png`)
4. Medical Pendant (`product-pendant-double.png`)
5. Shadowless Lamp (`product-shadowless-lamp.png`)

Note: tidak semua produk cocok untuk 3D Three.js (misal scrub sink, operating table
lebih cocok foto real atau render Blender). Three.js paling cocok untuk:
panel/dinding/ceiling (layers), door cross-section, dan produk dengan geometri sederhana.

---

## CONSTRAINT BRAND (BERLAKU DI SEMUA TOOLS)

Saat menggunakan tool apapun, ikuti constraint ini:

```
Warna utama : Navy #003366, Teal #0d9488, Gray #6b7280
Font        : Inter (UI & print)
Style       : Professional, clean, medical/healthcare
Tone        : Serius dan technical, bukan playful
Imagery     : TIDAK BOLEH ada gambar pasien/orang
              TIDAK BOLEH stock generic medical imagery
              Fokus pada produk dan ruangan saja
```

---

## TROUBLESHOOTING

| Problem | Solusi |
|---------|--------|
| Stitch gagal connect | `gcloud auth application-default login` |
| Nano Banana gagal generate | Cek Gemini API key di aistudio.google.com |
| 21st.dev Magic tidak respond | Cek API key di https://21st.dev/magic/console |
| UI UX Pro Max tidak aktif | Pastikan skill terinstall: `uipro init --ai claude` di folder project |
| MCP disconnected | `claude mcp list` untuk cek status |
| 3D viewer blank/error | `cd 3d/3dproductvisualization && npm run dev`, cek console |

---

## STATUS

```
stitch        ✓ Connected  — Google Stitch MCP
magic         ✓ Connected  — 21st.dev Magic MCP
nano-banana   ✓ Connected  — Gemini Image Generation
ui-ux-pro-max ✓ Installed  — Design Intelligence Skill
```
