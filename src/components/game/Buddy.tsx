"use client";
import { Mascot } from "./Mascot";
import { skinOf, type Outfit } from "./useSkins";

export type BuddyMood = "happy" | "excited" | "sad";

/* Attire drawn over the mascot in the same 68×68 viewBox it uses, so the pieces
   line up with its head and shoulders without any per-skin fiddling. The body
   is never recoloured — the sprout is the character, the outfit is the reward. */
function HeadPiece({ kind, outfit }: { kind: Outfit["head"]; outfit: Outfit }) {
  switch (kind) {
    case "leaf":
      return (
        <g>
          <path d="M34 7 Q26 2 20 6 Q26 12 34 9 Z" fill={outfit.capeEdge} stroke="#2E5A10" strokeWidth="1" />
          <path d="M34 7 Q42 2 48 6 Q42 12 34 9 Z" fill={outfit.cape} stroke="#2E5A10" strokeWidth="1" />
        </g>
      );
    case "flame":
      return (
        <g className="buddy-flicker">
          <path d="M30 8 Q31 1 34 -2 Q37 1 38 8 Q34 5 30 8 Z" fill={outfit.capeEdge} />
          <path d="M32 8 Q33 3 34 1 Q35 3 36 8 Q34 6 32 8 Z" fill="#FFE480" />
          <path d="M25 10 Q25 5 27 3 Q29 6 29 10 Z" fill={outfit.cape} opacity=".9" />
          <path d="M43 10 Q43 5 41 3 Q39 6 39 10 Z" fill={outfit.cape} opacity=".9" />
        </g>
      );
    case "bolt":
      return (
        <g>
          <path d="M31 2 L39 2 L34 8 L40 8 L29 17 L32 9 L27 9 Z" fill={outfit.spark} stroke="#0068A8" strokeWidth="1" strokeLinejoin="round" />
        </g>
      );
    case "halo":
      return (
        <g>
          <ellipse cx="34" cy="4" rx="13" ry="3.6" fill="none" stroke={outfit.spark} strokeWidth="2" opacity=".95" />
          <circle cx="21" cy="4" r="1.6" fill={outfit.capeEdge} />
          <circle cx="47" cy="4" r="1.6" fill={outfit.capeEdge} />
          <circle cx="34" cy="1" r="1.3" fill="#fff" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M23 9 L23 2 L28 6 L34 0 L40 6 L45 2 L45 9 Z" fill={outfit.scarf} stroke={outfit.cape} strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="34" cy="3" r="1.5" fill="#fff" opacity=".9" />
        </g>
      );
    default:
      return null;
  }
}

export function Buddy({
  skinId,
  mood = "happy",
  animated = true,
  className = "",
}: {
  skinId: string;
  mood?: BuddyMood;
  animated?: boolean;
  className?: string;
}) {
  const outfit = skinOf(skinId).outfit;
  const hasCape = skinId !== "classic";

  return (
    <div className={`buddy-figure ${className}`}>
      {/* the cape sits behind the mascot, the head piece in front */}
      {hasCape && (
        <svg className="buddy-layer buddy-cape" viewBox="0 0 68 68" aria-hidden="true">
          {/* Flares past the body's silhouette (which spans x 8-60) — a cape
              tucked inside it would simply be hidden. */}
          <path
            d="M23 32 Q11 45 7 64 Q20 58 34 58 Q48 58 61 64 Q57 45 45 32 Q40 38 34 38 Q28 38 23 32 Z"
            fill={outfit.cape}
            stroke={outfit.capeEdge}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <div className="buddy-body">
        <Mascot mood={mood} animated={animated} />
      </div>

      <svg className="buddy-layer buddy-attire" viewBox="0 0 68 68" aria-hidden="true">
        {/* The collar sits below the mouth (which ends at y 46) so the face stays clear. */}
        {hasCape && (
          <path d="M25 41 Q34 46 43 41 Q42 46 34 48 Q26 46 25 41 Z" fill={outfit.scarf} stroke={outfit.capeEdge} strokeWidth="1" />
        )}
        <HeadPiece kind={outfit.head} outfit={outfit} />
      </svg>

      {animated && skinId !== "classic" && (
        <svg className="buddy-layer buddy-sparks" viewBox="0 0 68 68" aria-hidden="true">
          <circle className="buddy-spark s1" cx="12" cy="24" r="1.8" fill={outfit.spark} />
          <circle className="buddy-spark s2" cx="56" cy="30" r="1.4" fill={outfit.spark} />
          <circle className="buddy-spark s3" cx="50" cy="14" r="1.2" fill={outfit.spark} />
        </svg>
      )}
    </div>
  );
}
