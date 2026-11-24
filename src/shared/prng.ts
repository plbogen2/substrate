/**
 * Serializable Mulberry32 PRNG for fully reproducible simulation runs.
 */
export class Mulberry32 {
  private s: number;

  constructor(seed: number) {
    this.s = Math.floor(seed);
  }

  /** Returns next float in [0, 1) */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    Math.imul;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns random float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns random integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  getState(): number {
    return this.s;
  }

  setState(state: number): void {
    this.s = state;
  }
}
