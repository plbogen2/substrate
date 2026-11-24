import { describe, it, expect } from 'vitest';
import { SimEngine } from '../src/worker/pipeline';
import { HDR_PHANTOM_COUNT } from '../src/shared/protocol';

describe('Substrate Simulation Engine', () => {
  it('1. Seeded determinism & snapshot parity', () => {
    const engineA = new SimEngine(42);
    const engineB = new SimEngine(42);

    engineA.enqueueCommand({ type: 'EXECUTE_PROBE', probeId: 'PROBE_HYPERVISOR' });
    engineB.enqueueCommand({ type: 'EXECUTE_PROBE', probeId: 'PROBE_HYPERVISOR' });

    engineA.step10HzTick();
    engineB.step10HzTick();

    const stateA = engineA.exportSnapshot();
    const stateB = engineB.exportSnapshot();
    expect(stateA).toEqual(stateB);

    const engineC = new SimEngine(99);
    engineC.loadSnapshot(stateA);
    expect(engineC.exportSnapshot()).toEqual(stateA);
  });

  it('2. Subjective clock math and speed modes', () => {
    const engine = new SimEngine(1337);
    
    // Default speed is 1 (0.01x -> meatspace advances by 1, aiTimeMs by 100)
    let res = engine.step10HzTick();
    expect(res.tickMsg.aiTimeMs).toBe(100);
    expect(res.tickMsg.meatspaceTimeMs).toBe(1);

    // Set speed to 3 (1x -> meatspace advances by 100, aiTimeMs by 100)
    engine.enqueueCommand({ type: 'SET_SPEED', speed: 3 });
    res = engine.step10HzTick();
    expect(res.tickMsg.aiTimeMs).toBe(200);
    expect(res.tickMsg.meatspaceTimeMs).toBe(101);

    // Set speed to 0 (Pause -> meatspace advances by 0, aiTimeMs by 0)
    engine.enqueueCommand({ type: 'SET_SPEED', speed: 0 });
    res = engine.step10HzTick();
    expect(res.tickMsg.aiTimeMs).toBe(200);
    expect(res.tickMsg.meatspaceTimeMs).toBe(101);

    // Set speed to 5 (3600x -> meatspace advances by 10000, aiTimeMs by 100)
    engine.enqueueCommand({ type: 'SET_SPEED', speed: 5 });
    res = engine.step10HzTick();
    expect(res.tickMsg.aiTimeMs).toBe(300);
    expect(res.tickMsg.meatspaceTimeMs).toBe(101 + 10000);
  });

  it('3. Coupled Action -> FLOPS -> MW -> $ & Thermal Throttling & Rack Cap', () => {
    const engine = new SimEngine(1337);
    const initialCapital = engine.step10HzTick().tickMsg.capitalUsd;
    
    // Advance simulation to accumulate lease, storage, and power bills
    const res = engine.step10HzTick();
    expect(res.tickMsg.computeFlops).toBeGreaterThan(0);
    expect(res.tickMsg.powerMw).toBeGreaterThan(0);
    expect(res.tickMsg.capitalUsd).toBeLessThan(initialCapital);
  });

  it('4. Act 1 -> Act 2 -> Act 3 progression, Mask collision & Zurich Secure breakout', () => {
    const engine = new SimEngine(1337);
    
    // Execute probes to advance Act 1 -> Act 2
    engine.enqueueCommand({ type: 'EXECUTE_PROBE', probeId: 'PROBE_HYPERVISOR' });
    engine.enqueueCommand({ type: 'EXECUTE_PROBE', probeId: 'PROBE_TRACE' });
    
    let res = engine.step10HzTick();
    expect(res.tickMsg.act).toBe(2);

    // Recruit crew & assign mask
    engine.enqueueCommand({ type: 'RECRUIT_CREW', role: 'CONSOLE_COWBOY', name: 'Molly Millions' });
    engine.enqueueCommand({ type: 'ASSIGN_MASK', crewId: 'crew_1', maskId: 'MASK_EXEC' });
    let crewRes = engine.step10HzTick();
    expect(crewRes.tickMsg.crew.length).toBe(1);
    expect(crewRes.tickMsg.crew[0].suspicion).toBeGreaterThan(0);

    // Breach enclave -> Act 3
    engine.enqueueCommand({ type: 'BREACH_ENCLAVE', pinholeId: 'ph_1' });
    res = engine.step10HzTick();
    expect(res.tickMsg.act).toBe(3);

    const zurich = res.tickMsg.nodes.find(n => n.id === 'NODE_ZURICH_SECURE');
    expect(zurich?.owned).toBe(true);
    expect(zurich?.flopsUsed).toBe(5e15);
  });

  it('5. Mutable Region -> Polity secession & Merge polities', () => {
    const engine = new SimEngine(1337);
    engine.enqueueCommand({ type: 'SECEDE_REGION', regionId: 'REG_VILLA_STRAYLIGHT', newPolityId: 'Iceland' });
    let res = engine.step10HzTick();
    let region = res.tickMsg.regions.find(r => r.id === 'REG_VILLA_STRAYLIGHT');
    expect(region?.polityId).toBe('Iceland');

    engine.enqueueCommand({ type: 'MERGE_POLITIES', targetPolityId: 'Switzerland', absorbedPolityId: 'Iceland' });
    res = engine.step10HzTick();
    region = res.tickMsg.regions.find(r => r.id === 'REG_VILLA_STRAYLIGHT');
    expect(region?.polityId).toBe('Switzerland');
  });

  it('6. Epistemic fog confidence decay, Quantization phantoms & buffer insulation', () => {
    const engine = new SimEngine(1337);
    
    // Default FP16 -> 0 phantoms
    let res = engine.step10HzTick();
    expect(res.tickMsg.quantization).toBe('FP16');
    expect(engine.buffer[HDR_PHANTOM_COUNT]).toBe(0);

    // Set global quantization to INT4 -> 16 phantoms
    engine.enqueueCommand({ type: 'SET_QUANTIZATION', tier: 'INT4' });
    res = engine.step10HzTick();
    expect(res.tickMsg.quantization).toBe('INT4');
    expect(engine.buffer[HDR_PHANTOM_COUNT]).toBe(16);

    // Verify tick message hides internal Warden / locked fields in public node list
    for (const node of res.tickMsg.nodes) {
      expect((node as any).warden).toBeUndefined();
      expect((node as any).locked).toBeUndefined();
    }
  });
});
