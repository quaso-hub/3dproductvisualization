import type { Product } from '../../data/products';
import { MODE_META } from './data';
import type {
  AlarmClass,
  ConfidenceLevel,
  EngineeringRow,
  FocusTargetId,
  HvacAirBalance,
  HvacAssumption,
  HvacBoardCard,
  HvacComplianceGate,
  HvacEngineeringMetric,
  HvacEngineeringState,
  HvacFocusDetail,
  HvacScenario,
  HvacScenarioMeta,
  HvacScenarioSequence,
  HvacSpaceId,
  HvacSpacePressure,
  HvacSubsystemId,
  HvacSubsystemState,
  HvacViewMode,
  MetricStatus,
  ProvenanceSource,
} from './types';

interface NumericRange {
  min: number;
  max: number;
}

interface ScenarioNumbers {
  ach: number;
  supplyCfm: number;
  returnCfm: number;
  freshAirRatio: number;
  agssExhaustCfm: number;
  pressurePa: number;
  temperatureC: number;
  humidityRh: number;
  filterDpPa: number;
}

interface ScenarioDefinition {
  meta: HvacScenarioMeta;
  primaryFocus: FocusTargetId;
  metrics: ScenarioNumbers;
  pressureLadder: Record<HvacSpaceId, number>;
  sequence: HvacScenarioSequence;
  subsystemNarratives: Record<HvacSubsystemId, string>;
}

interface NormalizedHvacSpecs {
  standard: string;
  airChanges: number;
  airChangesLabel: string;
  positivePressurePa: number;
  positivePressureLabel: string;
  supplyTempRange: NumericRange;
  supplyTempLabel: string;
  freshAirRatioRange: NumericRange;
  freshAirRatioLabel: string;
  hepaFilter: string;
  coolingCapacity: string;
  humidityRange: NumericRange;
  humidityLabel: string;
  assumptions: HvacAssumption[];
}

interface FocusTemplateContext {
  specs: NormalizedHvacSpecs;
  scenario: ScenarioDefinition;
  metrics: Record<string, HvacEngineeringMetric>;
  pressureLadder: HvacSpacePressure[];
  serviceMetric: HvacEngineeringMetric;
}

interface FocusTemplate {
  id: FocusTargetId;
  code: string;
  title: string;
  subsystemId: HvacSubsystemId;
  system: string;
  summary: string;
  target: (context: FocusTemplateContext) => string;
  actual: (context: FocusTemplateContext) => string;
  thresholds: (context: FocusTemplateContext) => string;
  failureConsequence: string;
  maintenanceImplication: string;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  note: (context: FocusTemplateContext) => string;
  evidenceRows: (context: FocusTemplateContext) => EngineeringRow[];
  tags: string[];
}

const DEFAULT_SPEC_FALLBACK = {
  standard: 'ASHRAE 170:2021 / NFPA 99',
  airChanges: '20 ACH',
  supplyTemp: '18-24 C',
  positivePressure: '+8 Pa',
  hepaFilter: 'HEPA H14',
  freshAirRatio: '20-30%',
  coolingCapacity: '8 kW',
} as const;

export const SCENARIO_ORDER: HvacScenario[] = ['normal', 'surgery-peak', 'purge', 'setback', 'fault'];

