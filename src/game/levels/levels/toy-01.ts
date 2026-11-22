import type { LevelConfig } from '../../../types/level';
import { coinArc, coinLine, plat } from '../LevelConfig';

/** Block Party — rolling toys, moving roads, punching blocks and wobbly walls. */
export const toy01: LevelConfig = {
  id: 'toy-01',
  world: 'toy',
  name: 'Block Party',
  index: 1,
  difficulty: 4,
  waypoints: [
    [0, 0, 2],
    [0, 0, -204],
  ],
  spawn: [0, 0, 1],
  finish: [0, 0, -204],
  killY: -14,
  parTime: 66,
  aiSkill: 0.92,
  laneWidth: 2,
  platforms: [
    plat(0, -6, 16, 20),
    plat(0, -30, 12, 28, 0, { surface: 'conveyor', dir: [0, 1], speed: 3, color: '#4a4a5e' }), // moving road
    plat(0, -60, 12, 32, 0, { color: '#ffc83d' }),
    plat(0, -90, 10, 28, 0, { surface: 'conveyor', dir: [1, 0], speed: 2.5, color: '#4a4a5e' }),
    plat(0, -118, 12, 28, 0, { color: '#5bd68b' }),
    plat(0, -135, 8, 6, 0, { color: '#4aa8ff' }),
    plat(0, -158, 12, 36, 0, { color: '#ff5d5d' }),
    plat(0, -194, 18, 36, 0, { color: '#b46bff' }),
  ],
  obstacles: [
    { type: 'ball', from: [-5, 0, -24], to: [5, 0, -24], radius: 1.2, period: 3, phase: 0 },
    { type: 'ball', from: [-5, 0, -33], to: [5, 0, -33], radius: 1.2, period: 3, phase: 1.5 },
    { type: 'wall', from: [-4, 0, -57], to: [4, 0, -57], size: [4, 3, 1.4], period: 3.4, phase: 0 },
    { type: 'wall', from: [4, 0, -66], to: [-4, 0, -66], size: [4, 3, 1.4], period: 3.4, phase: 0 },
    { type: 'punch', pos: [-6.7, 0, -86], dir: [1, 0], reach: 5, period: 3.2, phase: 0 },
    { type: 'punch', pos: [6.7, 0, -95], dir: [-1, 0], reach: 5, period: 3.2, phase: 1.6 },
    { type: 'hammer', pos: [0, 0, -112], period: 2.8, amp: 0.85, length: 6.5, phase: 0 },
    { type: 'hammer', pos: [0, 0, -123], period: 2.8, amp: 0.85, length: 6.5, phase: Math.PI },
    { type: 'faller', pos: [0, 0, -141], size: [6, 1, 5], delay: 1.4, respawn: 2.5 },
    { type: 'bar', pos: [0, 0, -150], length: 10, speed: 1.5, phase: 0 },
    { type: 'bar', pos: [0, 0, -164], length: 10, speed: -1.7, phase: 1 },
    { type: 'ball', from: [-5, 0, -182], to: [5, 0, -182], radius: 1.4, period: 3, phase: 0 },
    { type: 'ball', from: [5, 0, -190], to: [-5, 0, -190], radius: 1.4, period: 3, phase: 0.8 },
  ],
  checkpoints: [{ pos: [0, 0, -60] }, { pos: [0, 0, -90] }, { pos: [0, 0, -118] }, { pos: [0, 0, -158] }],
  coins: [
    ...coinLine(0, 1.4, -10, 0, 1.4, -48, 9),
    ...coinLine(0, 1.4, -52, 0, 1.4, -74, 6),
    ...coinLine(0, 1.4, -78, 0, 1.4, -104, 6),
    ...coinLine(0, 1.4, -108, 0, 1.4, -128, 5),
    ...coinLine(0, 1.4, -134, 0, 1.4, -176, 8),
    ...coinLine(-4, 1.4, -180, 4, 1.4, -204, 6),
  ],
};
