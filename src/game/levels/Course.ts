import type { Vec3 } from '../../types/game';

export interface CourseProjection {
  /** distance travelled along the course */
  dist: number;
  seg: number;
  /** signed lateral offset from the path (right = +) */
  lateral: number;
}

/** Polyline through the level used for progress, camera yaw and AI steering (xz plane). */
export class Course {
  readonly pts: Vec3[];
  readonly cum: number[] = [0];
  readonly length: number;

  constructor(waypoints: Vec3[]) {
    this.pts = waypoints;
    for (let i = 1; i < waypoints.length; i++) {
      const a = waypoints[i - 1];
      const b = waypoints[i];
      this.cum.push(this.cum[i - 1] + Math.hypot(b[0] - a[0], b[2] - a[2]));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  /** Project a world position onto the course. `hint` restricts the search window for robustness. */
  project(x: number, z: number, hintSeg?: number): CourseProjection {
    const n = this.pts.length - 1;
    let lo = 0;
    let hi = n - 1;
    if (hintSeg !== undefined) {
      lo = Math.max(0, hintSeg - 2);
      hi = Math.min(n - 1, hintSeg + 3);
    }
    let best = { dist: 0, seg: 0, lateral: 0, d2: Infinity };
    for (let i = lo; i <= hi; i++) {
      const a = this.pts[i];
      const b = this.pts[i + 1];
      const abx = b[0] - a[0];
      const abz = b[2] - a[2];
      const len2 = abx * abx + abz * abz || 1e-6;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (z - a[2]) * abz) / len2));
      const cx = a[0] + abx * t;
      const cz = a[2] + abz * t;
      const d2 = (x - cx) ** 2 + (z - cz) ** 2;
      if (d2 < best.d2) {
        const segLen = Math.sqrt(len2);
        // lateral sign: cross product of path direction and offset (right-hand, y up)
        const cross = (abx * (z - cz) - abz * (x - cx)) / segLen;
        best = { dist: this.cum[i] + t * segLen, seg: i, lateral: -cross, d2 };
      }
    }
    return { dist: best.dist, seg: best.seg, lateral: best.lateral };
  }

  pointAt(dist: number): Vec3 {
    const d = Math.max(0, Math.min(this.length, dist));
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const a = this.pts[i - 1];
    const b = this.pts[i];
    const span = this.cum[i] - this.cum[i - 1] || 1e-6;
    const t = (d - this.cum[i - 1]) / span;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  /** Unit direction of travel at distance d (xz) */
  tangentAt(dist: number): [number, number] {
    const d = Math.max(0, Math.min(this.length, dist));
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const a = this.pts[i - 1];
    const b = this.pts[i];
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const l = Math.hypot(dx, dz) || 1;
    return [dx / l, dz / l];
  }

  /** Camera yaw (0 = looking down -Z) for a given distance along the course */
  yawAt(dist: number): number {
    const [tx, tz] = this.tangentAt(dist);
    // forward = (-sin yaw, -cos yaw)  =>  yaw = atan2(-tx, -tz)
    return Math.atan2(-tx, -tz);
  }
}
