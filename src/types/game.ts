export type Vec3 = [number, number, number];

export type GameMode = 'classic' | 'timetrial' | 'challenge' | 'endless' | 'survival';
export type ChallengeId = 'speed' | 'coins' | 'clean';
export type WorldId = 'candy' | 'lava' | 'sky' | 'toy';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type ControlSize = 'small' | 'medium' | 'large';
export type RacePhase = 'idle' | 'countdown' | 'racing' | 'finished';
export type Screen = 'menu' | 'race';
export type SurfaceType = 'normal' | 'slippery' | 'conveyor' | 'bounce';

export interface CharacterInput {
  /** Desired world-space movement direction (x/z), already camera-relative, length 0..1 */
  moveX: number;
  moveZ: number;
  jump: boolean;
  jumpHeld: boolean;
  sprint: boolean;
}

export interface RacerResult {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  finished: boolean;
  finishTime: number;
  position: number;
}

export interface RaceResults {
  levelId: string;
  mode: GameMode;
  position: number;
  total: number;
  time: number;
  coinsCollected: number;
  coinsEarned: number;
  xpEarned: number;
  personalBest: boolean;
  previousBest: number | null;
  falls: number;
  racers: RacerResult[];
  challengeLabel?: string;
  challengeSuccess?: boolean;
  distance?: number;
  hits?: number;
  newlyUnlocked: string[];
  leveledUp: boolean;
}
