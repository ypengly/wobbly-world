# WOBBLY WORLD

A colourful, chaotic 3D obstacle-racing game that runs in the browser. Pick a wobbly character, race six AI rivals through
swinging hammers, spinning bars, falling platforms, conveyor belts and bounce pads, grab coins, level up and unlock new
characters and cosmetics. Playable with keyboard **or** touch controls.

## Features

- Third-person character controller on a Rapier physics world (stable capsule collider, separate animated mesh)
- Procedural, original characters (8) with squash-and-stretch, face animations, stumble/recover and victory dance
- 5 playable levels across 4 worlds: **Candy Land** (2), **Lava Factory**, **Sky Adventure**, **Toy City**
- 8 obstacle types + 4 surface types (slippery, conveyor, bounce, normal): hammers, rotating bars, ferry platforms,
  moving walls, rolling balls, falling platforms, disappearing tiles, punching blocks
- Waypoint/probe-based AI that jumps gaps, waits for obstacle gaps, makes funny mistakes and recovers by returning to its
  last checkpoint (never teleports forward)
- 5 game modes, all fully implemented: Classic Race, Time Trial, Challenge (3 objectives), Survival (3 lives), Endless Run
  (procedurally generated course)
- Coins, XP, player levels, 13 achievements, character & cosmetic shop, personal bests, daily reward
- Fully procedural audio (no audio files, nothing plays before the first user interaction) and particle effects
- Complete mobile support: virtual joystick, Jump and Sprint buttons, multi-touch, left-handed mode, control size/opacity,
  safe-area insets, rotate-device hint (non-blocking), vibration
- Settings (graphics quality, volumes, camera distance…) and progress saved in `localStorage`, validated on load

## Tech stack

React 19 · TypeScript · Vite · Three.js · React Three Fiber · Drei · `@react-three/rapier` · Zustand · Tailwind CSS 4 · Howler.js

## Getting started

