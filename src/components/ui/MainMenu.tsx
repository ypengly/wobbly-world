import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore, levelFromXp } from '../../store/playerStore';
import { LevelManager } from '../../game/levels/LevelManager';
import { CHARACTERS, ACCESSORIES, GLASSES, HATS, SKINS, TINTS } from '../../game/characters/CharacterData';
import { ACHIEVEMENTS } from '../../game/systems/RewardManager';
import { CHALLENGES } from '../../game/GameManager';
import { AudioManager } from '../../game/systems/AudioManager';
import { formatTime } from '../../utils/math';
import { DAILY_REWARD_COINS } from '../../utils/constants';
import type { ChallengeId, GameMode } from '../../types/game';
import { Btn, CoinIcon } from './Widgets';
import { SettingsPanel } from './SettingsPanel';

type View = 'home' | 'play' | 'characters' | 'shop' | 'profile';

const MODES: { id: GameMode; name: string; blurb: string }[] = [
  { id: 'classic', name: 'Classic Race', blurb: 'Race 6 AI rivals. First to finish wins.' },
  { id: 'timetrial', name: 'Time Trial', blurb: 'Solo run. Chase your personal best.' },
  { id: 'challenge', name: 'Challenge', blurb: 'Special objectives on a level.' },
  { id: 'survival', name: 'Survival', blurb: '3 lives on a rising-difficulty course.' },
  { id: 'endless', name: 'Endless Run', blurb: 'A long generated course. Go far!' },
];

