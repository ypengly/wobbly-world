export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** frame-rate independent exponential smoothing factor */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
export const approach = (v: number, target: number, maxDelta: number) =>
  v < target ? Math.min(v + maxDelta, target) : Math.max(v - maxDelta, target);

export function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let d = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return current + d * (1 - Math.exp(-lambda * dt));
}

/** triangle wave 0..1..0 with period p */
export const triangle01 = (t: number, p: number) => {
  const x = ((t / p) % 1 + 1) % 1;
  return x < 0.5 ? x * 2 : 2 - x * 2;
};

/** smooth ping-pong 0..1..0 */
export const pingPong = (t: number, p: number) => smoothstep(triangle01(t, p));

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '--:--.--';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m.toString().padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