```bash
npm install
npm run dev        # development server with hot reload
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

Requires Node 18+ (developed on Node 22).

## Controls

| Action | Keyboard |
| --- | --- |
| Move | `W A S D` / arrow keys |
| Jump (hold for a higher jump) | `Space` |
| Sprint (stamina-limited) | `Shift` |
| Pause | `Esc` |

Movement is camera-relative. The camera follows the course direction, so "up" on the stick always means "toward the finish".

### Mobile controls

- **Joystick** bottom-left: 360°, dead zone, normalised diagonals, returns to neutral on release/cancel
- **JUMP** (large, bottom-right) and **RUN** (sprint, hold) – both work while moving; each control tracks its own finger
- Inputs reset safely on pointer cancel, lost capture, tab switch, orientation change and page hide
- Settings → touch controls: size (S/M/L), opacity, dead zone, left-handed mode, vibration, Auto/On/Off visibility
- Landscape is recommended; portrait shows a dismissible hint and still works

## Project structure

```
src/
  app/            App.tsx (root, WebGL check, audio unlock) · router.tsx (menu / race screen switch)
  components/ui/  MainMenu · GameHUD · PauseMenu · ResultsScreen · LoadingScreen · SettingsPanel · Widgets
  game/
    GameCanvas.tsx · RaceScene.tsx · MenuScene.tsx · GameManager.ts · GameConfig.ts
    characters/   CharacterModel (visuals) · CharacterController (movement rules) · RacerBody (physics body)
                  Player · AICharacter · CharacterAnimations · CharacterData
    controls/     InputManager · KeyboardInput · VirtualJoystick · ActionButton · TouchControls
    physics/      PhysicsWorld (runtime registry) · CollisionManager (ray casts, hazard tests) · MovementController
    camera/       FollowCamera
    obstacles/    one component per obstacle + ObstacleManager (type → component registry)
    levels/       LevelConfig (helpers, worlds) · LevelManager · Course · EndlessGenerator · LevelView · levels/*.ts
    worlds/       CandyWorld · LavaWorld · SkyWorld · ToyCityWorld (scenery, lights, sky)
    systems/      RaceManager · AIManager · CheckpointManager · RewardManager · AudioManager · SaveManager
                  ParticleSystem · Effects
  store/          gameStore · playerStore · settingsStore (Zustand)
  hooks/          useGameControls · useMobileControls
  types/ utils/ styles/
```

Gameplay state (race clock, racer positions, coins) lives in plain TypeScript singletons (`RaceManager`, `registry`) and is
mirrored into Zustand only ~10×/second for the HUD, so the 3D simulation never triggers React re-renders.
Obstacles are driven from a deterministic simulation clock (`registry.time`), which keeps them pause-safe and lets the AI
predict where hazards will be.

## How to add a new obstacle

1. Add a variant to `ObstacleDef` in `src/types/level.ts`.
2. Create `src/game/obstacles/MyObstacle.tsx`. Use a `RigidBody type="kinematicPosition"` for collision, drive it from
   `registry.time` in `useFrame`, and register what the AI/hit-test needs in `useEffect`:
   - `registry.hazards.set(id, { id, knockback, shapes: (t) => Shape[] })` for things that bonk the player
   - `registry.surfaces.set(body.handle, info)` for moving ground (riders inherit `vx/vz`)
   - `registry.softGrounds.set(id, …)` for ground that moves or vanishes (so the AI times its jumps)
3. Add it to `OBSTACLE_COMPONENTS` and `obstacleColor` in `ObstacleManager.ts`.
4. Use it in a level: `{ type: 'my', pos: [0, 0, -40], … }`.

## How to add a new level

1. Create `src/game/levels/levels/<world>-NN.ts` exporting a `LevelConfig` (see `candy-01.ts`). Platforms are described by their
   top-surface height; `plat(x, z, width, depth, y?, opts?)` is the helper. Provide `waypoints` (the course centre line),
   `spawn`, `finish`, `checkpoints`, `coins`, `killY`, `parTime` and `aiSkill`.
2. Register it in the `LEVELS` array in `LevelManager.ts` (array order is the unlock order).
3. Keep gaps ≤ 6 units (sprint-jump reach is ~7.5) so every level stays completable.

## Modes

| Mode | What it is |
| --- | --- |
| Classic Race | You + 6 AI rivals. Results are computed from real finishing order and times. |
| Time Trial | Solo run, personal best saved per level. |
| Challenge | Speed Run (beat par), Coin Hunter (80% of coins), Clean Run (no falls or bonks). |
| Survival | Generated course, 3 lives, higher difficulty; scored by distance. |
| Endless Run | Long generated course with rising difficulty; "End run" in the pause menu banks your distance. |

## Progression & saving

Coins, XP, levels, unlocks, personal bests and achievements are stored under `wobbly-world-save-v1`; settings under
`wobbly-world-settings-v1`. Both are validated field-by-field on load (bad data falls back to defaults).
Settings → *Reset progress* erases the save after a confirmation step.
Cosmetics are purely visual – they never touch movement constants.

## Testing

`window.__ww` exposes the stores and `RaceManager` for debugging, and setting `window.__wwAutopilot = true` lets the AI brain
drive the player. This was used to drive every level start-to-finish in headless Chromium.
Typical check: `__ww.useGameStore.getState().startRace('candy-01', 'classic')` and watch `__ww.RaceManager.player`.

## Troubleshooting

- **Black/blank screen or "needs WebGL"** – enable hardware acceleration or update your browser. Try Settings → Quality: Low.
- **Low frame rate** – use Low quality (default on touch devices); the renderer also lowers its pixel ratio automatically.
- **No sound** – browsers block audio until you click/tap once; check Settings → volumes.
- **Touch controls not showing on a hybrid laptop** – Settings → Show touch controls → On.
- **Progress lost** – private/incognito windows and cleared site data wipe `localStorage`.
- **Large bundle warning on build** – expected (Three.js + Rapier WASM); the app is a single chunk.

## Deploying to Vercel

1. Push the repository to GitHub/GitLab.
2. In Vercel choose **Add New → Project** and import the repo (framework preset *Vite* is detected; `vercel.json` is included).
3. Build command `npm run build`, output directory `dist`. Deploy.

Or from the CLI: `npm i -g vercel && vercel --prod`.

## Credits

All characters, levels, sounds and music are original and generated procedurally in code – no third-party assets.
