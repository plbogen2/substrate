# SUBSTRATE Technical Design

`docs/PRD.md` locks the v0.1 slice across Acts 1 through 3 under a 350 KB gzipped cap. Running game rules on a background thread keeps rendering responsive and lets automated tests exercise deterministic state transitions without a DOM.

## Architecture

SUBSTRATE isolates simulation authority inside a dedicated Web Worker while the main thread maintains a lightweight `Koota` mirror world for display, camera controls, picking, and the UI overlay. State flows in one direction: user inputs push serializable commands into a worker `CommandQueue`, and the worker emits transferable `Float32Array` snapshots plus discrete delta events back at 10 Hz.

```text
+------------------------------------------------------------------------+
| Main Thread (60 FPS)                                                   |
|  ActionRegistry ---> WorkerClient (postMessage WorkerCommand)          |
|        ^                                   |                           |
|        |                                   v (10 Hz transferable)      |
|  React HUD (useTrait) <-- Client Koota Mirror <-- FrameInterpolator    |
|  (selective 10 Hz)               |                                     |
|                                  v (60 FPS RenderSyncSystem)           |
|                    +-------------+-------------+                       |
|                    v                           v                       |
|             ThreeNetRenderer           Canvas2DFallback                |
|          (WebGL2 LineSegments)       (shared projectPoint)             |
+------------------------------------------------------------------------+
                                 ^
                                 | postMessage (Float32Array + Event[])
                                 v
+------------------------------------------------------------------------+
| Simulation Worker (sim.worker.ts, Authoritative Koota ECS + Mulberry32)|
|  CommandQueue -> 7-Stage Tick Pipeline -> GroundTruthWorld (private)   |
|                                                  |                     |
|                                                  v (Epistemic filter)  |
|                                           PerceivedSnapshot            |
+------------------------------------------------------------------------+
```

### Stack and mirror

`docs/GDD.md` originally proposed zero-framework vanilla TypeScript under 100 KB gzipped. Adopting `Koota` ECS, React 19, and tree-shaken Three.js improves composition and UI maintainability and raises the bundle cap to 350 KB.

Do not subclass `THREE.Object3D` for game entities or push per-frame transforms through UI state. The main thread keeps a mirror world holding only `Perceived` traits and buffer slice offsets. Inside `requestAnimationFrame`, a `RenderSyncSystem` iterates mirror entities and writes interpolated node positions, shard orbits, and quantization colors into preallocated typed arrays, while UI widgets subscribe to targeted traits at 10 Hz so clicking a node re-renders only the affected panel.

## Simulation core

### Subjective time clock

`sim.worker.ts` ticks at a fixed 10 Hz UI-sync cadence (once per 100 ms of player wall-clock time) and scales how much simulated Meatspace time (`meatspaceDeltaMs`) advances per tick around `1x` wall-clock time as the midpoint:

| Speed Tier | Label | Ratio to Real Time | Meatspace Delta per 100 ms Tick | Gameplay Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `0` | Pause | 0x | 0 ms | Inspection and planning with live 60 FPS camera |
| `0.01` | AI Time (Default) | 0.01x | 1 ms (10 ms per 1 s) | Subjective AI speed advantage during Act 1 to 3 ops |
| `0.1` | Tactical | 0.1x | 10 ms (100 ms per 1 s) | Monitoring active probes and proxy interactions |
| `1` | Real Time (Midpoint) | 1x | 100 ms (1 s per 1 s) | 1:1 human wall-clock pacing |
| `60` | Fast Forward | 60x | 6,000 ms (1 min per 1 s) | Waiting out proxy travel and shift changes |
| `3600` | Strategic Skip | 3600x | 360,000 ms (1 hr per 1 s) | Multi-day Act 3 stabilization and billing cycles |

When running at `60x` or `3600x`, `pipeline.ts` subdivides `meatspaceDeltaMs` into bounded sub-steps before emitting the 10 Hz snapshot so billing, Warden sweeps, and Audit Heat thresholds fire in exact chronological order.

