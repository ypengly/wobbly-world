import { useCallback, useMemo } from 'react';
import { useRapier } from '@react-three/rapier';
import type { Vec3 } from '../../types/game';
import { PLAYER_ID } from '../../utils/constants';
import { usePlayerStore } from '../../store/playerStore';
import { InputManager } from '../controls/InputManager';
import { camState } from '../camera/FollowCamera';
import { getCharacter } from './CharacterData';
import { RacerBody } from './RacerBody';
import { AIManager } from '../systems/AIManager';
import { RaceManager } from '../systems/RaceManager';
import { probeGround } from '../physics/CollisionManager';
import { registry } from '../physics/PhysicsWorld';

/**
 * The human racer: input comes from keyboard + touch, camera-relative.
 * `window.__wwAutopilot = true` (debug only) lets the AI brain drive the player so
 * whole courses can be verified automatically.
 */
export function Player({ start }: { start: Vec3 }) {
  const selected = usePlayerStore((s) => s.selectedCharacter);
  const loadout = usePlayerStore((s) => s.loadout);
  const { world, rapier } = useRapier();
  const pilot = useMemo(() => AIManager.createBrain(3, 7, RaceManager.level, 4242), []);

  const getInput = useCallback(
    (dt: number) => {
      if ((window as any).__wwAutopilot) {
        const r = RaceManager.racers.get(PLAYER_ID)!;
        pilot.skill = 1;
        return AIManager.decide(pilot, r, dt, {
          level: RaceManager.level,
          course: RaceManager.course,
          time: registry.time,
          probe: (x, y, z) => probeGround(world, rapier as any, null, x, y, z, 2.4),
        });
      }
      return InputManager.read(camState.yaw);
    },
    [pilot, world, rapier],
  );

  return <RacerBody id={PLAYER_ID} def={getCharacter(selected)} loadout={loadout} start={start} isPlayer getInput={getInput} />;
}
