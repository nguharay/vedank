/* The book's mascot: a boy with spiky hair and a maroon hachimaki headband,
   peach face, brown tunic with a gold belt. Drawn on the same 68×68 grid the
   buddy's skins (hats, capes, scarf) are drawn on. The book gives him no mouth;
   "excited" and "sad" add a small one so the app can still react. */
export function Mascot({ mood = "happy" as "happy" | "excited" | "sad", animated = true }) {
  const mouth = mood === "excited" ? "M31.6 38.2 Q34 40.6 36.4 38.2" : mood === "sad" ? "M31.8 39.6 Q34 37.8 36.2 39.6" : null;
  return (
    <svg viewBox="0 0 68 68" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className={animated ? "mascot-bob" : ""}>
      <ellipse className={animated ? "mascot-shadow" : ""} cx="34" cy="65.2" rx="14" ry="2.2" fill="#000" opacity=".12" />
      {/* tunic + gold belt */}
      <rect x="19" y="40" width="30" height="24" rx="8" fill="#A67550" />
      <rect x="19.2" y="53.4" width="29.6" height="4.8" rx="2.4" fill="#AE8E54" />
      {/* face */}
      <circle cx="34" cy="29.6" r="16" fill="#EFCBA6" />
      {/* hair: dome + three spikes */}
      <path d="M18.2 27.4 A16 16 0 0 1 49.8 27.4 L49.8 22 L18.2 22 Z" fill="#3B2720" />
      <path d="M18.4 24 A16 15 0 0 1 49.6 24 Z" fill="#3B2720" />
      <path d="M25.8 18 L29.4 3.6 L34 17 Z M33.6 17 L38.2 2.8 L41.2 17 Z M38.8 17.5 L42.6 5.2 L45.4 18.5 Z" fill="#3B2720" />
      {/* hachimaki headband with gold crest and a tail */}
      <rect x="18.1" y="19.6" width="31.8" height="4.4" rx="2" fill="#8E4F52" />
      <ellipse cx="34" cy="21.8" rx="1.9" ry="1.35" fill="#B09050" />
      <path d="M48.4 21 L55 23.2" stroke="#8E4F52" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="48.2" cy="20.9" r="1.8" fill="#7A3F43" />
      {/* cheeks */}
      <ellipse cx="23.9" cy="32.4" rx="2.5" ry="1.35" fill="#EDB5B5" />
      <ellipse cx="44.1" cy="32.4" rx="2.5" ry="1.35" fill="#EDB5B5" />
      {/* eyes */}
      <g className={animated ? "mascot-blink" : ""}>
        <ellipse cx="27.7" cy="29.3" rx="1.95" ry="2.6" fill="#231815" />
        <ellipse cx="40.3" cy="29.3" rx="1.95" ry="2.6" fill="#231815" />
        <circle cx="28.3" cy="28.3" r="0.7" fill="#fff" />
        <circle cx="40.9" cy="28.3" r="0.7" fill="#fff" />
      </g>
      {/* nose */}
      <ellipse cx="34" cy="35" rx="2.6" ry="1.6" fill="#8A5550" />
      {mouth && <path d={mouth} fill="none" stroke="#8A5550" strokeWidth="1.2" strokeLinecap="round" />}
    </svg>
  );
}

export function Mandala({ stroke = "#fff" }: { stroke?: string }) {
  const rings = [46, 36, 26, 16];
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = ((i * 30) * Math.PI) / 180;
    return {
      x1: 50 + 16 * Math.cos(a),
      y1: 50 + 16 * Math.sin(a),
      x2: 50 + 46 * Math.cos(a),
      y2: 50 + 46 * Math.sin(a),
    };
  });
  const dots = Array.from({ length: 8 }, (_, j) => {
    const b = ((j * 45) * Math.PI) / 180;
    return { cx: 50 + 36 * Math.cos(b), cy: 50 + 36 * Math.sin(b) };
  });
  return (
    <g fill="none" stroke={stroke} strokeWidth="1">
      {rings.map((r) => (
        <circle key={r} cx={50} cy={50} r={r} strokeDasharray={r > 30 ? "4 3" : "3 3"} />
      ))}
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
      ))}
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={4} />
      ))}
    </g>
  );
}
