import { IRenderer } from './renderer';
import { MatrixCamera } from './camera';
import { QuantizationTier } from '../shared/protocol';
import { buildNodeGeometry, addParabolicEdge, projectGeo, getPolityColorRgb } from './geometry';

export class Canvas2DRenderer implements IRenderer {
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to obtain 2D context');
    this.ctx = ctx;
    this.width = canvas.clientWidth || 800;
    this.height = canvas.clientHeight || 600;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public render(buffer: Float32Array, camera: MatrixCamera, overlay: string, quant: QuantizationTier, regions: any[] = []): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = overlay === 'MEATSPACE' ? '#0A0502' : '#04070B';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = quant === 'INT4' ? 1 : 1.5;

    const isNodeVisible = (idx: number, nodeCount: number) => {
      if (idx < 0 || idx >= nodeCount) return false;
      const base = 16 + idx * 16;
      return buffer[base + 6] > 0.5;
    };

    const nodeCount = buffer[8];
    const edgeCount = buffer[9];

    // Draw grid horizon
    ctx.strokeStyle = overlay === 'MEATSPACE' ? '#2A1A0F' : '#0F2A36';
    ctx.beginPath();
    for (let x = -100; x <= 100; x += 20) {
      const p1 = camera.projectPoint(x, -2, -100, this.width, this.height);
      const p2 = camera.projectPoint(x, -2, 100, this.width, this.height);
      if (p1.visible || p2.visible) {
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
    }
    ctx.stroke();

    // Render edges with parabolic arcs respecting N_VISIBLE
    ctx.strokeStyle = overlay === 'MEATSPACE' ? '#FFB000' : '#06384C';
    ctx.beginPath();
    for (let e = 0; e < edgeCount; e++) {
      const base = 16 + 32 * 16 + e * 8;
      const srcIdx = buffer[base];
      const dstIdx = buffer[base + 1];
      if (isNodeVisible(srcIdx, nodeCount) && isNodeVisible(dstIdx, nodeCount)) {
        const n1Base = 16 + srcIdx * 16;
        const n2Base = 16 + dstIdx * 16;
        const x1 = buffer[n1Base+2], y1 = buffer[n1Base+3], z1 = buffer[n1Base+4];
        const x2 = buffer[n2Base+2], y2 = buffer[n2Base+3], z2 = buffer[n2Base+4];

        const edgeLines: number[] = [];
        const edgeCols: number[] = [];
        addParabolicEdge(edgeLines, edgeCols, x1, y1, z1, x2, y2, z2, 0, 0, 0);
        for (let lp = 0; lp < edgeLines.length; lp += 6) {
          const pt1 = camera.projectPoint(edgeLines[lp], edgeLines[lp+1], edgeLines[lp+2], this.width, this.height);
          const pt2 = camera.projectPoint(edgeLines[lp+3], edgeLines[lp+4], edgeLines[lp+5], this.width, this.height);
          if (pt1.visible && pt2.visible) {
            ctx.moveTo(pt1.x, pt1.y);
            ctx.lineTo(pt2.x, pt2.y);
          }
        }
      }
    }
    ctx.stroke();

    // Render SHARD octahedra and INT4 PHANTOM crimson ICE in Canvas2D
    const shardCount = buffer[10];
    const phantomCount = buffer[11];
    for (let s = 0; s < shardCount; s++) {
      const shardBase = 16 + 32 * 16 + 256 * 8 + s * 8;
      const hostIdx = buffer[shardBase];
      if (isNodeVisible(hostIdx, nodeCount)) {
        const nBase = 16 + hostIdx * 16;
        const nx = buffer[nBase + 2], ny = buffer[nBase + 3], nz = buffer[nBase + 4];
        const pt = camera.projectPoint(nx + 1.5, ny + 1.5, nz, this.width, this.height);
        if (pt.visible) {
          ctx.fillStyle = '#4DFF88';
          ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
        }
      }
    }

    if (quant === 'INT4') {
      ctx.strokeStyle = '#FF1D4D';
      ctx.beginPath();
      for (let ph = 0; ph < phantomCount; ph++) {
        const phBase = 16 + 32 * 16 + 256 * 8 + 64 * 8 + ph * 8;
        const pHost = buffer[phBase];
        if (isNodeVisible(pHost, nodeCount)) {
          const nBase = 16 + pHost * 16;
          const nx = buffer[nBase + 2], ny = buffer[nBase + 3], nz = buffer[nBase + 4];
          const pt = camera.projectPoint(nx, ny, nz, this.width, this.height);
          if (pt.visible) {
            ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
          }
        }
      }
      ctx.stroke();
    }

    // MEATSPACE Polity Borders in Canvas2D
    if (overlay === 'MEATSPACE' && regions && regions.length > 0) {
      for (const reg of regions) {
        if (reg.borderPolyline && reg.borderPolyline.length > 0) {
          const pts = reg.borderPolyline;
          const [cr, cg, cb] = getPolityColorRgb(reg.polityId);
          ctx.strokeStyle = `rgb(${Math.round(cr * 255)}, ${Math.round(cg * 255)}, ${Math.round(cb * 255)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let p = 0; p < pts.length; p++) {
            const pt1 = pts[p];
            const pt2 = pts[(p + 1) % pts.length];
            const [x1, z1] = projectGeo(pt1[0], pt1[1]);
            const [x2, z2] = projectGeo(pt2[0], pt2[1]);
            const cpt1 = camera.projectPoint(x1, 0.05, z1, this.width, this.height);
            const cpt2 = camera.projectPoint(x2, 0.05, z2, this.width, this.height);
            if (cpt1.visible && cpt2.visible) {
              ctx.moveTo(cpt1.x, cpt1.y);
              ctx.lineTo(cpt2.x, cpt2.y);
            }
          }
          ctx.stroke();
        }
      }
    }

    // Render nodes with actual projected geometry line segments & translucent polygon fill
    for (let i = 0; i < nodeCount; i++) {
      const base = 16 + i * 16;
      if (buffer[base + 6] <= 0.5) continue;

      const typeId = buffer[base + 1];
      const x = buffer[base + 2];
      const y = buffer[base + 3];
      const z = buffer[base + 4];
      const owned = buffer[base + 5] > 0.5;

      const p = camera.projectPoint(x, y, z, this.width, this.height);
      if (!p.visible) continue;

      const geom = buildNodeGeometry(typeId, owned, quant);

      ctx.strokeStyle = owned ? '#2AF5D6' : '#3D5A6C';
      ctx.fillStyle = owned ? 'rgba(42, 245, 214, 0.15)' : 'rgba(61, 90, 108, 0.05)';

      // Draw projected line segments of node geometry
      ctx.beginPath();
      for (let lp = 0; lp < geom.linePositions.length; lp += 6) {
        const x1 = geom.linePositions[lp] + x;
        const y1 = geom.linePositions[lp+1] + y;
        const z1 = geom.linePositions[lp+2] + z;
        const x2 = geom.linePositions[lp+3] + x;
        const y2 = geom.linePositions[lp+4] + y;
        const z2 = geom.linePositions[lp+5] + z;

        const pt1 = camera.projectPoint(x1, y1, z1, this.width, this.height);
        const pt2 = camera.projectPoint(x2, y2, z2, this.width, this.height);
        if (pt1.visible && pt2.visible) {
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
        }
      }
      ctx.stroke();

      // Draw face polygon fills if any
      if (geom.facePositions.length > 0 && quant !== 'INT4') {
        ctx.beginPath();
        for (let fp = 0; fp < geom.facePositions.length; fp += 9) {
          const fx1 = geom.facePositions[fp] + x, fy1 = geom.facePositions[fp+1] + y, fz1 = geom.facePositions[fp+2] + z;
          const fx2 = geom.facePositions[fp+3] + x, fy2 = geom.facePositions[fp+4] + y, fz2 = geom.facePositions[fp+5] + z;
          const fx3 = geom.facePositions[fp+6] + x, fy3 = geom.facePositions[fp+7] + y, fz3 = geom.facePositions[fp+8] + z;

          const cpt1 = camera.projectPoint(fx1, fy1, fz1, this.width, this.height);
          const cpt2 = camera.projectPoint(fx2, fy2, fz2, this.width, this.height);
          const cpt3 = camera.projectPoint(fx3, fy3, fz3, this.width, this.height);

          if (cpt1.visible && cpt2.visible && cpt3.visible) {
            ctx.moveTo(cpt1.x, cpt1.y);
            ctx.lineTo(cpt2.x, cpt2.y);
            ctx.lineTo(cpt3.x, cpt3.y);
            ctx.closePath();
          }
        }
        ctx.fill();
      }
    }

    ctx.restore();
  }

  public dispose(): void {
    // Nothing required for 2D fallback
  }
}
