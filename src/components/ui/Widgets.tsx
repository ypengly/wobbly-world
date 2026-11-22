import type { ReactNode } from 'react';
import { AudioManager } from '../../game/systems/AudioManager';

export type Tone = 'grape' | 'pink' | 'sun' | 'mint' | 'sky' | 'ghost';

export function Btn({
  children,
  tone = 'grape',
  onClick,
  disabled,
  className = '',
  testId,
}: {
  children: ReactNode;
  tone?: Tone;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <button
      data-testid={testId}
      disabled={disabled}
      className={`chunky-btn btn-${tone} ${className}`}
      onClick={() => {
        AudioManager.unlock();
        AudioManager.play('click');
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-2xl bg-violet-100 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-xl px-3 py-1.5 text-sm font-extrabold transition ${value === o.id ? 'bg-violet-600 text-white shadow' : 'text-violet-700 hover:bg-violet-200'}`}
          style={{ touchAction: 'manipulation' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 font-bold">
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative h-8 w-14 rounded-full transition ${value ? 'bg-emerald-500' : 'bg-slate-300'}`}
        style={{ touchAction: 'manipulation' }}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </label>
  );
}

export function Slider({ label, value, min, max, step = 0.01, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="block py-1.5 font-bold">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-violet-500">{format ? format(value) : Math.round(value * 100) + '%'}</span>
      </div>
      <input aria-label={label} type="range" className="mt-1 w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function Modal({ children, onClose, title, wide }: { children: ReactNode; onClose?: () => void; title?: string; wide?: boolean }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-indigo-950/55 p-3 backdrop-blur-sm safe-pad" style={{ touchAction: 'none' }}>
      <div className={`panel pop-in scroll-y max-h-full w-full ${wide ? 'max-w-3xl' : 'max-w-md'} p-5`}>
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-3xl font-black text-violet-700">{title}</h2>
            {onClose && (
              <button aria-label="Close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-xl font-black text-violet-700">
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export const CoinIcon = () => (
  <span className="inline-block h-5 w-5 rounded-full border-2 border-amber-600 bg-amber-300 align-[-3px] shadow-inner" aria-hidden />
);
