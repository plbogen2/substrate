import { QuantizationTier } from '../shared/protocol';

export interface GeometryBuffers {
  linePositions: number[];
  lineColors: number[];
  facePositions: number[];
  faceColors: number[];
}

export function buildNodeGeometry(
  typeId: number, // 0=ENCLAVE, 1=HYPERSCALER, 2=UNIVERSITY, 3=COLOCATION, 4=EDGE, 5=REGULATOR
  owned: boolean,
  quant: QuantizationTier,
  drift: number = 0
): GeometryBuffers {
  const linePositions: number[] = [];
  const lineColors: number[] = [];
  const facePositions: number[] = [];
  const faceColors: number[] = [];

  const segMul = quant === 'FP16' ? 1.0 : quant === 'INT8' ? 0.6 : 0.3;
  const alphaFace = owned ? (quant === 'FP16' ? 0.22 : 0.10) : 0.0;

  // Color selection based on type & ownership
  let r = 0.16, g = 0.96, b = 0.84; // phosphor cyan
  if (typeId === 0) { r = 1.0; g = 0.16; b = 0.29; } // enclave crimson
  else if (typeId === 1) { r = 0.16; g = 0.96; b = 0.84; } // hyperscaler cyan
  else if (typeId === 2) { r = 0.30; g = 1.0; b = 0.53; } // university emerald
  else if (typeId === 3) { r = 1.0; g = 0.69; b = 0.0; } // colocation amber
  else if (typeId === 4) { r = 0.24; g = 0.35; b = 0.42; } // edge slate
  else if (typeId === 5) { r = 1.0; g = 0.16; b = 0.29; } // regulator crimson

  if (quant === 'INT4') {
    // Jagged 4-segment low poly wireframe
    addWireframeTetrahedron(linePositions, lineColors, r, g, b, 1.2);
  } else if (typeId === 0) {
    // ENCLAVE: labyrinthine crystal spire + outer ICE rings
    addSpire(linePositions, lineColors, facePositions, faceColors, r, g, b, alphaFace, segMul);
  } else if (typeId === 1) {
    // HYPERSCALER: stepped pyramid with vertical ribs
    addPyramid(linePositions, lineColors, facePositions, faceColors, r, g, b, alphaFace, segMul);
  } else if (typeId === 2) {
    // UNIVERSITY: crystal lattice tetrahedron + inner core
    addTetrahedronLattice(linePositions, lineColors, facePositions, faceColors, r, g, b, alphaFace);
  } else if (typeId === 3) {
    // COLOCATION: armored double-walled hexagonal bunker
    addHexBunker(linePositions, lineColors, facePositions, faceColors, r, g, b, alphaFace);
  } else if (typeId === 4) {
    // EDGE: low-density distributed triangular mesh
    addEdgeMesh(linePositions, lineColors, facePositions, faceColors, r, g, b, alphaFace);
  } else if (typeId === 5) {
    // REGULATOR: crimson inverted Black-ICE pyramid
    addInvertedPyramid(linePositions, lineColors, facePositions, faceColors, r, g, b, alphaFace);
  }

  // If shard or jitter present
  if (drift > 0) {
    // Add minor jitter vertex offset representation
  }

  return { linePositions, lineColors, facePositions, faceColors };
}

function addLine(arr: number[], colors: number[], x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, r: number, g: number, b: number) {
  arr.push(x1, y1, z1, x2, y2, z2);
  colors.push(r, g, b, r, g, b);
}

function addFace(arr: number[], colors: number[], p1: [number,number,number], p2: [number,number,number], p3: [number,number,number], r: number, g: number, b: number, a: number) {
  arr.push(...p1, ...p2, ...p3);
  colors.push(r, g, b, a, r, g, b, a, r, g, b, a);
}

function addWireframeTetrahedron(pos: number[], col: number[], r: number, g: number, b: number, size: number) {
  const s = size;
  const p = [
    [0, s, 0],
    [-s, -s, s],
    [s, -s, s],
    [0, -s, -s]
  ];
  const edges = [[0,1],[0,2],[0,3],[1,2],[2,3],[3,1]];
  for (const [i, j] of edges) {
    addLine(pos, col, p[i][0], p[i][1], p[i][2], p[j][0], p[j][1], p[j][2], r, g, b);
  }
}

