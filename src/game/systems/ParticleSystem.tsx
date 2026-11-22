import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fx, type FxKind } from './Effects';
import { QUALITY } from '../GameConfig';
import { useSettingsStore } from '../../store/settingsStore';
import { useGameStore } from '../../store/gameStore';

interface P {
  alive: boolean;
  life: number;
  max: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number;
  g: number;
  grow: number;
}

const PALETTE: Record<FxKind, string[]> = {
  dust: ['#f3ead8', '#ffffff'],
  impact: ['#ffffff', '#ffe14d', '#ff9f1c'],
  coin: ['#ffd23f', '#fff3a0'],
  checkpoint: ['#3dff9a', '#b8ffd9'],
  confetti: ['#ff5fa2', '#ffd23f', '#3ddbb0', '#46b6ff', '#b46bff'],
  spark: ['#ffffff', '#9bf0ff', '#ffe14d'],
};

/** Pooled instanced particles. Budget scales with the graphics setting. */
export function ParticleSystem() {
  const quality = useSettingsStore((s) => s.graphics);
  const max = QUALITY[quality].particles;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const pool = useMemo<P[]>(
    () => Array.from({ length: max }, () => ({ alive: false, life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0.2, g: 0, grow: 0 })),
    [max],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);
  const cursor = useRef(0);

  const spawn = (kind: FxKind, x: number, y: number, z: number) => {
    const p = pool[cursor.current++ % pool.length];
    p.alive = true;
    const pal = PALETTE[kind];
    const c = pal[Math.floor(Math.random() * pal.length)];
    const m = mesh.current!;
    const idx = pool.indexOf(p);
    m.setColorAt(idx, col.set(c));
    p.x = x; p.y = y; p.z = z;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random();
    switch (kind) {
      case 'dust': p.vx = Math.cos(a) * 1.6 * r; p.vz = Math.sin(a) * 1.6 * r; p.vy = 0.6 + Math.random(); p.g = -1; p.size = 0.22; p.max = p.life = 0.5; p.grow = 1.5; break;
      case 'impact': p.vx = Math.cos(a) * 6 * r; p.vz = Math.sin(a) * 6 * r; p.vy = 2 + Math.random() * 5; p.g = 14; p.size = 0.22; p.max = p.life = 0.6; p.grow = -0.2; break;
      case 'coin': p.vx = Math.cos(a) * 3; p.vz = Math.sin(a) * 3; p.vy = 2 + Math.random() * 3; p.g = 10; p.size = 0.14; p.max = p.life = 0.5; p.grow = -0.2; break;
      case 'checkpoint': p.vx = Math.cos(a) * 3.5 * r; p.vz = Math.sin(a) * 3.5 * r; p.vy = 3 + Math.random() * 4; p.g = 2; p.size = 0.2; p.max = p.life = 1.1; p.grow = -0.1; break;
      case 'confetti': p.vx = Math.cos(a) * 5 * r; p.vz = Math.sin(a) * 5 * r; p.vy = 6 + Math.random() * 7; p.g = 9; p.size = 0.2; p.max = p.life = 2.2; p.grow = 0; break;
      default: p.vx = Math.cos(a) * 2.5 * r; p.vz = Math.sin(a) * 2.5 * r; p.vy = 1 + Math.random() * 3; p.g = 4; p.size = 0.15; p.max = p.life = 0.5; p.grow = -0.2;
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  };

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    if (useGameStore.getState().paused) return;
    const dt = Math.min(delta, 1 / 30);
    fx.particleBudget = max;
    while (fx.queue.length) {
      const q = fx.queue.shift()!;
      const n = Math.min(q.count, Math.max(2, Math.floor(max / 12)));
      for (let i = 0; i < n; i++) spawn(q.kind, q.x, q.y, q.z);
    }
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.alive) {
        dummy.scale.setScalar(0.0001);
        dummy.position.set(0, -999, 0);
      } else {
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          dummy.scale.setScalar(0.0001);
        } else {
          p.vy -= p.g * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          const k = p.life / p.max;
          const s = Math.max(0.01, (p.size + p.grow * (1 - k) * p.size) * (k < 0.3 ? k / 0.3 : 1));
          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.setScalar(s * 1.3);
        }
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh key={max} ref={mesh} args={[undefined, undefined, max]} frustumCulled={false}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshBasicMaterial color="#ffffff" />
    </instancedMesh>
  );
}
