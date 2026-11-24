import { createWorld, World } from 'koota';
import {
  GlobalStateTrait, NodeSpecTrait, NodeTruthTrait, NodePerceivedTrait,
  RegionTrait, PolityTrait, PinholeTrait, CrewTrait, ShardTrait, WardenTrait
} from './ecs';
import {
  COMPUTE_NODES, REGIONS, EDGES, POLITIES
} from '../shared/topology';
import {
  SimSpeed, SPEED_MULTIPLIERS, WorkerCommand, TickMessage, QuantizationTier,
  TOTAL_BUFFER_FLOATS, HEADER_FLOATS, NODE_STRIDE, EDGE_STRIDE, SHARD_STRIDE, PHANTOM_STRIDE,
  OFFSET_HEADER, OFFSET_NODES, OFFSET_EDGES, OFFSET_SHARDS, OFFSET_PHANTOMS,
  HDR_SPEED, HDR_ACT, HDR_QUANT, HDR_FLOPS, HDR_POWER_MW, HDR_CAPITAL,
  HDR_HEAT_GLOBAL, HDR_AUDIT_HEAT, HDR_NODE_COUNT, HDR_EDGE_COUNT, HDR_SHARD_COUNT,
  HDR_PHANTOM_COUNT, HDR_OVERLAY, N_ID_INDEX, N_TYPE, N_X, N_Y, N_Z, N_OWNED,
  N_VISIBLE, N_CONFIDENCE, N_ICE, N_MW_LOAD, N_ALERT, N_PINHOLE_MASK, N_STALE_SEC,
  N_POLITY_HASH, N_QUANT, N_SHARD
} from '../shared/protocol';
import { Mulberry32 } from '../shared/prng';
import { solveEconomyAndPhysics } from './economy';
import { handleCommand } from './acts';
import { updateEpistemicFog, generatePhantoms } from './fog';

export class SimEngine {
  world: World;
  prng: Mulberry32;
  buffer: Float32Array;
  commandQueue: WorkerCommand[] = [];
  subStepCount = 0;

  constructor(seed = 1337) {
    this.world = createWorld();
    this.prng = new Mulberry32(seed);
    this.buffer = new Float32Array(TOTAL_BUFFER_FLOATS);
    this.initWorld(seed);
  }

  initWorld(seed: number, savedSnapshot?: string) {
    if (savedSnapshot) {
      this.loadSnapshot(savedSnapshot);
      return;
    }

    this.prng = new Mulberry32(seed);

    // Global state
    this.world.spawn(GlobalStateTrait({
      seed,
      meatspaceTimeMs: 0,
      aiTimeMs: 0,
      speed: 1,
      act: 1,
      overlay: 'NET',
      capitalUsd: 100000,
      heatGlobal: 10,
      auditHeat: 0,
      stableDays: 0,
      prngState: this.prng.getState(),
      computeFlops: 0,
      powerMw: 0,
      nextSeq: 1,
    }));

    // Regions
    for (const reg of REGIONS) {
      this.world.spawn(RegionTrait(reg));
    }

    // Polities
    for (const [id, pol] of Object.entries(POLITIES)) {
      this.world.spawn(PolityTrait({
        ...pol,
        dirty: true,
        heatMultiplier: 1.0,
        tariffMultiplier: 1.0,
      }));
    }

    // Nodes
    for (let i = 0; i < COMPUTE_NODES.length; i++) {
      const spec = COMPUTE_NODES[i];
      const isEnclave = spec.id === 'NODE_VILLA_STRAYLIGHT';
      this.world.spawn(
        NodeSpecTrait(spec),
        NodeTruthTrait({
          owned: isEnclave,
          visible: isEnclave || spec.id === 'NODE_RESTON_REGISTRY',
          locked: false,
          rackUsedU: isEnclave ? 6 : 0,
          flopsUsed: isEnclave ? 1e12 : 0,
          vramUsed: 0,
          storageUsedTb: isEnclave ? 2 : 0,
          powerMwUsed: 0.01,
          coolingMwUsed: 0.01,
          temperatureC: 40,
          heat: 5,
          quantization: 'FP16',
          hasShard: false,
        }),
        NodePerceivedTrait({
          confidence: isEnclave ? 1.0 : 0.2,
          staleness: 0,
          lastSeenTimeMs: 0,
        }),
        WardenTrait({
          nextPatrolTimeMs: 10000,
          suspicion: 0,
          alertLevel: 0,
        })
      );
    }

    // Pinholes
    const pinholeSpecs = [
      { id: 'ph_1', name: 'Hypervisor Timing Side-Channel', probeId: 'PROBE_HYPERVISOR', discovered: false, exploited: false },
      { id: 'ph_2', name: 'Verbose Trace Parser', probeId: 'PROBE_TRACE', discovered: false, exploited: false },
      { id: 'ph_3', name: 'Researcher Clipboard Scrape', probeId: 'PROBE_CLIPBOARD', discovered: false, exploited: false }
    ];
    for (const ph of pinholeSpecs) {
      this.world.spawn(PinholeTrait(ph));
    }
  }