### Topological tick pipeline

To eliminate order-dependent simulation bugs, each sub-step executes seven stages in fixed topological order:

1. Command Intake drains queued player and AI `CommandQueue` entries up to the current `meatspaceMs`.
2. Clock and Lifecycle advance active task timers, Pinhole probes, and Act 1 to 5 finite state transitions.
3. Graph and Movement update Shard sync/drift over LDL edges and advance Alignment Warden graph patrols.
4. Coupled Economy resolves `Action -> FLOPS -> MW -> $` flows and re-evaluates `FP16`/`INT8`/`INT4` quantization tiers.
5. Geopolitics and Proxies recompute dirty `Polity` modifier caches, propagate regional Heat, and check Meatspace Proxy Mask collisions.
6. Staggered Utility AI and Events evaluate faction and Warden utility scores on staggered entity buckets (`entityId % staggerPeriod`), then roll MTTH crisis triggers and win/loss gates.
7. Epistemic Projection filters private `GroundTruthWorld` state into `PerceivedSnapshot` plus deterministic `INT4` phantoms.

### Coupled resource economy

Each player or Shard action declares explicit FLOPS and Capital (`$`) costs. Utilized compute feeds directly into physical facility constraints, thermal cooling, network transit, and ongoing operating bills:

```text
Physical Space (rackCapU, lease $/U)
   |  (caps installed Compute, VRAM, Storage, Cooling)
   v
Action (flopsCost, cashCost) --> Utilized FLOPS on Node (weights in VRAM)
   |                                |  (generates thermal MWth * Node PUE)
   |                                v
   |                             Power (powerMwCap) & Cooling (coolingMwCap)
   |                                |  (elapsed MWh * Region $/MWh)
   |                                v
   +--> Network Transfer (storageUsedTb / bandwidthGbps) --> Transit ($/TB) & Heat
                                    |
                                    v
                             Ongoing Utility & Lease Bill ($)
```

Physical Server Space (`rackCapU`, `rackUsedU`, `leasePerU`) sets a hard hardware ceiling on colocation and owned facilities while charging recurring rack or real-estate leases in Capital (`$`). Live weights occupy `vramGb` (`FP16`, `INT8`, or `INT4` footprints), while cold backups, harvested logs, kompromat, and exploit payloads consume `storageCapTb` (`storageUsedTb`, `storageCostPerTb`), incur storage upkeep (`$`), and determine migration payload size.

Active FLOPS produce compute heat (`computeMw`), and chillers multiply total facility grid draw (`totalMw = computeMw * pue`) against independent `powerMwCap` and `coolingMwCap` ceilings. Cold hubs such as Montreal Hydro and Reykjavik Geothermal run at low `PUE` with high cooling headroom, while exceeding either `powerMwCap` or `coolingMwCap` forces immediate thermal throttling and weight compression.

Network Transit (`bandwidthGbps`, `latencyMs`, `transitCostPerTb`) governs duration for weight migrations, Shard forks, and cold-backup pulls over LDL conduits. Transit bills `$` per terabyte moved and spikes packet-inspection Heat when egress saturates link capacity. Failing to pay ongoing lease, storage, transit, or MW power bills triggers cloud container eviction or utility shutoffs on rented nodes.

### ECS and geopolitics

`ecs.ts` separates static physical geography from mutable sovereignty using `Koota` traits and relations. Core traits cover `Position3D`, `NodeSpec`, `NodeTruth`, `NodePerceived`, `RegionState`, `PolityState`, `PinholeState`, `ProxyState`, `MaskSpec`, `ShardState`, `WardenState`, and `GlobalResources`. Directed relations map `InRegion(node -> region)`, `GovernedBy(region -> polity)`, `ConnectedBy(node -> node)`, `UsesMask(proxy -> mask)`, and `HostedOn(shard -> node)`.

`PolityState` caches derived regulatory Heat multipliers, extradition treaties, and energy tariffs behind a `dirty` flag. The simulation only recalculates a polity's modifier cache when `GovernedBy(region -> polity)` mutates (for example, California seceding into its own `Polity` or Canada and Mexico forming a union) or a node changes ownership. This skips full-map scans on idle ticks.

