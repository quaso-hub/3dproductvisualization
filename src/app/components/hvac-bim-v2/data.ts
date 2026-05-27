import type { Product } from '../../data/products';
import type {
  CalloutSpec,
  EngineeringObject,
  FocusPickerItem,
  FocusTargetId,
  HvacModeMeta,
  HvacScenario,
  HvacViewMode,
  OverlayInspectorState,
  ScenarioProfile,
} from './types';

export const MODE_META: Record<HvacViewMode, HvacModeMeta> = {
  full: {
    key: 'full',
    label: 'Full System',
    toneClass: 'bg-sky-600 text-white',
    description: 'Integrated operating-theatre HVAC narrative with pressure cascade, AHU treatment, AGSS, controls, and service logic in one coordinated BIM view.',
    callout: 'Read the whole system first. Deep detail stays in the inspector or on focused subsystems so the model silhouette remains readable.',
  },
  supply: {
    key: 'supply',
    label: 'Supply Air',
    toneClass: 'bg-cyan-500 text-white',
    description: 'Outside air intake, mixing, staged filtration, fan duty path, terminal plenum, and HEPA canopy are prioritized.',
    callout: 'This view follows the clean-air chain from weather hood and mixing box through treatment and down to the sterile field.',
  },
  return: {
    key: 'return',
    label: 'Return Air',
    toneClass: 'bg-rose-400 text-white',
    description: 'Low-wall return sweep, separated AGSS discharge, and room pressure relationships are emphasized.',
    callout: 'This view explains how the room collects contamination without confusing OR return with dedicated waste-gas exhaust.',
  },
  refrigerant: {
    key: 'refrigerant',
    label: 'DX Circuit',
    toneClass: 'bg-amber-400 text-slate-900',
    description: 'DX condensing unit, riser, liquid and suction lines, service valves, and oil-trap logic are isolated.',
    callout: 'The plant basis is locked to DX, so piping, service access, and fault narrative stay consistent with the active product data.',
  },
  plan: {
    key: 'plan',
    label: 'Plan View',
    toneClass: 'bg-slate-600 text-white',
    description: 'Top-down BIM coordination view for zoning, pressure cascade, return placement, and plenum congestion reading.',
    callout: 'This view stays sparse on labels so you can read room relationships and routing at coordination speed.',
  },
  exploded: {
    key: 'exploded',
    label: 'Exploded',
    toneClass: 'bg-emerald-500 text-white',
    description: 'Service clearances, maintenance envelopes, hidden routes, and layered plenum relationships are separated vertically.',
    callout: 'Use this view to audit access, removal path, supports, and the engineering story hidden behind normal operation.',
  },
  catalog: {
    key: 'catalog',
    label: 'Catalog',
    toneClass: 'bg-indigo-600 text-white',
    description: 'Clean showcase view optimized for print catalogs and client presentations — minimal annotations, full equipment visibility.',
    callout: 'Product catalog rendering with photorealistic tone mapping and clean composition for hospital pitches.',
  },
};

export const MODE_ORDER: HvacViewMode[] = ['full', 'supply', 'return', 'refrigerant', 'plan', 'exploded', 'catalog'];

