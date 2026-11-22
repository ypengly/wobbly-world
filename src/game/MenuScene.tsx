import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../store/playerStore';
import { createAnimState } from '../types/character';
import { CharacterModel } from './characters/CharacterModel';
import { getCharacter } from './characters/CharacterData';
import { LevelManager } from './levels/LevelManager';
import { useGameStore } from '../store/gameStore';
import { SkyAndLights } from './worlds/WorldShared';

/** 3D character preview behind the menu. Occasionally breaks into a victory dance. */
export function MenuScene() {
  const selected = usePlayerStore((s) => s.selectedCharacter);
  const loadout = usePlayerStore((s) => s.loadout);
  const worldId = useGameStore((s) => s.worldId);
  const world = LevelManager.getWorld(worldId);
  const anim = useMemo(() => createAnimState(), []);
  const group = useRef<THREE.Group>(null);
  const t0 = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    anim.heading = Math.sin(t * 0.6) * 0.35 - 0.35;
    // dance for 2.2s every 7s
    anim.victory = t % 7 > 4.8;
    const cam = state.camera as THREE.PerspectiveCamera;
    const aspect = state.size.width / state.size.height;
    const wide = aspect > 1.2;
    // character sits on the right in landscape (menu panel on the left), centred in portrait
    const targetX = wide ? 1.6 : 0;
    const dist = wide ? 6.8 : 9.5;
    cam.position.x += (targetX - cam.position.x) * Math.min(1, dt * 3);
    cam.position.y += (1.4 - cam.position.y) * Math.min(1, dt * 3);
    cam.position.z += (dist - cam.position.z) * Math.min(1, dt * 3);
    cam.lookAt(cam.position.x * 0.2 - 0.3 + (wide ? 0.4 : 0), 0.3, 0);
    if (group.current) group.current.rotation.y = Math.sin(t * 0.4) * 0.25;
    t0.current = t;
  });

  return (
    <>
      <SkyAndLights world={world} />
      <group ref={group}>
        <CharacterModel def={getCharacter(selected)} loadout={loadout} anim={anim} scale={1.25} preview />
        <mesh position={[0, -1.12, 0]} receiveShadow>
          <cylinderGeometry args={[1.3, 1.5, 0.3, 32]} />
          <meshStandardMaterial color={world.accent} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.96, 0]}>
          <cylinderGeometry args={[1.18, 1.18, 0.06, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
      </group>
    </>
  );
}
