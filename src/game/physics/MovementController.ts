/**
 * Pure movement maths (no Three/Rapier imports) so it is trivial to reason about and unit-test.
 */

/** Move (vx,vz) toward (tx,tz) by at most `rate*dt` — never overshoots, so no jitter or sliding. */
export function approachVector2(
  vx: number,
  vz: number,
  tx: number,
  tz: number,
  rate: number,
  dt: number,
): [number, number] {
  const dx = tx - vx;
  const dz = tz - vz;
  const dist = Math.hypot(dx, dz);
  const step = rate * dt;
  if (dist <= step || dist < 1e-6) return [tx, tz];
  return [vx + (dx / dist) * step, vz + (dz / dist) * step];
}

/** Normalise an input vector so diagonals are never faster than cardinal moves. */
export function normalizeInput(x: number, z: number): [number, number, number] {
  const len = Math.hypot(x, z);
  if (len < 1e-4) return [0, 0, 0];
  if (len > 1) return [x / len, z / len, 1];
  return [x, z, len];
}
