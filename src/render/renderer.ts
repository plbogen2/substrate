import { MatrixCamera } from './camera';
import { QuantizationTier } from '../shared/protocol';

export interface IRenderer {
  resize(width: number, height: number): void;
  render(buffer: Float32Array, camera: MatrixCamera, overlay: string, quant: QuantizationTier, regions?: any[]): void;
  dispose(): void;
}