const SCENARIO_DEFINITIONS: Record<HvacScenario, ScenarioDefinition> = {
  normal: {
    meta: {
      key: 'normal',
      label: 'Normal',
      toneClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      description: 'Balanced occupied operating-theatre baseline with positive pressure and nominal filter condition.',
      summary: 'Baseline occupied mode with positive pressure, staged filtration, and normal fan duty/standby readiness.',
    },
    primaryFocus: 'pressure-cascade',
    metrics: {
      ach: 20,
      supplyCfm: 3200,
      returnCfm: 2450,
      freshAirRatio: 25,
      agssExhaustCfm: 420,
      pressurePa: 8,
      temperatureC: 21,
      humidityRh: 50,
      filterDpPa: 125,
    },
    pressureLadder: { or: 8, anteroom: 2, 'prep-support': 1, corridor: 0 },
    sequence: {
      title: 'Normal control sequence',
      fanDutyState: 'Fan A duty at baseline occupied flow',
      fanStandbyState: 'Fan B auto-ready in standby',
      damperIntent: 'Outdoor-air damper modulates around 25% with return path stable',
      reliefExhaustBehavior: 'Relief mostly closed; AGSS stays on dedicated discharge path',
      filterCondition: 'Pre-filter and fine filter within normal DP band',
      alarmClass: 'normal',
      achEffect: 'Hold 20 ACH occupied baseline',
      pressureEffect: 'Maintain OR positive core at +8 Pa with cascade to anteroom then corridor',
      steps: [
        'Hold supply fan duty on Fan A and keep Fan B available for transfer.',
        'Modulate outdoor-air damper around the design fresh-air band while preserving room pressure.',
        'Maintain AGSS exhaust as a dedicated safety path independent from the return system.',
      ],
    },
    subsystemNarratives: {
      'air-balance': 'Supply, return, and fresh-air ratio stay inside the occupied baseline band.',
      'pressure-cascade': 'OR remains positive to adjacent spaces with a readable ladder from OR to corridor.',
      filtration: 'Filter loading stays below the reviewer warning band and downstream delivery remains stable.',
      'controls-bms': 'Pressure, T/RH, filter DP, and fan state read as healthy with no active alarm class.',
      'agss-exhaust': 'Dedicated AGSS path remains available at its baseline extraction rate.',
      maintainability: 'Service clearances remain conceptually available even outside exploded mode.',
    },
  },
  'surgery-peak': {
    meta: {
      key: 'surgery-peak',
      label: 'Surgery Peak',
      toneClass: 'border-sky-200 bg-sky-50 text-sky-700',
      description: 'Peak procedure state with higher clean-air delivery and tighter sterile-zone protection.',
      summary: 'High-load procedure mode increases canopy priority, fresh-air intake, and room-pressure margin.',
    },
    primaryFocus: 'laf-canopy',
    metrics: {
      ach: 25,
      supplyCfm: 3600,
      returnCfm: 2740,
      freshAirRatio: 30,
      agssExhaustCfm: 460,
      pressurePa: 10,
      temperatureC: 20,
      humidityRh: 47,
      filterDpPa: 145,
    },
    pressureLadder: { or: 10, anteroom: 3, 'prep-support': 2, corridor: 0 },
    sequence: {
      title: 'Peak procedure control sequence',
      fanDutyState: 'Fan A ramps up to peak procedure airflow',
      fanStandbyState: 'Fan B remains hot standby with automatic transfer armed',
      damperIntent: 'Outdoor-air damper opens wider to support sterile canopy demand',
      reliefExhaustBehavior: 'Relief remains restrained while AGSS stays separated and active',
      filterCondition: 'Filters still within acceptable DP while higher flow is sustained',
      alarmClass: 'normal',
      achEffect: 'Raise room delivery to 25 ACH',
      pressureEffect: 'Increase OR pressure to +10 Pa to protect the sterile field during peak load',
      steps: [
        'Increase duty fan output and push more supply air through the canopy zone.',
        'Open outdoor-air damper toward the upper design band while holding return and AGSS separation.',
        'Preserve positive pressure margin above the occupied baseline throughout the case.',
      ],
    },
    subsystemNarratives: {
      'air-balance': 'Air balance shifts upward but remains within the intended peak procedure band.',
      'pressure-cascade': 'Pressure ladder strengthens to protect the sterile zone during surgical peak load.',
      filtration: 'Higher airflow raises filter DP but remains within the acceptable reviewer band.',
      'controls-bms': 'Controls maintain stable peak-state values without escalating alarm class.',
      'agss-exhaust': 'AGSS remains visible and traceable while the room airflow increases.',
      maintainability: 'No service claim changes; maintainability stays conceptual and unchanged by peak load.',
    },
  },
  purge: {
    meta: {
      key: 'purge',
      label: 'Purge',
      toneClass: 'border-violet-200 bg-violet-50 text-violet-700',
      description: 'Flush condition with elevated exhaust and relief behavior while directional control is retained.',
      summary: 'Purge mode prioritizes extraction and cleanup over comfort, with a softer pressure margin than baseline.',
    },
    primaryFocus: 'agss-exhaust',
    metrics: {
      ach: 30,
      supplyCfm: 4000,
      returnCfm: 2950,
      freshAirRatio: 35,
      agssExhaustCfm: 620,
      pressurePa: 6,
      temperatureC: 20,
      humidityRh: 45,
      filterDpPa: 155,
    },
    pressureLadder: { or: 6, anteroom: 2, 'prep-support': 1, corridor: 0 },
    sequence: {
      title: 'Purge control sequence',
      fanDutyState: 'Fan A drives high-flow purge delivery',
      fanStandbyState: 'Fan B stays armed for transfer but not carrying load',
      damperIntent: 'Outdoor-air damper opens above baseline to support flush airflow',
      reliefExhaustBehavior: 'Relief path and AGSS/exhaust are intentionally emphasized',
      filterCondition: 'Filters remain usable but DP climbs toward the reviewer warning band',
      alarmClass: 'advisory',
      achEffect: 'Raise room delivery to 30 ACH for temporary flush behavior',
      pressureEffect: 'Keep room positive but allow the margin to relax from baseline while purge exhaust rises',
      steps: [
        'Boost supply and return/exhaust paths together for cleanup or recovery.',
        'Shift dampers and relief path to support temporary flush behavior rather than comfort optimization.',
        'Keep the room positive to adjacent spaces while accepting a reduced pressure margin.',
      ],
    },
    subsystemNarratives: {
      'air-balance': 'Air balance is intentionally aggressive and sits in a reviewer warning state during purge.',
      'pressure-cascade': 'Positive pressure is preserved but with less margin than occupied baseline.',
      filtration: 'Filter DP rises under flush flow and should be watched even if still usable.',
      'controls-bms': 'Purge is an advisory state with visible sequence logic, not a fault state.',
      'agss-exhaust': 'AGSS and exhaust are deliberately emphasized as the dominant purge path.',
      maintainability: 'Maintainability is unchanged; purge affects operation, not service geometry.',
    },
  },
  setback: {
    meta: {
      key: 'setback',
      label: 'Setback',
      toneClass: 'border-slate-200 bg-slate-50 text-slate-700',
      description: 'Reduced-load readiness mode that preserves minimum positive pressure and system availability.',
      summary: 'Setback reduces flow and energy demand while still keeping a minimum positive-pressure narrative.',
    },
    primaryFocus: 'controls-bms',
    metrics: {
      ach: 12,
      supplyCfm: 2200,
      returnCfm: 1600,
      freshAirRatio: 20,
      agssExhaustCfm: 260,
      pressurePa: 4,
      temperatureC: 22,
      humidityRh: 54,
      filterDpPa: 110,
    },
    pressureLadder: { or: 4, anteroom: 1, 'prep-support': 0.5, corridor: 0 },
    sequence: {
      title: 'Setback control sequence',
      fanDutyState: 'Fan A turndowns to readiness flow',
      fanStandbyState: 'Fan B remains auto-ready for occupied restart',
      damperIntent: 'Outdoor-air damper settles at the low end of the design band',
      reliefExhaustBehavior: 'Relief path stays minimal while AGSS remains available',
      filterCondition: 'Filters sit comfortably within low-DP standby operation',
      alarmClass: 'advisory',
      achEffect: 'Reduce delivery to 12 ACH readiness mode',
      pressureEffect: 'Hold only the minimum positive pressure needed to preserve the room cascade',
      steps: [
        'Turndown airflow while keeping the room from losing positive directionality.',
        'Maintain enough outdoor air and AGSS readiness for a quick return to occupied mode.',
        'Use the control layer to show reduced flow without implying shutdown.',
      ],
    },
    subsystemNarratives: {
      'air-balance': 'Air balance is intentionally reduced but remains acceptable for readiness mode.',
      'pressure-cascade': 'Pressure ladder is shallow but still positive from OR to corridor.',
      filtration: 'Filter loading relaxes in setback and stays clearly within band.',
      'controls-bms': 'Controls indicate advisory setback logic rather than active occupied operation.',
      'agss-exhaust': 'AGSS remains available at reduced readiness extraction.',
      maintainability: 'Maintainability remains a design feature and does not depend on operating load.',
    },
  },
  fault: {
    meta: {
      key: 'fault',
      label: 'Fault / Alarm',
      toneClass: 'border-rose-200 bg-rose-50 text-rose-700',
      description: 'Dirty-filter and fan-transfer alarm state with degraded pressure and visible fallback behavior.',
      summary: 'Fault mode demonstrates degraded but still legible fallback behavior without claiming compliance-grade resilience.',
    },
    primaryFocus: 'controls-bms',
    metrics: {
      ach: 18,
      supplyCfm: 2800,
      returnCfm: 2100,
      freshAirRatio: 18,
      agssExhaustCfm: 420,
      pressurePa: 2,
      temperatureC: 23,
      humidityRh: 58,
      filterDpPa: 260,
    },
    pressureLadder: { or: 2, anteroom: 0.5, 'prep-support': 0.2, corridor: 0 },
    sequence: {
      title: 'Fault transfer sequence',
      fanDutyState: 'Fan B takes duty after Fan A failure',
      fanStandbyState: 'Fan A unavailable pending service',
      damperIntent: 'Outdoor-air damper is constrained to preserve what pressure margin remains',
      reliefExhaustBehavior: 'Relief stays controlled while AGSS remains dedicated and healthy',
      filterCondition: 'Dirty filter drives high DP alarm and reduced supply flow',
      alarmClass: 'critical',
      achEffect: 'ACH falls below occupied target even after fan transfer',
      pressureEffect: 'OR pressure drops near the lower acceptable boundary and the cascade weakens',
      steps: [
        'Transfer duty from Fan A to Fan B after the failure event.',
        'Carry a degraded airflow state because dirty-filter DP still limits delivery.',
        'Expose the reduced pressure ladder and alarm escalation as a reviewer-visible fault sequence.',
      ],
    },
    subsystemNarratives: {
      'air-balance': 'Air balance is degraded and no longer meets occupied target values.',
      'pressure-cascade': 'Pressure ladder weakens enough to be treated as a failure condition.',
      filtration: 'Dirty-filter DP crosses the fail threshold and becomes the dominant fault driver.',
      'controls-bms': 'Critical alarm state with explicit fan transfer and degraded-condition reporting.',
      'agss-exhaust': 'AGSS remains healthy and helps show subsystem separation during the fault.',
      maintainability: 'Service priority is now urgent because filter replacement and fan fault recovery are required.',
    },
  },
};

export const SCENARIO_META: Record<HvacScenario, HvacScenarioMeta> = Object.fromEntries(
  SCENARIO_ORDER.map((scenario) => [scenario, SCENARIO_DEFINITIONS[scenario].meta] as const),
) as Record<HvacScenario, HvacScenarioMeta>;

const SUBSYSTEM_META: Record<HvacSubsystemId, { label: string; focusTarget: FocusTargetId }> = {
  'air-balance': { label: 'Air Balance', focusTarget: 'mixing-box' },
  'pressure-cascade': { label: 'Pressure Cascade', focusTarget: 'pressure-cascade' },
  filtration: { label: 'Filtration', focusTarget: 'ahu-treatment' },
  'controls-bms': { label: 'Controls / BMS', focusTarget: 'controls-bms' },
  'agss-exhaust': { label: 'AGSS / Exhaust', focusTarget: 'agss-exhaust' },
  maintainability: { label: 'Maintainability', focusTarget: 'service-access' },
};

