import type { LevelConfig } from '../../types/level';
import type { Vec3 } from '../../types/game';

/** Helpers around checkpoint placement; runtime detection lives in RaceManager.updateRacer. */
export const CheckpointManager = {
  /** Resolve where a racer should respawn given their last checkpoint index. */
  respawnPoint(level: LevelConfig, checkpoint: number): Vec3 {
    const p = checkpoint >= 0 ? level.checkpoints[checkpoint]?.pos : undefined;
    const base = p ?? level.spawn;
    return [base[0], base[1] + 1.4, base[2]];
  },
};
