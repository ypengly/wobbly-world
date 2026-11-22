import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { QUALITY } from './GameConfig';
import { RaceScene } from './RaceScene';
import { MenuScene } from './MenuScene';

/** The single WebGL canvas. Menu preview and race share it so transitions stay smooth. */
export function GameCanvas() {
  const screen = useGameStore((s) => s.screen);
  const quality = useSettingsStore((s) => s.graphics);
  const q = QUALITY[quality];
  const [factor, setFactor] = useState(1);
  const maxDpr = Math.max(1, Math.min(q.pixelRatio, (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1));

  return (
    <Canvas
      key={`${quality}`}
      shadows={q.shadows}
      dpr={Math.max(0.75, maxDpr * factor)}
      gl={{ antialias: q.antialias, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 55, near: 0.1, far: 600, position: [0, 4, 10] }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
      }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setFactor((f) => Math.max(0.6, f - 0.2))}
        onIncline={() => setFactor((f) => Math.min(1, f + 0.1))}
      />
      <Suspense fallback={null}>{screen === 'race' ? <RaceScene /> : <MenuScene />}</Suspense>
    </Canvas>
  );
}
