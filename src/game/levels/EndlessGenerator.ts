import type { WorldId, Vec3 } from '../../types/game';
import type { LevelConfig, ObstacleDef, PlatformDef } from '../../types/level';
import { mulberry32 } from '../../utils/math';
import { plat } from './LevelConfig';

type ChunkKind = 'run' | 'hammer' | 'gap' | 'faller' | 'conveyor' | 'tiles' | 'mover' | 'walls' | 'bars';

/**
 * Procedurally chains obstacle chunks along -Z with rising difficulty.
 * Every chunk is built from the same hand-authored building blocks the normal levels use,
 * so it is always playable (gap sizes are capped below sprint-jump reach).
 */
export interface GenOptions {
  chunks?: number;
  /** difficulty (0..1) of the first chunk; ramps to 1 over the course */
  startDifficulty?: number;
  id?: string;
  name?: string;
}

export function generateEndless(world: WorldId, seed: number, opts: GenOptions = {}): LevelConfig {
  const chunks = opts.chunks ?? 40;
  const startD = opts.startDifficulty ?? 0;
  const rnd = mulberry32(seed);
  const platforms: PlatformDef[] = [];
  const obstacles: ObstacleDef[] = [];
  const coins: Vec3[] = [];
  const checkpoints: { pos: Vec3 }[] = [];

  platforms.push(plat(0, -6, 16, 20));
  let end = -16; // z where the current platform ends
  let lastKind: ChunkKind | null = null;

  const addPlat = (len: number, w: number, opts: Partial<PlatformDef> = {}) => {
    const center = end - len / 2;
    platforms.push(plat(0, center, w, len, 0, opts));
    coins.push([0, 1.4, end - len * 0.3], [0, 1.4, end - len * 0.7]);
    end -= len;
    return center;
  };

  for (let i = 0; i < chunks; i++) {
    const d = Math.min(1, startD + (1 - startD) * (i / (chunks - 1))); // difficulty 0..1
    const pool: ChunkKind[] = ['run', 'hammer', 'gap', 'faller', 'conveyor', 'tiles', 'mover', 'walls', 'bars'];
    let kind = pool[Math.floor(rnd() * pool.length)];
    if (i < 3 && startD < 0.2) kind = (['run', 'bars', 'gap'] as ChunkKind[])[i];
    if (kind === lastKind && kind !== 'run') kind = 'run';
    lastKind = kind;

    switch (kind) {
      case 'run': {
        addPlat(12 + rnd() * 6, 12);
        break;
      }
      case 'bars': {
        const c = addPlat(18, 12);
        obstacles.push({
          type: 'bar',
          pos: [0, 0, c],
          length: 9,
          speed: (rnd() < 0.5 ? -1 : 1) * (1 + d * 0.9),
          phase: rnd() * 6,
        });
        break;
      }
      case 'hammer': {
        const n = d > 0.45 ? 2 : 1;
        const c = addPlat(n === 2 ? 24 : 16, 12);
        const period = 3.4 - d * 0.9;
        for (let k = 0; k < n; k++) {
          obstacles.push({
            type: 'hammer',
            pos: [0, 0, c + (k === 0 ? -(n === 2 ? 5 : 0) : 5)],
            period,
            amp: 0.9,
            length: 7,
            phase: k * Math.PI,
          });
        }
        break;
      }
      case 'gap': {
        addPlat(8, 10);
        const gap = 3 + d * 2.3;
        end -= gap;
        const next = addPlat(10, 10);
        coins.push([0, 2.8, next + 5 + gap / 2 + 1]);
        break;
      }
      case 'faller': {
        addPlat(6, 8);
        end -= 2.5;
        for (let k = 0; k < 3; k++) {
          obstacles.push({ type: 'faller', pos: [0, 0, end - 3], size: [6, 1, 6], delay: 1.4 - d * 0.35, respawn: 2.5 });
          end -= 7.5;
        }
        end += 1.5; // gap back to solid ground after the last one
        end -= 1.5;
        addPlat(8, 10);
        break;
      }
      case 'conveyor': {
        addPlat(18, 8, { surface: 'conveyor', dir: [0, 1], speed: 3 + d * 2, color: '#47c2ff' });
        break;
      }
      case 'tiles': {
        addPlat(6, 10);
        for (let k = 0; k < 4; k++) {
          obstacles.push({ type: 'tile', pos: [0, 0, end - 2], size: [6, 1, 4], on: 3.8 - d * 0.5, off: 1.6, phase: k * 2.2 });
          end -= 4;
        }
        addPlat(8, 10);
        break;
      }
      case 'mover': {
        addPlat(8, 10);
        obstacles.push({ type: 'mover', from: [0, 0, end - 3.5], to: [0, 0, end - 12.5], size: [6, 1, 6], period: 7 - d * 1.5, phase: 0 });
        end -= 15;
        addPlat(10, 10);
        break;
      }
      case 'walls': {
        const c = addPlat(24, 12);
        const period = 3.8 - d * 0.8;
        obstacles.push(
          { type: 'wall', from: [-4, 0, c - 5], to: [4, 0, c - 5], size: [4, 3, 1.4], period, phase: 0 },
          { type: 'wall', from: [-4, 0, c + 5], to: [4, 0, c + 5], size: [4, 3, 1.4], period, phase: period / 2 },
        );
        break;
      }
    }
    if (i % 4 === 3) {
      const z = end + 4;
      checkpoints.push({ pos: [0, 0, z] });
    }
  }

  // finish platform
  const finishZ = end - 10;
  platforms.push(plat(0, end - 12, 16, 24, 0, { color: '#ffd45e' }));
  end -= 24;

  return {
    id: opts.id ?? `endless-${world}`,
    world,
    name: opts.name ?? 'Endless Run',
    index: 0,
    difficulty: 3,
    waypoints: [
      [0, 0, 2],
      [0, 0, finishZ],
    ],
    spawn: [0, 0, 1],
    finish: [0, 0, finishZ],
    platforms,
    obstacles,
    checkpoints,
    coins,
    killY: -14,
    parTime: 0,
    aiSkill: 0.9,
    laneWidth: 2,
  };
}
