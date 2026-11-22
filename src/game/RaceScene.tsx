import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { useGameStore, type HudState } from '../store/gameStore';
import { usePlayerStore } from '../store/playerStore';
import { LevelManager } from './levels/LevelManager';
import { LevelView } from './levels/LevelView';
import { RaceManager, type RacerInit } from './systems/RaceManager';
import { RewardManager } from './systems/RewardManager';
import { AudioManager } from './systems/AudioManager';
import { ParticleSystem } from './systems/ParticleSystem';
import { fx } from './systems/Effects';
import { registry } from './physics/PhysicsWorld';
import { Player } from './characters/Player';
import { AICharacter } from './characters/AICharacter';
import { FollowCamera, resetCamera } from './camera/FollowCamera';
import { CandyWorld } from './worlds/CandyWorld';
import { LavaWorld } from './worlds/LavaWorld';
import { SkyWorld } from './worlds/SkyWorld';
import { ToyCityWorld } from './worlds/ToyCityWorld';
import { buildOpponents, evaluateChallenge, gridSlot, objectiveText, usesAI } from './GameManager';
import { getCharacter } from './characters/CharacterData';
import { PLAYER_ID } from '../utils/constants';
import { GRAVITY } from '../utils/constants';
import { InputManager } from './controls/InputManager';

const WORLD_COMPONENTS = { candy: CandyWorld, lava: LavaWorld, sky: SkyWorld, toy: ToyCityWorld } as const;

/** Steps the race, mirrors state into the HUD store (throttled) and finalises results. */
function RaceDirector({ mode }: { mode: ReturnType<typeof useGameStore.getState>['mode'] }) {
  const acc = useRef(0);
  const prevCountdown = useRef(-1);
  const challenge = useGameStore.getState().challenge;

  useEffect(() => {
    const s = useGameStore.getState;
    const offs = [
      RaceManager.on('go', () => {
        s().setPhase('racing');
        s().showToast('GO!', 'good');
      }),
      RaceManager.on('checkpoint', () => s().showToast('Checkpoint!', 'good')),
      RaceManager.on('fall', () => s().showToast('Oops! Back to checkpoint', 'bad')),
      RaceManager.on('playerFinish', () => {
        AudioManager.stopMusic();
        AudioManager.playMusic('victory');
        s().showToast('FINISH!', 'good');
      }),
      RaceManager.on('end', () => {
        const ch = mode === 'challenge' ? evaluateChallenge(challenge, RaceManager.level, RaceManager.player) : undefined;
        const results = RewardManager.finalize(RaceManager.level, mode, ch);
        InputManager.reset();
        s().setResults(results);
        s().setPhase('finished');
      }),
    ];
    s().setPhase('countdown');
    AudioManager.playMusic('race');
    const t = setTimeout(() => s().setLoading(false), 450);
    resetCamera();
    fx.clear();
    return () => {
      offs.forEach((o) => o());
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const st = useGameStore.getState();
    if (st.paused) return;
    const dt = Math.min(delta, 1 / 30);
    RaceManager.tick(dt);

    acc.current += dt;
    if (acc.current < 0.1) return;
    acc.current = 0;

    const p = RaceManager.player;
    if (!p) return;
    const len = RaceManager.course.length || 1;
    const standings = RaceManager.standings();
    const countdown = RaceManager.phase === 'countdown' ? Math.max(1, Math.ceil(RaceManager.countdown)) : RaceManager.time < 0.8 ? 0 : null;
    if (countdown !== prevCountdown.current) prevCountdown.current = countdown ?? -1;
    const hud: Partial<HudState> = {
      time: RaceManager.time,
      position: standings.findIndex((r) => r.id === PLAYER_ID) + 1,
      total: standings.length,
      progress: Math.min(1, p.progress / len),
      opponents: [...RaceManager.racers.values()].map((r) => ({ id: r.id, color: r.color, progress: r.finished ? 1 : Math.min(1, r.progress / len), isPlayer: r.isPlayer })),
      coins: p.coins,
      totalCoins: RaceManager.level.coins.length,
      countdown,
      lives: RaceManager.lives,
      distance: Math.round(p.progress),
      objective: mode === 'challenge' ? objectiveText(challenge, RaceManager.level, p) : null,
      speed: Math.hypot(p.vx, p.vz),
    };
    st.setHud(hud);
  }, -2);

  return null;
}

export function RaceScene() {
  const levelId = useGameStore((s) => s.levelId);
  const mode = useGameStore((s) => s.mode);
  const raceKey = useGameStore((s) => s.raceKey);
  const paused = useGameStore((s) => s.paused);
  const selected = usePlayerStore((s) => s.selectedCharacter);

  // Build level + reset race state synchronously, before any child frame callback runs.
  const setup = useMemo(() => {
    const level = LevelManager.resolve(levelId, mode);
    registry.clear();
    const player = getCharacter(selected);
    const opp = usesAI(mode) ? buildOpponents(selected) : [];
    const racers: RacerInit[] = [
      { id: PLAYER_ID, name: 'You', color: player.color, isPlayer: true },
      ...opp.map((o, i) => ({ id: `ai-${i}`, name: o.name, color: o.def.color, isPlayer: false })),
    ];
    RaceManager.init(level, mode, racers);
    return { level, opp, seed: (raceKey + 1) * 9973 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, mode, raceKey]);

  const { level, opp, seed } = setup;
  const world = LevelManager.getWorld(level.world);
  const WorldComp = WORLD_COMPONENTS[level.world];

  return (
    <Physics key={`${raceKey}`} gravity={[0, GRAVITY, 0]} paused={paused} timeStep={1 / 60} interpolate>
      <WorldComp level={level} world={world} />
      <LevelView level={level} world={world} />
      <Player start={gridSlot(level, 0)} />
      {opp.map((o, i) => (
        <AICharacter key={`ai-${i}`} id={`ai-${i}`} def={o.def} index={i} count={opp.length} start={gridSlot(level, i + 1)} level={level} seed={seed} />
      ))}
      <FollowCamera />
      <ParticleSystem />
      <RaceDirector mode={mode} />
    </Physics>
  );
}
