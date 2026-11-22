import type { SurfaceType } from '../../types/game';

/** Analytic collision shapes used for hazard hit-tests and AI danger prediction. */
export type Shape =
  | { k: 'sphere'; x: number; y: number; z: number; r: number }
  | { k: 'seg'; ax: number; ay: number; az: number; bx: number; by: number; bz: number; r: number }
  | { k: 'box'; x: number; y: number; z: number; hx: number; hy: number; hz: number };

export interface SurfaceInfo {
  type: SurfaceType;
  dir?: [number, number];
  speed?: number;
  /** current world velocity of the platform (x,z used for carrying riders) */
  vx: number;
  vy: number;
  vz: number;
}

export interface HazardInfo {
  id: string;
  /** horizontal knockback speed */
  knockback: number;
  /** shapes occupied at simulation time t */
  shapes: (t: number) => Shape[];
}

/** A walkable area that comes and goes (movers, disappearing tiles) so AI can plan around gaps. */
export interface SoftGround {
  id: string;
  /** footprint at time t (null when absent) */
  footprint: (t: number) => { x: number; z: number; hx: number; hz: number; y: number } | null;
  /** region swept over time (for movers: bounding box of the path) */
  sweep: { x: number; z: number; hx: number; hz: number; y: number };
  kind: 'mover' | 'tile';
}

/** Mutable runtime registry shared by obstacle components, characters and the AI. Not React state. */
class PhysicsRegistry {
  /** rigid body handle -> surface description */
  surfaces = new Map<number, SurfaceInfo>();
  hazards = new Map<string, HazardInfo>();
  softGrounds = new Map<string, SoftGround>();
  /** rigid body handle -> sim time when a racer last stood on it */
  standing = new Map<number, number>();
  /** deterministic simulation clock (seconds); advanced only while racing and unpaused */
  time = 0;

  clear() {
    this.surfaces.clear();
    this.hazards.clear();
    this.softGrounds.clear();
    this.standing.clear();
    this.time = 0;
  }
}

export const registry = new PhysicsRegistry();
