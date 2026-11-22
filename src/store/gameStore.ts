import { create } from 'zustand';
import type { ChallengeId, GameMode, RacePhase, RaceResults, Screen, WorldId } from '../types/game';

export interface OpponentHud {
  id: string;
  color: string;
  progress: number;
  isPlayer: boolean;
}

export interface HudState {
  time: number;
  position: number;
  total: number;
  progress: number;
  opponents: OpponentHud[];
  coins: number;
  totalCoins: number;
  countdown: number | null; // 3,2,1,0 (GO) or null
  stamina: number;
  lives: number | null;
  distance: number;
  objective: string | null;
  speed: number;
}

export const initialHud: HudState = {
  time: 0,
  position: 1,
  total: 1,
  progress: 0,
  opponents: [],
  coins: 0,
  totalCoins: 0,
  countdown: null,
  stamina: 1,
  lives: null,
  distance: 0,
  objective: null,
  speed: 0,
};

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

interface GameStore {
  screen: Screen;
  mode: GameMode;
  levelId: string;
  worldId: WorldId;
  challenge: ChallengeId;
  /** bump to remount the whole race (restart) */
  raceKey: number;
  phase: RacePhase;
  paused: boolean;
  hud: HudState;
  toast: Toast | null;
  results: RaceResults | null;
  loading: boolean;
  portraitHintDismissed: boolean;

  setSelection: (p: { mode?: GameMode; levelId?: string; worldId?: WorldId; challenge?: ChallengeId }) => void;
  startRace: (levelId?: string, mode?: GameMode, challenge?: ChallengeId) => void;
  restartRace: () => void;
  quitToMenu: () => void;
  setPaused: (p: boolean) => void;
  setPhase: (p: RacePhase) => void;
  setHud: (h: Partial<HudState>) => void;
  showToast: (text: string, tone?: Toast['tone']) => void;
  setResults: (r: RaceResults | null) => void;
  setLoading: (v: boolean) => void;
  dismissPortraitHint: () => void;
}

let toastId = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'menu',
  mode: 'classic',
  levelId: 'candy-01',
  worldId: 'candy',
  challenge: 'speed',
  raceKey: 0,
  phase: 'idle',
  paused: false,
  hud: initialHud,
  toast: null,
  results: null,
  loading: false,
  portraitHintDismissed: false,

  setSelection: (p) => set(p),

  startRace: (levelId, mode, challenge) =>
    set((s) => ({
      screen: 'race',
      levelId: levelId ?? s.levelId,
      mode: mode ?? s.mode,
      challenge: challenge ?? s.challenge,
      raceKey: s.raceKey + 1,
      phase: 'idle',
      paused: false,
      results: null,
      hud: { ...initialHud },
      toast: null,
      loading: true,
    })),

  restartRace: () =>
    set((s) => ({
      raceKey: s.raceKey + 1,
      phase: 'idle',
      paused: false,
      results: null,
      hud: { ...initialHud },
      toast: null,
      loading: true,
    })),

  quitToMenu: () =>
    set({ screen: 'menu', phase: 'idle', paused: false, results: null, hud: { ...initialHud }, toast: null, loading: false }),

  setPaused: (paused) => {
    if (get().screen !== 'race') return;
    if (paused && get().phase === 'finished') return;
    set({ paused });
  },
  setPhase: (phase) => set({ phase }),
  setHud: (h) => set((s) => ({ hud: { ...s.hud, ...h } })),
  showToast: (text, tone = 'info') => set({ toast: { id: ++toastId, text, tone } }),
  setResults: (results) => set({ results }),
  setLoading: (loading) => set({ loading }),
  dismissPortraitHint: () => set({ portraitHintDismissed: true }),
}));
