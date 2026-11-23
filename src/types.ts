export type BaseId = 'banana' | 'bread' | 'trunk';
/** Ornament on the krathong (the field is still called `flower` so saved krathongs keep working). */
export type FlowerId = 'sun' | 'sunflower' | 'dino' | 'rose' | 'banana' | 'peach' | 'rabbit';

export interface KrathongConfig {
  base: BaseId;
  flower: FlowerId;
  /** 32×32 lightly pixelated PNG data URL, or null */
  image: string | null;
  wish: string;
  name: string;
}

export interface FloatingKrathong {
  id: string;
  config: KrathongConfig;
  /** 0 = far (top of river, small), 1 = near (bottom, big) */
  lane: number;
  /** seconds to cross the screen */
  duration: number;
  /** seconds; negative starts mid-river */
  delay: number;
  mine: boolean;
  fresh: boolean;
  /** Database id, for krathongs that came from Supabase */
  remoteId?: string;
  /** Drift path in px (start/end translateX). Unset = default -30vw → 110vw. */
  from?: number;
  to?: number;
}
