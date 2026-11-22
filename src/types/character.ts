export type CharacterShape = 'blob' | 'bean' | 'alien' | 'duck' | 'monster' | 'robot' | 'slime' | 'wobbler';

export interface CharacterDef {
  id: string;
  name: string;
  color: string;
  accent: string;
  shape: CharacterShape;
  cost: number; // 0 = free from the start
  blurb: string;
}

export type HatId = 'none' | 'party' | 'tophat' | 'crown' | 'propeller';
export type GlassesId = 'none' | 'round' | 'shades' | 'star';
export type AccessoryId = 'none' | 'bowtie' | 'scarf' | 'cape';
export type SkinId = 'classic' | 'gold' | 'ice' | 'candy' | 'galaxy';

export interface CosmeticDef<T extends string> {
  id: T;
  name: string;
  cost: number;
}

export interface Loadout {
  hat: HatId;
  glasses: GlassesId;
  accessory: AccessoryId;
  skin: SkinId;
  tint: string | null; // custom color override
}

export interface AnimState {
  /** horizontal speed in units/s */
  speed: number;
  /** vertical velocity */
  vy: number;
  grounded: boolean;
  /** seconds remaining in stumble */
  stumble: number;
  /** seconds remaining in recover pop */
  recover: number;
  /** seconds since landing (for squash) */
  landed: number;
  victory: boolean;
  /** world-space heading in radians (rotation around Y) */
  heading: number;
}

export function createAnimState(): AnimState {
  return {
    speed: 0,
    vy: 0,
    grounded: true,
    stumble: 0,
    recover: 0,
    landed: 10,
    victory: false,
    heading: 0,
  };
}
