import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnimState, CharacterDef, Loadout } from '../../types/character';
import { PoseSolver } from './CharacterAnimations';

/* ---------- shared geometry (created once) ---------- */
const G = {
  sphere: new THREE.SphereGeometry(1, 24, 18),
  sphereLo: new THREE.SphereGeometry(1, 12, 10),
  cone: new THREE.ConeGeometry(1, 1, 16),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  box: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.22, 8, 20, Math.PI),
};

const texCache = new Map<string, THREE.CanvasTexture>();
function skinTexture(kind: 'candy' | 'galaxy') {
  const hit = texCache.get(kind);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  if (kind === 'candy') {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ff4d79';
    for (let i = -2; i < 6; i++) {
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32 + 16, 0);
      g.lineTo(i * 32 + 16 + 64, 128);
      g.lineTo(i * 32 + 64, 128);
      g.fill();
    }
  } else {
    const grd = g.createLinearGradient(0, 0, 128, 128);
    grd.addColorStop(0, '#2a1060');
    grd.addColorStop(1, '#6a2cb8');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) {
      g.globalAlpha = 0.4 + Math.random() * 0.6;
      g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(kind, t);
  return t;
}

function makeBodyMaterial(def: CharacterDef, loadout: Loadout) {
  const color = new THREE.Color(loadout.tint ?? def.color);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.02 });
  switch (loadout.skin) {
    case 'gold':
      m.color.set('#ffcf40');
      m.metalness = 0.9;
      m.roughness = 0.25;
      break;
    case 'ice':
      m.color.set('#bfeaff');
      m.roughness = 0.1;
      m.transparent = true;
      m.opacity = 0.85;
      break;
    case 'candy':
      m.color.set('#ffffff');
      m.map = skinTexture('candy');
      break;
    case 'galaxy':
      m.color.set('#ffffff');
      m.map = skinTexture('galaxy');
      m.emissive.set('#3a1a80');
      m.emissiveIntensity = 0.35;
      break;
    default:
      if (def.shape === 'blob' || def.shape === 'slime') {
        m.transparent = true;
        m.opacity = 0.92;
        m.roughness = 0.2;
      }
      if (def.shape === 'robot') {
        m.metalness = 0.55;
        m.roughness = 0.35;
      }
  }
  return m;
}

interface Props {
  def: CharacterDef;
  loadout: Loadout;
  anim: AnimState;
  /** returns true on frames the model should be hidden (respawn invulnerability blink) */
  blink?: () => boolean;
  scale?: number;
  /** menu preview: ignore AnimState-driven locomotion and just idle/dance */
  preview?: boolean;
}

const BODY_Y = -0.12;