export function MainMenu() {
  const [view, setView] = useState<View>('home');
  const [settings, setSettings] = useState(false);
  const p = usePlayerStore();
  const lv = levelFromXp(p.xp);
  const canDaily = p.canClaimDaily();

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col safe-pad" data-testid="main-menu-screen">
      {/* top bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-2 p-3">
        <button className="rounded-2xl bg-black/35 px-3 py-1 font-black text-white ring-2 ring-white/60" onClick={() => setView('profile')}>
          ⭐ Lv {lv.level}
          <span className="ml-2 inline-block h-2 w-16 overflow-hidden rounded-full bg-white/30 align-middle">
            <span className="block h-full bg-amber-300" style={{ width: `${(lv.xpIntoLevel / lv.xpNeeded) * 100}%` }} />
          </span>
        </button>
        <div className="rounded-2xl bg-black/35 px-3 py-1 text-xl font-black text-amber-300 ring-2 ring-white/60" data-testid="menu-coins">
          <CoinIcon /> {p.coins}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col landscape:flex-row">
        <div className="pointer-events-auto scroll-y flex min-h-0 flex-1 flex-col px-3 pb-3 landscape:max-w-[46%] landscape:flex-none landscape:basis-[46%]">
          {view === 'home' && (
            <div className="my-auto flex flex-col items-center gap-3 py-2 text-center">
              <div className="logo-text float-y text-5xl leading-none text-amber-300 sm:text-7xl">
                WOBBLY
                <br />
                <span className="text-pink-300">WORLD</span>
              </div>
              <Btn tone="mint" className="w-64 py-3 text-3xl" onClick={() => setView('play')} testId="play-button">
                ▶ PLAY
              </Btn>
              <div className="grid w-64 grid-cols-2 gap-2">
                <Btn tone="pink" onClick={() => setView('characters')} testId="characters-button">Characters</Btn>
                <Btn tone="sun" onClick={() => setView('shop')} testId="shop-button">Shop</Btn>
                <Btn tone="sky" onClick={() => setView('profile')} testId="profile-button">Profile</Btn>
                <Btn tone="grape" onClick={() => setSettings(true)} testId="settings-button">Settings</Btn>
              </div>
              {canDaily && (
                <Btn tone="sun" testId="daily" onClick={() => { if (p.claimDaily()) AudioManager.play('unlock'); }}>
                  🎁 Daily reward +{DAILY_REWARD_COINS}
                </Btn>
              )}
            </div>
          )}
          {view === 'play' && <PlayView onBack={() => setView('home')} />}
          {view === 'characters' && <CharactersView onBack={() => setView('home')} />}
          {view === 'shop' && <ShopView onBack={() => setView('home')} />}
          {view === 'profile' && <ProfileView onBack={() => setView('home')} />}
        </div>
      </div>
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <Btn tone="ghost" onClick={onBack} testId="back" className="!px-3 !py-1">◀</Btn>
      <h2 className="logo-text text-3xl text-white">{title}</h2>
    </div>
  );
}

function PlayView({ onBack }: { onBack: () => void }) {
  const { mode, levelId, worldId, challenge, setSelection, startRace } = useGameStore();
  const completed = usePlayerStore((s) => s.completed);
  const best = usePlayerStore((s) => s.bestTimes);
  const endlessBest = usePlayerStore((s) => s.endlessBest);
  const survivalBest = usePlayerStore((s) => s.survivalBest);
  const generated = mode === 'endless' || mode === 'survival';
  const worldLevels = LevelManager.levelsOf(worldId);

  const pickWorld = (id: typeof worldId) => {
    const first = LevelManager.levelsOf(id)[0];
    setSelection({ worldId: id, levelId: first.id });
  };
  const levelOk = LevelManager.isLevelUnlocked(levelId, completed);
  const worldOk = LevelManager.isWorldUnlocked(worldId, completed);

  return (
    <div className="panel p-3 text-violet-950">
      <Header title="Play" onBack={onBack} />
      <div className="mb-3 grid grid-cols-1 gap-1.5" role="tablist" aria-label="Game mode">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} data-testid={`mode-${m.id}`} onClick={() => setSelection({ mode: m.id })}
            className={`rounded-2xl px-3 py-1.5 text-left transition ${mode === m.id ? 'bg-violet-600 text-white' : 'bg-violet-100 hover:bg-violet-200'}`}>
            <span className="font-black">{m.name}</span> <span className={`text-sm font-semibold ${mode === m.id ? 'text-violet-100' : 'text-violet-500'}`}>— {m.blurb}</span>
          </button>
        ))}
      </div>

      <div className="mb-2 grid grid-cols-4 gap-1.5">
        {LevelManager.worlds.map((w) => {
          const unlocked = LevelManager.isWorldUnlocked(w.id, completed);
          return (
            <button key={w.id} disabled={!unlocked} data-testid={`world-${w.id}`} onClick={() => pickWorld(w.id)}
              className={`rounded-xl p-1 text-center text-xs font-black leading-tight sm:text-sm ${worldId === w.id ? 'ring-4 ring-violet-600' : ''} ${unlocked ? '' : 'opacity-50 grayscale'}`}
              style={{ background: `linear-gradient(160deg, ${w.sky[0]}, ${w.sky[1]})`, color: '#2b1b5a' }}>
              {unlocked ? w.name : '🔒'}
              <div className="hidden text-[10px] font-bold opacity-70 sm:block">{unlocked ? '' : w.name}</div>
            </button>
          );
        })}
      </div>
      <p className="mb-2 text-sm font-bold text-violet-500">{LevelManager.getWorld(worldId).tagline}</p>

      {!generated && (
        <div className="mb-2 flex flex-col gap-1.5">
          {worldLevels.map((l) => {
            const ok = LevelManager.isLevelUnlocked(l.id, completed);
            return (
              <button key={l.id} disabled={!ok} data-testid={`level-${l.id}`} onClick={() => setSelection({ levelId: l.id })}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-left font-black ${levelId === l.id ? 'bg-violet-600 text-white' : 'bg-violet-100'} ${ok ? '' : 'opacity-50'}`}>
                <span>{ok ? '' : '🔒 '}{l.world === worldId ? `${l.index}. ` : ''}{l.name} <span className="text-xs">{'★'.repeat(l.difficulty)}</span></span>
                <span className="text-sm tabular-nums">{completed.includes(l.id) ? '✔ ' : ''}{best[l.id] ? formatTime(best[l.id]) : ''}</span>
              </button>
            );
          })}
          <p className="text-xs font-bold text-violet-400">More levels for this world are on the way.</p>
        </div>
      )}
      {mode === 'challenge' && (
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          {(Object.keys(CHALLENGES) as ChallengeId[]).map((c) => (
            <button key={c} data-testid={`challenge-${c}`} onClick={() => setSelection({ challenge: c })}
              className={`rounded-xl p-1.5 text-center text-xs font-black ${challenge === c ? 'bg-pink-500 text-white' : 'bg-pink-100'}`}>
              {CHALLENGES[c].name}
              <div className="text-[10px] font-bold opacity-80">{CHALLENGES[c].blurb}</div>
            </button>
          ))}
        </div>
      )}
      {generated && (
        <p className="mb-2 text-sm font-bold text-violet-500">
          Best: {Math.round(mode === 'endless' ? endlessBest : survivalBest)} m
        </p>
      )}
      <Btn tone="mint" className="w-full py-2 text-2xl" disabled={generated ? !worldOk : !levelOk} testId="start-race"
        onClick={() => startRace(generated ? LevelManager.levelsOf(worldId)[0].id : levelId, mode, challenge)}>
        START ▶
      </Btn>
    </div>
  );
}

function CharactersView({ onBack }: { onBack: () => void }) {
  const p = usePlayerStore();
  return (
    <div className="panel p-3 text-violet-950">
      <Header title="Characters" onBack={onBack} />
      <div className="grid grid-cols-2 gap-2">
        {CHARACTERS.map((c) => {
          const owned = p.ownedCharacters.includes(c.id);
          const sel = p.selectedCharacter === c.id;
          return (
            <button key={c.id} data-testid={`char-${c.id}`}
              onClick={() => { if (owned) p.selectCharacter(c.id); else if (p.buyCharacter(c.id)) AudioManager.play('unlock'); }}
              disabled={!owned && p.coins < c.cost}
              className={`rounded-2xl p-2 text-left ${sel ? 'ring-4 ring-violet-600' : ''} ${owned ? 'bg-violet-100' : 'bg-slate-100'} disabled:opacity-50`}>
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full border-2 border-white shadow" style={{ background: c.color }} />
                <span className="font-black leading-tight">{c.name}</span>
              </div>
              <div className="mt-1 text-xs font-bold text-violet-500">{c.blurb}</div>
              <div className="mt-1 text-sm font-black">{sel ? '✔ Selected' : owned ? 'Tap to select' : <><CoinIcon /> {c.cost}</>}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ShopTab = 'hat' | 'glasses' | 'accessory' | 'skin' | 'tint';

function ShopView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<ShopTab>('hat');
  const p = usePlayerStore();
  const lists = { hat: HATS, glasses: GLASSES, accessory: ACCESSORIES, skin: SKINS } as const;
  const tabs: { id: ShopTab; label: string }[] = [
    { id: 'hat', label: 'Hats' }, { id: 'glasses', label: 'Glasses' }, { id: 'accessory', label: 'Extras' }, { id: 'skin', label: 'Skins' }, { id: 'tint', label: 'Colors' },
  ];
  return (
    <div className="panel p-3 text-violet-950">
      <Header title="Shop" onBack={onBack} />
      <p className="mb-2 text-xs font-bold text-violet-500">Cosmetics are visual only — they never change how you play.</p>
      <div className="mb-2 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`shop-tab-${t.id}`} className={`rounded-xl px-3 py-1 text-sm font-black ${tab === t.id ? 'bg-violet-600 text-white' : 'bg-violet-100'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'tint' ? (
        <div className="flex flex-wrap gap-2">
          <button className={`h-10 rounded-xl px-3 font-black ${p.loadout.tint === null ? 'ring-4 ring-violet-600' : ''} bg-violet-100`} onClick={() => p.setTint(null)}>Default</button>
          {TINTS.map((c) => (
            <button key={c} aria-label={`Color ${c}`} onClick={() => p.setTint(c)} className={`h-10 w-10 rounded-full border-4 border-white shadow ${p.loadout.tint === c ? 'ring-4 ring-violet-600' : ''}`} style={{ background: c }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {lists[tab].map((item) => {
            const owned = p.ownsCosmetic(tab, item.id);
            const equipped = (p.loadout as any)[tab] === item.id;
            return (
              <button key={item.id} data-testid={`item-${tab}-${item.id}`} disabled={!owned && p.coins < item.cost}
                onClick={() => { if (owned) p.equip(tab, item.id); else if (p.buyCosmetic(tab, item.id)) AudioManager.play('unlock'); }}
                className={`rounded-2xl p-2 text-left font-black ${equipped ? 'ring-4 ring-violet-600' : ''} ${owned ? 'bg-violet-100' : 'bg-slate-100'} disabled:opacity-50`}>
                {item.name}
                <div className="text-sm">{equipped ? '✔ Equipped' : owned ? 'Equip' : <><CoinIcon /> {item.cost}</>}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileView({ onBack }: { onBack: () => void }) {
  const p = usePlayerStore();
  const lv = levelFromXp(p.xp);
  return (
    <div className="panel p-3 text-violet-950">
      <Header title="Profile" onBack={onBack} />
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Level', lv.level], ['Races', p.stats.races], ['Wins', p.stats.wins], ['Podiums', p.stats.podiums], ['Falls', p.stats.falls], ['Coins found', p.stats.coinsCollected]].map(([k, v]) => (
          <div key={k as string} className="rounded-xl bg-violet-100 p-1.5"><div className="text-[10px] font-black uppercase text-violet-400">{k}</div><div className="text-xl font-black">{v}</div></div>
        ))}
      </div>
      <p className="mt-1 text-sm font-bold text-violet-500">XP to next level: {lv.xpNeeded - lv.xpIntoLevel}</p>
      <h3 className="mt-2 font-black">Achievements ({p.achievements.length}/{ACHIEVEMENTS.length})</h3>
      <ul className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const got = p.achievements.includes(a.id);
          return (
            <li key={a.id} className={`rounded-lg px-2 py-1 text-sm ${got ? 'bg-amber-100' : 'bg-slate-100 opacity-70'}`}>
              <b>{got ? '🏅' : '🔒'} {a.name}</b> <span className="text-violet-500">— {a.desc}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