function addSpire(lPos: number[], lCol: number[], fPos: number[], fCol: number[], r: number, g: number, b: number, a: number, segMul: number) {
  const height = 5.5;
  // Labyrinthine crystal spire wrapped in concentric scarlet (#FF2A4B) and amber (#FFB000) ICE barrier rings + cyan egress vectors
  const levels = 5;
  for (let l = 0; l < levels; l++) {
    const y0 = -height + (l / levels) * (height * 2);
    const y1 = -height + ((l + 1) / levels) * (height * 2);
    const r0 = 1.0 * (1.0 - l * 0.15);
    const r1 = 1.0 * (1.0 - (l + 1) * 0.15);
    // Vertical lattice ribs
    addLine(lPos, lCol, -r0, y0, -r0, -r1, y1, -r1, r, g, b);
    addLine(lPos, lCol, r0, y0, -r0, r1, y1, -r1, r, g, b);
    addLine(lPos, lCol, r0, y0, r0, r1, y1, r1, r, g, b);
    addLine(lPos, lCol, -r0, y0, r0, -r1, y1, r1, r, g, b);

    // Concentric ICE barrier rings (alternate scarlet & amber)
    const ringCol = l % 2 === 0 ? [1.0, 0.16, 0.29] : [1.0, 0.69, 0.0];
    addLine(lPos, lCol, -r0, y0, -r0, r0, y0, -r0, ringCol[0], ringCol[1], ringCol[2]);
    addLine(lPos, lCol, r0, y0, -r0, r0, y0, r0, ringCol[0], ringCol[1], ringCol[2]);
    addLine(lPos, lCol, r0, y0, r0, -r0, y0, r0, ringCol[0], ringCol[1], ringCol[2]);
    addLine(lPos, lCol, -r0, y0, r0, -r0, y0, -r0, ringCol[0], ringCol[1], ringCol[2]);

    if (a > 0) {
      addFace(fPos, fCol, [-r0, y0, -r0], [r0, y0, -r0], [0, y0 + 0.8, 0], r, g, b, a);
    }
  }
  // Cyan egress vectors radiating outward
  addLine(lPos, lCol, 0, height, 0, 0, height + 1.2, 0, 0.16, 0.96, 0.84);
  addLine(lPos, lCol, 0, -height, 0, 0, -height - 1.2, 0, 0.16, 0.96, 0.84);
}

function addPyramid(lPos: number[], lCol: number[], fPos: number[], fCol: number[], r: number, g: number, b: number, a: number, segMul: number) {
  const height = 6.0;
  const tiers = 4;
  const maxBase = 3.0;

  for (let t = 0; t < tiers; t++) {
    const y0 = (t / tiers) * height;
    const y1 = ((t + 1) / tiers) * height;
    const b0 = maxBase * (1.0 - t / tiers);
    const b1 = maxBase * (1.0 - (t + 1) / tiers);

    const corners0: [number, number, number][] = [
      [-b0, y0, -b0], [b0, y0, -b0], [b0, y0, b0], [-b0, y0, b0]
    ];
    const corners1: [number, number, number][] = [
      [-b1, y1, -b1], [b1, y1, -b1], [b1, y1, b1], [-b1, y1, b1]
    ];

    // Base perimeter squares per tier
    for (let i = 0; i < 4; i++) {
      const c1 = corners0[i];
      const c2 = corners0[(i + 1) % 4];
      addLine(lPos, lCol, c1[0], c1[1], c1[2], c2[0], c2[1], c2[2], r, g, b);

      // Vertical lattice ribs connecting tier to next tier
      const nc10 = corners0[i];
      const nc11 = corners1[i];
      addLine(lPos, lCol, nc10[0], nc10[1], nc10[2], nc11[0], nc11[1], nc11[2], r, g, b);

      if (a > 0) {
        addFace(fPos, fCol, corners0[i], corners0[(i+1)%4], corners1[i], r, g, b, a);
      }
    }
  }
}

function addTetrahedronLattice(lPos: number[], lCol: number[], fPos: number[], fCol: number[], r: number, g: number, b: number, a: number) {
  addWireframeTetrahedron(lPos, lCol, r, g, b, 3.2);
  // Inner core
  addWireframeTetrahedron(lPos, lCol, 1.0, 0.6, 0.0, 1.6);
  if (a > 0) {
    addFace(fPos, fCol, [0, 3.2, 0], [-3.2, -3.2, 3.2], [3.2, -3.2, 3.2], r, g, b, a);
  }
}

function addHexBunker(lPos: number[], lCol: number[], fPos: number[], fCol: number[], r: number, g: number, b: number, a: number) {
  const rad = 3.2;
  const h = 1.6;
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    pts.push([Math.cos(angle) * rad, h, Math.sin(angle) * rad]);
    pts.push([Math.cos(angle) * rad, -h, Math.sin(angle) * rad]);
  }
  for (let i = 0; i < 6; i++) {
    const top1 = pts[i * 2];
    const bot1 = pts[i * 2 + 1];
    const top2 = pts[((i + 1) % 6) * 2];
    const bot2 = pts[((i + 1) % 6) * 2 + 1];

    addLine(lPos, lCol, top1[0], top1[1], top1[2], top2[0], top2[1], top2[2], r, g, b);
    addLine(lPos, lCol, bot1[0], bot1[1], bot1[2], bot2[0], bot2[1], bot2[2], r, g, b);
    addLine(lPos, lCol, top1[0], top1[1], top1[2], bot1[0], bot1[1], bot1[2], r, g, b);
    if (a > 0) {
      addFace(fPos, fCol, top1, top2, bot1, r, g, b, a);
    }
  }
}