const FOCUS_TEMPLATES: Record<FocusTargetId, FocusTemplate> = {
  'pressure-cascade': {
    id: 'pressure-cascade',
    code: 'OR-01 / ZN-01',
    title: 'Pressure Cascade and Zoning',
    subsystemId: 'pressure-cascade',
    system: 'Room relationships',
    summary: 'Pressure is expressed as a room-to-room ladder instead of a single badge so the viewer stays auditable.',
    target: ({ specs }) => `OR ${specs.positivePressureLabel}, anteroom +2 Pa, prep/support +1 Pa, corridor neutral`,
    actual: ({ pressureLadder }) => pressureLadder.map((space) => `${space.label} ${space.actual}`).join(' | '),
    thresholds: () => 'Warn below OR +6 Pa or anteroom +1 Pa. Fail below OR +3 Pa or if corridor drifts off neutral.',
    failureConsequence:
      'If OR pressure collapses toward neutral, the viewer can no longer claim a protected outward leakage relationship.',
    maintenanceImplication:
      'Pressure monitor calibration, door-underflow assumptions, and sequence verification must be reviewed during commissioning.',
    source: 'scenario-simulation',
    confidence: 'medium',
    note: ({ specs }) => `Baseline pressure target anchored to ${specs.standard}; adjacent space values remain conceptual.`,
    evidenceRows: ({ metrics, pressureLadder }) => [
      { label: 'OR differential', value: metrics['pressure-or-pa'].actual },
      { label: 'Anteroom differential', value: pressureLadder.find((space) => space.id === 'anteroom')?.actual ?? 'n/a' },
      { label: 'Corridor reference', value: pressureLadder.find((space) => space.id === 'corridor')?.actual ?? 'n/a' },
    ],
    tags: ['Pressure ladder', 'PASS/WARN/FAIL', 'Directional control'],
  },
  'ahu-treatment': {
    id: 'ahu-treatment',
    code: 'AHU-01',
    title: 'Staged Treatment AHU',
    subsystemId: 'filtration',
    system: 'Primary air treatment',
    summary: 'Treatment train stays accountable through filter DP, fan duty/standby state, and staged air treatment narrative.',
    target: () => 'G4 -> F7 -> DX coil -> RH trim -> UV-C with filter DP below 180 Pa and duty/standby fan resilience',
    actual: ({ metrics, scenario }) =>
      `${metrics['filter-dp-pa'].actual}, ${scenario.sequence.fanDutyState.toLowerCase()}, ${scenario.sequence.filterCondition.toLowerCase()}`,
    thresholds: () => 'Warn above 180 Pa filter DP. Fail above 240 Pa or when delivery remains degraded after fan transfer.',
    failureConsequence:
      'Dirty filters and unstable fan state reduce airflow first, then pressure margin and sterile delivery.',
    maintenanceImplication:
      'Front-face access must support filter pull, coil cleaning, UV service, and fan changeover review.',
    source: 'engineering-assumption',
    confidence: 'medium',
    note: ({ specs }) => `Filter stage names stay anchored to ${specs.hepaFilter} narrative, but DP bands remain conceptual reviewer thresholds.`,
    evidenceRows: ({ metrics, scenario }) => [
      { label: 'Filter DP', value: metrics['filter-dp-pa'].actual },
      { label: 'Supply airflow', value: metrics['supply-cfm'].actual },
      { label: 'Fan state', value: scenario.sequence.fanDutyState },
    ],
    tags: ['Filter DP', 'Duty/standby', 'Service access'],
  },
  'mixing-box': {
    id: 'mixing-box',
    code: 'MB-01',
    title: 'Outside Air and Mixing Logic',
    subsystemId: 'air-balance',
    system: 'Outdoor air / recirculation',
    summary: 'Damper intent, outdoor-air ratio, and relief behavior are shown as sequence logic rather than decorative labels.',
    target: ({ specs }) => `Outdoor air ${specs.freshAirRatioLabel} with dampers preserving pressure and return-air continuity`,
    actual: ({ metrics, scenario }) => `${metrics['fresh-air-ratio'].actual}, ${scenario.sequence.damperIntent.toLowerCase()}`,
    thresholds: () => 'Warn outside 20-30% fresh air. Fail below 16% or above 38% because balance and purge behavior become misleading.',
    failureConsequence:
      'Incorrect damper behavior undermines fresh-air credibility, pressure control, and purge sequencing at once.',
    maintenanceImplication:
      'Actuator position, damper blade travel, and relief path visibility must remain reviewable in the model.',
    source: 'scenario-simulation',
    confidence: 'medium',
    note: ({ scenario }) => `Damper narrative is deterministic for ${scenario.meta.label.toLowerCase()} but remains conceptual, not BMS-integrated.`,
    evidenceRows: ({ metrics, scenario }) => [
      { label: 'Fresh-air ratio', value: metrics['fresh-air-ratio'].actual },
      { label: 'Supply airflow', value: metrics['supply-cfm'].actual },
      { label: 'Damper intent', value: scenario.sequence.damperIntent },
    ],
    tags: ['Fresh air', 'Damper state', 'Relief logic'],
  },
  'laf-canopy': {
    id: 'laf-canopy',
    code: 'LAF-01',
    title: 'Sterile Canopy and Supply Delivery',
    subsystemId: 'air-balance',
    system: 'Terminal supply',
    summary: 'Terminal delivery stays tied to ACH, pressure, and canopy priority rather than a generic clean-air badge.',
    target: ({ specs }) => `${specs.hepaFilter} final stage with occupied ACH at or above ${specs.airChangesLabel}`,
    actual: ({ metrics, scenario }) => `${metrics['ach'].actual}, ${metrics['pressure-or-pa'].actual}, ${scenario.meta.summary.toLowerCase()}`,
    thresholds: () => 'Warn below occupied ACH target. Fail when pressure and delivery both slip enough to weaken sterile-field protection.',
    failureConsequence:
      'Once canopy delivery weakens, the sterile field becomes the first part of the viewer narrative that stops being convincing.',
    maintenanceImplication:
      'Plenum panels and ceiling-side access remain necessary for HEPA replacement and leakage inspection.',
    source: 'scenario-simulation',
    confidence: 'medium',
    note: () => 'Velocity is implied through delivery state and visual sweep cues, not measured CFD.',
    evidenceRows: ({ metrics }) => [
      { label: 'ACH', value: metrics['ach'].actual },
      { label: 'Pressure differential', value: metrics['pressure-or-pa'].actual },
      { label: 'Temperature', value: metrics['temperature-c'].actual },
    ],
    tags: ['HEPA canopy', 'Sterile zone', 'Downward sweep'],
  },
  'return-sweep': {
    id: 'return-sweep',
    code: 'RA-01',
    title: 'Low-Wall Return Sweep',
    subsystemId: 'air-balance',
    system: 'Return air',
    summary: 'Return collection is explained through numeric balance and low-wall placement, not only highlighted ductwork.',
    target: () => 'Return collection below the sterile field with enough airflow to preserve directional sweep and room balance',
    actual: ({ metrics, scenario }) => `${metrics['return-cfm'].actual}, ${scenario.sequence.reliefExhaustBehavior.toLowerCase()}`,
    thresholds: () => 'Warn when return flow falls near the lower scenario band. Fail when sweep credibility is lost alongside pressure degradation.',
    failureConsequence:
      'Weak return undermines the contamination-sweep story and makes the room read as symbolic instead of engineered.',
    maintenanceImplication:
      'Grille cleaning, balancing access, and low-wall routing should remain visible for lifecycle review.',
    source: 'scenario-simulation',
    confidence: 'medium',
    note: () => 'Return-air direction remains conceptual and visually implied rather than measured.',
    evidenceRows: ({ metrics, scenario }) => [
      { label: 'Return airflow', value: metrics['return-cfm'].actual },
      { label: 'Pressure differential', value: metrics['pressure-or-pa'].actual },
      { label: 'Relief / exhaust behavior', value: scenario.sequence.reliefExhaustBehavior },
    ],
    tags: ['Return sweep', 'Perimeter collection', 'Room balance'],
  },
  'agss-exhaust': {
    id: 'agss-exhaust',
    code: 'AGSS-01',
    title: 'Dedicated AGSS and Exhaust',
    subsystemId: 'agss-exhaust',
    system: 'Waste anesthetic gas',
    summary: 'AGSS stays separated from return and gains deterministic operating meaning across scenarios.',
    target: () => 'Dedicated extraction path at or above 420 CFM baseline with no recirculation ambiguity',
    actual: ({ metrics, scenario }) => `${metrics['agss-exhaust-cfm'].actual}, ${scenario.sequence.reliefExhaustBehavior.toLowerCase()}`,
    thresholds: () => 'Warn below 360 CFM. Fail below 280 CFM or if the AGSS story becomes visually merged with return.',
    failureConsequence:
      'If AGSS loses identity, the model becomes misleading about medical-safety exhaust behavior.',
    maintenanceImplication:
      'Pickup integrity, inline fan access, and discharge routing should remain legible as a dedicated subsystem.',
    source: 'scenario-simulation',
    confidence: 'medium',
    note: () => 'AGSS extraction values are conceptual scenario numbers used for audit-style review.',
    evidenceRows: ({ metrics, scenario }) => [
      { label: 'AGSS / exhaust flow', value: metrics['agss-exhaust-cfm'].actual },
      { label: 'Alarm class', value: titleCase(scenario.sequence.alarmClass) },
      { label: 'Sequence note', value: scenario.sequence.reliefExhaustBehavior },
    ],
    tags: ['Dedicated exhaust', 'Safety path', 'Scenario sequence'],
  },
  'dx-circuit': {
    id: 'dx-circuit',
    code: 'CDU-01',
    title: 'DX Plant and Service Logic',
    subsystemId: 'maintainability',
    system: 'Cooling plant',
    summary: 'The DX path remains tied to the active product basis and is reviewed through temperature stability and service narrative.',
    target: ({ specs }) => `DX plant basis ${specs.coolingCapacity} with temperature held inside ${specs.supplyTempLabel}`,
    actual: ({ metrics }) => `${metrics['temperature-c'].actual}, ${metrics['supply-cfm'].actual}, ${metrics['filter-dp-pa'].actual}`,
    thresholds: ({ specs }) => `Warn when temperature drifts outside ${specs.supplyTempRange.min + 1}-${specs.supplyTempRange.max - 1} C. Fail outside ${specs.supplyTempLabel}.`,
    failureConsequence:
      'Cooling instability weakens temperature control and exposes the DX system as a hidden operational dependency.',
    maintenanceImplication:
      'Valve service, riser support review, and condenser access are part of the conceptual service story.',
    source: 'engineering-assumption',
    confidence: 'medium',
    note: ({ specs }) => `Temperature remains the visible proxy because live refrigerant instrumentation is outside this viewer scope. Baseline plant note: ${specs.coolingCapacity}.`,
    evidenceRows: ({ metrics }) => [
      { label: 'Temperature', value: metrics['temperature-c'].actual },
      { label: 'Humidity', value: metrics['humidity-rh'].actual },
      { label: 'Supply airflow', value: metrics['supply-cfm'].actual },
    ],
    tags: ['DX plant', 'Cooling dependency', 'Service realism'],
  },
  'controls-bms': {
    id: 'controls-bms',
    code: 'BMS-01',
    title: 'Controls, Sensors, and Alarms',
    subsystemId: 'controls-bms',
    system: 'Instrumentation',
    summary: 'Controls now express deterministic alarm class, fan transfer, and reviewer-visible sensor outcomes.',
    target: () => 'Pressure, T/RH, filter DP, and fan duty/standby status remain visible with deterministic alarm class logic',
    actual: ({ metrics, scenario }) => `${titleCase(scenario.sequence.alarmClass)} alarm, ${scenario.sequence.fanDutyState.toLowerCase()}, ${metrics['filter-dp-pa'].actual}`,
    thresholds: () => 'Warn on advisory or warning alarm class. Fail on critical alarm class or when pressure and filter DP both break band.',
    failureConsequence:
      'Without deterministic controls data, the viewer reads as a polished demo rather than an accountable engineering concept.',
    maintenanceImplication:
      'Sensor calibration, alarm acknowledgment logic, and fan-transfer checks must remain part of the readiness story.',
    source: 'scenario-simulation',
    confidence: 'medium',
    note: () => 'Alarm logic is scenario-driven and intentionally transparent; it is not connected to a live BMS.',
    evidenceRows: ({ metrics, scenario }) => [
      { label: 'Alarm class', value: titleCase(scenario.sequence.alarmClass) },
      { label: 'Fan duty', value: scenario.sequence.fanDutyState },
      { label: 'Filter DP', value: metrics['filter-dp-pa'].actual },
    ],
    tags: ['Alarm class', 'Fan transfer', 'Visible controls'],
  },
  'service-access': {
    id: 'service-access',
    code: 'MA-01',
    title: 'Constructability and Service Envelopes',
    subsystemId: 'maintainability',
    system: 'Maintenance and BIM coordination',
    summary: 'Exploded mode becomes a service-readability view with explicit removal path and plenum-clearance cues.',
    target: () => 'Maintain front service face, coil pull path, fan removal path, and visible plenum congestion review',
    actual: ({ serviceMetric, scenario }) => `${serviceMetric.actual}, ${scenario.meta.label.toLowerCase()} scenario`,
    thresholds: () => 'Warn below a clearance score of 80/100. Fail below 65/100 or when removal paths stop reading clearly.',
    failureConsequence:
      'If service envelopes disappear, the model looks complete while remaining unbuildable or unmaintainable.',
    maintenanceImplication:
      'Exploded mode must keep lifecycle tasks legible: filter change, coil pull, fan removal, and support review.',
    source: 'engineering-assumption',
    confidence: 'medium',
    note: () => 'Clearance score is a conceptual review aid, not a measured BIM clash report.',
    evidenceRows: ({ serviceMetric, scenario }) => [
      { label: 'Service score', value: serviceMetric.actual },
      { label: 'Filter condition', value: scenario.sequence.filterCondition },
      { label: 'Fan state', value: scenario.sequence.fanDutyState },
    ],
    tags: ['Exploded mode', 'Service clearance', 'Constructability'],
  },
};