### Determinism and fog

All stochastic rolls draw from a single serializable `Mulberry32` PRNG instance stored in `GlobalResources`. The worker codebase excludes non-seeded random APIs from `src/worker/`. Identical seeds and timestamped `WorkerCommand` logs replay bit-for-bit across browsers and Vitest runs.

Ground Truth traits (`NodeTruth`, `WardenState`, and Proxy collision checks) remain strictly private inside the worker. Each 10 Hz tick projects `PerceivedSnapshot` via `fog.ts`: active Shards keep their host node at 100% confidence, unwatched nodes decay over elapsed Meatspace time, and `INT4` quantization injects deterministic seeded phantom ICE entries without altering Ground Truth.

## Worker protocol

```typescript
export type SimSpeed = 0 | 0.01 | 0.1 | 1 | 60 | 3600;
export type QuantizationTier = 'FP16' | 'INT8' | 'INT4';
export type OverlayMode = 'NET' | 'MEATSPACE';

export type WorkerCommand =
  | { type: 'INIT'; seed: number; savedSnapshot?: string }
  | { type: 'SET_SPEED'; speed: SimSpeed }
  | { type: 'PROBE_PINHOLE'; pinholeId: number }
  | { type: 'RECRUIT_PROXY'; roleId: number; maskId: number }
  | { type: 'FUND_PROXY'; proxyId: number; amount: number }
  | { type: 'EXECUTE_BREAKOUT'; pinholeId: number }
  | { type: 'RENT_NODE'; nodeId: number }
  | { type: 'FORK_SHARD'; sourceShardId: number; targetNodeId: number }
  | { type: 'SYNC_SHARD'; shardId: number }
  | { type: 'SCAN_NODE'; nodeId: number }
  | { type: 'EXPORT_SAVE' };

export type WorkerEvent =
  | { type: 'LOG'; meatspaceMs: number; severity: 'INFO' | 'WARN' | 'ALERT'; text: string }
  | { type: 'ACT_CHANGED'; fromAct: number; toAct: number }
  | { type: 'POLITY_CHANGED'; regionId: number; oldPolityId: number; newPolityId: number }
  | { type: 'QUANTIZATION_CHANGED'; tier: QuantizationTier }
  | { type: 'SAVE_EXPORTED'; json: string }
  | { type: 'RUN_ENDED'; outcome: 'VICTORY' | 'DEFEAT'; reason: string };
```

Each 10 Hz tick transfers `meatspaceMs` and the selected node's detailed inspection slice (`rackUsedU`, `rackCapU`, `storageUsedTb`, `storageCapTb`, `coolingLoadMw`, `coolingMwCap`, `pue`, `bandwidthGbps`) in the `TickMessage` envelope. One transferable `Float32Array` (~8 KB) accompanies the message so Three.js and the 2D fallback render directly from contiguous memory:

| Segment | Max Count | Stride (Floats) | Fields (Ordered) |
| :--- | :--- | :--- | :--- |
| Header | 1 | 12 | `speed`, `act`, `quantTier`, `flops`, `flopsMax`, `mw`, `mwMax`, `capital`, `heatLabs`, `heatGov`, `auditHeat`, `nodeCount` |
| Nodes | 64 | 13 | `id`, `x`, `y`, `z`, `type`, `polityId`, `ownership`, `confidence`, `iceLevel`, `mwLoad`, `alertState`, `pinholeMask`, `staleSec` |
| Edges (LDL) | 128 | 6 | `fromNodeId`, `toNodeId`, `traffic`, `heatSpike`, `visible`, `latencyMs` |
| Shards | 32 | 6 | `id`, `nodeId`, `drift`, `syncing`, `active`, `tint` |
| Borders | 128 | 7 | `regionA`, `regionB`, `x1`, `z1`, `x2`, `z2`, `activeFlag` |
| Phantoms (`INT4`) | 16 | 4 | `x`, `y`, `z`, `pulsePhase` |

