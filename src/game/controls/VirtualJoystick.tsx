import { useCallback, useEffect, useRef } from 'react';

interface Props {
  /** diameter of the outer ring in px */
  size: number;
  opacity: number;
  deadZone: number;
  onChange: (x: number, y: number) => void;
}

/**
 * Pointer-capture based virtual joystick.
 * - output x: right = +1, y: forward (screen up) = +1
 * - magnitude is clamped to 1 so diagonals are normalised
 * - dead zone is rescaled so there is no jump when leaving the dead zone
 */
export function VirtualJoystick({ size, opacity, deadZone, onChange }: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);

  const setThumb = (dx: number, dy: number) => {
    if (thumbRef.current) thumbRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const release = useCallback(() => {
    activePointer.current = null;
    setThumb(0, 0);
    onChange(0, 0); // input must return to neutral immediately
  }, [onChange]);

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect(); // re-measured every move: robust to resize/rotation
      const radius = rect.width / 2;
      const cx = rect.left + radius;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const maxTravel = radius * 0.8;
      if (dist > maxTravel) {
        dx = (dx / dist) * maxTravel;
        dy = (dy / dist) * maxTravel;
      }
      setThumb(dx, dy);

      let mag = Math.min(dist / maxTravel, 1);
      if (mag < deadZone) {
        onChange(0, 0);
        return;
      }
      mag = (mag - deadZone) / (1 - deadZone);
      const ang = Math.atan2(dy, dx);
      onChange(Math.cos(ang) * mag, -Math.sin(ang) * mag);
    },
    [deadZone, onChange],
  );

  useEffect(() => {
    // make sure nothing is stuck if the component unmounts mid-drag, or the tab loses focus
    const onHide = () => {
      if (activePointer.current !== null) release();
    };
    window.addEventListener('blur', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('blur', onHide);
      document.removeEventListener('visibilitychange', onHide);
      onChange(0, 0);
    };
  }, [onChange, release]);

  return (
    <div
      ref={zoneRef}
      data-testid="joystick-zone"
      className="relative flex items-center justify-center"
      style={{ width: size * 1.5, height: size * 1.5, touchAction: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (activePointer.current !== null) return; // only one finger drives the stick
        e.preventDefault();
        activePointer.current = e.pointerId;
        try {
          zoneRef.current?.setPointerCapture(e.pointerId);
        } catch {
          /* some browsers throw for synthetic pointers */
        }
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== activePointer.current) return;
        e.preventDefault();
        update(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== activePointer.current) return;
        release();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId !== activePointer.current) return;
        release();
      }}
      onLostPointerCapture={(e) => {
        if (e.pointerId !== activePointer.current) return;
        release();
      }}
    >
      <div
        ref={baseRef}
        data-testid="joystick-base"
        className="relative rounded-full"
        style={{
          width: size,
          height: size,
          opacity,
          background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0.32))',
          border: '4px solid rgba(255,255,255,0.75)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.35), inset 0 0 18px rgba(255,255,255,0.25)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div
          ref={thumbRef}
          data-testid="joystick-thumb"
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '50%',
            width: size * 0.42,
            height: size * 0.42,
            marginLeft: -(size * 0.21),
            marginTop: -(size * 0.21),
            background: 'linear-gradient(180deg, #ffffff, #d9c9ff)',
            border: '3px solid #7c3aed',
            boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  );
}
