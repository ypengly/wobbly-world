import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useShowTouchControls } from '../../store/settingsStore';
import { TouchControls } from '../../game/controls/TouchControls';
import { useOrientation } from '../../hooks/useMobileControls';
import { formatTime, ordinal } from '../../utils/math';
import { CoinIcon } from './Widgets';

function ProgressBar() {
  const opponents = useGameStore((s) => s.hud.opponents);
  return (
    <div className="pointer-events-none relative mx-auto mt-2 h-4 w-full max-w-md rounded-full bg-black/35 ring-2 ring-white/70" data-testid="progress-bar">
      {opponents
        .filter((o) => !o.isPlayer)
        .map((o) => (
          <span key={o.id} className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80" style={{ left: `${o.progress * 100}%`, background: o.color }} />
        ))}
      {opponents
        .filter((o) => o.isPlayer)
        .map((o) => (
          <span key={o.id} className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${o.progress * 100}%`, background: o.color }} />
        ))}
      <span className="absolute -right-1 -top-1 text-lg">🏁</span>
    </div>
  );
}

export function GameHUD() {
  const hud = useGameStore((s) => s.hud);
  const mode = useGameStore((s) => s.mode);
  const phase = useGameStore((s) => s.phase);
  const toast = useGameStore((s) => s.toast);
  const setPaused = useGameStore((s) => s.setPaused);
  const dismissed = useGameStore((s) => s.portraitHintDismissed);
  const dismiss = useGameStore((s) => s.dismissPortraitHint);
  const touch = useShowTouchControls();
  const { portrait } = useOrientation();
  const [toastKey, setToastKey] = useState(0);
  useEffect(() => setToastKey((k) => k + 1), [toast?.id]);

  const racing = mode === 'classic';
  return (
    <div className="pointer-events-none absolute inset-0 z-10 safe-pad" data-testid="hud">
      <div className="px-3 pt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="rounded-2xl bg-black/40 px-3 py-1 text-2xl font-black tabular-nums text-white ring-2 ring-white/60" data-testid="timer">
              ⏱ {formatTime(hud.time)}
            </div>
            <div className="rounded-2xl bg-black/40 px-3 py-1 text-lg font-black text-amber-300 ring-2 ring-white/60" data-testid="coins">
              <CoinIcon /> {hud.coins}
              {hud.totalCoins > 0 && <span className="text-sm text-white/70"> / {hud.totalCoins}</span>}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            {racing ? (
              <div className="rounded-2xl bg-gradient-to-b from-fuchsia-500 to-violet-600 px-4 py-1 text-3xl font-black text-white ring-2 ring-white/80" data-testid="position">
                {ordinal(hud.position)}
                <span className="text-base text-white/80"> / {hud.total}</span>
              </div>
            ) : (
              <div className="rounded-2xl bg-gradient-to-b from-fuchsia-500 to-violet-600 px-4 py-1 text-2xl font-black text-white ring-2 ring-white/80" data-testid="distance">
                {mode === 'challenge' && hud.objective ? hud.objective : `${hud.distance} m`}
              </div>
            )}
            {hud.lives !== null && <div className="text-xl" data-testid="lives">{Array.from({ length: Math.max(0, hud.lives) }, () => '❤️').join('') || '💔'}</div>}
          </div>
          <button
            aria-label="Pause"
            data-testid="pause-button"
            className="pointer-events-auto grid h-12 w-12 place-items-center rounded-2xl bg-black/40 text-2xl font-black text-white ring-2 ring-white/70 active:scale-95"
            style={{ touchAction: 'manipulation' }}
            onClick={() => setPaused(true)}
          >
            ❚❚
          </button>
        </div>
        {mode !== 'endless' && mode !== 'survival' && <ProgressBar />}
      </div>

      {/* countdown */}
      {hud.countdown !== null && phase !== 'finished' && (
        <div key={hud.countdown} className="countdown-pop absolute inset-0 flex items-center justify-center" data-testid="countdown">
          <span className="logo-text text-8xl text-amber-300 sm:text-9xl">{hud.countdown === 0 ? 'GO!' : hud.countdown}</span>
        </div>
      )}

      {toast && phase !== 'finished' && (
        <div key={toastKey} className="toast-anim absolute left-1/2 top-24 -translate-x-1/2">
          <div className={`rounded-full px-5 py-1.5 text-xl font-black text-white shadow-lg ring-2 ring-white/80 ${toast.tone === 'good' ? 'bg-emerald-500' : toast.tone === 'bad' ? 'bg-rose-500' : 'bg-violet-500'}`}>{toast.text}</div>
        </div>
      )}

      {touch && portrait && !dismissed && (
        <div className="pointer-events-auto absolute left-1/2 top-28 w-[88%] max-w-sm -translate-x-1/2 rounded-2xl bg-white/95 p-3 text-center font-bold text-violet-800 shadow-xl" data-testid="rotate-hint">
          📱↻ Landscape gives you a better view of the course.
          <button className="ml-2 rounded-full bg-violet-600 px-3 py-0.5 text-sm text-white" onClick={dismiss}>
            Got it
          </button>
        </div>
      )}

      {/* desktop stamina bar */}
      {!touch && (
        <div className="absolute bottom-4 left-1/2 h-3 w-48 -translate-x-1/2 overflow-hidden rounded-full bg-black/35 ring-2 ring-white/60">
          <div className="h-full rounded-full bg-amber-300 transition-[width] duration-100" style={{ width: `${hud.stamina * 100}%` }} />
        </div>
      )}
      {!touch && phase === 'racing' && hud.time < 6 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-4 py-1 text-sm font-bold text-white">WASD / arrows move · Space jump · Shift sprint · Esc pause</div>
      )}

      {touch && <TouchControls />}
    </div>
  );
}
