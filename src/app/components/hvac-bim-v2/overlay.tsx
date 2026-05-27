/**
 * HvacBimV2Overlay — Mobile-First Rebuild (Session 7, 2026-05-19)
 * ─────────────────────────────────────────────────────────────────
 * Mobile (<640px):
 *   - Top bar: scenario chips horizontal-scroll
 *   - Mode tabs: horizontal-scroll above bottom sheet (always visible)
 *   - MobileBottomSheet 3-snap (peek/half/full):
 *       peek = 1-row KPI compact + status dot
 *       half = mode summary + KPI grid + subsystem chips
 *       full = full inspector (compliance gate, pressure ladder, focus detail, assumptions)
 *
 * Desktop (>=640px):
 *   - Top-left: scenario selector (compact)
 *   - Top-center: mode tab strip
 *   - Top-right: KPI strip
 *   - Right rail: status board + inspector tabs (Summary/Focused/Assumptions)
 *   - Bottom-left: legend + focus pins
 *   - Bottom-right: trust banner toggle
 *
 * Mode buttons di komponen induk (HvacSystemBIM3D) DIHAPUS — overlay
 * ini sekarang owner satu-satunya untuk mode + scenario controls.
 * ─────────────────────────────────────────────────────────────────
 */
import { useEffect, useMemo, useState } from 'react';
import { MobileBottomSheet, useIsMobile, type SheetSnap } from '../ui/MobileBottomSheet';
import { LEGEND_ITEMS, MODE_META, MODE_ORDER, FOCUS_PICKER_ITEMS } from './data';
import { SCENARIO_META, SCENARIO_ORDER } from './contract';
import type {
  CollapsedSections,
  FocusTargetId,
  HvacBoardCard,
  HvacEngineeringState,
  HvacViewMode,
  HvacScenario,
  MetricStatus,
  ProvenanceSource,
} from './types';

type OverlayTab = 'summary' | 'focused' | 'assumptions';

interface Props {
  engineeringState: HvacEngineeringState;
  hoveredFocus: FocusTargetId | null;
  selectedFocus: FocusTargetId | null;
  onSelectFocus: (focusTarget: FocusTargetId | null) => void;
  /** NEW: mode + scenario state owned by overlay */
  mode: HvacViewMode;
  scenario: HvacScenario;
  onModeChange: (mode: HvacViewMode) => void;
  onScenarioChange: (scenario: HvacScenario) => void;
}

const PRIMARY_KPI_IDS = ['ach', 'pressure-or-pa', 'supply-cfm', 'alarm-class'];

