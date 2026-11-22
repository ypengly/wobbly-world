import type { GraphicsQuality } from '../types/game';

/** Tuning for the character controller. Cosmetics never touch these values. */
export const MOVE = {
  walkSpeed: 7.2,
  sprintSpeed: 10.8,
  groundAccel: 55,
  groundDecel: 70,
  airAccel: 24,
  airDecel: 4,
  slipAccel: 6,
  slipDecel: 1.6,
  jumpVelocity: 10.4,
  bounceVelocity: 24,
  coyoteTime: 0.12,
  jumpBuffer: 0.14,
  stumbleTime: 0.7,
  stumbleControl: 0.15,
  staminaDrain: 0.45,
  staminaRegen: 0.3,
  staminaMinToSprint: 0.2,
  capsuleHalfHeight: 0.32,
  capsuleRadius: 0.5,
  respawnInvuln: 1.2,
};

export interface QualityProfile {
  pixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  particles: number;
  antialias: boolean;
  decorations: number; // multiplier 0..1
}

export const QUALITY: Record<GraphicsQuality, QualityProfile> = {
  low: { pixelRatio: 1, shadows: false, shadowMapSize: 512, particles: 60, antialias: false, decorations: 0.35 },
  medium: { pixelRatio: 1.5, shadows: true, shadowMapSize: 1024, particles: 160, antialias: true, decorations: 0.7 },
  high: { pixelRatio: 2, shadows: true, shadowMapSize: 2048, particles: 320, antialias: true, decorations: 1 },
};

export const COUNTDOWN_SECONDS = 3;
export const AI_COUNT = 6;

export const REWARDS = {
  coinValue: 1,
  finishBonus: 20,
  positionBonus: [50, 35, 25, 15, 10, 5, 5, 5],
  xpFinish: 25,
  xpPosition: [60, 45, 35, 25, 18, 12, 10, 8],
  xpPerCoin: 1,
  challengeBonus: 40,
  timeTrialBonus: 15,
};
