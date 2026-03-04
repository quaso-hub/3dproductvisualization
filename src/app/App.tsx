import React from 'react';
import { WallPanelViewer } from './components/WallPanelViewer';

export default function App() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #07101C 0%, #0A1628 50%, #070F1C 100%)',
      }}
    >
      {/* Header */}
      <header className="border-b border-blue-900/40 bg-black/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-400 to-blue-700" />
              <h1 className="text-2xl font-black tracking-wide text-white">
                WALL PANEL <span className="text-blue-400">ELEMENT</span>
              </h1>
            </div>
            <p className="text-gray-500 text-sm ml-4">
              PIR Sandwich Panel — Produk Visualisasi 3D Interaktif
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            {['Anti Korosi', 'Anti Jamur', 'Tahan Api', 'Anti Bacterial'].map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full border border-blue-800/60 text-blue-400/80 bg-blue-950/40"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Title section */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <h2 className="text-gray-200 text-lg font-semibold">
                Visualisasi Produk 3D
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Lihat struktur lapisan panel, tampilan assembled, dan contoh implementasi pemasangan
              </p>
            </div>
          </div>
        </div>

        {/* 3D Viewer */}
        <div className="rounded-2xl overflow-hidden border border-blue-900/30 bg-black/20 p-5 shadow-2xl">
          <WallPanelViewer />
        </div>

        {/* Spec Cards */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Dimensi Panel', val: '1200 × 3000 mm', icon: '⬜', color: '#5090C8' },
            { label: 'Ketebalan Core', val: '50 / 75 / 100 mm', icon: '▣', color: '#C8A830' },
            { label: 'Face Sheet', val: 'Baja AZ100 (100gr/m²)', icon: '◩', color: '#88AACA' },
            { label: 'Proteksi Radiasi', val: 'Timbal 2 mm (Opsional)', icon: '◎', color: '#608898' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border p-4"
              style={{
                backgroundColor: `${item.color}0D`,
                borderColor: `${item.color}28`,
              }}
            >
              <div className="text-2xl mb-2" style={{ color: item.color }}>{item.icon}</div>
              <div className="text-gray-500 text-xs mb-1">{item.label}</div>
              <div className="text-gray-100 text-sm font-semibold leading-tight">{item.val}</div>
            </div>
          ))}
        </div>

        {/* Feature List */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/30 p-5">
            <h3 className="text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
              <span className="text-blue-400">◈</span> Komposisi Lapisan
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Face Sheet Baja AZ100 (Luar)', thk: '0.5 mm', color: '#BAC8D8' },
                { name: 'Coating HRP Anti-bacterial', thk: '<0.1 mm', color: '#C8AADE' },
                { name: 'Lapisan Timbal (Pb)', thk: '2 mm ★', color: '#6E8898' },
                { name: 'Core PIR (Polyisocyanurate)', thk: '50/75/100 mm', color: '#E8D845' },
                { name: 'Face Sheet Baja AZ100 (Dalam)', thk: '0.5 mm', color: '#BAC8D8' },
              ].map((l) => (
                <div key={l.name} className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="text-gray-400 text-xs flex-1">{l.name}</span>
                  <span className="text-gray-600 text-xs font-mono">{l.thk}</span>
                </div>
              ))}
              <div className="text-xs text-amber-600/70 mt-1.5">★ Opsional (untuk ruang radiologi)</div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800/60 bg-gray-900/30 p-5">
            <h3 className="text-gray-300 text-sm font-bold mb-3 flex items-center gap-2">
              <span className="text-blue-400">⊞</span> Keunggulan Produk
            </h3>
            <div className="space-y-2">
              {[
                { feat: 'Anti Korosi & Tahan Karat', note: 'AZ100 Steel dari Blue Scope' },
                { feat: 'Anti Bacterial (HRP Coating)', note: 'Sesuai standar Permenkes' },
                { feat: 'Insulasi Termal Superior', note: 'Core PIR dengan nilai R tinggi' },
                { feat: 'Ketahanan Api', note: 'Polyisocyanurate fire resistance' },
                { feat: 'Proteksi Radiasi', note: 'Lapisan timbal 2mm (opsional)' },
                { feat: 'Anti Jamur', note: 'Cocok untuk ruang steril/RS' },
              ].map((f) => (
                <div key={f.feat} className="flex items-start gap-2.5">
                  <span className="text-blue-500 text-xs mt-0.5 flex-shrink-0">✓</span>
                  <div>
                    <span className="text-gray-300 text-xs font-semibold">{f.feat}</span>
                    <span className="text-gray-600 text-xs"> — {f.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-gray-900/80 py-4 text-center">
        <p className="text-gray-700 text-xs">
          Wall Panel Element · PIR Sandwich Panel · Blue Scope AZ100 · HRP Anti-bacterial
        </p>
      </footer>
    </div>
  );
}
