import type { GameMode, RacePhase, SurfaceType, Vec3 } from '../../types/game';
import type { LevelConfig } from '../../types/level';
import { Course } from '../levels/Course';
import { registry } from '../physics/PhysicsWorld';
import { COUNTDOWN_SECONDS } from '../GameConfig';
import { PLAYER_ID } from '../../utils/constants';
import { AudioManager } from './AudioManager';
import { fx } from './Effects';

export interface RacerInit {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
}

export interface RacerState extends RacerInit {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  grounded: boolean;
  progress: number;
  seg: number;
  checkpoint: number; // -1 = start
  finished: boolean;
  finishTime: number;
  falls: number;
  /** set by the manager when a respawn is needed; the character consumes it */
  respawn: { pos: Vec3; yaw: number } | null;
  lastProgress: number;
  lastProgressTime: number;
  coins: number;
  hits: number;
  surface: SurfaceType;
}

type Listener = (payload?: any) => void;

/**
 * Owns the authoritative race state: countdown, timer, progress, checkpoints, coins, finish detection.
 * It is plain TypeScript (no React) so gameplay never triggers React re-renders.
 */
class RaceManagerImpl {
  level!: LevelConfig;
  course!: Course;
  mode: GameMode = 'classic';
  phase: RacePhase = 'idle';
  time = 0;
  countdown = COUNTDOWN_SECONDS;
  private lastCountdownInt = -1;
  racers = new Map<string, RacerState>();
  coinsTaken = new Set<number>();
  lives: number | null = null;
  endTimer = -1;
  ended = false;
  private listeners = new Map<string, Listener[]>();

  on(ev: string, fn: Listener) {
    const arr = this.listeners.get(ev) ?? [];
    arr.push(fn);
    this.listeners.set(ev, arr);
    return () => this.listeners.set(ev, (this.listeners.get(ev) ?? []).filter((f) => f !== fn));
  }
  private emit(ev: string, payload?: any) {
    this.listeners.get(ev)?.forEach((f) => f(payload));
  }

  init(level: LevelConfig, mode: GameMode, racers: RacerInit[]) {
    this.level = level;
    this.course = new Course(level.waypoints);
    this.mode = mode;
    this.phase = 'countdown';
    this.time = 0;
    this.countdown = COUNTDOWN_SECONDS;
    this.lastCountdownInt = -1;
    this.coinsTaken = new Set();
    this.lives = mode === 'survival' ? 3 : null;
    this.endTimer = -1;
    this.ended = false;
    registry.time = 0;
    this.racers = new Map();
    for (const r of racers) {
      this.racers.set(r.id, {
        ...r,
        x: level.spawn[0],
        y: level.spawn[1],
        z: level.spawn[2],
        vx: 0,
        vz: 0,
        grounded: true,
        progress: 0,
        seg: 0,
        checkpoint: -1,
        finished: false,
        finishTime: 0,
        falls: 0,
        respawn: null,
        lastProgress: 0,
        lastProgressTime: 0,
        coins: 0,
        hits: 0,
        surface: 'normal',
      });
    }
  }

  get player() {
    return this.racers.get(PLAYER_ID)!;
  }

  canMove() {
    return this.phase === 'racing';
  }

  /** Generated-course modes score by distance rather than placement */
  isEndless() {
    return this.mode === 'endless' || this.mode === 'survival';
  }

