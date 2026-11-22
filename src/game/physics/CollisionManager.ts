import type { RapierRigidBody } from '@react-three/rapier';
import type { World } from '@dimforge/rapier3d-compat';
import { registry, type Shape, type SurfaceInfo } from './PhysicsWorld';
import { MOVE } from '../GameConfig';

export interface GroundInfo {
  grounded: boolean;
  surface: SurfaceInfo | null;
  handle: number | null;
  /** distance from body centre to ground */
  distance: number;
}

export const NO_GROUND: GroundInfo = { grounded: false, surface: null, handle: null, distance: Infinity };

const FEET = MOVE.capsuleHalfHeight + MOVE.capsuleRadius;
const OFFSETS: [number, number][] = [
  [0, 0],
  [0.32, 0],
  [-0.32, 0],
  [0, 0.32],
  [0, -0.32],
];

type RapierModule = typeof import('@dimforge/rapier3d-compat');

function toi(hit: any): number {
  return hit.timeOfImpact ?? hit.toi ?? 0;
}

/** Cast a handful of rays below a body to find ground and the surface under it. */
export function castGround(
  world: World,
  rapier: RapierModule,
  body: RapierRigidBody,
  x: number,
  y: number,
  z: number,
  reach = 0.2,
): GroundInfo {
  let best: any = null;
  let bestT = Infinity;
  const maxToi = FEET + reach;
  for (const [ox, oz] of OFFSETS) {
    const ray = new rapier.Ray({ x: x + ox, y, z: z + oz }, { x: 0, y: -1, z: 0 });
    const hit = world.castRay(ray, maxToi, true, rapier.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, undefined, body as any);
    if (hit) {
      const t = toi(hit);
      if (t < bestT) {
        bestT = t;
        best = hit;
      }
    }
  }
  if (!best) return NO_GROUND;
  const parent = best.collider?.parent?.();
  const handle: number | null = parent ? parent.handle : null;
  const surface = handle !== null ? (registry.surfaces.get(handle) ?? null) : null;
  return { grounded: true, surface, handle, distance: bestT };
}

/** Is there solid ground at (x,z) below y? Used by the AI to probe gaps. */
export function probeGround(
  world: World,
  rapier: RapierModule,
  body: RapierRigidBody | null,
  x: number,
  y: number,
  z: number,
  depth = 1.6,
): boolean {
  const ray = new rapier.Ray({ x, y, z }, { x: 0, y: -1, z: 0 });
  // ignore dynamic bodies: our own capsule and other racers are not "floor"
  const hit = world.castRay(ray, depth, true, rapier.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, undefined, (body ?? undefined) as any);
  return !!hit;
}

// ---------------------------------------------------------------------------
// Analytic shape tests
// ---------------------------------------------------------------------------

export interface ShapeHit {
  /** push direction (from shape toward point), horizontal, normalised */
  nx: number;
  nz: number;
  /** signed distance from shape surface (negative = inside) */
  d: number;
}

export function pointShape(s: Shape, px: number, py: number, pz: number): ShapeHit {
  if (s.k === 'sphere') {
    const dx = px - s.x;
    const dy = py - s.y;
    const dz = pz - s.z;
    const l = Math.hypot(dx, dy, dz) || 1e-6;
    const h = Math.hypot(dx, dz) || 1e-6;
    return { nx: dx / h, nz: dz / h, d: l - s.r };
  }
  if (s.k === 'seg') {
    const abx = s.bx - s.ax;
    const aby = s.by - s.ay;
    const abz = s.bz - s.az;
    const apx = px - s.ax;
    const apy = py - s.ay;
    const apz = pz - s.az;
    const len2 = abx * abx + aby * aby + abz * abz || 1e-6;
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / len2));
    const cx = s.ax + abx * t;
    const cy = s.ay + aby * t;
    const cz = s.az + abz * t;
    const dx = px - cx;
    const dy = py - cy;
    const dz = pz - cz;
    const l = Math.hypot(dx, dy, dz);
    const h = Math.hypot(dx, dz) || 1e-6;
    return { nx: dx / h, nz: dz / h, d: l - s.r };
  }
  // box
  const dx = px - s.x;
  const dy = py - s.y;
  const dz = pz - s.z;
  const qx = Math.max(-s.hx, Math.min(s.hx, dx));
  const qy = Math.max(-s.hy, Math.min(s.hy, dy));
  const qz = Math.max(-s.hz, Math.min(s.hz, dz));
  const ox = dx - qx;
  const oy = dy - qy;
  const oz = dz - qz;
  const dist = Math.hypot(ox, oy, oz);
  if (dist > 1e-6) {
    const h = Math.hypot(ox, oz);
    if (h < 1e-6) return { nx: 0, nz: 0, d: dist }; // directly above/below: no horizontal push
    return { nx: ox / h, nz: oz / h, d: dist };
  }
  // inside: push out along the shallowest horizontal axis
  const px2 = s.hx - Math.abs(dx);
  const pz2 = s.hz - Math.abs(dz);
  if (px2 < pz2) return { nx: Math.sign(dx) || 1, nz: 0, d: -px2 };
  return { nx: 0, nz: Math.sign(dz) || 1, d: -pz2 };
}

const SAMPLE_Y = [-0.3, 0.25];

export interface HazardHit {
  nx: number;
  nz: number;
  knockback: number;
  id: string;
}

/** Test a character (approximated by two spheres) against all hazards at sim time t. */
export function testHazards(px: number, py: number, pz: number, t: number, radius: number): HazardHit | null {
  for (const h of registry.hazards.values()) {
    const shapes = h.shapes(t);
    for (const s of shapes) {
      for (const oy of SAMPLE_Y) {
        const r = pointShape(s, px, py + oy, pz);
        if (r.d < radius) {
          let { nx, nz } = r;
          if (Math.abs(nx) + Math.abs(nz) < 1e-3) {
            nx = Math.random() - 0.5;
            nz = Math.random() - 0.5;
            const l = Math.hypot(nx, nz) || 1;
            nx /= l;
            nz /= l;
          }
          return { nx, nz, knockback: h.knockback, id: h.id };
        }
      }
    }
  }
  return null;
}

/** Would standing at (x,y,z) at time t be dangerous (within `margin` of a hazard)? */
export function dangerAt(x: number, y: number, z: number, t: number, margin: number): boolean {
  for (const h of registry.hazards.values()) {
    for (const s of h.shapes(t)) {
      for (const oy of SAMPLE_Y) {
        if (pointShape(s, x, y + oy, z).d < margin) return true;
      }
    }
  }
  return false;
}
