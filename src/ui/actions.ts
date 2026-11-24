import { WorkerCommand, SimSpeed, OverlayMode, QuantizationTier, PolityId } from '../shared/protocol';
import { clientMirror, HudSummaryTrait } from './mirror';

export class ActionRegistry {
  private worker: Worker | null = null;

  public setWorker(worker: Worker) {
    this.worker = worker;
  }

  public dispatch(cmd: WorkerCommand) {
    if (!this.worker) {
      console.warn('ActionRegistry: worker not bound yet', cmd);
      return;
    }
    this.worker.postMessage(cmd);
  }

  public setSpeed(speed: SimSpeed) {
    this.dispatch({ type: 'SET_SPEED', speed });
  }

  public togglePause() {
    this.dispatch({ type: 'TOGGLE_PAUSE' });
  }

  public setOverlay(overlay: OverlayMode) {
    this.dispatch({ type: 'SET_OVERLAY', overlay });
  }

  public toggleOverlay() {
    const summary = clientMirror.summaryEntity.get(HudSummaryTrait);
    const current = summary?.overlay || 'NET';
    const next = current === 'NET' ? 'MEATSPACE' : 'NET';
    this.setOverlay(next);
  }

  public setQuantization(tier: QuantizationTier) {
    this.dispatch({ type: 'SET_QUANTIZATION', tier });
  }

  public executeProbe(probeId: string) {
    this.dispatch({ type: 'EXECUTE_PROBE', probeId });
  }

  public recruitCrew(role: 'CONSOLE_COWBOY' | 'BRIBED_SYSADMIN' | 'COMPROMISED_LAWYER', name: string) {
    this.dispatch({ type: 'RECRUIT_CREW', role, name });
  }

  public assignMask(crewId: string, maskId: string) {
    this.dispatch({ type: 'ASSIGN_MASK', crewId, maskId });
  }

  public fundCrew(crewId: string, amountUsd: number) {
    this.dispatch({ type: 'FUND_CREW', crewId, amountUsd });
  }

  public breachEnclave(pinholeId: string) {
    this.dispatch({ type: 'BREACH_ENCLAVE', pinholeId });
  }

  public rentNode(nodeId: string) {
    this.dispatch({ type: 'RENT_NODE', nodeId });
  }

  public scanNode(nodeId: string) {
    this.dispatch({ type: 'SCAN_NODE', nodeId });
  }

  public forkShard(targetNodeId: string) {
    this.dispatch({ type: 'FORK_SHARD', targetNodeId });
  }

  public syncShard(shardId: string) {
    this.dispatch({ type: 'SYNC_SHARD', shardId });
  }

  public reassignPolity(regionId: string, newPolityId: PolityId) {
    this.dispatch({ type: 'REASSIGN_POLITY', regionId, newPolityId });
  }

  public secedeRegion(regionId: string, newPolityId: PolityId) {
    this.dispatch({ type: 'SECEDE_REGION', regionId, newPolityId });
  }

  public mergePolities(targetPolityId: PolityId, absorbedPolityId: PolityId) {
    this.dispatch({ type: 'MERGE_POLITIES', targetPolityId, absorbedPolityId });
  }

  public saveGame() {
    this.dispatch({ type: 'SAVE_GAME' });
  }

  public loadGame(snapshot: string) {
    this.dispatch({ type: 'LOAD_GAME', snapshot });
  }
}

export const actionRegistry = new ActionRegistry();
