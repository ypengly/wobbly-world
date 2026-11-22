import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { LevelConfig, WorldDef } from '../../types/level';
import { QUALITY } from '../GameConfig';
import { useSettingsStore } from '../../store/settingsStore';
import { mulberry32 } from '../../utils/math';

export interface WorldProps {
  level: LevelConfig;
  world: WorldDef;
}

/** Gradient sky dome + fog + lights shared by every world. */
export function SkyAndLights({ world, sun = [30, 50, 20] as [number, number, number] }: { world: WorldDef; sun?: [number, number, number] }) {
  const q = QUALITY[useSettingsStore((s) => s.graphics)];
  const { scene } = useThree();
  const light = useRef<THREE.DirectionalLight>(null);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(world.sky[0]) }, bottom: { value: new THREE.Color(world.sky[1]) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 bottom; void main(){ float h = clamp(vP.y*0.5+0.5, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0); }',
      }),
    [world],
  );

  useLayoutEffect(() => {
    scene.fog = new THREE.Fog(world.fog, 60, 190);
    scene.background = new THREE.Color(world.sky[1]);
    return () => {
      scene.fog = null;
    };
  }, [scene, world]);

  // keep the shadow frustum centred on the action
  useFrame((state) => {
    const l = light.current;
    if (!l) return;
    const p = state.camera.position;
    l.position.set(p.x + sun[0] * 0.6, p.y + sun[1] * 0.6, p.z + sun[2] * 0.6 - 18);
    l.target.position.set(p.x, p.y - 6, p.z - 18);
    l.target.updateMatrixWorld();
  });

  return (
    <>
      <mesh scale={400} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 12]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <hemisphereLight args={[world.sky[0], world.ground, world.ambient]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={light}
        intensity={1.4}
        castShadow={q.shadows}
        shadow-mapSize={[q.shadowMapSize, q.shadowMapSize]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0006}
      />
    </>
  );
}

export interface InstanceSpec {
  p: [number, number, number];
  s: [number, number, number];
  r?: [number, number, number];
  c?: string;
}

/** One draw call for many copies of a shape. */
export function Instances({ geometry, specs, roughness = 0.6, emissive, castShadow = false }: { geometry: THREE.BufferGeometry; specs: InstanceSpec[]; roughness?: number; emissive?: number; castShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    specs.forEach((s, i) => {
      d.position.set(...s.p);
      d.scale.set(...s.s);
      d.rotation.set(...(s.r ?? [0, 0, 0]));
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, col.set(s.c ?? '#ffffff'));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [specs]);
  if (!specs.length) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, specs.length]} castShadow={castShadow} frustumCulled={false}>
      <meshStandardMaterial roughness={roughness} emissive={emissive ? '#ffffff' : '#000000'} emissiveIntensity={emissive ?? 0} />
    </instancedMesh>
  );
}

export function useDecorRandom(level: LevelConfig, salt: number) {
  const q = QUALITY[useSettingsStore((s) => s.graphics)];
  return useMemo(() => {
    let seed = salt;
    for (const ch of level.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const zEnd = level.waypoints[level.waypoints.length - 1][2];
    return { rnd: mulberry32(seed), zEnd, density: q.decorations };
  }, [level, salt, q.decorations]);
}

export const geo = {
  sphere: new THREE.SphereGeometry(1, 14, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 12),
  box: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.35, 8, 16),
};
