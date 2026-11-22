import type { LevelConfig } from '../../../types/level';
import { coinArc, coinLine, plat } from '../LevelConfig';

/** Jelly Jam — adds moving walls, a ferry platform, rolling balls, disappearing tiles, a narrow bridge, punching blocks. */
export const candy02: LevelConfig = {
  id: 'candy-02',
  world: 'candy',
  name: 'Jelly Jam',
  index: 2,
  difficulty: 2,
  waypoints: [
    [0, 0, 2],
    [0, 0, -200],
  ],
  spawn: [0, 0, 1],
  finish: [0, 0, -200],
  killY: -14,
  parTime: 60,
  aiSkill: 0.88,
  laneWidth: 2.5,
  platforms: [
    plat(0, -6, 16, 20),
    plat(0, -30, 12, 28, 0, { color: '#6bc8ff' }), // moving walls
    plat(0, -52, 10, 12, 0, { color: '#ffd45e' }),
    plat(0, -81, 10, 16, 0, { color: '#ff7ab8' }), // ball room
    plat(0, -94.5, 8, 11, 0, { color: '#8be08b' }),
    plat(0, -125.5, 12, 11, 0, { color: '#c79bff' }),
    plat(0, -142, 3, 22, 0, { color: '#ffffff' }), // narrow bridge
    plat(0, -165, 12, 24, 0, { color: '#ffd45e' }), // punch room
    plat(0, -192, 16, 30, 0, { color: '#ff7ab8' }), // finish
  ],
  obstacles: [
    { type: 'wall', from: [-4, 0, -26], to: [4, 0, -26], size: [4, 3, 1.4], period: 3.6, phase: 0 },
    { type: 'wall', from: [-4, 0, -37], to: [4, 0, -37], size: [4, 3, 1.4], period: 3.6, phase: 1.8 },
    { type: 'mover', from: [0, 0, -61.5], to: [0, 0, -70.5], size: [6, 1, 6], period: 6.5, phase: 0 },
    { type: 'ball', from: [-5, 0, -78], to: [5, 0, -78], radius: 1.2, period: 3.4, phase: 0 },
    { type: 'ball', from: [-5, 0, -85], to: [5, 0, -85], radius: 1.2, period: 3.4, phase: 1.7 },
    { type: 'tile', pos: [0, 0, -102], size: [5, 1, 4], on: 3.8, off: 1.6, phase: 0 },
    { type: 'tile', pos: [0, 0, -106], size: [5, 1, 4], on: 3.8, off: 1.6, phase: 2.2 },
    { type: 'tile', pos: [0, 0, -110], size: [5, 1, 4], on: 3.8, off: 1.6, phase: 4.4 },
    { type: 'tile', pos: [0, 0, -114], size: [5, 1, 4], on: 3.8, off: 1.6, phase: 6.6 },
    { type: 'tile', pos: [0, 0, -118], size: [5, 1, 4], on: 3.8, off: 1.6, phase: 8.8 },
    { type: 'bar', pos: [0, 0, -142], length: 6.4, speed: 1.5, phase: 0 },
    { type: 'punch', pos: [-7.2, 0, -160], dir: [1, 0], reach: 6, period: 3.4, phase: 0 },
    { type: 'punch', pos: [7.2, 0, -170], dir: [-1, 0], reach: 6, period: 3.4, phase: 1.7 },
  ],
  checkpoints: [
    { pos: [0, 0, -52] },
    { pos: [0, 0, -94] },
    { pos: [0, 0, -125] },
    { pos: [0, 0, -165] },
  ],
  coins: [
    ...coinLine(0, 1.4, -14, 0, 1.4, -44, 8),
    ...coinArc(0, 1.4, -58, -72, 2.5, 5),
    ...coinLine(0, 1.4, -90, 0, 1.4, -100, 3),
    ...coinLine(0, 1.4, -102, 0, 1.4, -118, 4),
    ...coinLine(0, 1.4, -132, 0, 1.4, -152, 6),
    ...coinLine(0, 1.4, -156, 0, 1.4, -176, 5),
    ...coinLine(-4, 1.4, -184, 4, 1.4, -196, 3),
  ],
};
