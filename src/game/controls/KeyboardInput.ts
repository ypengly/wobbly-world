import { InputManager } from './InputManager';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight',
]);

/** Attach keyboard listeners. Returns a cleanup function. */
export function attachKeyboard(onPause: () => void) {
  const down = new Set<string>();

  const sync = () => {
    const left = down.has('KeyA') || down.has('ArrowLeft');
    const right = down.has('KeyD') || down.has('ArrowRight');
    const up = down.has('KeyW') || down.has('ArrowUp');
    const backward = down.has('KeyS') || down.has('ArrowDown');
    InputManager.setKeyboard(
      (right ? 1 : 0) - (left ? 1 : 0),
      (up ? 1 : 0) - (backward ? 1 : 0),
      down.has('Space'),
      down.has('ShiftLeft') || down.has('ShiftRight'),
    );
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      if (!e.repeat) onPause();
      e.preventDefault();
      return;
    }
    if (!GAME_KEYS.has(e.code)) return;
    // stop the page from scrolling (space / arrows)
    e.preventDefault();
    down.add(e.code);
    sync();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    down.delete(e.code);
    sync();
  };

  const clear = () => {
    down.clear();
    InputManager.reset();
  };
  const onVisibility = () => {
    if (document.hidden) clear();
  };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp, { passive: false });
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', clear);
    document.removeEventListener('visibilitychange', onVisibility);
    clear();
  };
}
