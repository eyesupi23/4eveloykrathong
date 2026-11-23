import { useEffect, useState } from 'react';
import type { KrathongConfig } from '../types';
import { krathongFrames, SPRITE_H, SPRITE_W } from '../lib/sprite';

interface Props {
  config: KrathongConfig;
  /** CSS width, e.g. 240 or 'calc(...)' */
  width: number | string;
}

export function KrathongSprite({ config, width }: Props) {
  const [frames, setFrames] = useState<[string, string] | null>(null);

  useEffect(() => {
    let alive = true;
    krathongFrames(config).then((f) => alive && setFrames(f));
    return () => {
      alive = false;
    };
  }, [config.base, config.flower, config.image]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="relative block" style={{ width, aspectRatio: `${SPRITE_W} / ${SPRITE_H}` }}>
      {frames && (
        <>
          <img src={frames[0]} alt="" draggable={false} className="pixelated absolute inset-0 h-full w-full" />
          <img src={frames[1]} alt="" draggable={false} className="pixelated flicker absolute inset-0 h-full w-full" />
        </>
      )}
    </span>
  );
}
