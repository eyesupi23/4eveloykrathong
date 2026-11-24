
import { loadShape, type ShapePoint } from './shapeBurst';

/** Every picture firework is drawn this many scene pixels wide (twice that on wide screens), whatever the file size. */
const SHAPE_SIZE = 32;

/**
 * Picture fireworks: every so often a rocket bursts into a picture. They take turns: the 4EVE logo,
 * then a random face, then the logo again… Pictures should be small (about 32×32) on a transparent background.
 */
const LOGO_SHAPE = { src: 'images/4EVE.png', skipWhite: true }; // white background on this file counts as empty
// 64×64 files give the sharpest faces (32×32 work too, just blockier). Square photos are cut round automatically.
const FACE_SHAPES = [11, 22, 33, 44, 55, 66, 77].map((n) => ({ src: `images/fireworks/${n}.png`, skipWhite: false, circle: true }));
/** A picture firework replaces one in every 3 to 5 automatic rockets. */
const SHAPE_EVERY: [number, number] = [3, 5];

/** Fraction of the screen height where the sky meets the river. */
export const HORIZON = 0.62;

const SKY = ['#0b0e30', '#10143d', '#161a4b', '#1d1f5a', '#262468', '#312a75', '#3f2f7d'];
const RIVER = ['#0a1a47', '#0c2054', '#0e2661', '#112c6e'];
const STAR_COLORS = ['#ffffff', '#b8c4ff', '#5d6bb0'];
const FIREWORKS = [
  ['#ffffff', '#ffd166', '#ff9b2f', '#a8460f'],
  ['#ffffff', '#ff8fab', '#e63946', '#7a1a28'],
  ['#ffffff', '#7ee8fa', '#3a86ff', '#1b3d80'],
  ['#ffffff', '#b8f28b', '#3fa34d', '#1d5229'],
  ['#ffffff', '#e0aaff', '#9b5de5', '#4a2580'],
];

interface Star { x: number; y: number; phase: number; big: boolean }
interface Lantern { x: number; y: number; speed: number; phase: number }
interface Rocket { x: number; y: number; vy: number; targetY: number; palette: string[]; shape?: Shape }
/** A spark of a picture firework: flies out to its spot, holds the picture, then drops and fades. */
interface ShapeSpark {
  ox: number; oy: number; dx: number; dy: number; size: number; color: string;
  age: number; fall: number; jitter: number; twinkle: boolean;
}
/** step = scene pixels per spark at the normal size (SHAPE_SIZE / picture side). */
interface Shape { points: ShapePoint[]; step: number; logo: boolean }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; palette: string[] }

/** Where the artist sign sits, as % of the scene, so the logo can be overlaid in sharper detail. */
export interface SignRect { left: number; top: number; width: number; height: number }
/** Stage areas overlaid in the DOM: the LED screen (logo) and the banner under it. */
export interface StageLayout {
  screen: SignRect;
  banner: SignRect;
  cinema: SignRect;
  /** Ferris wheel + carousel area: the "game zone" buttons sit here. */
  fair: SignRect;
}

const STAGE_W = 34;
/** Fair rides are drawn as dim silhouettes so they never outshine the krathongs. */
const RIDE = '#13173f';
const NEON = ['#ff4fd8', '#a855f7', '#4fd8ff', '#ffffff'];
const BULBS = ['#ff6b81', '#ffd166', '#7ee8fa', '#b8f28b', '#e0aaff'];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];

/**
 * Draws the whole night scene at a tiny resolution (screen ÷ 3 or 4)
 * and lets CSS scale it up with crisp pixels.
 */
export class NightScene {
  private ctx: CanvasRenderingContext2D;
  private ro: ResizeObserver;
  private w = 1;
  private h = 1;
  private raf = 0;
  private last = 0;
  private nextAuto = 0;
  private reduced: boolean;
  private stars: Star[] = [];
  private lanterns: Lantern[] = [];
  private rockets: Rocket[] = [];
  private sparks: Spark[] = [];
  private shapeSparks: ShapeSpark[] = [];
  private hiCtx: CanvasRenderingContext2D | null;
  private hiDirty = false;
  private logoShape: Shape | null = null;
  private faceShapes: (Shape | undefined)[] = []; // same order as FACE_SHAPES; empty until loaded
  private nextFace = 0; // faces go in order: 11, 22, 33 … 77, then start again
  private lastShape: Shape | null = null;
  private untilShape = 2; // automatic rockets left before the next picture firework
  private skyline: number[] = [];
  private timers: number[] = [];
  private wheelX = 0;
  private carouselX = 0;
  private stageX = 0;
  private cinemaX = 0;
  private cinemaW = 22;
  private cinemaH = 12;

