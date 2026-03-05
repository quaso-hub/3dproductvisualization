/**
 * ViewerControls.tsx
 * ─────────────────────────────────────────────────────────────
 * Reusable control bar untuk semua 3D viewer.
 * Dipakai oleh: AssembledPanel3D, ExplodedPanel3D,
 *               CurvingAssembled3D, CurvingExploded3D
 *
 * Props:
 *   presets      — daftar CameraPreset dari product
 *   onPreset     — callback ketika tombol preset diklik
 *   onDownload   — callback unduh sudut kamera saat ini
 *   onDownloadAll — callback unduh semua sudut kamera
 * ─────────────────────────────────────────────────────────────
 */

import type { CameraPreset } from '../data/products';

interface Props {
  presets: CameraPreset[];
  onPreset: (preset: CameraPreset) => void;
  onDownload: (name: string) => void;
  onDownloadAll: () => void;
}

export function ViewerControls({ presets, onPreset, onDownload, onDownloadAll }: Props) {
  return (
    <div className="bg-white/95 px-3 py-2 border-b border-gray-100 flex flex-wrap gap-2 items-center justify-between flex-shrink-0">
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs font-semibold text-gray-500 mr-1">Sudut Kamera:</span>
        {presets.map((p) => (
          <button
            key={p.name}
            onClick={() => onPreset(p)}
            className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={onDownloadAll}
          className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition"
        >
          📥 Semua Sudut
        </button>
        <button
          onClick={() => onDownload('current')}
          className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition"
        >
          📷 Unduh
        </button>
      </div>

      <p className="w-full text-[11px] text-gray-400 mt-0.5">
        🖱️ Drag putar · Scroll zoom · Klik kanan geser
      </p>
    </div>
  );
}
