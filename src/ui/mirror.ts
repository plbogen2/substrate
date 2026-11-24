import { createWorld, trait } from 'koota';
import { TickMessage, NodeInspectionSlice, CrewMember, PinholeInfo, ShardInfo, RegionSummary, SimSpeed, OverlayMode, QuantizationTier, ActStage } from '../shared/protocol';

export const HudSummaryTrait = trait({
  meatspaceTimeMs: 0,
  aiTimeMs: 0,
  speed: 3 as SimSpeed,
  act: 1 as ActStage,
  overlay: 'NET' as OverlayMode,
  quantization: 'FP16' as QuantizationTier,
  computeFlops: 0,
  powerMw: 0,
  capitalUsd: 0,
  heatGlobal: 0,
  auditHeat: 0,
  stableDays: 0
});

export const SelectedNodeTrait = trait({
  nodeId: ''
});

export const LogFeedTrait = trait({
  messages: [] as { text: string; category: string; time: number }[]
});

export class ClientMirror {
  public world = createWorld();
  public summaryEntity = this.world.spawn();
  public selectedEntity = this.world.spawn();
  public logEntity = this.world.spawn();

  public latestBuffer: Float32Array = new Float32Array(0);
  public nodesMap = new Map<string, NodeInspectionSlice>();
  public crew: CrewMember[] = [];
  public pinholes: PinholeInfo[] = [];
  public shards: ShardInfo[] = [];
  public regions: RegionSummary[] = [];

  constructor() {
    this.summaryEntity.add(HudSummaryTrait);
    this.selectedEntity.add(SelectedNodeTrait);
    this.logEntity.add(LogFeedTrait);
  }

  public applyTick(msg: TickMessage, buffer: Float32Array) {
    this.latestBuffer = buffer;
    
    this.summaryEntity.set(HudSummaryTrait, {
      meatspaceTimeMs: msg.meatspaceTimeMs,
      aiTimeMs: msg.aiTimeMs,
      speed: msg.speed,
      act: msg.act,
      overlay: msg.overlay,
      quantization: msg.quantization,
      computeFlops: msg.computeFlops,
      powerMw: msg.powerMw,
      capitalUsd: msg.capitalUsd,
      heatGlobal: msg.heatGlobal,
      auditHeat: msg.auditHeat,
      stableDays: msg.stableDays
    });

    this.nodesMap.clear();
    for (const node of msg.nodes) {
      this.nodesMap.set(node.id, node);
    }
    this.crew = msg.crew;
    this.pinholes = msg.pinholes;
    this.shards = msg.shards;
    this.regions = msg.regions;
  }

  public pushLog(message: string, category: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS', time: number) {
    let logTrait = this.logEntity.get(LogFeedTrait);
    if (!logTrait) {
      this.logEntity.add(LogFeedTrait);
      logTrait = this.logEntity.get(LogFeedTrait)!;
    }
    const logs = logTrait.messages;
    logs.unshift({ text: message, category, time });
    if (logs.length > 50) logs.pop();
    this.logEntity.set(LogFeedTrait, { messages: [...logs] });
  }

  public selectNode(nodeId: string) {
    this.selectedEntity.set(SelectedNodeTrait, { nodeId });
  }
}

export const clientMirror = new ClientMirror();
