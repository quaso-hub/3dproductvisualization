/**
 * ViewerControls.tsx
 * ─────────────────────────────────────────────────────────────
 * Reusable control bar untuk semua 3D viewer.
 *
 * Props:
 *   presets       — daftar CameraPreset dari product
 *   activePreset  — nama preset yang sedang aktif
 *   onPreset      — callback ketika tombol preset diklik
 *   onDownload    — callback unduh sudut kamera saat ini
 *   onDownloadAll — callback unduh semua sudut kamera
 * ─────────────────────────────────────────────────────────────
 */

import { Camera, Images } from 'lucide-react';
import type { CameraPreset } from '../data/products';

interface Props {
  presets: CameraPreset[];
  activePreset: string | null;
  onPreset: (preset: CameraPreset) => void;
  onDownload: (name: string) => void;
  onDownloadAll: () => void;
}

export function ViewerControls({ presets, activePreset, onPreset, onDownload, onDownloadAll }: Props) {
  return (
    <div className="bg-white/98 px-3 py-1.5 border-b border-gray-100 flex flex-wrap gap-x-3 gap-y-1.5 items-center justify-between flex-shrink-0">

      {/* Camera preset buttons */}
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mr-1">Sudut:</span>
        {presets.map((p) => {
          const isActive = p.name === activePreset;
          return (
            <button
              key={p.name}
              onClick={() => onPreset(p)}
              className={[
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600',
              ].join(' ')}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Download buttons */}
      <div className="flex gap-1.5 items-center">
        <button
          onClick={onDownloadAll}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 rounded-md transition cursor-pointer"
        >
          <Images className="h-3.5 w-3.5" />
          Semua Sudut
        </button>
        <button
          onClick={() => onDownload('current')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200 bg-white hover:border-blue-300 hover:text-blue-600 rounded-md transition cursor-pointer"
        >
          <Camera className="h-3.5 w-3.5" />
          Unduh
        </button>
      </div>

      {/* Hint */}
      <p className="w-full text-[10px] text-gray-400">
        Drag: putar &middot; Scroll: zoom &middot; Klik kanan: geser
      </p>
    </div>
  );
}