export const SCENARIO_PROFILES: Record<HvacScenario, ScenarioProfile> = {
  normal: {
    key: 'normal',
    label: 'Normal',
    toneClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    description: 'Occupied operating-theatre baseline with positive pressure and nominal filter condition.',
    summary: 'Balanced positive-pressure operation for active theatre occupancy.',
    metrics: [
      { label: 'ACH', value: '20 ACH', state: 'nominal' },
      { label: 'Supply', value: '3200 CFM', state: 'nominal' },
      { label: 'Return', value: '2450 CFM', state: 'nominal' },
      { label: 'AGSS/Exh', value: '420 CFM', state: 'nominal' },
      { label: 'dP OR', value: '+8 Pa', state: 'nominal' },
      { label: 'T / RH', value: '20-22 C / 45-55%', state: 'nominal' },
    ],
    alerts: ['Fan A duty / Fan B standby', 'Filter DP normal', 'Room pressure stable'],
  },
  'surgery-peak': {
    key: 'surgery-peak',
    label: 'Surgery Peak',
    toneClass: 'bg-sky-100 text-sky-700 border-sky-200',
    description: 'Higher clean-air delivery during peak surgical load with stronger sterile canopy protection.',
    summary: 'High airflow and tight pressure control during active surgical procedures.',
    metrics: [
      { label: 'ACH', value: '25 ACH', state: 'nominal' },
      { label: 'Supply', value: '3600 CFM', state: 'nominal' },
      { label: 'Return', value: '2740 CFM', state: 'nominal' },
      { label: 'AGSS/Exh', value: '460 CFM', state: 'nominal' },
      { label: 'dP OR', value: '+10 Pa', state: 'nominal' },
      { label: 'T / RH', value: '20 C / 45-50%', state: 'nominal' },
    ],
    alerts: ['Canopy velocity elevated', 'Outdoor air damper opens wider', 'Particle trend watched closely'],
  },
  purge: {
    key: 'purge',
    label: 'Purge',
    toneClass: 'bg-violet-100 text-violet-700 border-violet-200',
    description: 'Temporary high-flush condition for recovery, cleanup, or contamination reset while keeping directional control.',
    summary: 'High air-change flush with reinforced exhaust and relief narrative.',
    metrics: [
      { label: 'ACH', value: '30 ACH', state: 'warning' },
      { label: 'Supply', value: '4000 CFM', state: 'warning' },
      { label: 'Return', value: '2950 CFM', state: 'warning' },
      { label: 'AGSS/Exh', value: '620 CFM', state: 'warning' },
      { label: 'dP OR', value: '+6 Pa', state: 'warning' },
      { label: 'T / RH', value: '19-21 C / 40-50%', state: 'warning' },
    ],
    alerts: ['Return and exhaust boosted', 'Relief path active', 'Not a comfort-optimized state'],
  },
  setback: {
    key: 'setback',
    label: 'Setback',
    toneClass: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Reduced-load standby while preserving minimum positive pressure and equipment readiness.',
    summary: 'Energy-reduced standby with minimum clean and pressure safeguards retained.',
    metrics: [
      { label: 'ACH', value: '12 ACH', state: 'warning' },
      { label: 'Supply', value: '2200 CFM', state: 'warning' },
      { label: 'Return', value: '1600 CFM', state: 'warning' },
      { label: 'AGSS/Exh', value: '260 CFM', state: 'warning' },
      { label: 'dP OR', value: '+4 Pa', state: 'warning' },
      { label: 'T / RH', value: '21-23 C / 45-60%', state: 'nominal' },
    ],
    alerts: ['Fan turndown active', 'Canopy held ready', 'Pressure still positive to adjacent spaces'],
  },
  fault: {
    key: 'fault',
    label: 'Fault / Alarm',
    toneClass: 'bg-rose-100 text-rose-700 border-rose-200',
    description: 'Dirty filter and duty-fan transfer condition for alarm and resilience narrative.',
    summary: 'Commissioning-style alarm state with degraded but visible fallback behavior.',
    metrics: [
      { label: 'ACH', value: '18 ACH', state: 'alarm' },
      { label: 'Supply', value: '2800 CFM', state: 'alarm' },
      { label: 'Return', value: '2100 CFM', state: 'warning' },
      { label: 'AGSS/Exh', value: '420 CFM', state: 'nominal' },
      { label: 'dP OR', value: '+2 Pa', state: 'alarm' },
      { label: 'T / RH', value: '23 C / 58%', state: 'warning' },
    ],
    alerts: ['Fan A failed, Fan B duty', 'Dirty filter DP alarm', 'Pressure trending below target'],
  },
};

export const SCENARIO_ORDER: HvacScenario[] = ['normal', 'surgery-peak', 'purge', 'setback', 'fault'];

