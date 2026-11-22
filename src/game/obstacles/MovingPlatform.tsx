import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { ObstacleDef } from '../../types/level';
import { registry, type Shape, type SurfaceInfo } from '../physics/PhysicsWorld';
import { lerp, pingPong } from '../../utils/math';

type MoverDef = Extract<ObstacleDef, { type: 'mover' }>;
type WallDef = Extract<ObstacleDef, { type: 'wall' }>;

function usePath(def: MoverDef | WallDef) {
  return useMemo(() => {
    const [fx, fy, fz] = def.from;
    const [tx, ty, tz] = def.to;
    const hy = def.size[1] / 2;
    const at = (t: number): [number, number, number] => {
      const k = pingPong(t + (def.phase ?? 0), def.period);
      return [lerp(fx, tx, k), lerp(fy, ty, k) - hy, lerp(fz, tz, k)];
    };
    return at;
  }, [def]);
}

/**
 * Ferry platform travelling between two points. Riders inherit its velocity (see CharacterController).
 * Registered as "soft ground" so AI knows to wait for it at the edge of a gap.
 */
export function MovingPlatform({ def, id, color }: { def: MoverDef; id: string; color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const at = usePath(def);
  const info = useRef<SurfaceInfo>({ type: 'normal', vx: 0, vy: 0, vz: 0 });
  const [sx, sy, sz] = def.size;
  const start = at(0);

  useEffect(() => {
    const h = body.current?.handle;
    if (h !== undefined) registry.surfaces.set(h, info.current);
    const topY = def.from[1];
    registry.softGrounds.set(id, {
      id,
      kind: 'mover',
      footprint: (t) => {
        const p = at(t);
        return { x: p[0], z: p[2], hx: sx / 2, hz: sz / 2, y: p[1] + sy / 2 };
      },
      sweep: {
        x: (def.from[0] + def.to[0]) / 2,
        z: (def.from[2] + def.to[2]) / 2,
        hx: Math.abs(def.from[0] - def.to[0]) / 2 + sx / 2,
        hz: Math.abs(def.from[2] - def.to[2]) / 2 + sz / 2,
        y: topY,
      },
    });
    return () => {
      if (h !== undefined) registry.surfaces.delete(h);
      registry.softGrounds.delete(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFrame(() => {
    const b = body.current;
    if (!b) return;
    const t = registry.time;
    const p = at(t);
    b.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
    const n = at(t + 0.02);
    info.current.vx = (n[0] - p[0]) / 0.02;
    info.current.vy = (n[1] - p[1]) / 0.02;
    info.current.vz = (n[2] - p[2]) / 0.02;
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={start}>
      <CuboidCollider args={[sx / 2, sy / 2, sz / 2]} friction={0} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0, sy / 2 + 0.02, 0]}>
        <boxGeometry args={[sx * 0.85, 0.06, sz * 0.85]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      {/* chevrons showing the direction of travel */}
      <mesh position={[0, sy / 2 + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.min(sx, sz) * 0.18, 3]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}

/** Moving wall: a solid slab that sweeps across the lane and knocks racers over. */
export function MovingWall({ def, id, color }: { def: WallDef; id: string; color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const at = usePath(def);
  const [sx, sy, sz] = def.size;
  const start = at(0);

  useEffect(() => {
    registry.hazards.set(id, {
      id,
      knockback: 7.5,
      shapes: (t: number): Shape[] => {
        const p = at(t);
        return [{ k: 'box', x: p[0], y: p[1] + sy / 2, z: p[2], hx: sx / 2 + 0.05, hy: sy / 2, hz: sz / 2 + 0.05 }];
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
    const p = at(registry.time);
    b.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={start}>
      <CuboidCollider args={[sx / 2, sy / 2, sz / 2]} friction={0} />
      <mesh castShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* hazard stripes */}
      {[-0.35, 0, 0.35].map((k) => (
        <mesh key={k} position={[k * sx, 0, sz / 2 + 0.02]}>
          <boxGeometry args={[sx * 0.18, sy * 0.9, 0.05]} />
          <meshStandardMaterial color="#ffe14d" />
        </mesh>
      ))}
    </RigidBody>
  );
}
