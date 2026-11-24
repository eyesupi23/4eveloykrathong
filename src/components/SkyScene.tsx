import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { NightScene, type SignRect, type StageLayout } from '../lib/scene';

export interface SkyHandle {
  celebrate: (count?: number) => void;
}

const LOGO_SRC = `${import.meta.env.BASE_URL}images/logo.jpg`;

/** Video shown on the outdoor cinema screen. Muted autoplay; sound turns on at the first tap. */
const YT_ID = 'mMpqChNcOhw';
const YT_SRC =
  `https://www.youtube.com/embed/${YT_ID}?autoplay=1&mute=1&loop=1&playlist=${YT_ID}` +
  '&controls=0&playsinline=1&rel=0&modestbranding=1&enablejsapi=1' +
  '&cc_load_policy=0&iv_load_policy=3'; // no captions by default, no annotations

/**
 * Crop the logo to its non-white content and shrink it a little,
 * so it reads as lightly pixelated on the stage sign.
 */
async function prepareLogo(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scan = document.createElement('canvas');
  const sw = (scan.width = 250);
  const sh = (scan.height = Math.round((img.height / img.width) * 250));
  const sctx = scan.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0, sw, sh);
  const d = sctx.getImageData(0, 0, sw, sh).data;
  let x0 = sw, y0 = sh, x1 = 0, y1 = 0;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      if (Math.min(d[i], d[i + 1], d[i + 2]) < 225) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return src; // blank image: show as is
  const pad = 3;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(sw - 1, x1 + pad); y1 = Math.min(sh - 1, y1 + pad);
  const k = img.width / sw;
  const cw = (x1 - x0 + 1) * k;
  const chh = (y1 - y0 + 1) * k;

  const out = document.createElement('canvas');
  out.width = 120;
  out.height = Math.max(1, Math.round((chh / cw) * 120));
  const octx = out.getContext('2d')!;
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, out.width, out.height);
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(img, x0 * k, y0 * k, cw, chh, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

const place = (r: SignRect) => ({
  left: `${r.left}%`,
  top: `${r.top}%`,
  width: `${r.width}%`,
  height: `${r.height}%`,
});

interface Props {
  muted: boolean;
  paused?: boolean;
  /** Shown over the Ferris wheel and carousel (the fair's game zone). */
  fairContent?: ReactNode;
}

export const SkyScene = forwardRef<SkyHandle, Props>(function SkyScene(
  { muted, paused = false, fairContent },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiRef = useRef<HTMLCanvasElement>(null); // full-resolution layer for picture fireworks
  const sceneRef = useRef<NightScene | null>(null);
  const [layout, setLayout] = useState<StageLayout | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const ytRef = useRef<HTMLIFrameElement>(null);

  // Drive the YouTube player through its postMessage API (needs enablejsapi=1).
  const yt = (func: string, args: unknown[] = []) =>
    ytRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  const applySound = () => {
    // Turn captions off even if the viewer has them switched on in their YouTube settings.
    yt('unloadModule', ['captions']);
    yt('unloadModule', ['cc']);
    if (muted) yt('mute');
    else {
      yt('unMute');
      yt('setVolume', [70]);
      yt('playVideo');
    }
  };

  useEffect(() => {
    applySound();
    // The player may still be booting; send again shortly after.
    const t = setTimeout(applySound, 1200);
    return () => clearTimeout(t);
  }, [muted]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({ celebrate: (n) => sceneRef.current?.celebrate(n) }), []);

  useEffect(() => {
    const scene = new NightScene(canvasRef.current!, setLayout, hiRef.current);
    sceneRef.current = scene;
    scene.start();
    return () => scene.stop();
  }, []);

  useEffect(() => {
    sceneRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    let alive = true;
    prepareLogo(LOGO_SRC)
      .then((url) => alive && setLogo(url))
      .catch(() => {
        // Logo missing: the sign just stays a plain lit panel.
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="pixelated absolute inset-0 h-full w-full" aria-hidden />
      <canvas ref={hiRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
      {layout && fairContent && (
        <div className="absolute z-30" style={place(layout.fair)}>
          {fairContent}
        </div>
      )}
      {layout && logo && (
        <img
          src={logo}
          alt="ป้ายศิลปินบนเวที"
          draggable={false}
          className="pixelated pointer-events-none absolute object-contain p-px"
          style={place(layout.screen)}
        />
      )}
      {layout && (
        <iframe
          ref={ytRef}
          src={YT_SRC}
          title="จอหนังกลางแปลง"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setTimeout(applySound, 500)}
          className="absolute border-0 bg-black"
          style={place(layout.cinema)}
        />
      )}
      {layout && (
        // SVG text scales with the stage at any screen size
        <svg
          viewBox="0 0 240 80"
          preserveAspectRatio="xMidYMid meet"
          className="neon-text pointer-events-none absolute"
          style={place(layout.banner)}
          role="img"
          aria-label="ฟรีคอนเสิร์ต"
        >
          <text
            x="120"
            y="62"
            textAnchor="middle"
            textLength="228"
            lengthAdjust="spacingAndGlyphs"
            fontSize="50"
            fontWeight="700"
            fill="#fff0fb"
            style={{ fontFamily: 'var(--font-thai)' }}
          >
            ฟรีคอนเสิร์ต
          </text>
        </svg>
      )}
    </>
  );
});