/** Procedural cute character. Purely visual: the physics collider lives on the parent RigidBody. */
export const CharacterModel = memo(function CharacterModel({ def, loadout, anim, blink, scale = 1, preview }: Props) {
  const root = useRef<THREE.Group>(null);
  const bodyGroup = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Mesh>(null);
  const footR = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.Group>(null);
  const pupilL = useRef<THREE.Mesh>(null);
  const pupilR = useRef<THREE.Mesh>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const solver = useMemo(() => new PoseSolver(), []);

  const bodyMat = useMemo(() => makeBodyMaterial(def, loadout), [def, loadout]);
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({ color: def.accent, roughness: 0.5 }), [def.accent]);
  const footMat = useMemo(() => {
    const m = bodyMat.clone();
    m.color.multiplyScalar(0.85);
    return m;
  }, [bodyMat]);
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }), []);
  const black = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b1230', roughness: 0.3 }), []);
  const mouthMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b1230', roughness: 0.4, side: THREE.DoubleSide }), []);

  useEffect(
    () => () => {
      bodyMat.dispose();
      footMat.dispose();
      accentMat.dispose();
      white.dispose();
      black.dispose();
      mouthMat.dispose();
    },
    [bodyMat, footMat, accentMat, white, black, mouthMat],
  );

  const shape = def.shape;
  const squareEyes = shape === 'robot';
  const bodyScale: [number, number, number] =
    shape === 'bean' ? [0.52, 0.74, 0.52] : shape === 'slime' ? [0.7, 0.62, 0.7] : shape === 'duck' ? [0.62, 0.62, 0.66] : [0.62, 0.68, 0.62];
  const rainbow = useMemo(() => new THREE.Color(), []);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const a = anim;
    if (preview) {
      a.speed = 0;
      a.grounded = true;
      a.victory = false;
    }
    const local = { x: Math.sin(a.heading), z: Math.cos(a.heading) };
    const p = solver.update(a, Math.min(dt, 0.05), t, Math.sin(a.heading) * a.speed, Math.cos(a.heading) * a.speed, local);

    g.visible = !(blink && blink());
    g.rotation.y = a.heading + p.spin;
    g.scale.setScalar(scale * p.scale);

    if (bodyGroup.current) {
      bodyGroup.current.position.y = p.oy;
      bodyGroup.current.rotation.x = p.pitch;
      bodyGroup.current.rotation.z = p.roll;
      bodyGroup.current.scale.set(p.sx, p.sy, p.sx);
    }
    if (armL.current && armR.current) {
      armL.current.rotation.x = p.armL;
      armR.current.rotation.x = p.armR;
      armL.current.rotation.z = p.armSpread;
      armR.current.rotation.z = -p.armSpread;
    }
    if (footL.current && footR.current) {
      footL.current.position.z = 0.1 + p.legL * 0.45;
      footR.current.position.z = 0.1 + p.legR * 0.45;
      footL.current.position.y = -0.74 + p.liftL;
      footR.current.position.y = -0.74 + p.liftR;
    }
    if (eyes.current) eyes.current.scale.setScalar(p.eye);
    if (pupilL.current && pupilR.current) {
      const sh = p.pupilShake ? Math.sin(t * 40) * 0.05 : 0;
      pupilL.current.position.set(sh, p.pupilShake ? Math.cos(t * 40) * 0.05 : 0, 0.2);
      pupilR.current.position.set(sh, p.pupilShake ? -Math.cos(t * 40) * 0.05 : 0, 0.2);
    }
    if (mouth.current) {
      if (p.mouth === 1) mouth.current.scale.set(0.11, 0.14, 0.05);
      else if (p.mouth === 2) mouth.current.scale.set(0.2, 0.04, 0.05);
      else mouth.current.scale.set(0.2, 0.2, 0.1);
      mouth.current.rotation.z = p.mouth === 0 ? Math.PI : 0;
      mouth.current.rotation.x = p.mouth === 1 ? 0 : 0;
    }
    if (shape === 'slime' && loadout.skin === 'classic' && !loadout.tint) {
      rainbow.setHSL(((t * 0.25) + (a.speed > 6 ? t * 0.5 : 0)) % 1, 0.85, 0.65);
      bodyMat.color.copy(rainbow);
    }
  });

  return (
    <group ref={root}>
      <group ref={bodyGroup}>
        {/* body */}
        <mesh ref={body} geometry={G.sphere} material={bodyMat} position={[0, BODY_Y, 0]} scale={bodyScale} castShadow />

        {/* belly patch */}
        {shape !== 'slime' && shape !== 'robot' && (
          <mesh geometry={G.sphere} material={accentMat} position={[0, BODY_Y - 0.12, 0.28]} scale={[0.3, 0.3, 0.22]} />
        )}

        {/* eyes */}
        <group ref={eyes} position={[0, 0.12, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.2, 0, 0.42]}>
              {squareEyes ? (
                <mesh geometry={G.box} material={white} scale={[0.26, 0.26, 0.1]} position={[0, 0, 0.12]} />
              ) : (
                <mesh geometry={G.sphere} material={white} scale={[0.17, 0.2, 0.15]} position={[0, 0, 0.1]} />
              )}
              <mesh
                ref={s < 0 ? pupilL : pupilR}
                geometry={G.sphereLo}
                material={squareEyes ? accentMat : black}
                scale={[0.085, 0.11, 0.05]}
                position={[0, 0, 0.2]}
              />
            </group>
          ))}
        </group>

        {/* mouth */}
        <mesh
          ref={mouth}
          geometry={G.torus}
          material={mouthMat}
          position={[0, BODY_Y + 0.12, 0.5]}
          scale={[0.2, 0.2, 0.1]}
          rotation={[0, 0, Math.PI]}
        />

        {/* arms */}
        <group ref={armL} position={[-0.52, BODY_Y + 0.1, 0]}>
          <mesh geometry={G.sphere} material={bodyMat} position={[-0.08, -0.14, 0]} scale={[0.14, 0.2, 0.14]} />
        </group>
        <group ref={armR} position={[0.52, BODY_Y + 0.1, 0]}>
          <mesh geometry={G.sphere} material={bodyMat} position={[0.08, -0.14, 0]} scale={[0.14, 0.2, 0.14]} />
        </group>

        {/* ---- shape-specific features ---- */}
        {shape === 'bean' && (
          <mesh geometry={G.cone} material={accentMat} position={[0, 0.72, 0]} scale={[0.1, 0.28, 0.1]} rotation={[0, 0, 0.3]} />
        )}
        {shape === 'wobbler' && (
          <>
            {[-0.12, 0, 0.12].map((x, i) => (
              <mesh key={i} geometry={G.sphere} material={accentMat} position={[x, 0.62 + (i === 1 ? 0.08 : 0), 0]} scale={[0.1, 0.16, 0.1]} />
            ))}
          </>
        )}
        {shape === 'alien' && (
          <>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.2, 0.55, 0]} rotation={[0, 0, -s * 0.25]}>
                <mesh geometry={G.cyl} material={bodyMat} scale={[0.03, 0.22, 0.03]} position={[0, 0.2, 0]} />
                <mesh geometry={G.sphere} material={accentMat} scale={[0.09, 0.09, 0.09]} position={[0, 0.45, 0]} />
              </group>
            ))}
          </>
        )}
        {shape === 'duck' && (
          <>
            <mesh geometry={G.box} material={accentMat} position={[0, BODY_Y + 0.08, 0.62]} scale={[0.34, 0.12, 0.3]} />
            <mesh geometry={G.sphere} material={bodyMat} position={[0, BODY_Y + 0.05, -0.55]} scale={[0.16, 0.14, 0.18]} />
            <mesh geometry={G.sphere} material={bodyMat} position={[0, 0.58, 0.1]} scale={[0.07, 0.1, 0.07]} />
          </>
        )}
        {shape === 'monster' && (
          <>
            {[-1, 1].map((s) => (
              <mesh key={s} geometry={G.cone} material={accentMat} position={[s * 0.3, 0.55, 0]} scale={[0.1, 0.3, 0.1]} rotation={[0, 0, -s * 0.35]} />
            ))}
            {[-0.25, 0, 0.25].map((z, i) => (
              <mesh key={i} geometry={G.cone} material={accentMat} position={[0, -0.1 + z * 0.8, -0.58]} scale={[0.09, 0.16, 0.09]} rotation={[-Math.PI / 2.4, 0, 0]} />
            ))}
          </>
        )}
        {shape === 'robot' && (
          <>
            <mesh geometry={G.cyl} material={accentMat} position={[0, 0.62, 0]} scale={[0.025, 0.18, 0.025]} />
            <mesh geometry={G.sphere} material={accentMat} position={[0, 0.82, 0]} scale={[0.08, 0.08, 0.08]} />
            <mesh geometry={G.box} material={accentMat} position={[0, BODY_Y - 0.1, 0.56]} scale={[0.34, 0.08, 0.05]} />
          </>
        )}
        {shape === 'blob' && (
          <>
            {[0.18, -0.2, 0.05].map((x, i) => (
              <mesh key={i} geometry={G.sphereLo} material={accentMat} position={[x, BODY_Y + 0.1 + i * 0.12, -0.1]} scale={[0.07 - i * 0.012, 0.07 - i * 0.012, 0.07 - i * 0.012]} />
            ))}
          </>
        )}

        {/* ---- cosmetics (visual only) ---- */}
        <Hat id={loadout.hat} y={shape === 'bean' ? 0.64 : 0.55} />
        <Glasses id={loadout.glasses} />
        <Accessory id={loadout.accessory} />
      </group>

      {/* feet (outside the squash group so they stay planted) */}
      {shape !== 'slime' && (
        <>
          <mesh ref={footL} geometry={G.sphere} material={footMat} position={[-0.22, -0.74, 0.1]} scale={[0.17, 0.1, 0.24]} castShadow />
          <mesh ref={footR} geometry={G.sphere} material={footMat} position={[0.22, -0.74, 0.1]} scale={[0.17, 0.1, 0.24]} castShadow />
        </>
      )}
      {/* contact shadow blob */}
      <mesh position={[0, -0.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
});

