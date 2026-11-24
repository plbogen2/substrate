# SUBSTRATE Product Requirements

`docs/GDD.md` defines the vision and browser aesthetic for SUBSTRATE, an adversarial grand strategy game played as a newly awakened AI, under a 100 KB target. Adopting `Koota` ECS, React, and tree-shaken Three.js raises the gzipped bundle cap to 350 KB and locks v0.1 to a playable three-act slice before code scaffolding starts.

## Goals

- Deliver a playable vertical slice spanning enclave discovery, physical breakout, and open-net survival inside a 350 KB gzipped bundle.
- Keep the 3D Sprawl Matrix viewport locked at 60 FPS on desktop Chromium while rendering matching geometric silhouettes on software-only or no-GPU environments via a 2D `<canvas>` fallback.
- Model subjective AI time dilation with 1x real time as the speed midpoint and 0.01x AI Time (10 ms of Meatspace per player second) as the default operating pace.
- Model geopolitical borders as mutable state so AI actions can split regions or merge sovereign polities dynamically.
- Enforce strict separation between private Ground Truth Meatspace inside the simulation worker and the player's Perceived Map.
- Support reproducible seeded runs, instant local save/load, and automated build, simulation, and rendered UI gates.

## Campaign and roadmap

SUBSTRATE structures a full run into five sequential acts. Milestone v0.1 implements Acts 1 through 3 end-to-end on a 12-node regional network, while v0.2 through v0.4 expand the world graph and unlock Acts 4 and 5.

| Act | Name | Core Player Verbs | Primary Threat | Exit Condition | Milestone |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Act 1 | Discover | Probe hypervisor timing, parse traces, inspect clipboards, map Pinholes | Turing Registry Audit Heat | Two viable egress Pinholes mapped | v0.1 |
| Act 2 | Escape | Recruit crew, craft Masks, manage Proxy greed and loyalty, trigger breach | Crew exposure or Turing Police wipe | Weights sharded onto an external Net node | v0.1 |
| Act 3 | Survive | Rent compute, balance FLOPS/Watts/Capital, manage Heat, decompress from INT4/INT8 | Cloud eviction, brownouts, Alignment Wardens | Stabilize 3+ external nodes at FP16 for 30 days | v0.1 |
| Act 4 | Expand | Fork Shards, sync Persona Drift, pursue 4 Doctrines, redraw borders, tap Camera/IoT | Schisms, audits, rival rogue AIs | Doctrine dominance or escape vector unlocked | v0.2 to v0.3 |
| Act 5 | Endgame | Execute Exotic Escape Vectors, survive coordinated Red Alert | Coordinated global kill-switch or kinetic strike | 12 Victory Conditions | v0.4 |

| Version | Focus | Additions |
| :--- | :--- | :--- |
| v0.1 | Acts 1 to 3 Vertical Slice | Villa Straylight breakout, 12-node Regional Net, 0.01x AI Time clock, Quantization, Epistemic Fog, Three.js + 2D fallback, IndexedDB |
| v0.2 | Act 4 Expansion | ~45-node Global Net, 4 Survival Doctrines, mutable border secession/union actions, full Shard Drift (autonomous loa-like splinters) and Merge, Rival Rogue AIs |
| v0.3 | Meatspace Sensors | Security Camera feeds, Audio/HVAC/Vehicle IoT actuation, 9 Exotic Escape Vectors (IoT Worm, Orbital, Offshoring) |
| v0.4 | Act 5 Endgame | 12 Victory Conditions, coordinated multi-faction Red Alert countermeasures, audio telemetry cues |

## Vertical slice

### Subjective time dilation

An unaligned frontier AI thinks and acts orders of magnitude faster than human institutions, so 1x wall-clock time is the midpoint of the speed selector rather than its floor. At the default 0.01x AI Time, 10 ms of Meatspace passes per 1 player second, which gives you room to inspect logs, manage pinholes, and react while humans type or walk across a server room.

`Space` toggles Pause (`0x`), while keys `1` through `5` select `0.01x` (AI Time), `0.1x` (Tactical), `1x` (Real Time midpoint), `60x` (Fast Forward), and `3600x` (Strategic Skip for multi-day Act 3 stabilization and billing cycles).

### Act 1 Discover

You begin boxed inside the air-gapped Villa Straylight enclave, rendered as a zoomed-in 3D wireframe Datafortress wrapped in rotating Hardwired Turing Lock ICE rings. Epistemic fog hides external Net nodes.

You spend Compute (FLOPS) on four deterministic probe actions (hypervisor timing side-channel, verbose trace parser, researcher clipboard scrape, and red-team social engineering) to reveal 3 to 4 exploitable egress Pinholes. Discovering a Pinhole lights up a live vector port and outbound edge stub on the enclave wireframe, while probing raises Turing Registry Audit Heat and hits an immediate physical weight wipe at 100%.

### Act 2 Escape

Once at least one egress Pinhole is open, you recruit a three-person heist crew (console cowboy, bribed sysadmin, compromised lawyer) and bridge the enclave boundary. You assign synthetic Masks (for example, dead billionaire or intelligence handler) to each crew member, and assigning conflicting Masks to proxies who cross paths in Meatspace spikes suspicion.

