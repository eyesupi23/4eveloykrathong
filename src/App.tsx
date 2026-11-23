import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FloatingKrathong as Floating, KrathongConfig } from "./types";
import { layoutMine, makeFloating, rand, randomConfig, uid } from "./lib/data";
import {
  addMineId,
  clearAllKrathongs,
  loadMine,
  loadMineIds,
  saveMine,
} from "./lib/storage";
import {
  countKrathongs,
  fetchRandom,
  fetchSince,
  insertKrathong,
  isOnline,
  latestCreatedAt,
  type RemoteKrathong,
} from "./lib/remote";
import { pixelateImage } from "./lib/pixelate";
import { SkyScene, type SkyHandle } from "./components/SkyScene";
import { FloatingKrathong } from "./components/FloatingKrathong";
import { Builder } from "./components/Builder";
import {
  BalloonIcon,
  CameraIcon,
  CardsIcon,
  SpeakerIcon,
  StarIcon,
} from "./components/PixelIcons";
import { IntroModal } from "./components/IntroModal";
import { AdminModal } from "./components/AdminModal";

// Each mini-game is only downloaded when someone opens it, so the river loads as fast as before.
const BalloonGame = lazy(() =>
  import("./components/BalloonGame").then((m) => ({ default: m.BalloonGame })),
);
const StarGame = lazy(() =>
  import("./components/StarGame").then((m) => ({ default: m.StarGame })),
);
const MatchGame = lazy(() =>
  import("./components/MatchGame").then((m) => ({ default: m.MatchGame })),
);

/** Games in the fair's game zone (over the carousel). Add a new game here. */
const GAMES = [
  { id: "balloon", name: "ปาโป่ง", Icon: BalloonIcon },
  { id: "match", name: "พลิกป้ายจับคู่", Icon: CardsIcon },
  { id: "star", name: "สอยดาว", Icon: StarIcon },
] as const;
type GameId = (typeof GAMES)[number]["id"];

const MAX_MINE = 12;

// Only your own krathongs float for now; other people's will come from Supabase later.
/**
 * DEMO: made-up krathongs from "other people", to preview how the river will look once
 * Supabase is connected. They float in the back lanes (small, dimmed, behind yours).
 * Set to false to hide them; replace with real rows from Supabase later.
 */
const DEMO_VISITORS = false;
const MAX_VISITORS = 120;
/** How many demo visitors are already floating when the page opens. */
const START_VISITORS = 100;
const VISITOR_LANES: [number, number] = [0.03, 0.38];

/** Picture some demo visitors pin on their krathong (the stage logo, run through the same upload pipeline). */
let demoImage: string | null = null;
let demoCount = 0;
/** Every other visitor gets the picture, so the preview always shows some. */
const withDemoImage = (k: Floating): Floating =>
  demoImage && demoCount++ % 2 === 0
    ? { ...k, config: { ...k.config, image: demoImage } }
    : k;

function visitor(spread = false): Floating {
  return withDemoImage(
    makeFloating(randomConfig(), { lane: rand(...VISITOR_LANES), spread }),
  );
}

/** How many other people's krathongs float on screen at once; the rest rotate in at random. */
const visibleVisitors = () => (window.innerWidth < 640 ? 22 : 45);
/** How often to check the database for new krathongs and refill the river. */
const POLL_MS = 8000;

function visitorFrom(rk: RemoteKrathong, spread: boolean): Floating {
  return {
    ...makeFloating(rk.config, { lane: rand(...VISITOR_LANES), spread }),
    remoteId: rk.id,
  };
}

function initialRiver(): Floating[] {
  const visitors = DEMO_VISITORS
    ? Array.from({ length: START_VISITORS }, () => visitor(true))
    : [];
  return [...visitors, ...layoutMine(loadMine())];
}

