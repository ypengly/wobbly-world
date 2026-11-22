import { create } from 'zustand';
import { SaveManager, defaultSave, type SaveData, type Stats } from '../game/systems/SaveManager';
import type { Loadout } from '../types/character';
import { CHARACTERS, ACCESSORIES, GLASSES, HATS, SKINS } from '../game/characters/CharacterData';
import { xpForLevel, DAILY_REWARD_COINS } from '../utils/constants';

/** Convert total XP into level + progress */
export function levelFromXp(totalXp: number) {
  let level = 1;
  let xp = totalXp;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
  }
  return { level, xpIntoLevel: xp, xpNeeded: xpForLevel(level) };
}

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type CosmeticKind = 'hat' | 'glasses' | 'accessory' | 'skin';

interface PlayerStore extends SaveData {
  addCoins: (n: number) => void;
  addXp: (n: number) => { leveledUp: boolean; level: number };
  selectCharacter: (id: string) => void;
  buyCharacter: (id: string) => boolean;
  buyCosmetic: (kind: CosmeticKind, id: string) => boolean;
  ownsCosmetic: (kind: CosmeticKind, id: string) => boolean;
  equip: (kind: CosmeticKind, id: string) => void;
  setTint: (tint: string | null) => void;
  markCompleted: (levelId: string) => void;
  recordBestTime: (levelId: string, time: number) => boolean;
  recordDistance: (mode: 'endless' | 'survival', distance: number) => boolean;
  unlockAchievement: (id: string) => boolean;
  addStats: (partial: Partial<Stats>) => void;
  canClaimDaily: () => boolean;
  claimDaily: () => boolean;
  resetProgress: () => void;
}

const pick = (s: PlayerStore): SaveData => ({
  version: 1,
  coins: s.coins,
  xp: s.xp,
  selectedCharacter: s.selectedCharacter,
  ownedCharacters: s.ownedCharacters,
  ownedCosmetics: s.ownedCosmetics,
  loadout: s.loadout,
  completed: s.completed,
  bestTimes: s.bestTimes,
  endlessBest: s.endlessBest,
  survivalBest: s.survivalBest,
  achievements: s.achievements,
  stats: s.stats,
  lastDaily: s.lastDaily,
});

const costOf = (kind: CosmeticKind, id: string) => {
  const list = kind === 'hat' ? HATS : kind === 'glasses' ? GLASSES : kind === 'accessory' ? ACCESSORIES : SKINS;
  return list.find((c) => c.id === id)?.cost ?? Infinity;
};

export const usePlayerStore = create<PlayerStore>((set, get) => {
  const commit = (partial: Partial<SaveData>) => {
    set(partial as Partial<PlayerStore>);
    SaveManager.save(pick(get()));
  };

  return {
    ...SaveManager.load(),

    addCoins: (n) => commit({ coins: Math.max(0, get().coins + Math.floor(n)) }),

    addXp: (n) => {
      const before = levelFromXp(get().xp).level;
      const xp = get().xp + Math.max(0, Math.floor(n));
      const after = levelFromXp(xp).level;
      const bonus = (after - before) * 25; // level-up coin bonus
      commit({ xp, coins: get().coins + bonus });
      return { leveledUp: after > before, level: after };
    },

    selectCharacter: (id) => {
      if (get().ownedCharacters.includes(id)) commit({ selectedCharacter: id });
    },

    buyCharacter: (id) => {
      const c = CHARACTERS.find((x) => x.id === id);
      const s = get();
      if (!c || s.ownedCharacters.includes(id) || s.coins < c.cost) return false;
      commit({ coins: s.coins - c.cost, ownedCharacters: [...s.ownedCharacters, id], selectedCharacter: id });
      return true;
    },

    ownsCosmetic: (kind, id) => {
      if (costOf(kind, id) === 0) return true;
      return get().ownedCosmetics.includes(`${kind}:${id}`);
    },

    buyCosmetic: (kind, id) => {
      const s = get();
      const cost = costOf(kind, id);
      if (!isFinite(cost) || s.ownedCosmetics.includes(`${kind}:${id}`) || s.coins < cost) return false;
      commit({
        coins: s.coins - cost,
        ownedCosmetics: [...s.ownedCosmetics, `${kind}:${id}`],
        loadout: { ...s.loadout, [kind]: id } as Loadout,
      });
      return true;
    },

    equip: (kind, id) => {
      if (!get().ownsCosmetic(kind, id)) return;
      commit({ loadout: { ...get().loadout, [kind]: id } as Loadout });
    },

    setTint: (tint) => commit({ loadout: { ...get().loadout, tint } }),

    markCompleted: (levelId) => {
      if (!get().completed.includes(levelId)) commit({ completed: [...get().completed, levelId] });
    },

    recordBestTime: (levelId, time) => {
      const prev = get().bestTimes[levelId];
      if (prev === undefined || time < prev) {
        commit({ bestTimes: { ...get().bestTimes, [levelId]: time } });
        return true;
      }
      return false;
    },

    recordDistance: (mode, distance) => {
      const key = mode === 'endless' ? 'endlessBest' : 'survivalBest';
      if (distance > get()[key]) {
        commit({ [key]: distance } as Partial<SaveData>);
        return true;
      }
      return false;
    },

    unlockAchievement: (id) => {
      if (get().achievements.includes(id)) return false;
      commit({ achievements: [...get().achievements, id] });
      return true;
    },

    addStats: (partial) => {
      const cur = get().stats;
      const next: Stats = { ...cur };
      for (const k of Object.keys(partial) as (keyof Stats)[]) next[k] = cur[k] + (partial[k] ?? 0);
      commit({ stats: next });
    },

    canClaimDaily: () => get().lastDaily !== todayKey(),

    claimDaily: () => {
      if (get().lastDaily === todayKey()) return false;
      commit({ lastDaily: todayKey(), coins: get().coins + DAILY_REWARD_COINS });
      return true;
    },

    resetProgress: () => {
      SaveManager.clear();
      set(defaultSave() as Partial<PlayerStore>);
      SaveManager.save(defaultSave());
    },
  };
});
