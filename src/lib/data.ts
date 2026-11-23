import type { BaseId, FloatingKrathong, FlowerId, KrathongConfig } from '../types';

export interface BaseStyle {
  name: string;
  body: string;
  fold: string;
  light: string;
  dark: string;
  rim: string;
  pattern: 'fold' | 'dots';
}

export interface FlowerStyle {
  name: string;
  a: string;
  b: string;
  c: string;
  center: string;
  dark: string;
}

export const BASES: Record<BaseId, BaseStyle> = {
  banana: { name: 'ใบตอง', body: '#3fa34d', fold: '#2b7a3a', light: '#7ed957', dark: '#1d5229', rim: '#5cc45f', pattern: 'fold' },
  bread: { name: 'ขนมปัง', body: '#d99a4e', fold: '#b4732f', light: '#f2c27b', dark: '#7a4a1c', rim: '#e8b066', pattern: 'dots' },
  trunk: { name: 'หยวกกล้วย', body: '#d4e3a6', fold: '#aabd78', light: '#f3f8dc', dark: '#6f7c45', rim: '#8fcf63', pattern: 'fold' },
};

export const FLOWERS: Record<FlowerId, FlowerStyle> = {
  // Each ornament gets a flower dome in colours that make it pop.
  sun: { name: 'mind', a: '#ff8fc7', b: '#d6336c', c: '#ffd6ec', center: '#ffd43b', dark: '#a61e4d' },
  sunflower: { name: 'jorin', a: '#d0ebff', b: '#5c7cfa', c: '#ffffff', center: '#ffd43b', dark: '#3b5bdb' },
  dino: { name: 'taaom', a: '#ffe066', b: '#f59f00', c: '#fff3bf', center: '#e8590c', dark: '#a85d00' },
  rose: { name: 'hannah', a: '#ffc2d1', b: '#fff0f5', c: '#ffb3c1', center: '#ffd166', dark: '#c9184a' },
  banana: { name: 'fai', a: '#ffffff', b: '#3f9e44', c: '#ffd6ec', center: '#ffd43b', dark: '#1d5229' },
  peach: { name: 'punch', a: '#d3f9d8', b: '#40c057', c: '#ffffff', center: '#ff8fab', dark: '#2b8a3e' },
  rabbit: { name: 'aheye', a: '#9b5de5', b: '#c77dff', c: '#e5dbff', center: '#ffd166', dark: '#5a2a8c' },
};

export const BASE_IDS = Object.keys(BASES) as BaseId[];
export const FLOWER_IDS = Object.keys(FLOWERS) as FlowerId[];

export const WISH_MAX = 40;
export const NAME_MAX = 16;

const SAMPLE_WISHES = [
  'ขอให้สอบผ่านทุกวิชา',
  'ขอให้ครอบครัวแข็งแรง',
  'ขอให้เจอคนที่ใช่สักที',
  'ขอให้งานปังทั้งปี',
  'ขอขมาพระแม่คงคา',
  'ขอให้ปีหน้าดีกว่าปีนี้',
  'ขอให้แมวที่บ้านอ้วนท้วน',
  'ขอให้มีเงินเก็บเยอะๆ',
  'ขอให้แม่หายป่วยไวๆ',
  'ขอให้ได้งานใหม่',
  'ขอให้ได้ไปเที่ยวญี่ปุ่น',
  'ขอให้เราสองคนรักกันนานๆ',
  'ขอให้ทุกคนปลอดภัย',
  'ขอให้โค้ดไม่มีบั๊ก',
];

const SAMPLE_NAMES = ['มิว', 'ต้น', 'แพรว', 'บอส', 'น้ำหวาน', 'พลอย', 'เจ', 'ฟ้า', ''];

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
export const uid = () => Math.random().toString(36).slice(2, 10);

export function randomConfig(): KrathongConfig {
  return {
    base: pick(BASE_IDS),
    flower: pick(FLOWER_IDS),
    image: null,
    wish: pick(SAMPLE_WISHES),
    name: pick(SAMPLE_NAMES),
  };
}

interface FloatOptions {
  mine?: boolean;
  fresh?: boolean;
  lane?: number;
  /** start somewhere along the river instead of at the left edge */
  spread?: boolean;
}

export function makeFloating(config: KrathongConfig, opts: FloatOptions = {}): FloatingKrathong {
  const lane = opts.lane ?? Math.random();
  // Far krathongs move slower, which reads as depth.
  // Your own krathong drifts slower so it stays on screen longer (easier to screenshot).
  const duration = (80 - lane * 30 + rand(-6, 6)) * (opts.mine ? 1.5 : 1);
  return {
    id: uid(),
    config,
    lane,
    duration,
    // spread: anywhere along the river. fresh: start already on screen so you see it right away.
    delay: opts.spread ? -rand(0, duration * 0.9) : opts.fresh ? -duration * 0.33 : 0,
    mine: opts.mine ?? false,
    fresh: opts.fresh ?? false,
  };
}

/** Your krathongs alternate between two front lanes; the newest sits in the nearer one. */
const MINE_LANES = [0.7, 0.55];
/** Drift speed as a fraction of the screen width per second (~90 s to cross 1.4 screens). */
const MINE_SPEED = 1.4 / 90;
/** Must match the size maths in FloatingKrathong. */
const mineWidth = (lane: number, k: number) => 48 * (1.5 + lane * 1.9) * 1.45 * k;

/**
 * Lay out your own krathongs evenly along one shared loop so they never bunch up.
 * They all share the same speed and loop length, so the gaps stay constant as they cycle.
 * The newest one (last in the list) is placed on screen so you see it straight away.
 */
export function layoutMine(configs: KrathongConfig[], freshNewest = false): FloatingKrathong[] {
  const n = configs.length;
  if (!n) return [];
  const vw = window.innerWidth;
  const k = vw >= 640 ? 1 : 0.72;
  const gap = mineWidth(MINE_LANES[0], k) * 0.9;
  const loop = Math.max(vw + gap * 1.5, n * gap);
  const duration = loop / (vw * MINE_SPEED);
  const from = -gap * 1.2;
  // Phase (0–1 of the loop) that puts the newest krathong ~40% across the screen.
  const anchor = (vw * 0.4 - from) / loop;

  return configs.map((config, i) => {
    const age = n - 1 - i; // 0 = newest
    const phase = (((anchor + age / n) % 1) + 1) % 1; // older ones are further downstream
    return {
      id: uid(),
      config,
      lane: MINE_LANES[age % 2] + rand(-0.02, 0.02),
      duration,
      delay: -phase * duration,
      mine: true,
      fresh: freshNewest && age === 0,
      from,
      to: from + loop,
    };
  });
}
