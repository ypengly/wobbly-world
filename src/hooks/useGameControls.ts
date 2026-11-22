import { useEffect } from 'react';
import { attachKeyboard } from '../game/controls/KeyboardInput';
import { InputManager } from '../game/controls/InputManager';
import { useGameStore } from '../store/gameStore';

/** Attach keyboard + housekeeping while a race screen is mounted. */
export function useGameControls() {
  useEffect(() => {
    const detach = attachKeyboard(() => {
      const s = useGameStore.getState();
      if (s.screen !== 'race' || s.phase === 'finished') return;
      s.setPaused(!s.paused);
    });
    return detach;
  }, []);

  // Pause automatically when the tab is hidden; neutralise input
  useEffect(() => {
    const onHide = () => {
      InputManager.reset();
      const s = useGameStore.getState();
      if (document.hidden && s.screen === 'race' && s.phase !== 'finished') s.setPaused(true);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  // Disable input while paused
  const paused = useGameStore((s) => s.paused);
  useEffect(() => {
    InputManager.enabled = !paused;
    if (paused) InputManager.reset();
    return () => {
      InputManager.enabled = true;
    };
  }, [paused]);
}
