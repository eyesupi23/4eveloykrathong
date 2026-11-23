/** 8-bit speaker drawn on a 12×12 pixel grid: sound waves when on, an X when muted. */
export function SpeakerIcon({ muted, size = 24 }: { muted: boolean; size?: number }) {
  const speaker: [number, number, number, number][] = [
    [1, 4, 3, 4], // box
    [4, 3, 1, 6], // cone
    [5, 2, 1, 8],
    [6, 1, 1, 10],
  ];
  // Sound lines: vertical bars | | getting taller away from the speaker
  const waves: [number, number, number, number][] = [
    [8, 4, 1, 4], // short bar
    [10, 2, 1, 8], // tall bar
  ];
  const cross: [number, number, number, number][] = [
    [7, 3, 1, 1], [11, 3, 1, 1],
    [8, 4, 1, 1], [10, 4, 1, 1],
    [9, 5, 1, 1],
    [8, 6, 1, 1], [10, 6, 1, 1],
    [7, 7, 1, 1], [11, 7, 1, 1],
  ];
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden
      className={muted ? "text-ink/75" : "text-gold"}
    >
      {[...speaker, ...(muted ? cross : waves)].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="currentColor" />
      ))}
    </svg>
  );
}

/** 8-bit camera icon on a 12×12 pixel grid. */
export function CameraIcon({ size = 24 }: { size?: number }) {
  const body: [number, number, number, number][] = [
    [4, 2, 4, 1], // top bump
    [1, 3, 10, 7], // body
  ];
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" aria-hidden className="text-ink/90">
      {body.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="currentColor" />
      ))}
      <rect x={4} y={4} width={4} height={4} fill="#12164a" />
      <rect x={5} y={5} width={2} height={2} fill="currentColor" />
      <rect x={9} y={4} width={1} height={1} fill="#12164a" />
    </svg>
  );
}

/** 8-bit balloon on a 12×12 pixel grid (opens the ปาโป่ง mini-game). */
export function BalloonIcon({ size = 24 }: { size?: number }) {
  const body: [number, number, number, number][] = [
    [4, 1, 4, 1],
    [3, 2, 6, 1],
    [2, 3, 8, 4],
    [3, 7, 6, 1],
    [4, 8, 4, 1],
    [5, 9, 2, 1], // knot
  ];
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      {body.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="#ff6b81" />
      ))}
      <rect x={4} y={3} width={1} height={2} fill="#fff6dc" />
      <rect x={6} y={10} width={1} height={1} fill="#fff6dc" />
      <rect x={5} y={11} width={1} height={1} fill="#fff6dc" />
    </svg>
  );
}

/** 8-bit pair of cards on a 12×12 grid (opens the match game). */
export function CardsIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      <rect x={1} y={2} width={6} height={8} fill="#7ee8fa" />
      <rect x={2} y={3} width={4} height={6} fill="#12164a" />
      <rect x={3} y={5} width={2} height={2} fill="#7ee8fa" />
      <rect x={5} y={1} width={6} height={8} fill="#ffd166" />
      <rect x={6} y={2} width={4} height={6} fill="#fff6dc" />
      <rect x={7} y={3} width={2} height={1} fill="#ff6b81" />
      <rect x={7} y={4} width={1} height={1} fill="#ff6b81" />
      <rect x={7} y={6} width={1} height={1} fill="#ff6b81" />
    </svg>
  );
}

/** 8-bit star hanging on a string, 12×12 grid (opens the สอยดาว game). */
export function StarIcon({ size = 24 }: { size?: number }) {
  const rows = ["......#.....", "......#.....", "......#.....", "......#.....", ".....###....", "..#########.", "...#######..", "....#####...", "....##.##...", "...##...##.."];
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === "#" ? <rect key={`${x}-${y}`} x={x} y={y + 1} width={1} height={1} fill={y < 4 ? "#a9b0e0" : "#ffd166"} /> : null,
        ),
      )}
    </svg>
  );
}
