import type { LevelConfig } from '../../../types/level';
import { coinArc, coinLine, plat } from '../LevelConfig';

/** Sugar Rush — beginner course: bars, hammers, falling platforms, bounce pad, conveyor, slippery floor. */
export const candy01: LevelConfig = {
  id: 'candy-01',
  world: 'candy',
  name: 'Sugar Rush',
  index: 1,
  difficulty: 1,
  waypoints: [
    [0, 0, 2],
    [0, 0, -218],
  ],
  spawn: [0, 0, 1],
  finish: [0, 0, -218],
  killY: -14,
  parTime: 50,
  aiSkill: 0.86,
  laneWidth: 3,
  platforms: [
    plat(0, -6, 16, 20), // start
    plat(0, -33, 14, 34, 0, { color: '#ff7ab8' }),
    plat(0, -58, 12, 10), // after gap
    plat(0, -79, 12, 32, 0, { color: '#6bc8ff' }), // hammer corridor
    plat(0, -100, 8, 10),
    plat(0, -131, 10, 4), // before bounce
    plat(0, -134.5, 8, 3, 0, { surface: 'bounce', color: '#ffe14d' }),
    plat(0, -153, 14, 20, 0, { color: '#8be08b' }),
    plat(0, -173, 8, 20, 0, { surface: 'conveyor', dir: [0, 1], speed: 3.2, color: '#47c2ff' }),
    plat(0, -193, 10, 20, 0, { surface: 'slippery', color: '#aef0ff' }),
    plat(0, -215, 18, 24, 0, { color: '#c79bff' }), // finish
  ],
  obstacles: [
    { type: 'bar', pos: [0, 0, -27], length: 9, speed: 1.0, phase: 0 },
    { type: 'bar', pos: [0, 0, -41], length: 9, speed: -1.1, phase: 1.2 },
    { type: 'hammer', pos: [0, 0, -72], period: 3.2, amp: 0.95, length: 7, phase: 0 },
    { type: 'hammer', pos: [0, 0, -85], period: 3.2, amp: 0.95, length: 7, phase: Math.PI },
    { type: 'faller', pos: [0, 0, -111], size: [6, 1, 6], delay: 1.4, respawn: 2.5 },
    { type: 'faller', pos: [0, 0, -118.5], size: [6, 1, 6], delay: 1.4, respawn: 2.5 },
    { type: 'faller', pos: [0, 0, -126], size: [6, 1, 6], delay: 1.4, respawn: 2.5 },
  ],
  checkpoints: [
    { pos: [0, 0, -58] },
    { pos: [0, 0, -100] },
    { pos: [0, 0, -131] },
    { pos: [0, 0, -153] },
    { pos: [0, 0, -193] },
  ],
  coins: [
    ...coinLine(0, 1.4, -12, 0, 1.4, -48, 9),
    ...coinArc(0, 1.4, -50, -54, 1.8, 3),
    ...coinLine(-3.5, 1.4, -66, 3.5, 1.4, -92, 5),
    ...coinLine(0, 1.4, -102, 0, 1.4, -128, 5),
    ...coinArc(0, 2.5, -136, -146, 5, 5),
    ...coinLine(0, 1.4, -150, 0, 1.4, -200, 8),
  ],
};
