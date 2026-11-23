import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

/**
 * Game settings. Put pictures in public/images/game/ and list them here.
 * Add as many as you like to either list; each balloon shows one at random.
 */
export const BALLOON_GAME = {
  seconds: 30,
  /** Hitting any of these scores +1. */
  targets: [
    { src: "images/game/punch.png", name: "Punch" },
    { src: "images/game/fai.png", name: "Fai" },
    { src: "images/game/mind.png", name: "Mind" },
    { src: "images/game/jorin.png", name: "Jorin" },
    { src: "images/game/aheye.png", name: "Aheye" },
    { src: "images/game/hannah.png", name: "Hannah" },
    { src: "images/game/taaom.png", name: "Taaom" },
  ],
  /** Hitting any of these scores nothing. */
  decoys: [{ src: "images/game/lunar5.png", name: "Lunar" }],
  /** Share of balloons that show a +1 picture. */
  targetChance: 0.5,
  /** How often a balloon swaps its picture, to keep players looking. */
  shuffleMs: 800,
  /** How long a popped balloon takes to come back. */
  respawnMs: 650,
};

const COLS = 4;
const ROWS = 4;
const COLORS = [
  "#ff6b81",
  "#ffd166",
  "#7ee8fa",
  "#b197fc",
  "#8ce99a",
  "#ff9b2f",
];

type Kind = "target" | "decoy";
type Phase = "ready" | "count" | "play" | "end";

interface Slot {
  v: number; // bumps on respawn so the balloon re-mounts with its pop-in animation
  kind: Kind;
  /** Which picture of that kind (index into targets / decoys). */
  pic: number;
  color: string;
  popped: boolean;
  bob: number;
}

