import type { FlowerId } from '../types';

/**
 * 12×12 pixel-art ornaments that sit on top of the flower dome.
 * '.' is transparent; every other character is looked up in the ornament's palette.
 */
export interface Decoration {
  map: string[];
  colors: Record<string, string>;
}

export const DECO_SIZE = 12;

export const DECORATIONS: Record<FlowerId, Decoration> = {
  sun: {
    map: [
      '.....oo.....',
      '.o...oo...o.',
      '..o.kkkk.o..',
      '...kYYYYk...',
      '..kYWYYYYk..',
      'ookYeYYeYkoo',
      'ookYYYYYYkoo',
      '..kYYmmYYk..',
      '...kYYYYk...',
      '..o.kkkk.o..',
      '.o...oo...o.',
      '.....oo.....',
    ],
    colors: { o: '#ff9b2f', k: '#d9480f', Y: '#ffd43b', W: '#fff3bf', e: '#1a1440', m: '#e03131' },
  },
  sunflower: {
    map: [
      '....yYYy....',
      '..yYyYYyYy..',
      '.yYYbbbbYYy.',
      '.YYbBbbBbYY.',
      '.yYbbbbbbYy.',
      '..yYbbbbYy..',
      '...yYyyYy...',
      '.....gg.....',
      '..GG.gg.....',
      '...GGgg.....',
      '.....gg.GG..',
      '.....gg.....',
    ],
    colors: { y: '#f08c00', Y: '#ffd43b', b: '#7a4a1c', B: '#3d2410', g: '#2b8a3e', G: '#51cf66' },
  },
  dino: {
    map: [
      '.......DDDD.',
      '......DggegD',
      '......DggggD',
      '..s...DggDD.',
      '.sDs.DgggD..',
      'DgDDDggggDD.',
      'DggggglllD..',
      '.DggggllD...',
      '..DgggggD...',
      '..DgD.DgD...',
      '..DD..DD....',
      '............',
    ],
    colors: { D: '#1b5e20', g: '#4caf50', l: '#b9f6ca', e: '#0b0e30', s: '#ff9b2f' },
  },
  rose: {
    map: [
      '....rrrr....',
      '..rrRRRRrr..',
      '.rRRrrrrRRr.',
      '.rRrRRRRrRr.',
      '.rRrRrrRrRr.',
      '.rRRrRRrRRr.',
      '..rRRrrRRr..',
      '...rrRRrr...',
      '.....gg.....',
      '..GGGgg.....',
      '...GGgg.GG..',
      '.....ggGG...',
    ],
    colors: { r: '#9d0208', R: '#ff4d6d', g: '#2b8a3e', G: '#51cf66' },
  },
  banana: {
    // A plump banana lying diagonally (like 🍌): stem top-right, curving down to a brown tip
    map: [
      '.........bb.',
      '.........kb.',
      '........kYk.',
      '.......kYYk.',
      '......kLYSk.',
      '.....kLYYSk.',
      '...kkLYYYSk.',
      '.kkLLYYYSk..',
      'kLLYYYYSSk..',
      'kkYYYYSSk...',
      '.bkkkkkkk...',
      '............',
    ],
    colors: { k: '#a87400', Y: '#ffd43b', L: '#fff3a3', S: '#f0a500', b: '#5c3d1e' },
  },
  peach: {
    map: [
      '.....b......',
      '...GGbGG....',
      '....GbG.....',
      '..pPPpPPp...',
      '.pPWPPpPPPp.',
      '.pPWPPpPPPp.',
      '.pPPPPpPPPp.',
      '.pPPPPPPPOp.',
      '..pPPPPPOp..',
      '...pPPPOp...',
      '....pppp....',
      '............',
    ],
    colors: { b: '#6b4423', G: '#51cf66', p: '#d9485f', P: '#ffa8a8', W: '#fff0f0', O: '#ff8787' },
  },
  rabbit: {
    map: [
      '..kk....kk..',
      '.kWpk..kpWk.',
      '.kWpk..kpWk.',
      '.kWpk..kpWk.',
      '..kWkkkkWk..',
      '.kWWWWWWWWk.',
      'kWWeWWWWeWWk',
      'kWpWWnnWWpWk',
      'kWWWWWWWWWWk',
      '.kWWWWWWWWk.',
      '..kkkkkkkk..',
      '............',
    ],
    colors: { k: '#5c5f8a', W: '#ffffff', p: '#ffb3c1', e: '#1a1440', n: '#ff6b81' },
  },
};

/** Paint an ornament with its top-left corner at (x, y), one canvas unit per pixel. */
export function drawDecoration(ctx: CanvasRenderingContext2D, id: FlowerId, x: number, y: number) {
  const deco = DECORATIONS[id];
  deco.map.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const c = deco.colors[row[dx]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  });
}

const iconCache = new Map<FlowerId, string>();

/** Small PNG of an ornament for the picker buttons. */
export function decorationIcon(id: FlowerId): string {
  const hit = iconCache.get(id);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = DECO_SIZE;
  drawDecoration(canvas.getContext('2d')!, id, 0, 0);
  const url = canvas.toDataURL();
  iconCache.set(id, url);
  return url;
}
