import type { Vec3 } from '../../types/game';
import type { PlatformDef, WorldDef } from '../../types/level';

/**
 * Authoring helpers. A platform is described by its *top surface* height `y`;
 * the 1-unit-thick slab hangs below it. Obstacles use top-surface coordinates too.
 */
export const plat = (
  x: number,
  z: number,
  w: number,
  d: number,
  y = 0,
  opts: Partial<PlatformDef> = {},
): PlatformDef => ({ pos: [x, y - 0.5, z], size: [w, 1, d], ...opts });

/** n coins evenly spaced on a straight line */
export const coinLine = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, n: number): Vec3[] => {
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t]);
  }
  return out;
};

/** Coins following a parabolic arc (to guide jumps over gaps) */
export const coinArc = (x: number, y: number, z0: number, z1: number, height: number, n: number): Vec3[] => {
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push([x, y + 4 * height * t * (1 - t), z0 + (z1 - z0) * t]);
  }
  return out;
};

export const WORLDS: WorldDef[] = [
  {
    id: 'candy',
    name: 'Candy Land',
    tagline: 'Sweet, squishy and a little bit sticky.',
    sky: ['#9bdcff', '#ffc2e6'],
    fog: '#ffd9f0',
    ground: '#ff9ccf',
    platformColors: ['#ff7ab8', '#6bc8ff', '#ffd45e', '#8be08b', '#c79bff'],
    accent: '#ff5fa2',
    ambient: 0.75,
  },
  {
    id: 'lava',
    name: 'Lava Factory',
    tagline: 'Hot machinery. Hotter timing.',
    sky: ['#3a1018', '#ff7a2a'],
    fog: '#5a1d12',
    ground: '#ff5a1f',
    platformColors: ['#5b4b52', '#7a5a4a', '#4a3f4d', '#8a5a3a', '#65515b'],
    accent: '#ff8a1f',
    ambient: 0.6,
  },
  {
    id: 'sky',
    name: 'Sky Adventure',
    tagline: 'Mind the gap. Mind the very big gap.',
    sky: ['#4aa8ff', '#e6f6ff'],
    fog: '#cfeaff',
    ground: '#b8dcff',
    platformColors: ['#ffffff', '#e8f4ff', '#d9f0ff', '#fff3d6', '#e2e8ff'],
    accent: '#46b6ff',
    ambient: 0.85,
  },
  {
    id: 'toy',
    name: 'Toy City',
    tagline: 'Everything is a toy. Everything bonks.',
    sky: ['#8fd3ff', '#fff2b8'],
    fog: '#fff0c8',
    ground: '#7ad66b',
    platformColors: ['#ff5d5d', '#ffc83d', '#4aa8ff', '#5bd68b', '#b46bff'],
    accent: '#ffc83d',
    ambient: 0.8,
  },
];

export const getWorld = (id: string) => WORLDS.find((w) => w.id === id) ?? WORLDS[0];