export const MODE_FOCUS_CLUSTERS: Partial<Record<HvacViewMode, FocusTargetId[]>> = {
  supply: ['mixing-box', 'ahu-treatment', 'laf-canopy'],
  return: ['return-sweep', 'agss-exhaust', 'pressure-cascade'],
  refrigerant: ['dx-circuit'],
  plan: ['pressure-cascade'],
  exploded: ['service-access', 'ahu-treatment', 'controls-bms'],
  catalog: [],
};

export const ENGINEERING_OBJECTS: Record<FocusTargetId, EngineeringObject> = {
  'pressure-cascade': {
    id: 'pressure-cascade',
    code: 'OR-01 / ZN-01',
    title: 'Pressure Cascade and Zoning',
    system: 'Room relationships',
    summary: 'Positive OR pressure leaks outward to the anteroom before corridor neutral, keeping contamination migration controlled and auditable.',
    rows: [
      { label: 'OR target', value: '+8 Pa vs corridor' },
      { label: 'Anteroom', value: '+2 Pa buffer' },
      { label: 'Room class', value: 'OR ISO 7 support narrative' },
      { label: 'Sweep intent', value: 'Canopy center to low-wall perimeter' },
    ],
    maintenance: 'Verify pressure monitor calibration and door-underflow assumptions during commissioning rounds.',
    failure: 'If room pressure drops toward zero, outward leakage is lost and the theatre no longer reads as protected.',
    compliance: ['ASHRAE 170 pressure relationship narrative', 'FGI adjacency logic', 'Positive OR operational intent'],
  },
  'ahu-treatment': {
    id: 'ahu-treatment',
    code: 'AHU-01',
    title: 'Staged Treatment AHU',
    system: 'Primary air treatment',
    summary: 'The AHU stages G4 and F7 filtration, DX cooling coil, humidification section, UV-C treatment, drain pan, and duty/standby fan logic.',
    rows: [
      { label: 'Filters', value: 'G4 pre-filter + F7 fine filter' },
      { label: 'Cooling', value: 'DX coil fed from CDU-01' },
      { label: 'Humidity', value: 'Steam / RH trim section' },
      { label: 'Fans', value: 'Fan A duty / Fan B standby' },
      { label: 'Drain', value: 'Stainless pan + P-trap' },
    ],
    maintenance: 'Front service face reserves filter pull-out, coil access, UV access, and fan changeover working room.',
    failure: 'Dirty filter or fan loss pushes pressure and ACH below surgical target even if AGSS remains healthy.',
    compliance: ['Staged filtration logic', 'Drain and access narrative', 'Redundancy visible for commissioning'],
  },
  'mixing-box': {
    id: 'mixing-box',
    code: 'MB-01',
    title: 'Outside Air and Mixing Logic',
    system: 'Outdoor air / recirculation',
    summary: 'Weather hood intake, OAD/RAD/EAD dampers, and actuator positions show how outdoor air, recirculation, and relief interact.',
    rows: [
      { label: 'Outdoor air', value: '20-30% of total supply' },
      { label: 'Dampers', value: 'OAD / RAD / EAD with actuator cues' },
      { label: 'Fail state', value: 'Relief opens wider during purge' },
      { label: 'Device tags', value: 'VCD / FD / FSD positions visible' },
    ],
    maintenance: 'Actuator service and damper blade inspection need front and top access, not hidden in a decorative box.',
    failure: 'Bad damper positioning corrupts pressure, fresh-air ratio, and purge behavior even if the AHU body looks healthy.',
    compliance: ['Outdoor air control narrative', 'Damper/device realism', 'Relief path shown as part of the system'],
  },
  'laf-canopy': {
    id: 'laf-canopy',
    code: 'LAF-01',
    title: 'Sterile Canopy and Supply Delivery',
    system: 'Terminal supply',
    summary: 'Terminal plenum feeds a HEPA H14 canopy above the sterile zone, showing downward clean sweep and canopy boundary control.',
    rows: [
      { label: 'Filter', value: 'HEPA H14 final stage' },
      { label: 'Velocity', value: '0.25-0.45 m/s design band' },
      { label: 'Coverage', value: 'Canopy over operating table' },
      { label: 'Main duct', value: '600 x 300 supply main' },
      { label: 'Terminal', value: 'Transitional plenum above canopy' },
    ],
    maintenance: 'Terminal plenum panels and ceiling-side access are needed for filter replacement and leakage inspection.',
    failure: 'If canopy velocity falls or filters load up, sterile field protection is the first thing that degrades.',
    compliance: ['HEPA final delivery narrative', 'Sterile zone emphasis', 'Visible supply path continuity'],
  },
  'return-sweep': {
    id: 'return-sweep',
    code: 'RA-01',
    title: 'Low-Wall Return Sweep',
    system: 'Return air',
    summary: 'Low-wall grilles pull air from the room perimeter, keeping the central sterile canopy dominant while collecting contamination low and away.',
    rows: [
      { label: 'Grilles', value: '6 low-wall returns' },
      { label: 'Return main', value: '550 x 250 return main' },
      { label: 'Collection intent', value: 'Perimeter sweep away from field' },
      { label: 'Separation', value: 'Dedicated AGSS path kept distinct' },
    ],
    maintenance: 'Return grilles, damper access, and cleanout points stay visible for lifecycle and balancing review.',
    failure: 'If return collection is weak or misplaced, sweep pattern becomes symbolic instead of clinically convincing.',
    compliance: ['Low-wall return narrative', 'Directional sweep clarity', 'Return not confused with AGSS'],
  },
  'agss-exhaust': {
    id: 'agss-exhaust',
    code: 'AGSS-01',
    title: 'Dedicated AGSS and Exhaust',
    system: 'Waste anesthetic gas',
    summary: 'The AGSS path is traceable from pickup to inline fan to roof discharge, separated from normal return so waste gas handling stays legible.',
    rows: [
      { label: 'Pickup', value: 'Dedicated point near anesthesia zone' },
      { label: 'Inline fan', value: 'Traceable boosted discharge path' },
      { label: 'Discharge', value: 'Roof stack with visible termination' },
      { label: 'Narrative', value: 'Separated from OR return path' },
    ],
    maintenance: 'Inspect pickup integrity, fan access, and discharge routing as a dedicated medical-safety path.',
    failure: 'If AGSS is visually or physically merged with return, the waste-gas safety story becomes misleading.',
    compliance: ['OSHA waste-gas control narrative', 'Dedicated scavenging path', 'Safe discharge intent'],
  },
  'dx-circuit': {
    id: 'dx-circuit',
    code: 'CDU-01',
    title: 'DX Plant and Service Logic',
    system: 'Cooling plant',
    summary: 'The DX circuit ties CDU-01 to the AHU cooling coil with liquid and suction lines, insulation, oil trap, and service valve narrative.',
    rows: [
      { label: 'Plant basis', value: 'DX / R-410A condensing unit' },
      { label: 'Cooling duty', value: '8 kW outdoor unit' },
      { label: 'Lines', value: 'Liquid + insulated suction riser' },
      { label: 'Service', value: 'Isolation + expansion valves' },
      { label: 'Riser detail', value: 'Oil-trap logic visible' },
    ],
    maintenance: 'Clear access is reserved for valve service, condenser cleaning, and coil-side inspection.',
    failure: 'Loss of condenser duty or poor refrigerant service practice immediately undermines temperature and humidity control.',
    compliance: ['DX basis aligned to product data', 'Service realism visible', 'Cooling narrative no longer generic'],
  },
  'controls-bms': {
    id: 'controls-bms',
    code: 'BMS-01',
    title: 'Controls, Sensors, and Alarms',
    system: 'Instrumentation',
    summary: 'Pressure, T/RH, particle, dirty-filter, and duty/standby status signals move engineering depth into an auditable control layer.',
    rows: [
      { label: 'Sensors', value: 'Pressure, T/RH, particle, DP' },
      { label: 'Panel', value: 'BMS / HTM panel with trend cues' },
      { label: 'Alarm logic', value: 'Dirty filter / low pressure / fan transfer' },
      { label: 'Commissioning', value: 'Pass/fail style operating cues' },
    ],
    maintenance: 'Sensor calibration and alarm verification are part of readiness, not decorative extras.',
    failure: 'Without a visible control layer, the model over-promises hospital readiness and hides operational risk.',
    compliance: ['Commissioning readability', 'Alarm layer visible', 'Instrumentation tied to operating states'],
  },
  'service-access': {
    id: 'service-access',
    code: 'MA-01',
    title: 'Constructability and Service Envelopes',
    system: 'Maintenance and BIM coordination',
    summary: 'Exploded view reveals plenum congestion, hanger logic, front service clearance, coil pull direction, and fan removal path.',
    rows: [
      { label: 'Front clearance', value: 'AHU face reserved for service' },
      { label: 'Coil pull', value: 'Straight maintenance path shown' },
      { label: 'Fan removal', value: 'Duty/standby section accessible' },
      { label: 'Supports', value: 'Hangers and rails visibly coordinated' },
      { label: 'Levels', value: 'Main ducts tagged by elevation' },
    ],
    maintenance: 'This is the lifecycle view: enough room to replace filters, coils, fans, and inspect supports.',
    failure: 'If service envelopes vanish, the model looks finished while remaining unbuildable or unmaintainable.',
    compliance: ['BIM coordination narrative', 'Lifecycle realism', 'Maintenance shown as part of design quality'],
  },
};

