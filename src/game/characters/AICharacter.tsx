import { useCallback, useMemo } from 'react';
import { useRapier } from '@react-three/rapier';
import type { Vec3 } from '../../types/game';
import type { CharacterDef } from '../../types/character';
import type { LevelConfig } from '../../types/level';
import { DEFAULT_LOADOUT } from './CharacterData';
import { RacerBody } from './RacerBody';
import { AIManager } from '../systems/AIManager';
import { RaceManager } from '../systems/RaceManager';
import { probeGround } from '../physics/CollisionManager';
import { registry } from '../physics/PhysicsWorld';
import type { Loadout } from '../../types/character';

interface Props {
  id: string;
  def: CharacterDef;
  index: number;
  count: number;
  start: Vec3;
  level: LevelConfig;
  seed: number;
  loadout?: Loadout;
}

/** Waypoint-following opponent that uses the same controller and stamina rules as the player. */
export function AICharacter({ id, def, index, count, start, level, seed, loadout }: Props) {
  const { world, rapier } = useRapier();
  const brain = useMemo(() => AIManager.createBrain(index, count, level, seed), [index, count, level, seed]);

  const getInput = useCallback(
    (dt: number) => {
      const r = RaceManager.racers.get(id);
      if (!r) return { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, sprint: false };
      // watchdog: stuck for a long time -> back to the last checkpoint (never forward)
      if (RaceManager.time - r.lastProgressTime > 12) RaceManager.forceRespawn(id);
      return AIManager.decide(brain, r, dt, {
        level,
        course: RaceManager.course,
        time: registry.time,
        probe: (x, y, z) => probeGround(world, rapier as any, null as any, x, y, z, 2.4),
      });
    },
    [brain, id, level, world, rapier],
  );

  return (
    <RacerBody
      id={id}
      def={def}
      loadout={loadout ?? DEFAULT_LOADOUT}
      start={start}
      isPlayer={false}
      speedScale={brain.skill}
      getInput={getInput}
    />
  );
}
