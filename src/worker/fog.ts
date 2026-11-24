import { World } from 'koota';
import { NodeSpecTrait, NodePerceivedTrait, NodeTruthTrait } from './ecs';
import { Mulberry32 } from '../shared/prng';

export function updateEpistemicFog(world: World, dtMs: number, prng: Mulberry32) {
  const nodes = world.query(NodeSpecTrait, NodePerceivedTrait, NodeTruthTrait);
  
  for (const ent of nodes) {
    const truth = ent.get(NodeTruthTrait);
    const perceived = ent.get(NodePerceivedTrait);
    if (!truth || !perceived) continue;

    if (truth.owned || truth.visible) {
      ent.set(NodePerceivedTrait, {
        ...perceived,
        confidence: Math.min(1.0, perceived.confidence + 0.05 * (dtMs / 1000)),
        staleness: 0
      });
    } else {
      ent.set(NodePerceivedTrait, {
        ...perceived,
        confidence: Math.max(0.1, perceived.confidence - 0.01 * (dtMs / 1000)),
        staleness: perceived.staleness + dtMs
      });
    }
  }
}

export function generatePhantoms(prng: Mulberry32, count: number): { x: number; y: number; z: number; pulsePhase: number }[] {
  const phantoms = [];
  for (let i = 0; i < count; i++) {
    const lat = prng.range(-60, 60);
    const lng = prng.range(-180, 180);
    const x = (lng + 20) * 0.5;
    const z = (45 - lat) * 0.8;
    phantoms.push({
      x,
      y: 0,
      z,
      pulsePhase: prng.range(0, Math.PI * 2)
    });
  }
  return phantoms;
}
