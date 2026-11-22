import { useCallback, useEffect } from 'react';
import { VirtualJoystick } from './VirtualJoystick';
import { ActionButton } from './ActionButton';
import { InputManager } from './InputManager';
import { useSettingsStore } from '../../store/settingsStore';
import { useGameStore } from '../../store/gameStore';
import { vibrate } from '../../hooks/useMobileControls';

const SCALE = { small: 0.8, medium: 1, large: 1.25 } as const;

/**
 * Mobile control overlay. Joystick bottom-left, Jump bottom-right, Sprint beside/above Jump.
 * Left-handed mode mirrors the layout. Each control owns its own pointer so multi-touch works.
 */
export function TouchControls() {
  const controlSize = useSettingsStore((s) => s.controlSize);
  const opacity = useSettingsStore((s) => s.joystickOpacity);
  const left = useSettingsStore((s) => s.leftHanded);
  const deadZone = useSettingsStore((s) => s.deadZone);
  const vibration = useSettingsStore((s) => s.vibration);
  const stamina = useGameStore((s) => s.hud.stamina);

  const k = SCALE[controlSize];
  // Cap by viewport height so landscape phones keep room for the course
  const vh = typeof window !== 'undefined' ? Math.min(window.innerHeight, window.innerWidth) : 400;
  const cap = Math.max(0.5, Math.min(1, vh / 420));
  const joy = Math.round(130 * k * cap);
  const jump = Math.round(104 * k * cap);
  const sprint = Math.round(78 * k * cap);

  const onJoy = useCallback((x: number, y: number) => InputManager.setJoystick(x, y), []);
  const jumpDown = useCallback(() => {
    InputManager.setTouchJump(true);
    if (vibration) vibrate(12);
  }, [vibration]);
  const jumpUp = useCallback(() => InputManager.setTouchJump(false), []);
  const sprintDown = useCallback(() => InputManager.setTouchSprint(true), []);
  const sprintUp = useCallback(() => InputManager.setTouchSprint(false), []);

  // Safe reset when the touch sequence is interrupted
  useEffect(() => {
    const reset = () => InputManager.resetTouch();
    window.addEventListener('blur', reset);
    window.addEventListener('pagehide', reset);
    window.addEventListener('orientationchange', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      window.removeEventListener('blur', reset);
      window.removeEventListener('pagehide', reset);
      window.removeEventListener('orientationchange', reset);
      document.removeEventListener('visibilitychange', reset);
      InputManager.resetTouch();
    };
  }, []);

  const side = (isLeft: boolean) => (isLeft ? { left: 0 } : { right: 0 });
  const joyLeft = !left;

  return (
    <div
      data-testid="touch-controls"
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        paddingLeft: 'max(env(safe-area-inset-left, 0px), 12px)',
        paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 14px)',
      }}
    >
      {/* joystick */}
      <div className="pointer-events-auto absolute bottom-0" style={{ ...side(joyLeft), margin: '0 6px max(env(safe-area-inset-bottom, 0px), 8px)' }}>
        <VirtualJoystick size={joy} opacity={opacity} deadZone={deadZone} onChange={onJoy} />
      </div>

      {/* actions */}
      <div
        className="pointer-events-auto absolute bottom-0 flex items-end gap-3"
        style={{
          ...side(!joyLeft),
          margin: '0 14px max(env(safe-area-inset-bottom, 0px), 22px)',
          flexDirection: joyLeft ? 'row' : 'row-reverse',
        }}
      >
        <div style={{ marginBottom: jump * 0.55 }}>
          <ActionButton
            testId="sprint-button"
            size={sprint}
            opacity={opacity}
            label="RUN"
            ring={stamina}
            gradient="linear-gradient(180deg,#ffd84d,#ff9f1c)"
            onDown={sprintDown}
            onUp={sprintUp}
          />
        </div>
        <ActionButton
          testId="jump-button"
          size={jump}
          opacity={opacity}
          label="JUMP"
          gradient="linear-gradient(180deg,#5fc4ff,#2a8ff0)"
          onDown={jumpDown}
          onUp={jumpUp}
        />
      </div>
    </div>
  );
}
