import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/* The picture that goes out with a share. Rendered server-side so the same
   image serves two jobs: the preview a link unfurls into on X / LINE / WhatsApp,
   and the file attached to the native share sheet. One renderer, not two. */

export const runtime = "nodejs";

/* Open Graph's usual 1200x630. */
const W = 1200;
const H = 630;

/* No custom font is embedded on purpose. Satori cannot parse variable fonts
   (Nunito[wght].ttf threw "cannot read properties of undefined"), and the static
   URLs on the Google Fonts repo have moved, so fetching one at render time would
   make every card depend on a third-party path staying put. The built-in
   fallback renders cleanly; if heavier numerals are wanted, the fix is to commit
   a static OFL font to the repo and load it from disk like the logo below. */

/* The real tree, inlined. Satori cannot fetch a relative URL, and an absolute
   one would mean the card depending on its own deployment being reachable. */
let logoCache: string | null | undefined;
async function logoDataUri(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "brand", "vedank-mark.png"));
    logoCache = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    logoCache = null;
  }
  return logoCache;
}

type Focus = "level" | "gems" | "streak" | "hearts" | "blitz" | "bosses" | "puzzles";

const FACE: Record<Focus, { icon: string; label: string; from: string; to: string }> = {
  level: { icon: "🪔", label: "LEVEL", from: "#9B30FF", to: "#FF4D1C" },
  gems: { icon: "💎", label: "GEMS EARNED", from: "#2979FF", to: "#00E0FF" },
  streak: { icon: "🔥", label: "DAY STREAK", from: "#FF7A3D", to: "#D81B5B" },
  hearts: { icon: "❤️", label: "HEARTS LEFT", from: "#FF1E3C", to: "#9B30FF" },
  blitz: { icon: "⚡", label: "NUMBER BLITZ", from: "#00C2FF", to: "#4D6BFF" },
  bosses: { icon: "👹", label: "BOSSES BEATEN", from: "#8B5CF6", to: "#FF3DA6" },
  puzzles: { icon: "🧩", label: "PUZZLES SOLVED", from: "#1FE07A", to: "#0FA857" },
};

function clean(s: string | null, max: number): string {
  return (s ?? "").replace(/[\u0000-\u001F<>]/g, "").slice(0, max);
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const focus = (q.get("f") ?? "level") as Focus;
  const face = FACE[focus] ?? FACE.level;
  /* Everything is clamped and stripped: these land in an image anyone can
     request, so a crafted query must not be able to inject markup or run long. */
  const value = clean(q.get("v"), 12) || "0";
  const who = clean(q.get("n"), 24);
  const sub = clean(q.get("s"), 48);
  const ja = q.get("l") === "ja";
  const logo = await logoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${face.from} 0%, ${face.to} 100%)`,
          padding: "56px 64px",
          fontFamily: "sans-serif",
          color: "#fff",
          position: "relative",
        }}
      >
        {/* Soft discs rather than a tiled dot pattern: Satori does not repeat a
            background image, so the original texture rendered as nothing. */}
        <div
          style={{
            position: "absolute", right: -130, top: -130, width: 460, height: 460,
            borderRadius: 999, background: "rgba(255,255,255,0.13)", display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute", right: 40, top: 40, width: 260, height: 260,
            borderRadius: 999, background: "rgba(255,255,255,0.10)", display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute", left: -90, bottom: -150, width: 380, height: 380,
            borderRadius: 999, background: "rgba(0,0,0,0.10)", display: "flex",
          }}
        />

        {/* brand line */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "rgba(255,255,255,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              overflow: "hidden",
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" width={54} height={54} style={{ objectFit: "contain" }} />
            ) : (
              "🌳"
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "0.02em" }}>{ja ? "VedAnk Academy" : "Sutra Sprint"}</div>
            <div style={{ fontSize: 17, fontWeight: 700, opacity: 0.85, letterSpacing: "0.14em" }}>
              SUTRA SPRINT · VEDIC MATH
            </div>
          </div>
        </div>

        {/* the number, which is the whole point of the picture */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
          <div style={{ fontSize: 108, lineHeight: 1 }}>{face.icon}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: value.length > 4 ? 170 : 220,
                fontWeight: 900,
                lineHeight: 0.92,
                letterSpacing: "-0.03em",
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "0.16em", opacity: 0.95 }}>
              {face.label}
            </div>
          </div>
        </div>

        {/* who, and the line that gives it context */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 800 }}>
            {who ? <div style={{ fontSize: 34, fontWeight: 800 }}>{who}</div> : null}
            {sub ? (
              <div style={{ fontSize: 24, fontWeight: 700, opacity: 0.9, marginTop: 4 }}>{sub}</div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: "rgba(0,0,0,0.22)",
              borderRadius: 999,
              padding: "14px 26px",
            }}
          >
            CAN YOU BEAT IT?
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        /* Immutable per query, so a platform's crawler and the share sheet can
           both be served from cache. */
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
