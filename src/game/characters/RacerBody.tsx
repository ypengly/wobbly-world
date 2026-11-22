import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { CharacterInput, Vec3 } from '../../types/game';
import type { CharacterDef, Loadout } from '../../types/character';
import { createAnimState } from '../../types/character';
import { CharacterModel } from './CharacterModel';
import { CharacterController } from './CharacterController';
import { castGround, testHazards } from '../physics/CollisionManager';
import { registry } from '../physics/PhysicsWorld';
import { RaceManager } from '../systems/RaceManager';
import { AudioManager } from '../systems/AudioManager';
import { fx } from '../systems/Effects';
import { MOVE } from '../GameConfig';
import { dampAngle } from '../../utils/math';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { vibrate } from '../../hooks/useMobileControls';

const NEUTRAL: CharacterInput = { moveX: 0, moveZ: 0, jump: false, jumpHeld: false, sprint: false };

export interface RacerBodyProps {
  id: string;
  def: CharacterDef;
  loadout: Loadout;
  start: Vec3;
  isPlayer: boolean;
  speedScale?: number;
  /** produce this frame's input */
  getInput: (dt: number, controller: CharacterController) => CharacterInput;
  onFrame?: (dt: number) => void;
}

/**
 * Shared physical racer: dynamic capsule body (stable collider) + separate animated mesh.
 * Used by both the player and the AI so they obey exactly the same movement rules.
 */
export function RacerBody({ id, def, loadout, start, isPlayer, speedScale = 1, getInput }: RacerBodyProps) {
  const body = useRef<RapierRigidBody>(null);
  const { world, rapier } = useRapier();
  const controller = useMemo(() => {
    const c = new CharacterController();
    c.speedScale = speedScale;
    return c;
  }, [speedScale]);
  const anim = useMemo(() => createAnimState(), []);
  const heading = useRef(0);
  const prevStumble = useRef(0);
  const lastLandSound = useRef(0);
  const rapierMod = rapier as any;

  useFrame((_, delta) => {
    const b = body.current;
    if (!b) return;
    if (useGameStore.getState().paused) return;
    const dt = Math.min(delta, 1 / 30);
    const racer = RaceManager.racers.get(id);
    if (!racer) return;

    // ---- pending respawn -------------------------------------------------------
    if (racer.respawn) {
      const r = racer.respawn;
      b.setTranslation({ x: r.pos[0], y: r.pos[1], z: r.pos[2] }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      controller.reset();
      anim.recover = 0.6;
      anim.stumble = 0;
      heading.current = anim.heading = Math.atan2(-Math.sin(r.yaw), -Math.cos(r.yaw));
      racer.respawn = null;
      fx.emit('spark', r.pos[0], r.pos[1], r.pos[2], 10);
      return;
    }

    const t = b.translation();
    const v = b.linvel();
    const racing = RaceManager.phase === 'racing' && !racer.finished;
    const input = racing ? getInput(dt, controller) : NEUTRAL;

    const ground = castGround(world, rapierMod, b, t.x, t.y, t.z);
    if (ground.handle !== null) registry.standing.set(ground.handle, registry.time);
    racer.surface = ground.surface?.type ?? 'normal';

    // ---- hazards -----------------------------------------------------------------
    if (racing && controller.invuln <= 0) {
      const hit = testHazards(t.x, t.y, t.z, registry.time, 0.45);
      if (hit) {
        const k = controller.knockback(hit.nx, hit.nz, hit.knockback);
        b.setLinvel({ x: k.vx, y: k.vy, z: k.vz }, true);
        anim.stumble = MOVE.stumbleTime;
        racer.hits++;
        fx.emit('impact', t.x, t.y, t.z, 14);
        if (isPlayer) {
          AudioManager.play('hit');
          fx.shake(0.55);
          vibrate([30, 20, 40]);
          usePlayerStore.getState().addStats({ hammerHits: 1 });
        } else {
          AudioManager.play('hit', 1.4, 0.25);
        }
        RaceManager.updateRacer(id, t.x, t.y, t.z, k.vx, k.vz, false);
        return;
      }
    }

    // ---- movement -------------------------------------------------------------------
    const out = controller.update(dt, input, v.y, ground);
    b.setLinvel({ x: out.vx, y: out.vy, z: out.vz }, true);

    if (out.jumped) {
      if (isPlayer) {
        AudioManager.play('jump');
        usePlayerStore.getState().addStats({ jumps: 1 });
      }
      fx.emit('dust', t.x, t.y - 0.7, t.z, 4);
    }
    if (out.bounced) {
      fx.emit('spark', t.x, t.y - 0.6, t.z, 10);
      if (isPlayer) AudioManager.play('bounce');
    }
    if (out.landed) {
      anim.landed = 0;
      fx.emit('dust', t.x, t.y - 0.7, t.z, Math.min(10, 3 + Math.floor(out.landImpact / 3)));
      if (isPlayer && registry.time - lastLandSound.current > 0.15) {
        lastLandSound.current = registry.time;
        AudioManager.play('land', 1, Math.min(1, out.landImpact / 14));
        if (out.landImpact > 14) vibrate(15);
      }
    } else anim.landed += dt;

    // ---- animation state --------------------------------------------------------------
    const sx = ground.surface?.vx ?? 0;
    const sz = ground.surface?.vz ?? 0;
    anim.speed = Math.hypot(out.vx - sx, out.vz - sz);
    anim.vy = out.vy;
    anim.grounded = ground.grounded && out.vy < 2.5;
    anim.stumble = controller.stun;
    if (prevStumble.current > 0 && anim.stumble <= 0) anim.recover = 0;
    prevStumble.current = anim.stumble;
    anim.recover = Math.max(0, anim.recover - dt);
    anim.victory = racer.finished;
    if (input.moveX * input.moveX + input.moveZ * input.moveZ > 0.01 && controller.stun <= 0) {
      heading.current = dampAngle(heading.current, Math.atan2(input.moveX, input.moveZ), 14, dt);
    }
    anim.heading = heading.current;

    RaceManager.updateRacer(id, t.x, t.y, t.z, out.vx, out.vz, anim.grounded);

    if (isPlayer) useGameStore.getState().hud.stamina !== controller.stamina && stamina(controller.stamina);
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[start[0], start[1] + MOVE.capsuleHalfHeight + MOVE.capsuleRadius + 0.05, start[2]]}
      enabledRotations={[false, false, false]}
      linearDamping={0}
      gravityScale={1}
      canSleep={false}
      ccd
      userData={{ racer: id }}
    >
      <CapsuleCollider args={[MOVE.capsuleHalfHeight, MOVE.capsuleRadius]} friction={0} restitution={0} mass={1} />
      <CharacterModel def={def} loadout={loadout} anim={anim} blink={() => controller.invuln > 0.2 && Math.floor(registry.time * 14) % 2 === 0 && RaceManager.phase === 'racing' && controller.stun <= 0} />
    </RigidBody>
  );
}

let lastStaminaPush = 0;
function stamina(v: number) {
  const now = performance.now();
  if (now - lastStaminaPush < 100) return;
  lastStaminaPush = now;
  useGameStore.getState().setHud({ stamina: v });
}
