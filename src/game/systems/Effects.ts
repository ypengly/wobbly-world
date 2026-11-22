/** Lightweight FX bus: gameplay code pushes requests, the ParticleSystem component drains them. */
export type FxKind = 'dust' | 'impact' | 'coin' | 'checkpoint' | 'confetti' | 'spark';

export interface FxRequest {
  kind: FxKind;
  x: number;
  y: number;
  z: number;
  count: number;
}

class FxBus {
  queue: FxRequest[] = [];
  shakeAmount = 0;
  particleBudget = 160;

  emit(kind: FxKind, x: number, y: number, z: number, count = 8) {
    if (this.queue.length > 64) return;
    this.queue.push({ kind, x, y, z, count });
  }

  /** screen shake in 0..1 (decays over time) */
  shake(amount: number) {
    this.shakeAmount = Math.min(1, Math.max(this.shakeAmount, amount));
  }

  clear() {
    this.queue.length = 0;
    this.shakeAmount = 0;
  }
}

export const fx = new FxBus();
