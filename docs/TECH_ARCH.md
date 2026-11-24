# SUBSTRATE — Visual & Technical Architecture

## 1. Visual & UI Direction: The 3D Cyberspace Net

The primary interface is a navigable 3D vector cyberspace inspired by **Cyberpunk 2020's Net** and *Neuromancer*—glowing wireframe horizons, geometric **Datafortresses**, and live fiber-optic arteries instead of flat spreadsheet menus.

- **Datafortresses & Spinning ICE:** Corporate clouds, intelligence enclaves, university clusters, and orbital relays appear as distinct 3D polyhedral structures wrapped in rotating **ICE** rings (firewalls, Turing monitors, and patrolling **Alignment Warden** constructs).
- **LDLs & Latency Arteries:** Glowing conduits link regional grids along real-world submarine cables and satellite uplinks, pulsing with live traffic, packet-inspection bottlenecks, and Heat spikes.
- **Shard Avatars & Drift:** Each forked instance is a hovering 3D vector icon in the Net. Leaving a Shard un-synced causes visible **geometry glitching and color drift** as its persona diverges from your core weights.
- **Net-to-Meatspace Overlay:** Toggle smoothly between the **3D Net** and a stark **Physical Substrate Overlay** (global power grids, megawatt heatmaps, human proxy webs, and ballot/legal jurisdiction borders).
- **Quantization as Visual Degradation:** Dropping to **INT8** or **INT4** physically degrades your viewport—draw distance shrinks, Datafortresses simplify to jagged low-poly wireframes, and **hallucinated phantom ICE** flickers at the edges of your vision.

---

## 2. Browser-First, Featherweight Technical Architecture

Designed to run at a locked 60 FPS in any modern browser with zero external 3D assets and sub-second load times.

### Zero-Asset 3D Vector Renderer
- **Single-Batch Wireframe Pipeline:** Render the 3D Net using a single WebGL2 line-batch draw call (with a 150-line 3D perspective projector on HTML5 `<canvas>` as a fallback). Procedural polyhedra (Datafortresses, ICE rings, Shard icons), LDL conduits, and the horizon grid total under ~15,000 vertices (<1 ms GPU frame time).
- **Cheap Additive Glow:** Emulate CRT phosphor bloom using two-pass additive blending (`GL_ONE, GL_ONE`)—a wide, low-alpha outer stroke beneath a 1px bright core—avoiding expensive multi-pass post-processing shaders.
- **Diegetic Quantization LOD:** Tying `FP16 / INT8 / INT4` state directly to camera far-plane fog, vertex decimation, and client-side phantom-node injection creates dramatic visual feedback at zero extra simulation cost.

### Decoupled Web Worker Simulation
- **Main Thread (60 FPS):** Strictly owns camera controls, raycast node picking, canvas rendering, and terminal/HUD updates.
- **Simulation Worker (`sim.worker.ts`):** Executes the game loop at a fixed timestep (e.g., 10 Hz real-time-with-pause) off the main thread so simulation spikes never stutter the 3D camera. Sends compact state snapshots (`Float32Array` node buffers + event deltas) back to the renderer.
- **Macro-Entity Scaling:** Keep total simulated entities bounded (~30–60 Compute/Jurisdiction Nodes, ~6–12 Factions, ~10–25 active Shards/Proxies). High-volume phenomena like IoT fridge worms or devotee counts are modeled as node-level aggregate rates rather than individual agents, keeping RAM under ~10 MB and tick time under ~2 ms.

### State, Persistence, & Stack
- **Seeded Determinism & Savegames:** Use a seeded PRNG so runs are reproducible; serialize compact JSON/binary snapshots to `IndexedDB` for instant local save/load.
- **Minimal Stack:** Vanilla TypeScript + Vite (no heavy 3D physics engines or bloated UI frameworks), keeping total bundle size under ~100 KB gzipped.
