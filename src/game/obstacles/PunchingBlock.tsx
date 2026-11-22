import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { ObstacleDef } from '../../types/level';
import { registry, type Shape } from '../physics/PhysicsWorld';
import { smoothstep } from '../../utils/math';

type Def = Extract<ObstacleDef, { type: 'punch' }>;

const HALF_H = 1.1;

/** Extension 0..1 over a cycle: rest, quick telegraph wiggle, fast punch, hold, slow retract. */
function extension(u: number) {
  if (u < 0.52) return 0;
  if (u < 0.6) return 0.04 * Math.sin((u - 0.52) * 220); // telegraph shiver (tiny)
  if (u < 0.68) return smoothstep((u - 0.6) / 0.08);
  if (u < 0.82) return 1;
  return 1 - smoothstep((u - 0.82) / 0.18);
}

/** Boxing-glove block that jabs out of a wall. */
export function PunchingBlock({ def, id, color }: { def: Def; id: string; color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const [x, topY, z] = def.pos;
  const [dx, dz] = def.dir;
  const alongX = Math.abs(dx) > 0.5;
  const hx = alongX ? 1.0 : 1.6;
  const hz = alongX ? 1.6 : 1.0;
  const phase = def.phase ?? 0;

  const posAt = (t: number) => {
    const u = ((((t + phase) / def.period) % 1) + 1) % 1;
    const e = extension(u);
    return [x + dx * def.reach * e, topY + HALF_H, z + dz * def.reach * e] as const;
  };

  useEffect(() => {
    registry.hazards.set(id, {
      id,
      knockback: 11,
      shapes: (t: number): Shape[] => {
        const p = posAt(t);
        return [{ k: 'box', x: p[0], y: p[1], z: p[2], hx: hx + 0.05, hy: HALF_H, hz: hz + 0.05 }];
      },
    });
    return () => {
      registry.hazards.delete(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFrame(() => {
    const b = body.current;
    if (!b) return;
    const p = posAt(registry.time);
    b.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
  });

  const start = posAt(0);
  const yaw = Math.atan2(dx, dz);
  return (
    <>
      {/* static housing in the wall */}
      <mesh position={[x - dx * 1.4, topY + 1.2, z - dz * 1.4]} castShadow>
        <boxGeometry args={[alongX ? 1.2 : 4, 2.6, alongX ? 4 : 1.2]} />
        <meshStandardMaterial color="#3b3350" roughness={0.6} />
      </mesh>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[start[0], start[1], start[2]]}>
        <CuboidCollider args={[hx, HALF_H, hz]} friction={0} />
        <group rotation={[0, yaw, 0]}>
          <mesh castShadow>
            <boxGeometry args={[3.2, HALF_H * 2, 2]} />
            <meshStandardMaterial color={color} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0, 1.1]} castShadow>
            <sphereGeometry args={[1.05, 16, 12]} />
            <meshStandardMaterial color="#ffd23f" roughness={0.4} />
          </mesh>
        </group>
      </RigidBody>
    </>
  );
}