  constructor(
    private canvas: HTMLCanvasElement,
    private onLayout?: (l: StageLayout) => void,
    /** Optional full-resolution canvas laid over the scene, for sharp picture fireworks. */
    hiCanvas?: HTMLCanvasElement | null,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.hiCtx = hiCanvas?.getContext('2d') ?? null;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ro = new ResizeObserver(() => this.resize());
  }

  start() {
    // Pictures are tiny (a few KB). The logo loads right away; the faces a little later, so they
    // don't compete with the page's first load. A missing file is just skipped.
    const url = (src: string) => `${import.meta.env.BASE_URL}${src}`;
    loadShape(url(LOGO_SHAPE.src), { skipWhite: LOGO_SHAPE.skipWhite })
      .then(({ points, side }) => points.length && (this.logoShape = { points, step: SHAPE_SIZE / side, logo: true }))
      .catch(() => {});
    this.timers.push(
      window.setTimeout(() => {
        FACE_SHAPES.forEach((f, i) => {
          loadShape(url(f.src), { skipWhite: f.skipWhite, circle: f.circle })
            .then(({ points, side }) => {
              // Keep each face in its own slot, so the order stays fixed whichever file loads first.
              if (points.length) this.faceShapes[i] = { points, step: SHAPE_SIZE / side, logo: false };
            })
            .catch(() => {});
        });
      }, 3000),
    );
    this.resize();
    this.ro.observe(this.canvas);
    this.raf = requestAnimationFrame(this.loop);
  }

  /** Freeze drawing (e.g. while a mini-game covers the scene) to save battery. */
  setPaused(paused: boolean) {
    cancelAnimationFrame(this.raf);
    if (!paused) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.timers.forEach(clearTimeout);
  }

  /** A volley of fireworks, e.g. when someone floats a krathong. */
  celebrate(count = 6) {
    const mid = Math.floor(count / 2); // one picture firework in the middle of the volley
    for (let i = 0; i < count; i++) {
      this.timers.push(
        window.setTimeout(
          () => (i === mid ? this.launchShape() : this.launch(rand(this.w * 0.15, this.w * 0.85))),
          i * 220,
        ),
      );
    }
  }

  private get horizonY() {
    return Math.floor(this.h * HORIZON);
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    const scale = r.width < 640 ? 3 : 4;
    this.w = Math.max(1, Math.ceil(r.width / scale));
    this.h = Math.max(1, Math.ceil(r.height / scale));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    if (this.hiCtx) {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.hiCtx.canvas.width = Math.round(r.width * dpr);
      this.hiCtx.canvas.height = Math.round(r.height * dpr);
    }
    this.seed();
  }

