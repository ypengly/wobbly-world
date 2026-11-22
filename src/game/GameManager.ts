import type { ChallengeId, GameMode } from '../types/game';
import type { LevelConfig } from '../types/level';
import type { CharacterDef } from '../types/character';
import { CHARACTERS } from './characters/CharacterData';
import { AI_COUNT } from './GameConfig';
import type { RacerState } from './systems/RaceManager';

export const AI_NAMES = ['Wiggles', 'Boingo', 'Squish', 'Noodle', 'Gus', 'Pip', 'Mochi', 'Zorp'];

export const CHALLENGES: Record<ChallengeId, { name: string; blurb: string }> = {
  speed: { name: 'Speed Run', blurb: 'Finish before the par time runs out.' },
  coins: { name: 'Coin Hunter', blurb: 'Grab at least 80% of the coins and finish.' },
  clean: { name: 'Clean Run', blurb: 'Finish without falling or getting bonked.' },
};

export function usesAI(mode: GameMode) {
  return mode === 'classic';
}

/** The AI field: different characters from the player, deterministic per level. */
export function buildOpponents(playerCharacter: string, count = AI_COUNT): { def: CharacterDef; name: string }[] {
  const pool = CHARACTERS.filter((c) => c.id !== playerCharacter);
  return Array.from({ length: count }, (_, i) => ({ def: pool[i % pool.length], name: AI_NAMES[i % AI_NAMES.length] }));
}

/** Starting grid on the first platform. Index 0 is the player. */
export function gridSlot(level: LevelConfig, slot: number): [number, number, number] {
  const xs = [0, -2.4, 2.4, -4.8, 4.8, -7, 7];
  const x = xs[slot % xs.length];
  const z = level.spawn[2] - (slot > 2 ? 1.4 : 0) + (slot === 0 ? 0 : -0.2);
  return [x, level.spawn[1], z];
}

export interface ChallengeStatus {
  label: string;
  success: boolean;
}

export function evaluateChallenge(id: ChallengeId, level: LevelConfig, p: RacerState): ChallengeStatus {
  const label = CHALLENGES[id].name;
  if (!p.finished) return { label, success: false };
  switch (id) {
    case 'speed':
      return { label, success: p.finishTime <= level.parTime };
    case 'coins':
      return { label, success: p.coins >= Math.ceil(level.coins.length * 0.8) };
    case 'clean':
      return { label, success: p.falls === 0 && p.hits === 0 };
  }
}

export function objectiveText(id: ChallengeId, level: LevelConfig, p: RacerState): string {
  switch (id) {
    case 'speed':
      return `Beat ${level.parTime}s`;
    case 'coins':
      return `Coins ${p.coins}/${Math.ceil(level.coins.length * 0.8)}`;
    case 'clean':
      return `No falls or bonks (${p.falls + p.hits})`;
  }
}
