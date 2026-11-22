import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import type { LevelConfig, PlatformDef, WorldDef } from '../../types/level';
import { registry, type SurfaceInfo } from '../physics/PhysicsWorld';
import { OBSTACLE_COMPONENTS, ObstacleManager, obstacleColor } from '../obstacles/ObstacleManager';
import { RaceManager } from '../systems/RaceManager';
import { useGameStore } from '../../store/gameStore';

/* ---------- procedural textures ---------- */
const texCache = new Map<string, THREE.CanvasTexture>();
function patternTexture(kind: 'arrows' | 'checker' | 'stripes' | 'springs') {
  const hit = texCache.get(kind);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  if (kind === 'arrows') {
    g.fillStyle = 'rgba(255,255,255,0.0)';
    g.strokeStyle = '#ffffff';
    g.fillStyle = '#2b1b5a';
    g.globalAlpha = 0.35;
    for (let i = 0; i < 2; i++) {
      g.beginPath();
      g.moveTo(64, 10 + i * 64);
      g.lineTo(104, 50 + i * 64);
      g.lineTo(84, 50 + i * 64);
      g.lineTo(64, 30 + i * 64);
      g.lineTo(44, 50 + i * 64);
      g.lineTo(24, 50 + i * 64);
      g.closePath();
      g.fill();
    }
  } else if (kind === 'checker') {
    g.fillStyle = '#111';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2 === 0) g.fillRect(x * 16, y * 16, 16, 16);
  } else if (kind === 'stripes') {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#2b1b5a';
    g.globalAlpha = 0.18;
    for (let i = -4; i < 8; i++) {
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32 + 16, 0);
      g.lineTo(i * 32 + 16 + 128, 128);
      g.lineTo(i * 32 + 128, 128);
      g.fill();
    }
  } else {
    g.fillStyle = '#d99a00';
    g.globalAlpha = 0.5;
    for (let i = 0; i < 4; i++) g.fillRect(8, 8 + i * 32, 112, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(kind, t);
  return t;
}

function Platform({ def, id, color }: { def: PlatformDef; id: string; color: string }) {
  const body = useRef<RapierRigidBody>(null);
  const [sx, sy, sz] = def.size;
  const surface = def.surface ?? 'normal';

  const info = useMemo<SurfaceInfo>(() => ({ type: surface, dir: def.dir, speed: def.speed, vx: 0, vy: 0, vz: 0 }), [surface, def]);
  useEffect(() => {
    const h = body.current?.handle;
    if (h !== undefined) registry.surfaces.set(h, info);
    return () => {
      if (h !== undefined) registry.surfaces.delete(h);
    };
  }, [info, id]);

  const tex = useMemo(() => {
    if (surface === 'conveyor') {
      const t = patternTexture('arrows').clone();
      t.needsUpdate = true;
      t.repeat.set(Math.max(1, Math.round(sx / 3)), Math.max(1, Math.round(sz / 3)));
      return t;
    }
    if (surface === 'bounce') {
      const t = patternTexture('springs').clone();
      t.needsUpdate = true;
      t.repeat.set(2, 1);
      return t;
    }
    if (surface === 'slippery') {
      const t = patternTexture('stripes').clone();
      t.needsUpdate = true;
      t.repeat.set(Math.max(1, Math.round(sx / 3)), Math.max(1, Math.round(sz / 3)));
      return t;
    }
    return null;
  }, [surface, sx, sz]);

  useFrame((_, dt) => {
    if (surface === 'conveyor' && tex && def.dir && !useGameStore.getState().paused) {
      // texture scroll matches belt direction (arrow points toward -v)
      tex.offset.y += def.dir[1] * (def.speed ?? 3) * dt * 0.33 * (1 / Math.max(1, Math.round(sz / 3))) * Math.max(1, Math.round(sz / 3)) * -1;
      tex.offset.x += def.dir[0] * (def.speed ?? 3) * dt * 0.33;
    }
  });

  const topColor = surface === 'bounce' ? '#ffe14d' : surface === 'slippery' ? '#bff2ff' : color;
  return (
    <RigidBody ref={body} type="fixed" colliders={false} position={def.pos}>
      <CuboidCollider args={[sx / 2, sy / 2, sz / 2]} friction={0} restitution={0} />
      <mesh receiveShadow castShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.72)} roughness={0.7} />
      </mesh>
      <mesh position={[0, sy / 2 + 0.01, 0]} receiveShadow>
        <boxGeometry args={[sx - 0.02, 0.1, sz - 0.02]} />
        <meshStandardMaterial
          color={topColor}
          map={tex}
          roughness={surface === 'slippery' ? 0.08 : 0.5}
          metalness={surface === 'slippery' ? 0.2 : 0}
          emissive={surface === 'bounce' ? '#ffb800' : '#000000'}
          emissiveIntensity={surface === 'bounce' ? 0.25 : 0}
        />
      </mesh>
      {/* edge trim so platform silhouettes read clearly */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (sx / 2 - 0.06), sy / 2 + 0.08, 0]}>
          <boxGeometry args={[0.12, 0.1, sz]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      ))}
    </RigidBody>
  );
}

