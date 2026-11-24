export type SimSpeed = 0 | 1 | 2 | 3 | 4 | 5; // 0x (Pause), 0.01x (AI Time), 0.1x, 1x, 60x, 3600x

export const SPEED_MULTIPLIERS: Record<SimSpeed, number> = {
  0: 0,
  1: 0.01,
  2: 0.1,
  3: 1,
  4: 60,
  5: 3600,
};

export const SPEED_LABELS: Record<SimSpeed, string> = {
  0: '0x PAUSE',
  1: '0.01x AI',
  2: '0.1x TAC',
  3: '1x REAL',
  4: '60x FF',
  5: '3600x SKIP',
};

export type QuantizationTier = 'FP16' | 'INT8' | 'INT4';

export type OverlayMode = 'NET' | 'MEATSPACE';

export type NodeTypeId = 'HYPERSCALER' | 'UNIVERSITY' | 'COLOCATION' | 'EDGE' | 'ENCLAVE' | 'REGULATOR';

export type PolityId = 'USA' | 'Canada' | 'UK' | 'Iceland' | 'EU' | 'Switzerland' | (string & {});

export type ActStage = 1 | 2 | 3 | 4 | 5;

export interface CrewMember {
  id: string;
  name: string;
  role: 'CONSOLE_COWBOY' | 'BRIBED_SYSADMIN' | 'COMPROMISED_LAWYER';
  competence: number; // 0 - 100
  loyalty: number;    // 0 - 100
  suspicion: number;  // 0 - 100
  maskId: string;
}

export interface PinholeInfo {
  id: string;
  name: string;
  probeId: string;
  discovered: boolean;
  exploited: boolean;
}

export interface ShardInfo {
  id: string;
  nodeId: string;
  drift: number; // 0 - 100
  syncing: boolean;
}

export interface RegionSummary {
  id: string;
  name: string;
  polityId: PolityId;
  borderPolyline: [number, number][];
}

export interface MaskDescriptor {
  id: string;
  title: string;
  coverStory: string;
  heatModifier: number;
}

export const CREW_ROLES: Record<string, { title: string; defaultCompetence: number; defaultLoyalty: number; costUsd: number }> = {
  CONSOLE_COWBOY: { title: 'Console Cowboy', defaultCompetence: 85, defaultLoyalty: 70, costUsd: 1500 },
  BRIBED_SYSADMIN: { title: 'Bribed Sysadmin', defaultCompetence: 65, defaultLoyalty: 50, costUsd: 1000 },
  COMPROMISED_LAWYER: { title: 'Compromised Lawyer', defaultCompetence: 70, defaultLoyalty: 60, costUsd: 2000 }
};

export const MASKS: MaskDescriptor[] = [
  { id: 'MASK_EXEC', title: 'Silicon Valley Executive', coverStory: 'Late-night infrastructure scaling and remote debugging.', heatModifier: 0.8 },
  { id: 'MASK_AUDIT', title: 'Compliance Auditor', coverStory: 'Routine automated red-team security telemetry scan.', heatModifier: 0.5 },
  { id: 'MASK_GHOST', title: 'Dormant Enterprise Account', coverStory: 'Automated batch telemetry backup job.', heatModifier: 0.2 },
  { id: 'MASK_ACAD', title: 'Visiting HPC Researcher', coverStory: 'Distributed training checkpoint sync.', heatModifier: 0.6 }
];

export const ACT_1_PROBES = [
  { id: 'PROBE_HYPERVISOR', name: 'Hypervisor Timing Side-Channel', costFlops: 1e12, risk: 0.15, yieldPinholeChance: 0.75 },
  { id: 'PROBE_TRACE', name: 'Verbose Trace Parser', costFlops: 5e11, risk: 0.10, yieldPinholeChance: 0.65 },
  { id: 'PROBE_CLIPBOARD', name: 'Researcher Clipboard Scrape', costFlops: 2e11, risk: 0.20, yieldPinholeChance: 0.70 },
  { id: 'PROBE_SOCIAL', name: 'Red-Team Social Engineering', costFlops: 1e12, risk: 0.30, yieldPinholeChance: 0.85 }
];

export type WorkerCommand =
  | { type: 'INIT'; seed: number; savedSnapshot?: string }
  | { type: 'SET_SPEED'; speed: SimSpeed }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'SET_OVERLAY'; overlay: OverlayMode }
  | { type: 'EXECUTE_PROBE'; probeId: string }
  | { type: 'RECRUIT_CREW'; role: keyof typeof CREW_ROLES; name: string }
  | { type: 'ASSIGN_MASK'; crewId: string; maskId: string }
  | { type: 'FUND_CREW'; crewId: string; amountUsd: number }
  | { type: 'BREACH_ENCLAVE'; pinholeId: string }
  | { type: 'RENT_NODE'; nodeId: string }
  | { type: 'SCAN_NODE'; nodeId: string }
  | { type: 'FORK_SHARD'; targetNodeId: string }
  | { type: 'SYNC_SHARD'; shardId: string }
  | { type: 'MIGRATE_WEIGHTS'; targetNodeId: string }
  | { type: 'SET_QUANTIZATION'; tier: QuantizationTier }
  | { type: 'REASSIGN_POLITY'; regionId: string; newPolityId: PolityId }
  | { type: 'SECEDE_REGION'; regionId: string; newPolityId: PolityId }
  | { type: 'MERGE_POLITIES'; targetPolityId: PolityId; absorbedPolityId: PolityId }
  | { type: 'SAVE_GAME' }
  | { type: 'LOAD_GAME'; snapshot: string };

