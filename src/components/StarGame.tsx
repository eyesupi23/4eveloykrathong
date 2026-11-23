import { useEffect, useRef, useState } from "react";

/**
 * Game settings. Write the messages people can get here. Each round of 15 stars gets a fresh
 * random draw, with no message repeated within the round (as long as there are at least 15).
 * Add or remove lines freely. A message can be several lines: use \n for a line break.
 */
export const STAR_GAME = {
  messages: [
    "ขอให้เมฆฝนในใจหายไป ᯓ★",
    "⋆⋆ ขอให้กดบัตรได้ ⋆⋆",
    "ขอให้คุณพบเจอแต่รอยยิ้ม :)",
    "ขอให้รวย ให้ถูกหวยรางวัลที่ 1 >⩊<",
    "ขอให้ได้ไปเจอฟีฟบ่อยๆ ⋆.˚",
    "ขอให้หัวหน้าไม่ตามงานในวันหยุด ˙𐃷˙",
    "ขอให้เดินทางไปไหนมาไหนอย่างปลอดภัย ⟢",
    "ขอให้สมหวังดั่งใจขอทุกประการ ִ ࣪𖤐",
    "ขอให้แฟนรัก แฟนหลง ₍^. .^₎⟆",
    "◝(ᵔᗜᵔ)◜ ขอให้มีแฟน ◝(ᵔᗜᵔ)◜",
    "ʚɞ ขอให้มีคนมาจีบ ʚɞ",
    "⁠♡⁠♡ ขอให้รักสมหวัง ⁠♡⁠♡",
    "ขอให้เจอแต่คนดีๆ เข้ามาในชีวิต ⚡︎",
    "ขอให้มีม๋าเด็กมาจีบ ⁠♡⁠♡",
    "ขอให้มีม๋าแก่มาจีบ ⁠♡⁠♡",
    "ขอให้แฟนเปย์ ⁠♡⁠♡",
    "ขอให้สุขภาพแข็งแรง ⋆.˚",
    "ขอให้ไม่เจ็บ ไม่ป่วย ⋆.˚",
  ],
};

const COLS = 5;
const ROWS = 3;
const COLORS = ["#ffd166", "#ff8fab", "#7ee8fa", "#b197fc", "#8ce99a"];

interface Star {
  id: number;
  x: number; // % of board width
  y: number; // % of board height
  color: string;
  twinkle: number;
  picked: boolean;
  /** The message hidden behind this star. */
  msg: string;
}

type Phase = "pick" | "fall" | "reveal";

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Stars on a jittered grid, hanging at different heights, each with its own message. */
function newSky(): Star[] {
  const count = COLS * ROWS;
  // Shuffled messages, one per star: no repeats in a round. With fewer messages than stars,
  // the shuffled list is reused (re-shuffled each time) since repeats can't be avoided.
  let deck: string[] = [];
  while (deck.length < count) deck = [...deck, ...shuffle(STAR_GAME.messages)];
  return Array.from({ length: count }, (_, i) => {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    return {
      id: i,
      x: ((c + 0.5) / COLS) * 100 + (Math.random() - 0.5) * 8,
      y: 16 + r * 22 + Math.random() * 12,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      twinkle: Math.random() * -1.6,
      picked: false,
      msg: deck[i],
    };
  });
}

export function StarGame({ onClose }: { onClose: () => void }) {
  const [stars, setStars] = useState<Star[]>(newSky);
  const [phase, setPhase] = useState<Phase>("pick");
  const [target, setTarget] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = timers.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      t.forEach(clearTimeout);
    };
  }, [onClose]);

  const later = (fn: () => void, ms: number) =>
    timers.current.push(window.setTimeout(fn, ms));

  const pick = (i: number) => {
    if (phase !== "pick" || stars[i].picked) return;
    setMessage(stars[i].msg);

    setTarget(i);
    // The chosen star drops straight away, then its message unfolds.
    setStars((all) =>
      all.map((s, j) => (j === i ? { ...s, picked: true } : s)),
    );
    setPhase("fall");
    later(() => setPhase("reveal"), 550);
  };

  const again = () => {
    setTarget(null);
    setPhase("pick");
    // Every star taken: hang a fresh sky.
    setStars((all) => (all.every((s) => s.picked) ? newSky() : all));
  };

  const t = target === null ? null : stars[target];

  return (
    <div className="fixed inset-0 z-70 grid place-items-center bg-[#05061a]/85 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="star-title"
        className="px-window flex w-full max-w-md flex-col"
      >
        <div className="flex items-center justify-between bg-gold px-4 py-2 text-[#1a1440]">
          <h2 id="star-title" className="font-bold">
            สอยดาว
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="px-2 font-pixel text-xs"
          >
            X
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2 text-xs sm:text-sm">
          <span className="text-white">แตะเลือกดาวเพื่อสุ่มคำอธิฐาน</span>
        </div>

        <div className="relative px-3 pb-3">
          <div className="star-board relative aspect-[4/4.2] w-full overflow-hidden">
            {/* top bar the strings hang from */}
            <div className="absolute inset-x-0 top-0 h-2 bg-[#5c3a1e]" />

            {stars.map((s, i) =>
              s.picked && !(i === target && phase === "fall") ? null : (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={phase !== "pick"}
                  aria-label={`ดาวดวงที่ ${i + 1}`}
                  className={`star-hang absolute -translate-x-1/2 ${i === target && phase === "fall" ? "star-fall" : ""}`}
                  style={{ left: `${s.x}%`, top: 0, height: `${s.y}%` }}
                >
                  <span className="star-string" />
                  <span
                    className="star-body"
                    style={{ animationDelay: `${s.twinkle}s` }}
                  >
                    <PixelStar color={s.color} />
                  </span>
                </button>
              ),
            )}

            {phase === "reveal" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-night/80 p-5">
                <div className="star-ticket flex w-full max-w-xs flex-col items-center gap-3 px-5 py-6 text-center">
                  <PixelStar color={t?.color ?? "#ffd166"} size={40} />
                  <p className="font-pixel text-[10px] text-[#8a5a00]">
                    YOU GOT
                  </p>
                  <p className="whitespace-pre-line text-xl font-bold leading-snug text-[#1a1440]">
                    {message}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={again}
                    className="px-btn px-6 py-3"
                  >
                    สอยอีกดวง
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-chip px-6 py-2.5 text-sm"
                  >
                    กลับไปลอยกระทง
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PixelStar({ color, size = 34 }: { color: string; size?: number }) {
  // 9×9 star; the darker rim gives it a chunky 8-bit look
  const rows = [
    "....#....",
    "...###...",
    "...###...",
    "#########",
    ".#######.",
    "..#####..",
    "..##.##..",
    ".##...##.",
    ".#.....#.",
  ];
  return (
    <svg
      viewBox="0 0 9 9"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden
      className="block"
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === "#" ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={color}
            />
          ) : null,
        ),
      )}
      <rect x={3} y={3} width={1} height={1} fill="#fff6dc" opacity={0.8} />
    </svg>
  );
}
