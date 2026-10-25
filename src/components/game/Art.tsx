/* ---------- the app's own drawn icons ----------
   System emoji look different on every phone (and flat on most), so the
   chrome — tabs, dock, header stats — and the quick-game tiles use these
   instead: one sticker style, a dark outline, a flat fill and a white shine.
   No gradients with ids, so any number can sit on one page. */

const O = "#1d1b33"; /* the outline, the same ink as the cards' borders */
const s = { stroke: O, strokeWidth: 2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export type UiIconName =
  | "learn" | "today" | "play" | "world" | "home" | "quests" | "league" | "rank" | "save" | "gem" | "heart" | "lock" | "card";

export function UiIcon({ name, size = "1em" }: { name: UiIconName; size?: string }) {
  return (
    <svg className={`ui-ico ui-${name}`} viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      {UI[name]}
    </svg>
  );
}

const UI: Record<UiIconName, React.ReactNode> = {
  /* an open book with a spark: lessons */
  learn: (
    <>
      <path d="M16 9.5C12.5 7 8 6.5 3.5 7.5v17c4.5-1 9-.5 12.5 2 3.5-2.5 8-3 12.5-2v-17C24 6.5 19.5 7 16 9.5z" fill="#fff" {...s} />
      <path d="M16 9.5c-3.5-2.5-8-3-12.5-2v17c4.5-1 9-.5 12.5 2z" fill="#5b8def" {...s} />
      <path d="M16 9.5v17" {...s} />
      <path d="M19.5 12.5c2-.8 4-1 6-.8M19.5 16.5c2-.8 4-1 6-.8M19.5 20.5c2-.8 4-1 6-.8" stroke="#b8b2c9" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 11c1.5-.5 3-.6 4.5-.3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
      <path d="M25 1.5l1.2 2.6 2.6 1.2-2.6 1.2L25 9.1l-1.2-2.6-2.6-1.2 2.6-1.2z" fill="#ffc83a" stroke={O} strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  today: (
    <>
      <rect x="4" y="6" width="24" height="22" rx="5" fill="#fff" {...s} />
      <path d="M4 11a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v2H4z" fill="#ff5a6e" {...s} />
      <path d="M10 3.5v5M22 3.5v5" {...s} fill="none" />
      <path d="M13 17.5l2.5-1.5V25M13 25h5" {...s} fill="none" />
      <circle cx="23" cy="21" r="1.6" fill="#ffb02e" />
    </>
  ),
  play: (
    <>
      <path d="M9 9h14c4 0 6 3 6.5 7.5l.6 5.5c.4 3.5-3.6 5-5.6 2.4L22 21H10l-2.5 3.4C5.5 27 1.5 25.5 1.9 22l.6-5.5C3 12 5 9 9 9z" fill="#7a58c0" {...s} />
      <path d="M9 13.5v5M6.5 16h5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="21.5" cy="14.5" r="1.7" fill="#ffd34d" />
      <circle cx="24.5" cy="17.5" r="1.7" fill="#4fd1a5" />
      <path d="M8 11.5c2-1 4-1 6-1" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".55" />
    </>
  ),
  /* a little planet with a ring: your own world */
  world: (
    <>
      <path d="M3.5 21c-2 3.5 9-1 16-6s10.5-8.5 8.5-10" fill="none" {...s} stroke="#ff9a3d" strokeWidth="2.6" />
      <circle cx="16" cy="16" r="10" fill="#4fb3e8" {...s} />
      <path d="M9 12c2 0 3 1.5 5 1s2 2 1 3.5-3 1-4 3-3 .5-3.5-1.5S7 12 9 12zM19 20.5c1.5-1 3.5-.5 4 .5s-1 2.5-2.5 2.5-2.5-2-1.5-3z" fill="#5fd068" stroke={O} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.5 23c-.8 1.6 7-1.6 13-5.6" fill="none" stroke="#ff9a3d" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M11 8.5a8.5 8.5 0 0 1 4-1.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
    </>
  ),
  home: (
    <>
      <path d="M4 15L16 4.5 28 15" fill="none" {...s} strokeWidth="6" />
      <path d="M7 13v13h18V13L16 5.5z" fill="#ffcf5a" {...s} />
      <path d="M13 26v-7h6v7" fill="#ff7a59" {...s} />
      <path d="M4 15L16 4.5 28 15" fill="none" stroke="#ff5a6e" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  quests: (
    <>
      <path d="M8 5h15a3 3 0 0 1 3 3v15H11V8a3 3 0 0 0-3-3z" fill="#fff2cc" {...s} />
      <path d="M8 5a3 3 0 0 0-3 3v2h6" fill="#e9c77b" {...s} />
      <path d="M11 23v1a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-1z" fill="#e9c77b" {...s} />
      <path d="M15 11h7M15 15h7M15 19h4" stroke="#b07a3c" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  league: (
    <>
      <path d="M9 5h14v6a7 7 0 0 1-14 0z" fill="#ffc83a" {...s} />
      <path d="M9 7.5H5c0 4 2 6 5 6.5M23 7.5h4c0 4-2 6-5 6.5" fill="none" {...s} />
      <path d="M14 18h4l1 5h-6z" fill="#e0a21b" {...s} />
      <rect x="9.5" y="23" width="13" height="5" rx="1.5" fill="#7a58c0" {...s} />
      <path d="M12.5 8v3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".75" />
    </>
  ),
  rank: (
    <>
      <circle cx="16" cy="16" r="12" fill="#4fb3e8" {...s} />
      <path d="M16 4c-4 4-4 20 0 24M16 4c4 4 4 20 0 24M4.5 12.5h23M4.5 19.5h23" fill="none" stroke={O} strokeWidth="1.5" />
      <path d="M7 10c1.5-3 4-4.5 6.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
    </>
  ),
  save: (
    <>
      <path d="M9 25a6 6 0 0 1-.8-11.9A8 8 0 0 1 23.5 11 6 6 0 0 1 23 25z" fill="#fff" {...s} />
      <path d="M16 13.5v8M12.5 18l3.5 3.5 3.5-3.5" fill="none" stroke="#e0a21b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  gem: (
    <>
      <path d="M9 5h14l6 7-13 16L3 12z" fill="#5ab8ff" {...s} />
      <path d="M3 12h26M9 5l3 7 4 16M23 5l-3 7-4 16M12 12l4-7 4 7" fill="none" stroke={O} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 7.5l1.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".85" />
    </>
  ),
  heart: (
    <>
      <path d="M16 27S3.5 19.5 3.5 11.5A6.5 6.5 0 0 1 16 8.6a6.5 6.5 0 0 1 12.5 2.9C28.5 19.5 16 27 16 27z" fill="#ff4d6d" {...s} />
      <path d="M8 10.5a3 3 0 0 1 3-2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
    </>
  ),
  /* a Great Minds card: a gold-trimmed card with its medallion */
  card: (
    <>
      <rect x="9" y="3" width="17" height="23" rx="3" fill="#c8b6ff" {...s} transform="rotate(12 17.5 14.5)" />
      <rect x="5" y="6" width="18" height="24" rx="3.5" fill="#fffdf6" {...s} />
      <rect x="7.5" y="8.5" width="13" height="19" rx="2" fill="none" stroke="#e0a21b" strokeWidth="1.4" />
      <circle cx="14" cy="16" r="4.6" fill="#ff7a59" {...s} strokeWidth="1.6" />
      <path d="M12.6 14.6a2 2 0 0 1 1.6-.9" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".8" />
      <path d="M10 24h8" stroke="#b8b2c9" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  lock: (
    <>
      <path d="M10 14v-3a6 6 0 0 1 12 0v3" fill="none" {...s} strokeWidth="2.6" />
      <rect x="6" y="14" width="20" height="14" rx="4" fill="#ffc83a" {...s} />
      <circle cx="16" cy="20" r="2" fill={O} />
      <path d="M16 21v3" {...s} />
    </>
  ),
};

/* ---------- quick-game tiles ----------
   One small scene per game, drawn on the game's own colour. Falls back to the
   emoji for a game that has no drawing yet. */
export function GameArt({ id, fallback }: { id: string; fallback: string }) {
  const art = GAME[id];
  if (!art) return <span className="game-art-emoji">{fallback}</span>;
  return (
    <svg className="game-art" viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
      {art}
    </svg>
  );
}

const num = (x: number, y: number, t: string, size = 11, fill = O) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="'Baloo 2',system-ui,sans-serif" fontWeight="900" fontSize={size} fill={fill}>{t}</text>
);

const GAME: Record<string, React.ReactNode> = {
  /* a shop front with a striped awning */
  konbini: (
    <>
      <rect x="8" y="17" width="32" height="23" rx="2" fill="#fff" {...s} />
      <path d="M6 10h36l-2 9H8z" fill="#3cbf74" {...s} />
      <path d="M14 10l-1 9M22 10v9M30 10l1 9" stroke="#fff" strokeWidth="3" />
      <path d="M6 10h36l-2 9H8z" fill="none" {...s} />
      <rect x="12" y="24" width="10" height="16" fill="#9be3ff" {...s} />
      <rect x="26" y="24" width="10" height="8" rx="1" fill="#ffcf5a" {...s} />
      {num(31, 31, "¥", 8)}
      <path d="M14 26.5l3-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  crossword: (
    <>
      {[[8, 8, "#fff"], [20, 8, "#ffd34d"], [32, 8, "#fff"], [8, 20, "#ffd34d"], [20, 20, "#fff"], [8, 32, "#fff"], [32, 20, "#c8b6ff"], [32, 32, "#fff"]].map(([x, y, f], i) => (
        <rect key={i} x={x as number} y={y as number} width="10" height="10" rx="2.5" fill={f as string} {...s} strokeWidth="1.6" />
      ))}
      {num(13, 16.5, "3", 9)}{num(37, 16.5, "5", 9)}{num(25, 28.5, "8", 9)}{num(13, 40.5, "4", 9)}{num(37, 40.5, "?", 9, "#7a58c0")}
    </>
  ),
  /* a balance tipping to the heavier side */
  bigger: (
    <>
      <path d="M24 11v27M15 40h18" fill="none" {...s} strokeWidth="2.6" />
      <path d="M7 17l34-9" fill="none" {...s} strokeWidth="2.6" />
      <path d="M7 17l-4.5 10M7 17l4.5 10M41 8l-4 9M41 8l4 9" stroke={O} strokeWidth="1.3" />
      <path d="M1.5 27h11a5.5 4 0 0 1-11 0z" fill="#ffb02e" {...s} />
      <path d="M36 17h10a5 3.5 0 0 1-10 0z" fill="#ffb02e" {...s} />
      <rect x="3" y="20" width="8" height="7" rx="1.5" fill="#7a58c0" {...s} strokeWidth="1.4" />
      <circle cx="24" cy="12.5" r="2.6" fill="#ff5a6e" {...s} strokeWidth="1.5" />
    </>
  ),
  memory: (
    <>
      <rect x="6" y="11" width="18" height="26" rx="4" fill="#ff7a59" {...s} transform="rotate(-10 15 24)" />
      <path d="M11 17l8 12M19 17l-8 12" stroke="#fff" strokeWidth="1.4" opacity=".55" transform="rotate(-10 15 24)" />
      <rect x="22" y="9" width="18" height="26" rx="4" fill="#fff" {...s} transform="rotate(8 31 22)" />
      {num(31, 27, "7", 15, "#ff5a6e")}
    </>
  ),
  odd: (
    <>
      <circle cx="10" cy="12" r="5" fill="#4fd1a5" {...s} />
      <circle cx="24" cy="10" r="5" fill="#4fd1a5" {...s} />
      <circle cx="11" cy="27" r="5" fill="#4fd1a5" {...s} />
      <circle cx="27" cy="26" r="9" fill="#e6f7ff" {...s} strokeWidth="2.4" />
      <path d="M33.5 32.5l7.5 7.5" stroke={O} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M33.5 32.5l7.5 7.5" stroke="#b07a3c" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M23.5 23l2 2.5 2-4 2 4" fill="none" stroke="#ff5a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 21.5a6 6 0 0 1 4-2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  sortg: (
    <>
      <path d="M6 40h36" {...s} strokeWidth="2.4" />
      <rect x="8" y="30" width="7" height="10" rx="1.5" fill="#4fd1a5" {...s} />
      <rect x="17" y="23" width="7" height="17" rx="1.5" fill="#5ab8ff" {...s} />
      <rect x="26" y="16" width="7" height="24" rx="1.5" fill="#ffc83a" {...s} />
      <rect x="35" y="8" width="7" height="32" rx="1.5" fill="#ff5a6e" {...s} />
      <path d="M8 22l10-9" stroke={O} strokeWidth="2" strokeLinecap="round" />
      <path d="M13.5 12.5l4.5.5-.5 4.5" fill="none" stroke={O} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sprint: (
    <>
      <path d="M9 39l9-25M20 39l8-25M31 39l9-25" stroke="#e9c77b" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M9 39l9-25M20 39l8-25M31 39l9-25" stroke={O} strokeWidth="1" strokeLinecap="round" opacity=".35" />
      <circle cx="18" cy="12.5" r="3.2" fill="#ff5a3d" {...s} strokeWidth="1.4" />
      <circle cx="28" cy="12.5" r="3.2" fill="#ff5a3d" {...s} strokeWidth="1.4" />
      <path d="M40 4c2 2.5 3.5 4 3.5 6.5a3.5 3.5 0 0 1-7 0c0-1.3.6-2 1.3-2.8.3.9.7 1.3 1.2 1.5 0-1.8.4-3.4 1-5.2z" fill="#ffb02e" {...s} strokeWidth="1.4" />
      <circle cx="40" cy="12.5" r="3.2" fill="#ff5a3d" {...s} strokeWidth="1.4" />
    </>
  ),
  tf: (
    <>
      <circle cx="15" cy="24" r="10" fill="none" stroke={O} strokeWidth="7" />
      <circle cx="15" cy="24" r="10" fill="none" stroke="#3cbf74" strokeWidth="4" />
      <path d="M29 15l12 18M41 15L29 33" stroke={O} strokeWidth="7" strokeLinecap="round" />
      <path d="M29 15l12 18M41 15L29 33" stroke="#ff5a6e" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  missing: (
    <>
      <rect x="4" y="16" width="12" height="16" rx="3" fill="#fff" {...s} />
      {num(10, 28.5, "6", 12)}
      {num(20, 28, "+", 11)}
      <rect x="24" y="15" width="14" height="18" rx="3" fill="#ffd34d" {...s} strokeDasharray="3 2.4" />
      {num(31, 29, "?", 14, "#7a58c0")}
      <path d="M40 6l1.4 3 3 1.4-3 1.4L40 15l-1.4-3.2-3-1.4 3-1.4z" fill="#fff" {...s} strokeWidth="1.3" />
    </>
  ),
  lastdigit: (
    <>
      <rect x="4" y="15" width="40" height="18" rx="5" fill="#fff" {...s} />
      {num(13, 29, "4", 13, "#b8b2c9")}{num(22, 29, "7", 13, "#b8b2c9")}
      <rect x="28" y="12" width="14" height="24" rx="4" fill="#ffc83a" {...s} />
      {num(35, 30, "2", 15)}
      <path d="M35 4v5M31 6.5l4 3 4-3" fill="none" {...s} />
    </>
  ),
  digitsum: (
    <>
      <circle cx="24" cy="24" r="17" fill="#fff" {...s} />
      <circle cx="24" cy="24" r="11.5" fill="#ffc83a" {...s} />
      {num(24, 30, "9", 17)}
      <path d="M8 13a18 18 0 0 1 8-6" fill="none" stroke="#ff5a6e" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M13.5 5.5l2.8 1.6-1.4 3" fill="none" stroke="#ff5a6e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 18a8 8 0 0 1 4-3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  div9: (
    <>
      <rect x="6" y="6" width="36" height="36" rx="10" fill="#fff" {...s} />
      <circle cx="24" cy="14.5" r="3.3" fill="#ff5a6e" {...s} strokeWidth="1.5" />
      <rect x="10" y="21.5" width="28" height="5" rx="2.5" fill="#7a58c0" {...s} strokeWidth="1.5" />
      <circle cx="24" cy="33.5" r="3.3" fill="#ff5a6e" {...s} strokeWidth="1.5" />
    </>
  ),
  sq5: (
    <>
      <rect x="6" y="10" width="28" height="28" rx="4" fill="#c8b6ff" {...s} />
      <path d="M15.3 10v28M24.6 10v28M6 19.3h28M6 28.6h28" stroke={O} strokeWidth="1.2" opacity=".55" />
      {num(20, 29.5, "5²", 14)}
      <rect x="31" y="5" width="13" height="10" rx="3" fill="#ffc83a" {...s} strokeWidth="1.6" />
      {num(37.5, 13, "25", 7.5)}
    </>
  ),
  x11: (
    <>
      <rect x="4" y="10" width="40" height="28" rx="8" fill="#fff" {...s} />
      {num(14, 29, "1", 15, "#0a7e92")}{num(24, 27, "×", 11)}
      {num(34, 29, "1", 15, "#0a7e92")}
      <path d="M8 13.5c3-1.5 7-2 11-2" stroke="#4fd1a5" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  estimate: (
    <>
      <circle cx="24" cy="24" r="17" fill="#fff" {...s} />
      <circle cx="24" cy="24" r="11.5" fill="#ff5a6e" {...s} />
      <circle cx="24" cy="24" r="6" fill="#fff" {...s} />
      <circle cx="24" cy="24" r="2" fill="#ff5a6e" />
      <path d="M26 22l15-15" stroke={O} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M37 5.5l4 1.5 1.5 4M34.5 8l4 1.5 1.5 4" fill="none" stroke="#ffb02e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  match: (
    <>
      <rect x="4" y="12" width="20" height="24" rx="4" fill="#5ab8ff" {...s} />
      {num(14, 28, "3+4", 9, "#fff")}
      <rect x="27" y="12" width="17" height="24" rx="4" fill="#fff" {...s} />
      {num(35.5, 30, "7", 15)}
      <path d="M21 8c3-3 6-3 9 0" fill="none" stroke="#ff5a6e" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M22 41l3-3 3 3" fill="none" stroke="#3cbf74" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  pop: (
    <>
      <path d="M17 31c0 4 4 5 2 11M32 30c0 4-3 6-1 12" fill="none" stroke={O} strokeWidth="1.3" />
      <ellipse cx="16" cy="19" rx="10" ry="12" fill="#ff5a6e" {...s} />
      <path d="M14.5 31h3l-1.5-2z" fill="#ff5a6e" {...s} strokeWidth="1.4" />
      <ellipse cx="32" cy="18" rx="9" ry="11" fill="#ffc83a" {...s} />
      <path d="M30.5 29h3L32 27z" fill="#ffc83a" {...s} strokeWidth="1.4" />
      {num(16, 23, "8", 13, "#fff")}{num(32, 22, "5", 12)}
      <path d="M10.5 13a6 6 0 0 1 3-3.5M27.5 12.5a5 5 0 0 1 2.5-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
    </>
  ),
};

