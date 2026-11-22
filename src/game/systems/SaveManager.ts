import { SAVE_KEY } from '../../utils/constants';
import type { Loadout } from '../../types/character';
import { CHARACTERS, DEFAULT_LOADOUT } from '../characters/CharacterData';

export interface Stats {
  races: number;
  wins: number;
  podiums: number;
  falls: number;
  coinsCollected: number;
  jumps: number;
  hammerHits: number;
  playSeconds: number;
}

export interface SaveData {
  version: 1;
  coins: number;
  xp: number; // total xp
  selectedCharacter: string;
  ownedCharacters: string[];
  ownedCosmetics: string[]; // e.g. "hat:party"
  loadout: Loadout;
  completed: string[]; // level ids
  bestTimes: Record<string, number>;
  endlessBest: number;
  survivalBest: number;
  achievements: string[];
  stats: Stats;
  lastDaily: string;
}

export const defaultStats = (): Stats => ({
  races: 0,
  wins: 0,
  podiums: 0,
  falls: 0,
  coinsCollected: 0,
  jumps: 0,
  hammerHits: 0,
  playSeconds: 0,
});

export const defaultSave = (): SaveData => ({
  version: 1,
  coins: 0,
  xp: 0,
  selectedCharacter: 'jelly',
  ownedCharacters: ['jelly', 'wobbler'],
  ownedCosmetics: [],
  loadout: { ...DEFAULT_LOADOUT },
  completed: [],
  bestTimes: {},
  endlessBest: 0,
  survivalBest: 0,
  achievements: [],
  stats: defaultStats(),
  lastDaily: '',
});

const isStr = (v: unknown): v is string => typeof v === 'string';
const nonNegNum = (v: unknown, fallback = 0) =>
  typeof v === 'number' && isFinite(v) && v >= 0 ? v : fallback;
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isStr) : []);

/** Validate untrusted/old save data; every field falls back to a safe default. */
export function validateSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, any>;

  const ownedCharacters = strArray(r.ownedCharacters).filter((id) => CHARACTERS.some((c) => c.id === id));
  for (const free of d.ownedCharacters) if (!ownedCharacters.includes(free)) ownedCharacters.push(free);

  const selected =
    isStr(r.selectedCharacter) && ownedCharacters.includes(r.selectedCharacter)
      ? r.selectedCharacter
      : d.selectedCharacter;

  const lo = r.loadout && typeof r.loadout === 'object' ? r.loadout : {};
  const loadout: Loadout = {
    hat: isStr(lo.hat) ? (lo.hat as Loadout['hat']) : 'none',
    glasses: isStr(lo.glasses) ? (lo.glasses as Loadout['glasses']) : 'none',
    accessory: isStr(lo.accessory) ? (lo.accessory as Loadout['accessory']) : 'none',
    skin: isStr(lo.skin) ? (lo.skin as Loadout['skin']) : 'classic',
    tint: isStr(lo.tint) && /^#[0-9a-fA-F]{6}$/.test(lo.tint) ? lo.tint : null,
  };

  const bestTimes: Record<string, number> = {};
  if (r.bestTimes && typeof r.bestTimes === 'object') {
    for (const [k, v] of Object.entries(r.bestTimes)) {
      if (typeof v === 'number' && isFinite(v) && v > 0) bestTimes[k] = v;
    }
  }

  const st = r.stats && typeof r.stats === 'object' ? r.stats : {};
  const stats: Stats = {
    races: nonNegNum(st.races),
    wins: nonNegNum(st.wins),
    podiums: nonNegNum(st.podiums),
    falls: nonNegNum(st.falls),
    coinsCollected: nonNegNum(st.coinsCollected),
    jumps: nonNegNum(st.jumps),
    hammerHits: nonNegNum(st.hammerHits),
    playSeconds: nonNegNum(st.playSeconds),
  };

  const save: SaveData = {
    version: 1,
    coins: Math.floor(nonNegNum(r.coins)),
    xp: Math.floor(nonNegNum(r.xp)),
    selectedCharacter: selected,
    ownedCharacters,
    ownedCosmetics: strArray(r.ownedCosmetics),
    loadout,
    completed: strArray(r.completed),
    bestTimes,
    endlessBest: nonNegNum(r.endlessBest),
    survivalBest: nonNegNum(r.survivalBest),
    achievements: strArray(r.achievements),
    stats,
    lastDaily: isStr(r.lastDaily) ? r.lastDaily : '',
  };
  return save;
}

export const SaveManager = {
  load(): SaveData {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return defaultSave();
      return validateSave(JSON.parse(s));
    } catch {
      return defaultSave();
    }
  },
  save(data: SaveData) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* quota / private mode */
    }
  },
  clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  },
};