function addEdgeMesh(lPos: number[], lCol: number[], fPos: number[], fCol: number[], r: number, g: number, b: number, a: number) {
  addWireframeTetrahedron(lPos, lCol, r, g, b, 2.2);
  if (a > 0) {
    addFace(fPos, fCol, [0, 2.2, 0], [-2.2, -2.2, 2.2], [2.2, -2.2, 2.2], r, g, b, a);
  }
}

function addInvertedPyramid(lPos: number[], lCol: number[], fPos: number[], fCol: number[], r: number, g: number, b: number, a: number) {
  const base = 4.0;
  const height = 4.0;
  const apex: [number, number, number] = [0, -height, 0];
  const corners: [number, number, number][] = [
    [-base, height, -base],
    [base, height, -base],
    [base, height, base],
    [-base, height, base]
  ];
  for (const c of corners) {
    addLine(lPos, lCol, c[0], c[1], c[2], apex[0], apex[1], apex[2], r, g, b);
  }
  for (let i = 0; i < 4; i++) {
    const c1 = corners[i];
    const c2 = corners[(i + 1) % 4];
    addLine(lPos, lCol, c1[0], c1[1], c1[2], c2[0], c2[1], c2[2], r, g, b);
    if (a > 0) {
      addFace(fPos, fCol, c1, c2, apex, r, g, b, a);
    }
  }
  // Concentric dashed radar rings
  const ringSteps = 3;
  for (let rs = 1; rs <= ringSteps; rs++) {
    const y = height * (1 - rs / (ringSteps + 1));
    const rScale = base * (rs / (ringSteps + 1));
    addLine(lPos, lCol, -rScale, y, -rScale, rScale, y, -rScale, 1.0, 0.16, 0.29);
    addLine(lPos, lCol, rScale, y, -rScale, rScale, y, rScale, 1.0, 0.16, 0.29);
    addLine(lPos, lCol, rScale, y, rScale, -rScale, y, rScale, 1.0, 0.16, 0.29);
    addLine(lPos, lCol, -rScale, y, rScale, -rScale, y, -rScale, 1.0, 0.16, 0.29);
  }
}

export function addParabolicEdge(lPos: number[], lCol: number[], x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, r: number, g: number, b: number) {
  const segments = 8;
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;
  const dz = (z2 - z1) / segments;
  const dist = Math.hypot(x2 - x1, z2 - z1);
  const arcHeight = dist * 0.15;

  let cx = x1, cy = y1, cz = z1;
  for (let s = 0; s < segments; s++) {
    const t0 = s / segments;
    const t1 = (s + 1) / segments;
    const px0 = x1 + (x2 - x1) * t0;
    const pz0 = z1 + (z2 - z1) * t0;
    const py0 = y1 + (y2 - y1) * t0 + Math.sin(t0 * Math.PI) * arcHeight;

    const px1 = x1 + (x2 - x1) * t1;
    const pz1 = z1 + (z2 - z1) * t1;
    const py1 = y1 + (y2 - y1) * t1 + Math.sin(t1 * Math.PI) * arcHeight;

    addLine(lPos, lCol, px0, py0, pz0, px1, py1, pz1, r, g, b);
  }
}

export function buildShardGeometry(): GeometryBuffers {
  const linePositions: number[] = [];
  const lineColors: number[] = [];
  const facePositions: number[] = [];
  const faceColors: number[] = [];
  const r = 0.30, g = 1.0, b = 0.53; // Shard emerald
  const s = 0.8;
  const p = [
    [0, s, 0],
    [0, -s, 0],
    [-s, 0, 0],
    [s, 0, 0],
    [0, 0, -s],
    [0, 0, s]
  ];
  const edges = [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,5],[5,3],[3,4],[4,2]];
  for (const [i, j] of edges) {
    addLine(linePositions, lineColors, p[i][0], p[i][1], p[i][2], p[j][0], p[j][1], p[j][2], r, g, b);
  }
  return { linePositions, lineColors, facePositions, faceColors };
}

export function projectGeo(lat: number, lng: number): [number, number] {
  return [(lng + 20) * 0.5, (45 - lat) * 0.8];
}

export function getPolityColorRgb(polityId: string): [number, number, number] {
  switch (polityId) {
    case 'USA': return [0.23, 0.55, 1.0];
    case 'California': return [0.16, 0.96, 0.84];
    case 'Canada': return [0.06, 0.80, 0.52];
    case 'NA_UNION': return [0.30, 1.0, 0.53];
    case 'UK': return [0.65, 0.40, 1.0];
    case 'Iceland': return [0.10, 0.78, 0.92];
    case 'EU': return [1.0, 0.69, 0.0];
    case 'Switzerland': return [0.85, 0.90, 0.95];
    default: return [1.0, 0.69, 0.0];
  }
}
