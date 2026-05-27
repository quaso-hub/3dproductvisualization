/**
 * HvacUIOverlay.tsx
 * ------------------------------─
 * V5 UI Overlay for HVAC BIM Viewer.
 * Dark theme, 6 collapsible mode buttons, info panel on click,
 * color legend, camera presets, loading screen.
 * ------------------------------─
 */

'use client';

import { useState, useCallback } from 'react';
import type { Product, HVACModeKey, HVACComponent } from '../data/products';

/* - Props ------------------------- */

interface Props {
  product: Product;
  activeMode: HVACModeKey;
  isLoading: boolean;
  loadingProgress: number;
  selectedComponent: HVACComponent | null;
  onModeChange: (mode: HVACModeKey) => void;
  onPreset: (preset: { position: [number, number, number]; target: [number, number, number] }) => void;
  onDownload: () => void;
  onCloseInfo: () => void;
}

/* - Mode Config ---------------------- */

const MODE_CONFIG: Record<HVACModeKey, {
  label: string;
  icon: string;
  description: string;
  activeColor: string;
  activeBg: string;
  activeText: string;
  activeBorder: string;
}> = {
  'full-system': {
    label: 'Full System',
    icon: '🏥',
    description: 'Semua subsistem terintegrasi',
    activeColor: 'text-sky-400',
    activeBg: 'bg-sky-500/20',
    activeText: 'text-sky-100',
    activeBorder: 'border-sky-400',
  },
  'supply-air': {
    label: 'Supply Air',
    icon: '❄️',
    description: 'AHU → LAF → OR Room (udara bersih)',
    activeColor: 'text-cyan-400',
    activeBg: 'bg-cyan-500/20',
    activeText: 'text-cyan-100',
    activeBorder: 'border-cyan-400',
  },
  'return-air': {
    label: 'Return Air',
    icon: '🔄',
    description: 'Low-wall grilles → AHU (recirkulasi)',
    activeColor: 'text-rose-400',
    activeBg: 'bg-rose-500/20',
    activeText: 'text-rose-100',
    activeBorder: 'border-rose-400',
  },
  'refrigerant': {
    label: 'Refrigerant',
    icon: '🌡️',
    description: 'CDU ↔ AHU Cooling Coil (R-410A)',
    activeColor: 'text-amber-400',
    activeBg: 'bg-amber-500/20',
    activeText: 'text-amber-100',
    activeBorder: 'border-amber-400',
  },
  'floor-plan': {
    label: 'Floor Plan',
    icon: '📐',
    description: 'Top-down BIM view (denah)',
    activeColor: 'text-slate-300',
    activeBg: 'bg-slate-500/20',
    activeText: 'text-slate-100',
    activeBorder: 'border-slate-400',
  },
  'exploded': {
    label: 'Exploded',
    icon: '💥',
    description: 'Semua layer dipisah vertikal',
    activeColor: 'text-emerald-400',
    activeBg: 'bg-emerald-500/20',
    activeText: 'text-emerald-100',
    activeBorder: 'border-emerald-400',
  },
};

const LEGEND_ITEMS = [
  { color: 'bg-cyan-400', label: 'Supply Air' },
  { color: 'bg-rose-300', label: 'Return Air' },
  { color: 'bg-amber-400', label: 'Refrigerant' },
  { color: 'bg-teal-400', label: 'Fresh Air OAI' },
  { color: 'bg-orange-400', label: 'AGSS Exhaust' },
  { color: 'bg-slate-400', label: 'AHU / CDU' },
  { color: 'bg-yellow-200', label: 'HEPA H14 Filter' },
];

/* - Main Component --------------------─ */

