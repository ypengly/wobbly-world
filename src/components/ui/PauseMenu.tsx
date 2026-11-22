import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { RaceManager } from '../../game/systems/RaceManager';
import { Btn, Modal } from './Widgets';
import { SettingsPanel } from './SettingsPanel';

export function PauseMenu() {
  const { setPaused, restartRace, quitToMenu, mode } = useGameStore();
  const [settings, setSettings] = useState(false);
  if (settings) return <SettingsPanel onClose={() => setSettings(false)} />;
  return (
    <Modal title="Paused">
      <div className="flex flex-col gap-3 text-center">
        <Btn tone="mint" onClick={() => setPaused(false)} testId="resume" className="text-xl">
          ▶ Resume
        </Btn>
        {(mode === 'endless' || mode === 'survival') && (
          <Btn
            tone="sun"
            testId="end-run"
            onClick={() => {
              setPaused(false);
              RaceManager.endRace(false);
            }}
          >
            🏁 End run &amp; see score
          </Btn>
        )}
        <Btn tone="sky" onClick={restartRace} testId="restart">
          ↻ Restart
        </Btn>
        <Btn tone="grape" onClick={() => setSettings(true)} testId="pause-settings">
          ⚙ Settings
        </Btn>
        <Btn tone="ghost" onClick={quitToMenu} testId="main-menu">
          ⌂ Main menu
        </Btn>
      </div>
    </Modal>
  );
}