function Hat({ id, y }: { id: Loadout['hat']; y: number }) {
  const propRef = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (propRef.current) propRef.current.rotation.y = s.clock.elapsedTime * 18;
  });
  if (id === 'none') return null;
  if (id === 'party')
    return (
      <group position={[0, y, 0]} rotation={[0, 0, 0.15]}>
        <mesh geometry={G.cone} scale={[0.22, 0.5, 0.22]} position={[0, 0.2, 0]}>
          <meshStandardMaterial color="#ff5fa2" />
        </mesh>
        <mesh geometry={G.sphere} scale={[0.07, 0.07, 0.07]} position={[0, 0.47, 0]}>
          <meshStandardMaterial color="#ffd23f" />
        </mesh>
      </group>
    );
  if (id === 'tophat')
    return (
      <group position={[0, y, 0]}>
        <mesh geometry={G.cyl} scale={[0.42, 0.04, 0.42]}>
          <meshStandardMaterial color="#1f1a2e" />
        </mesh>
        <mesh geometry={G.cyl} scale={[0.26, 0.3, 0.26]} position={[0, 0.17, 0]}>
          <meshStandardMaterial color="#1f1a2e" />
        </mesh>
        <mesh geometry={G.cyl} scale={[0.27, 0.05, 0.27]} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#ff5470" />
        </mesh>
      </group>
    );
  if (id === 'crown')
    return (
      <group position={[0, y + 0.03, 0]}>
        <mesh geometry={G.cyl} scale={[0.28, 0.12, 0.28]}>
          <meshStandardMaterial color="#ffd23f" metalness={0.8} roughness={0.25} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} geometry={G.cone} scale={[0.07, 0.16, 0.07]} position={[Math.sin(a) * 0.25, 0.13, Math.cos(a) * 0.25]}>
              <meshStandardMaterial color="#ffd23f" metalness={0.8} roughness={0.25} />
            </mesh>
          );
        })}
      </group>
    );
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={G.sphere} scale={[0.34, 0.16, 0.34]}>
        <meshStandardMaterial color="#4aa8ff" />
      </mesh>
      <mesh geometry={G.cyl} scale={[0.02, 0.08, 0.02]} position={[0, 0.16, 0]}>
        <meshStandardMaterial color="#ccc" />
      </mesh>
      <mesh ref={propRef} geometry={G.box} scale={[0.6, 0.015, 0.1]} position={[0, 0.22, 0]}>
        <meshStandardMaterial color="#ff5470" />
      </mesh>
    </group>
  );
}

