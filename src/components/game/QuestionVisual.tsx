import type { QuestionVisual as Visual } from "@/lib/game/topics";
import { DS_COL } from "./BookDiagrams";

const dsOf = (n: number) => 1 + ((n - 1) % 9);
const num = { fontFamily: "var(--font-num)", fontWeight: 800 } as const;

/* The picture beside a design-lesson question (book pp.204–209). It shows where
   the player is, never the answer: the last few points of the table on the
   circle, or the row and column on a blank square. */
export function QuestionVisual({ v }: { v: Visual }) {
  return <div className="qvis" aria-hidden="true">{v.kind === "circle" ? <CircleQ t={v.t} k={v.k} /> : <SquareQ cell={v.cell} keyGrid={v.key} />}</div>;
}

/* The 9-Point Circle with the table's last three points joined, and an arrow
   from the latest one to the "?" — where does the next point land? */
function CircleQ({ t, k }: { t: number; k: number }) {
  const cx = 100, cy = 78, R = 58;
  const pt = (d: number) => {
    const a = ((-90 + d * 40) * Math.PI) / 180;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as const;
  };
  const steps = [];
  for (let j = Math.max(1, k - 3); j < k; j++) steps.push({ j, d: dsOf(t * j) });
  const last = steps[steps.length - 1];
  const trail = steps.map((s, i) => `${i ? "L" : "M"}${pt(s.d)[0].toFixed(1)},${pt(s.d)[1].toFixed(1)}`).join(" ");
  let arrow = "";
  if (last) {
    const [x, y] = pt(last.d);
    const dx = cx - x, dy = cy - y, len = Math.hypot(dx, dy) || 1;
    arrow = `M${(x + (dx / len) * 12).toFixed(1)},${(y + (dy / len) * 12).toFixed(1)} L${(cx - (dx / len) * 16).toFixed(1)},${(cy - (dy / len) * 16).toFixed(1)}`;
  }
  return (
    <svg viewBox="0 0 200 172" className="qvis-svg">
      <defs>
        <marker id="qvTip" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#D63A3A" />
        </marker>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--muted)" strokeOpacity=".55" strokeWidth="1.5" />
      {steps.length > 1 && <path d={trail} fill="none" stroke="#D63A3A" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />}
      {arrow && <path d={arrow} fill="none" stroke="#D63A3A" strokeWidth="2" markerEnd="url(#qvTip)" />}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
        const [x, y] = pt(d);
        const on = last?.d === d;
        return (
          <g key={d}>
            <circle cx={x} cy={y} r="10" fill={on ? "#D63A3A" : "var(--surface)"} stroke={on ? "#D63A3A" : "#5B3FA0"} strokeWidth="1.5" />
            <text x={x} y={y + 4} textAnchor="middle" style={{ ...num, fontSize: 11, fill: on ? "#fff" : "#5B3FA0" }}>{d}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="12" fill="var(--sun1, #FFC83A)" stroke="var(--ink)" strokeWidth="1.5" />
      <text x={cx} y={cy + 5} textAnchor="middle" style={{ ...num, fontSize: 15, fill: "#191B2E" }}>?</text>
      <text x={cx} y="166" textAnchor="middle" style={{ ...num, fontSize: 11.5, fill: "var(--ink)" }}>
        {last ? `${t} × ${last.j} = ${t * last.j} → ${last.d}` : `${t} × 1 → ?`}
      </text>
    </svg>
  );
}

/* The Digit-Sum square. With `cell`, a blank grid with that row and column lit
   and a "?" where they cross. With `keyGrid`, the whole filled square, to use as
   a key once both numbers are reduced. */
function SquareQ({ cell, keyGrid }: { cell?: [number, number]; keyGrid?: boolean }) {
  const C = 17, x0 = 20, y0 = 18;
  const [qr, qc] = cell ?? [0, 0];
  const lit = "#2A5BC9";
  const idx = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return (
    <svg viewBox={`0 0 ${x0 + 9 * C + 4} ${y0 + 9 * C + 4}`} className="qvis-svg">
      {idx.map((i) => (
        <g key={i}>
          <text x={x0 + (i - 0.5) * C} y={y0 - 6} textAnchor="middle" style={{ ...num, fill: i === qc ? lit : "#5B3FA0", fontSize: i === qc ? 11 : 9 }}>{i}</text>
          <text x={x0 - 8} y={y0 + (i - 0.5) * C + 3.5} textAnchor="middle" style={{ ...num, fill: i === qr ? lit : "#5B3FA0", fontSize: i === qr ? 11 : 9 }}>{i}</text>
        </g>
      ))}
      {idx.flatMap((r) =>
        idx.map((c) => {
          const d = dsOf(r * c);
          const q = r === qr && c === qc;
          const line = !keyGrid && (r === qr || c === qc);
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={x0 + (c - 1) * C} y={y0 + (r - 1) * C} width={C} height={C}
                fill={q ? "var(--sun1, #FFC83A)" : keyGrid ? DS_COL[d] : line ? lit : "var(--surface)"}
                fillOpacity={q ? 1 : keyGrid ? 0.14 : line ? 0.14 : 1}
                stroke="#5B3FA0" strokeOpacity=".6" strokeWidth=".6"
              />
              {keyGrid && <text x={x0 + (c - 0.5) * C} y={y0 + (r - 0.5) * C + 3.5} textAnchor="middle" style={{ ...num, fontSize: 9, fill: DS_COL[d] }}>{d}</text>}
              {q && <text x={x0 + (c - 0.5) * C} y={y0 + (r - 0.5) * C + 4.5} textAnchor="middle" style={{ ...num, fontSize: 12, fill: "#191B2E" }}>?</text>}
            </g>
          );
        })
      )}
    </svg>
  );
}
