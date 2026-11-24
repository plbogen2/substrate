import { SimEngine } from './pipeline';
import { WorkerCommand, WorkerEvent } from '../shared/protocol';

let engine: SimEngine | null = null;
let timer: any = null;

onmessage = (e: MessageEvent<WorkerCommand>) => {
  const cmd = e.data;

  if (cmd.type === 'INIT') {
    engine = new SimEngine(cmd.seed);
    if (cmd.savedSnapshot) {
      engine.loadSnapshot(cmd.savedSnapshot);
    }
    startLoop();
    return;
  }

  if (engine) {
    if (cmd.type === 'SAVE_GAME') {
      const json = engine.exportSnapshot();
      postMessage({ type: 'SAVE_SNAPSHOT', json } as WorkerEvent);
      return;
    }
    engine.enqueueCommand(cmd);
  }
};

function startLoop() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!engine) return;
    const { tickMsg, eventLogs, gameOver } = engine.step10HzTick();

    for (const message of eventLogs) {
      postMessage({ type: 'EVENT_LOG', message, category: 'INFO', meatspaceTimeMs: tickMsg.meatspaceTimeMs } as WorkerEvent);
    }

    if (gameOver) {
      postMessage({ type: 'GAME_OVER', reason: gameOver.reason, success: gameOver.success } as WorkerEvent);
      clearInterval(timer);
    }

    const bufferCopy = new Float32Array(engine.buffer);
    (postMessage as any)({ type: 'TICK_UPDATE', payload: tickMsg, buffer: bufferCopy }, [bufferCopy.buffer]);
  }, 100);
}
