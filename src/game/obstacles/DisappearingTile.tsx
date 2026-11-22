import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { ObstacleDef } from '../../types/level';
import { registry } from '../physics/PhysicsWorld';

type Def = Extract<ObstacleDef, { type: 'tile' }>;

/** Tile that blinks, vanishes and returns on a fixed cycle (deterministic, so fair and learnable). */
export function DisappearingTile({ def, id, color }: { def: Def; id: string; color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const [x, topY, z] = def.pos;
  const [sx, sy, sz] = def.size;
  const cycle = def.on + def.off;
  const phase = def.phase ?? 0;
  const isOn = (t: number) => (((t + phase) % cycle) + cycle) % cycle < def.on;
  const timeInCycle = (t: number) => (((t + phase) % cycle) + cycle) % cycle;

  useEffect(() => {
    registry.softGrounds.set(id, {
      id,
      kind: 'tile',
      footprint: (t) => (isOn(t) ? { x, z, hx: sx / 2, hz: sz / 2, y: topY } : null),
      sweep: { x, z, hx: sx / 2, hz: sz / 2, y: topY },
    });
    return () => {
      registry.softGrounds.delete(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFrame(() => {
    const b = body.current;
    if (!b) return;
    const t = registry.time;
    const on = isOn(t);
    const c = timeInCycle(t);
    b.setNextKinematicTranslation({ x, y: on ? topY - sy / 2 : -200, z });
    const warning = on && c > def.on - 0.9;
    if (mat.current) {
      const blink = warning ? (Math.sin(t * 26) > 0 ? 1 : 0) : 0;
      mat.current.emissive.set(blink ? '#ff3b3b' : '#000000');
      mat.current.emissiveIntensity = blink ? 0.7 : 0;
      mat.current.opacity = on ? 1 : 0;
    }
    if (group.current) group.current.visible = on || c < def.on + 0.35;
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[x, topY - sy / 2, z]}>
      <CuboidCollider args={[sx / 2, sy / 2, sz / 2]} friction={0} />
      <group ref={group}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[sx, sy, sz]} />
          <meshStandardMaterial ref={mat} color={color} roughness={0.5} transparent />
        </mesh>
        <mesh position={[0, sy / 2 + 0.02, 0]}>
          <boxGeometry args={[sx * 0.85, 0.05, sz * 0.85]} />
          <meshStandardMaterial color="#fff" roughness={0.6} />
        </mesh>
      </group>
    </RigidBody>
  );
}