export function HvacBimV2Overlay({
  engineeringState,
  hoveredFocus,
  selectedFocus,
  onSelectFocus,
  mode,
  scenario,
  onModeChange,
  onScenarioChange,
}: Props) {
  const isMobile = useIsMobile();
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');
  const [activeTab, setActiveTab] = useState<OverlayTab>('summary');
  const [trustDismissed, setTrustDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState<CollapsedSections>({
    kpiBoard: true,
    pressureLadder: false,
    scenarioSequence: false,
  });
  const focusDetail = engineeringState.focusDetail;

  // auto-snap to half + switch to focused tab when user picks a focus target
  useEffect(() => {
    if (selectedFocus || hoveredFocus) {
      setActiveTab('focused');
      if (isMobile && sheetSnap === 'peek') setSheetSnap('half');
    }
  }, [hoveredFocus, selectedFocus, isMobile, sheetSnap]);

  const toggle = (key: keyof CollapsedSections) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const primaryCards = useMemo(
    () => engineeringState.boardCards.filter((c) => PRIMARY_KPI_IDS.includes(c.id)),
    [engineeringState.boardCards],
  );
  const allCards = engineeringState.boardCards;

  // ── shared sub-renders (used by both mobile + desktop) ─────────
  const KpiPills = (
    <div className="flex flex-wrap items-center gap-1">
      {primaryCards.map((card) => (
        <span
          key={card.id}
          className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-semibold ${cardToneClass(card.status)}`}
          style={{ borderRadius: 0 }}
        >
          <span className="uppercase tracking-wider">{card.label}</span>
          <span className="font-bold">{card.value}</span>
          {card.target && card.target !== card.value && (
            <span className="font-normal opacity-60">/{card.target}</span>
          )}
        </span>
      ))}
    </div>
  );

  const StatusBoard = (
    <section className="border border-border bg-background/95 p-2" style={{ borderRadius: 0 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {engineeringState.modeMeta.label} / {engineeringState.scenarioMeta.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-slate-600">{engineeringState.narrative}</p>
        </div>
        <span
          className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold ${engineeringState.scenarioMeta.toneClass}`}
          style={{ borderRadius: 0 }}
        >
          {engineeringState.scenarioMeta.label}
        </span>
      </div>

      <div className="mt-1.5">
        {collapsed.kpiBoard ? (
          <div className="flex flex-wrap items-center gap-1">
            {primaryCards.map((card) => (
              <span
                key={card.id}
                className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-semibold ${cardToneClass(card.status)}`}
                style={{ borderRadius: 0 }}
              >
                <span className="uppercase tracking-wider">{card.label}</span>
                <span className="font-bold">{card.value}</span>
                {card.target && card.target !== card.value && (
                  <span className="font-normal text-slate-400">/{card.target}</span>
                )}
                <ProvenanceBadge source={card.source} />
              </span>
            ))}
            <button
              type="button"
              onClick={() => toggle('kpiBoard')}
              className="border border-slate-300 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 transition hover:bg-slate-50"
              style={{ borderRadius: 0 }}
            >
              +{allCards.length - primaryCards.length}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1">
              {allCards.map((card) => (
                <div
                  key={card.id}
                  className={`border p-1.5 ${cardToneClass(card.status)}`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wider">{card.label}</span>
                    <StatusDot status={card.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] font-bold leading-none">{card.value}</p>
                  {card.target && card.target !== card.value && (
                    <p className="text-[8px] text-slate-400">target: {card.target}</p>
                  )}
                  <ProvenanceBadge source={card.source} className="mt-0.5" />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => toggle('kpiBoard')}
              className="mt-1 w-full border border-slate-200 py-0.5 text-center text-[9px] font-medium text-slate-500 transition hover:bg-slate-50"
              style={{ borderRadius: 0 }}
            >
              Collapse
            </button>
          </>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1" data-testid="hvac-subsystem-strip">
        {engineeringState.subsystemStates.map((subsystem) => {
          const isAgss = subsystem.id === 'agss-exhaust';
          const isFault = engineeringState.scenario === 'fault';
          return (
            <button
              key={subsystem.id}
              type="button"
              data-testid={`hvac-subsystem-${subsystem.id}`}
              onClick={() => onSelectFocus(subsystem.focusTarget)}
              className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-medium transition hover:brightness-95 ${subsystemToneClass(subsystem.status)} ${isAgss ? 'ring-1 ring-orange-400' : ''}`}
              style={{ borderRadius: 0 }}
            >
              {isAgss && <span className="text-[8px]">&#9763;</span>}
              <StatusDot status={subsystem.status} />
              {subsystem.label}
              {isAgss && <span className="text-[7px] font-bold uppercase tracking-wide text-orange-600">SAFETY</span>}
              {isAgss && isFault && <span className="text-[7px] font-bold text-emerald-600">OK</span>}
            </button>
          );
        })}
      </div>
    </section>
  );

  const InspectorTabs = (
    <div className="flex flex-col">
      <div className="grid grid-cols-3 gap-0.5 bg-slate-100 p-0.5">
        <TabButton
          active={activeTab === 'summary'}
          label="Summary"
          testId="hvac-tab-summary"
          onClick={() => setActiveTab('summary')}
        />
        <TabButton
          active={activeTab === 'focused'}
          label="Focused"
          testId="hvac-tab-focused"
          onClick={() => setActiveTab('focused')}
        />
        <TabButton
          active={activeTab === 'assumptions'}
          label="Assumptions"
          testId="hvac-tab-assumptions"
          onClick={() => setActiveTab('assumptions')}
        />
      </div>

      <div className="mt-2 space-y-2">
        {activeTab === 'summary' && (
          <>
            <div
              className={`border p-2 ${gateToneClass(engineeringState.complianceGate.overallStatus)}`}
              style={{ borderRadius: 0 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide">Compliance Gate</span>
                <StatusDot status={engineeringState.complianceGate.overallStatus} />
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-center">
                <GateCol pass={engineeringState.complianceGate.passCount > 0} label="ACH" />
                <GateCol pass={engineeringState.complianceGate.failCount === 0} label="Pressure" />
                <GateCol pass={engineeringState.complianceGate.warnCount === 0} label="Temp" />
              </div>
            </div>

            <div className="border border-slate-200 p-2" style={{ borderRadius: 0 }}>
              <button
                type="button"
                onClick={() => toggle('pressureLadder')}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Pressure Ladder</span>
                <span className="text-[9px] text-slate-400">{collapsed.pressureLadder ? 'Show' : 'Hide'}</span>
              </button>
              {!collapsed.pressureLadder && (
                <div className="mt-1.5 space-y-0.5">
                  {engineeringState.pressureLadder.map((row) => {
                    const num = parseFloat(row.actual);
                    const sign = !isNaN(num) && num > 0 ? '+' : '';
                    return (
                      <div key={row.id} className="flex items-center justify-between text-[9px]">
                        <span className="text-slate-600">{row.label}</span>
                        <span className={`font-mono font-bold ${num > 0 ? 'text-emerald-600' : num < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                          {sign}{row.actual}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'focused' && focusDetail && (
          <>
            <div className="border border-slate-200 p-2" style={{ borderRadius: 0 }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{focusDetail.code}</p>
              <p className="mt-0.5 text-[11px] font-bold text-slate-800">{focusDetail.title}</p>
              <p className="mt-1 text-[9px] leading-tight text-slate-600">{focusDetail.summary}</p>
            </div>
            {focusDetail.evidenceRows && focusDetail.evidenceRows.length > 0 && (
              <div className="space-y-1">
                {focusDetail.evidenceRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between border border-slate-200 px-2 py-1">
                    <span className="text-[9px] text-slate-600">{row.label}</span>
                    <span className="text-[10px] font-bold text-slate-800">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'assumptions' && (
          <div className="space-y-1">
            {engineeringState.assumptions.map((assumption) => (
              <div key={assumption.id} className="flex items-start gap-1.5 border border-slate-200 p-1.5">
                <span
                  className={`shrink-0 text-[9px] ${
                    assumption.confidence === 'high'
                      ? 'text-emerald-500'
                      : assumption.confidence === 'medium'
                        ? 'text-amber-500'
                        : 'text-slate-400'
                  }`}
                >
                  {assumption.confidence === 'high' ? 'High' : assumption.confidence === 'medium' ? 'Med' : 'Low'}
                </span>
                <p className="text-[9px] leading-tight text-slate-600">{assumption.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── MOBILE TOP CONTROLS ─────────────────────────────────────
  const MobileTopControls = (
    <div className="sm:hidden absolute inset-x-0 top-0 z-30 flex flex-col gap-1 border-b border-border bg-background/95 backdrop-blur-sm">
      {/* Scenario chip strip */}
      <div
        className="flex items-center gap-1 overflow-x-auto px-2 pt-2 pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-slate-500">State</span>
        {SCENARIO_ORDER.map((scenarioKey) => {
          const active = scenario === scenarioKey;
          const meta = SCENARIO_META[scenarioKey];
          return (
            <button
              key={scenarioKey}
              type="button"
              onClick={() => onScenarioChange(scenarioKey)}
              className={`shrink-0 border px-2 py-1 text-[9px] font-semibold transition ${active ? meta.toneClass : 'border-slate-300 bg-white text-slate-600'}`}
              style={{ borderRadius: 0 }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
      {/* Mode tab strip */}
      <div
        className="flex items-center gap-1 overflow-x-auto px-2 pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-slate-500">View</span>
        {MODE_ORDER.map((modeKey) => {
          const meta = MODE_META[modeKey];
          const active = mode === modeKey;
          return (
            <button
              key={modeKey}
              type="button"
              onClick={() => onModeChange(modeKey)}
              className={`shrink-0 border px-2 py-1 text-[10px] font-medium transition ${active ? `${meta.toneClass} border-transparent` : 'border-slate-300 bg-white text-slate-700'}`}
              style={{ borderRadius: 0 }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const MobilePeek = (
    <div className="flex items-center justify-between gap-2 pb-2">
      <div className="flex flex-wrap items-center gap-1">
        {primaryCards.slice(0, 3).map((card) => (
          <span
            key={card.id}
            className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-semibold ${cardToneClass(card.status)}`}
            style={{ borderRadius: 0 }}
          >
            <span className="uppercase tracking-wider opacity-70">{card.label}</span>
            <span className="font-bold">{card.value}</span>
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StatusDot status={engineeringState.complianceGate.overallStatus} />
        <span
          className={`text-[10px] font-bold ${
            engineeringState.complianceGate.overallStatus === 'pass'
              ? 'text-emerald-600'
              : engineeringState.complianceGate.overallStatus === 'warn'
                ? 'text-amber-600'
                : 'text-rose-600'
          }`}
        >
          {engineeringState.complianceGate.overallStatus === 'pass'
            ? 'OK'
            : engineeringState.complianceGate.overallStatus === 'warn'
              ? 'WARN'
              : 'FAIL'}
        </span>
      </div>
    </div>
  );

  const MobileSheetHeader = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-700">
          {engineeringState.modeMeta.label}
        </p>
        <p className="truncate text-[9px] text-slate-500">{engineeringState.scenarioMeta.label}</p>
      </div>
      <span
        className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-semibold ${engineeringState.scenarioMeta.toneClass}`}
        style={{ borderRadius: 0 }}
      >
        {engineeringState.scenarioMeta.label}
      </span>
    </div>
  );

  // ─── DESKTOP RAILS ───────────────────────────────────────────
  const DesktopTopBar = (
    <div className="hidden sm:flex absolute inset-x-0 top-0 z-20 flex-wrap items-center gap-2 px-3 pt-3">
      {/* Scenario selector compact */}
      <div className="border border-slate-200 bg-white/90 p-1.5 shadow backdrop-blur-sm" style={{ borderRadius: 0 }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">State</span>
          {SCENARIO_ORDER.map((scenarioKey) => {
            const active = scenario === scenarioKey;
            const meta = SCENARIO_META[scenarioKey];
            return (
              <button
                key={scenarioKey}
                type="button"
                data-testid={`hvac-scenario-${scenarioKey}`}
                onClick={() => onScenarioChange(scenarioKey)}
                className={`border px-2 py-0.5 text-[10px] font-semibold transition ${active ? meta.toneClass : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                style={{ borderRadius: 0 }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode tabs (desktop) */}
      <div className="border border-slate-200 bg-white/90 p-1.5 shadow backdrop-blur-sm" style={{ borderRadius: 0 }}>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">View</span>
          {MODE_ORDER.map((modeKey) => {
            const meta = MODE_META[modeKey];
            const active = mode === modeKey;
            return (
              <button
                key={modeKey}
                type="button"
                data-testid={`hvac-mode-${modeKey}`}
                onClick={() => onModeChange(modeKey)}
                className={`border px-2 py-1 text-[10px] font-medium transition ${active ? `${meta.toneClass} border-transparent` : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                style={{ borderRadius: 0 }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Headline KPI (right of bar) */}
      <div
        className="ml-auto flex items-center gap-2 border border-slate-200 bg-white/90 px-3 py-1.5 shadow backdrop-blur-sm"
        style={{ borderRadius: 0 }}
      >
        {primaryCards.slice(0, 3).map((card) => (
          <span key={card.id} className="flex items-center gap-1 text-[10px]">
            <KpiDot status={card.status} />
            <span className="font-semibold uppercase tracking-wider text-slate-500">{card.label}</span>
            <span className="font-bold text-slate-800">{card.value}</span>
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* ─── DESKTOP ───────────────────────────────────────── */}
      {!isMobile && (
        <>
          {DesktopTopBar}

          {/* Legend (bottom-left) */}
          <div
            className="hidden sm:block absolute bottom-3 left-3 z-20 border border-border bg-background/95 p-2"
            style={{ borderRadius: 0 }}
          >
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              SYSTEM LEGEND
            </p>
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="mb-0.5 flex items-center gap-1.5 last:mb-0">
                <div className={`h-2 w-3.5 ${item.colorClass}`} style={{ borderRadius: 0 }} />
                <span className="text-foreground text-[10px] tracking-wide">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Focus pin strip (bottom-center) */}
          <div
            className="hidden sm:flex absolute bottom-3 left-1/2 z-20 -translate-x-1/2 items-center gap-1.5 border border-slate-200 bg-white/90 px-2.5 py-1.5 shadow backdrop-blur-sm"
            style={{ borderRadius: 0 }}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Focus</span>
            {selectedFocus && (
              <button
                type="button"
                onClick={() => onSelectFocus(null)}
                className="border border-slate-300 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 transition hover:bg-slate-50"
                style={{ borderRadius: 0 }}
              >
                ✕
              </button>
            )}
            {FOCUS_PICKER_ITEMS.map((item) => {
              const selected = selectedFocus === item.id;
              const hovered = !selected && hoveredFocus === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`hvac-focus-pin-${item.id}`}
                  onClick={() => onSelectFocus(selected ? null : item.id)}
                  className={[
                    'border px-2 py-0.5 text-[9px] font-medium transition',
                    selected
                      ? 'border-sky-500 bg-sky-600 text-white'
                      : hovered
                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                  ].join(' ')}
                  style={{ borderRadius: 0 }}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Right rail */}
          <div className="hidden sm:flex absolute right-2 top-20 z-20 flex max-h-[calc(100%-6rem)] w-[320px] max-w-[calc(100vw-1rem)] flex-col gap-1.5 overflow-y-auto">
            {!trustDismissed ? (
              <div className="flex items-start gap-1.5 border border-amber-200 bg-amber-50/90 p-1.5 text-[9px] text-amber-800 backdrop-blur-sm">
                <span className="mt-0.5 shrink-0 text-[10px]">&#9888;</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Engineering Conceptual Viewer</p>
                  <p className="mt-0.5 leading-tight text-amber-700">Traceable and thresholded, not compliance certification.</p>
                </div>
                <button type="button" onClick={() => setTrustDismissed(true)} className="shrink-0 text-amber-500 hover:text-amber-700">&#10005;</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setTrustDismissed(false)}
                className="self-end border border-border bg-background/90 px-2 py-0.5 text-[8px] font-semibold text-foreground hover:bg-accent"
                style={{ borderRadius: 0 }}
              >
                &#9888; TRUST BOUNDARY
              </button>
            )}

            {StatusBoard}

            <section
              className="flex min-h-0 flex-1 flex-col overflow-hidden border border-slate-200 bg-white/92 shadow-lg backdrop-blur-sm"
              style={{ borderRadius: 0 }}
            >
              <div className="border-b border-slate-200 px-2 pt-2">
                <div className="grid grid-cols-3 gap-0.5 bg-slate-100 p-0.5">
                  <TabButton active={activeTab === 'summary'} label="Summary" testId="hvac-tab-summary" onClick={() => setActiveTab('summary')} />
                  <TabButton active={activeTab === 'focused'} label="Focused" testId="hvac-tab-focused" onClick={() => setActiveTab('focused')} />
                  <TabButton active={activeTab === 'assumptions'} label="Assumptions" testId="hvac-tab-assumptions" onClick={() => setActiveTab('assumptions')} />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-2">
                {activeTab === 'summary' && (
                  <div className="space-y-1.5">
                    <div
                      className={`border p-2 ${gateToneClass(engineeringState.complianceGate.overallStatus)}`}
                      style={{ borderRadius: 0 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wide">Compliance Gate</span>
                        <StatusDot status={engineeringState.complianceGate.overallStatus} />
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-1 text-center">
                        <GateCol pass={engineeringState.complianceGate.passCount > 0} label="ACH" />
                        <GateCol pass={engineeringState.complianceGate.failCount === 0} label="Pressure" />
                        <GateCol pass={engineeringState.complianceGate.warnCount === 0} label="Temp" />
                      </div>
                    </div>

                    <div className="border border-slate-200 p-2" style={{ borderRadius: 0 }}>
                      <button
                        type="button"
                        onClick={() => toggle('pressureLadder')}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Pressure Ladder</span>
                        <span className="text-[9px] text-slate-400">{collapsed.pressureLadder ? 'Show' : 'Hide'}</span>
                      </button>
                      {!collapsed.pressureLadder && (
                        <div className="mt-1.5 space-y-0.5">
                          {engineeringState.pressureLadder.map((row) => {
                            const num = parseFloat(row.actual);
                            const sign = !isNaN(num) && num > 0 ? '+' : '';
                            return (
                              <div key={row.id} className="flex items-center justify-between text-[9px]">
                                <span className="text-slate-600">{row.label}</span>
                                <span className={`font-mono font-bold ${num > 0 ? 'text-emerald-600' : num < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                  {sign}{row.actual}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'focused' && focusDetail && (
                  <div className="space-y-2">
                    <div className="border border-slate-200 p-2" style={{ borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{focusDetail.code}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-800">{focusDetail.title}</p>
                      <p className="mt-1 text-[9px] leading-tight text-slate-600">{focusDetail.summary}</p>
                    </div>
                    {focusDetail.evidenceRows && focusDetail.evidenceRows.length > 0 && (
                      <div className="space-y-1">
                        {focusDetail.evidenceRows.map((row) => (
                          <div key={row.label} className="flex items-center justify-between border border-slate-200 px-2 py-1">
                            <span className="text-[9px] text-slate-600">{row.label}</span>
                            <span className="text-[10px] font-bold text-slate-800">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'assumptions' && (
                  <div className="space-y-1">
                    {engineeringState.assumptions.map((assumption) => (
                      <div key={assumption.id} className="flex items-start gap-1.5 border border-slate-200 p-1.5">
                        <span
                          className={`shrink-0 text-[9px] ${
                            assumption.confidence === 'high'
                              ? 'text-emerald-500'
                              : assumption.confidence === 'medium'
                                ? 'text-amber-500'
                                : 'text-slate-400'
                          }`}
                        >
                          {assumption.confidence === 'high' ? 'High' : assumption.confidence === 'medium' ? 'Med' : 'Low'}
                        </span>
                        <p className="text-[9px] leading-tight text-slate-600">{assumption.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {/* ─── MOBILE ────────────────────────────────────────── */}
      {isMobile && (
        <>
          {MobileTopControls}

          <MobileBottomSheet
            snap={sheetSnap}
            onSnapChange={setSheetSnap}
            header={MobileSheetHeader}
            peek={MobilePeek}
          >
            <div className="flex flex-col gap-2 pb-4">
              <KpiPills />
              {StatusBoard}

              {/* Focus picker — horizontal scroll */}
              <div className="border border-slate-200 bg-background/95 p-2" style={{ borderRadius: 0 }}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Focus</span>
                  {selectedFocus && (
                    <button
                      type="button"
                      onClick={() => onSelectFocus(null)}
                      className="border border-slate-300 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 transition"
                      style={{ borderRadius: 0 }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {FOCUS_PICKER_ITEMS.map((item) => {
                    const selected = selectedFocus === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectFocus(selected ? null : item.id)}
                        className={[
                          'border px-2 py-1 text-[10px] font-medium transition',
                          selected
                            ? 'border-sky-500 bg-sky-600 text-white'
                            : 'border-slate-300 bg-white text-slate-600',
                        ].join(' ')}
                        style={{ borderRadius: 0 }}
                      >
                        {item.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {InspectorTabs}

              {/* Legend collapsed at bottom */}
              <details className="border border-border bg-background/95 p-2" style={{ borderRadius: 0 }}>
                <summary className="cursor-pointer text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                  System Legend
                </summary>
                <div className="mt-1.5">
                  {LEGEND_ITEMS.map((item) => (
                    <div key={item.label} className="mb-0.5 flex items-center gap-1.5 last:mb-0">
                      <div className={`h-2 w-3.5 ${item.colorClass}`} style={{ borderRadius: 0 }} />
                      <span className="text-foreground text-[10px] tracking-wide">{item.label}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </MobileBottomSheet>
        </>
      )}
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────
function StatusDot({ status }: { status: MetricStatus }) {
  return (
    <span
      className={`inline-block h-2 w-2 ${statusDotColorClass(status)}`}
      style={{ borderRadius: 0 }}
      aria-label={status}
    />
  );
}

function KpiDot({ status }: { status: MetricStatus }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotColorClass(status)}`} />;
}

function GateCol({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div>
      <p className={`text-[11px] font-bold ${pass ? 'text-emerald-600' : 'text-rose-600'}`}>{pass ? 'PASS' : 'FAIL'}</p>
      <p className="text-[8px] text-slate-500">{label}</p>
    </div>
  );
}

function statusDotColorClass(status: MetricStatus): string {
  switch (status) {
    case 'pass':
      return 'bg-emerald-500';
    case 'warn':
      return 'bg-amber-500';
    case 'fail':
      return 'bg-rose-500';
    default:
      return 'bg-slate-400';
  }
}

function ProvenanceBadge({ source, className = '' }: { source: ProvenanceSource; className?: string }) {
  const label =
    source === 'spec-derived'
      ? 'SPEC'
      : source === 'engineering-assumption'
        ? 'ASSUM'
        : source === 'scenario-simulation'
          ? 'SIM'
          : 'PLCH';
  return (
    <span className={`text-[7px] font-medium uppercase tracking-wider ${provenanceColorClass(source)} ${className}`}>
      {label}
    </span>
  );
}

function provenanceColorClass(source: ProvenanceSource): string {
  switch (source) {
    case 'spec-derived':
      return 'text-emerald-500';
    case 'scenario-simulation':
      return 'text-blue-500';
    case 'engineering-assumption':
      return 'text-amber-500';
    default:
      return 'text-slate-400';
  }
}

function cardToneClass(status: MetricStatus): string {
  switch (status) {
    case 'pass':
      return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    case 'warn':
      return 'bg-amber-50 border-amber-200 text-amber-800';
    case 'fail':
      return 'bg-rose-50 border-rose-200 text-rose-800';
    default:
      return 'bg-slate-50 border-slate-200 text-slate-700';
  }
}

function subsystemToneClass(status: MetricStatus): string {
  switch (status) {
    case 'pass':
      return 'bg-emerald-100 border-emerald-300 text-emerald-700';
    case 'warn':
      return 'bg-amber-100 border-amber-300 text-amber-700';
    case 'fail':
      return 'bg-rose-100 border-rose-300 text-rose-700';
    default:
      return 'bg-slate-100 border-slate-300 text-slate-700';
  }
}

function gateToneClass(status: MetricStatus): string {
  switch (status) {
    case 'pass':
      return 'bg-emerald-50 border-emerald-300';
    case 'warn':
      return 'bg-amber-50 border-amber-300';
    case 'fail':
      return 'bg-rose-50 border-rose-300';
    default:
      return 'bg-slate-50 border-slate-300';
  }
}

function TabButton({
  active,
  label,
  testId,
  onClick,
}: {
  active: boolean;
  label: string;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`px-2 py-1 text-[9px] font-semibold transition ${active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      style={{ borderRadius: 0 }}
    >
      {label}
    </button>
  );
}

// expose for unused-warn quench (HvacBoardCard import) — actually used via prop type
export type { HvacBoardCard };