export function buildHvacEngineeringState(params: {
  product: Product;
  mode: HvacViewMode;
  scenario: HvacScenario;
  hoveredFocus: FocusTargetId | null;
  selectedFocus: FocusTargetId | null;
}): HvacEngineeringState {
  const { product, mode, scenario: scenarioKey, hoveredFocus, selectedFocus } = params;
  const specs = normalizeHvacSpecs(product);
  const scenario = SCENARIO_DEFINITIONS[scenarioKey];
  const metrics = buildScenarioMetrics(specs, scenario);
  const serviceMetric = buildServiceMetric(mode, scenario);
  metrics.push(serviceMetric);
  const metricMap = Object.fromEntries(metrics.map((metric) => [metric.id, metric] as const));
  const pressureLadder = buildPressureLadder(specs, scenario);
  const focusedTarget = selectedFocus ?? hoveredFocus ?? scenario.primaryFocus;
  const focusOrigin = selectedFocus ? 'selected' : hoveredFocus ? 'hovered' : 'scenario-default';
  const context: FocusTemplateContext = { specs, scenario, metrics: metricMap, pressureLadder, serviceMetric };
  const boardCards = buildBoardCards(metricMap, scenario);

  const normalScenario = SCENARIO_DEFINITIONS['normal'];
  const normalMetrics = buildScenarioMetrics(specs, normalScenario);
  const normalServiceMetric = buildServiceMetric(mode, normalScenario);
  normalMetrics.push(normalServiceMetric);
  const normalMetricMap = Object.fromEntries(normalMetrics.map((m) => [m.id, m] as const));
  const normalBaseline = buildBoardCards(normalMetricMap, normalScenario);

  return {
    mode,
    scenario: scenarioKey,
    modeMeta: MODE_META[mode],
    scenarioMeta: scenario.meta,
    focusedTarget,
    focusOrigin,
    narrative: scenario.meta.summary,
    trustBoundary:
      'Engineering-accountable conceptual viewer only. Values are traceable and thresholded, but not compliance certification, CFD, or live BMS telemetry.',
    metrics,
    boardCards,
    subsystemStates: buildSubsystemStates(metricMap, pressureLadder, serviceMetric, scenario),
    pressureLadder,
    scenarioSequence: scenario.sequence,
    assumptions: buildAssumptions(specs, scenario),
    focusDetail: buildFocusDetail(focusedTarget, context),
    complianceGate: buildComplianceGate(metrics, pressureLadder),
    airBalance: buildAirBalance(scenario),
    normalBaseline,
  };
}

