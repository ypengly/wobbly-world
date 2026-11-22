import type { GameMode, RaceResults, RacerResult } from '../../types/game';
import type { LevelConfig } from '../../types/level';
import { REWARDS } from '../GameConfig';
import { usePlayerStore, levelFromXp } from '../../store/playerStore';
import { RaceManager } from './RaceManager';
import { AudioManager } from './AudioManager';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  reward: number;
  check: (ctx: AchievementCtx) => boolean;
}

interface AchievementCtx {
  stats: ReturnType<typeof usePlayerStore.getState>['stats'];
  completed: string[];
  coins: number;
  level: number;
  owned: number;
  lastPosition: number;
  lastFalls: number;
  lastMode: GameMode;
  lastTime: number;
  lastParTime: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-race', name: 'Off the Blocks', desc: 'Finish your first race.', reward: 20, check: (c) => c.stats.races >= 1 },
  { id: 'first-win', name: 'Winner Winner', desc: 'Win a race.', reward: 40, check: (c) => c.stats.wins >= 1 },
  { id: 'podium-5', name: 'Podium Regular', desc: 'Finish on the podium 5 times.', reward: 60, check: (c) => c.stats.podiums >= 5 },
  { id: 'clean-run', name: 'Smooth Operator', desc: 'Finish a race without falling.', reward: 40, check: (c) => c.lastFalls === 0 && c.stats.races >= 1 },
  { id: 'coin-50', name: 'Pocket Change', desc: 'Collect 50 coins in total.', reward: 30, check: (c) => c.stats.coinsCollected >= 50 },
  { id: 'coin-250', name: 'Coin Collector', desc: 'Collect 250 coins in total.', reward: 80, check: (c) => c.stats.coinsCollected >= 250 },
  { id: 'faller', name: 'Gravity Enthusiast', desc: 'Fall 10 times.', reward: 20, check: (c) => c.stats.falls >= 10 },
  { id: 'hammered', name: 'Hammer Time', desc: 'Get bonked by 5 obstacles.', reward: 25, check: (c) => c.stats.hammerHits >= 5 },
  { id: 'candy-clear', name: 'Sweet Tooth', desc: 'Complete both Candy Land levels.', reward: 60, check: (c) => c.completed.includes('candy-01') && c.completed.includes('candy-02') },
  { id: 'world-tour', name: 'World Tour', desc: 'Complete a level in every world.', reward: 150, check: (c) => ['candy', 'lava', 'sky', 'toy'].every((w) => c.completed.some((l) => l.startsWith(w))) },
  { id: 'speedy', name: 'Speed Demon', desc: 'Beat a level’s par time.', reward: 50, check: (c) => c.lastTime > 0 && c.lastTime <= c.lastParTime },
  { id: 'level-5', name: 'Rising Star', desc: 'Reach player level 5.', reward: 50, check: (c) => c.level >= 5 },
  { id: 'wardrobe', name: 'Fashionista', desc: 'Own 3 characters.', reward: 40, check: (c) => c.owned >= 3 },
];

export const RewardManager = {
  /**
   * Build results from real race state, apply rewards, update stats, save progress.
   * Returns the results object for the results screen.
   */
  finalize(level: LevelConfig, mode: GameMode, challenge?: { label: string; success: boolean }): RaceResults {
    const store = usePlayerStore.getState();
    const player = RaceManager.player;
    const standings = RaceManager.standings();
    const total = standings.length;
    const finished = player.finished;
    const position = RaceManager.positionOf(player.id);
    const time = finished ? player.finishTime : RaceManager.time;
    const levelBefore = levelFromXp(store.xp).level;

    let coinsEarned = player.coins * REWARDS.coinValue;
    let xp = player.coins * REWARDS.xpPerCoin;
    let personalBest = false;
    let previousBest: number | null = store.bestTimes[level.id] ?? null;
    let distance: number | undefined;

    if (mode === 'endless' || mode === 'survival') {
      distance = Math.round(player.progress);
      coinsEarned += Math.floor(distance / 10) + (finished ? REWARDS.finishBonus : 0);
      xp += Math.floor(distance / 8) + (finished ? REWARDS.xpFinish : 0);
      const prev = mode === 'endless' ? store.endlessBest : store.survivalBest;
      previousBest = prev || null;
      personalBest = store.recordDistance(mode, distance);
    } else if (finished) {
      coinsEarned += REWARDS.finishBonus;
      xp += REWARDS.xpFinish;
      if (mode === 'classic') {
        coinsEarned += REWARDS.positionBonus[Math.min(position - 1, REWARDS.positionBonus.length - 1)];
        xp += REWARDS.xpPosition[Math.min(position - 1, REWARDS.xpPosition.length - 1)];
      } else if (mode === 'timetrial') {
        coinsEarned += REWARDS.timeTrialBonus;
      } else if (mode === 'challenge' && challenge?.success) {
        coinsEarned += REWARDS.challengeBonus;
        xp += 30;
      }
      personalBest = store.recordBestTime(level.id, time);
      store.markCompleted(level.id);
    }

    // stats
    const stats = store.stats;
    store.addStats({
      races: 1,
      wins: finished && mode === 'classic' && position === 1 ? 1 : 0,
      podiums: finished && mode === 'classic' && position <= 3 ? 1 : 0,
      falls: player.falls,
      coinsCollected: player.coins,
      playSeconds: Math.round(RaceManager.time),
    });
    void stats;

    store.addCoins(coinsEarned);
    const { leveledUp } = store.addXp(xp);

    // achievements (check after stats update)
    const after = usePlayerStore.getState();
    const newlyUnlocked: string[] = [];
    const ctx: AchievementCtx = {
      stats: after.stats,
      completed: after.completed,
      coins: after.coins,
      level: levelFromXp(after.xp).level,
      owned: after.ownedCharacters.length,
      lastPosition: position,
      lastFalls: finished ? player.falls : 99,
      lastMode: mode,
      lastTime: finished ? time : 0,
      lastParTime: level.parTime,
    };
    for (const a of ACHIEVEMENTS) {
      if (!after.achievements.includes(a.id) && a.check(ctx)) {
        if (usePlayerStore.getState().unlockAchievement(a.id)) {
          usePlayerStore.getState().addCoins(a.reward);
          newlyUnlocked.push(a.name);
        }
      }
    }
    if (newlyUnlocked.length || leveledUp) AudioManager.play('unlock');

    const racers: RacerResult[] = standings.map((r, i) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      isPlayer: r.isPlayer,
      finished: r.finished,
      finishTime: r.finishTime,
      position: i + 1,
    }));

    return {
      levelId: level.id,
      mode,
      position,
      total,
      time,
      coinsCollected: player.coins,
      coinsEarned,
      xpEarned: xp,
      personalBest,
      previousBest,
      falls: player.falls,
      racers,
      challengeLabel: challenge?.label,
      challengeSuccess: challenge?.success,
      distance,
      hits: player.hits,
      newlyUnlocked,
      leveledUp: levelFromXp(usePlayerStore.getState().xp).level > levelBefore,
    };
  },
};