  private seed() {
    const { w } = this;
    const hy = this.horizonY;
    this.stars = Array.from({ length: Math.floor((w * hy) / 260) }, () => ({
      x: Math.floor(rand(0, w)),
      y: Math.floor(rand(0, hy - 10)),
      phase: Math.random(),
      big: Math.random() < 0.08,
    }));
    this.lanterns = Array.from({ length: Math.max(4, Math.floor(w / 45)) }, () => ({
      x: rand(0, w),
      y: rand(hy * 0.1, hy),
      speed: rand(0.003, 0.008),
      phase: rand(0, Math.PI * 2),
    }));

    // Far fair: Ferris wheel and carousel on the left, a small stage further along.
    this.wheelX = Math.round(Math.max(16, w * 0.13));
    this.carouselX = this.wheelX + 26;
    // Outdoor cinema screen (จอหนังกลางแปลง) to the right of the stage, 16:9
    this.cinemaW = w >= 200 ? 32 : 22;
    this.cinemaH = Math.round((this.cinemaW * 9) / 16);
    this.stageX = Math.round(Math.min(w - STAGE_W - this.cinemaW - 7, Math.max(this.carouselX + 17, w * 0.52)));
    this.cinemaX = this.stageX + STAGE_W + 5;

    // Temple skyline on the far bank: halls (โบสถ์), chedis and prangs in silhouette.
    const sky = new Array(w).fill(2);
    const raise = (x: number, hgt: number) => {
      const xi = Math.round(x);
      if (xi >= 0 && xi < w) sky[xi] = Math.max(sky[xi], Math.round(hgt));
    };
    const hall = (cx: number, H: number) => {
      const half = 15;
      const wall = H * 0.4;
      for (let dx = -half; dx <= half; dx++) {
        const a = Math.abs(dx);
        if (a <= 12) raise(cx + dx, wall);
        // two stacked roof tiers, steeper towards the ridge
        const roof = a <= 13 ? wall + (13 - a) * 0.45 : 0;
        const upper = a <= 8 ? wall + 5.4 + (8 - a) * 0.6 : 0;
        raise(cx + dx, Math.max(roof, upper));
      }
      raise(cx, H); // ridge finial (ช่อฟ้า)
      for (const s of [-1, 1]) {
        raise(cx + s * 13, wall + 2); // eave finials
        raise(cx + s * 8, wall + 7);
      }
    };
    const chedi = (cx: number, H: number) => {
      for (let dx = -6; dx <= 6; dx++) {
        const a = Math.abs(dx);
        let hgt = a <= 6 ? 3 : 0;
        if (a <= 5) hgt = 5;
        if (a <= 4) hgt = 6 + Math.round(H * 0.3 * Math.sqrt(1 - (a / 4.6) ** 2)); // bell
        if (a <= 1) hgt = Math.max(hgt, H * 0.75);
        if (a === 0) hgt = H; // spire
        raise(cx + dx, hgt);
      }
    };
    const prang = (cx: number, H: number) => {
      for (let dx = -6; dx <= 6; dx++) {
        const a = Math.abs(dx);
        let hgt = H * (1 - (a / 6.5) ** 1.4);
        hgt -= hgt % 2; // stepped tiers
        raise(cx + dx, a === 0 ? hgt + 3 : hgt);
      }
    };
    const unit = this.h * 0.1;
    const plan: [number, (cx: number, H: number) => void, number][] = [
      [0.04, chedi, 1.0], [0.15, hall, 0.9], [0.27, prang, 1.25], [0.38, chedi, 0.8],
      [0.5, hall, 1.0], [0.63, prang, 1.1], [0.74, chedi, 0.9], [0.86, hall, 0.85], [0.97, prang, 1.0],
    ];
    // Keep the rides against open sky, and leave room between temples on narrow screens.
    const ridesFrom = this.wheelX - 16;
    const ridesTo = this.carouselX + 12;
    let lastX = -Infinity;
    for (const [fx, shape, k] of plan) {
      const cx = w * fx;
      if (cx > ridesFrom && cx < ridesTo) continue;
      if (cx - lastX < 26) continue;
      shape(cx, unit * k);
      lastX = cx;
    }
    // A low wall/tree band ties the temples together
    for (let x = 0; x < w; x++) sky[x] = Math.max(sky[x], 3 + ((x * 7) % 5 === 0 ? 1 : 0));
    this.skyline = sky;

    // Overlay areas inside the stage (see drawStage), reported as % of the canvas.
    const pct = (x: number, y: number, rw: number, rh: number): SignRect => ({
      left: (x / w) * 100,
      top: (y / this.h) * 100,
      width: (rw / w) * 100,
      height: (rh / this.h) * 100,
    });
    this.onLayout?.({
      screen: pct(this.stageX + 6, hy - 18, 22, 8),
      banner: pct(this.stageX + 4, hy - 29, 26, 8),
      cinema: pct(this.cinemaX, hy - 7 - this.cinemaH, this.cinemaW, this.cinemaH),
      fair: pct(this.wheelX - 14, hy - 31, this.carouselX + 11 - (this.wheelX - 14), 31),
    });
  }