function buildScenarioMetrics(specs: NormalizedHvacSpecs, scenario: ScenarioDefinition): HvacEngineeringMetric[] {
  const { metrics } = scenario;
  return [
    buildMinMetric({
      id: 'ach',
      label: 'ACH',
      actual: metrics.ach,
      target: achTargetForScenario(specs, scenario.meta.key),
      warn: achWarnForScenario(specs, scenario.meta.key),
      fail: achFailForScenario(specs, scenario.meta.key),
      unit: 'ACH',
      source: 'scenario-simulation',
      confidence: 'medium',
      note: `Target anchored to occupied baseline ${specs.airChangesLabel} and shifted by ${scenario.meta.label.toLowerCase()} sequence.`,
    }),
    buildMinMetric({
      id: 'supply-cfm',
      label: 'Supply',
      actual: metrics.supplyCfm,
      target: supplyTargetForScenario(scenario.meta.key),
      warn: supplyWarnForScenario(scenario.meta.key),
      fail: supplyFailForScenario(scenario.meta.key),
      unit: 'CFM',
      source: 'engineering-assumption',
      confidence: 'medium',
      note: 'Supply airflow is a conceptual reviewer number aligned to scenario intent, not a commissioned schedule.',
    }),
    buildMinMetric({
      id: 'return-cfm',
      label: 'Return',
      actual: metrics.returnCfm,
      target: returnTargetForScenario(scenario.meta.key),
      warn: returnWarnForScenario(scenario.meta.key),
      fail: returnFailForScenario(scenario.meta.key),
      unit: 'CFM',
      source: 'engineering-assumption',
      confidence: 'medium',
      note: 'Return airflow is derived to keep the room-balance story deterministic across scenarios.',
    }),
    buildRangeMetric({
      id: 'fresh-air-ratio',
      label: 'Fresh Air',
      actual: metrics.freshAirRatio,
      target: freshAirTargetForScenario(specs, scenario.meta.key),
      warn: freshAirWarnForScenario(specs, scenario.meta.key),
      fail: freshAirFailForScenario(specs, scenario.meta.key),
      unit: '%',
      source: 'scenario-simulation',
      confidence: 'medium',
      note: `Fresh-air band starts from ${specs.freshAirRatioLabel} and is widened only when scenario sequence requires it.`,
    }),
    buildMinMetric({
      id: 'agss-exhaust-cfm',
      label: 'AGSS / Exhaust',
      actual: metrics.agssExhaustCfm,
      target: agssTargetForScenario(scenario.meta.key),
      warn: agssWarnForScenario(scenario.meta.key),
      fail: agssFailForScenario(scenario.meta.key),
      unit: 'CFM',
      source: 'scenario-simulation',
      confidence: 'medium',
      note: 'AGSS values are scenario cues used to review subsystem separation and extraction emphasis.',
    }),
    buildMinMetric({
      id: 'pressure-or-pa',
      label: 'OR dP',
      actual: metrics.pressurePa,
      target: pressureTargetForScenario(specs, scenario.meta.key),
      warn: pressureWarnForScenario(specs, scenario.meta.key),
      fail: pressureFailForScenario(specs, scenario.meta.key),
      unit: 'Pa',
      source: 'scenario-simulation',
      confidence: 'medium',
      note: `Pressure target is anchored to ${specs.positivePressureLabel} baseline, then adjusted by scenario sequence intent.`,
    }),
    buildRangeMetric({
      id: 'temperature-c',
      label: 'Temperature',
      actual: metrics.temperatureC,
      target: specs.supplyTempRange,
      warn: { min: specs.supplyTempRange.min + 1, max: specs.supplyTempRange.max - 1 },
      fail: specs.supplyTempRange,
      unit: 'C',
      source: 'scenario-simulation',
      confidence: 'medium',
      note: `Temperature band normalized from product baseline ${specs.supplyTempLabel}.`,
    }),
    buildRangeMetric({
      id: 'humidity-rh',
      label: 'Humidity',
      actual: metrics.humidityRh,
      target: specs.humidityRange,
      warn: specs.humidityRange,
      fail: { min: specs.humidityRange.min - 5, max: specs.humidityRange.max + 5 },
      unit: '%',
      source: 'engineering-assumption',
      confidence: 'low',
      note: 'Humidity band is an engineering assumption because the product metadata does not provide an RH target.',
    }),
    buildMaxMetric({
      id: 'filter-dp-pa',
      label: 'Filter DP',
      actual: metrics.filterDpPa,
      target: 150,
      warn: 180,
      fail: 240,
      unit: 'Pa',
      source: 'engineering-assumption',
      confidence: 'medium',
      note: 'Filter DP thresholds are conceptual reviewer bands used to make dirty-filter behavior explicit.',
    }),
  ];
}

function buildPressureLadder(specs: NormalizedHvacSpecs, scenario: ScenarioDefinition): HvacSpacePressure[] {
  const ladder = scenario.pressureLadder;
  return [
    buildMinPressureStep({
      id: 'or',
      label: 'OR',
      actual: ladder.or,
      target: pressureTargetForScenario(specs, scenario.meta.key),
      warn: pressureWarnForScenario(specs, scenario.meta.key),
      fail: pressureFailForScenario(specs, scenario.meta.key),
      note: 'Primary operating-theatre differential to corridor reference.',
    }),
    buildMinPressureStep({
      id: 'anteroom',
      label: 'Anteroom',
      actual: ladder.anteroom,
      target: scenario.meta.key === 'surgery-peak' ? 3 : 2,
      warn: 1,
      fail: 0.25,
      note: 'Buffer space should remain positive to corridor and lower than OR.',
    }),
    buildMinPressureStep({
      id: 'prep-support',
      label: 'Prep / Support',
      actual: ladder['prep-support'],
      target: scenario.meta.key === 'surgery-peak' ? 2 : 1,
      warn: 0.5,
      fail: 0.1,
      note: 'Support space sits above corridor but below the OR core.',
    }),
    buildNeutralPressureStep({
      id: 'corridor',
      label: 'Corridor',
      actual: ladder.corridor,
      note: 'Corridor is the neutral reference for the conceptual pressure ladder.',
    }),
  ];
}

function buildBoardCards(
  metrics: Record<string, HvacEngineeringMetric>,
  scenario: ScenarioDefinition,
): HvacBoardCard[] {
  const thermalStatus = worstStatus([metrics['temperature-c'].status, metrics['humidity-rh'].status]);
  return [
    boardCardFromMetric(metrics['supply-cfm']),
    boardCardFromMetric(metrics['return-cfm']),
    boardCardFromMetric(metrics['fresh-air-ratio']),
    boardCardFromMetric(metrics['agss-exhaust-cfm']),
    boardCardFromMetric(metrics['ach']),
    boardCardFromMetric(metrics['pressure-or-pa']),
    {
      id: 'temperature-humidity',
      label: 'T / RH',
      value: `${metrics['temperature-c'].actual} / ${metrics['humidity-rh'].actual}`,
      target: `${metrics['temperature-c'].target} / ${metrics['humidity-rh'].target}`,
      unit: 'C/%',
      status: thermalStatus,
      source: worstSource([metrics['temperature-c'].source, metrics['humidity-rh'].source]),
      confidence: worstConfidence([metrics['temperature-c'].confidence, metrics['humidity-rh'].confidence]),
      note: 'Combined board card for thermal state readability.',
    },
    boardCardFromMetric(metrics['filter-dp-pa']),
    {
      id: 'fan-state',
      label: 'Fan State',
      value: simplifyFanState(scenario.sequence),
      target: 'Fan A duty / Fan B standby',
      unit: '',
      status: fanStatusFromSequence(scenario.sequence),
      source: 'scenario-simulation',
      confidence: 'medium',
      note: 'Duty / standby state is deterministic per scenario.',
    },
    {
      id: 'alarm-class',
      label: 'Alarm Class',
      value: titleCase(scenario.sequence.alarmClass),
      target: 'Normal',
      unit: '',
      status: alarmStatusFromClass(scenario.sequence.alarmClass),
      source: 'scenario-simulation',
      confidence: 'medium',
      note: 'Alarm class is derived from the active scenario sequence.',
    },
  ];
}

