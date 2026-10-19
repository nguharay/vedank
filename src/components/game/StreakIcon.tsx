/* The streak mark: a little diya lamp in the game's own colours — drawn, so
   it looks the same on every phone. `lit` makes the flame flicker. */
export function StreakIcon({ lit = false, size = "1.15em" }: { lit?: boolean; size?: string }) {
  return (
    <svg className={`streak-ico${lit ? " lit" : ""}`} viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="sk-flame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe27a"/><stop offset=".55" stopColor="#ff9a3d"/><stop offset="1" stopColor="#ff3d77"/></linearGradient>
        <linearGradient id="sk-bowl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd66b"/><stop offset="1" stopColor="#c9842a"/></linearGradient>
        <radialGradient id="sk-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffcf3a" stopOpacity=".55"/><stop offset="1" stopColor="#ffcf3a" stopOpacity="0"/></radialGradient>
      </defs>
      <circle className="streak-glow" cx="16" cy="12" r="11" fill="url(#sk-glow)"/>
      <path className="streak-flame" d="M16 3c2.2 3.2 5.5 5.6 5.5 10a5.5 5.5 0 0 1-11 0c0-2.2 1-3.6 2.1-5 .4 1.6 1.2 2.4 2.1 2.7C14.3 8.4 15.2 5.8 16 3z" fill="url(#sk-flame)"/>
      <path className="streak-core" d="M16 10.5c.9 1.3 2.2 2.3 2.2 4.1a2.2 2.2 0 0 1-4.4 0c0-1.5 1.1-2.5 2.2-4.1z" fill="#fff6c8"/>
      <path d="M4 20h24c0 4.6-5.4 8-12 8S4 24.6 4 20z" fill="url(#sk-bowl)" stroke="#1d1b33" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M8 21.5c2 1.3 5 2 8 2s6-.7 8-2" stroke="#fff3c4" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".8"/>
    </svg>
  );
}