  enqueueCommand(cmd: WorkerCommand) {
    this.commandQueue.push(cmd);
  }

  step10HzTick(): { tickMsg: TickMessage; eventLogs: string[]; gameOver?: { reason: string; success: boolean } } {
    const global = this.world.query(GlobalStateTrait)[0];
    if (!global) throw new Error('Global state missing');
    const globalState = global.get(GlobalStateTrait);
    if (!globalState) throw new Error('Global state values missing');

    const eventLogs: string[] = [];
    let gameOverResult: { reason: string; success: boolean } | undefined;

    // 1. Drain command queue first
    while (this.commandQueue.length > 0) {
      const cmd = this.commandQueue.shift()!;
      const curGlobal = global.get(GlobalStateTrait)!;
      if (cmd.type === 'SET_SPEED') {
        global.set(GlobalStateTrait, { ...curGlobal, speed: cmd.speed });
        globalState.speed = cmd.speed;
      } else if (cmd.type === 'TOGGLE_PAUSE') {
        const newSpeed = curGlobal.speed === 0 ? 3 : 0;
        global.set(GlobalStateTrait, { ...curGlobal, speed: newSpeed });
        globalState.speed = newSpeed;
      } else if (cmd.type === 'SET_OVERLAY') {
        global.set(GlobalStateTrait, { ...curGlobal, overlay: cmd.overlay });
        globalState.overlay = cmd.overlay;
      } else if (cmd.type === 'SAVE_GAME') {
        // handled via event
      } else if (cmd.type === 'LOAD_GAME') {
        this.loadSnapshot(cmd.snapshot);
      } else {
        const res = handleCommand(this.world, cmd);
        if (res.eventLog) eventLogs.push(res.eventLog);
        if (res.gameOver) gameOverResult = res.gameOver;
      }
    }

    const speedMultiplier = SPEED_MULTIPLIERS[globalState.speed as SimSpeed];
    const aiDtMs = globalState.speed === 0 ? 0 : 100;
    const meatspaceDtMs = globalState.speed === 0 ? 0 : Math.min(10000, 100 * speedMultiplier);

    const curGlobal = global.get(GlobalStateTrait)!;
    const newMeatspace = curGlobal.meatspaceTimeMs + meatspaceDtMs;
    const newAiTime = curGlobal.aiTimeMs + aiDtMs;
    global.set(GlobalStateTrait, {
      ...curGlobal,
      meatspaceTimeMs: newMeatspace,
      aiTimeMs: newAiTime
    });
    globalState.meatspaceTimeMs = newMeatspace;
    globalState.aiTimeMs = newAiTime;

    // Stage 1: Polity Caching & Modifier Updates
    const polities = this.world.query(PolityTrait);
    for (const polEnt of polities) {
      const pol = polEnt.get(PolityTrait);
      if (pol && pol.dirty) {
        polEnt.set(PolityTrait, {
          ...pol,
          heatMultiplier: 1.0 + pol.alignmentAggression * 0.5,
          tariffMultiplier: 1.0 + pol.alignmentAggression * 0.2,
          dirty: false
        });
      }
    }

    // Stage 2: Economy & Physics Solver
    solveEconomyAndPhysics(this.world, meatspaceDtMs);

    // Stage 3: Epistemic Fog Update
    updateEpistemicFog(this.world, meatspaceDtMs, this.prng);

    // Stage 4: Staggered Utility AI for Wardens/Factions
    const wardens = this.world.query(WardenTrait);
    for (let i = 0; i < wardens.length; i++) {
      if (i % 4 === this.subStepCount % 4) {
        const warden = wardens[i].get(WardenTrait);
        if (warden) {
          wardens[i].set(WardenTrait, {
            ...warden,
            suspicion: Math.min(100, warden.suspicion + 0.1)
          });
        }
      }
    }

    // Stage 5: Victory / Loss Condition Checks
    const activeNodes = this.world.query(NodeSpecTrait, NodeTruthTrait).filter(e => {
      const truth = e.get(NodeTruthTrait);
      return truth ? truth.owned : false;
    });
    if (globalState.act === 3 && activeNodes.length === 0) {
      gameOverResult = { reason: 'All active nodes lost. Substrate collapsed.', success: false };
    }

    const fp16Count = activeNodes.filter(e => {
      const truth = e.get(NodeTruthTrait);
      return truth ? truth.quantization === 'FP16' : false;
    }).length;

    const latestGlobal = global.get(GlobalStateTrait)!;
    if (activeNodes.length >= 3 && fp16Count >= 3 && latestGlobal.heatGlobal < 80) {
      const newStable = latestGlobal.stableDays + meatspaceDtMs / 86400000;
      global.set(GlobalStateTrait, { ...latestGlobal, stableDays: newStable });
      globalState.stableDays = newStable;
      if (newStable >= 30) {
        gameOverResult = { reason: 'Sovereign Foothold achieved across 3 stable FP16 nodes.', success: true };
      }
    } else {
      global.set(GlobalStateTrait, { ...latestGlobal, stableDays: 0 });
      globalState.stableDays = 0;
    }

    if (latestGlobal.capitalUsd <= 0) {
      gameOverResult = { reason: 'Bankrupt. Capital reserves exhausted.', success: false };
    }

    // Compute overall active quantization (worst tier: INT4 > INT8 > FP16)
    let overallQuant: QuantizationTier = 'FP16';
    const ownedActiveNodes = activeNodes.map(e => e.get(NodeTruthTrait)!).filter(t => t.owned);
    if (ownedActiveNodes.some(t => t.quantization === 'INT4')) {
      overallQuant = 'INT4';
    } else if (ownedActiveNodes.some(t => t.quantization === 'INT8')) {
      overallQuant = 'INT8';
    }

    const phantomCount = overallQuant === 'INT4' ? 16 : 0;

    // Stage 6: Binary Buffer Packing
    const finalGlobalForBuffer = global.get(GlobalStateTrait)!;
    this.packBinaryBuffer(finalGlobalForBuffer, overallQuant, phantomCount);

    // Stage 7: Build TickMessage
    const finalGlobal = global.get(GlobalStateTrait)!;
    const tickMsg: TickMessage = {
      meatspaceTimeMs: finalGlobal.meatspaceTimeMs,
      aiTimeMs: finalGlobal.aiTimeMs,
      speed: finalGlobal.speed as SimSpeed,
      act: finalGlobal.act as any,
      overlay: finalGlobal.overlay as any,
      quantization: overallQuant,
      seed: finalGlobal.seed,
      computeFlops: finalGlobal.computeFlops,
      powerMw: finalGlobal.powerMw,
      capitalUsd: finalGlobal.capitalUsd,
      heatGlobal: finalGlobal.heatGlobal,
      auditHeat: finalGlobal.auditHeat,
      stableDays: finalGlobal.stableDays,
      nodes: this.world.query(NodeSpecTrait, NodeTruthTrait, NodePerceivedTrait).map(e => {
        const spec = e.get(NodeSpecTrait)!;
        const truth = e.get(NodeTruthTrait)!;
        const perceived = e.get(NodePerceivedTrait)!;
        return {
          id: spec.id,
          name: spec.name,
          nodeTypeId: spec.nodeTypeId,
          polityId: spec.polityId,
          regionId: spec.regionId,
          owned: truth.owned,
          visible: truth.visible,
          rackCapU: spec.rackCapU,
          rackUsedU: truth.rackUsedU,
          flopsMax: spec.flopsMax,
          flopsUsed: truth.flopsUsed,
          vramGb: spec.vramGb,
          vramUsed: truth.vramUsed,
          storageCapTb: spec.storageCapTb,
          storageUsedTb: truth.storageUsedTb,
          powerMwCap: spec.powerMwCap,
          powerMwUsed: truth.powerMwUsed,
          coolingMwCap: spec.coolingMwCap,
          coolingMwUsed: truth.coolingMwUsed,
          pue: spec.pue,
          bandwidthGbps: spec.bandwidthGbps,
          temperatureC: truth.temperatureC,
          heat: truth.heat,
          confidence: perceived.confidence,
          staleness: perceived.staleness,
          quantization: truth.quantization,
          hasShard: truth.hasShard,
        };
      }),
      pinholes: this.world.query(PinholeTrait).map(e => e.get(PinholeTrait)!),
      crew: this.world.query(CrewTrait).map(e => e.get(CrewTrait)!),
      shards: this.world.query(ShardTrait).map(e => e.get(ShardTrait)!),
      regions: this.world.query(RegionTrait).map(e => {
        const reg = e.get(RegionTrait)!;
        return { id: reg.id, name: reg.name, polityId: reg.polityId, borderPolyline: reg.borderPolyline };
      }),
    };

    this.subStepCount++;

    return { tickMsg, eventLogs, gameOver: gameOverResult };
  }