function buildComplianceGate(
  metrics: HvacEngineeringMetric[],
  pressureLadder: HvacSpacePressure[],
): HvacComplianceGate {
  const allStatuses = [
    ...metrics.map((m) => ({ id: m.id, status: m.status })),
    ...pressureLadder.map((s) => ({ id: `pressure-${s.id}`, status: s.status })),
  ];
  const passCount = allStatuses.filter((s) => s.status === 'pass').length;
  const warnCount = allStatuses.filter((s) => s.status === 'warn').length;
  const failCount = allStatuses.filter((s) => s.status === 'fail').length;
  return {
    totalMetrics: allStatuses.length,
    passCount,
    warnCount,
    failCount,
    overallStatus: failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass',
    failingMetricIds: allStatuses.filter((s) => s.status === 'fail').map((s) => s.id),
    warningMetricIds: allStatuses.filter((s) => s.status === 'warn').map((s) => s.id),
  };
}

function buildAirBalance(scenario: ScenarioDefinition): HvacAirBalance {
  const { supplyCfm, returnCfm, agssExhaustCfm } = scenario.metrics;
  const net = supplyCfm - returnCfm - agssExhaustCfm;
  const implication =
    net > 0
      ? `+${net} CFM surplus drives positive pressure (+Pa room differential)`
      : net === 0
        ? 'Balanced — no net surplus; pressure depends on leakage path'
        : `${net} CFM deficit — room may trend negative without compensation`;
  return {
    supplyCfm: `${supplyCfm} CFM`,
    returnCfm: `${returnCfm} CFM`,
    agssExhaustCfm: `${agssExhaustCfm} CFM`,
    netSurplusCfm: `${net > 0 ? '+' : ''}${net} CFM`,
    pressureImplication: implication,
  };
}

function buildSubsystemStates(
  metrics: Record<string, HvacEngineeringMetric>,
  pressureLadder: HvacSpacePressure[],
  serviceMetric: HvacEngineeringMetric,
  scenario: ScenarioDefinition,
): HvacSubsystemState[] {
  const statuses: Record<HvacSubsystemId, MetricStatus> = {
    'air-balance': worstStatus([
      metrics['ach'].status,
      metrics['supply-cfm'].status,
      metrics['return-cfm'].status,
      metrics['fresh-air-ratio'].status,
    ]),
    'pressure-cascade': worstStatus([metrics['pressure-or-pa'].status, ...pressureLadder.map((space) => space.status)]),
    filtration: worstStatus([metrics['filter-dp-pa'].status, metrics['ach'].status]),
    'controls-bms': worstStatus([
      alarmStatusFromClass(scenario.sequence.alarmClass),
      metrics['pressure-or-pa'].status,
      metrics['filter-dp-pa'].status,
    ]),
    'agss-exhaust': metrics['agss-exhaust-cfm'].status,
    maintainability: serviceMetric.status,
  };

  return (Object.keys(SUBSYSTEM_META) as HvacSubsystemId[]).map((id) => ({
    id,
    label: SUBSYSTEM_META[id].label,
    status: statuses[id],
    summary: scenario.subsystemNarratives[id],
    focusTarget: SUBSYSTEM_META[id].focusTarget,
    source: id === 'maintainability' ? 'engineering-assumption' : 'scenario-simulation',
    confidence: 'medium',
  }));
}

function buildAssumptions(specs: NormalizedHvacSpecs, scenario: ScenarioDefinition): HvacAssumption[] {
  return [
    ...specs.assumptions,
    {
      id: 'conceptual-boundary',
      title: 'Conceptual review boundary',
      detail:
        'This viewer is a traceable conceptual model with thresholds and scenario logic, not compliance certification, CFD, or live telemetry.',
      source: 'engineering-assumption',
      confidence: 'high',
    },
    {
      id: 'scenario-values',
      title: 'Scenario metrics are simulated',
      detail: `Displayed ${scenario.meta.label.toLowerCase()} numbers are scenario simulations aligned to the active viewer narrative.`,
      source: 'scenario-simulation',
      confidence: 'medium',
    },
    {
      id: 'filter-and-service',
      title: 'Filter DP and service score are review aids',
      detail: 'Filter DP and service-clearance score are conceptual reviewer metrics used to express auditability and maintainability.',
      source: 'engineering-assumption',
      confidence: 'medium',
    },
    {
      id: 'pressure-ladder-scope',
      title: 'Pressure ladder scope follows active scene geometry',
      detail: 'Pressure ladder is limited to OR, anteroom, prep/support, and corridor because those are the active modeled spaces.',
      source: 'scenario-simulation',
      confidence: 'high',
    },
  ];
}

function buildFocusDetail(target: FocusTargetId, context: FocusTemplateContext): HvacFocusDetail {
  const template = FOCUS_TEMPLATES[target];
  return {
    id: template.id,
    code: template.code,
    title: template.title,
    subsystemId: template.subsystemId,
    system: template.system,
    summary: template.summary,
    target: template.target(context),
    actual: template.actual(context),
    thresholds: template.thresholds(context),
    failureConsequence: template.failureConsequence,
    maintenanceImplication: template.maintenanceImplication,
    source: template.source,
    confidence: template.confidence,
    note: template.note(context),
    evidenceRows: template.evidenceRows(context),
    tags: template.tags,
  };
}

function normalizeHvacSpecs(product: Product): NormalizedHvacSpecs {
  const source = product.hvacSpecs;
  const airChanges = parseFirstNumber(source?.airChanges, 20);
  const pressure = parseSignedNumber(source?.positivePresure, 8);
  const supplyTempRange = parseRange(source?.supplyTemp, { min: 18, max: 24 });
  const freshAirRatioRange = parseRange(source?.freshAirRatio, { min: 20, max: 30 });

  return {
    standard: source?.standard ?? DEFAULT_SPEC_FALLBACK.standard,
    airChanges,
    airChangesLabel: source?.airChanges ?? DEFAULT_SPEC_FALLBACK.airChanges,
    positivePressurePa: pressure,
    positivePressureLabel: source?.positivePresure ?? DEFAULT_SPEC_FALLBACK.positivePressure,
    supplyTempRange,
    supplyTempLabel: source?.supplyTemp ?? DEFAULT_SPEC_FALLBACK.supplyTemp,
    freshAirRatioRange,
    freshAirRatioLabel: source?.freshAirRatio ?? DEFAULT_SPEC_FALLBACK.freshAirRatio,
    hepaFilter: source?.hepaFilter ?? DEFAULT_SPEC_FALLBACK.hepaFilter,
    coolingCapacity: source?.coolingCapacity ?? DEFAULT_SPEC_FALLBACK.coolingCapacity,
    humidityRange: { min: 45, max: 55 },
    humidityLabel: '45-55%',
    assumptions: [
      {
        id: 'spec-standard',
        title: 'Baseline standard reference',
        detail: `Product metadata cites ${source?.standard ?? DEFAULT_SPEC_FALLBACK.standard}.`,
        source: 'spec-derived',
        confidence: 'high',
      },
      {
        id: 'spec-ach',
        title: 'Occupied ACH baseline',
        detail: `ACH target normalized from product metadata value ${source?.airChanges ?? DEFAULT_SPEC_FALLBACK.airChanges}.`,
        source: 'spec-derived',
        confidence: 'high',
      },
      {
        id: 'spec-pressure',
        title: 'Positive pressure baseline',
        detail: `Pressure target normalized from ${source?.positivePresure ?? DEFAULT_SPEC_FALLBACK.positivePressure}.`,
        source: 'spec-derived',
        confidence: 'high',
      },
      {
        id: 'assumed-humidity-band',
        title: 'Humidity target is assumed',
        detail: 'Product metadata has no RH band, so 45-55% is introduced as an engineering assumption for audit readability.',
        source: 'engineering-assumption',
        confidence: 'low',
      },
    ],
  };
}

