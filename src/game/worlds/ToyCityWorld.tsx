import { useMemo } from 'react';
import type { InstanceSpec } from './WorldShared';
import { Instances, SkyAndLights, geo, useDecorRandom, type WorldProps } from './WorldShared';

const COLORS = ['#ff5d5d', '#ffc83d', '#4aa8ff', '#5bd68b', '#b46bff', '#ff8fd0'];

/** Chunky toy-block buildings on a green play-mat. */
export function ToyCityWorld({ level, world }: WorldProps) {
  const { rnd, zEnd, density } = useDecorRandom(level, 53);
  const { blocks, roofs, windows } = useMemo(() => {
    const blocks: InstanceSpec[] = [];
    const roofs: InstanceSpec[] = [];
    const windows: InstanceSpec[] = [];
    const n = Math.floor(Math.abs(zEnd) * 0.4 * density);
    for (let i = 0; i < n; i++) {
      const side = rnd() < 0.5 ? -1 : 1;
      const x = side * (13 + rnd() * 30);
      const z = 10 - rnd() * (Math.abs(zEnd) + 40);
      const w = 4 + rnd() * 5;
      const h = 5 + rnd() * 14;
      const c = COLORS[Math.floor(rnd() * COLORS.length)];
      blocks.push({ p: [x, -8 + h / 2, z], s: [w / 2, h / 2, w / 2], c });
      if (rnd() < 0.6) roofs.push({ p: [x, -8 + h + 1, z], s: [w * 0.45, 1.2, w * 0.45], c: '#ffffff' });
      windows.push({ p: [x, -8 + h * 0.6, z + w / 2 + 0.05], s: [w * 0.18, h * 0.12, 0.05], c: '#fff6b0' });
    }
    return { blocks, roofs, windows };
  }, [rnd, zEnd, density]);

  return (
    <>
      <SkyAndLights world={world} />
      <Instances geometry={geo.box} specs={blocks} roughness={0.55} />
      <Instances geometry={geo.cone} specs={roofs} roughness={0.5} />
      <Instances geometry={geo.box} specs={windows} emissive={0.6} />
      <mesh position={[0, -9, zEnd / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, Math.abs(zEnd) + 400]} />
        <meshStandardMaterial color="#7ad66b" roughness={0.9} />
      </mesh>
    </>
  );
}
