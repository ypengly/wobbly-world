import { useGameStore } from '../store/gameStore';
import { MainMenu } from '../components/ui/MainMenu';
import { GameHUD } from '../components/ui/GameHUD';
import { PauseMenu } from '../components/ui/PauseMenu';
import { ResultsScreen } from '../components/ui/ResultsScreen';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useGameControls } from '../hooks/useGameControls';

function RaceUI() {
  useGameControls();
  const paused = useGameStore((s) => s.paused);
  const phase = useGameStore((s) => s.phase);
  return (
    <>
      <GameHUD />
      {paused && <PauseMenu />}
      {phase === 'finished' && <ResultsScreen />}
    </>
  );
}

/** Tiny screen router: menu <-> race overlays on top of the shared 3D canvas. */
export function ScreenRouter() {
  const screen = useGameStore((s) => s.screen);
  const loading = useGameStore((s) => s.loading);
  return (
    <>
      {screen === 'menu' ? <MainMenu /> : <RaceUI />}
      <LoadingScreen visible={loading} />
    </>
  );
}
