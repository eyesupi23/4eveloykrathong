import { useEffect, useRef, useState } from "react";

/** Game settings. Each picture appears on two cards; add or remove files to change the board. */
export const MATCH_GAME = {
  pictures: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `images/game/${n}.webp`),
  /** How long a wrong pair stays face up before turning back. */
  wrongMs: 800,
};

interface Card {
  id: number;
  pic: number;
  matched: boolean;
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

const newDeck = (): Card[] =>
  shuffle(MATCH_GAME.pictures.flatMap((_, pic) => [pic, pic])).map(
    (pic, id) => ({ id, pic, matched: false }),
  );

const url = (src: string) => `${import.meta.env.BASE_URL}${src}`;
const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function MatchGame({ onClose }: { onClose: () => void }) {
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false); // false = show the how-to screen first
  const [cards, setCards] = useState<Card[]>(newDeck);
  const [open, setOpen] = useState<number[]>([]); // indexes of face-up, unmatched cards (max 2)
  const [moves, setMoves] = useState(0);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [doneIn, setDoneIn] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [deck, setDeck] = useState(0); // new cards re-mount face down instead of flipping back

  // Load every picture before showing the board, so cards never flip to a blank face.
  useEffect(() => {
    let alive = true;
    Promise.all(
      MATCH_GAME.pictures.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = url(src);
          }),
      ),
    ).then(() => alive && setReady(true));
    return () => {
      alive = false;
      window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Clock runs from the first flip until the last pair is found.
  useEffect(() => {
    if (startAt === null || doneIn !== null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startAt, doneIn]);

  const flip = (i: number) => {
    const c = cards[i];
    if (c.matched || open.includes(i) || open.length >= 2) return;
    if (startAt === null) {
      setStartAt(Date.now());
      setNow(Date.now());
    }
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = next;
    if (cards[a].pic === cards[b].pic) {
      // A pair: let it show for a moment, then it disappears from the board.
      timer.current = window.setTimeout(() => {
        // Only one pair resolves at a time, so `cards` here already has every earlier match.
        const updated = cards.map((k, j) =>
          j === a || j === b ? { ...k, matched: true } : k,
        );
        setCards(updated);
        if (updated.every((k) => k.matched)) setDoneIn(Date.now());
        setOpen([]);
      }, 450);
    } else {
      timer.current = window.setTimeout(() => setOpen([]), MATCH_GAME.wrongMs);
    }
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    setCards(newDeck());
    setDeck((d) => d + 1);
    setOpen([]);
    setMoves(0);
    setStartAt(null);
    setDoneIn(null);
  };

  const pairs = MATCH_GAME.pictures.length;
  const found = cards.filter((c) => c.matched).length / 2;
  const seconds =
    startAt === null ? 0 : Math.floor(((doneIn ?? now) - startAt) / 1000);

  return (
    <div className="fixed inset-0 z-70 grid place-items-center bg-[#05061a]/85 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-title"
        className="px-window flex w-full max-w-md flex-col"
      >
        <div className="flex items-center justify-between bg-aqua px-4 py-2 text-night">
          <h2 id="match-title" className="font-bold">
            พลิกแผ่นป้าย จับคู่รูปฟีฟฟฟฟ~
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

        <div className="flex items-center justify-between px-4 py-2 font-pixel text-[10px] sm:text-xs">
          <span className="text-gold">
            {found}/{pairs}
          </span>
          <span className="text-mute">MOVES {moves}</span>
          <span className="text-aqua">{fmt(seconds)}</span>
        </div>

        <div className="relative px-3 pb-3">
          <div className="match-board flex min-h-80 flex-wrap content-center justify-center gap-2 p-3">
            {cards.map((c, i) => {
              const up = c.matched || open.includes(i);
              return (
                <button
                  key={`${deck}-${c.id}`}
                  type="button"
                  onClick={() => flip(i)}
                  disabled={!started || c.matched}
                  aria-label={up ? `ป้ายรูปที่ ${c.pic + 1}` : "ป้ายคว่ำ"}
                  className={`match-card ${up ? "is-up" : ""} ${c.matched ? "is-matched" : ""}`}
                >
                  <span className="match-inner">
                    <span className="match-face match-back font-pixel">?</span>
                    <span className="match-face match-front">
                      <img
                        src={url(MATCH_GAME.pictures[c.pic])}
                        alt=""
                        draggable={false}
                      />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {(!started || doneIn !== null) && (
            <div className="absolute inset-x-3 top-0 bottom-3 grid place-items-center bg-night/85 p-4 text-center">
              {!started ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-base leading-relaxed">
                    พลิกหารูปคู่ที่ตรงกันให้ครบ {pairs} คู่
                  </p>
                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    disabled={!ready}
                    className="px-btn mt-2 px-6 py-3"
                  >
                    {ready ? "เริ่มเล่น" : "กำลังโหลด…"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p className="font-pixel text-xs text-aqua">CLEAR!</p>
                  <p className="text-lg">จับคู่ครบ {pairs} คู่แล้ว</p>
                  <p className="text-sm text-mute">
                    เปิดไป <span className="font-pixel text-gold">{moves}</span>{" "}
                    ครั้ง · ใช้เวลา{" "}
                    <span className="font-pixel text-gold">{fmt(seconds)}</span>
                  </p>
                  <div className="mt-2 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={restart}
                      className="px-btn px-6 py-3"
                    >
                      เล่นอีกครั้ง
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
          )}
        </div>
      </div>
    </div>
  );
}
