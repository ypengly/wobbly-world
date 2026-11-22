import type { LevelConfig } from '../../../types/level';
import { coinArc, coinLine, plat } from '../LevelConfig';

/** Cloud Hopper — island hopping, a narrow bridge with a spinner, a ferry, a big bounce. */
export const sky01: LevelConfig = {
  id: 'sky-01',
  world: 'sky',
  name: 'Cloud Hopper',
  index: 1,
  difficulty: 3,
  waypoints: [
    [0, 0, 2],
    [0, 0, -186],
  ],
  spawn: [0, 0, 1],
  finish: [0, 1.2, -186],
  killY: -22,
  parTime: 58,
  aiSkill: 0.9,
  laneWidth: 1.5,
  platforms: [
    plat(0, -6, 16, 20),
    plat(0, -25, 8, 8), // z -29..-21 (5-unit gaps: a normal jump clears them)
    plat(0, -37, 8, 8),
    plat(0, -49, 8, 8),
    plat(0, -73, 2.6, 34, 0, { color: '#fff3d6' }), // narrow bridge z -90..-56
    plat(0, -97, 12, 14, 0, { color: '#e8f4ff' }), // z -104..-90
    plat(0, -126, 10, 12, 0, { color: '#ffffff' }), // after the ferry
    plat(0, -139, 6, 8, 0, { color: '#fff3d6' }), // z -143..-135
    plat(0, -147, 6, 8, 1.2, { color: '#e2e8ff' }), // step up, z -151..-143
    plat(0, -153, 8, 4, 1.2, { surface: 'bounce', color: '#ffe14d' }), // z -155..-151
    plat(0, -175, 16, 30, 1.2, { color: '#d9f0ff' }), // finish island, z -190..-160
  ],
  obstacles: [
    { type: 'bar', pos: [0, 0, -73], length: 5.4, speed: 1.9, phase: 0 },
    { type: 'mover', from: [0, 0, -107.5], to: [0, 0, -117.5], size: [6, 1, 6], period: 7, phase: 0 },
  ],
  checkpoints: [{ pos: [0, 0, -49] }, { pos: [0, 0, -97] }, { pos: [0, 0, -126] }, { pos: [0, 1.2, -147] }],
  coins: [
    ...coinArc(0, 1.4, -20, -30, 2, 4),
    ...coinArc(0, 1.4, -32, -42, 2, 4),
    ...coinLine(0, 1.4, -58, 0, 1.4, -88, 7),
    ...coinLine(0, 1.4, -92, 0, 1.4, -102, 4),
    ...coinArc(0, 1.4, -106, -122, 3, 5),
    ...coinArc(0, 2.6, -152, -168, 7, 5),
    ...coinLine(-4, 2.6, -172, 4, 2.6, -184, 6),
  ],
};
