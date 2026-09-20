export function Mascot({ mood = "happy" as "happy" | "excited" | "sad", animated = true }) {
  const mouth =
    mood === "excited" ? "M27 41 Q34 50 41 41" : mood === "sad" ? "M27 45 Q34 39 41 45" : "M28 40 Q34 46 40 40";
  const cheeks = mood === "excited";
  const brow =
    mood === "excited" ? "M20 26 Q24 22 28 25 M40 25 Q44 22 48 26" : mood === "sad" ? "M20 27 Q24 30 28 28 M40 28 Q44 30 48 27" : "M20 26 Q24 24 28 26 M40 26 Q44 24 48 26";
  return (
    <svg viewBox="0 0 68 68" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className={animated ? "mascot-bob" : ""}>
      <defs>
        <radialGradient id="mg" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#B7F27A" />
          <stop offset="55%" stopColor="#79D62D" />
          <stop offset="100%" stopColor="#4E9E1B" />
        </radialGradient>
      </defs>
      <ellipse className={animated ? "mascot-shadow" : ""} cx="34" cy="60" rx="16" ry="4" fill="#000" opacity=".1" />
      <path
        d="M34 6c4 6 4 10 1 13 6-2 11 1 12 7 4-1 8 3 6 8-1 3-4 4-4 4 4 3 4 9-1 12-8 5-24 5-32 0-5-3-5-9-1-12 0 0-3-1-4-4-2-5 2-9 6-8 1-6 6-9 12-7-3-3-3-7 1-13 1-1 3-1 4 0z"
        fill="url(#mg)"
        stroke="#3E7A16"
        strokeWidth="1.4"
      />
      {cheeks && (
        <>
          <circle cx="19" cy="36" r="3.4" fill="#3E9401" opacity=".5" />
          <circle cx="49" cy="36" r="3.4" fill="#3E9401" opacity=".5" />
        </>
      )}
      <path d={brow} fill="none" stroke="#2E5A10" strokeWidth="1.6" strokeLinecap="round" />
      <g className={animated ? "mascot-blink" : ""}>
        <ellipse cx="24" cy="33.5" rx="5.1" ry="5.6" fill="#20360C" />
        <ellipse cx="44" cy="33.5" rx="5.1" ry="5.6" fill="#20360C" />
        <ellipse cx="25.8" cy="31.2" rx="1.7" ry="2.2" fill="#fff" />
        <ellipse cx="45.8" cy="31.2" rx="1.7" ry="2.2" fill="#fff" />
        <circle cx="22.6" cy="35.2" r="0.8" fill="#fff" opacity=".75" />
        <circle cx="42.6" cy="35.2" r="0.8" fill="#fff" opacity=".75" />
      </g>
      <path d={mouth} fill="none" stroke="#2E5A10" strokeWidth="2.4" strokeLinecap="round" />
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