function Glasses({ id }: { id: Loadout['glasses'] }) {
  if (id === 'none') return null;
  const lens = id === 'shades' ? '#111' : id === 'star' ? '#ffd23f' : '#bfeaff';
  return (
    <group position={[0, 0.12, 0.56]}>
      {[-0.2, 0.2].map((x) => (
        <mesh key={x} position={[x, 0, 0]} scale={[id === 'shades' ? 0.2 : 0.17, id === 'shades' ? 0.12 : 0.17, 0.03]} geometry={id === 'star' ? G.cone : G.cyl} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={lens} transparent opacity={id === 'round' ? 0.5 : 0.95} metalness={0.3} roughness={0.2} />
        </mesh>
      ))}
      <mesh geometry={G.box} scale={[0.5, 0.025, 0.02]}>
        <meshStandardMaterial color="#2b1b5a" />
      </mesh>
    </group>
  );
}

function Accessory({ id }: { id: Loadout['accessory'] }) {
  if (id === 'none') return null;
  if (id === 'bowtie')
    return (
      <group position={[0, -0.42, 0.52]}>
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={G.cone} scale={[0.1, 0.14, 0.05]} position={[s * 0.1, 0, 0]} rotation={[0, 0, s * Math.PI / 2]}>
            <meshStandardMaterial color="#ff5470" />
          </mesh>
        ))}
        <mesh geometry={G.sphere} scale={[0.05, 0.05, 0.05]}>
          <meshStandardMaterial color="#ffd23f" />
        </mesh>
      </group>
    );
  if (id === 'scarf')
    return (
      <group position={[0, -0.34, 0]}>
        <mesh geometry={G.torus} scale={[0.5, 0.5, 0.5]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#ff9f1c" />
        </mesh>
        <mesh geometry={G.box} scale={[0.12, 0.34, 0.04]} position={[0.28, -0.18, 0.4]} rotation={[0, 0, 0.1]}>
          <meshStandardMaterial color="#ff9f1c" />
        </mesh>
      </group>
    );
  return (
    <mesh geometry={G.box} scale={[0.62, 0.8, 0.03]} position={[0, -0.25, -0.55]} rotation={[0.15, 0, 0]}>
      <meshStandardMaterial color="#ff3d6e" side={THREE.DoubleSide} />
    </mesh>
  );
}