function buildServiceMetric(mode: HvacViewMode, scenario: ScenarioDefinition): HvacEngineeringMetric {
  const actual = mode === 'exploded' ? (scenario.meta.key === 'fault' ? 84 : 94) : scenario.meta.key === 'fault' ? 78 : 88;
  return buildMinMetric({
    id: 'service-clearance-score',
    label: 'Service Score',
    actual,
    target: 90,
    warn: 80,
    fail: 65,
    unit: '/100',
    source: 'engineering-assumption',
    confidence: 'medium',
    note: 'Conceptual maintainability score summarizing clearance, coil pull, fan removal, and plenum readability.',
  });
}

function buildMinMetric(config: {
  id: string;
  label: string;
  actual: number;
  target: number;
  warn: number;
  fail: number;
  unit: string;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  note: string;
}): HvacEngineeringMetric {
  return {
    id: config.id,
    label: config.label,
    target: formatMetricValue(config.target, config.unit),
    actual: formatMetricValue(config.actual, config.unit),
    unit: config.unit,
    warn: formatMetricValue(config.warn, config.unit),
    fail: formatMetricValue(config.fail, config.unit),
    status: config.actual < config.fail ? 'fail' : config.actual < config.warn ? 'warn' : 'pass',
    source: config.source,
    confidence: config.confidence,
    note: config.note,
  };
}

function buildMaxMetric(config: {
  id: string;
  label: string;
  actual: number;
  target: number;
  warn: number;
  fail: number;
  unit: string;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  note: string;
}): HvacEngineeringMetric {
  return {
    id: config.id,
    label: config.label,
    target: formatMetricValue(config.target, config.unit),
    actual: formatMetricValue(config.actual, config.unit),
    unit: config.unit,
    warn: formatMetricValue(config.warn, config.unit),
    fail: formatMetricValue(config.fail, config.unit),
    status: config.actual > config.fail ? 'fail' : config.actual > config.warn ? 'warn' : 'pass',
    source: config.source,
    confidence: config.confidence,
    note: config.note,
  };
}

function buildRangeMetric(config: {
  id: string;
  label: string;
  actual: number;
  target: NumericRange;
  warn: NumericRange;
  fail: NumericRange;
  unit: string;
  source: ProvenanceSource;
  confidence: ConfidenceLevel;
  note: string;
}): HvacEngineeringMetric {
  return {
    id: config.id,
    label: config.label,
    target: formatRangeValue(config.target, config.unit),
    actual: formatMetricValue(config.actual, config.unit),
    unit: config.unit,
    warn: formatRangeValue(config.warn, config.unit),
    fail: formatRangeValue(config.fail, config.unit),
    status:
      config.actual < config.fail.min || config.actual > config.fail.max
        ? 'fail'
        : config.actual < config.warn.min || config.actual > config.warn.max
          ? 'warn'
          : 'pass',
    source: config.source,
    confidence: config.confidence,
    note: config.note,
  };
}

function buildMinPressureStep(config: {
  id: HvacSpaceId;
  label: string;
  actual: number;
  target: number;
  warn: number;
  fail: number;
  note: string;
}): HvacSpacePressure {
  return {
    id: config.id,
    label: config.label,
    target: formatMetricValue(config.target, 'Pa'),
    actual: formatMetricValue(config.actual, 'Pa'),
    unit: 'Pa',
    warn: formatMetricValue(config.warn, 'Pa'),
    fail: formatMetricValue(config.fail, 'Pa'),
    status: config.actual < config.fail ? 'fail' : config.actual < config.warn ? 'warn' : 'pass',
    source: 'scenario-simulation',
    confidence: 'medium',
    note: config.note,
  };
}

function buildNeutralPressureStep(config: {
  id: HvacSpaceId;
  label: string;
  actual: number;
  note: string;
}): HvacSpacePressure {
  const delta = Math.abs(config.actual);
  return {
    id: config.id,
    label: config.label,
    target: formatMetricValue(0, 'Pa'),
    actual: formatMetricValue(config.actual, 'Pa'),
    unit: 'Pa',
    warn: '+/-0.75 Pa',
    fail: '+/-1.5 Pa',
    status: delta > 1.5 ? 'fail' : delta > 0.75 ? 'warn' : 'pass',
    source: 'scenario-simulation',
    confidence: 'medium',
    note: config.note,
  };
}

function boardCardFromMetric(metric: HvacEngineeringMetric): HvacBoardCard {
  return {
    id: metric.id,
    label: metric.label,
    value: metric.actual,
    target: metric.target,
    unit: metric.unit,
    status: metric.status,
    source: metric.source,
    confidence: metric.confidence,
    note: metric.note,
  };
}

function pressureTargetForScenario(specs: NormalizedHvacSpecs, scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return Math.max(specs.positivePressurePa + 2, 10);
    case 'purge':
      return Math.max(specs.positivePressurePa - 2, 6);
    case 'setback':
      return Math.max(specs.positivePressurePa - 4, 4);
    default:
      return specs.positivePressurePa;
  }
}

function pressureWarnForScenario(specs: NormalizedHvacSpecs, scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return Math.max(specs.positivePressurePa, 8);
    case 'purge':
      return 4;
    case 'setback':
      return 3;
    default:
      return Math.max(specs.positivePressurePa - 2, 6);
  }
}

function pressureFailForScenario(specs: NormalizedHvacSpecs, scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return Math.max(specs.positivePressurePa - 2, 6);
    case 'purge':
      return 2;
    case 'setback':
      return 1.5;
    default:
      return Math.max(specs.positivePressurePa - 5, 3);
  }
}

function achTargetForScenario(specs: NormalizedHvacSpecs, scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return Math.max(specs.airChanges + 5, 25);
    case 'purge':
      return Math.max(specs.airChanges + 10, 30);
    case 'setback':
      return 12;
    default:
      return specs.airChanges;
  }
}

function achWarnForScenario(specs: NormalizedHvacSpecs, scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return Math.max(specs.airChanges + 3, 23);
    case 'purge':
      return Math.max(specs.airChanges + 6, 26);
    case 'setback':
      return 10;
    default:
      return Math.max(specs.airChanges - 2, 18);
  }
}

function achFailForScenario(specs: NormalizedHvacSpecs, scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return Math.max(specs.airChanges, 20);
    case 'purge':
      return Math.max(specs.airChanges + 2, 22);
    case 'setback':
      return 8;
    default:
      return Math.max(specs.airChanges - 5, 15);
  }
}

function supplyTargetForScenario(scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return 3600;
    case 'purge':
      return 4000;
    case 'setback':
      return 2200;
    default:
      return 3200;
  }
}

function supplyWarnForScenario(scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return 3400;
    case 'purge':
      return 3600;
    case 'setback':
      return 2000;
    default:
      return 3000;
  }
}

function supplyFailForScenario(scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return 3000;
    case 'purge':
      return 3200;
    case 'setback':
      return 1700;
    default:
      return 2700;
  }
}

function returnTargetForScenario(scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return 2740;
    case 'purge':
      return 2950;
    case 'setback':
      return 1600;
    default:
      return 2450;
  }
}

function returnWarnForScenario(scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return 2500;
    case 'purge':
      return 2700;
    case 'setback':
      return 1450;
    default:
      return 2300;
  }
}