export function HvacUIOverlay({
  product,
  activeMode,
  isLoading,
  loadingProgress,
  selectedComponent,
  onModeChange,
  onPreset,
  onDownload,
  onCloseInfo,
}: Props) {
  const [showLegend, setShowLegend] = useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  const currentModeConfig = MODE_CONFIG[activeMode];

  if (isLoading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <>
      {/* - Top Bar -------------------─ */}
      <TopBar product={product} onExport={onDownload} />

      {/* - Left Mode Selector -------------- */}
      <ModeSelector
        activeMode={activeMode}
        onModeChange={onModeChange}
        isCollapsed={isPanelCollapsed}
        onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
      />

      {/* - Right Info Panel --------------- */}
      {selectedComponent && (
        <InfoPanel component={selectedComponent} onClose={onCloseInfo} />
      )}

      {/* - Bottom Bar ------------------ */}
      <BottomBar
        product={product}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend(!showLegend)}
        onPreset={onPreset}
        currentModeConfig={currentModeConfig}
      />

      {/* - Mode Tooltip -----------------─ */}
      <ModeTooltip mode={activeMode} config={currentModeConfig} />
    </>
  );
}

/* - Sub-Components --------------------─ */

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full px-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
          <span className="text-3xl">🏥</span>
        </div>

        <div className="text-center">
          <p className="text-white font-semibold text-base">HVAC BIM System</p>
          <p className="text-slate-400 text-xs mt-0.5">Modular Operating Theatre</p>
        </div>

        <div className="w-full">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Loading components...</span>
            <span className="font-mono text-cyan-400">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="text-slate-600 text-xs text-center">
          Memuat AHU, ducting, piping, dan komponen MEP...
        </p>
      </div>
    </div>
  );
}

function TopBar({ product, onExport }: { product: Product; onExport: () => void }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 px-4 py-2.5
                    bg-gradient-to-b from-slate-950/80 to-transparent
                    flex items-center justify-between pointer-events-none">
      <div className="flex items-center gap-2.5">
        <span className="bg-sky-600/90 text-white text-xs font-bold px-2 py-0.5 rounded-md
                         backdrop-blur-sm pointer-events-auto">
          ELFATECH
        </span>
        <div>
          <p className="text-white text-sm font-semibold leading-none">{product.name}</p>
          <p className="text-slate-400 text-xs mt-0.5 leading-none">
            ASHRAE 170:2021 · HEPA H14 · {product.hvacSpecs?.airChanges ?? '20 ACH'}
          </p>
        </div>
      </div>

      <button
        onClick={onExport}
        className="pointer-events-auto bg-slate-800/80 hover:bg-slate-700/80
                   text-slate-300 hover:text-white text-xs px-3 py-1.5 rounded-lg
                   border border-slate-700 backdrop-blur-sm transition-all"
      >
        Export PNG
      </button>
    </div>
  );
}

