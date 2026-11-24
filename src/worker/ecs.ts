import { trait, relation } from 'koota';
import { QuantizationTier, PolityId, NodeTypeId } from '../shared/protocol';

// Traits
export const NodeSpecTrait = trait({
  id: '',
  name: '',
  nodeTypeId: 'ENCLAVE' as NodeTypeId,
  regionId: '',
  polityId: 'Switzerland' as PolityId,
  lat: 0,
  lng: 0,
  rackCapU: 0,
  leasePerU: 0,
  flopsMax: 0,
  vramGb: 0,
  storageCapTb: 0,
  storageCostPerTb: 0,
  powerMwCap: 0,
  coolingMwCap: 0,
  pue: 1.1,
  bandwidthGbps: 0,
  transitCostPerTb: 0,
  vulnerability: 0.1,
  wardenPatrolIntervalMs: 60000,
});

export const NodeTruthTrait = trait({
  owned: false,
  visible: true,
  locked: false,
  rackUsedU: 0,
  flopsUsed: 0,
  vramUsed: 0,
  storageUsedTb: 0,
  powerMwUsed: 0,
  coolingMwUsed: 0,
  temperatureC: 35,
  heat: 0,
  quantization: 'FP16' as QuantizationTier,
  hasShard: false,
});

export const NodePerceivedTrait = trait({
  confidence: 1.0,
  staleness: 0,
  lastSeenTimeMs: 0,
});

export const RegionTrait = trait({
  id: '',
  name: '',
  polityId: 'Switzerland' as PolityId,
  borderPolyline: [] as [number, number][],
});

export const PolityTrait = trait({
  id: 'Switzerland' as PolityId,
  name: 'Switzerland',
  color: '#64748b',
  alignmentAggression: 0.3,
  dirty: true,
  heatMultiplier: 1.0,
  tariffMultiplier: 1.0,
});

export const PinholeTrait = trait({
  id: '',
  name: '',
  probeId: '',
  discovered: false,
  exploited: false,
});

export const CrewTrait = trait({
  id: '',
  name: '',
  role: 'CONSOLE_COWBOY' as any,
  competence: 80,
  loyalty: 70,
  suspicion: 0,
  maskId: 'MASK_EXEC',
});

export const ShardTrait = trait({
  id: '',
  nodeId: '',
  drift: 0,
  syncing: false,
  active: true,
  tint: 0,
});

export const WardenTrait = trait({
  nextPatrolTimeMs: 0,
  suspicion: 0,
  alertLevel: 0,
});

export const GlobalStateTrait = trait({
  seed: 1337,
  meatspaceTimeMs: 0,
  aiTimeMs: 0,
  speed: 1 as number,
  act: 1 as number,
  overlay: 'NET' as string,
  capitalUsd: 100000,
  heatGlobal: 10,
  auditHeat: 0,
  stableDays: 0,
  prngState: 1337,
  computeFlops: 0,
  powerMw: 0,
  nextSeq: 1,
});

// Relations
export const InRegion = relation();
export const GovernedBy = relation();
export const HostedOn = relation();
