import { QuantizationTier } from '../shared/protocol';

export interface CameraState {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  distance: number;
  azimuth: number;
  elevation: number;
  fov: number;
  near: number;
  far: number;
  act: number; // 1, 2, 3
}

export class MatrixCamera {
  public state: CameraState;
  private isDragging = false;
  private rightDragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(initialAct = 1) {
    this.state = {
      x: 14.27,
      y: 0,
      z: -1.9,
      targetX: 8.54,
      targetY: 0,
      targetZ: -47.37,
      distance: 22,
      azimuth: 0,
      elevation: 0.2,
      fov: 60,
      near: 0.1,
      far: 250,
      act: initialAct
    };
    this.setAct(initialAct);
  }

  public setAct(act: number) {
    this.state.act = act;
    if (act === 1) {
      this.state.targetX = 15.9;
      this.state.targetY = 0;
      this.state.targetZ = -0.64;
      this.state.distance = 18;
      this.state.azimuth = 0.45;
      this.state.elevation = 0.35;
    } else if (act === 2) {
      this.state.targetX = 0;
      this.state.targetY = 2;
      this.state.targetZ = 0;
      this.state.distance = 35;
      this.state.azimuth = 0.5;
      this.state.elevation = 0.4;
    } else {
      this.state.targetX = -8;
      this.state.targetY = 0;
      this.state.targetZ = 2;
      this.state.distance = 56;
      this.state.azimuth = 0.25;
      this.state.elevation = 0.45;
    }
    this.updateCartesian();
  }

  public updateCartesian() {
    const { distance, azimuth, elevation, targetX, targetY, targetZ } = this.state;
    const clampedElevation = Math.max(0.05, Math.min(Math.PI * 0.48, elevation));
    
    this.state.x = targetX + distance * Math.cos(clampedElevation) * Math.sin(azimuth);
    this.state.y = targetY + distance * Math.sin(clampedElevation);
    this.state.z = targetZ + distance * Math.cos(clampedElevation) * Math.cos(azimuth);
  }

  public handleMouseDown(e: MouseEvent) {
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    if (e.button === 0) {
      this.isDragging = true;
    } else if (e.button === 2 || e.shiftKey) {
      this.rightDragging = true;
    }
  }

  public handleMouseMove(e: MouseEvent) {
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.isDragging) {
      this.state.azimuth -= dx * 0.005;
      this.state.elevation += dy * 0.005;
      this.updateCartesian();
    } else if (this.rightDragging) {
      const panScale = this.state.distance * 0.002;
      const cosA = Math.cos(this.state.azimuth);
      const sinA = Math.sin(this.state.azimuth);
      this.state.targetX -= dx * panScale * cosA + dy * panScale * sinA * 0.3;
      this.state.targetZ += dx * panScale * sinA - dy * panScale * cosA * 0.3;
      this.updateCartesian();
    }
  }

  public handleMouseUp() {
    this.isDragging = false;
    this.rightDragging = false;
  }

  public handleWheel(e: WheelEvent) {
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.state.distance = Math.max(5, Math.min(200, this.state.distance * zoomFactor));
    this.updateCartesian();
  }

  public handleKeyPan(key: string) {
    const speed = this.state.distance * 0.05;
    const cosA = Math.cos(this.state.azimuth);
    const sinA = Math.sin(this.state.azimuth);
    if (key === 'KeyW' || key === 'ArrowUp') {
      this.state.targetX -= sinA * speed;
      this.state.targetZ -= cosA * speed;
    } else if (key === 'KeyS' || key === 'ArrowDown') {
      this.state.targetX += sinA * speed;
      this.state.targetZ += cosA * speed;
    } else if (key === 'KeyA' || key === 'ArrowLeft') {
      this.state.targetX -= cosA * speed;
      this.state.targetZ += sinA * speed;
    } else if (key === 'KeyD' || key === 'ArrowRight') {
      this.state.targetX += cosA * speed;
      this.state.targetZ -= sinA * speed;
    }
    this.updateCartesian();
  }

  public projectPoint(x: number, y: number, z: number, width: number, height: number): { x: number; y: number; visible: boolean; depth: number } {
    const ex = this.state.x;
    const ey = this.state.y;
    const ez = this.state.z;

    const tx = this.state.targetX;
    const ty = this.state.targetY;
    const tz = this.state.targetZ;

    // Exact right-handed lookAt basis matching THREE.PerspectiveCamera
    const fx = tx - ex;
    const fy = ty - ey;
    const fz = tz - ez;
    const flen = Math.hypot(fx, fy, fz);
    if (flen < 1e-6) return { x: -9999, y: -9999, visible: false, depth: 0 };
    const fwdX = fx / flen;
    const fwdY = fy / flen;
    const fwdZ = fz / flen;

    // right = normalize(cross(forward, [0,1,0])) = [-fwdZ, 0, fwdX] normalized
    const rLen = Math.hypot(-fwdZ, 0, fwdX);
    const rightX = rLen > 1e-6 ? -fwdZ / rLen : 1;
    const rightY = 0;
    const rightZ = rLen > 1e-6 ? fwdX / rLen : 0;

    // up = cross(right, forward)
    const upX = rightY * fwdZ - rightZ * fwdY;
    const upY = rightZ * fwdX - rightX * fwdZ;
    const upZ = rightX * fwdY - rightY * fwdX;

    // Vector from eye to point
    const px = x - ex;
    const py = y - ey;
    const pz = z - ez;

    // Project onto camera basis (view space coordinates: right, up, forward - viewZ POSITIVE along forward!)
    const viewX = px * rightX + py * rightY + pz * rightZ;
    const viewY = px * upX + py * upY + pz * upZ;
    const viewZ = px * fwdX + py * fwdY + pz * fwdZ;

    if (viewZ <= this.state.near || viewZ >= this.state.far) {
      return { x: -9999, y: -9999, visible: false, depth: viewZ };
    }

    const fovRad = (this.state.fov * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);
    const aspect = width / height;

    const ndcX = (viewX / (viewZ * tanHalfFov * aspect));
    const ndcY = (viewY / (viewZ * tanHalfFov));

    const screenX = (ndcX * 0.5 + 0.5) * width;
    const screenY = (1.0 - (ndcY * 0.5 + 0.5)) * height;

    const visible = screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height && viewZ <= this.state.far;

    return { x: screenX, y: screenY, visible, depth: viewZ };
  }

  public pickNode(screenX: number, screenY: number, buffer: Float32Array, width: number, height: number, quantTier: QuantizationTier): number {
    const nodeCount = buffer[8];
    let closestNodeIndex = -1;
    let minDistance = 30; // pixel threshold

    for (let i = 0; i < nodeCount; i++) {
      const base = 16 + i * 16;
      const nx = buffer[base + 2];
      const ny = buffer[base + 3];
      const nz = buffer[base + 4];

      const projected = this.projectPoint(nx, ny, nz, width, height);
      if (!projected.visible) continue;

      const dist = Math.hypot(projected.x - screenX, projected.y - screenY);
      let hitRadius = 25;
      if (quantTier === 'INT4') hitRadius = 15;

      if (dist < minDistance && dist < hitRadius) {
        minDistance = dist;
        closestNodeIndex = i;
      }
    }

    return closestNodeIndex;
  }
}
