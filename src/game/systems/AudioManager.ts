import { Howl, Howler } from 'howler';
import { useSettingsStore } from '../../store/settingsStore';
import { mulberry32 } from '../../utils/math';

/**
 * All audio is synthesised procedurally into WAV data URIs (no external files, no licensing issues).
 * Nothing plays until the user has interacted with the page.
 */

type Wave = 'sine' | 'square' | 'tri' | 'saw' | 'noise';
interface Seg {
  t: number; // start (s)
  d: number; // duration (s)
  f: number; // start freq
  f2?: number; // end freq (slide)
  w?: Wave;
  v?: number; // volume 0..1
  a?: number; // attack
}

const SR = 22050;

function render(segs: Seg[], total: number): Float32Array {
  const n = Math.ceil(total * SR);
  const buf = new Float32Array(n);
  const rnd = mulberry32(1337);
  for (const s of segs) {
    const start = Math.floor(s.t * SR);
    const len = Math.floor(s.d * SR);
    let phase = 0;
    const attack = Math.max(0.002, s.a ?? 0.006);
    for (let i = 0; i < len && start + i < n; i++) {
      const p = i / len;
      const f = s.f + ((s.f2 ?? s.f) - s.f) * p;
      phase += (f * 2 * Math.PI) / SR;
      let o: number;
      switch (s.w ?? 'sine') {
        case 'square':
          o = Math.sin(phase) >= 0 ? 0.6 : -0.6;
          break;
        case 'tri':
          o = (2 / Math.PI) * Math.asin(Math.sin(phase));
          break;
        case 'saw':
          o = ((phase / Math.PI) % 2) - 1;
          break;
        case 'noise':
          o = rnd() * 2 - 1;
          break;
        default:
          o = Math.sin(phase);
      }
      const tt = i / SR;
      const env = Math.min(1, tt / attack) * Math.pow(1 - p, 1.6);
      buf[start + i] += o * env * (s.v ?? 0.5);
    }
  }
  // soft clip
  for (let i = 0; i < n; i++) buf[i] = Math.tanh(buf[i] * 1.1);
  return buf;
}

