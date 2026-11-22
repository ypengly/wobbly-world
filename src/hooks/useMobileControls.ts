import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';

/** Haptic feedback, respecting the vibration setting. Silently no-ops where unsupported (iOS Safari). */
export function vibrate(ms: number | number[]) {
  if (!useSettingsStore.getState().vibration) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

/** Reactive orientation info so the UI can suggest rotating the device. */
export function useOrientation() {
  const get = () => ({
    portrait: typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false,
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });
  const [o, setO] = useState(get);
  useEffect(() => {
    const on = () => setO(get());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return o;
}