/* ---------- coins (instanced) ---------- */
const COIN_GEO = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20);
const dummy = new THREE.Object3D();

function Coins({ level }: { level: LevelConfig }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffd23f', metalness: 0.7, roughness: 0.25, emissive: '#ff9f00', emissiveIntensity: 0.25 }), []);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    level.coins.forEach((c, i) => {
      if (RaceManager.coinsTaken.has(i)) {
        dummy.scale.setScalar(0.0001);
      } else {
        dummy.scale.setScalar(1);
      }
      dummy.position.set(c[0], c[1] + Math.sin(t * 2.5 + i) * 0.12, c[2]);
      dummy.rotation.set(Math.PI / 2, 0, t * 3 + i * 0.5);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  if (!level.coins.length) return null;
  return <instancedMesh ref={mesh} args={[COIN_GEO, mat, level.coins.length]} frustumCulled={false} castShadow={false} />;
}

/* ---------- checkpoints ---------- */
function CheckpointGate({ index, pos, accent }: { index: number; pos: [number, number, number]; accent: string }) {
  const flag = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const reached = RaceManager.player && RaceManager.player.checkpoint >= index;
    if (flag.current) {
      flag.current.color.set(reached ? '#3dff9a' : '#ffffff');
      flag.current.emissive.set(reached ? '#1fcf70' : '#000000');
      flag.current.emissiveIntensity = reached ? 0.6 : 0;
    }
    if (ring.current) ring.current.rotation.y = s.clock.elapsedTime * 1.5;
  });
  return (
    <group position={[pos[0], pos[1], pos[2]]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 5.2, 2, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.28, 4, 10]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 3.9, 0]}>
        <boxGeometry args={[10.6, 0.5, 0.3]} />
        <meshStandardMaterial ref={flag} color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh ref={ring} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.5, 24, 1]} />
        <meshBasicMaterial color="#3dff9a" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function FinishArch({ pos }: { pos: [number, number, number] }) {
  const tex = useMemo(() => {
    const t = patternTexture('checker').clone();
    t.needsUpdate = true;
    t.repeat.set(10, 1.2);
    return t;
  }, []);
  return (
    <group position={[pos[0], pos[1], pos[2]]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 6, 3, 0]} castShadow>
          <boxGeometry args={[0.9, 6, 0.9]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 6.2, 0]} castShadow>
        <boxGeometry args={[13, 1.6, 0.6]} />
        <meshStandardMaterial map={tex} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 2.4]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
    </group>
  );
}

function StartGate({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={[pos[0], pos[1], pos[2] - 2.5]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 6.4, 2.2, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.36, 4.4, 10]} />
          <meshStandardMaterial color="#ff5fa2" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 4.4, 0]} castShadow>
        <boxGeometry args={[13.4, 0.9, 0.5]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Platforms, obstacles, coins, checkpoints and gates for the level. */
export function LevelView({ level, world }: { level: LevelConfig; world: WorldDef }) {
  const accent = world.accent;
  return (
    <>
      {level.platforms.map((p, i) => (
        <Platform key={`${level.id}-p${i}`} id={`${level.id}-p${i}`} def={p} color={p.color ?? world.platformColors[i % world.platformColors.length]} />
      ))}
      {level.obstacles.map((o, i) => {
        const Comp = OBSTACLE_COMPONENTS[o.type];
        const id = ObstacleManager.idFor(level, i);
        return <Comp key={id} def={o} id={id} color={obstacleColor(o, accent, world.platformColors)} />;
      })}
      <Coins level={level} />
      {level.checkpoints.map((c, i) => (
        <CheckpointGate key={i} index={i} pos={c.pos} accent={accent} />
      ))}
      <StartGate pos={level.spawn} />
      <FinishArch pos={level.finish} />
    </>
  );
}
