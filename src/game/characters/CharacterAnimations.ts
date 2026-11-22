import type { AnimState } from '../../types/character';
import { damp } from '../../utils/math';

export interface Pose {
  /** body scale (squash & stretch) */
  sx: number;
  sy: number;
  /** body offset y */
  oy: number;
  /** lean forward/back (rad) and sideways (rad) */
  pitch: number;
  roll: number;
  /** extra spin for victory dance */
  spin: number;
  legL: number;
  legR: number;
  liftL: number;
  liftR: number;
  armL: number;
  armR: number;
  armSpread: number;
  /** eye openness 0..1.3, pupil shake */
  eye: number;
  pupilShake: number;
  /** mouth: 0 smile, 1 open "o", 2 grimace */
  mouth: 0 | 1 | 2;
  /** overall scale (recover pop) */
  scale: number;
}

export const createPose = (): Pose => ({
  sx: 1, sy: 1, oy: 0, pitch: 0, roll: 0, spin: 0,
  legL: 0, legR: 0, liftL: 0, liftR: 0,
  armL: 0, armR: 0, armSpread: 0,
  eye: 1, pupilShake: 0, mouth: 0, scale: 1,
});

/**
 * Procedural animation solver: idle, walk, run, jump, fall, land, stumble, recover, victory dance.
 * Also drives jelly-like secondary motion with a damped spring.
 */
export class PoseSolver {
  pose = createPose();
  private phase = 0;
  private wobX = 0;
  private wobZ = 0;
  private wobVX = 0;
  private wobVZ = 0;
  private lastVx = 0;
  private lastVz = 0;
  private victoryT = 0;

  update(a: AnimState, dt: number, time: number, vx: number, vz: number, local = { x: 0, z: 0 }) {
    const p = this.pose;
    const speed = a.speed;

    // --- secondary jelly wobble: spring driven by acceleration
    const ax = (vx - this.lastVx) / Math.max(dt, 1e-3);
    const az = (vz - this.lastVz) / Math.max(dt, 1e-3);
    this.lastVx = vx;
    this.lastVz = vz;
    const k = 120;
    const c = 9;
    this.wobVX += (-this.wobX * k - this.wobVX * c - ax * 0.02) * dt;
    this.wobVZ += (-this.wobZ * k - this.wobVZ * c - az * 0.02) * dt;
    this.wobX = Math.max(-0.5, Math.min(0.5, this.wobX + this.wobVX * dt));
    this.wobZ = Math.max(-0.5, Math.min(0.5, this.wobZ + this.wobVZ * dt));

    // convert the world-space wobble to the character's local axes
    p.pitch = -(this.wobX * local.x + this.wobZ * local.z) * 0.9;
    p.roll = (this.wobX * -local.z + this.wobZ * local.x) * 0.9;

    // --- locomotion
    const run = Math.min(1, speed / 6);
    this.phase += dt * (6 + speed * 1.15);
    const sw = Math.sin(this.phase);
    const grounded = a.grounded;

    let legAmp = grounded ? 0.75 * run : 0.2;
    p.legL = sw * legAmp;
    p.legR = -sw * legAmp;
    p.liftL = grounded ? Math.max(0, sw) * 0.22 * run : 0.25;
    p.liftR = grounded ? Math.max(0, -sw) * 0.22 * run : 0.25;
    p.armL = -sw * 0.9 * run;
    p.armR = sw * 0.9 * run;
    p.armSpread = 0.35;

    // idle breathing & squash/stretch
    const breathe = Math.sin(time * 2.3) * 0.025 * (1 - run);
    p.sx = 1 - breathe * 0.6;
    p.sy = 1 + breathe + (grounded ? Math.abs(sw) * 0.04 * run : 0);
    p.oy = grounded ? Math.abs(sw) * 0.07 * run : 0;
    p.pitch += -run * 0.18; // lean into the run
    p.eye = 1;
    p.pupilShake = 0;
    p.mouth = 0;

    if (!grounded) {
      if (a.vy > 0.5) {
        p.sy = 1.16;
        p.sx = 0.9;
        p.armL = p.armR = -2.3; // arms up
        p.armSpread = 0.9;
        p.mouth = 1;
      } else {
        p.sy = 1.08;
        p.sx = 0.95;
        p.armL = p.armR = -1.7;
        p.armSpread = 1.1;
        p.legL = 0.5 + Math.sin(time * 18) * 0.2;
        p.legR = -0.4 - Math.sin(time * 18) * 0.2;
        p.eye = 1.25;
        p.mouth = a.vy < -9 ? 1 : 0;
      }
    } else if (a.landed < 0.18) {
      // landing squash
      const e = 1 - a.landed / 0.18;
      p.sy = 1 - 0.3 * e;
      p.sx = 1 + 0.22 * e;
      p.oy -= 0.08 * e;
    }

    if (a.stumble > 0) {
      p.roll += Math.sin(time * 34) * 0.35;
      p.pitch += -0.45;
      p.armL = Math.sin(time * 28) * 1.6;
      p.armR = -Math.sin(time * 28) * 1.6;
      p.armSpread = 1.0;
      p.eye = 1.35;
      p.pupilShake = 1;
      p.mouth = 1;
      p.sy *= 0.94;
    }

    // recover pop-in
    p.scale = a.recover > 0 ? 0.35 + 0.65 * Math.min(1, 1 - a.recover / 0.6) : 1;
    if (a.recover > 0) p.eye = 1.3;

    // victory dance
    if (a.victory) {
      this.victoryT += dt;
      const bounce = Math.abs(Math.sin(this.victoryT * 7));
      p.oy = bounce * 0.55;
      p.sy = 1 + bounce * 0.12;
      p.sx = 1 - bounce * 0.06;
      p.spin = Math.sin(this.victoryT * 3.5) * 0.6;
      p.armL = -2.5 + Math.sin(this.victoryT * 14) * 0.5;
      p.armR = -2.5 - Math.sin(this.victoryT * 14) * 0.5;
      p.armSpread = 0.8;
      p.legL = Math.sin(this.victoryT * 14) * 0.6;
      p.legR = -Math.sin(this.victoryT * 14) * 0.6;
      p.mouth = 1;
      p.eye = 1.15;
    } else {
      this.victoryT = 0;
      p.spin = 0;
    }
    legAmp = 0;
    void damp;
    return p;
  }
}
