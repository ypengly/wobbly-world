import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RaceManager } from '../systems/RaceManager';
import { useSettingsStore } from '../../store/settingsStore';
import { useGameStore } from '../../store/gameStore';
import { fx } from '../systems/Effects';
import { damp, dampAngle } from '../../utils/math';

/** Shared camera heading so input can be camera-relative without React state. */
export const camState = { yaw: 0 };

const target = new THREE.Vector3();
const desired = new THREE.Vector3();
const cur = new THREE.Vector3();
const look = new THREE.Vector3();
let inited = false;

export function resetCamera() {
  inited = false;
}

/** Smooth third-person follow camera. Heading follows the course so the joystick always feels consistent. */
export function FollowCamera() {
  const { camera, size } = useThree();

  useFrame((state, delta) => {
    if (useGameStore.getState().paused) return;
    const dt = Math.min(delta, 1 / 20);
    const p = RaceManager.player;
    if (!p) return;
    const settings = useSettingsStore.getState();
    const aspect = size.width / size.height;
    // keep the character and the course ahead visible on small / portrait screens
    const dist = settings.cameraDistance * (aspect < 1 ? 1.35 : aspect < 1.5 ? 1.1 : 1);
    const height = dist * 0.52 + 1.2;
    const cam = camera as THREE.PerspectiveCamera;
    const fov = aspect < 1 ? 62 : 55;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    const finished = p.finished;
    const courseYaw = RaceManager.course.yawAt(Math.max(0, p.progress + 6));
    if (!inited) {
      camState.yaw = courseYaw;
      cam.position.set(p.x, p.y + height + 6, p.z + dist + 10);
      inited = true;
    }
    if (finished) {
      camState.yaw += dt * 0.55; // victory orbit
    } else {
      camState.yaw = dampAngle(camState.yaw, courseYaw, 2.4, dt);
    }

    const sin = Math.sin(camState.yaw);
    const cos = Math.cos(camState.yaw);
    const lead = finished ? 0 : Math.min(2, Math.hypot(p.vx, p.vz) * 0.15);
    target.set(p.x - sin * lead, p.y + 1.0, p.z - cos * lead);
    desired.set(target.x + sin * dist, target.y + height - 1.0, target.z + cos * dist);

    // Smooth horizontally fast, vertically slowly (no bobbing when hopping)
    cur.copy(cam.position);
    cur.x = damp(cur.x, desired.x, 7, dt);
    cur.z = damp(cur.z, desired.z, 7, dt);
    cur.y = damp(cur.y, desired.y, 3.5, dt);
    cam.position.copy(cur);

    look.set(target.x, damp(look.y || target.y, target.y, 5, dt), target.z);
    look.x = target.x;
    look.z = target.z;

    // gentle shake for big impacts only
    if (fx.shakeAmount > 0.01) {
      const s = fx.shakeAmount * 0.35;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      fx.shakeAmount *= Math.exp(-7 * dt);
    } else fx.shakeAmount = 0;

    cam.lookAt(look);
    void state;
  });

  return null;
}
