/* ---- Kaze, the ninja kid ----
   An original anime-style character (spiky hair, big eyes, headband, scarf)
   who stands in for the old dragon. Drawn here so it looks the same on every
   phone; deliberately not any existing character: dark blue hair, a red band
   with a star plate, a purple scarf. */
export function NinjaKid({ size = "1em", title }: { size?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} style={{ display: "inline-block", verticalAlign: "middle" }}>
      {title && <title>{title}</title>}
      {/* scarf behind the head, flapping to the right */}
      <path d="M38 50c8 1 15-2 20-7-2 7-8 12-16 13z" fill="#7c4dcc" stroke="#1d1b33" strokeWidth="2" strokeLinejoin="round" />
      {/* spiky hair (back layer) */}
      <path d="M12 30 6 14l11 6 2-14 8 11 6-13 5 13 8-10 1 14 11-5-6 16z" fill="#25305e" stroke="#1d1b33" strokeWidth="2" strokeLinejoin="round" />
      {/* face */}
      <path d="M14 30c0-9 8-14 18-14s18 5 18 14v6c0 10-8 17-18 17S14 46 14 36z" fill="#ffd9b8" stroke="#1d1b33" strokeWidth="2" />
      {/* fringe */}
      <path d="M14 30c3-6 6-8 9-8l-1 6 6-6 2 5 5-6 2 6 5-5 0 6c3 0 5 1 8 2-3-9-11-14-19-14-9 0-16 5-19 14z" fill="#25305e" stroke="#1d1b33" strokeWidth="2" strokeLinejoin="round" />
      {/* headband with a star plate */}
      <path d="M13 30c6-3 13-4 19-4s13 1 19 4l-1 5c-6-2-12-3-18-3s-12 1-18 3z" fill="#e2384f" stroke="#1d1b33" strokeWidth="2" strokeLinejoin="round" />
      <rect x="25" y="26.5" width="14" height="8" rx="2" fill="#dfe6f2" stroke="#1d1b33" strokeWidth="1.8" />
      <path d="m32 28 1.1 2.1 2.3.3-1.7 1.6.4 2.3-2.1-1.1-2.1 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="#25305e" />
      {/* eyes */}
      <ellipse cx="25" cy="41" rx="3.6" ry="4.6" fill="#1d1b33" />
      <ellipse cx="39" cy="41" rx="3.6" ry="4.6" fill="#1d1b33" />
      <circle cx="26.2" cy="39.4" r="1.3" fill="#fff" />
      <circle cx="40.2" cy="39.4" r="1.3" fill="#fff" />
      {/* brows, cheeks, grin */}
      <path d="M21 35.5l7 1.5M43 35.5l-7 1.5" stroke="#1d1b33" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="20" cy="46" rx="2.6" ry="1.5" fill="#ff9aa8" opacity=".7" />
      <ellipse cx="44" cy="46" rx="2.6" ry="1.5" fill="#ff9aa8" opacity=".7" />
      <path d="M28 48c2 2.2 6 2.2 8 0" fill="none" stroke="#1d1b33" strokeWidth="2" strokeLinecap="round" />
      {/* scarf at the neck */}
      <path d="M18 52c8 4 20 4 28 0l1 5c-9 4-21 4-30 0z" fill="#7c4dcc" stroke="#1d1b33" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