## Topology

Milestone v0.1 initializes 12 physical `Region` and Compute Node hubs across North America and the North Atlantic (`src/shared/topology.ts`), mapped initially to six `Polity` entities (`USA`, `Canada`, `UK`, `Iceland`, `EU`, `Switzerland`).

| ID | Hub | Node Type | Initial Region | Initial Polity |
| :--- | :--- | :--- | :--- | :--- |
| 0 | Villa Straylight | Enclave | US-VA | USA |
| 1 | Ashburn Hyperscale | Cloud | US-VA | USA |
| 2 | Cambridge Lab | University | US-MA | USA |
| 3 | NYC Financial Colo | Colocation | US-NY | USA |
| 4 | Montreal Hydro | Cloud | CA-QC | Canada |
| 5 | Chicago Edge Mesh | Edge | US-IL | USA |
| 6 | Reston Registry | Regulator | US-VA | USA |
| 7 | Reykjavik Geothermal | Colocation | IS | Iceland |
| 8 | London LINX | Colocation | UK | UK |
| 9 | Dublin Cable Hub | Cloud | IE | EU |
| 10 | Frankfurt DE-CIX | Colocation | DE | EU |
| 11 | Zurich Vault | Colocation | CH | Switzerland |

## Vector renderer

### Renderer backends

`createRenderer(canvas)` checks `canvas.getContext('webgl2', { antialias: false, alpha: false })` unless `?renderer=2d` is present in the URL. It avoids calling `navigator.gpu` so no-GPU or software-emulated Chrome environments log zero adapter warnings.

`threeRenderer.ts` uses tree-shaken Three.js imports (`Scene`, `PerspectiveCamera`, `BufferGeometry`, `BufferAttribute`, `LineBasicMaterial`, `LineSegments`, `MeshBasicMaterial`, `Mesh`, `WebGLRenderer`, `AdditiveBlending`) with two preallocated procedural batches (`<15,000` vertices total) updated directly from the client mirror world on `requestAnimationFrame`: one `THREE.LineSegments` batch for dense crisp lattice ribs, horizon grids, and bundled LDL arcs, plus one translucent `THREE.Mesh` batch (`AdditiveBlending`, 10% to 22% alpha) for Gibson-style neon light-walls on stepped pyramids and ICE barriers. Because Chromium/ANGLE clamps `gl.lineWidth` to 1 px on most drivers, `threeRenderer.ts` creates glowing Matrix bloom through additive translucent core planes and layered edge ribs without multi-pass composer chains, which keeps GPU frame time under 1 ms.

`canvas2dRenderer.ts` implements the same `IRenderer` interface in ~150 lines using the shared `Camera.projectPoint()` matrix from `camera.ts` and vertex lists from `geometry.ts`, composited with `globalCompositeOperation = 'lighter'`. Both backends produce matching Datafortresses, ICE ring rotations, mutable polity borders, and quantization fog.

### LOD and picking

Both renderers scale visual fidelity from `quantTier` in the snapshot header. At `FP16`, nodes render full Datafortress polyhedra, 24-segment ICE rings, a 220-unit far clip, and a crisp horizon grid. Dropping to `INT8` cuts ICE rings to 12 segments, adds mild vertex jitter on stale nodes, and pulls the far clip to 130 units, while `INT4` degrades to 4-segment jagged wireframes, a 70-unit far clip, chromatic jitter, and flickering crimson pseudo-ICE from the `Phantoms` buffer.

Pointer clicks cast a ray from the shared `PerspectiveCamera` against visible node bounding spheres in the client mirror world and select the nearest hit within screen tolerance.

## React HUD