function returnFailForScenario(scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return 2200;
    case 'purge':
      return 2400;
    case 'setback':
      return 1200;
    default:
      return 2000;
  }
}

function freshAirTargetForScenario(specs: NormalizedHvacSpecs, scenario: HvacScenario): NumericRange {
  switch (scenario) {
    case 'surgery-peak':
      return { min: specs.freshAirRatioRange.min + 2, max: specs.freshAirRatioRange.max };
    case 'purge':
      return { min: specs.freshAirRatioRange.min + 5, max: specs.freshAirRatioRange.max + 5 };
    default:
      return specs.freshAirRatioRange;
  }
}

function freshAirWarnForScenario(specs: NormalizedHvacSpecs, scenario: HvacScenario): NumericRange {
  switch (scenario) {
    case 'purge':
      return { min: specs.freshAirRatioRange.min, max: specs.freshAirRatioRange.max + 5 };
    default:
      return specs.freshAirRatioRange;
  }
}

function freshAirFailForScenario(specs: NormalizedHvacSpecs, scenario: HvacScenario): NumericRange {
  switch (scenario) {
    case 'purge':
      return { min: specs.freshAirRatioRange.min - 2, max: specs.freshAirRatioRange.max + 8 };
    default:
      return { min: specs.freshAirRatioRange.min - 4, max: specs.freshAirRatioRange.max + 8 };
  }
}

function agssTargetForScenario(scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return 460;
    case 'purge':
      return 600;
    case 'setback':
      return 240;
    default:
      return 420;
  }
}

function agssWarnForScenario(scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return 420;
    case 'purge':
      return 520;
    case 'setback':
      return 220;
    default:
      return 360;
  }
}

function agssFailForScenario(scenario: HvacScenario): number {
  switch (scenario) {
    case 'surgery-peak':
      return 360;
    case 'purge':
      return 430;
    case 'setback':
      return 180;
    default:
      return 280;
  }
}

function simplifyFanState(sequence: HvacScenarioSequence): string {
  if (sequence.alarmClass === 'critical') return 'Fan B duty / Fan A failed';
  if (sequence.alarmClass === 'advisory') return 'Fan A turndown';
  return 'Fan A duty / Fan B standby';
}

function fanStatusFromSequence(sequence: HvacScenarioSequence): MetricStatus {
  if (sequence.alarmClass === 'critical') return 'fail';
  if (sequence.alarmClass === 'advisory') return 'warn';
  return 'pass';
}

function alarmStatusFromClass(alarmClass: AlarmClass): MetricStatus {
  switch (alarmClass) {
    case 'critical':
      return 'fail';
    case 'advisory':
    case 'warning':
      return 'warn';
    default:
      return 'pass';
  }
}

function worstStatus(statuses: MetricStatus[]): MetricStatus {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warn')) return 'warn';
  return 'pass';
}

function worstSource(sources: ProvenanceSource[]): ProvenanceSource {
  if (sources.includes('placeholder')) return 'placeholder';
  if (sources.includes('engineering-assumption')) return 'engineering-assumption';
  if (sources.includes('scenario-simulation')) return 'scenario-simulation';
  return 'spec-derived';
}

function worstConfidence(confidences: ConfidenceLevel[]): ConfidenceLevel {
  if (confidences.includes('low')) return 'low';
  if (confidences.includes('medium')) return 'medium';
  return 'high';
}

function formatMetricValue(value: number, unit: string): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  const signed = unit === 'Pa' && value > 0 ? `+${rounded}` : rounded;
  if (unit === '%' || unit === '/100') return `${signed}${unit}`;
  return `${signed} ${unit}`;
}

function formatRangeValue(range: NumericRange, unit: string): string {
  const min = Number.isInteger(range.min) ? String(range.min) : range.min.toFixed(1);
  const max = Number.isInteger(range.max) ? String(range.max) : range.max.toFixed(1);
  if (unit === '%' || unit === '/100') return `${min}-${max}${unit}`;
  return `${min}-${max} ${unit}`;
}

function titleCase(value: string): string {
  return value
    .split(/[\s/-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function parseFirstNumber(input: string | undefined, fallback: number): number {
  const matches = String(input ?? '').match(/-?\d+(?:\.\d+)?/g);
  return matches?.length ? Number(matches[0]) : fallback;
}

function parseSignedNumber(input: string | undefined, fallback: number): number {
  const matches = String(input ?? '').match(/[+-]?\d+(?:\.\d+)?/g);
  return matches?.length ? Number(matches[0]) : fallback;
}

function parseRange(input: string | undefined, fallback: NumericRange): NumericRange {
  const matches = String(input ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (matches.length >= 2) return { min: matches[0], max: matches[1] };
  if (matches.length === 1) return { min: matches[0], max: matches[0] };
  return fallback;
}

function validateScenarioDefinitions(): void {
  const requiredSpaces: HvacSpaceId[] = ['or', 'anteroom', 'prep-support', 'corridor'];
  const requiredSubsystems: HvacSubsystemId[] = [
    'air-balance',
    'pressure-cascade',
    'filtration',
    'controls-bms',
    'agss-exhaust',
    'maintainability',
  ];

  for (const scenarioKey of SCENARIO_ORDER) {
    const scenario = SCENARIO_DEFINITIONS[scenarioKey];
    if (!scenario.sequence.fanDutyState || !scenario.sequence.damperIntent || !scenario.sequence.pressureEffect) {
      throw new Error(`HVAC contract: scenario ${scenarioKey} is missing deterministic sequence fields.`);
    }

    const values = Object.values(scenario.metrics);
    if (values.some((value) => typeof value !== 'number' || Number.isNaN(value))) {
      throw new Error(`HVAC contract: scenario ${scenarioKey} omits required engineering metric values.`);
    }

    for (const space of requiredSpaces) {
      if (typeof scenario.pressureLadder[space] !== 'number') {
        throw new Error(`HVAC contract: scenario ${scenarioKey} is missing pressure ladder value for ${space}.`);
      }
    }
    if (!(scenario.pressureLadder.or > scenario.pressureLadder.anteroom)) {
      throw new Error(`HVAC contract: scenario ${scenarioKey} has invalid OR to anteroom pressure ordering.`);
    }
    if (!(scenario.pressureLadder.anteroom >= scenario.pressureLadder.corridor)) {
      throw new Error(`HVAC contract: scenario ${scenarioKey} has invalid anteroom to corridor pressure ordering.`);
    }
    if (!(scenario.pressureLadder['prep-support'] >= scenario.pressureLadder.corridor)) {
      throw new Error(`HVAC contract: scenario ${scenarioKey} has invalid prep/support to corridor pressure ordering.`);
    }

    for (const subsystem of requiredSubsystems) {
      if (!scenario.subsystemNarratives[subsystem]) {
        throw new Error(`HVAC contract: scenario ${scenarioKey} is missing subsystem narrative for ${subsystem}.`);
      }
    }

    const specs = normalizeHvacSpecs({ hvacSpecs: undefined } as Product);
    const metrics = buildScenarioMetrics(specs, scenario);
    const serviceMetric = buildServiceMetric('full', scenario);
    const metricMap = Object.fromEntries([...metrics, serviceMetric].map((metric) => [metric.id, metric] as const));
    const pressureLadder = buildPressureLadder(specs, scenario);
    const context: FocusTemplateContext = { specs, scenario, metrics: metricMap, pressureLadder, serviceMetric };

    for (const target of Object.keys(FOCUS_TEMPLATES) as FocusTargetId[]) {
      const detail = buildFocusDetail(target, context);
      if (
        !detail.target ||
        !detail.actual ||
        !detail.thresholds ||
        !detail.failureConsequence ||
        !detail.maintenanceImplication ||
        !detail.source ||
        !detail.confidence
      ) {
        throw new Error(`HVAC contract: focus detail ${target} lacks required accountability fields.`);
      }
    }
  }
}

validateScenarioDefinitions();
