import type * as THREE from 'three';
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export type HvacViewMode = 'full' | 'supply' | 'return' | 'refrigerant' | 'plan' | 'exploded' | 'catalog';

export type HvacScenario = 'normal' | 'surgery-peak' | 'purge' | 'setback' | 'fault';

export type HvacSubsystemId =
  | 'air-balance'
  | 'pressure-cascade'
  | 'filtration'
  | 'controls-bms'
  | 'agss-exhaust'
  | 'maintainability';

export type HvacSpaceId = 'or' | 'anteroom' | 'prep-support' | 'corridor';

export type MetricStatus = 'pass' | 'warn' | 'fail';

export type ProvenanceSource = 'spec-derived' | 'engineering-assumption' | 'scenario-simulation' | 'placeholder';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type AlarmClass = 'normal' | 'advisory' | 'warning' | 'critical';

export type FocusTargetId =
  | 'pressure-cascade'
  | 'ahu-treatment'
  | 'mixing-box'
  | 'laf-canopy'
  | 'return-sweep'
  | 'agss-exhaust'
  | 'dx-circuit'
  | 'controls-bms'
  | 'service-access';

export type CalloutTrigger = 'always' | 'focused' | 'hover' | 'selected';

export type StatusTone = 'nominal' | 'warning' | 'alarm';

export interface HvacModeMeta {
  key: HvacViewMode;
  label: string;
  toneClass: string;
  description: string;
  callout: string;
}

export interface ScenarioMetric {
  label: string;
  value: string;
  state?: StatusTone;
}

export interface ScenarioProfile {
  key: HvacScenario;
  label: string;
  toneClass: string;
  description: string;
  summary: string;
  metrics: ScenarioMetric[];
  alerts: string[];
}

export interface HvacScenarioMeta {
  key: HvacScenario;
  label: string;
  toneClass: string;
  description: string;
  summary: string;
}

export interface EngineeringRow {
  label: string;
  value: string;
}

export interface EngineeringObject {
  id: FocusTargetId;
  code: string;
  title: string;
  system: string;
  summary: string;
  rows: EngineeringRow[];
  maintenance: string;
  failure: string;
  compliance: string[];
}

export interface CalloutSpec {
  id: string;
  targetId: FocusTargetId;
  text: string;
  position: [number, number, number];
  accent: string;
  modes: HvacViewMode[];
  trigger: CalloutTrigger;
  priority: 'anchor' | 'detail';
}

export interface OverlayInspectorState {
  mode: HvacViewMode;
  scenario: HvacScenario;
  focusTarget: FocusTargetId | null;
  kicker: string;
  title: string;
  description: string;
  metrics: ScenarioMetric[];
  rows: EngineeringRow[];
  alerts: string[];
  maintenance?: string;
  failure?: string;
  compliance: string[];
}

export interface HvacEngineeringMetric {
  id: string;
  label: string;
  target: string;
  actual: string;
  unit: string;
  warn: string;
  fail: string;
  status: MetricStatus;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  note: string;
}

export interface HvacBoardCard {
  id: string;
  label: string;
  value: string;
  target: string;
  unit: string;
  status: MetricStatus;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  note: string;
}

export interface HvacComplianceGate {
  totalMetrics: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  overallStatus: MetricStatus;
  failingMetricIds: string[];
  warningMetricIds: string[];
}

export interface HvacAirBalance {
  supplyCfm: string;
  returnCfm: string;
  agssExhaustCfm: string;
  netSurplusCfm: string;
  pressureImplication: string;
}

export interface HvacSpacePressure {
  id: HvacSpaceId;
  label: string;
  target: string;
  actual: string;
  unit: string;
  warn: string;
  fail: string;
  status: MetricStatus;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  note: string;
}

export interface HvacScenarioSequence {
  title: string;
  fanDutyState: string;
  fanStandbyState: string;
  damperIntent: string;
  reliefExhaustBehavior: string;
  filterCondition: string;
  alarmClass: AlarmClass;
  achEffect: string;
  pressureEffect: string;
  steps: string[];
}

export interface HvacSubsystemState {
  id: HvacSubsystemId;
  label: string;
  status: MetricStatus;
  summary: string;
  focusTarget: FocusTargetId;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
}

export interface HvacAssumption {
  id: string;
  title: string;
  detail: string;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
}

export interface HvacFocusDetail {
  id: FocusTargetId;
  code: string;
  title: string;
  subsystemId: HvacSubsystemId;
  system: string;
  summary: string;
  target: string;
  actual: string;
  thresholds: string;
  failureConsequence: string;
  maintenanceImplication: string;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  note: string;
  evidenceRows: EngineeringRow[];
  tags: string[];
}

export interface HvacEngineeringState {
  mode: HvacViewMode;
  scenario: HvacScenario;
  modeMeta: HvacModeMeta;
  scenarioMeta: HvacScenarioMeta;
  focusedTarget: FocusTargetId;
  focusOrigin: 'selected' | 'hovered' | 'scenario-default';
  narrative: string;
  trustBoundary: string;
  metrics: HvacEngineeringMetric[];
  boardCards: HvacBoardCard[];
  subsystemStates: HvacSubsystemState[];
  pressureLadder: HvacSpacePressure[];
  scenarioSequence: HvacScenarioSequence;
  assumptions: HvacAssumption[];
  focusDetail: HvacFocusDetail;
  complianceGate: HvacComplianceGate;
  airBalance: HvacAirBalance;
  normalBaseline: HvacBoardCard[];
}

export interface FocusPickerItem {
  id: FocusTargetId;
  shortLabel: string;
}

export interface Bag {
  key: string;
  group: THREE.Group;
  mats: THREE.MeshStandardMaterial[];
  explodedY: number;
  focusTargets: FocusTargetId[];
}

export interface LabelHandle {
  spec: CalloutSpec;
  object: CSS2DObject;
}

export interface SceneBundle {
  bags: Record<string, Bag>;
  labels: LabelHandle[];
  focusObjects: THREE.Object3D[];
}

export interface CollapsedSections {
  kpiBoard: boolean;
  pressureLadder: boolean;
  scenarioSequence: boolean;
}

export interface PresentationState {
  mode: HvacViewMode;
  scenario: HvacScenario;
  hoveredFocus: FocusTargetId | null;
  selectedFocus: FocusTargetId | null;
  engineeringState?: HvacEngineeringState;
}