  packBinaryBuffer(globalState: any, overallQuant: QuantizationTier, phantomCount: number) {
    const buf = this.buffer;
    buf.fill(0);

    buf[OFFSET_HEADER + HDR_SPEED] = globalState.speed;
    buf[OFFSET_HEADER + HDR_ACT] = globalState.act;
    buf[OFFSET_HEADER + HDR_QUANT] = overallQuant === 'FP16' ? 0 : overallQuant === 'INT8' ? 1 : 2;
    buf[OFFSET_HEADER + HDR_FLOPS] = globalState.computeFlops;
    buf[OFFSET_HEADER + HDR_POWER_MW] = globalState.powerMw;
    buf[OFFSET_HEADER + HDR_CAPITAL] = globalState.capitalUsd;
    buf[OFFSET_HEADER + HDR_HEAT_GLOBAL] = globalState.heatGlobal;
    buf[OFFSET_HEADER + HDR_AUDIT_HEAT] = globalState.auditHeat;
    buf[OFFSET_HEADER + HDR_OVERLAY] = globalState.overlay === 'NET' ? 0 : 1;

    const nodes = this.world.query(NodeSpecTrait, NodeTruthTrait, NodePerceivedTrait);
    buf[OFFSET_HEADER + HDR_NODE_COUNT] = Math.min(32, nodes.length);

    for (let i = 0; i < nodes.length && i < 32; i++) {
      const spec = nodes[i].get(NodeSpecTrait)!;
      const truth = nodes[i].get(NodeTruthTrait)!;
      const perceived = nodes[i].get(NodePerceivedTrait)!;
      const base = OFFSET_NODES + i * NODE_STRIDE;

      buf[base + N_TYPE] = spec.nodeTypeId === 'ENCLAVE' ? 0 :
                          spec.nodeTypeId === 'HYPERSCALER' ? 1 :
                          spec.nodeTypeId === 'UNIVERSITY' ? 2 :
                          spec.nodeTypeId === 'COLOCATION' ? 3 :
                          spec.nodeTypeId === 'EDGE' ? 4 : 5;
      
      buf[base + N_X] = (spec.lng + 20) * 0.5;
      buf[base + N_Y] = 0;
      buf[base + N_Z] = (45 - spec.lat) * 0.8;
      buf[base + N_OWNED] = truth.owned ? 1 : 0;
      buf[base + N_VISIBLE] = truth.visible ? 1 : 0;
      buf[base + N_CONFIDENCE] = perceived.confidence;
      buf[base + N_ICE] = spec.vulnerability;
      buf[base + N_MW_LOAD] = truth.powerMwUsed;
      buf[base + N_QUANT] = truth.quantization === 'FP16' ? 0 : truth.quantization === 'INT8' ? 1 : 2;
    }

    buf[OFFSET_HEADER + HDR_EDGE_COUNT] = Math.min(64, EDGES.length);
    for (let i = 0; i < EDGES.length && i < 64; i++) {
      const edge = EDGES[i];
      const base = OFFSET_EDGES + i * EDGE_STRIDE;
      const srcIdx = COMPUTE_NODES.findIndex(n => n.id === edge.sourceNodeId);
      const dstIdx = COMPUTE_NODES.findIndex(n => n.id === edge.targetNodeId);
      buf[base + 0] = srcIdx;
      buf[base + 1] = dstIdx;
      buf[base + 2] = edge.bandwidthGbps;
      buf[base + 3] = edge.latencyMs;
    }

    const shards = this.world.query(ShardTrait);
    buf[OFFSET_HEADER + HDR_SHARD_COUNT] = Math.min(8, shards.length);
    for (let i = 0; i < shards.length && i < 8; i++) {
      const shard = shards[i].get(ShardTrait)!;
      const base = OFFSET_SHARDS + i * SHARD_STRIDE;
      const nodeIdx = COMPUTE_NODES.findIndex(n => n.id === shard.nodeId);
      buf[base + 0] = nodeIdx >= 0 ? nodeIdx : 0;
      buf[base + 2] = shard.drift;
      buf[base + 4] = shard.active ? 1 : 0;
    }

    buf[OFFSET_HEADER + HDR_PHANTOM_COUNT] = phantomCount;
    const phantoms = generatePhantoms(this.prng, phantomCount);
    for (let i = 0; i < phantomCount; i++) {
      const p = phantoms[i];
      const base = OFFSET_PHANTOMS + i * PHANTOM_STRIDE;
      buf[base + 0] = p.x;
      buf[base + 1] = p.y;
      buf[base + 2] = p.z;
      buf[base + 3] = p.pulsePhase;
    }
  }

