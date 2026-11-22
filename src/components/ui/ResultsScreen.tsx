import { useGameStore } from '../../store/gameStore';
import { usePlayerStore, levelFromXp } from '../../store/playerStore';
import { LevelManager } from '../../game/levels/LevelManager';
import { formatTime, ordinal } from '../../utils/math';
import { Btn, CoinIcon, Modal } from './Widgets';
import { useEffect } from 'react';
import { fx } from '../../game/systems/Effects';

export function ResultsScreen() {
  const { results, startRace, restartRace, quitToMenu, mode, challenge } = useGameStore();
  const xp = usePlayerStore((s) => s.xp);
  useEffect(() => {
    if (results && results.position === 1 && mode === 'classic') fx.shake(0);
  }, [results, mode]);
  if (!results) return null;

  const lv = levelFromXp(xp);
  const finished = results.racers.find((r) => r.isPlayer)?.finished ?? false;
  const distanceMode = mode === 'endless' || mode === 'survival';
  const next = LevelManager.nextLevel(results.levelId);
  const canNext = finished && !!next && (mode === 'classic' || mode === 'timetrial' || mode === 'challenge');

  const headline = distanceMode
    ? finished ? 'Course complete!' : 'Run over!'
    : mode === 'challenge'
      ? results.challengeSuccess ? 'Challenge complete!' : 'Challenge failed'
      : mode === 'timetrial'
        ? finished ? 'Finished!' : 'Not finished'
        : finished ? (results.position === 1 ? '🏆 You won!' : `${ordinal(results.position)} place`) : 'Did not finish';

  return (
    <Modal wide>
      <div className="text-violet-950" data-testid="results">
        <h2 className="text-center text-4xl font-black text-violet-700">{headline}</h2>
        {results.personalBest && <p className="mt-1 text-center text-lg font-black text-amber-500" data-testid="personal-best">⭐ New personal best!</p>}
        {mode === 'challenge' && <p className="text-center font-bold text-violet-500">{results.challengeLabel}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {mode === 'classic' && <Stat label="Position" value={`${ordinal(results.position)} / ${results.total}`} />}
          {distanceMode ? <Stat label="Distance" value={`${results.distance ?? 0} m`} /> : <Stat label="Time" value={finished ? formatTime(results.time) : '—'} />}
          <Stat label="Coins" value={<><CoinIcon /> +{results.coinsEarned}</>} sub={`${results.coinsCollected} collected`} />
          <Stat label="XP" value={`+${results.xpEarned}`} sub={`Level ${lv.level}`} />
          {!distanceMode && results.previousBest !== null && <Stat label="Previous best" value={formatTime(results.previousBest)} />}
          {distanceMode && results.previousBest !== null && <Stat label="Previous best" value={`${Math.round(results.previousBest)} m`} />}
          <Stat label="Falls" value={String(results.falls)} />
        </div>

        {results.leveledUp && <p className="mt-3 rounded-xl bg-emerald-100 p-2 text-center font-black text-emerald-700">🎉 Level up! You are now level {lv.level} (+25 coins)</p>}
        {results.newlyUnlocked.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-100 p-2 text-center font-bold text-amber-800" data-testid="achievements">
            🏅 Achievement{results.newlyUnlocked.length > 1 ? 's' : ''}: {results.newlyUnlocked.join(', ')}
          </div>
        )}

        {mode === 'classic' && (
          <ol className="mt-3 grid grid-cols-1 gap-1 text-sm font-bold sm:grid-cols-2">
            {results.racers.map((r) => (
              <li key={r.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${r.isPlayer ? 'bg-violet-200' : 'bg-violet-50'}`}>
                <span className="w-6 text-violet-500">{r.position}.</span>
                <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                <span className="flex-1">{r.isPlayer ? 'You' : r.name}</span>
                <span className="tabular-nums text-violet-500">{r.finished ? formatTime(r.finishTime) : 'DNF'}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="sticky -bottom-5 -mx-5 -mb-5 mt-4 flex flex-wrap justify-center gap-3 rounded-b-[24px] bg-white/95 p-3 pb-4">
          <Btn tone="sky" onClick={restartRace} testId="retry">
            ↻ Retry
          </Btn>
          {canNext && (
            <Btn tone="mint" testId="next-level" onClick={() => startRace(next!.id, mode, challenge)}>
              Next level ▶
            </Btn>
          )}
          <Btn tone="ghost" onClick={quitToMenu} testId="results-menu">
            ⌂ Main menu
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-violet-100 p-2 text-center">
      <div className="text-xs font-black uppercase tracking-wider text-violet-400">{label}</div>
      <div className="text-xl font-black">{value}</div>
      {sub && <div className="text-xs font-bold text-violet-400">{sub}</div>}
    </div>
  );
}
