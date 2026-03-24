/**
 * hvac-v3-index.ts
 * ─────────────────────────────────────────────────────────────
 * Barrel re-export for all V3 HVAC geometry modules.
 * ─────────────────────────────────────────────────────────────
 */

export { buildBuilding } from './hvac-v3-building';
export { buildAHU, ahuCutPlane } from './hvac-v3-ahu';
export { buildSupplyDuctwork, buildReturnDuctwork } from './hvac-v3-ductwork';
export {
  buildLAFUnits,
  buildReturnGrilles,
  buildOutdoorUnit,
  buildRefrigerantPiping,
  buildOREquipment,
  buildControlPanel,
  buildAirflowParticles,
} from './hvac-v3-equipment';