interface Fx {
  id: number;
  x: number;
  y: number;
  hit: Kind | null;
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rollKind = (): Kind =>
  Math.random() < BALLOON_GAME.targetChance ? "target" : "decoy";
const LISTS: Record<Kind, { src: string; name: string }[]> = {
  target: BALLOON_GAME.targets,
  decoy: BALLOON_GAME.decoys,
};
const rollPic = (kind: Kind) => Math.floor(Math.random() * LISTS[kind].length);
const newSlot = (v = 0): Slot => {
  const kind = rollKind();
  return {
    v,
    kind,
    pic: rollPic(kind),
    color: pick(COLORS),
    popped: false,
    bob: Math.random() * -1.6,
  };
};

type Pics = Record<Kind, string[]>;

/**
 * Load a picture and shrink it to a sharp, smooth square (no pixel-art effect),
 * sized for the balloon face on high-density phone screens.
 */
async function loadPicture(src: string, size = 160): Promise<string> {
  const r = await fetch(`${import.meta.env.BASE_URL}${src}`);
  const bmp = await createImageBitmap(await r.blob());
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(size, side);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    bmp,
    (bmp.width - side) / 2,
    (bmp.height - side) / 2,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  bmp.close();
  return canvas.toDataURL("image/png");
}

export function BalloonGame({ onClose }: { onClose: () => void }) {
  const [pics, setPics] = useState<Pics | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(3);
  const [left, setLeft] = useState(BALLOON_GAME.seconds);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  /** How many times each +1 picture was hit this round (index into BALLOON_GAME.targets). */
  const [hits, setHits] = useState<number[]>([]);
  const [slots, setSlots] = useState<Slot[]>(() =>
    Array.from({ length: COLS * ROWS }, () => newSlot()),
  );
  const [fx, setFx] = useState<Fx[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const fxId = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    let alive = true;
    // A missing file just leaves that balloon blank instead of breaking the game.
    const load = (list: { src: string }[]) =>
      Promise.all(list.map((p) => loadPicture(p.src).catch(() => "")));
    Promise.all([load(BALLOON_GAME.targets), load(BALLOON_GAME.decoys)]).then(
      ([target, decoy]) => alive && setPics({ target, decoy }),
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const start = () => {
    setScore(0);
    setWrong(0);
    setHits([]);
    setLeft(BALLOON_GAME.seconds);
    setFx([]);
    setSlots(Array.from({ length: COLS * ROWS }, () => newSlot()));
    setCount(3);
    setPhase("count");
  };

  // 3-2-1 countdown
  useEffect(() => {
    if (phase !== "count") return;
    if (count === 0) {
      setPhase("play");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Game clock
  useEffect(() => {
    if (phase !== "play") return;
    const end = Date.now() + BALLOON_GAME.seconds * 1000;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) setPhase("end");
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  // Balloons keep swapping pictures; always keep a few targets on the board.
  useEffect(() => {
    if (phase !== "play") return;
    const id = setInterval(() => {
      setSlots((all) => {
        const next = [...all];
        const live = next
          .map((s, i) => (s.popped ? -1 : i))
          .filter((i) => i >= 0);
        if (!live.length) return all;
        const i = pick(live);
        const targets = live.filter((j) => next[j].kind === "target").length;
        const kind: Kind =
          targets <= 3
            ? "target"
            : next[i].kind === "target"
              ? "decoy"
              : "target";
        next[i] = { ...next[i], kind, pic: rollPic(kind) };
        return next;
      });
    }, BALLOON_GAME.shuffleMs);
    return () => clearInterval(id);
  }, [phase]);

  const throwDart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "play") return;
    const board = boardRef.current!.getBoundingClientRect();
    const x = ((e.clientX - board.left) / board.width) * 100;
    const y = ((e.clientY - board.top) / board.height) * 100;
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-balloon]");
    const i = el ? Number(el.dataset.balloon) : -1;

    const s = slotsRef.current[i];
    const kind: Kind | null = s && !s.popped ? s.kind : null;
    if (kind) {
      const next = [...slotsRef.current];
      next[i] = { ...s, popped: true };
      slotsRef.current = next; // so a quick second tap can't pop it twice
      setSlots(next);
    }
    if (kind === "target") {
      setScore((n) => n + 1);
      setHits((h) => {
        const next = [...h];
        next[s.pic] = (next[s.pic] ?? 0) + 1;
        return next;
      });
    }
    if (kind === "decoy") setWrong((n) => n + 1);
    if (kind) {
      setTimeout(() => {
        setSlots((all) => {
          const next = [...all];
          next[i] = newSlot(all[i].v + 1);
          return next;
        });
      }, BALLOON_GAME.respawnMs);
    }

    const id = ++fxId.current;
    setFx((f) => [...f.slice(-8), { id, x, y, hit: kind }]);
    setTimeout(() => setFx((f) => f.filter((d) => d.id !== id)), 700);
  }, []);

  // The +1 picture hit most this round (first one wins a tie); none if nothing was hit.
  const top = hits.reduce<{ index: number; count: number } | null>(
    (best, count, index) =>
      count && (!best || count > best.count) ? { index, count } : best,
    null,
  );
  const topInfo = top && { ...top, name: BALLOON_GAME.targets[top.index].name };

  return (
    <div className="fixed inset-0 z-70 grid place-items-center bg-[#05061a]/85 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-title"
        className="px-window flex max-h-[96dvh] w-full max-w-md flex-col"
      >
        <div className="flex items-center justify-between bg-rose px-4 py-2 text-ink">
          <h2 id="game-title" className="font-bold">
            เกมปาโฟอ้วม~
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
          <span className="text-gold">SCORE {score}</span>
          <span
            className={
              left <= 5 && phase === "play" ? "blink text-rose" : "text-aqua"
            }
          >
            TIME {left}
          </span>
        </div>

        <div className="relative px-3 pb-3">
          <div
            ref={boardRef}
            onPointerDown={throwDart}
            className="balloon-board relative grid aspect-[4/4.4] w-full cursor-crosshair touch-none select-none p-2"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            }}
          >
            {slots.map((s, i) => (
              <div key={i} className="relative grid place-items-center">
                {s.popped ? (
                  <span
                    className="balloon-burst"
                    style={{ "--c": s.color } as CSSProperties}
                  />
                ) : (
                  <div
                    key={s.v}
                    data-balloon={i}
                    className="balloon"
                    style={
                      {
                        "--c": s.color,
                        animationDelay: `0s, ${s.bob}s`,
                      } as CSSProperties
                    }
                  >
                    {pics?.[s.kind][s.pic] && (
                      <img
                        src={pics[s.kind][s.pic]}
                        alt=""
                        draggable={false}
                        className="balloon-face"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            {fx.map((d) => (
              <span
                key={d.id}
                className="pointer-events-none absolute"
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
              >
                <Dart />
                {d.hit && (
                  <span
                    className={`balloon-score font-pixel ${d.hit === "target" ? "text-gold" : "text-mute"}`}
                  >
                    {d.hit === "target" ? "+1" : "0"}
                  </span>
                )}
              </span>
            ))}

            {phase !== "play" && (
              <div className="absolute inset-0 grid place-items-center bg-night/85 p-4 text-center">
                {phase === "ready" && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm leading-relaxed">
                      แตะเพื่อปาลูกดอกใส่ลูกโป่ง ภายใน {BALLOON_GAME.seconds}{" "}
                      วินาที
                    </p>
                    <div className="flex w-full flex-col gap-3">
                      <RuleRow kind="target" pics={pics?.target} />
                      <RuleRow kind="decoy" pics={pics?.decoy} />
                    </div>
                    <button
                      type="button"
                      onClick={start}
                      disabled={!pics}
                      className="px-btn px-6 py-3"
                    >
                      {pics ? "เริ่มเล่น" : "กำลังโหลด…"}
                    </button>
                  </div>
                )}
                {phase === "count" && (
                  <span
                    key={count}
                    className="count-pop font-pixel text-5xl text-gold"
                  >
                    {count || "GO!"}
                  </span>
                )}
                {phase === "end" && (
                  <div className="flex flex-col items-center gap-3">
                    {topInfo && (
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="balloon static-balloon"
                          style={
                            { "--c": "#ffd166", width: 76 } as CSSProperties
                          }
                        >
                          {pics?.target[topInfo.index] && (
                            <img
                              src={pics.target[topInfo.index]}
                              alt={topInfo.name}
                              className="balloon-face"
                            />
                          )}
                        </div>
                        {/* <p className="text-sm">
                          ปา <span className="font-bold text-gold">{topInfo.name}</span> มากที่สุด{" "}
                          <span className="font-pixel text-xs text-gold">{topInfo.count}</span> ครั้ง
                        </p> */}
                      </div>
                    )}
                    <p className="font-pixel text-xl text-aqua">TIME UP!</p>
                    <p className="text-lg">
                      ได้{" "}
                      <span className="font-pixel text-3xl text-gold">
                        {score}
                      </span>{" "}
                      คะแนน
                    </p>
                    <p className="text-sm text-mute">
                      ปาโดนรูปที่ไม่ได้คะแนน {wrong} ครั้ง
                    </p>
                    <div className="mt-2 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={start}
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
    </div>
  );
}

/** One row of the rules: every picture of a kind, with its points. */
function RuleRow({ kind, pics }: { kind: Kind; pics?: string[] }) {
  const good = kind === "target";
  const list = LISTS[kind];
  // Shrink the balloons when there are many pictures so a row still fits on a phone.
  const width = list.length <= 3 ? 56 : list.length <= 5 ? 44 : 36;
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className={`w-8 shrink-0 font-pixel text-xs ${good ? "text-gold" : "text-rose"}`}
      >
        {good ? "+1" : "0"}
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        {list.map((p, i) => (
          <div key={p.src} className="flex flex-col items-center gap-1">
            <div
              className="balloon static-balloon"
              style={
                { "--c": good ? "#ffd166" : "#7ee8fa", width } as CSSProperties
              }
            >
              {pics?.[i] && (
                <img src={pics[i]} alt={p.name} className="balloon-face" />
              )}
            </div>
            <span className="text-[11px]">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 8-bit dart, tip at the tap point. */
function Dart() {
  const px: [number, number, number, number, string][] = [
    [3, 0, 1, 2, "#e9ecef"], // tip
    [3, 2, 1, 5, "#ffd166"], // shaft
    [1, 7, 1, 2, "#ff6b81"], // flights
    [5, 7, 1, 2, "#ff6b81"],
    [2, 6, 1, 3, "#ff6b81"],
    [4, 6, 1, 3, "#ff6b81"],
    [3, 7, 1, 2, "#c92a2a"],
  ];
  return (
    <svg
      viewBox="0 0 7 9"
      width={21}
      height={27}
      shapeRendering="crispEdges"
      className="dart-in ml-[-10.5px] block"
    >
      {px.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
    </svg>
  );
}
