import { MOVE } from '../GameConfig';
import type { CharacterInput } from '../../types/game';
import type { GroundInfo } from '../physics/CollisionManager';
import { approachVector2, normalizeInput } from '../physics/MovementController';

export interface ControllerOutput {
  vx: number;
  vy: number; // vertical velocity to apply (= current vy unless a jump/bounce occurred)
  vz: number;
  jumped: boolean;
  landed: boolean;
  landImpact: number;
  bounced: boolean;
  sprinting: boolean;
  moving: boolean;
}

/**
 * Stateful character controller shared by the player and AI.
 * It never touches Three.js or Rapier directly: feed it velocity + ground info, apply its output.
 * Cosmetics never influence any value here.
 */
export class CharacterController {
  stamina = 1;
  sprintLocked = false;
  stun = 0;
  invuln = 0;

  private coyote = 0;
  private buffer = 0;
  private wasGrounded = true;
  private cutApplied = false;
  private jumping = false;
  /** horizontal velocity we are tracking (includes platform motion) */
  private vx = 0;
  private vz = 0;
  private prevVy = 0;
  speedScale = 1;

  reset(vx = 0, vz = 0) {
    this.vx = vx;
    this.vz = vz;
    this.stun = 0;
    this.coyote = 0;
    this.buffer = 0;
    this.jumping = false;
    this.cutApplied = false;
    this.invuln = MOVE.respawnInvuln;
    this.stamina = 1;
    this.sprintLocked = false;
  }

  /** Apply a knockback impulse; returns the new velocity to push to the body. */
  knockback(nx: number, nz: number, strength: number) {
    this.vx = nx * strength;
    this.vz = nz * strength;
    this.stun = MOVE.stumbleTime;
    this.invuln = MOVE.stumbleTime + 0.4;
    this.jumping = false;
    return { vx: this.vx, vz: this.vz, vy: 6.5 };
  }

  update(dt: number, input: CharacterInput, curVy: number, ground: GroundInfo): ControllerOutput {
    const grounded = ground.grounded && curVy < 2.5;
    const surf = ground.surface;
    const surfaceType = surf?.type ?? 'normal';

    this.stun = Math.max(0, this.stun - dt);
    this.invuln = Math.max(0, this.invuln - dt);

    // --- coyote / jump buffer -------------------------------------------------
    if (grounded) {
      this.coyote = MOVE.coyoteTime;
      this.jumping = false;
      this.cutApplied = false;
    } else this.coyote = Math.max(0, this.coyote - dt);
    this.buffer = input.jump ? MOVE.jumpBuffer : Math.max(0, this.buffer - dt);

    // --- sprint with stamina/cooldown ----------------------------------------
    const [ix, iz, mag] = normalizeInput(input.moveX, input.moveZ);
    const moving = mag > 0.05;
    if (this.sprintLocked && this.stamina >= MOVE.staminaMinToSprint) this.sprintLocked = false;
    const sprinting = input.sprint && moving && !this.sprintLocked && this.stamina > 0 && this.stun <= 0;
    if (sprinting) {
      this.stamina -= MOVE.staminaDrain * dt;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.sprintLocked = true;
      }
    } else {
      this.stamina = Math.min(1, this.stamina + MOVE.staminaRegen * dt * (grounded ? 1.4 : 0.6));
    }

    // --- horizontal velocity --------------------------------------------------
    const control = this.stun > 0 ? MOVE.stumbleControl : 1;
    const maxSpeed = (sprinting ? MOVE.sprintSpeed : MOVE.walkSpeed) * this.speedScale;
    let tx = ix * mag * maxSpeed * control;
    let tz = iz * mag * maxSpeed * control;

    // riders inherit platform + conveyor motion
    if (grounded && surf) {
      tx += surf.vx;
      tz += surf.vz;
      if (surf.type === 'conveyor' && surf.dir) {
        tx += surf.dir[0] * (surf.speed ?? 3);
        tz += surf.dir[1] * (surf.speed ?? 3);
      }
    }

    let accel: number;
    let decel: number;
    if (!grounded) {
      accel = MOVE.airAccel;
      decel = MOVE.airDecel;
    } else if (surfaceType === 'slippery') {
      accel = MOVE.slipAccel;
      decel = MOVE.slipDecel;
    } else {
      accel = MOVE.groundAccel;
      decel = MOVE.groundDecel;
    }
    // while stunned slow the *decay* of the knockback so it feels punchy
    if (this.stun > 0) {
      accel = 6;
      decel = 7;
    }
    [this.vx, this.vz] = approachVector2(this.vx, this.vz, tx, tz, moving ? accel : decel, dt);

    // --- vertical: jump / bounce / variable jump height ----------------------
    let vy = curVy;
    let jumped = false;
    let bounced = false;
    if (this.buffer > 0 && this.coyote > 0 && this.stun < MOVE.stumbleTime * 0.6) {
      vy = MOVE.jumpVelocity;
      this.buffer = 0;
      this.coyote = 0;
      this.jumping = true;
      this.cutApplied = false;
      jumped = true;
    } else if (grounded && surfaceType === 'bounce' && this.prevVy <= 0.5) {
      vy = MOVE.bounceVelocity;
      bounced = true;
      this.coyote = 0;
    }
    if (this.jumping && !input.jumpHeld && vy > 4.5 && !this.cutApplied) {
      vy *= 0.55; // short hop when the button is released early
      this.cutApplied = true;
    }

    // --- landing ---------------------------------------------------------------
    const landed = grounded && !this.wasGrounded && this.prevVy < -4;
    const landImpact = landed ? -this.prevVy : 0;
    this.wasGrounded = grounded;
    this.prevVy = vy;

    return { vx: this.vx, vy, vz: this.vz, jumped, landed, landImpact, bounced, sprinting, moving };
  }

  /** Sync tracked horizontal velocity with the body after external pushes (collisions with other racers). */
  syncHorizontal(vx: number, vz: number) {
    // Only adopt external velocity if it differs meaningfully (a bump), keeping control otherwise smooth
    if (Math.hypot(vx - this.vx, vz - this.vz) > 4) {
      this.vx = vx;
      this.vz = vz;
    }
  }
}
