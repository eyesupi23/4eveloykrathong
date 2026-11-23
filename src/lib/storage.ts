import type { FlowerId, KrathongConfig } from '../types';
import { FLOWERS } from './data';
import { adminClearAll } from './remote';

const KEY = 'loykrathong:mine';
const MAX = 12;

export function loadMine(): KrathongConfig[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as KrathongConfig[]) : [];
    return Array.isArray(list) ? list.slice(-MAX).map(migrate) : [];
  } catch {
    return [];
  }
}

// Krathongs saved before the ornament update used flower ids that no longer exist.
const OLD_FLOWERS: Record<string, FlowerId> = { marigold: 'sun', orchid: 'rabbit', lotus: 'peach' };

function migrate(cfg: KrathongConfig): KrathongConfig {
  if (cfg.flower in FLOWERS) return cfg;
  return { ...cfg, flower: OLD_FLOWERS[cfg.flower as string] ?? 'sun' };
}

export function saveMine(cfg: KrathongConfig) {
  try {
    const list = [...loadMine(), cfg].slice(-MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the krathong still floats, it just won't be remembered.
  }
}

export function clearMine() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: nothing was saved anyway.
  }
}

const IDS_KEY = 'loykrathong:mine-ids';

/** Database ids of krathongs floated from this browser, so they aren't shown twice as "someone else's". */
export function loadMineIds(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(IDS_KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addMineId(id: string) {
  try {
    localStorage.setItem(IDS_KEY, JSON.stringify([...loadMineIds(), id].slice(-200)));
  } catch {
    // ignore
  }
}

/**
 * Admin: wipe every krathong. With Supabase connected this calls a database function that checks
 * the admin code on the server and deletes every row; this browser's saved krathongs are cleared too.
 */
export async function clearAllKrathongs(code: string): Promise<void> {
  await adminClearAll(code);
  clearMine();
  try {
    localStorage.removeItem(IDS_KEY);
  } catch {
    // ignore
  }
}