export const FOCUS_PICKER_ITEMS: FocusPickerItem[] = [
  { id: 'pressure-cascade', shortLabel: 'Pressure' },
  { id: 'ahu-treatment', shortLabel: 'AHU' },
  { id: 'mixing-box', shortLabel: 'Mixing' },
  { id: 'laf-canopy', shortLabel: 'LAF' },
  { id: 'return-sweep', shortLabel: 'Return' },
  { id: 'agss-exhaust', shortLabel: 'AGSS' },
  { id: 'dx-circuit', shortLabel: 'DX' },
  { id: 'controls-bms', shortLabel: 'Controls' },
  { id: 'service-access', shortLabel: 'Service' },
];

export const LEGEND_ITEMS = [
  { colorClass: 'bg-cyan-400', label: 'Supply / HEPA' },
  { colorClass: 'bg-rose-300', label: 'Return' },
  { colorClass: 'bg-teal-400', label: 'Outside Air' },
  { colorClass: 'bg-orange-400', label: 'AGSS / Exhaust' },
  { colorClass: 'bg-amber-400', label: 'DX / Service' },
  { colorClass: 'bg-violet-500', label: 'Sensors / Alarm' },
] as const;

export const CALLOUT_SPECS: CalloutSpec[] = [
  { id: 'full-or-anchor', targetId: 'pressure-cascade', text: 'OR-01 +8 Pa', position: [-2.2, 2.84, -2.35], accent: '#22c55e', modes: ['full', 'catalog'], trigger: 'always', priority: 'anchor' },
  { id: 'full-ahu-anchor', targetId: 'ahu-treatment', text: 'AHU-01 staged treatment', position: [5.0, 3.08, 1.08], accent: '#22c55e', modes: ['full', 'catalog'], trigger: 'always', priority: 'anchor' },
  { id: 'full-mb-anchor', targetId: 'mixing-box', text: 'MB-01 OAI / recirc', position: [5.15, 2.6, -0.58], accent: '#0f766e', modes: ['full'], trigger: 'always', priority: 'anchor' },
  { id: 'full-laf-anchor', targetId: 'laf-canopy', text: 'LAF-01 HEPA canopy', position: [-0.7, 3.12, 1.15], accent: '#22d3ee', modes: ['full', 'catalog'], trigger: 'always', priority: 'anchor' },
  { id: 'full-return-anchor', targetId: 'return-sweep', text: 'RA-01 / AGSS-01', position: [-0.1, 1.06, 2.22], accent: '#fb7185', modes: ['full'], trigger: 'always', priority: 'anchor' },
  { id: 'full-cdu-anchor', targetId: 'dx-circuit', text: 'CDU-01 DX condensing unit', position: [5.82, 4.38, 0.95], accent: '#f59e0b', modes: ['full', 'catalog'], trigger: 'always', priority: 'anchor' },

  { id: 'supply-oai', targetId: 'mixing-box', text: 'Weather hood + OAD', position: [8.18, 2.6, -2.02], accent: '#0f766e', modes: ['supply'], trigger: 'focused', priority: 'detail' },
  { id: 'supply-mix', targetId: 'mixing-box', text: 'MB-01 OAD / RAD / EAD', position: [5.22, 2.55, -0.45], accent: '#0f766e', modes: ['supply'], trigger: 'focused', priority: 'detail' },
  { id: 'supply-filter', targetId: 'ahu-treatment', text: 'G4 -> F7 -> DX coil -> RH -> UV-C', position: [5.05, 1.95, -0.92], accent: '#38bdf8', modes: ['supply'], trigger: 'focused', priority: 'detail' },
  { id: 'supply-fans', targetId: 'ahu-treatment', text: 'Fan A duty / Fan B standby', position: [5.2, 2.2, 0.98], accent: '#22c55e', modes: ['supply'], trigger: 'focused', priority: 'detail' },
  { id: 'supply-plenum', targetId: 'laf-canopy', text: 'Terminal plenum', position: [0.48, 3.02, 1.18], accent: '#22d3ee', modes: ['supply'], trigger: 'focused', priority: 'detail' },
  { id: 'supply-hepa', targetId: 'laf-canopy', text: 'HEPA H14 0.25-0.45 m/s', position: [-0.9, 3.16, 0.95], accent: '#22d3ee', modes: ['supply'], trigger: 'focused', priority: 'detail' },

  { id: 'return-cascade', targetId: 'pressure-cascade', text: 'OR -> ante -> corridor', position: [-4.8, 2.82, -0.72], accent: '#22c55e', modes: ['return', 'plan'], trigger: 'focused', priority: 'detail' },
  { id: 'return-sweep', targetId: 'return-sweep', text: '6 low-wall returns for sweep', position: [-0.2, 0.92, 2.1], accent: '#fb7185', modes: ['return'], trigger: 'focused', priority: 'detail' },
  { id: 'return-main', targetId: 'return-sweep', text: 'EL +2.58 return main', position: [2.1, 2.88, -0.82], accent: '#fb7185', modes: ['return'], trigger: 'focused', priority: 'detail' },
  { id: 'return-agss', targetId: 'agss-exhaust', text: 'Dedicated AGSS path', position: [1.4, 1.28, -0.92], accent: '#f97316', modes: ['return'], trigger: 'focused', priority: 'detail' },
  { id: 'return-stack', targetId: 'agss-exhaust', text: 'Roof discharge stack', position: [8.38, 5.02, -2.98], accent: '#f97316', modes: ['return'], trigger: 'focused', priority: 'detail' },

  { id: 'plan-or', targetId: 'pressure-cascade', text: 'OR-01 positive core', position: [0.85, 3.2, -2.35], accent: '#22c55e', modes: ['plan'], trigger: 'always', priority: 'anchor' },
  { id: 'plan-cascade', targetId: 'pressure-cascade', text: 'Pressure cascade to ante / corridor', position: [-4.7, 3.15, 0.95], accent: '#22c55e', modes: ['plan'], trigger: 'focused', priority: 'detail' },

  { id: 'dx-cdu', targetId: 'dx-circuit', text: 'CDU-01 rooftop DX unit', position: [5.82, 4.35, 0.98], accent: '#f59e0b', modes: ['refrigerant'], trigger: 'focused', priority: 'detail' },
  { id: 'dx-lines', targetId: 'dx-circuit', text: 'Liquid + insulated suction riser', position: [6.55, 2.65, -0.92], accent: '#f59e0b', modes: ['refrigerant'], trigger: 'focused', priority: 'detail' },
  { id: 'dx-service', targetId: 'dx-circuit', text: 'Isolation + expansion valves', position: [6.62, 1.52, 0.68], accent: '#f59e0b', modes: ['refrigerant'], trigger: 'focused', priority: 'detail' },

  { id: 'exploded-service', targetId: 'service-access', text: 'Front service clearance', position: [5.18, 1.98, 1.22], accent: '#22c55e', modes: ['exploded'], trigger: 'focused', priority: 'detail' },
  { id: 'exploded-coil', targetId: 'service-access', text: 'Coil pull / fan removal path', position: [4.72, 2.55, 1.02], accent: '#22c55e', modes: ['exploded'], trigger: 'focused', priority: 'detail' },
  { id: 'exploded-catwalk', targetId: 'service-access', text: 'Plenum catwalk and rails', position: [-0.95, 3.58, 1.15], accent: '#64748b', modes: ['exploded'], trigger: 'focused', priority: 'detail' },
  { id: 'exploded-bms', targetId: 'controls-bms', text: 'BMS / pressure / DP monitoring', position: [-3.6, 2.1, 1.2], accent: '#8b5cf6', modes: ['exploded'], trigger: 'focused', priority: 'detail' },

  { id: 'hover-pressure', targetId: 'pressure-cascade', text: 'Pressure cascade inspector', position: [-2.7, 2.82, 1.12], accent: '#22c55e', modes: ['full', 'supply', 'return', 'plan', 'exploded'], trigger: 'hover', priority: 'detail' },
  { id: 'hover-ahu', targetId: 'ahu-treatment', text: 'AHU-01 focus', position: [5.1, 2.88, 0.98], accent: '#22c55e', modes: ['full', 'supply', 'return', 'exploded'], trigger: 'hover', priority: 'detail' },
  { id: 'hover-mixing', targetId: 'mixing-box', text: 'MB-01 focus', position: [5.18, 2.52, -0.72], accent: '#0f766e', modes: ['full', 'supply'], trigger: 'hover', priority: 'detail' },
  { id: 'hover-laf', targetId: 'laf-canopy', text: 'LAF-01 focus', position: [-0.82, 3.1, 1.22], accent: '#22d3ee', modes: ['full', 'supply', 'exploded'], trigger: 'hover', priority: 'detail' },
  { id: 'hover-return', targetId: 'return-sweep', text: 'RA-01 focus', position: [-0.2, 0.96, 2.22], accent: '#fb7185', modes: ['full', 'return', 'plan'], trigger: 'hover', priority: 'detail' },
  { id: 'hover-agss', targetId: 'agss-exhaust', text: 'AGSS-01 focus', position: [1.2, 1.24, -0.92], accent: '#f97316', modes: ['full', 'return'], trigger: 'hover', priority: 'detail' },
  { id: 'hover-dx', targetId: 'dx-circuit', text: 'CDU-01 focus', position: [6.25, 4.28, 1.05], accent: '#f59e0b', modes: ['full', 'refrigerant'], trigger: 'hover', priority: 'detail' },
  { id: 'hover-controls', targetId: 'controls-bms', text: 'BMS-01 focus', position: [-3.45, 1.98, 1.32], accent: '#8b5cf6', modes: ['full', 'exploded'], trigger: 'hover', priority: 'detail' },
  { id: 'hover-service', targetId: 'service-access', text: 'MA-01 focus', position: [5.1, 2.02, 1.22], accent: '#22c55e', modes: ['full', 'exploded'], trigger: 'hover', priority: 'detail' },

  { id: 'selected-pressure', targetId: 'pressure-cascade', text: 'OR +8 Pa / ante +2 Pa / corridor neutral', position: [-4.95, 2.9, -0.68], accent: '#22c55e', modes: ['full', 'return', 'plan', 'exploded'], trigger: 'selected', priority: 'detail' },
  { id: 'selected-ahu-a', targetId: 'ahu-treatment', text: 'Filter DP taps and access doors', position: [4.62, 2.3, 1.08], accent: '#f97316', modes: ['full', 'supply', 'exploded'], trigger: 'selected', priority: 'detail' },
  { id: 'selected-ahu-b', targetId: 'ahu-treatment', text: 'Drain pan plus P-trap', position: [5.85, 0.68, -1.02], accent: '#64748b', modes: ['full', 'supply', 'exploded'], trigger: 'selected', priority: 'detail' },
  { id: 'selected-mb', targetId: 'mixing-box', text: 'OAD / RAD / EAD with actuator state', position: [5.6, 2.1, -1.82], accent: '#0f766e', modes: ['full', 'supply'], trigger: 'selected', priority: 'detail' },
  { id: 'selected-laf', targetId: 'laf-canopy', text: 'Sterile canopy centered over table', position: [0.45, 0.25, 1.18], accent: '#22d3ee', modes: ['full', 'supply', 'exploded'], trigger: 'selected', priority: 'detail' },
  { id: 'selected-return', targetId: 'return-sweep', text: 'Perimeter collection stays below field', position: [3.15, 0.9, 1.9], accent: '#fb7185', modes: ['full', 'return', 'exploded'], trigger: 'selected', priority: 'detail' },
  { id: 'selected-agss', targetId: 'agss-exhaust', text: 'Inline fan to dedicated roof stack', position: [2.1, 3.12, -2.96], accent: '#f97316', modes: ['full', 'return'], trigger: 'selected', priority: 'detail' },
  { id: 'selected-dx', targetId: 'dx-circuit', text: 'Oil-trap and service-valve logic', position: [6.35, 2.35, -0.82], accent: '#f59e0b', modes: ['full', 'refrigerant', 'exploded'], trigger: 'selected', priority: 'detail' },
  { id: 'selected-controls', targetId: 'controls-bms', text: 'Pressure, T/RH, particle, dirty-filter alarms', position: [0.72, 2.62, 1.78], accent: '#8b5cf6', modes: ['full', 'exploded'], trigger: 'selected', priority: 'detail' },
  { id: 'selected-service', targetId: 'service-access', text: 'Clash spine, rails, and removal path', position: [-0.95, 3.48, -1.22], accent: '#64748b', modes: ['full', 'exploded'], trigger: 'selected', priority: 'detail' },
];

