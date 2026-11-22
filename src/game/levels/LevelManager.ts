import type { GameMode, WorldId } from '../../types/game';
import type { LevelConfig, WorldDef } from '../../types/level';
import { candy01 } from './levels/candy-01';
import { candy02 } from './levels/candy-02';
import { lava01 } from './levels/lava-01';
import { sky01 } from './levels/sky-01';
import { toy01 } from './levels/toy-01';
import { WORLDS, getWorld } from './LevelConfig';
import { generateEndless } from './EndlessGenerator';

/**
 * To add a level: create `levels/<world>-NN.ts`, export a LevelConfig, add it to LEVELS below.
 * Unlock order follows this array.
 */
export const LEVELS: LevelConfig[] = [candy01, candy02, lava01, sky01, toy01];

export const LevelManager = {
  levels: LEVELS,
  worlds: WORLDS,

  getLevel(id: string): LevelConfig | undefined {
    return LEVELS.find((l) => l.id === id);
  },

  getWorld(id: WorldId): WorldDef {
    return getWorld(id);
  },

  levelsOf(world: WorldId): LevelConfig[] {
    return LEVELS.filter((l) => l.world === world);
  },

  /** Resolve the level to race on; Endless builds a fresh seeded course on every start. */
  resolve(levelId: string, mode: GameMode): LevelConfig {
    if (mode === 'endless' || mode === 'survival') {
      const world = (this.getLevel(levelId)?.world ?? (levelId.replace(/^(endless|survival)-/, '') as WorldId)) as WorldId;
      const seed = Math.floor(Math.random() * 1e9);
      return mode === 'endless'
        ? generateEndless(world, seed, { chunks: 45, id: `endless-${world}` })
        : generateEndless(world, seed, { chunks: 24, startDifficulty: 0.35, id: `survival-${world}`, name: 'Survival' });
    }
    return this.getLevel(levelId) ?? LEVELS[0];
  },

  /** A level is unlocked when the one before it (in LEVELS order) is completed. */
  isLevelUnlocked(id: string, completed: string[]): boolean {
    const idx = LEVELS.findIndex((l) => l.id === id);
    if (idx <= 0) return idx === 0;
    return completed.includes(LEVELS[idx - 1].id);
  },

  isWorldUnlocked(world: WorldId, completed: string[]): boolean {
    const first = LEVELS.find((l) => l.world === world);
    return first ? this.isLevelUnlocked(first.id, completed) : false;
  },

  nextLevel(id: string): LevelConfig | undefined {
    const idx = LEVELS.findIndex((l) => l.id === id);
    return idx >= 0 ? LEVELS[idx + 1] : undefined;
  },
};
