/**
 * ViewerControls.tsx - MONO Theme
 * ------------------------------─
 * Reusable control bar untuk semua 3D viewer.
 * 
 * MONO STYLE:
 * - Zero border radius
 * - Monospace typography
 * - Black & white palette
 * ------------------------------─
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
    <div 
      className="bg-background border-b border-border px-3 py-2 flex flex-wrap gap-x-3 gap-y-2 items-center justify-between flex-shrink-0"
      role="toolbar"
      aria-label="Camera controls"
    >

      {/* Camera preset buttons */}
      <div className="flex flex-wrap gap-0 items-center">
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mr-2">
          SUDUT:
        </span>
        {presets.map((p) => {
          const isActive = p.name === activePreset;
          return (
            <button
              key={p.name}
              onClick={() => onPreset(p)}
              className={[
                'px-3 py-1.5 text-[10px] font-semibold transition tracking-wide',
                isActive
                  ? 'bg-foreground text-background'
                  : 'bg-background text-muted-foreground border border-border hover:bg-accent hover:text-foreground',
              ].join(' ')}
              style={{ borderRadius: 0 }}
              aria-pressed={isActive}
              aria-label={`Camera angle: ${p.name}`}
            >
              {p.name.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Download buttons */}
      <div className="flex gap-0 items-center">
        <button
          onClick={onDownloadAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-foreground border border-border hover:bg-accent transition tracking-wide"
          style={{ borderRadius: 0 }}
          aria-label="Download all camera angles"
        >
          <Images className="h-3 w-3" />
          SEMUA SUDUT
        </button>
        <button
          onClick={() => onDownload('current')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-foreground border border-border border-l-0 hover:bg-accent transition tracking-wide"
          style={{ borderRadius: 0 }}
          aria-label="Download current view as PNG"
        >
          <Camera className="h-3 w-3" />
          UNDUH
        </button>
      </div>

      {/* Hint */}
      <p className="w-full text-[9px] text-muted-foreground tracking-wide">
        DRAG: PUTAR • SCROLL: ZOOM • KLIK KANAN: GESER
      </p>
    </div>
  );
}
