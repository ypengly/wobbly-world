import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { usePlayerStore } from '../../store/playerStore';
import { Btn, Modal, Segmented, Slider, Toggle } from './Widgets';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useSettingsStore();
  const resetProgress = usePlayerStore((p) => p.resetProgress);
  const [confirm, setConfirm] = useState(false);

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="text-violet-950">
        <h3 className="mt-1 text-sm font-black uppercase tracking-wider text-violet-400">Touch controls</h3>
        <div className="flex items-center justify-between py-1.5 font-bold">
          <span>Show touch controls</span>
          <Segmented value={s.touchControls} onChange={(v) => s.set('touchControls', v)} options={[{ id: 'auto', label: 'Auto' }, { id: 'on', label: 'On' }, { id: 'off', label: 'Off' }]} />
        </div>
        <div className="flex items-center justify-between py-1.5 font-bold">
          <span>Control size</span>
          <Segmented value={s.controlSize} onChange={(v) => s.set('controlSize', v)} options={[{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }]} />
        </div>
        <Slider label="Control opacity" value={s.joystickOpacity} min={0.2} max={1} onChange={(v) => s.set('joystickOpacity', v)} />
        <Slider label="Joystick dead zone" value={s.deadZone} min={0.05} max={0.4} onChange={(v) => s.set('deadZone', v)} />
        <Toggle label="Left-handed mode" value={s.leftHanded} onChange={(v) => s.set('leftHanded', v)} />
        <Toggle label="Vibration" value={s.vibration} onChange={(v) => s.set('vibration', v)} />

        <h3 className="mt-3 text-sm font-black uppercase tracking-wider text-violet-400">Graphics</h3>
        <div className="flex items-center justify-between py-1.5 font-bold">
          <span>Quality</span>
          <Segmented value={s.graphics} onChange={(v) => s.set('graphics', v)} options={[{ id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }]} />
        </div>
        <Slider label="Camera distance" value={s.cameraDistance} min={6} max={14} step={0.5} format={(v) => v.toFixed(1)} onChange={(v) => s.set('cameraDistance', v)} />

        <h3 className="mt-3 text-sm font-black uppercase tracking-wider text-violet-400">Audio</h3>
        <Slider label="Music volume" value={s.musicVolume} min={0} max={1} onChange={(v) => s.set('musicVolume', v)} />
        <Slider label="Sound effects volume" value={s.sfxVolume} min={0} max={1} onChange={(v) => s.set('sfxVolume', v)} />

        <h3 className="mt-3 text-sm font-black uppercase tracking-wider text-violet-400">Data</h3>
        {!confirm ? (
          <Btn tone="pink" onClick={() => setConfirm(true)} className="mt-1" testId="reset-progress">
            Reset progress…
          </Btn>
        ) : (
          <div className="mt-1 rounded-2xl bg-rose-50 p-3">
            <p className="font-bold text-rose-700">This erases coins, unlocks, best times and achievements. Really reset?</p>
            <div className="mt-2 flex gap-2">
              <Btn tone="pink" testId="confirm-reset" onClick={() => { resetProgress(); setConfirm(false); }}>
                Yes, erase everything
              </Btn>
              <Btn tone="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Btn>
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-between">
          <Btn tone="ghost" onClick={s.reset}>
            Defaults
          </Btn>
          <Btn tone="mint" onClick={onClose}>
            Done
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
