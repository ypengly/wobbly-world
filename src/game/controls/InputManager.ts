import type { CharacterInput } from '../../types/game';
import { clamp } from '../../utils/math';

/**
 * Central input state. Keyboard and touch both write into their own slots;
 * the manager merges them every frame so neither source can clobber the other
 * (e.g. releasing a key must not cancel a held joystick).
 */
class InputManagerImpl {
  // keyboard slot (-1..1)
  private kbX = 0;
  private kbY = 0; // +1 = forward
  private kbJump = false;
  private kbSprint = false;

  // touch slot
  private joyX = 0;
  private joyY = 0; // +1 = forward
  private touchJump = false;
  private touchSprint = false;

  private jumpQueued = false;
  private prevJump = false;

  enabled = true;

  setKeyboard(x: number, y: number, jump: boolean, sprint: boolean) {
    this.kbX = x;
    this.kbY = y;
    this.kbJump = jump;
    this.kbSprint = sprint;
  }

  setJoystick(x: number, y: number) {
    this.joyX = clamp(x, -1, 1);
    this.joyY = clamp(y, -1, 1);
  }

  setTouchJump(down: boolean) {
    this.touchJump = down;
  }

  setTouchSprint(down: boolean) {
    this.touchSprint = down;
  }

  /** Neutralise everything (pause, blur, touch cancel, tab switch…) */
  reset() {
    this.kbX = this.kbY = 0;
    this.kbJump = this.kbSprint = false;
    this.joyX = this.joyY = 0;
    this.touchJump = this.touchSprint = false;
    this.jumpQueued = false;
    this.prevJump = false;
  }

  resetTouch() {
    this.joyX = this.joyY = 0;
    this.touchJump = this.touchSprint = false;
  }

  /**
   * Raw intent in *screen space*: x = right, y = forward.
   * Merged and clamped to unit length so diagonals are never faster.
   */
  getRawMove() {
    if (!this.enabled) return { x: 0, y: 0 };
    let x = this.kbX + this.joyX;
    let y = this.kbY + this.joyY;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  /**
   * Build a CharacterInput. `yaw` is the camera heading so the stick is camera-relative.
   * Camera looks along -Z when yaw = 0.
   */
  read(yaw: number): CharacterInput {
    const raw = this.getRawMove();
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    // forward vector for yaw: (-sin, -cos); right vector: (cos, -sin)
    const moveX = raw.x * cos + raw.y * -sin;
    const moveZ = raw.x * -sin + raw.y * -cos;

    const jumpHeld = this.enabled && (this.kbJump || this.touchJump);
    if (jumpHeld && !this.prevJump) this.jumpQueued = true;
    this.prevJump = jumpHeld;

    const jump = this.jumpQueued;
    this.jumpQueued = false;

    return {
      moveX,
      moveZ,
      jump,
      jumpHeld,
      sprint: this.enabled && (this.kbSprint || this.touchSprint),
    };
  }
}

export const InputManager = new InputManagerImpl();