export function buildOverlayInspectorState(
  product: Product,
  mode: HvacViewMode,
  scenario: HvacScenario,
  hoveredFocus: FocusTargetId | null,
  selectedFocus: FocusTargetId | null,
): OverlayInspectorState {
  const scenarioProfile = SCENARIO_PROFILES[scenario];
  const focusTarget = selectedFocus ?? hoveredFocus;

  if (focusTarget) {
    const item = ENGINEERING_OBJECTS[focusTarget];
    return {
      mode,
      scenario,
      focusTarget,
      kicker: `${item.code} / ${scenarioProfile.label}`,
      title: item.title,
      description: item.summary,
      metrics: scenarioProfile.metrics,
      rows: item.rows,
      alerts: scenarioProfile.alerts,
      maintenance: item.maintenance,
      failure: item.failure,
      compliance: item.compliance,
    };
  }

  const hvacSpecs = product.hvacSpecs;
  const summaryRows = [
    { label: 'Standard', value: hvacSpecs?.standard ?? 'ASHRAE 170:2021 / NFPA 99' },
    { label: 'ACH baseline', value: hvacSpecs?.airChanges ?? '20 ACH minimum OR' },
    { label: 'Positive pressure', value: hvacSpecs?.positivePresure ?? '+8 Pa vs corridor' },
    { label: 'Final filter', value: hvacSpecs?.hepaFilter ?? 'HEPA H14' },
    { label: 'Fresh air ratio', value: hvacSpecs?.freshAirRatio ?? '20-30% of total supply' },
  ];

  return {
    mode,
    scenario,
    focusTarget: null,
    kicker: `${MODE_META[mode].label} / ${scenarioProfile.label}`,
    title: product.fullName ?? product.name ?? 'Operating Theatre HVAC',
    description: MODE_META[mode].description,
    metrics: scenarioProfile.metrics,
    rows: summaryRows,
    alerts: scenarioProfile.alerts,
    compliance: [
      hvacSpecs?.standard ?? 'ASHRAE 170:2021',
      'DX plant basis locked to CDU-01',
      'Pressure, filtration, AGSS, and service logic visible',
    ],
  };
}
