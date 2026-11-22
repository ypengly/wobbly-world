import { useMemo } from 'react';
import type { InstanceSpec } from './WorldShared';
import { Instances, SkyAndLights, geo, useDecorRandom, type WorldProps } from './WorldShared';

const COLORS = ['#ff7ab8', '#6bc8ff', '#ffd45e', '#8be08b', '#c79bff', '#ffffff'];

/** Pink & blue sweets: lollipops, candy canes, gumdrops and a sticky syrup sea. */
export function CandyWorld({ level, world }: WorldProps) {
  const { rnd, zEnd, density } = useDecorRandom(level, 11);
  const { sticks, tops, drops } = useMemo(() => {
    const sticks: InstanceSpec[] = [];
    const tops: InstanceSpec[] = [];
    const drops: InstanceSpec[] = [];
    const n = Math.floor(Math.abs(zEnd) * 0.5 * density);
    for (let i = 0; i < n; i++) {
      const side = rnd() < 0.5 ? -1 : 1;
      const x = side * (13 + rnd() * 34);
      const z = 10 - rnd() * (Math.abs(zEnd) + 40);
      const c = COLORS[Math.floor(rnd() * COLORS.length)];
      const h = 4 + rnd() * 9;
      const base = -4 - rnd() * 3;
      if (rnd() < 0.55) {
        sticks.push({ p: [x, base + h / 2, z], s: [0.35, h / 2, 0.35], c: '#ffffff' });
        tops.push({ p: [x, base + h + 1.2, z], s: [2 + rnd() * 1.5, 2 + rnd() * 1.5, 0.6], c });
      } else {
        drops.push({ p: [x, base + 1.5, z], s: [2 + rnd() * 2.5, 2.5 + rnd() * 3, 2 + rnd() * 2.5], c });
      }
    }
    return { sticks, tops, drops };
  }, [rnd, zEnd, density]);

  return (
    <>
      <SkyAndLights world={world} />
      <Instances geometry={geo.cyl} specs={sticks} />
      <Instances geometry={geo.sphere} specs={tops} roughness={0.35} />
      <Instances geometry={geo.sphere} specs={drops} roughness={0.3} />
      {/* syrup sea */}
      <mesh position={[0, -9, zEnd / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, Math.abs(zEnd) + 400]} />
        <meshStandardMaterial color="#ff9ccf" roughness={0.25} metalness={0.05} />
      </mesh>
    </>
  );
}