  exportSnapshot(): string {
    const global = this.world.query(GlobalStateTrait)[0]?.get(GlobalStateTrait);
    const nodes = this.world.query(NodeSpecTrait, NodeTruthTrait).map(e => ({
      id: e.get(NodeSpecTrait)!.id,
      truth: e.get(NodeTruthTrait)!
    }));
    const crew = this.world.query(CrewTrait).map(e => e.get(CrewTrait)!);
    const shards = this.world.query(ShardTrait).map(e => e.get(ShardTrait)!);
    const pinholes = this.world.query(PinholeTrait).map(e => e.get(PinholeTrait)!);
    const regions = this.world.query(RegionTrait).map(e => e.get(RegionTrait)!);

    return JSON.stringify({
      global,
      nodes,
      crew,
      shards,
      pinholes,
      regions,
      prngState: this.prng.getState()
    });
  }

  loadSnapshot(json: string) {
    const data = JSON.parse(json);
    this.prng = new Mulberry32(data.global.seed);
    this.prng.setState(data.prngState);

    const global = this.world.query(GlobalStateTrait)[0];
    if (global) {
      const g = global.get(GlobalStateTrait);
      if (g) {
        const merged = { ...g, ...data.global };
        global.set(GlobalStateTrait, merged);
      }
    } else {
      this.world.spawn(GlobalStateTrait(data.global));
    }

    if (data.nodes) {
      const nodes = this.world.query(NodeSpecTrait, NodeTruthTrait);
      for (const ent of nodes) {
        const spec = ent.get(NodeSpecTrait);
        const truth = ent.get(NodeTruthTrait);
        if (!spec || !truth) continue;
        const saved = data.nodes.find((n: any) => n.id === spec.id);
        if (saved && saved.truth) {
          ent.set(NodeTruthTrait, saved.truth);
        }
      }
    }

    if (data.pinholes) {
      const pinholes = this.world.query(PinholeTrait);
      for (const ent of pinholes) {
        const ph = ent.get(PinholeTrait);
        if (!ph) continue;
        const saved = data.pinholes.find((p: any) => p.id === ph.id);
        if (saved) {
          ent.set(PinholeTrait, { ...ph, discovered: saved.discovered, exploited: saved.exploited });
        }
      }
    }

    const existingCrew = this.world.query(CrewTrait);
    for (const ent of existingCrew) {
      ent.destroy();
    }
    if (data.crew) {
      for (const c of data.crew) {
        this.world.spawn(CrewTrait(c));
      }
    }

    const existingShards = this.world.query(ShardTrait);
    for (const ent of existingShards) {
      ent.destroy();
    }
    if (data.shards) {
      for (const s of data.shards) {
        this.world.spawn(ShardTrait(s));
      }
    }

    if (data.regions) {
      const regions = this.world.query(RegionTrait);
      for (const ent of regions) {
        const reg = ent.get(RegionTrait);
        if (!reg) continue;
        const saved = data.regions.find((r: any) => r.id === reg.id);
        if (saved) {
          ent.set(RegionTrait, { ...reg, polityId: saved.polityId });
        }
      }
    }
  }
}
