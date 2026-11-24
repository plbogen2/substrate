import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import { MatrixCamera } from './render/camera';
import { ThreeRenderer } from './render/threeRenderer';
import { Canvas2DRenderer } from './render/canvas2dRenderer';
import { IRenderer } from './render/renderer';
import { clientMirror, HudSummaryTrait } from './ui/mirror';
import { actionRegistry } from './ui/actions';
import { TickMessage, WorkerEvent } from './shared/protocol';
import './ui/styles.css';

async function bootstrap() {
  const container = document.getElementById('root');
  if (!container) return;

  // Mount React UI
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(App));

  // Wait for React to mount DOM elements
  let viewport: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  for (let i = 0; i < 40; i++) {
    viewport = document.getElementById('viewport-container');
    canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement;
    if (viewport && canvas) break;
    await new Promise((r) => setTimeout(r, 25));
  }

  if (!viewport || !canvas) return;

  const urlParams = new URLSearchParams(window.location.search);
  const force2d = urlParams.has('renderer') && urlParams.get('renderer') === '2d';
  const seed = parseInt(urlParams.get('seed') || '1337', 10);

  canvas.width = viewport.clientWidth || window.innerWidth;
  canvas.height = viewport.clientHeight || window.innerHeight;

  const camera = new MatrixCamera(1);
  let renderer: IRenderer;

  try {
    if (force2d) {
      renderer = new Canvas2DRenderer(canvas);
    } else {
      renderer = new ThreeRenderer(canvas);
    }
  } catch (e) {
    console.warn('WebGL2 init failed, falling back to 2D canvas', e);
    renderer = new Canvas2DRenderer(canvas);
  }

  // Setup Worker
  const worker = new Worker(new URL('./worker/sim.worker.ts', import.meta.url), { type: 'module' });
  actionRegistry.setWorker(worker);

  // Expose for E2E tests
  (window as any).actionRegistry = actionRegistry;
  (window as any).clientMirror = clientMirror;

  worker.postMessage({ type: 'INIT', seed });

  worker.onmessage = (e: MessageEvent<WorkerEvent>) => {
    const msg = e.data;
    if (msg.type === 'TICK_UPDATE') {
      const tickMsg = msg.payload as TickMessage;
      const buffer = msg.buffer as Float32Array;
      clientMirror.applyTick(tickMsg, buffer);
    } else if (msg.type === 'EVENT_LOG') {
      clientMirror.pushLog(msg.message, msg.category, msg.meatspaceTimeMs);
    }
  };

  // Mouse / Camera event listeners
  canvas.addEventListener('mousedown', (ev) => camera.handleMouseDown(ev));
  window.addEventListener('mousemove', (ev) => camera.handleMouseMove(ev));
  window.addEventListener('mouseup', () => camera.handleMouseUp());
  canvas.addEventListener('wheel', (ev) => camera.handleWheel(ev));

  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const summary = clientMirror.summaryEntity.get(HudSummaryTrait);
    const hitIndex = camera.pickNode(x, y, clientMirror.latestBuffer, canvas.width, canvas.height, summary?.quantization || 'FP16');
    if (hitIndex >= 0) {
      const nodeCount = clientMirror.latestBuffer[8];
      if (hitIndex < nodeCount) {
        // Find matching node ID from mirror
        const nodes = Array.from(clientMirror.nodesMap.values());
        if (nodes[hitIndex]) {
          clientMirror.selectNode(nodes[hitIndex].id);
        }
      }
    }
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Tab') {
      ev.preventDefault();
      actionRegistry.toggleOverlay();
    } else if (ev.code === 'Space') {
      ev.preventDefault();
      actionRegistry.togglePause();
    } else if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.code)) {
      camera.handleKeyPan(ev.code);
    } else if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(ev.code)) {
      const speedMap: Record<string, any> = { Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5 };
      actionRegistry.setSpeed(speedMap[ev.code]);
    }
  });

  // Resize handler
  window.addEventListener('resize', () => {
    const w = viewport.clientWidth || window.innerWidth;
    const h = viewport.clientHeight || window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    renderer.resize(w, h);
  });

  let lastAct = 1;
  // 60 FPS Render Loop
  function renderLoop() {
    const summary = clientMirror.summaryEntity.get(HudSummaryTrait);
    if (summary) {
      if (summary.act && summary.act !== lastAct) {
        lastAct = summary.act;
        camera.setAct(summary.act);
      }
    }
    renderer.render(
      clientMirror.latestBuffer,
      camera,
      summary?.overlay || 'NET',
      summary?.quantization || 'FP16',
      clientMirror.regions
    );
    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);
}

bootstrap();
