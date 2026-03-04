
# 3D Product Visualization — Panel Dinding Sandwich

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
  