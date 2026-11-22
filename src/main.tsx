import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './app/App';
import { RaceManager } from './game/systems/RaceManager';
import { useGameStore } from './store/gameStore';
import { usePlayerStore } from './store/playerStore';
import { useSettingsStore } from './store/settingsStore';
import { InputManager } from './game/controls/InputManager';

// Debug / test handle (used by the automated browser checks described in the README)
(window as any).__ww = { RaceManager, useGameStore, usePlayerStore, useSettingsStore, InputManager };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
