/**
 * hvac-v3-index.ts
 * ─────────────────────────────────────────────────────────────
 * Barrel re-export for all V4 HVAC geometry modules.
 * ─────────────────────────────────────────────────────────────
 */

export { buildBuilding, buildMechRoom } from './hvac-v3-building';
export { buildAHU } from './hvac-v3-ahu';
export { buildSupplyDuct, buildReturnDuct } from './hvac-v3-ductwork';
export {
  buildLAFUnits,
  buildOutdoorUnit,
  buildRefrigerantPipes,
  buildControlPanel,
  buildOREquipment,
  createParticleSystem,
  updateParticles,
} from './hvac-v3-equipment';