  private launch(x: number) {
    this.rockets.push({
      x,
      y: this.horizonY - 2,
      vy: -rand(0.09, 0.12),
      targetY: rand(this.h * 0.08, this.h * 0.32),
      palette: pick(FIREWORKS),
    });
  }

  /** Pixel size of one picture spark: bigger on wide screens so the picture stays readable. */
  private get shapeScale() {
    return this.w < 220 ? 1 : 2;
  }

  /** The next face in order (skipping any that failed to load), or null if none are ready yet. */
  private takeFace(): Shape | null {
    const n = FACE_SHAPES.length;
    for (let k = 0; k < n; k++) {
      const face = this.faceShapes[(this.nextFace + k) % n];
      if (face) {
        this.nextFace = (this.nextFace + k + 1) % n;
        return face;
      }
    }
    return null;
  }

  /** Logo and faces take turns: 4EVE, face 11, 4EVE, face 22 … */
  private nextShape(): Shape | null {
    const wantFace = this.lastShape?.logo || !this.logoShape;
    const shape = (wantFace && this.takeFace()) || this.logoShape || this.takeFace();
    if (shape) this.lastShape = shape;
    return shape;
  }

  private launchShape() {
    const shape = this.nextShape();
    if (!shape) return this.launch(rand(this.w * 0.15, this.w * 0.85));
    const s = this.shapeScale * shape.step;
    const halfW = Math.max(...shape.points.map((p) => Math.abs(p.dx))) * s + 2;
    const halfH = Math.max(...shape.points.map((p) => Math.abs(p.dy))) * s + 2;
    const lo = Math.min(this.w / 2, halfW + 2);
    // Burst below the title and above the stage and rides (about 35 px tall), so the picture covers neither.
    const top = this.h * 0.28 + halfH;
    const bottom = Math.max(top, this.horizonY - halfH - 35);
    this.rockets.push({
      x: rand(lo, this.w - lo),
      y: this.horizonY - 2,
      vy: -rand(0.1, 0.12),
      targetY: rand(top, bottom),
      palette: FIREWORKS[1],
      shape,
    });
  }