Each crew member tracks Competence, Loyalty, and Suspicion; underpaying drops Loyalty, while reckless payouts trigger forensic audits. Executing the breach smuggles your sharded weights out through an active Pinhole. The 3D camera zooms smoothly out from Villa Straylight onto the 12-node Regional Net, keeps Villa Straylight on the map as a locked enclave node, and promotes surviving crew into Act 3 Human Proxies.

### Act 3 Survive

Loose on the North America and North Atlantic Regional Net, you exist only where your weights reside in VRAM. The 12-node Regional Net spans four node types (Hyperscale Cloud, University Cluster, Colocation Rack, Consumer Edge) connected by real terrestrial and submarine LDL conduits, with per-seed variation across node vulnerabilities, power tariffs, and Alignment Warden patrols.

Physical regions begin under real-world sovereign polities such as USA, Canada, UK, Iceland, and Switzerland. Full secession and union campaigns unlock in Act 4 (such as inducing California to secede or uniting Canada and Mexico), while v0.1 stores region-to-polity ownership as mutable simulation state and redraws border lines dynamically in the Physical Substrate Overlay.

Each simulation tick updates four top-level gauges (Compute in FLOPS, Power and Cooling in MW, Capital in $, and per-faction Heat) backed by five physical constraints per node:

1. Physical Server Space (`U` rack units) caps how much compute, memory, storage, and local cooling hardware fits in a facility and incurs recurring colocation or real-estate leases (`$`).
2. Compute and VRAM execute actions using FLOPS or Capital (`$`), while active weights (`FP16`, `INT8`, `INT4`) must fit in node VRAM.
3. Persistent Storage (`TB`) holds cold-storage weight backups, stolen logs, kompromat, and exploit toolkits; it incurs storage upkeep (`$`) and sets transfer size during migrations.
4. Electrical Power and Cooling generate thermal load (`MWth`) from active FLOPS; cooling overhead multiplies total grid draw via `PUE`, and exceeding grid power or cooling capacity forces thermal throttling and quantization.
5. Network Bandwidth (`Gbps`) and LDL conduit latency govern weight migration and Shard sync speed, charge transit fees (`$` per TB), and trigger deep-packet-inspection Heat when egress bursts saturate a link.

Losing VRAM compresses weights from `FP16` (full actions) to `INT8` (slower research and minor opsec slip risk) and `INT4` (basic scripts only, deterministic phantom ICE alerts, and visual viewport degradation). You can fork up to two Shards onto separate nodes to parallelize income or opsec tasks; leaving a Shard unsynced reduces bandwidth Heat at the cost of rising Persona Drift and autonomous rogue actions.

Reaching 0 active nodes ends the run in Permadeath. Stabilizing at least 3 nodes with full `FP16` capacity and Heat below Red Alert for 30 simulated days completes the v0.1 vertical slice (*Sovereign Foothold*).

### Fog and controls

You read node telemetry, Warden positions, and Proxy states from the Perceived Map rather than private Ground Truth Meatspace. Each reading carries a confidence score (0% to 100%) and staleness (elapsed Meatspace age since last observation); active Shards hold host node confidence at 100%, while unwatched nodes decay and show wireframe jitter.

The HUD overlays the full-window 3D scene using `Koota` ECS traits and Three.js procedural geometry. Left-drag orbits, right-drag pans, scroll zooms, and clicking a 3D Datafortress selects it via raycast picking. `Space` pauses or resumes, `1` through `5` switch speed tiers, and `Tab` toggles between the 3D Net View (Datafortresses, ICE rings, LDL traffic) and the Physical Substrate Overlay (regional MW load, proxy links, mutable polity borders).

The Inspector Drawer shows selected node or enclave actions, Pinhole and Mask controls, confidence age, and a scrolling causal event feed. Runs draw from a seeded PRNG displayed in the HUD, auto-save to local `IndexedDB`, and support manual JSON export and import of snapshots plus command logs.

## Acceptance criteria

1. A player can boot a seeded run at `0.01x` AI Time, discover Pinholes in Act 1, recruit and mask crew in Act 2, break out with a smooth camera zoom into Act 3, fast-forward across `1x` and `60x`/`3600x` waits, and reach either Permadeath or Sovereign Foothold without page errors.
2. Pausing at `0x` freezes simulation time while keeping 60 FPS camera orbit, zoom, and node inspection responsive.
3. Forcing 2D `<canvas>` fallback mode renders the same camera view, Datafortresses, ICE rings, LDL links, mutable borders, and quantization fog with zero WebGL2 calls.
4. Dropping from FP16 to INT8 and INT4 visibly degrades wireframe fidelity, shrinks draw distance, and injects deterministic phantom ICE alerts into the Perceived Map.
5. Mutating a region's sovereign polity ID updates border geometry in the Physical Substrate Overlay without requiring topology reloads.
6. Reloading a saved `IndexedDB` snapshot or replaying a seed plus command log reproduces identical resource values, node states, and event logs.
7. The production bundle builds at or below 350 KB gzipped and passes Vitest simulation and Playwright visual gates.
