import type { CharacterInput } from '../../types/game';
import type { LevelConfig } from '../../types/level';
import { mulberry32 } from '../../utils/math';
import { dangerAt } from '../physics/CollisionManager';
import { registry } from '../physics/PhysicsWorld';
import { MOVE } from '../GameConfig';
import type { Course } from '../levels/Course';
import type { RacerState } from './RaceManager';

type Mistake = 'none' | 'dawdle' | 'hop' | 'dance';

export interface AIBrain {
  skill: number;
  lane: number;
  sprintBias: number;
  rnd: () => number;
  mistake: Mistake;
  mistakeLeft: number;
  nextMistake: number;
  jumpHold: number;
  jumpCd: number;
  stuck: number;
  wiggle: number;
  waitT: number;
}

export interface AIContext {
  level: LevelConfig;
  course: Course;
  /** is there floor under (x, y, z)? */
  probe: (x: number, y: number, z: number) => boolean;
  time: number;
}

const WALK = MOVE.walkSpeed;

export const AIManager = {
  createBrain(index: number, count: number, level: LevelConfig, seed: number): AIBrain {
    const rnd = mulberry32(seed + index * 7919);
    const spread = count > 1 ? index / (count - 1) : 0.5;
    const skill = Math.min(1, Math.max(0.7, level.aiSkill * (0.94 + 0.12 * spread)));
    return {
      skill,
      lane: (index % 2 === 0 ? -1 : 1) * (0.3 + rnd() * 0.7),
      sprintBias: rnd(),
      rnd,
      mistake: 'none',
      mistakeLeft: 0,
      nextMistake: 5 + rnd() * 8,
      jumpHold: 0,
      jumpCd: 0,
      stuck: 0,
      wiggle: 1,
      waitT: 0,
    };
  },

  /** Landing spot is trustworthy only if moving/vanishing ground will still be there when we arrive. */
  landingOk(x: number, z: number, t: number) {
    for (const g of registry.softGrounds.values()) {
      const s = g.sweep;
      if (Math.abs(x - s.x) > s.hx + 0.3 || Math.abs(z - s.z) > s.hz + 0.3) continue;
      const f = g.footprint(t + 0.55);
      if (!f) return false;
      if (g.kind === 'mover' && (Math.abs(x - f.x) > f.hx - 0.4 || Math.abs(z - f.z) > f.hz - 0.4)) return false;
    }
    return true;
  },

  decide(b: AIBrain, r: RacerState, dt: number, ctx: AIContext): CharacterInput {
    const { course, probe } = ctx;
    const t = ctx.time;
    b.jumpCd = Math.max(0, b.jumpCd - dt);
    b.jumpHold = Math.max(0, b.jumpHold - dt);

    // ---- steering target ----------------------------------------------------------
    const lookDist = r.progress + 4.5 + 3 * b.skill;
    const look = course.pointAt(lookDist);
    const [tx, tz] = course.tangentAt(r.progress);
    const lateral = b.lane * ctx.level.laneWidth * 0.4;
    const gx = look[0] + -tz * lateral;
    const gz = look[2] + tx * lateral;
    let mx = gx - r.x;
    let mz = gz - r.z;
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml;
    mz /= ml;

    const speed = Math.hypot(r.vx, r.vz);
    let hold = false;
    let jump = false;
    let sprint = b.sprintBias > 0.5 && b.skill > 0.85;
    const grounded = r.grounded;

    // ---- gaps -----------------------------------------------------------------------
    let edgeAhead = false;
    if (grounded && r.surface !== 'bounce') {
      const ahead = (d: number) => probe(r.x + mx * d, r.y, r.z + mz * d);
      if (!ahead(1.3)) {
        edgeAhead = true;
        let land = -1;
        for (const d of [2.2, 3.2, 4.2, 5.2, 6.2]) {
          if (ahead(d) && AIManager.landingOk(r.x + mx * d, r.z + mz * d, t)) {
            land = d;
            break;
          }
        }
        if (land > 0) {
          if (!probe(r.x + mx * 0.5, r.y, r.z + mz * 0.5)) {
            if (b.jumpCd <= 0) {
              jump = true;
              sprint = land > 4;
            }
          }
        } else {
          hold = true;
        }
      }
    }

    // ---- hazards --------------------------------------------------------------------
    const pace = WALK * b.skill;
    let dangerTau = -1;
    for (const tau of [0.2, 0.4, 0.6, 0.8]) {
      if (dangerAt(r.x + mx * pace * tau, r.y, r.z + mz * pace * tau, t + tau, 0.85)) {
        dangerTau = tau;
        break;
      }
    }
    if (dangerTau > 0 && grounded && !edgeAhead) {
      let airClear = true;
      for (const tau of [0.3, 0.5, 0.7]) {
        if (dangerAt(r.x + mx * pace * tau, r.y + 1.5, r.z + mz * pace * tau, t + tau, 0.6)) airClear = false;
      }
      const landClear = !dangerAt(r.x + mx * pace * 0.75, r.y, r.z + mz * pace * 0.75, t + 0.75, 1.0);
      if (dangerTau <= 0.5) {
        if (airClear && b.jumpCd <= 0 && (landClear || b.waitT > 1.2)) {
          jump = true;
          sprint = true; // longer jump to clear the hazard
        } else if (b.waitT < 4) {
          hold = true; // wait for a gap in the pattern (but never forever)
          b.waitT += dt;
        }
      }
    } else if (dangerTau < 0) {
      b.waitT = 0;
    }
    if (hold && grounded && dangerAt(r.x, r.y, r.z, t + 0.25, 1.1)) {
      // something is about to hit us where we stand: back away
      mx = -mx;
      mz = -mz;
      hold = false;
      sprint = true;
    }

    // ---- funny mistakes (only when nothing dangerous is nearby) -----------------------
    if (!hold && !jump && !edgeAhead && dangerTau < 0 && grounded) {
      if (b.mistake === 'none') {
        b.nextMistake -= dt;
        if (b.nextMistake <= 0) {
          const k = b.rnd();
          b.mistake = k < 0.4 ? 'dawdle' : k < 0.75 ? 'hop' : 'dance';
          b.mistakeLeft = 0.5 + b.rnd() * 0.5;
          b.nextMistake = (6 + b.rnd() * 10) / (1.25 - b.skill);
        }
      } else {
        b.mistakeLeft -= dt;
        if (b.mistake === 'dawdle' || b.mistake === 'dance') {
          hold = true;
          if (b.mistake === 'dance') {
            mx = Math.cos(t * 12);
            mz = Math.sin(t * 12);
          }
        } else if (b.jumpCd <= 0 && b.mistakeLeft > 0.2) jump = true;
        if (b.mistakeLeft <= 0) b.mistake = 'none';
      }
    } else if (b.mistake !== 'none') {
      b.mistake = 'none';
    }

    // ---- bounce pad: just keep going ---------------------------------------------------
    if (r.surface === 'bounce' || !grounded) hold = false;

    // ---- stuck handling (step-ups, bumped sideways) -----------------------------------
    if (grounded && !hold && !jump && speed < 1.2) {
      b.stuck += dt;
      if (b.stuck > 0.35 && b.jumpCd <= 0) jump = true;
      if (b.stuck > 1.4) {
        b.wiggle = -b.wiggle;
        mx += -tz * b.wiggle * 0.8;
        mz += tx * b.wiggle * 0.8;
        b.stuck = 0.6;
      }
    } else if (speed >= 1.2) b.stuck = 0;

    if (jump) {
      b.jumpHold = 0.28;
      b.jumpCd = 0.7;
    }

    if (hold && b.mistake !== 'dance') {
      return { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, sprint: false };
    }
    if ((dangerTau > 0 && !jump) || (edgeAhead && !jump)) sprint = false;
    return {
      moveX: mx,
      moveZ: mz,
      jump,
      jumpHeld: b.jumpHold > 0,
      sprint,
    };
  },
};
