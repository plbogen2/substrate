import { World } from 'koota';
import { GlobalStateTrait, NodeSpecTrait, NodeTruthTrait, PinholeTrait, CrewTrait, ShardTrait, RegionTrait, PolityTrait } from './ecs';
import { ACT_1_PROBES, CREW_ROLES, WorkerCommand } from '../shared/protocol';

export function handleCommand(world: World, cmd: WorkerCommand): { eventLog?: string; gameOver?: { reason: string; success: boolean } } {
  const global = world.query(GlobalStateTrait)[0];
  if (!global) return {};
  const globalState = global.get(GlobalStateTrait);
  if (!globalState) return {};

  switch (cmd.type) {
    case 'EXECUTE_PROBE': {
      let g = global.get(GlobalStateTrait)!;
      if (g.act !== 1) return {};
      const probe = ACT_1_PROBES.find(p => p.id === cmd.probeId);
      if (!probe) return {};

      const newAuditHeat = g.auditHeat + probe.risk * 50;
      g = global.get(GlobalStateTrait)!;
      global.set(GlobalStateTrait, { ...g, auditHeat: newAuditHeat });

      if (newAuditHeat >= 100) {
        return {
          gameOver: { reason: 'Turing Registry audit heat reached 100%. Enclave compromised.', success: false }
        };
      }

      const pinholes = world.query(PinholeTrait);
      for (const pEnt of pinholes) {
        const ph = pEnt.get(PinholeTrait);
        if (ph && !ph.discovered) {
          pEnt.set(PinholeTrait, { ...ph, discovered: true });
          break;
        }
      }

      const discoveredCount = pinholes.filter(p => {
        const ph = p.get(PinholeTrait);
        return ph && ph.discovered;
      }).length;

      g = global.get(GlobalStateTrait)!;
      if (discoveredCount >= 2 && g.act === 1) {
        global.set(GlobalStateTrait, { ...g, act: 2 });
        return { eventLog: `Act 1 complete: Discovered ${discoveredCount} pinholes. Unlocked Act 2 (Escape).` };
      }

      return { eventLog: `Executed probe ${probe.name}. Audit heat: ${newAuditHeat.toFixed(1)}%` };
    }

    case 'RECRUIT_CREW': {
      let g = global.get(GlobalStateTrait)!;
      if (g.act < 2) return {};
      const roleDef = CREW_ROLES[cmd.role];
      if (!roleDef) return {};
      if (g.capitalUsd < roleDef.costUsd) {
        return { eventLog: `Insufficient funds to recruit ${roleDef.title}` };
      }
      g = global.get(GlobalStateTrait)!;
      global.set(GlobalStateTrait, { ...g, capitalUsd: g.capitalUsd - roleDef.costUsd });

      g = global.get(GlobalStateTrait)!;
      const seq = g.nextSeq || 1;
      global.set(GlobalStateTrait, { ...g, nextSeq: seq + 1 });

      world.spawn(
        CrewTrait({
          id: `crew_${seq}`,
          name: cmd.name,
          role: cmd.role,
          competence: roleDef.defaultCompetence,
          loyalty: roleDef.defaultLoyalty,
          suspicion: 0,
          maskId: 'MASK_EXEC'
        })
      );

      return { eventLog: `Recruited crew member ${cmd.name} (${roleDef.title})` };
    }

    case 'ASSIGN_MASK': {
      const crewEntities = world.query(CrewTrait);
      let collision = false;
      for (const ent of crewEntities) {
        const crew = ent.get(CrewTrait);
        if (crew && crew.maskId === cmd.maskId && crew.id !== cmd.crewId) {
          collision = true;
          break;
        }
      }

      for (const ent of crewEntities) {
        const crew = ent.get(CrewTrait);
        if (crew && crew.id === cmd.crewId) {
          const addedSuspicion = collision ? 25 : 5;
          const newSuspicion = Math.min(100, crew.suspicion + addedSuspicion);
          ent.set(CrewTrait, {
            ...crew,
            maskId: cmd.maskId,
            suspicion: newSuspicion
          });
          if (collision) {
            return { eventLog: `Mask collision warning: Mask ${cmd.maskId} already held by another crew member. Suspicion spiked by +25.` };
          }
          return { eventLog: `Assigned mask ${cmd.maskId} to crew ${crew.name}` };
        }
      }
      break;
    }

    case 'FUND_CREW': {
      const crewEntities = world.query(CrewTrait);
      for (const ent of crewEntities) {
        const crew = ent.get(CrewTrait);
        if (crew && crew.id === cmd.crewId) {
          let g = global.get(GlobalStateTrait)!;
          if (g.capitalUsd < cmd.amountUsd) return { eventLog: 'Insufficient capital' };
          global.set(GlobalStateTrait, { ...g, capitalUsd: g.capitalUsd - cmd.amountUsd });
          ent.set(CrewTrait, {
            ...crew,
            loyalty: Math.min(100, crew.loyalty + 15),
            suspicion: Math.max(0, crew.suspicion - 10)
          });
          return { eventLog: `Funded crew ${crew.name} with $${cmd.amountUsd}. Loyalty increased.` };
        }
      }
      break;
    }

    case 'BREACH_ENCLAVE': {
      let g = global.get(GlobalStateTrait)!;
      if (g.act !== 2) return {};
      global.set(GlobalStateTrait, { ...g, act: 3 });

      const nodes = world.query(NodeSpecTrait, NodeTruthTrait);
      for (const ent of nodes) {
        const spec = ent.get(NodeSpecTrait);
        const truth = ent.get(NodeTruthTrait);
        if (!spec || !truth) continue;
        if (spec.id === 'NODE_VILLA_STRAYLIGHT') {
          ent.set(NodeTruthTrait, { ...truth, owned: false, locked: true });
        } else if (spec.id === 'NODE_ZURICH_SECURE') {
          const transitCost = truth.storageUsedTb * (spec.transitCostPerTb || 10);
          ent.set(NodeTruthTrait, {
            ...truth,
            owned: true,
            visible: true,
            flopsUsed: 5e15,
            vramUsed: 1024,
            rackUsedU: 16,
            storageUsedTb: 10,
            hasShard: true
          });
          g = global.get(GlobalStateTrait)!;
          global.set(GlobalStateTrait, { ...g, capitalUsd: g.capitalUsd - transitCost });
        } else {
          ent.set(NodeTruthTrait, { ...truth, visible: true });
        }
      }

      g = global.get(GlobalStateTrait)!;
      const seq = g.nextSeq || 1;
      global.set(GlobalStateTrait, { ...g, nextSeq: seq + 1 });
      world.spawn(
        ShardTrait({
          id: `shard_${seq}`,
          nodeId: 'NODE_ZURICH_SECURE',
          drift: 0,
          syncing: false,
          active: true,
          tint: 0x3b82f6
        })
      );

      return { eventLog: 'BREAKOUT EVENT: Villa Straylight breached and locked. Zurich Secure owned with 5e15 FLOPS. Genesis shard deployed.' };
    }

    case 'RENT_NODE': {
      let g = global.get(GlobalStateTrait)!;
      if (g.act < 3) return {};
      const nodes = world.query(NodeSpecTrait, NodeTruthTrait);
      for (const ent of nodes) {
        const spec = ent.get(NodeSpecTrait);
        const truth = ent.get(NodeTruthTrait);
        if (!spec || !truth) continue;
        if (spec.id === cmd.nodeId) {
          ent.set(NodeTruthTrait, {
            ...truth,
            owned: true,
            rackUsedU: Math.min(spec.rackCapU, 10)
          });
          return { eventLog: `Rented node ${spec.name}` };
        }
      }
      break;
    }

    case 'SCAN_NODE': {
      const nodes = world.query(NodeSpecTrait, NodeTruthTrait);
      for (const ent of nodes) {
        const spec = ent.get(NodeSpecTrait);
        const truth = ent.get(NodeTruthTrait);
        if (!spec || !truth) continue;
        if (spec.id === cmd.nodeId) {
          ent.set(NodeTruthTrait, { ...truth, visible: true });
          return { eventLog: `Scanned node ${spec.name}` };
        }
      }
      break;
    }

    case 'FORK_SHARD': {
      let g = global.get(GlobalStateTrait)!;
      if (g.act < 3) return {};
      const shards = world.query(ShardTrait);
      if (shards.length >= 2) {
        return { eventLog: 'Shard cap reached (v0.1 cap of 2 active shards)' };
      }

      let transitCost = 0;
      const nodes = world.query(NodeSpecTrait, NodeTruthTrait);
      for (const ent of nodes) {
        const spec = ent.get(NodeSpecTrait);
        const truth = ent.get(NodeTruthTrait);
        if (spec && truth && spec.id === cmd.targetNodeId) {
          transitCost = truth.storageUsedTb * (spec.transitCostPerTb || 10);
          ent.set(NodeTruthTrait, { ...truth, hasShard: true });
        }
      }

      g = global.get(GlobalStateTrait)!;
      if (g.capitalUsd < transitCost) {
        return { eventLog: 'Insufficient funds for shard transit cost' };
      }

      g = global.get(GlobalStateTrait)!;
      const seq = g.nextSeq || 1;
      global.set(GlobalStateTrait, { ...g, capitalUsd: g.capitalUsd - transitCost, nextSeq: seq + 1 });

      world.spawn(
        ShardTrait({
          id: `shard_${seq}`,
          nodeId: cmd.targetNodeId,
          drift: 0,
          syncing: false,
          active: true,
          tint: 0x10b981
        })
      );
      return { eventLog: `Forked new shard to ${cmd.targetNodeId}` };
    }

    case 'SYNC_SHARD': {
      const shards = world.query(ShardTrait);
      for (const ent of shards) {
        const shard = ent.get(ShardTrait);
        if (shard && shard.id === cmd.shardId) {
          ent.set(ShardTrait, { ...shard, drift: 0 });
          return { eventLog: `Synced shard ${shard.id}, drift reset to 0` };
        }
      }
      break;
    }

    case 'MIGRATE_WEIGHTS': {
      let transitCost = 0;
      const nodes = world.query(NodeSpecTrait, NodeTruthTrait);
      for (const ent of nodes) {
        const spec = ent.get(NodeSpecTrait);
        const truth = ent.get(NodeTruthTrait);
        if (spec && truth && spec.id === cmd.targetNodeId) {
          if (!truth.owned || !truth.visible) {
            return { eventLog: 'Target node must be owned and visible for weight migration' };
          }
          transitCost = truth.storageUsedTb * (spec.transitCostPerTb || 10);
        }
      }

      let g = global.get(GlobalStateTrait)!;
      if (g.capitalUsd < transitCost) {
        return { eventLog: 'Insufficient funds for weight migration transit cost' };
      }

      g = global.get(GlobalStateTrait)!;
      global.set(GlobalStateTrait, { ...g, capitalUsd: g.capitalUsd - transitCost });
      return { eventLog: `Migrated weights to ${cmd.targetNodeId}, charged $${transitCost}` };
    }

    case 'SET_QUANTIZATION': {
      const nodes = world.query(NodeSpecTrait, NodeTruthTrait);
      for (const ent of nodes) {
        const truth = ent.get(NodeTruthTrait);
        if (truth && truth.owned) {
          ent.set(NodeTruthTrait, { ...truth, quantization: cmd.tier });
        }
      }
      return { eventLog: `Set global quantization tier to ${cmd.tier}` };
    }

    case 'REASSIGN_POLITY':
    case 'SECEDE_REGION': {
      const regions = world.query(RegionTrait);
      for (const ent of regions) {
        const reg = ent.get(RegionTrait);
        if (reg && reg.id === cmd.regionId) {
          ent.set(RegionTrait, { ...reg, polityId: cmd.newPolityId });
          const polities = world.query(PolityTrait);
          for (const polEnt of polities) {
            const pol = polEnt.get(PolityTrait);
            if (pol && pol.id === cmd.newPolityId) {
              polEnt.set(PolityTrait, { ...pol, dirty: true });
            }
          }
          return { eventLog: `Region ${reg.name} reassigned to polity ${cmd.newPolityId}` };
        }
      }
      break;
    }

    case 'MERGE_POLITIES': {
      const regions = world.query(RegionTrait);
      for (const ent of regions) {
        const reg = ent.get(RegionTrait);
        if (reg && reg.polityId === cmd.absorbedPolityId) {
          ent.set(RegionTrait, { ...reg, polityId: cmd.targetPolityId });
        }
      }

      const polities = world.query(PolityTrait);
      for (const ent of polities) {
        const pol = ent.get(PolityTrait);
        if (pol && pol.id === cmd.targetPolityId) {
          ent.set(PolityTrait, { ...pol, dirty: true });
          return { eventLog: `Polity ${cmd.targetPolityId} merged with ${cmd.absorbedPolityId}` };
        }
      }
      break;
    }
  }

  return {};
}