function ModeSelector({
  activeMode,
  onModeChange,
  isCollapsed,
  onToggleCollapse,
}: {
  activeMode: HVACModeKey;
  onModeChange: (mode: HVACModeKey) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
      <button
        onClick={onToggleCollapse}
        className="bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white
                   rounded-lg p-1.5 text-xs backdrop-blur-sm self-end transition-all mb-1"
        title={isCollapsed ? 'Show modes' : 'Hide modes'}
      >
        {isCollapsed ? '▶' : '◀'}
      </button>

      {!isCollapsed && (Object.entries(MODE_CONFIG) as [HVACModeKey, (typeof MODE_CONFIG)[HVACModeKey]][]).map(([key, config]) => {
        const isActive = activeMode === key;
        return (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            title={config.description}
            className={`
              flex items-center gap-2.5 pl-2.5 pr-3 py-2 rounded-xl
              border backdrop-blur-sm text-left transition-all duration-200
              ${isActive
                ? `${config.activeBg} ${config.activeBorder} ${config.activeText} shadow-lg scale-105`
                : 'bg-slate-900/75 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800/80'
              }
            `}
          >
            <span className="text-base leading-none w-5 text-center flex-shrink-0">{config.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-none whitespace-nowrap">{config.label}</p>
              {isActive && (
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none whitespace-nowrap">Active</p>
              )}
            </div>
            {isActive && (
              <span className={`ml-auto w-1.5 h-1.5 rounded-full ${config.activeColor.replace('text-', 'bg-')} flex-shrink-0`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function InfoPanel({ component, onClose }: { component: HVACComponent; onClose: () => void }) {
  return (
    <div className="absolute right-3 top-16 z-20 w-64
                    bg-slate-900/90 border border-slate-700 rounded-xl
                    backdrop-blur-sm overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-3 py-2.5
                      bg-slate-800/80 border-b border-slate-700">
        <div>
          <p className="text-white text-xs font-semibold">{component.label}</p>
          <p className="text-slate-400 text-[10px] mt-0.5 font-mono">{component.id}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white text-xs p-1 rounded transition-all"
        >
          ✕
        </button>
      </div>

      {component.specs && Object.entries(component.specs).length > 0 && (
        <div className="p-3 space-y-1.5">
          {Object.entries(component.specs).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2 text-xs">
              <span className="text-slate-500 flex-shrink-0">{key}</span>
              <span className="text-slate-200 text-right font-mono text-[11px]">{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="px-3 pb-3">
        <p className="text-slate-600 text-[10px]">
          Visible in: {component.visibleInModes.join(', ')}
        </p>
      </div>
    </div>
  );
}

function BottomBar({
  product,
  showLegend,
  onToggleLegend,
  onPreset,
  currentModeConfig,
}: {
  product: Product;
  showLegend: boolean;
  onToggleLegend: () => void;
  onPreset: (preset: { position: [number, number, number]; target: [number, number, number] }) => void;
  currentModeConfig: (typeof MODE_CONFIG)[HVACModeKey];
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20
                    bg-gradient-to-t from-slate-950/85 to-transparent
                    px-4 pb-4 pt-8 pointer-events-none">
      <div className="flex items-end justify-between gap-4">
        {/* Legend */}
        <div className="pointer-events-auto">
          <button
            onClick={onToggleLegend}
            className="text-slate-500 hover:text-slate-300 text-[10px] mb-1.5
                       flex items-center gap-1 transition-colors"
          >
            {showLegend ? '▼' : '▶'} Legend
          </button>

          {showLegend && (
            <div className="flex flex-col gap-1 bg-slate-900/80 border border-slate-800
                            rounded-xl p-2.5 backdrop-blur-sm">
              {LEGEND_ITEMS.map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-2 rounded-sm ${color} flex-shrink-0`} />
                  <span className="text-[10px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center: mode description */}
        <div className="pointer-events-none text-center flex-1">
          <p className={`text-xs font-semibold ${currentModeConfig.activeColor}`}>
            {currentModeConfig.icon} {currentModeConfig.label}
          </p>
          <p className="text-slate-500 text-[10px] mt-0.5">{currentModeConfig.description}</p>
        </div>

        {/* Camera presets */}
        <div className="pointer-events-auto flex flex-col gap-1 items-end">
          <p className="text-slate-600 text-[10px] mb-0.5">Camera</p>
          {(product.cameraPresets ?? []).map((preset) => (
            <button
              key={preset.name}
              onClick={() => onPreset(preset)}
              className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700
                         hover:border-slate-600 text-slate-400 hover:text-white
                         text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-sm
                         transition-all whitespace-nowrap"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModeTooltip({
  mode,
  config,
}: {
  mode: HVACModeKey;
  config: (typeof MODE_CONFIG)[HVACModeKey];
}) {
  return (
    <div
      key={mode}
      className={`
        absolute top-16 left-1/2 -translate-x-1/2 z-30
        ${config.activeBg} ${config.activeBorder} border
        text-xs px-4 py-2 rounded-full backdrop-blur-sm
        ${config.activeText}
        pointer-events-none
      `}
      style={{ animation: 'fadeInOut 2.5s ease forwards' }}
    >
      {config.icon} {config.label} - {config.description}
    </div>
  );
}
