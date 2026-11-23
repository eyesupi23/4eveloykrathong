import { memo, useEffect, useState, type CSSProperties } from 'react';
import type { FloatingKrathong as Floating } from '../types';
import { HORIZON } from '../lib/scene';
import { KrathongSprite } from './KrathongSprite';

interface Props {
  item: Floating;
  onDone: (id: string) => void;
}

export const FloatingKrathong = memo(function FloatingKrathong({ item, onDone }: Props) {
  const [open, setOpen] = useState(item.fresh);
  const { config, lane } = item;

  // A freshly floated krathong shows its wish for a while, then tucks it away.
  useEffect(() => {
    if (!item.fresh) return;
    const t = setTimeout(() => setOpen(false), 9000);
    return () => clearTimeout(t);
  }, [item.fresh]);

  const riverTop = HORIZON * 100 + 3;
  const top = `${riverTop + lane * (96 - riverTop)}%`;
  const mine = item.mine;
  // far = small, near = big; your own krathong is drawn bigger so it stands out
  const size = (1.5 + lane * 1.9) * (mine ? 1.45 : 1);
  const width = `calc(${Math.round(48 * size)}px * var(--k))`;

  return (
    <div
      className={`drift pointer-events-none absolute left-0 ${mine ? 'is-mine' : 'is-visitor'}`}
      style={{
        top,
        zIndex: 10 + Math.round(lane * 20) + (mine ? 40 : 0),
        animationDuration: `${item.duration}s`,
        animationDelay: `${item.delay}s`,
        ...(item.from !== undefined && { '--drift-from': `${item.from}px` }),
        ...(item.to !== undefined && { '--drift-to': `${item.to}px` }),
      } as CSSProperties}
      onAnimationEnd={(e) => e.target === e.currentTarget && onDone(item.id)}
    >
      <div className="bob relative">
        {mine && (
          <>
            <span className="aura pointer-events-none absolute left-1/2 top-[55%] aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2" />
            <span className="sparkle pointer-events-none absolute left-[-6%] top-[18%]" />
            <span className="sparkle pointer-events-none absolute right-[-4%] top-[4%] [animation-delay:-0.6s]" />
            <span className="sparkle pointer-events-none absolute right-[-10%] top-[52%] [animation-delay:-1.1s]" />
            <span className="sparkle pointer-events-none absolute left-[8%] top-[-10%] [animation-delay:-0.3s]" />
          </>
        )}
        <span className="glow pointer-events-none absolute left-[63%] top-[30%] aspect-square w-[70%] -translate-x-1/2 -translate-y-1/2" />
        <button
          type="button"
          className="krathong-btn pointer-events-auto relative block cursor-pointer"
          aria-label={`กระทง: ${config.wish}`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <KrathongSprite config={config} width={width} />
        </button>
        <span className={`ripple pointer-events-none absolute bottom-[6%] left-[4%] right-[4%] ${mine ? 'ripple-gold h-[4px]' : 'h-[3px]'}`} />
        {mine && !open && (
          <span className="mine-tag pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap px-2 py-1 font-pixel text-[8px] leading-none">
            ★ ของฉัน
          </span>
        )}

        {open && (
          <div className="px-bubble pointer-events-none absolute bottom-full left-1/2 mb-4 w-max -translate-x-1/2 max-w-[15rem] px-3 py-2 text-left">
            {item.mine && <p className="font-pixel text-[8px] leading-4 text-[#c2410c]">★ กระทงของคุณ</p>}
            <p className="text-sm font-semibold leading-snug">{config.wish}</p>
            {config.name && <p className="mt-0.5 text-xs text-[#4b5294]">จาก {config.name}</p>}
          </div>
        )}
      </div>
    </div>
  );
});
