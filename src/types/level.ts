import type { SurfaceType, Vec3, WorldId } from './game';

export interface PlatformDef {
  pos: Vec3;
  size: Vec3;
  surface?: SurfaceType;
  /** conveyor direction on xz plane */
  dir?: [number, number];
  /** conveyor speed */
  speed?: number;
  color?: string;
  shape?: 'box' | 'round';
}

export type ObstacleDef =
  | { type: 'hammer'; pos: Vec3; period: number; amp?: number; phase?: number; length?: number }
  | { type: 'bar'; pos: Vec3; length: number; speed: number; phase?: number }
  | { type: 'mover'; from: Vec3; to: Vec3; size: Vec3; period: number; phase?: number }
  | { type: 'wall'; from: Vec3; to: Vec3; size: Vec3; period: number; phase?: number }
  | { type: 'ball'; from: Vec3; to: Vec3; radius: number; period: number; phase?: number }
  | { type: 'faller'; pos: Vec3; size: Vec3; delay?: number; respawn?: number }
  | { type: 'tile'; pos: Vec3; size: Vec3; on: number; off: number; phase?: number }
  | { type: 'punch'; pos: Vec3; dir: [number, number]; reach: number; period: number; phase?: number };

export interface CheckpointDef {
  pos: Vec3;
}

export interface LevelConfig {
  id: string;
  world: WorldId;
  name: string;
  index: number; // 1-based within the world
  /** ordered path through the level; used for progress, AI and camera */
  waypoints: Vec3[];
  spawn: Vec3;
  finish: Vec3;
  platforms: PlatformDef[];
  obstacles: ObstacleDef[];
  checkpoints: CheckpointDef[];
  coins: Vec3[];
  /** below this y racers are respawned */
  killY: number;
  /** seconds; used for challenge objectives */
  parTime: number;
  /** AI speed multiplier baseline */
  aiSkill: number;
  /** width of lanes for AI offset (spread across racers) */
  laneWidth: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface WorldDef {
  id: WorldId;
  name: string;
  tagline: string;
  sky: [string, string];
  fog: string;
  ground: string;
  platformColors: string[];
  accent: string;
  ambient: number;
}