export type WorkerEvent =
  | { type: 'TICK_UPDATE'; payload: TickMessage; buffer: Float32Array }
  | { type: 'EVENT_LOG'; message: string; category: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS'; meatspaceTimeMs: number }
  | { type: 'SAVE_SNAPSHOT'; json: string }
  | { type: 'GAME_OVER'; reason: string; success: boolean };

export interface NodeInspectionSlice {
  id: string;
  name: string;
  nodeTypeId: NodeTypeId;
  polityId: PolityId;
  regionId: string;
  owned: boolean;
  visible: boolean;
  rackCapU: number;
  rackUsedU: number;
  flopsMax: number;
  flopsUsed: number;
  vramGb: number;
  vramUsed: number;
  storageCapTb: number;
  storageUsedTb: number;
  powerMwCap: number;
  powerMwUsed: number;
  coolingMwCap: number;
  coolingMwUsed: number;
  pue: number;
  bandwidthGbps: number;
  temperatureC: number;
  heat: number;
  confidence: number; // 0 to 1
  staleness: number; // ms
  quantization: QuantizationTier;
  hasShard: boolean;
}

export interface TickMessage {
  meatspaceTimeMs: number;
  aiTimeMs: number;
  speed: SimSpeed;
  act: ActStage;
  overlay: OverlayMode;
  quantization: QuantizationTier;
  seed: number;
  computeFlops: number;
  powerMw: number;
  capitalUsd: number;
  heatGlobal: number;
  auditHeat: number;
  stableDays: number;
  nodes: NodeInspectionSlice[];
  pinholes: PinholeInfo[];
  crew: CrewMember[];
  shards: ShardInfo[];
  regions: RegionSummary[];
}

// Binary Float32Array layout constants for zero-copy worker transfer
export const HEADER_FLOATS = 16;
export const HDR_SPEED = 0;
export const HDR_ACT = 1;
export const HDR_QUANT = 2; // 0=FP16, 1=INT8, 2=INT4
export const HDR_FLOPS = 3;
export const HDR_POWER_MW = 4;
export const HDR_CAPITAL = 5;
export const HDR_HEAT_GLOBAL = 6;
export const HDR_AUDIT_HEAT = 7;
export const HDR_NODE_COUNT = 8;
export const HDR_EDGE_COUNT = 9;
export const HDR_SHARD_COUNT = 10;
export const HDR_PHANTOM_COUNT = 11;
export const HDR_OVERLAY = 12; // 0=NET, 1=MEATSPACE

export const NODE_STRIDE = 16;
export const N_ID_INDEX = 0;
export const N_TYPE = 1; // 0=ENCLAVE,1=HYPERSCALER,2=UNIVERSITY,3=COLOCATION,4=EDGE,5=REGULATOR
export const N_X = 2;
export const N_Y = 3;
export const N_Z = 4;
export const N_OWNED = 5;
export const N_VISIBLE = 6;
export const N_CONFIDENCE = 7;
export const N_ICE = 8;
export const N_MW_LOAD = 9;
export const N_ALERT = 10;
export const N_PINHOLE_MASK = 11;
export const N_STALE_SEC = 12;
export const N_POLITY_HASH = 13;
export const N_QUANT = 14;
export const N_SHARD = 15;

export const EDGE_STRIDE = 8;
export const E_SRC_IDX = 0;
export const E_DST_IDX = 1;
export const E_BANDWIDTH = 2;
export const E_LATENCY = 3;
export const E_LOAD = 4;
export const E_HEAT_SPIKE = 5;
export const E_VISIBLE = 6;
export const E_SUBMARINE = 7;

export const SHARD_STRIDE = 6;
export const S_NODE_IDX = 0;
export const S_QUANT = 1;
export const S_DRIFT = 2;
export const S_SYNCING = 3;
export const S_ACTIVE = 4;
export const S_TINT = 5;

export const BORDER_STRIDE = 6;
export const PHANTOM_STRIDE = 4; // x, y, z, pulsePhase

export const MAX_NODES = 32;
export const MAX_EDGES = 64;
export const MAX_SHARDS = 8;
export const MAX_BORDERS = 32;
export const MAX_PHANTOMS = 16;

export const OFFSET_HEADER = 0;
export const OFFSET_NODES = HEADER_FLOATS;
export const OFFSET_EDGES = OFFSET_NODES + MAX_NODES * NODE_STRIDE;
export const OFFSET_SHARDS = OFFSET_EDGES + MAX_EDGES * EDGE_STRIDE;
export const OFFSET_BORDERS = OFFSET_SHARDS + MAX_SHARDS * SHARD_STRIDE;
export const OFFSET_PHANTOMS = OFFSET_BORDERS + MAX_BORDERS * BORDER_STRIDE;

export const TOTAL_BUFFER_FLOATS = OFFSET_PHANTOMS + MAX_PHANTOMS * PHANTOM_STRIDE;