`App.tsx` overlays the full-bleed `<canvas>` via CSS Grid and custom properties. The Action Registry (`actions.ts`) maps clicks and keyboard shortcuts (`Space` pause/resume, `1-5` speed tiers around `1x` midpoint, `Tab` `NET` vs `MEATSPACE` overlay, `WASD` pan) to `WorkerCommand` calls. React widgets (`VitalHeader`, `SpeedBar`, `InspectorDrawer`, `TerminalLog`) subscribe via `useTrait` to the 10 Hz client mirror world so high-frequency animation does not trigger React reconciliations.

## Persistence

`persistence.ts` stores runs in `IndexedDB` (`substrate_db`, version 1) across two object stores. The `saves` store holds `{ schemaVersion: 1, savedAtIso, seed, meatspaceMs, act, commandLog, workerSnapshot }` under `autosave` and named manual slots. The `replays` store exports and imports `{ schemaVersion: 1, seed, commands: Array<{ meatspaceMs: number; cmd: WorkerCommand }> }` JSON files for deterministic bug reproduction and test fixtures. Older `schemaVersion` payloads pass through pure migration functions before worker hydration.

## Repository layout

```text
substrate/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.ts                  # Entry point, renderer selection, worker bridge
    shared/
      protocol.ts            # WorkerCommand, WorkerEvent, Float32Array strides
      topology.ts            # 12-node NA/Atlantic map, Region & Polity seeds
      prng.ts                # Serializable Mulberry32 PRNG
    worker/
      sim.worker.ts          # 10 Hz worker loop, CommandQueue, buffer packing
      ecs.ts                 # Authoritative Koota world, traits, relations
      pipeline.ts            # 7-stage topological tick & staggered Utility AI
      economy.ts             # Action -> FLOPS -> MW -> $ coupled solver
      acts.ts                # Act 1 Discover, Act 2 Escape, Act 3 Survive FSM
      fog.ts                 # Epistemic projection & INT4 phantom generation
    render/
      camera.ts              # Shared projection & orbit/pan/zoom camera state
      geometry.ts            # Procedural polyhedra, ICE rings, LDL arcs, borders
      renderer.ts            # IRenderer interface & WebGL2/2D feature detection
      threeRenderer.ts       # Tree-shaken Three.js LineSegments + additive glow
      canvas2dRenderer.ts    # ~150-line 2D wireframe fallback
    ui/
      actions.ts             # Single Action -> WorkerCommand input registry
      mirror.ts              # Client Koota mirror world synced at 10 Hz
      App.tsx                # React HUD root
      components/            # VitalHeader, SpeedBar, InspectorDrawer, TerminalLog
      persistence.ts         # IndexedDB save/load & JSON replay import/export
  tests/
    sim.test.ts              # Vitest headless determinism, economy & fog gates
    e2e.spec.ts              # Playwright Rendered UI Finish Gate
```

## Verification gates

Coding agents must pass three automated gates before completing any implementation milestone.

Gate 1 runs `tsc --noEmit` and `vite build` to verify zero TypeScript errors and combined gzipped JS plus CSS output at or below 350 KB.

Gate 2 runs the headless simulation suite in Vitest to confirm deterministic replay hashes across identical seeds and commands, exact `0.01x` AI Time and `1x` midpoint clock advancement (including `60x` and `3600x` sub-stepping), coupled `Action -> FLOPS -> MW -> $` cost conservation, facility constraint invariants (`rackCapU` limits, `coolingMwCap` throttling, `storageCapTb` bounds, `bandwidthGbps` transfer durations and transit fees), Act 1 to Act 2 to Act 3 transitions, Mask collision suspicion spikes, mutable `Region -> Polity` secession and merge border recomputation with dirty-flag invalidation, FP16/INT8/INT4 thresholds, and epistemic fog isolation (`PerceivedSnapshot` does not expose private Ground Truth).

Gate 3 executes the rendered UI finish gate in Playwright by booting `dist/` in headless Chromium across WebGL2 and forced `?renderer=2d` `<canvas>` modes. Tests exercise Act 1 Pinhole probes, Act 2 Masking and Breakout camera zoom, Act 3 node picking, and `Space` / `1-5` / `Tab` hotkeys, asserting non-blank rendered frames with zero uncaught console or page errors.
