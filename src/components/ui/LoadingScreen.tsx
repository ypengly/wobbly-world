import { useGameStore } from '../../store/gameStore';

const TIPS = ['Release jump early for a short hop.', 'Sprint has a stamina meter — use it wisely.', 'Hammers swing in a pattern. Watch, then run.', 'Bounce pads launch you far. Keep steering!', 'Checkpoints save your spot after a fall.'];

export function LoadingScreen({ visible }: { visible: boolean }) {
  const tip = TIPS[useGameStore((s) => s.raceKey) % TIPS.length];
  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-violet-700 to-fuchsia-600 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      data-testid="loading"
    >
      <div className="logo-text float-y text-5xl text-amber-300 sm:text-7xl">WOBBLY WORLD</div>
      <div className="mt-6 h-3 w-56 overflow-hidden rounded-full bg-white/30">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-white" />
      </div>
      <p className="mt-4 max-w-xs px-4 text-center font-bold text-white/90">{tip}</p>
    </div>
  );
}
