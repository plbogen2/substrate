import * as THREE from 'three';
import { IRenderer } from './renderer';
import { MatrixCamera } from './camera';
import { QuantizationTier } from '../shared/protocol';
import { buildNodeGeometry, buildShardGeometry, addParabolicEdge, projectGeo, getPolityColorRgb } from './geometry';

export class ThreeRenderer implements IRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private threeCamera: THREE.PerspectiveCamera;
  private lineMesh: THREE.LineSegments;
  private faceMesh: THREE.Mesh;
  private horizonGrid: THREE.LineSegments;
  private maxVertices = 15000;
  private linePosAttr: THREE.BufferAttribute;
  private lineColAttr: THREE.BufferAttribute;
  private facePosAttr: THREE.BufferAttribute;
  private faceColAttr: THREE.BufferAttribute;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#04070B');

    this.threeCamera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 300);

    // Horizon grid
    const gridGeo = new THREE.BufferGeometry();
    const gridPositions: number[] = [];
    const gridColors: number[] = [];
    const gridSize = 100;
    const step = 10;
    for (let i = -gridSize; i <= gridSize; i += step) {
      gridPositions.push(i, -2, -gridSize, i, -2, gridSize);
      gridPositions.push(-gridSize, -2, i, gridSize, -2, i);
      const c = new THREE.Color('#0F2A36');
      gridColors.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b);
    }
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
    gridGeo.setAttribute('color', new THREE.Float32BufferAttribute(gridColors, 3));
    const gridMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 });
    this.horizonGrid = new THREE.LineSegments(gridGeo, gridMat);
    this.scene.add(this.horizonGrid);

    // Preallocated Zero-GC Buffers (15000 vertices max)
    const lineGeo = new THREE.BufferGeometry();
    this.linePosAttr = new THREE.BufferAttribute(new Float32Array(this.maxVertices * 3), 3);
    this.lineColAttr = new THREE.BufferAttribute(new Float32Array(this.maxVertices * 3), 3);
    this.linePosAttr.setUsage(THREE.DynamicDrawUsage);
    this.lineColAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute('position', this.linePosAttr);
    lineGeo.setAttribute('color', this.lineColAttr);

    const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
    this.lineMesh = new THREE.LineSegments(lineGeo, lineMat);
    this.lineMesh.frustumCulled = false;
    this.scene.add(this.lineMesh);

    const faceGeo = new THREE.BufferGeometry();
    this.facePosAttr = new THREE.BufferAttribute(new Float32Array(this.maxVertices * 3), 3);
    this.faceColAttr = new THREE.BufferAttribute(new Float32Array(this.maxVertices * 4), 4);
    this.facePosAttr.setUsage(THREE.DynamicDrawUsage);
    this.faceColAttr.setUsage(THREE.DynamicDrawUsage);
    faceGeo.setAttribute('position', this.facePosAttr);
    faceGeo.setAttribute('color', this.faceColAttr);

    const faceMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.22
    });
    this.faceMesh = new THREE.Mesh(faceGeo, faceMat);
    this.faceMesh.frustumCulled = false;
    this.scene.add(this.faceMesh);
  }

  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.threeCamera.aspect = width / height;
    this.threeCamera.updateProjectionMatrix();
  }

  public render(buffer: Float32Array, camera: MatrixCamera, overlay: string, quant: QuantizationTier, regions: any[] = []): void {
    const farClip = quant === 'FP16' ? 220 : quant === 'INT8' ? 130 : 70;
    this.threeCamera.far = farClip;
    camera.state.far = farClip;

    this.threeCamera.position.set(camera.state.x, camera.state.y, camera.state.z);
    this.threeCamera.lookAt(camera.state.targetX, camera.state.targetY, camera.state.targetZ);
    this.threeCamera.fov = camera.state.fov;
    this.threeCamera.updateProjectionMatrix();

    if (overlay === 'MEATSPACE') {
      this.scene.background = new THREE.Color('#0A0502');
    } else {
      this.scene.background = new THREE.Color('#04070B');
    }

    const nodeCount = buffer[8];
    const edgeCount = buffer[9];
    const shardCount = buffer[10];
    const phantomCount = buffer[11];

    const allLinePos: number[] = [];
    const allLineCol: number[] = [];
    const allFacePos: number[] = [];
    const allFaceCol: number[] = [];

    // Helper visibility check for node index `i`: `buffer[base + 6] > 0.5`
    const isNodeVisible = (idx: number) => {
      if (idx < 0 || idx >= nodeCount) return false;
      const base = 16 + idx * 16;
      return buffer[base + 6] > 0.5;
    };

    // Render MEATSPACE region borders and fills
    if (overlay === 'MEATSPACE' && regions && regions.length > 0) {
      for (const reg of regions) {
        if (reg.borderPolyline && reg.borderPolyline.length > 0) {
          const pts = reg.borderPolyline;
          const [cr, cg, cb] = getPolityColorRgb(reg.polityId);
          for (let p = 0; p < pts.length; p++) {
            const pt1 = pts[p];
            const pt2 = pts[(p + 1) % pts.length];
            const [x1, z1] = projectGeo(pt1[0], pt1[1]);
            const [x2, z2] = projectGeo(pt2[0], pt2[1]);
            allLinePos.push(x1, 0.05, z1, x2, 0.05, z2);
            allLineCol.push(cr, cg, cb, cr, cg, cb);
            allLinePos.push(x1, 0.35, z1, x2, 0.35, z2);
            allLineCol.push(cr * 0.7, cg * 0.7, cb * 0.7, cr * 0.7, cg * 0.7, cb * 0.7);
          }
          if (pts.length >= 3) {
            const [cx, cz] = projectGeo(pts[0][0], pts[0][1]);
            for (let p = 1; p < pts.length - 1; p++) {
              const [ax, az] = projectGeo(pts[p][0], pts[p][1]);
              const [bx, bz] = projectGeo(pts[p+1][0], pts[p+1][1]);
              allFacePos.push(cx, 0.02, cz, ax, 0.02, az, bx, 0.02, bz);
              allFaceCol.push(cr, cg, cb, 0.12, cr, cg, cb, 0.12, cr, cg, cb, 0.12);
            }
          }
        }
      }
    }

    // Render edges (LDL conduits) respecting N_VISIBLE with parabolic arcs
    for (let e = 0; e < edgeCount; e++) {
      const base = 16 + 32 * 16 + e * 8;
      const srcIdx = buffer[base];
      const dstIdx = buffer[base + 1];
      if (isNodeVisible(srcIdx) && isNodeVisible(dstIdx)) {
        const n1Base = 16 + srcIdx * 16;
        const n2Base = 16 + dstIdx * 16;
        const x1 = buffer[n1Base + 2], y1 = buffer[n1Base + 3], z1 = buffer[n1Base + 4];
        const x2 = buffer[n2Base + 2], y2 = buffer[n2Base + 3], z2 = buffer[n2Base + 4];

        const edgeCol = overlay === 'MEATSPACE' ? [0.6, 0.4, 0.1] : [0.06, 0.16, 0.21];
        const tempLines: number[] = [];
        const tempCols: number[] = [];
        addParabolicEdge(tempLines, tempCols, x1, y1, z1, x2, y2, z2, edgeCol[0], edgeCol[1], edgeCol[2]);
        allLinePos.push(...tempLines);
        allLineCol.push(...tempCols);
      }
    }

    // Render nodes respecting N_VISIBLE
    for (let i = 0; i < nodeCount; i++) {
      const base = 16 + i * 16;
      const visibleFlag = buffer[base + 6];
      if (visibleFlag <= 0.5) continue;

      const typeId = buffer[base + 1];
      const x = buffer[base + 2];
      const y = buffer[base + 3];
      const z = buffer[base + 4];
      const owned = buffer[base + 5] > 0.5;

      const geom = buildNodeGeometry(typeId, owned, quant);
      
      for (let p = 0; p < geom.linePositions.length; p += 3) {
        allLinePos.push(geom.linePositions[p] + x, geom.linePositions[p+1] + y, geom.linePositions[p+2] + z);
      }
      allLineCol.push(...geom.lineColors);

      for (let p = 0; p < geom.facePositions.length; p += 3) {
        allFacePos.push(geom.facePositions[p] + x, geom.facePositions[p+1] + y, geom.facePositions[p+2] + z);
      }
      allFaceCol.push(...geom.faceColors);
    }

    // Render SHARD octahedra (`shardCount = buffer[10]`, offset after edges or in buffer)
    for (let s = 0; s < shardCount; s++) {
      // Shards located after edges or parsed from buffer
      const shardBase = 16 + 32 * 16 + 256 * 8 + s * 8;
      const hostIdx = buffer[shardBase];
      if (isNodeVisible(hostIdx)) {
        const nBase = 16 + hostIdx * 16;
        const nx = buffer[nBase + 2], ny = buffer[nBase + 3], nz = buffer[nBase + 4];
        const drift = buffer[shardBase + 2] > 0.5;
        const sGeom = buildShardGeometry();
        const col = drift ? [1.0, 0.69, 0.0] : [0.30, 1.0, 0.53]; // amber on drift, emerald otherwise (#4DFF88)
        for (let p = 0; p < sGeom.linePositions.length; p += 3) {
          allLinePos.push(sGeom.linePositions[p] + nx + 1.5, sGeom.linePositions[p+1] + ny + 1.5, sGeom.linePositions[p+2] + nz);
        }
        for (let p = 0; p < sGeom.linePositions.length / 3; p++) {
          allLineCol.push(...col);
        }
      }
    }

    // Render INT4 PHANTOM crimson ICE if quant === 'INT4'
    if (quant === 'INT4') {
      for (let ph = 0; ph < phantomCount; ph++) {
        const phBase = 16 + 32 * 16 + 256 * 8 + 64 * 8 + ph * 8;
        const pHost = buffer[phBase];
        if (isNodeVisible(pHost)) {
          const nBase = 16 + pHost * 16;
          const nx = buffer[nBase + 2], ny = buffer[nBase + 3], nz = buffer[nBase + 4];
          // Crimson ICE cross / wireframe
          const sz = 1.8;
          allLinePos.push(nx - sz, ny, nz, nx + sz, ny, nz);
          allLinePos.push(nx, ny - sz, nz, nx, ny + sz, nz);
          const cCol = [1.0, 0.16, 0.29];
          allLineCol.push(...cCol, ...cCol, ...cCol, ...cCol);
        }
      }
    }

    // MEATSPACE Polity Borders
    if (overlay === 'MEATSPACE' && regions && regions.length > 0) {
      for (const reg of regions) {
        if (reg.borderPolyline && reg.borderPolyline.length > 1) {
          for (let p = 0; p < reg.borderPolyline.length - 1; p++) {
            const pt1 = reg.borderPolyline[p];
            const pt2 = reg.borderPolyline[p+1];
            const x1 = (pt1.lng + 20) * 0.5;
            const y1 = 0;
            const z1 = (45 - pt1.lat) * 0.8;
            const x2 = (pt2.lng + 20) * 0.5;
            const y2 = 0;
            const z2 = (45 - pt2.lat) * 0.8;
            allLinePos.push(x1, y1, z1, x2, y2, z2);
            const polityCol = reg.polityId === 'SOVEREIGN' ? [0.16, 0.96, 0.84] : reg.polityId === 'CARTEL' ? [1.0, 0.16, 0.29] : [1.0, 0.69, 0.0];
            allLineCol.push(...polityCol, ...polityCol);
          }
        }
      }
    }

    // Update Zero-GC Buffer Attributes
    const lineVertCount = Math.min(this.maxVertices, Math.floor(allLinePos.length / 3));
    for (let i = 0; i < lineVertCount * 3; i++) {
      this.linePosAttr.array[i] = allLinePos[i] || 0;
      this.lineColAttr.array[i] = allLineCol[i] || 0;
    }
    this.linePosAttr.needsUpdate = true;
    this.lineColAttr.needsUpdate = true;
    this.lineMesh.geometry.setDrawRange(0, lineVertCount);

    const faceVertCount = Math.min(this.maxVertices, Math.floor(allFacePos.length / 3));
    for (let i = 0; i < faceVertCount * 3; i++) {
      this.facePosAttr.array[i] = allFacePos[i] || 0;
    }
    for (let i = 0; i < faceVertCount * 4; i++) {
      this.faceColAttr.array[i] = allFaceCol[i] || 0;
    }
    this.facePosAttr.needsUpdate = true;
    this.faceColAttr.needsUpdate = true;
    this.faceMesh.geometry.setDrawRange(0, faceVertCount);

    this.renderer.render(this.scene, this.threeCamera);
  }

  public dispose(): void {
    this.renderer.dispose();
  }
}
