/* Townsfolk drawn in the book mascot's flat style (same 68×68 grid, same
   face, eyes and cheeks) so customers in the shop games look like they live
   in the same world as the boy — not like emoji. `seed` picks a stable mix
   of skin, hair style, hair colour and clothes; `mood` changes the mouth
   and brows. No glasses, on purpose. */
export type PersonMood = "happy" | "wait" | "cross" | "angry";

const SKIN = ["#EFCBA6", "#F3D6B6", "#DDAE85", "#C8906A", "#F6DCC4"];
const HAIR = ["#3B2720", "#1F1A1A", "#6B4226", "#8C5A36", "#B9B4AE", "#4A2E24"];
const SHIRT = ["#E07B39", "#3E7CC9", "#2E8B57", "#B84A6E", "#7A58C0", "#D4A233", "#4B5563", "#C0392B"];
const STYLES = ["short", "long", "bun", "bob", "spiky", "ponytail", "cap", "elder"] as const;
type Style = (typeof STYLES)[number];

function pick<T>(a: readonly T[], seed: number, salt: number): T {
  const h = Math.abs(Math.imul(seed + 1, 2654435761) ^ Math.imul(salt + 7, 40503)) >>> 0;
  return a[h % a.length];
}

export function Person({ seed, mood = "wait", size }: { seed: number; mood?: PersonMood; size?: number }) {
  const skin = pick(SKIN, seed, 1);
  const style: Style = pick(STYLES, seed, 2);
  const hair = style === "elder" ? "#C9C4BE" : pick(HAIR, seed, 3);
  const shirt = pick(SHIRT, seed, 4);
  const trim = pick(SHIRT, seed, 5);

  const mouth =
    mood === "happy" ? "M30.6 37.8 Q34 41.4 37.4 37.8"
    : mood === "wait" ? "M31.6 38.6 L36.4 38.6"
    : mood === "cross" ? "M31.4 39.4 Q34 38.2 36.6 39.4"
    : "M30.8 40.2 Q34 36.8 37.2 40.2";

  return (
    <svg viewBox="0 0 68 68" width={size ?? "100%"} height={size ?? "100%"} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="34" cy="65.2" rx="14" ry="2.2" fill="#000" opacity=".12" />
      {/* long hair falls behind the shoulders */}
      {(style === "long" || style === "ponytail") && (
        <path d={style === "long" ? "M17 26 L15.6 50 Q34 56 52.4 50 L51 26 Z" : "M47 22 Q58 30 52 46 Q50 36 46 30 Z"} fill={hair} />
      )}
      {/* body + trim (collar / apron band) */}
      <rect x="19" y="40" width="30" height="24" rx="8" fill={shirt} />
      <rect x="19.2" y="53.4" width="29.6" height="4.8" rx="2.4" fill={trim} opacity=".85" />
      <path d="M28 40.4 L34 46 L40 40.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" opacity=".7" />
      {/* face */}
      <circle cx="34" cy="29.6" r="16" fill={skin} />
      {/* hair on top */}
      {style === "short" && <path d="M18.2 27.4 A16 16 0 0 1 49.8 27.4 Q42 20 34 22 Q26 20 18.2 27.4 Z" fill={hair} />}
      {style === "long" && <path d="M18 29 A16 16 0 0 1 50 29 Q44 19 34 20.5 Q24 19 18 29 Z" fill={hair} />}
      {style === "bob" && <path d="M17.6 36 L17.6 27 A16.4 16.4 0 0 1 50.4 27 L50.4 36 L46.6 36 L46.6 25 Q34 18 21.4 25 L21.4 36 Z" fill={hair} />}
      {style === "bun" && (
        <>
          <circle cx="34" cy="11.4" r="6.4" fill={hair} />
          <path d="M18.2 27.4 A16 16 0 0 1 49.8 27.4 Q42 21 34 22.4 Q26 21 18.2 27.4 Z" fill={hair} />
        </>
      )}
      {style === "ponytail" && <path d="M18.2 27.4 A16 16 0 0 1 49.8 27.4 Q42 21 34 22.4 Q26 21 18.2 27.4 Z" fill={hair} />}
      {style === "spiky" && (
        <>
          <path d="M18.4 24 A16 15 0 0 1 49.6 24 Z" fill={hair} />
          <path d="M22 20 L24.6 8.6 L29.4 18 Z M29 17.6 L33.6 5.6 L37.4 17.4 Z M36.8 17.6 L42.4 8.2 L44.8 20 Z" fill={hair} />
        </>
      )}
      {style === "cap" && (
        <>
          <path d="M18.4 25 A16 15.4 0 0 1 49.6 25 Z" fill={shirt} />
          <rect x="30" y="22.6" width="24" height="3.6" rx="1.8" fill={trim} />
        </>
      )}
      {style === "elder" && (
        <>
          <path d="M18.4 28 Q18 20 23 18.6 Q22 24 20.6 30 Z M49.6 28 Q50 20 45 18.6 Q46 24 47.4 30 Z" fill={hair} />
          <path d="M28.6 39.8 Q34 43.6 39.4 39.8 Q34 41.4 28.6 39.8 Z" fill={hair} />
        </>
      )}
      {/* cheeks — pinker when cross */}
      <ellipse cx="23.9" cy="32.4" rx="2.5" ry="1.35" fill={mood === "angry" ? "#E88080" : "#EDB5B5"} />
      <ellipse cx="44.1" cy="32.4" rx="2.5" ry="1.35" fill={mood === "angry" ? "#E88080" : "#EDB5B5"} />
      {/* eyes */}
      <ellipse cx="27.7" cy="29.3" rx="1.95" ry={mood === "happy" ? 2.2 : 2.6} fill="#231815" />
      <ellipse cx="40.3" cy="29.3" rx="1.95" ry={mood === "happy" ? 2.2 : 2.6} fill="#231815" />
      <circle cx="28.3" cy="28.3" r="0.7" fill="#fff" />
      <circle cx="40.9" cy="28.3" r="0.7" fill="#fff" />
      {(mood === "cross" || mood === "angry") && (
        <path d="M24.4 24.6 L30.4 26.2 M43.6 24.6 L37.6 26.2" stroke="#3B2720" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {/* nose + mouth */}
      <ellipse cx="34" cy="34.6" rx="2" ry="1.3" fill="#8A5550" opacity=".8" />
      <path d={mouth} fill="none" stroke="#8A5550" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
