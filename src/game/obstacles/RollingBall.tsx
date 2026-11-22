import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { ObstacleDef } from '../../types/level';
import { registry, type Shape } from '../physics/PhysicsWorld';
import { lerp, pingPong } from '../../utils/math';

type Def = Extract<ObstacleDef, { type: 'ball' }>;

/** Giant toy ball rolling back and forth across the lane (deterministic path so AI can read it). */
export function RollingBall({ def, id, color }: { def: Def; id: string; color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const prev = useRef<[number, number, number] | null>(null);
  const r = def.radius;

  const at = useMemo(() => {
    const [fx, fy, fz] = def.from;
    const [tx, ty, tz] = def.to;
    return (t: number): [number, number, number] => {
      const k = pingPong(t + (def.phase ?? 0), def.period);
      return [lerp(fx, tx, k), lerp(fy, ty, k) + r, lerp(fz, tz, k)];
    };
  }, [def, r]);
  const start = at(0);

  useEffect(() => {
    registry.hazards.set(id, {
      id,
      knockback: 8.5,
      shapes: (t: number): Shape[] => {
        const p = at(t);
        return [{ k: 'sphere', x: p[0], y: p[1], z: p[2], r: r + 0.05 }];
      },
    });
    return () => {
      registry.hazards.delete(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const q = useMemo(() => new THREE.Quaternion(), []);
  const axis = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const b = body.current;
    if (!b) return;
    const p = at(registry.time);
    b.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
    const m = mesh.current;
    if (m && prev.current) {
      const dx = p[0] - prev.current[0];
      const dz = p[2] - prev.current[2];
      const dist = Math.hypot(dx, dz);
      if (dist > 1e-5) {
        // roll around the axis perpendicular to travel
        axis.set(dz, 0, -dx).normalize();
        q.setFromAxisAngle(axis, dist / r);
        m.quaternion.premultiply(q);
      }
    }
    prev.current = p;
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={start}>
      <BallCollider args={[r]} friction={0} />
      <mesh ref={mesh} castShadow>
        <sphereGeometry args={[r, 24, 18]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      {/* beach-ball stripes (children of the rolling mesh would rotate; this keeps it simple & readable) */}
      <mesh castShadow>
        <sphereGeometry args={[r * 1.005, 24, 18, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.35} />
      </mesh>
    </RigidBody>
  );
}
