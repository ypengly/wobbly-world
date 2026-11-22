import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  size: number;
  opacity: number;
  label: string;
  icon?: ReactNode;
  gradient: string;
  testId?: string;
  /** 0..1 ring drawn around the button (stamina) */
  ring?: number;
  onDown: () => void;
  onUp: () => void;
}

/** Hold-style touch button using pointer capture; works alongside the joystick (multi-touch). */
export function ActionButton({ size, opacity, label, icon, gradient, testId, ring, onDown, onUp }: Props) {
  const [pressed, setPressed] = useState(false);
  const pointer = useRef<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const release = useCallback(() => {
    if (pointer.current === null) return;
    pointer.current = null;
    setPressed(false);
    onUp();
  }, [onUp]);

  useEffect(() => {
    const onHide = () => release();
    window.addEventListener('blur', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('blur', onHide);
      document.removeEventListener('visibilitychange', onHide);
      if (pointer.current !== null) onUp();
    };
  }, [release, onUp]);

  return (
    <div
      ref={ref}
      role="button"
      aria-label={label}
      data-testid={testId}
      className="relative flex select-none items-center justify-center rounded-full font-extrabold text-white"
      style={{
        width: size,
        height: size,
        opacity: pressed ? 1 : opacity,
        background: gradient,
        border: '4px solid rgba(255,255,255,0.9)',
        boxShadow: pressed
          ? '0 2px 0 rgba(0,0,0,0.3), inset 0 0 22px rgba(255,255,255,0.45)'
          : '0 8px 0 rgba(0,0,0,0.3), 0 14px 22px rgba(0,0,0,0.3)',
        transform: pressed ? 'translateY(6px) scale(0.94)' : 'none',
        transition: 'transform 0.06s ease, box-shadow 0.06s ease',
        touchAction: 'none',
        textShadow: '0 2px 0 rgba(0,0,0,0.25)',
        fontSize: size * 0.2,
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (pointer.current !== null) return;
        e.preventDefault();
        pointer.current = e.pointerId;
        try {
          ref.current?.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        setPressed(true);
        onDown();
      }}
      onPointerUp={(e) => {
        if (e.pointerId === pointer.current) release();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === pointer.current) release();
      }}
      onLostPointerCapture={(e) => {
        if (e.pointerId === pointer.current) release();
      }}
    >
      {ring !== undefined && (
        <svg className="pointer-events-none absolute inset-0" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="5" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={ring < 0.2 ? '#ff5470' : '#fff'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0, ring) * 289} 289`}
            transform="rotate(-90 50 50)"
          />
        </svg>
      )}
      <div className="pointer-events-none flex flex-col items-center leading-none">
        {icon}
        <span>{label}</span>
      </div>
    </div>
  );
}
