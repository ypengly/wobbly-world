import { create } from 'zustand';
import { SETTINGS_KEY } from '../utils/constants';
import type { ControlSize, GraphicsQuality } from '../types/game';
import { clamp } from '../utils/math';

export interface Settings {
  controlSize: ControlSize;
  joystickOpacity: number; // 0.2 - 1
  leftHanded: boolean;
  vibration: boolean;
  graphics: GraphicsQuality;
  musicVolume: number; // 0 - 1
  sfxVolume: number; // 0 - 1
  cameraDistance: number; // 6 - 14
  touchControls: 'auto' | 'on' | 'off';
  deadZone: number; // 0.05 - 0.4
}

export const defaultSettings: Settings = {
  controlSize: 'medium',
  joystickOpacity: 0.85,
  leftHanded: false,
  vibration: true,
  graphics: 'medium',
  musicVolume: 0.5,
  sfxVolume: 0.7,
  cameraDistance: 9,
  touchControls: 'auto',
  deadZone: 0.12,
};

function isCoarsePointer() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
}

function defaultGraphics(): GraphicsQuality {
  return isCoarsePointer() ? 'low' : 'medium';
}

export function validateSettings(raw: unknown): Settings {
  const d = { ...defaultSettings, graphics: defaultGraphics() };
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const num = (k: string, lo: number, hi: number, fallback: number) =>
    typeof r[k] === 'number' && isFinite(r[k] as number) ? clamp(r[k] as number, lo, hi) : fallback;
  const bool = (k: string, fallback: boolean) => (typeof r[k] === 'boolean' ? (r[k] as boolean) : fallback);
  const oneOf = <T extends string>(k: string, opts: readonly T[], fallback: T): T =>
    typeof r[k] === 'string' && (opts as readonly string[]).includes(r[k] as string) ? (r[k] as T) : fallback;
  return {
    controlSize: oneOf('controlSize', ['small', 'medium', 'large'] as const, d.controlSize),
    joystickOpacity: num('joystickOpacity', 0.2, 1, d.joystickOpacity),
    leftHanded: bool('leftHanded', d.leftHanded),
    vibration: bool('vibration', d.vibration),
    graphics: oneOf('graphics', ['low', 'medium', 'high'] as const, d.graphics),
    musicVolume: num('musicVolume', 0, 1, d.musicVolume),
    sfxVolume: num('sfxVolume', 0, 1, d.sfxVolume),
    cameraDistance: num('cameraDistance', 6, 14, d.cameraDistance),
    touchControls: oneOf('touchControls', ['auto', 'on', 'off'] as const, d.touchControls),
    deadZone: num('deadZone', 0.05, 0.4, d.deadZone),
  };
}

function load(): Settings {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    return validateSettings(s ? JSON.parse(s) : null);
  } catch {
    return validateSettings(null);
  }
}

interface SettingsStore extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),
  set: (key, value) => {
    set({ [key]: value } as Partial<SettingsStore>);
    persist(get());
  },
  reset: () => {
    const d = validateSettings(null);
    set(d);
    persist(get());
  },
}));

function persist(s: Settings) {
  try {
    const data: Settings = {
      controlSize: s.controlSize,
      joystickOpacity: s.joystickOpacity,
      leftHanded: s.leftHanded,
      vibration: s.vibration,
      graphics: s.graphics,
      musicVolume: s.musicVolume,
      sfxVolume: s.sfxVolume,
      cameraDistance: s.cameraDistance,
      touchControls: s.touchControls,
      deadZone: s.deadZone,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

/** True when the touch overlay should be visible */
export function useShowTouchControls() {
  const mode = useSettingsStore((s) => s.touchControls);
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return isCoarsePointer();
}
