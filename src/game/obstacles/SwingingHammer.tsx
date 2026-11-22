import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { ObstacleDef } from '../../types/level';
import { registry, type Shape } from '../physics/PhysicsWorld';

type Def = Extract<ObstacleDef, { type: 'hammer' }>;

const Q = new THREE.Quaternion();
const AXIS_Z = new THREE.Vector3(0, 0, 1);

/** Giant swinging hammer. Pivot sits above the platform; the head sweeps across the lane. */
export function SwingingHammer({ def, id, color }: { def: Def; id: string; color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const L = def.length ?? 7;
  const amp = def.amp ?? 0.9;
  const phase = def.phase ?? 0;
  const [px, py, pz] = def.pos;
  const pivot = useMemo(() => new THREE.Vector3(px, py + L + 1.0, pz), [px, py, pz, L]);
  const angleAt = (t: number) => amp * Math.sin((t / def.period) * Math.PI * 2 + phase);

  useEffect(() => {
    registry.hazards.set(id, {
      id,
      knockback: 9.5,
      shapes: (t: number): Shape[] => {
        const a = angleAt(t);
        const hx = pivot.x + L * Math.sin(a);
        const hy = pivot.y - L * Math.cos(a);
        return [
          { k: 'seg', ax: hx, ay: hy, az: pivot.z - 0.4, bx: hx, by: hy, bz: pivot.z + 0.4, r: 1.15 },
          { k: 'seg', ax: pivot.x, ay: pivot.y, az: pivot.z, bx: hx, by: hy, bz: pivot.z, r: 0.3 },
        ];
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
    Q.setFromAxisAngle(AXIS_Z, angleAt(registry.time));
    b.setNextKinematicRotation({ x: Q.x, y: Q.y, z: Q.z, w: Q.w });
  });

  return (
    <>
      {/* gantry */}
      <mesh position={[pivot.x, pivot.y + 0.5, pivot.z]} castShadow>
        <boxGeometry args={[14, 0.8, 1.2]} />
        <meshStandardMaterial color="#4b4766" roughness={0.6} />
      </mesh>
      {[-6.6, 6.6].map((x) => (
        <mesh key={x} position={[pivot.x + x, (pivot.y + 0.5) / 2 + py / 2, pivot.z]} castShadow>
          <boxGeometry args={[0.8, pivot.y + 0.5 - py, 0.8]} />
          <meshStandardMaterial color="#4b4766" roughness={0.6} />
        </mesh>
      ))}
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={pivot.toArray()}>
        <CuboidCollider args={[0.22, L / 2, 0.22]} position={[0, -L / 2, 0]} friction={0} />
        <CylinderCollider args={[1.5, 1.1]} position={[0, -L, 0]} rotation={[Math.PI / 2, 0, 0]} friction={0} />
        <mesh position={[0, -L / 2, 0]} castShadow>
          <boxGeometry args={[0.45, L, 0.45]} />
          <meshStandardMaterial color="#c9c4d8" metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[0, -L, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[1.1, 1.1, 3, 20]} />
          <meshStandardMaterial color={color} roughness={0.45} emissive={color} emissiveIntensity={0.12} />
        </mesh>
        <mesh position={[0, -L, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.18, 1.18, 0.5, 20]} />
          <meshStandardMaterial color="#ffd23f" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial color="#ffd23f" />
        </mesh>
      </RigidBody>
    </>
  );
}
