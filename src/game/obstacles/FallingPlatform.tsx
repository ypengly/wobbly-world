import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { ObstacleDef } from '../../types/level';
import { registry } from '../physics/PhysicsWorld';

type Def = Extract<ObstacleDef, { type: 'faller' }>;
type State = 'idle' | 'shake' | 'fall' | 'wait';

/** Platform that wobbles when stood on, drops away, then pops back. All timing uses the sim clock (pause-safe). */
export function FallingPlatform({ def, id, color }: { def: Def; id: string; color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const st = useRef({ state: 'idle' as State, t0: 0, y: 0, popT: -10 });
  const [x, topY, z] = def.pos;
  const [sx, sy, sz] = def.size;
  const delay = def.delay ?? 0.7;
  const respawn = def.respawn ?? 3.5;
  const base = new THREE.Color(color);
  const warn = new THREE.Color('#ff5a5a');

  useEffect(() => {
    st.current = { state: 'idle', t0: 0, y: 0, popT: -10 };
  }, [id]);

  useFrame(() => {
    const b = body.current;
    if (!b) return;
    const s = st.current;
    const t = registry.time;
    const handle = b.handle;
    let shake = 0;

    switch (s.state) {
      case 'idle': {
        const last = registry.standing.get(handle);
        if (last !== undefined && last > t - 0.25) {
          s.state = 'shake';
          s.t0 = t;
        }
        break;
      }
      case 'shake': {
        const e = t - s.t0;
        shake = Math.sin(e * 55) * 0.06 * (0.4 + e / delay);
        if (e >= delay) {
          s.state = 'fall';
          s.t0 = t;
        }
        break;
      }
      case 'fall': {
        const e = t - s.t0;
        s.y = -0.5 * 32 * e * e;
        if (s.y < -45) {
          s.state = 'wait';
          s.t0 = t;
        }
        break;
      }
      case 'wait': {
        s.y = -200; // hidden and out of reach while waiting
        if (t - s.t0 >= respawn) {
          s.state = 'idle';
          s.y = 0;
          s.popT = t;
        }
        break;
      }
    }
    b.setNextKinematicTranslation({ x: x + shake, y: topY - sy / 2 + s.y, z });
    if (mat.current) {
      mat.current.color.copy(base).lerp(warn, s.state === 'shake' ? Math.min(1, (t - s.t0) / delay) : 0);
    }
    if (group.current) {
      const pop = Math.min(1, (t - s.popT) / 0.35);
      const sc = s.state === 'wait' ? 0.001 : 0.4 + 0.6 * (pop < 1 ? 1 - Math.pow(1 - pop, 3) : 1);
      group.current.scale.setScalar(s.popT > t - 0.4 ? sc : 1);
    }
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[x, topY - sy / 2, z]}>
      <CuboidCollider args={[sx / 2, sy / 2, sz / 2]} friction={0} />
      <group ref={group}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[sx, sy, sz]} />
          <meshStandardMaterial ref={mat} color={color} roughness={0.55} />
        </mesh>
        <mesh position={[0, sy / 2 + 0.02, 0]}>
          <boxGeometry args={[sx * 0.8, 0.05, sz * 0.8]} />
          <meshStandardMaterial color="#fff" roughness={0.6} />
        </mesh>
        {/* cracks as a visual hint */}
        <mesh position={[0, sy / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0.5]}>
          <planeGeometry args={[sx * 0.7, 0.08]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.2} />
        </mesh>
      </group>
    </RigidBody>
  );
}
