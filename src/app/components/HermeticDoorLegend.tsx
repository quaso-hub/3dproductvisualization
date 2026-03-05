/**
 * HermeticDoorLegend.tsx — Material Layer Legend
 * ─────────────────────────────────────────────────────────────
 * Displays the material layers and construction of hermetic door
 * with color swatches. Appears below the 3D viewer.
 */

import * as React from 'react';
import { Layers } from 'lucide-react';

interface MaterialLayer {
  name: string;
  color: string;
  thickness: string;
}

interface HermeticDoorLegendProps {
  layers?: MaterialLayer[];
}

export function HermeticDoorLegend({ layers }: HermeticDoorLegendProps) {
  const defaultLayers: MaterialLayer[] = [
    { name: 'Stainless Steel Face (Luar)', color: '#c8d4dc', thickness: '0.8mm' },
    { name: 'PIR Foam Core', color: '#e8c870', thickness: '45mm' },
    { name: 'Timbal (Pb) 2mm', color: '#8a9198', thickness: '2mm' },
    { name: 'PIR Foam Core', color: '#e8c870', thickness: '45mm' },
    { name: 'Stainless Steel Face (Dalam)', color: '#c8d4dc', thickness: '0.8mm' },
    { name: 'Kaca Pb (Lead Glass 5mm)', color: '#88c4d8', thickness: '5mm' },
  ];

  const displayLayers = layers || defaultLayers;

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-4 w-4 text-gray-700" />
        <h3 className="text-sm font-semibold text-gray-700">Material Layers Construction</h3>
      </div>

      {/* Layers Grid */}
      <div className="space-y-2 mb-3">
        {displayLayers.map((layer, index) => (
          <div key={index} className="flex items-center gap-3 p-2 rounded bg-gray-50">
            {/* Color Swatch */}
            <div
              className="h-6 w-6 rounded border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: layer.color }}
              title={layer.color}
            />
            {/* Layer Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{layer.name}</p>
              <p className="text-xs text-gray-500">{layer.thickness}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Color Bar */}
      <div className="flex h-8 w-full rounded border border-gray-200 overflow-hidden">
        {displayLayers.map((layer, index) => (
          <div
            key={index}
            className="flex-1"
            style={{ backgroundColor: layer.color }}
            title={`${layer.name} - ${layer.thickness}`}
          />
        ))}
      </div>

      {/* Total Thickness Summary */}
      <p className="text-xs text-gray-600 mt-2">
        Total Thickness: ~{calculateTotalThickness(displayLayers)}mm
      </p>
    </div>
  );
}

function calculateTotalThickness(layers: MaterialLayer[]): number {
  return layers.reduce((sum, layer) => {
    const thickness = parseFloat(layer.thickness);
    return sum + (isNaN(thickness) ? 0 : thickness);
  }, 0);
}
