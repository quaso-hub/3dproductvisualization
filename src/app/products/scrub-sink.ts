import type { Product } from '../data/products';

/**
 * Scrub Sink 2 Bay V3 (Wastafel Scrub Stainless Steel 2 Bak)
 * ============================================================
 * Wastafel scrub stainless steel 2 bak untuk area scrub sebelum
 * operasi. Dirancang untuk ruang operasi, IGD, dan cleanroom medis.
 *
 * Dimensi keseluruhan unit (per Skytron/Belimed/Innerspace research):
 *   Lebar  : 1626 mm (64")
 *   Tinggi : 1700 mm (floor to canopy top)
 *   Dalam  : 699 mm (27.5")
 *
 * Scene units: 1 unit = 10mm
 *   W=160, D=60 (scene approximation of 1600×600mm)
 *
 * Design: Professional Hospital Scrub Sink (V3 — geometry-corrected)
 *   . Deep sloping basins (600×450×250mm) with coved corners
 *   . CatmullRom gooseneck faucets deck-mounted BEHIND basin, arching over
 *   . IR sensor on faucet column facing user
 *   . Seamless welded SS front panel (NO hinged doors — clinical spec)
 *   . Knee-kick panels (2×, one per bay) for hands-free water activation
 *   . Plexiglass divider between bays
 *   . Mirrors flush-mounted on backsplash front face
 *   . Canopy at 1680mm height with LED strip + UV lamps
 *   . P-trap plumbing under each basin
 *
 * Zona Konstruksi V3 (bottom to top):
 *   Cabinet Base : Y = 0→760 mm   (feet + seamless SS body + knee panels)
 *   Countertop   : Y = 760→940 mm (40mm slab + 250mm deep basins + drains)
 *   Backsplash   : Y = 940→1308 mm (faucets behind basin, soap dispensers, mirrors)
 *   Canopy/Shelf : Y = 1680→1700 mm (LED, UV, canopy frame)
 * ============================================================
 */

const SCRUB_SINK_2BAY: Product = {
  id: 'scrub-sink-2bay',
  name: 'Scrub Sink 2 Bay',
  fullName: 'Wastafel Scrub Stainless Steel 2 Bay',
  description:
    'Wastafel scrub stainless steel professional 2 bak dengan deep sloping basins dan coved corners. ' +
    'Kontruksi SS 304, gooseneck faucet sensor (IR), plexiglass divider, mirror dengan LED UV canopy, ' +
    'P-trap plumbing, dan foot pedals hands-free. Ideal untuk ruang operasi, IGD, dan cleanroom medis.',
  category: 'Lainnya',
  badge: 'Surgical Grade',
  badgeColor: 'bg-cyan-100 text-cyan-700',
  viewerType: 'scrub-sink',
  views: ['assembled', 'exploded'],

  layers: [
    { name: 'Basin SS304 14ga (1.9mm)',     thickness: 1.9, color: 0xc8d4dc, roughness: 0.18, metalness: 0.95 },
    { name: 'Skirt Panel SS304 18ga',        thickness: 1.2, color: 0xc8d4dc, roughness: 0.32, metalness: 0.92 },
    { name: 'Mineral Insulation (cavity)',   thickness: 30,  color: 0xd9c8a0, roughness: 0.90, metalness: 0.0  },
  ],

  dimensions: {
    widthMm:    1626,
    heightMm:   1700,
    depthMm:    699,
    sceneWidth:  160,
    sceneHeight: 170,
    sceneDepth:   60,
  },

  specs: [
    { label: 'Material',          value: 'Stainless Steel 304 (NSF approved)' },
    { label: 'Basin Gauge',       value: '14ga (1.9 mm) — heavy gauge, sloping floor + coved corners' },
    { label: 'Skirt Gauge',       value: '18ga (1.2 mm) — front panel + canopy + brackets' },
    { label: 'Finishing',         value: '#4 Brushed (Hairline) — clinical standard, no water spots' },
    { label: 'Dimensi Unit',      value: '1626 × 699 × 1700 mm (W×D×H) — per Skytron/Belimed dual-bay spec' },
    { label: 'Jumlah Bak',        value: '2 (Side by Side, Deep Sloping)' },
    { label: 'Dimensi Bak',       value: '600 × 450 × 250 mm per bak (coved corners, 10" deep)' },
    { label: 'Hygiene Notes',     value: 'No-touch scrub flow, splash control, cleanable radius' },
    { label: 'Workflow Mode',     value: 'Pre-op scrub / dual-user simultaneous use' },
    { label: 'Countertop',        value: 'Flat, 40 mm slab SS 304 polished, integral cove to backsplash' },
    { label: 'Drainase',          value: '⌀50 mm per bak + P-trap SS 304' },
    { label: 'Drain Intent',      value: 'Slope toward discharge, avoid stagnation pockets' },
    { label: 'Backsplash',        value: 'Integral SS 304, 368 mm tinggi, seam-welded (no joint)' },
    { label: 'Faucet',            value: '2× Gooseneck deck-mounted behind basin + IR Sensor (hands-free)' },
    { label: 'Foot System',       value: '2× Knee-kick panel + optional foot pedal floor-level' },
    { label: 'Front Panel',       value: 'Seamless welded SS — NO hinged doors (clinical spec)' },
    { label: 'Plumbing Access',   value: 'Removable rear/side service panel (hidden latch)' },
    { label: 'Kaki',              value: '4 pc., adjustable ⌀50 mm SS 304' },
    { label: 'Divider',           value: 'Plexiglass 8 mm antar bay (splash control)' },
    { label: 'Mirror',            value: '2× SS frame 550×500 mm flush-mounted on backsplash' },
    { label: 'Lighting',          value: 'LED Strip warm white 4000K dalam canopy' },
    { label: 'UV Sterilization',  value: 'UV-C 10W water-line (in supply pipe, under sink) + ambient canopy UV-C' },
    { label: 'Water Heater',      value: 'Integrated TMV (250W, AC 220V/50Hz)' },
    { label: 'Filter',            value: '5 Micron Filtering System (pre-UV)' },
    { label: 'Flow Rate',         value: '6–8 L/min per faucet (regulated, hands-free)' },
    { label: 'Temp Range',        value: '38–42 °C TMV setpoint (NHS HTM 04-01 compliant warm water)' },
    { label: 'Anti-Scald',        value: 'Thermostatic Mixing Valve, max 46 °C cut-off + cold-failsafe (ASSE 1070)' },
    { label: 'Sensor IR',         value: 'Hands-free activation, 50–80 mm range, 30 s auto-shutoff' },
    { label: 'Aplikasi',          value: 'Ruang Operasi, IGD, Cleanroom Medis' },
    { label: 'Reference Class',   value: 'Skytron MK Dual Bay / Belimed SS-2 / Innerspace Double Basin' },
  ],

  cameraPresets: [
    { name: 'Isometric',        position: [350, 150, 400],  target: [0, 78, 0]  },
    { name: 'Tampak Depan',     position: [0,   100, 500],  target: [0, 78, 0]  },
    { name: 'Tampak Samping',   position: [500, 100, 0],    target: [0, 78, 0]  },
    { name: 'Tampak Atas',      position: [0,   550, 0],    target: [0, 78, 0]  },
    { name: 'Exploded View',    position: [400, 280, 580],  target: [0, 185, 0] },
  ],

  assembledCameraStart: [350, 150, 400],
  explodedCameraStart:  [400, 280, 580],
};

export default SCRUB_SINK_2BAY;
