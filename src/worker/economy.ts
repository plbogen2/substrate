import { World } from 'koota';
import { NodeSpecTrait, NodeTruthTrait, GlobalStateTrait } from './ecs';

export function solveEconomyAndPhysics(world: World, dtMs: number) {
  const global = world.query(GlobalStateTrait)[0];
  if (!global) return;
  const globalState = global.get(GlobalStateTrait);
  if (!globalState) return;

  const nodes = world.query(NodeSpecTrait, NodeTruthTrait);
  let totalComputeFlops = 0;
  let totalPowerMw = 0;
  let totalMonthlyCostUsd = 0;

  const dtHours = dtMs / 3600000;

  for (const entity of nodes) {
    const spec = entity.get(NodeSpecTrait);
    const truth = entity.get(NodeTruthTrait);
    if (!spec || !truth) continue;

    if (!truth.owned) continue;

    const targetFlops = truth.flopsUsed;
    totalComputeFlops += targetFlops;

    const flopsRatio = spec.flopsMax > 0 ? Math.min(1, targetFlops / spec.flopsMax) : 0;
    const baseMw = spec.powerMwCap * flopsRatio;
    const computedMw = baseMw * spec.pue;

    totalPowerMw += computedMw;

    let newQuant = truth.quantization;
    let newTemp = truth.temperatureC;

    const overPower = computedMw > spec.powerMwCap;
    const overCooling = truth.coolingMwUsed > spec.coolingMwCap || truth.temperatureC > 85;

    if (overPower || overCooling) {
      if (newQuant === 'FP16') newQuant = 'INT8';
      else if (newQuant === 'INT8') newQuant = 'INT4';
      newTemp = Math.max(40, newTemp - 5);
    } else {
      const ambient = 35;
      const heatGen = 20 * flopsRatio;
      const heatDissipation = 15;
      newTemp = Math.min(95, Math.max(ambient, newTemp + (heatGen - heatDissipation) * dtHours));
    }

    entity.set(NodeTruthTrait, {
      ...truth,
      powerMwUsed: computedMw,
      quantization: newQuant,
      temperatureC: newTemp,
    });

    const monthFraction = dtHours / 730;
    const leaseCost = truth.rackUsedU * spec.leasePerU * monthFraction;
    const storageCost = truth.storageUsedTb * spec.storageCostPerTb * monthFraction;
    const powerTariff = 0.12;
    const powerCost = computedMw * powerTariff * (dtMs / 3600);

    totalMonthlyCostUsd += (leaseCost + storageCost + powerCost);
  }

  global.set(GlobalStateTrait, {
    ...globalState,
    capitalUsd: globalState.capitalUsd - totalMonthlyCostUsd,
    computeFlops: totalComputeFlops,
    powerMw: totalPowerMw,
  });
}