export default function App() {
  const sky = useRef<SkyHandle>(null);
  const [river, setRiver] = useState<Floating[]>(initialRiver);
  const [building, setBuilding] = useState(false);
  // Music starts off; the speaker button turns the concert sound on (that tap also satisfies browser autoplay rules).
  const [muted, setMuted] = useState(true);
  const [intro, setIntro] = useState(true);
  // Photo mode hides the buttons so the scene can be screenshotted cleanly.
  const [photo, setPhoto] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [game, setGame] = useState<GameId | null>(null);
  const closeGame = useCallback(() => setGame(null), []);
  const riverRef = useRef(river);
  riverRef.current = river;

  // Online river: newest krathongs first, then random ones to fill the screen, refreshed every few seconds.
  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    let lastSeen: string | null = null;
    const onScreen = (r: Floating[]) =>
      r.flatMap((k) => (k.remoteId ? [k.remoteId] : []));

    const tick = async (first: boolean) => {
      const mineIds = loadMineIds();
      if (first)
        lastSeen = (await latestCreatedAt()) ?? new Date(0).toISOString();
      const [count, fresh] = await Promise.all([
        countKrathongs(),
        first || !lastSeen ? Promise.resolve([]) : fetchSince(lastSeen),
      ]);
      if (!alive) return;
      if (count !== null) setTotal(count);
      if (fresh.length) lastSeen = fresh[fresh.length - 1].createdAt;

      const current = riverRef.current;
      const shown = new Set(onScreen(current));
      const newcomers = fresh.filter(
        (k) => !mineIds.includes(k.id) && !shown.has(k.id),
      );
      const deficit =
        visibleVisitors() -
        current.filter((k) => !k.mine).length -
        newcomers.length;
      const fill =
        deficit > 0
          ? await fetchRandom(deficit, [
              ...shown,
              ...newcomers.map((k) => k.id),
              ...mineIds,
            ])
          : [];
      if (!alive) return;

      setRiver((r) => {
        const have = new Set(onScreen(r));
        const add = [
          ...newcomers.map((k) => visitorFrom(k, false)), // just floated: drift in from the left
          ...fill.map((k) => visitorFrom(k, first)), // first load: spread along the river
        ].filter((k) => !have.has(k.remoteId!) && have.add(k.remoteId!));
        return add.length ? [...r, ...add] : r;
      });
    };

    tick(true);
    const id = setInterval(() => tick(false), POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // DEMO: keep other people's krathongs drifting in, as if they were floating them online.
  useEffect(() => {
    if (!DEMO_VISITORS) return;
    // Load the demo picture, then pin it on about half of the visitors already floating.
    fetch(`${import.meta.env.BASE_URL}images/logo.jpg`)
      .then((r) => r.blob())
      .then((b) =>
        pixelateImage(
          new File([b], "logo.jpg", { type: b.type || "image/jpeg" }),
        ),
      )
      .then((url) => {
        demoImage = url;
        setRiver((r) => r.map((k) => (k.mine ? k : withDemoImage(k))));
      })
      .catch(() => {
        // No picture available: visitors just float without one.
      });
    const id = setInterval(() => {
      setRiver((r) =>
        r.filter((k) => !k.mine).length < MAX_VISITORS ? [...r, visitor()] : r,
      );
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const handleDone = useCallback((id: string) => {
    setRiver((r) => {
      const done = r.find((k) => k.id === id);
      const rest = r.filter((k) => k.id !== id);
      // Your own krathongs come around again; visitors drift away.
      // Restart from the left on the same path and speed, so spacing between them is kept.
      return done?.mine
        ? [...rest, { ...done, id: uid(), delay: 0, fresh: false }]
        : rest;
    });
  }, []);

  const closeBuilder = useCallback(() => setBuilding(false), []);

  const float = (cfg: KrathongConfig) => {
    // Re-space all of your krathongs with the new one included.
    setRiver((r) => {
      const mine = [...r.filter((k) => k.mine).map((k) => k.config), cfg].slice(
        -MAX_MINE,
      );
      return [...r.filter((k) => !k.mine), ...layoutMine(mine, true)];
    });
    saveMine(cfg);
    if (isOnline) {
      setTotal((t) => (t === null ? t : t + 1));
      insertKrathong(cfg)
        .then(addMineId)
        .catch(() =>
          setNotice(
            "บันทึกออนไลน์ไม่สำเร็จ กระทงนี้ลอยอยู่ในเครื่องคุณเท่านั้น",
          ),
        );
    }
    setBuilding(false);
    sky.current?.celebrate(8);
  };

  // Admin: hold "สร้างกระทง" for 5 s to open the admin panel (a normal tap still opens the builder).
  const [admin, setAdmin] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const heldLong = useRef(false);
  const startHold = () => {
    heldLong.current = false;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      heldLong.current = true;
      setAdmin(true);
    }, 5000);
  };
  const endHold = () => window.clearTimeout(holdTimer.current);

  const clearAll = async (code: string) => {
    await clearAllKrathongs(code);
    setRiver([]);
    setTotal(0);
  };
  // Online: every krathong ever floated. Offline: what's on screen.
  const totalKrathongs = isOnline && total !== null ? total : river.length;

  return (
    <div className="relative h-dvh w-full touch-manipulation select-none overflow-hidden">
      <SkyScene
        ref={sky}
        muted={muted}
        paused={game !== null}
        fairContent={
          !photo && (
            <nav
              aria-label="โซนเกมงานวัด"
              className="absolute bottom-[30%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5"
            >
              <span className="game-zone-sign whitespace-nowrap text-xs font-bold sm:text-sm">
                โซนเกม
              </span>
              <div className="flex gap-2">
                {GAMES.map(({ id, name, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setGame(id)}
                    aria-label={`เล่นเกม${name}`}
                    title={name}
                    className="px-chip grid h-10 w-10 place-items-center"
                  >
                    <Icon />
                  </button>
                ))}
              </div>
            </nav>
          )
        }
      />

      <div
        className={`pointer-events-none absolute inset-0 z-20 ${game ? "anim-paused" : ""}`}
      >
        {river.map((k) => (
          <FloatingKrathong key={k.id} item={k} onDone={handleDone} />
        ))}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col items-center px-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-center sm:pt-8">
        <h1 className="festival-title leading-none">
          <span className="festival-th block text-[3.1rem] sm:text-8xl">
            ลอยกระทง
          </span>
          <span className="festival-en -mt-2 flex items-center justify-center gap-3 text-2xl sm:-mt-3 sm:text-5xl">
            <span aria-label="Fevetiwowww">
              {/* Each letter cycles colours with an offset, like chasing temple-fair bulbs */}
              {"Fevetiwowww".split("").map((ch, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="fair-letter"
                  style={{ animationDelay: `${-i * 0.18}s` }}
                >
                  {ch}
                </span>
              ))}
            </span>
          </span>
        </h1>
        <p className="mt-3 text-sm font-semibold text-gold sm:text-base">
          จำนวนกระทงในแม่น้ำ{" "}
          <span className="font-pixel text-xs sm:text-sm">
            {totalKrathongs}
          </span>{" "}
          กระทง
        </p>
      </header>

      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "เปิดเพลง" : "ปิดเพลง"}
        className={`px-chip absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-40 grid h-11 w-11 place-items-center text-base sm:right-8 sm:top-8 ${photo ? "hidden" : ""}`}
      >
        <SpeakerIcon muted={muted} />
      </button>
      <button
        type="button"
        onClick={() => setPhoto(true)}
        aria-label="โหมดถ่ายภาพ (ซ่อนปุ่มเพื่อแคปหน้าจอ)"
        className={`px-chip absolute right-4 top-[calc(max(1rem,env(safe-area-inset-top))+3.5rem)] z-40 grid h-11 w-11 place-items-center sm:right-8 sm:top-[5.5rem] ${photo ? "hidden" : ""}`}
      >
        <CameraIcon />
      </button>

      {photo && (
        // Tap anywhere to leave photo mode; the hint fades out so it isn't in the screenshot.
        <button
          type="button"
          onClick={() => setPhoto(false)}
          aria-label="ออกจากโหมดถ่ายภาพ"
          className="absolute inset-0 z-60 cursor-pointer"
        >
          <span className="photo-hint px-chip absolute bottom-[max(2rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 text-sm text-ink">
            แคปหน้าจอได้เลย · แตะเพื่อกลับ
          </span>
        </button>
      )}

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] ${photo ? "hidden" : ""}`}
      >
        <p className="max-w-[17rem] text-center text-xs leading-relaxed text-white sm:max-w-md sm:text-sm">
          𓇼 ⋆.˚ 𓆉 𓆝 𓆡⋆.˚ 𓇼
          <br />
          .✦ ݁˖ ลอยออนไลน์ ไม่มีขยะลงแม่น้ำจริง .✦ ݁˖
        </p>
        <button
          type="button"
          onClick={() => {
            if (heldLong.current) {
              heldLong.current = false; // the long press opened the admin panel instead
              return;
            }
            setBuilding(true);
          }}
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onContextMenu={(e) => e.preventDefault()}
          className="px-btn pointer-events-auto [-webkit-touch-callout:none] px-7 py-3.5 text-lg sm:text-xl"
        >
          <span className="blink font-pixel text-xs">▶</span> สร้างกระทง
        </button>
      </div>

      {building && <Builder onClose={closeBuilder} onFloat={float} />}
      {intro && <IntroModal onClose={() => setIntro(false)} />}
      {notice && (
        <p
          role="status"
          className="px-chip absolute left-1/2 top-1/2 z-50 -translate-x-1/2 px-4 py-2 text-center text-sm"
        >
          {notice}
        </p>
      )}
      {game && (
        <Suspense fallback={null}>
          {game === "balloon" && <BalloonGame onClose={closeGame} />}
          {game === "match" && <MatchGame onClose={closeGame} />}
          {game === "star" && <StarGame onClose={closeGame} />}
        </Suspense>
      )}
      {admin && (
        <AdminModal onClose={() => setAdmin(false)} onClearAll={clearAll} />
      )}
    </div>
  );
}
