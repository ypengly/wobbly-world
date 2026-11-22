import type { ComponentType } from 'react';
import type { LevelConfig, ObstacleDef } from '../../types/level';
import { SwingingHammer } from './SwingingHammer';
import { RotatingBar } from './RotatingBar';
import { MovingPlatform, MovingWall } from './MovingPlatform';
import { RollingBall } from './RollingBall';
import { FallingPlatform } from './FallingPlatform';
import { DisappearingTile } from './DisappearingTile';
import { PunchingBlock } from './PunchingBlock';

interface ObstacleProps<T extends ObstacleDef = ObstacleDef> {
  def: T;
  id: string;
  color: string;
}

/**
 * Registry mapping an obstacle `type` to its component.
 * To add a new obstacle: add a def variant in types/level.ts, write a component that registers
 * itself with `registry` (hazards/surfaces/softGrounds) and add it here.
 */
export const OBSTACLE_COMPONENTS: Record<ObstacleDef['type'], ComponentType<ObstacleProps<any>>> = {
  hammer: SwingingHammer,
  bar: RotatingBar,
  mover: MovingPlatform,
  wall: MovingWall,
  ball: RollingBall,
  faller: FallingPlatform,
  tile: DisappearingTile,
  punch: PunchingBlock,
};

/** Default (clearly visible) colours per obstacle type, tinted by the world accent where it helps. */
export function obstacleColor(def: ObstacleDef, accent: string, platformColors: string[]): string {
  switch (def.type) {
    case 'hammer':
      return '#ff5470';
    case 'bar':
      return accent;
    case 'wall':
      return '#ff6b4a';
    case 'ball':
      return '#ff7ab8';
    case 'punch':
      return '#ff5470';
    case 'mover':
      return '#46d6ff';
    case 'faller':
      return '#ffb84d';
    case 'tile':
      return platformColors[2] ?? '#9bdcff';
  }
}

export const ObstacleManager = {
  idFor(level: LevelConfig, index: number) {
    return `${level.id}:${index}`;
  },
  /** Hint strings used by the loading screen / tutorial tips */
  describe(def: ObstacleDef): string {
    switch (def.type) {
      case 'hammer':
        return 'Swinging hammer — time your run';
      case 'bar':
        return 'Spinning bar — jump over it';
      case 'mover':
        return 'Ferry platform — wait for it';
      case 'wall':
        return 'Moving wall';
      case 'ball':
        return 'Rolling ball';
      case 'faller':
        return 'Falling platform — keep moving';
      case 'tile':
        return 'Disappearing tile';
      case 'punch':
        return 'Punching block';
    }
  },
};
