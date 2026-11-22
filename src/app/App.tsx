import { useEffect, useState } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { ScreenRouter } from './router';
import { AudioManager } from '../game/systems/AudioManager';
import { useGameStore } from '../store/gameStore';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function App() {
  const [webgl] = useState(hasWebGL);
  const screen = useGameStore((s) => s.screen);

  // Audio may only start after a user gesture
  useEffect(() => {
    const unlock = () => AudioManager.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (screen === 'menu') AudioManager.playMusic('menu');
  }, [screen]);

  // Block page zoom / scroll gestures
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', prevent);
    const wheel = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault(); };
    window.addEventListener('wheel', wheel, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', prevent);
      window.removeEventListener('wheel', wheel);
    };
  }, []);

  if (!webgl) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-b from-violet-700 to-fuchsia-600 p-6 text-center text-white">
        <div className="panel max-w-md p-6 text-violet-900">
          <h1 className="text-3xl font-black">WOBBLY WORLD needs WebGL</h1>
          <p className="mt-2 font-bold">Your browser or device can't start 3D graphics. Try enabling hardware acceleration, updating your browser, or switching to Chrome, Firefox, Safari or Edge.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GameCanvas />
      <ScreenRouter />
    </div>
  );
}
