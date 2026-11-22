import { useMemo } from 'react';
import type { InstanceSpec } from './WorldShared';
import { Instances, SkyAndLights, geo, useDecorRandom, type WorldProps } from './WorldShared';

/** Floating islands and puffy clouds; the "floor" is a sea of cloud far below. */
export function SkyWorld({ level, world }: WorldProps) {
  const { rnd, zEnd, density } = useDecorRandom(level, 37);
  const { clouds, rocks, grass } = useMemo(() => {
    const clouds: InstanceSpec[] = [];
    const rocks: InstanceSpec[] = [];
    const grass: InstanceSpec[] = [];
    const n = Math.floor(Math.abs(zEnd) * 0.35 * density);
    for (let i = 0; i < n; i++) {
      const side = rnd() < 0.5 ? -1 : 1;
      const x = side * (12 + rnd() * 50);
      const z = 10 - rnd() * (Math.abs(zEnd) + 40);
      const y = -10 + rnd() * 16;
      if (rnd() < 0.6) {
        const s = 2.5 + rnd() * 4;
        for (let k = 0; k < 3; k++) clouds.push({ p: [x + (k - 1) * s * 0.9, y + (k === 1 ? 0.6 : 0), z], s: [s, s * 0.6, s], c: '#ffffff' });
      } else {
        const w = 4 + rnd() * 5;
        rocks.push({ p: [x, y - w * 0.8, z], s: [w, w, w], r: [Math.PI, 0, 0], c: '#9b8a7a' });
        grass.push({ p: [x, y + 0.1, z], s: [w, 0.5, w], c: '#7ad66b' });
      }
    }
    return { clouds, rocks, grass };
  }, [rnd, zEnd, density]);

  return (
    <>
      <SkyAndLights world={world} />
      <Instances geometry={geo.sphere} specs={clouds} roughness={1} />
      <Instances geometry={geo.cone} specs={rocks} roughness={0.9} />
      <Instances geometry={geo.cyl} specs={grass} roughness={0.8} />
      <mesh position={[0, -24, zEnd / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[500, Math.abs(zEnd) + 500]} />
        <meshStandardMaterial color="#e8f4ff" roughness={1} />
      </mesh>
    </>
  );
}