function toWavUri(samples: Float32Array): string {
  const n = samples.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buffer);
  const wr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  wr(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  wr(8, 'WAVE');
  wr(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SR, true);
  v.setUint32(28, SR * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  wr(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let bin = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return 'data:audio/wav;base64,' + btoa(bin);
}

const N = (name: string) => {
  const idx: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const m = /^([A-G])(#?)(\d)$/.exec(name)!;
  const semis = idx[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3]) - 4) * 12 - 9; // relative to A4
  return 440 * Math.pow(2, semis / 12);
};

export type SfxName =
  | 'jump'
  | 'land'
  | 'hit'
  | 'coin'
  | 'checkpoint'
  | 'tick'
  | 'go'
  | 'finish'
  | 'bounce'
  | 'click'
  | 'fall'
  | 'unlock';

const SFX_DEFS: Record<SfxName, { segs: Seg[]; total: number; vol: number }> = {
  jump: { segs: [{ t: 0, d: 0.18, f: 280, f2: 620, w: 'square', v: 0.35 }], total: 0.2, vol: 0.6 },
  land: {
    segs: [
      { t: 0, d: 0.12, f: 140, f2: 60, w: 'sine', v: 0.7 },
      { t: 0, d: 0.06, f: 0, w: 'noise', v: 0.2 },
    ],
    total: 0.14,
    vol: 0.7,
  },
  hit: {
    segs: [
      { t: 0, d: 0.25, f: 220, f2: 70, w: 'saw', v: 0.5 },
      { t: 0, d: 0.15, f: 0, w: 'noise', v: 0.45 },
    ],
    total: 0.28,
    vol: 0.9,
  },
  coin: {
    segs: [
      { t: 0, d: 0.07, f: N('B5'), w: 'square', v: 0.28 },
      { t: 0.06, d: 0.18, f: N('E6'), w: 'square', v: 0.28 },
    ],
    total: 0.26,
    vol: 0.7,
  },
  checkpoint: {
    segs: [
      { t: 0, d: 0.12, f: N('C5'), w: 'tri', v: 0.5 },
      { t: 0.1, d: 0.12, f: N('E5'), w: 'tri', v: 0.5 },
      { t: 0.2, d: 0.3, f: N('G5'), w: 'tri', v: 0.5 },
    ],
    total: 0.55,
    vol: 0.8,
  },
  tick: { segs: [{ t: 0, d: 0.16, f: 440, w: 'square', v: 0.3 }], total: 0.18, vol: 0.7 },
  go: {
    segs: [
      { t: 0, d: 0.5, f: 880, w: 'square', v: 0.3 },
      { t: 0, d: 0.5, f: 1320, w: 'tri', v: 0.25 },
    ],
    total: 0.52,
    vol: 0.8,
  },
  finish: {
    segs: [
      { t: 0, d: 0.15, f: N('C5'), w: 'square', v: 0.3 },
      { t: 0.15, d: 0.15, f: N('E5'), w: 'square', v: 0.3 },
      { t: 0.3, d: 0.15, f: N('G5'), w: 'square', v: 0.3 },
      { t: 0.45, d: 0.6, f: N('C6'), w: 'square', v: 0.32 },
      { t: 0.45, d: 0.6, f: N('E6'), w: 'tri', v: 0.25 },
    ],
    total: 1.1,
    vol: 0.9,
  },
  bounce: { segs: [{ t: 0, d: 0.3, f: 200, f2: 900, w: 'sine', v: 0.5 }], total: 0.32, vol: 0.7 },
  click: { segs: [{ t: 0, d: 0.05, f: 700, f2: 500, w: 'square', v: 0.2 }], total: 0.06, vol: 0.6 },
  fall: { segs: [{ t: 0, d: 0.5, f: 600, f2: 90, w: 'tri', v: 0.45 }], total: 0.52, vol: 0.7 },
  unlock: {
    segs: [
      { t: 0, d: 0.1, f: N('E5'), w: 'square', v: 0.25 },
      { t: 0.1, d: 0.1, f: N('G5'), w: 'square', v: 0.25 },
      { t: 0.2, d: 0.1, f: N('B5'), w: 'square', v: 0.25 },
      { t: 0.3, d: 0.4, f: N('E6'), w: 'square', v: 0.28 },
    ],
    total: 0.75,
    vol: 0.8,
  },
};

type Track = 'menu' | 'race' | 'victory';

function composeTrack(kind: Track): { uri: string; vol: number; loop: boolean } {
  if (kind === 'victory') {
    const notes = ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6', 'G6'];
    const segs: Seg[] = notes.map((n, i) => ({ t: i * 0.16, d: i === 7 ? 0.9 : 0.15, f: N(n), w: 'square', v: 0.22 }));
    segs.push({ t: 0, d: 1.0, f: N('C3'), w: 'tri', v: 0.3 }, { t: 1.2, d: 1.0, f: N('G3'), w: 'tri', v: 0.3 });
    return { uri: toWavUri(render(segs, 2.4)), vol: 0.9, loop: false };
  }
  const fast = kind === 'race';
  const step = fast ? 0.17 : 0.24;
  const prog = [
    ['C', 'E', 'G'],
    ['A', 'C', 'E'],
    ['F', 'A', 'C'],
    ['G', 'B', 'D'],
  ];
  const roots = ['C3', 'A2', 'F2', 'G2'];
  const scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'];
  const rnd = mulberry32(fast ? 42 : 7);
  const segs: Seg[] = [];
  const stepsPerChord = 8;
  const total = stepsPerChord * 4 * step;
  let melodyIdx = 3;
  for (let c = 0; c < 4; c++) {
    for (let s = 0; s < stepsPerChord; s++) {
      const t = (c * stepsPerChord + s) * step;
      // bass on every beat
      if (s % 2 === 0) segs.push({ t, d: step * 1.8, f: N(roots[c]), w: 'tri', v: 0.4 });
      // arpeggio
      const chordNote = prog[c][s % 3] + '4';
      segs.push({ t, d: step * 0.9, f: N(chordNote), w: 'square', v: 0.08 });
      // melody
      if (rnd() < 0.7) {
        melodyIdx = Math.max(0, Math.min(scale.length - 1, melodyIdx + Math.round((rnd() - 0.5) * 3)));
        segs.push({ t, d: step * (rnd() < 0.3 ? 1.9 : 0.9), f: N(scale[melodyIdx]), w: 'square', v: 0.11 });
      }
      // hats / kick
      if (fast) segs.push({ t, d: 0.03, f: 0, w: 'noise', v: 0.07 });
      if (s % 4 === 0) segs.push({ t, d: 0.1, f: 120, f2: 45, w: 'sine', v: 0.45 });
    }
  }
  return { uri: toWavUri(render(segs, total)), vol: fast ? 0.55 : 0.5, loop: true };
}

class AudioManagerImpl {
  private sfx = new Map<SfxName, Howl>();
  private tracks = new Map<Track, { howl: Howl; vol: number }>();
  private current: Track | null = null;
  private unlocked = false;
  private pendingTrack: Track | null = null;

  /** Call from a user gesture. Creates the audio context and starts any queued music. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      Howler.autoUnlock = true;
      (Howler.ctx as AudioContext | undefined)?.resume?.();
    } catch {
      /* ignore */
    }
    if (this.pendingTrack) this.playMusic(this.pendingTrack);
  }

  get isUnlocked() {
    return this.unlocked;
  }

  private sfxVol() {
    return useSettingsStore.getState().sfxVolume;
  }
  private musicVol() {
    return useSettingsStore.getState().musicVolume;
  }

  play(name: SfxName, rate = 1, volume = 1) {
    if (!this.unlocked) return;
    const vol = this.sfxVol();
    if (vol <= 0) return;
    let h = this.sfx.get(name);
    if (!h) {
      const def = SFX_DEFS[name];
      h = new Howl({ src: [toWavUri(render(def.segs, def.total))], format: ['wav'], volume: def.vol });
      this.sfx.set(name, h);
    }
    const id = h.play();
    h.volume(SFX_DEFS[name].vol * vol * volume, id);
    h.rate(rate, id);
  }

  playMusic(kind: Track) {
    this.pendingTrack = kind;
    if (!this.unlocked) return; // never autoplay before the first user interaction
    if (this.current === kind && this.tracks.get(kind)?.howl.playing()) return;
    this.stopMusic();
    let t = this.tracks.get(kind);
    if (!t) {
      const c = composeTrack(kind);
      t = { howl: new Howl({ src: [c.uri], format: ['wav'], loop: c.loop, volume: 0 }), vol: c.vol };
      this.tracks.set(kind, t);
    }
    this.current = kind;
    const id = t.howl.play();
    t.howl.fade(0, t.vol * this.musicVol(), 600, id);
  }

  stopMusic() {
    if (this.current) {
      const t = this.tracks.get(this.current);
      t?.howl.stop();
    }
    this.current = null;
  }

  pauseMusic() {
    if (this.current) this.tracks.get(this.current)?.howl.pause();
  }
  resumeMusic() {
    if (this.current && this.unlocked) this.tracks.get(this.current)?.howl.play();
  }

  /** Re-apply volume after the settings change */
  refreshVolumes() {
    if (this.current) {
      const t = this.tracks.get(this.current);
      t?.howl.volume(t.vol * this.musicVol());
    }
  }
}

export const AudioManager = new AudioManagerImpl();

useSettingsStore.subscribe(() => AudioManager.refreshVolumes());