  /** Called every frame by each character after physics, to report where it is. */
  updateRacer(id: string, x: number, y: number, z: number, vx: number, vz: number, grounded: boolean) {
    const r = this.racers.get(id);
    if (!r) return;
    r.x = x;
    r.y = y;
    r.z = z;
    r.vx = vx;
    r.vz = vz;
    r.grounded = grounded;
    if (r.finished || this.phase === 'idle') return;

    const p = this.course.project(x, z, r.seg);
    r.seg = p.seg;
    // progress may only grow while standing; falling shouldn't reduce it (avoids position flicker)
    if (p.dist > r.progress || grounded) r.progress = Math.max(r.progress - 6, p.dist);
    if (p.dist > r.lastProgress + 0.5) {
      r.lastProgress = p.dist;
      r.lastProgressTime = this.time;
    }

    // checkpoints
    const cps = this.level.checkpoints;
    for (let i = r.checkpoint + 1; i < cps.length; i++) {
      const c = cps[i].pos;
      if (Math.hypot(x - c[0], z - c[2]) < 5 && Math.abs(y - c[1]) < 4) {
        r.checkpoint = i;
        if (r.isPlayer) {
          AudioManager.play('checkpoint');
          fx.emit('checkpoint', c[0], c[1] + 1, c[2], 18);
          this.emit('checkpoint', i);
        }
      } else break;
    }

    // falling
    if (y < this.level.killY && this.phase === 'racing') this.triggerRespawn(r);

    // coins (player only)
    if (r.isPlayer && this.phase === 'racing') {
      const coins = this.level.coins;
      for (let i = 0; i < coins.length; i++) {
        if (this.coinsTaken.has(i)) continue;
        const c = coins[i];
        const dx = x - c[0];
        const dz = z - c[2];
        const dy = y - c[1];
        if (dx * dx + dz * dz < 1.3 * 1.3 && Math.abs(dy) < 1.6) {
          this.coinsTaken.add(i);
          r.coins++;
          AudioManager.play('coin', 1 + Math.min(0.5, r.coins * 0.01));
          fx.emit('coin', c[0], c[1], c[2], 8);
          this.emit('coin', i);
        }
      }
    }

    // finish
    if (this.phase === 'racing') {
      const f = this.level.finish;
      if (Math.hypot(x - f[0], z - f[2]) < 5.5 && y > f[1] - 3 && r.progress > this.course.length - 8) {
        this.finishRacer(r);
      }
    }
  }

  private triggerRespawn(r: RacerState) {
    r.falls++;
    r.lastProgressTime = this.time;
    let pos: Vec3;
    if (r.checkpoint >= 0) pos = this.level.checkpoints[r.checkpoint].pos;
    else pos = this.level.spawn;
    const prog = r.checkpoint >= 0 ? this.course.project(pos[0], pos[2]).dist : 0;
    r.respawn = { pos: [pos[0], pos[1] + 1.4, pos[2]], yaw: this.course.yawAt(prog) };
    r.progress = prog;
    r.lastProgress = prog;
    r.seg = this.course.project(pos[0], pos[2]).seg;
    if (r.isPlayer) {
      AudioManager.play('fall');
      this.emit('fall', r.falls);
      if (this.lives !== null) {
        this.lives--;
        if (this.lives <= 0) this.endRace(false);
      }
    }
  }

  /** Force a respawn of a stuck racer (AI recovery). No progress is gained. */
  forceRespawn(id: string) {
    const r = this.racers.get(id);
    if (r && !r.finished) this.triggerRespawn(r);
  }

  private finishRacer(r: RacerState) {
    if (r.finished) return;
    r.finished = true;
    r.finishTime = this.time;
    if (r.isPlayer) {
      AudioManager.play('finish');
      fx.emit('confetti', r.x, r.y + 2, r.z, 80);
      fx.shake(0.15);
      this.emit('playerFinish');
      this.endTimer = 1.8; // let the victory dance play
      this.phase = 'racing';
    }
    this.emit('racerFinish', r);
  }

  /** Player ran out of lives, or chose to end an endless run. */
  endRace(finished = false) {
    if (this.ended || this.endTimer >= 0) return;
    this.endTimer = finished ? 1.5 : 0.8;
  }

  /** Sorted standings: finished first (by time), then by progress. */
  standings(): RacerState[] {
    return [...this.racers.values()].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
  }

  positionOf(id: string) {
    return this.standings().findIndex((r) => r.id === id) + 1;
  }

  tick(dt: number) {
    if (this.phase === 'countdown') {
      registry.time += dt; // obstacles are already moving during the countdown
      this.countdown -= dt;
      const whole = Math.ceil(this.countdown);
      if (whole !== this.lastCountdownInt) {
        this.lastCountdownInt = whole;
        if (whole > 0) AudioManager.play('tick', 1);
      }
      if (this.countdown <= 0) {
        this.phase = 'racing';
        this.time = 0;
        AudioManager.play('go');
        this.emit('go');
      }
      return;
    }
    if (this.phase !== 'racing') return;
    this.time += dt;
    registry.time += dt;

    if (this.endTimer >= 0) {
      this.endTimer -= dt;
      if (this.endTimer < 0 && !this.ended) {
        this.ended = true;
        this.phase = 'finished';
        this.emit('end');
      }
    }
  }

}

export const RaceManager = new RaceManagerImpl();
