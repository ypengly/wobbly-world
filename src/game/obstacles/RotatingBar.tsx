import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { ObstacleDef } from '../../types/level';
import { registry, type Shape } from '../physics/PhysicsWorld';

type Def = Extract<ObstacleDef, { type: 'bar' }>;
const Q = new THREE.Quaternion();
const AXIS_Y = new THREE.Vector3(0, 1, 0);

const BAR_Y = 0.55;

/** Sweeper bar spinning around a hub. Low enough to jump over. */
export function RotatingBar({ def, id, color }: { def: Def; id: string; color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const phase = def.phase ?? 0;
  const [px, py, pz] = def.pos;
  const half = def.length / 2;
  const angleAt = (t: number) => def.speed * t + phase;

  useEffect(() => {
    registry.hazards.set(id, {
      id,
      knockback: 7.5,
      shapes: (t: number): Shape[] => {
        const a = angleAt(t);
        const dx = Math.cos(a) * half;
        const dz = -Math.sin(a) * half;
        return [{ k: 'seg', ax: px - dx, ay: py + BAR_Y, az: pz - dz, bx: px + dx, by: py + BAR_Y, bz: pz + dz, r: 0.42 }];
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
    Q.setFromAxisAngle(AXIS_Y, angleAt(registry.time));
    b.setNextKinematicRotation({ x: Q.x, y: Q.y, z: Q.z, w: Q.w });
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[px, py + BAR_Y, pz]}>
      <CuboidCollider args={[half, 0.38, 0.38]} friction={0} />
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.38, def.length - 0.76, 6, 14]} />
        <meshStandardMaterial color={color} roughness={0.4} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {/* stripes for a clear silhouette */}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((k) => (
        <mesh key={k} position={[k * def.length * 0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.4, 0.4, 0.4, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -BAR_Y / 2, 0]}>
        <cylinderGeometry args={[0.55, 0.7, BAR_Y, 14]} />
        <meshStandardMaterial color="#3b3350" />
      </mesh>
    </RigidBody>
  );
}
