import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { InstanceSpec } from './WorldShared';
import { Instances, SkyAndLights, geo, useDecorRandom, type WorldProps } from './WorldShared';

/** Factory chimneys, pipes and gears over a glowing lava lake. */
export function LavaWorld({ level, world }: WorldProps) {
  const { rnd, zEnd, density } = useDecorRandom(level, 23);
  const lava = useRef<THREE.MeshStandardMaterial>(null);
  const { towers, pipes, gears, glow } = useMemo(() => {
    const towers: InstanceSpec[] = [];
    const pipes: InstanceSpec[] = [];
    const gears: InstanceSpec[] = [];
    const glow: InstanceSpec[] = [];
    const n = Math.floor(Math.abs(zEnd) * 0.4 * density);
    for (let i = 0; i < n; i++) {
      const side = rnd() < 0.5 ? -1 : 1;
      const x = side * (14 + rnd() * 30);
      const z = 10 - rnd() * (Math.abs(zEnd) + 40);
      const h = 8 + rnd() * 22;
      const r = 1.6 + rnd() * 2;
      towers.push({ p: [x, -8 + h / 2, z], s: [r, h / 2, r], c: rnd() < 0.5 ? '#4b3f4f' : '#5d4a46' });
      glow.push({ p: [x, -8 + h + 0.3, z], s: [r * 0.7, 0.4, r * 0.7], c: '#ff7a1f' });
      if (rnd() < 0.5) pipes.push({ p: [x - side * 4, -4 + rnd() * 6, z], s: [0.7, 5 + rnd() * 4, 0.7], r: [0, 0, Math.PI / 2], c: '#7a5a4a' });
      if (rnd() < 0.3) gears.push({ p: [x - side * 2, 2 + rnd() * 10, z + 4], s: [3, 0.5, 3], r: [Math.PI / 2, 0, 0], c: '#6b5560' });
    }
    return { towers, pipes, gears, glow };
  }, [rnd, zEnd, density]);

  useFrame((s) => {
    if (lava.current) lava.current.emissiveIntensity = 0.75 + Math.sin(s.clock.elapsedTime * 1.6) * 0.15;
  });

  return (
    <>
      <SkyAndLights world={world} sun={[-20, 40, 10]} />
      <Instances geometry={geo.cyl} specs={towers} roughness={0.8} />
      <Instances geometry={geo.cyl} specs={pipes} roughness={0.5} />
      <Instances geometry={geo.cyl} specs={gears} roughness={0.5} />
      <Instances geometry={geo.cyl} specs={glow} emissive={1} />
      <mesh position={[0, -9, zEnd / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, Math.abs(zEnd) + 400]} />
        <meshStandardMaterial ref={lava} color="#ff5a1f" emissive="#ff3b00" emissiveIntensity={0.8} roughness={0.5} />
      </mesh>
      <pointLight position={[0, -4, zEnd / 2]} color="#ff6a2a" intensity={80} distance={200} />
    </>
  );
}
