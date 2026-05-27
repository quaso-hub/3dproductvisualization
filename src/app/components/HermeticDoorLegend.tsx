/**
 * HermeticDoorLegend.tsx - Material Layer Legend (MONO Theme)
 * ------------------------------─
 * Displays the material layers and construction of hermetic door.
 * 
 * MONO STYLE:
 * - Zero border radius
 * - Monospace typography  
 * - Monochrome accent colors
 * ------------------------------─
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
    { name: 'PIR Foam Core', color: '#d4d8dc', thickness: '45mm' },
    { name: 'Timbal (Pb) 2mm', color: '#8a9198', thickness: '2mm' },
    { name: 'PIR Foam Core', color: '#d4d8dc', thickness: '45mm' },
    { name: 'Stainless Steel Face (Dalam)', color: '#c8d4dc', thickness: '0.8mm' },
    { name: 'Kaca Pb (Lead Glass 5mm)', color: '#a8b4bc', thickness: '5mm' },
  ];

  const displayLayers = layers || defaultLayers;

  return (
    <div 
      className="w-full border border-border bg-background p-4"
      style={{ borderRadius: 0 }}
      role="region"
      aria-label="Material layers legend"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-4 w-4 text-foreground" aria-hidden="true" />
        <h3 className="text-xs font-semibold text-foreground tracking-wide">
          MATERIAL LAYERS CONSTRUCTION
        </h3>
      </div>

      {/* Layers Grid */}
      <div className="space-y-1 mb-3">
        {displayLayers.map((layer, index) => (
          <div 
            key={index} 
            className="flex items-center gap-3 p-2 bg-muted/30 border-l-2 border-foreground"
            style={{ borderRadius: 0 }}
          >
            {/* Color Swatch */}
            <div
              className="h-6 w-6 border border-border flex-shrink-0"
              style={{ backgroundColor: layer.color, borderRadius: 0 }}
              title={layer.color}
              aria-label={`${layer.name} color swatch`}
            />
            {/* Layer Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">
                {layer.name}
              </p>
              <p className="text-[10px] text-muted-foreground tracking-wide">
                {layer.thickness}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Color Bar */}
      <div 
        className="flex h-8 w-full border border-border overflow-hidden"
        style={{ borderRadius: 0 }}
        role="img"
        aria-label="Layer color bar showing all materials"
      >
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
      <p className="text-[10px] text-muted-foreground mt-3 tracking-wide">
        TOTAL THICKNESS: ~{calculateTotalThickness(displayLayers)}mm
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