  private explodeShape(r: Rocket) {
    const { points, step, logo } = r.shape!;
    const s = this.shapeScale * step;
    for (const p of points) {
      this.shapeSparks.push({
        ox: r.x, oy: r.y, dx: p.dx * s, dy: p.dy * s, size: s, color: p.color,
        age: 0, fall: 0, jitter: rand(0, 250), twinkle: logo, // white twinkles would spoil a face
      });
    }
    // a small ring of ordinary sparks for the bang
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const max = rand(500, 800);
      this.sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * 0.05, vy: Math.sin(a) * 0.05, life: max, max, palette: FIREWORKS[0] });
    }
  }

  private explode(r: Rocket) {
    if (r.shape) return this.explodeShape(r);
    const n = Math.floor(rand(40, 64));
    const power = rand(0.04, 0.07);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.1, 0.1);
      const s = power * rand(0.6, 1);
      const max = rand(900, 1500);
      this.sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: max, max, palette: r.palette });
    }
  }

  private loop = (t: number) => {
    const dt = Math.min(50, t - (this.last || t));
    this.last = t;
    this.update(dt, t);
    this.draw(t);
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number, t: number) {
    if (!this.reduced && t > this.nextAuto) {
      if (this.nextAuto) {
        if (--this.untilShape <= 0 && (this.logoShape || this.faceShapes.some(Boolean))) {
          this.launchShape();
          this.untilShape = Math.round(rand(...SHAPE_EVERY));
        } else {
          this.launch(rand(this.w * 0.08, this.w * 0.92));
        }
      }
      this.nextAuto = t + rand(1600, 4000);
    }
    const hy = this.horizonY;

    this.rockets = this.rockets.filter((r) => {
      r.y += r.vy * dt;
      r.vy += 0.00005 * dt;
      if (r.y <= r.targetY || r.vy > -0.02) {
        this.explode(r);
        return false;
      }
      return true;
    });

    this.sparks = this.sparks.filter((s) => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 0.000035 * dt;
      s.vx *= 0.996;
      s.life -= dt;
      return s.life > 0 && s.y < hy;
    });

    // Picture sparks: fly out (0–450 ms), hold the picture (to ~1.5 s), then drop and fade.
    this.shapeSparks = this.shapeSparks.filter((p) => {
      p.age += dt;
      if (p.age > 1500 + p.jitter) p.fall += 0.00003 * dt * (p.age - 1500 - p.jitter);
      return p.age < 2600 + p.jitter;
    });

    for (const l of this.lanterns) {
      l.y -= l.speed * dt;
      l.x += Math.sin(t / 1400 + l.phase) * 0.004 * dt;
      if (l.y < -4) {
        l.y = hy - 3;
        l.x = rand(0, this.w);
      }
    }
  }

  private draw(t: number) {
    const { ctx, w, h } = this;
    const hy = this.horizonY;
    const rect = (x: number, y: number, rw: number, rh: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), rw, rh);
    };

    // Sky in hard colour bands with a dithered seam between each
    const band = hy / SKY.length;
    SKY.forEach((c, i) => rect(0, Math.floor(i * band), w, Math.ceil(band) + 1, c));
    for (let i = 1; i < SKY.length; i++) {
      const y = Math.floor(i * band);
      ctx.fillStyle = SKY[i];
      for (let x = 0; x < w; x += 2) ctx.fillRect(x, y - 1, 1, 1);
      ctx.fillStyle = SKY[i - 1];
      for (let x = 1; x < w; x += 2) ctx.fillRect(x, y, 1, 1);
    }

    // Stars
    for (const s of this.stars) {
      const idx = Math.floor(t / 600 + s.phase * 3) % 3;
      const c = STAR_COLORS[idx];
      rect(s.x, s.y, 1, 1, c);
      if (s.big && idx === 0) {
        rect(s.x - 1, s.y, 3, 1, c);
        rect(s.x, s.y - 1, 1, 3, c);
      }
    }

    // Full moon with dithered halo
    const mx = Math.floor(w * 0.78);
    const my = Math.floor(h * (w < 200 ? 0.33 : 0.2)); // lower on phones, clear of the centred title
    const mr = Math.max(6, Math.floor(Math.min(w, h) * 0.09));
    ctx.fillStyle = '#3a3f8f';
    for (let dy = -mr - 4; dy <= mr + 4; dy++) {
      for (let dx = -mr - 4; dx <= mr + 4; dx++) {
        const d = dx * dx + dy * dy;
        if (d > mr * mr && d <= (mr + 4) ** 2 && (dx + dy) % 2 === 0) ctx.fillRect(mx + dx, my + dy, 1, 1);
      }
    }
    for (let dy = -mr; dy <= mr; dy++) {
      const span = Math.floor(Math.sqrt(mr * mr - dy * dy));
      rect(mx - span, my + dy, span * 2 + 1, 1, '#fff3c4');
      rect(mx + Math.floor(span * 0.6), my + dy, span - Math.floor(span * 0.6) + 1, 1, '#f5e3a8');
    }
    const craters: [number, number, number][] = [[-0.35, -0.25, 0.2], [0.2, 0.15, 0.24], [-0.1, 0.45, 0.13]];
    for (const [cxr, cyr, rr] of craters) {
      const cr = Math.max(1, Math.round(mr * rr));
      for (let dy = -cr; dy <= cr; dy++) {
        const span = Math.floor(Math.sqrt(cr * cr - dy * dy));
        rect(mx + cxr * mr - span, my + cyr * mr + dy, span * 2 + 1, 1, '#ead597');
      }
    }

    // Sky lanterns (โคมลอย)
    for (const l of this.lanterns) {
      rect(l.x, l.y, 2, 1, '#ffd166');
      rect(l.x, l.y + 1, 2, 2, '#ff9b2f');
      rect(l.x, l.y + 3, 2, 1, '#c2410c');
    }

    // Fireworks
    for (const r of this.rockets) {
      rect(r.x, r.y, 1, 1, '#ffffff');
      rect(r.x, r.y + 1, 1, 2, r.palette[2]);
      if (Math.floor(t / 60) % 2) rect(r.x, r.y + 4, 1, 1, r.palette[3]);
    }
    for (const s of this.sparks) {
      const k = s.life / s.max;
      if (k < 0.25 && Math.floor(t / 70) % 2) continue; // 8-bit fade: flicker out
      const c = k > 0.85 ? s.palette[0] : k > 0.5 ? s.palette[1] : k > 0.25 ? s.palette[2] : s.palette[3];
      // short trail behind each spark
      if (k > 0.35) {
        rect(s.x - s.vx * 45, s.y - s.vy * 45, 1, 1, s.palette[3]);
        rect(s.x - s.vx * 22, s.y - s.vy * 22, 1, 1, s.palette[2]);
      }
      rect(s.x, s.y, 1, 1, c);
    }

    this.drawShapeSparks(t);

    this.drawBeams(t);

    // Far bank silhouette
    ctx.fillStyle = '#07091f';
    this.skyline.forEach((sh, x) => ctx.fillRect(x, hy - sh, 1, sh));

    this.drawFair(t);
    this.drawStage(t);
    this.drawCinema();
    this.drawStringLights(t);

    // River
    const depth = h - hy;
    RIVER.forEach((c, i) => rect(0, hy + Math.floor((i * depth) / RIVER.length), w, Math.ceil(depth / RIVER.length) + 1, c));
    for (let y = hy + 2, row = 0; y < h; y += 3, row++) {
      const speed = 0.4 + (y - hy) / depth;
      const off = Math.floor(t * 0.006 * speed + row * 13) % 23;
      ctx.fillStyle = row % 2 ? '#1a3b8a' : '#21479c';
      for (let x = -off; x < w; x += 23) ctx.fillRect(x, y, 3 + (row % 3), 1);
    }

    // Moon reflection
    for (let y = hy + 1, row = 0; y < h; y += 2, row++) {
      const d = (y - hy) / depth;
      const half = Math.max(1, Math.round(mr * 1.1 * (1 - d * 0.55)));
      const wob = Math.round(Math.sin(t / 380 + y * 0.9) * 2);
      ctx.fillStyle = row % 2 ? '#c9b26a' : '#fff3c4';
      ctx.fillRect(mx - half + wob, y, half - 1, 1);
      ctx.fillRect(mx + 1 + wob, y, half - 1, 1);
    }

    // Firework reflections
    for (const s of this.sparks) {
      const ry = hy + (hy - s.y) * 0.35;
      if (ry < h && Math.floor(t / 90 + s.x) % 2) rect(s.x, ry, 1, 1, s.palette[2]);
    }
  }

  /**
   * Picture fireworks go on the full-resolution layer (if there is one) so faces stay sharp;
   * the rest of the scene is deliberately chunky.
   */
  private drawShapeSparks(t: number) {
    const hi = this.hiCtx;
    if (hi) {
      if (!this.shapeSparks.length && !this.hiDirty) return;
      hi.clearRect(0, 0, hi.canvas.width, hi.canvas.height);
      this.hiDirty = this.shapeSparks.length > 0;
    }
    const ctx = hi ?? this.ctx;
    const kx = hi ? hi.canvas.width / this.w : 1;
    const ky = hi ? hi.canvas.height / this.h : 1;
    for (const p of this.shapeSparks) {
      const out = Math.min(1, p.age / 450);
      const e = 1 - (1 - out) * (1 - out) * (1 - out); // ease-out: fast burst, gentle stop
      const fading = p.age > 2000 + p.jitter;
      if (fading && Math.floor(t / 70 + p.jitter) % 2) continue; // 8-bit flicker out, each spark on its own beat
      const twinkle = p.twinkle && p.age > 450 && p.age < 1500 && Math.floor(t / 110 + p.dx * 3 + p.dy) % 9 === 0;
      ctx.fillStyle = p.age < 180 || twinkle ? '#ffffff' : p.color;
      const x = (p.ox + p.dx * e) * kx;
      const y = (p.oy + p.dy * e + p.fall) * ky;
      // Round to whole device pixels and size up a hair so neighbouring sparks leave no gaps.
      ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(p.size * kx), Math.ceil(p.size * ky));
    }
  }

  private px(x: number, y: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  private box(x: number, y: number, w: number, h: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  private line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }

  /** Ferris wheel (ชิงช้าสวรรค์) and carousel (ม้าหมุน) as faint silhouettes with dim lights. */
  private drawFair(t: number) {
    const { ctx } = this;
    const b = this.horizonY;
    const spin = this.reduced ? 0 : t / 9000;

    // Ferris wheel
    const wx = this.wheelX;
    const R = 13;
    const wy = b - R - 4;
    this.line(wx, wy, wx - 8, b, RIDE);
    this.line(wx, wy, wx + 8, b, RIDE);
    for (let a = 0; a < Math.PI * 2; a += 1 / R) this.px(wx + Math.cos(a) * R, wy + Math.sin(a) * R, RIDE);
    const ends: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = spin + (i * Math.PI) / 4;
      const ex = wx + Math.cos(a) * R;
      const ey = wy + Math.sin(a) * R;
      this.line(wx, wy, ex, ey, RIDE);
      this.box(ex - 1, ey + 1, 3, 2, RIDE); // gondola hangs below
      ends.push([ex, ey]);
    }
    this.box(wx - 1, wy - 1, 3, 3, RIDE);

    // Carousel
    const kx = this.carouselX;
    for (let r = 0; r < 7; r++) {
      const hw = Math.round(1 + r * 1.5);
      this.box(kx - hw, b - 24 + r, hw * 2 + 1, 1, RIDE);
    }
    for (let sx = -10; sx <= 10; sx += 2) this.px(kx + sx, b - 17, RIDE); // scalloped edge
    this.px(kx, b - 25, RIDE);
    this.px(kx, b - 26, RIDE);
    this.px(kx + 1, b - 26, RIDE);
    this.box(kx - 10, b - 3, 21, 3, RIDE);
    const bob = this.reduced ? 0 : Math.floor(t / 500);
    [-7, 0, 7].forEach((ox, i) => {
      this.box(kx + ox, b - 16, 1, 13, RIDE);
      const hy = b - 11 + ((bob + i) % 2);
      this.box(kx + ox - 2, hy, 4, 2, RIDE); // horse body
      this.px(kx + ox + 2, hy - 1, RIDE); // head
      this.px(kx + ox - 2, hy + 2, RIDE);
      this.px(kx + ox + 1, hy + 2, RIDE);
    });

    // Dim, slowly chasing bulbs on both rides
    const shift = Math.floor(t / 450);
    ctx.globalAlpha = 0.55;
    ends.forEach(([ex, ey], i) => this.px(ex, ey, BULBS[(i + shift) % BULBS.length]));
    for (let sx = -9, i = 0; sx <= 9; sx += 3, i++) this.px(kx + sx, b - 18, BULBS[(i + shift) % BULBS.length]);
    ctx.globalAlpha = 1;
  }

  /** Small modern concert stage far away: truss towers, LED screen with the artist logo, speakers and LED floor. */
  private drawStage(t: number) {
    const x = this.stageX;
    const b = this.horizonY;
    const chase = Math.floor(t / 140);
    const neon = (k: number) => NEON[((k % NEON.length) + NEON.length) % NEON.length];

    // Dark backdrop
    this.box(x + 2, b - 30, 30, 26, '#0b0d24');

    // Truss towers and top truss (lattice of light/dark steel)
    const truss = (tx: number, ty: number, tw: number, th: number) => {
      this.box(tx, ty, tw, th, '#8b93a7');
      for (let yy = ty; yy < ty + th; yy++) {
        for (let xx = tx; xx < tx + tw; xx++) if ((xx + yy) % 2) this.px(xx, yy, '#3b4256');
      }
    };
    truss(x, b - 32, 2, 28);
    truss(x + 32, b - 32, 2, 28);
    truss(x, b - 33, 34, 2);
    this.box(x - 1, b - 34, 36, 1, '#c3c9d6'); // slim roof

    // Moving-head fixtures hanging under the top truss
    for (const fx of [6, 12, 21, 27]) {
      this.box(x + fx, b - 31, 2, 1, '#c3c9d6');
      this.px(x + fx, b - 30, '#ffffff');
    }

    // LED screen with a running neon edge (the logo itself is overlaid in the DOM)
    // ("ฟรีคอนเสิร์ต" sits above it, also overlaid in the DOM)
    this.box(x + 4, b - 20, 26, 12, '#111426');
    this.box(x + 6, b - 18, 22, 8, '#ffffff');
    let i = 0;
    const edge = (ex: number, ey: number) => this.px(ex, ey, neon(i++ - chase));
    for (let ex = x + 5; ex < x + 29; ex++) edge(ex, b - 19);
    for (let ey = b - 19; ey < b - 10; ey++) edge(x + 28, ey);
    for (let ex = x + 28; ex > x + 5; ex--) edge(ex, b - 10);
    for (let ey = b - 10; ey > b - 19; ey--) edge(x + 5, ey);

    // Speaker stacks either side
    for (const sx of [x + 2, x + 30]) {
      this.box(sx, b - 8, 2, 4, '#111426');
      this.px(sx, b - 7, '#4b5568');
    }

    // Stage deck with a chasing LED strip along the front edge
    this.box(x, b - 4, STAGE_W, 4, '#161a2e');
    for (let sx = 0; sx < STAGE_W; sx++) this.px(x + sx, b - 4, neon(Math.floor(sx / 2) + chase));
    for (let sx = 2; sx < STAGE_W; sx += 4) this.px(x + sx, b - 2, '#3b4256');
  }

  /** Outdoor cinema: white cloth on two bamboo poles. The YouTube player is overlaid on the cloth in the DOM. */
  private drawCinema() {
    const x = this.cinemaX;
    const b = this.horizonY;
    const sw = this.cinemaW;
    const sh = this.cinemaH;
    const top = b - 7 - sh;
    // Poles with rope ties
    this.box(x - 2, top - 2, 1, b - top + 2, '#8a5a32');
    this.box(x + sw + 1, top - 2, 1, b - top + 2, '#8a5a32');
    this.px(x - 1, top, '#d8c89a');
    this.px(x + sw, top, '#d8c89a');
    this.px(x - 1, top + sh - 1, '#d8c89a');
    this.px(x + sw, top + sh - 1, '#d8c89a');
    // Black border; the screen itself stays dark under the video so no rounding gaps show
    this.box(x - 1, top - 1, sw + 2, sh + 2, '#0b0c1c');
    this.box(x, top, sw, sh, '#000000');
  }

  /** Coloured concert beams sweeping up from the moving heads. */
  private drawBeams(t: number) {
    const { ctx } = this;
    const b = this.horizonY;
    const swing = this.reduced ? 0 : t / 1300;
    const len = 48;
    const heads: [number, number, string][] = [
      [6, 0, NEON[0]], [12, 1.6, NEON[2]], [21, 3.2, NEON[2]], [27, 4.8, NEON[0]],
    ];
    for (const [fx, phase, color] of heads) {
      const ox = this.stageX + fx + 0.5;
      const a = -Math.PI / 2 + (fx < 17 ? -0.25 : 0.25) + Math.sin(swing + phase) * 0.4;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      ctx.fillStyle = color;
      for (let d = 2; d < len; d++) {
        ctx.globalAlpha = 0.32 * (1 - d / len);
        const spread = Math.floor(d * 0.1);
        for (let s = -spread; s <= spread; s++) {
          const px = Math.round(ox + dx * d - dy * s);
          const py = Math.round(b - 31 + dy * d + dx * s);
          if ((px + py) % 2 === 0) ctx.fillRect(px, py, 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Festive string lights (ไฟระย้า) hung from the carousel to the stage and on to the edge. */
  private drawStringLights(t: number) {
    const b = this.horizonY;
    const shift = Math.floor(t / 400);
    const hang = (x0: number, y0: number, x1: number, y1: number, sag: number) => {
      const n = Math.max(1, Math.floor((x1 - x0) / 3));
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const x = x0 + (x1 - x0) * k;
        const y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag;
        this.px(x, y, BULBS[(i + shift) % BULBS.length]);
      }
    };
    this.ctx.globalAlpha = 0.75;
    hang(this.carouselX, b - 25, this.stageX, b - 32, 5);
    const poleTop = b - 9 - this.cinemaH;
    hang(this.stageX + 34, b - 32, this.cinemaX - 2, poleTop, 3);
    if (this.cinemaX + this.cinemaW + 1 < this.w - 3) hang(this.cinemaX + this.cinemaW + 1, poleTop, this.w + 2, b - 22, 3);
    this.ctx.globalAlpha = 1;
  }
}
