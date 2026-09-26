import type { Lang } from "@/lib/game/topics";

// Diagrams redrawn from the printed book's "how it works" pages, one per topic.
// Each keeps the book's own worked example, geometry and colour language.

function StepArrow({ x, y, label, tone }: { x: number; y: number; label: string; tone: "a" | "b" }) {
  const w = 62, h = 20;
  return (
    <g className={`bd-step bd-step-${tone}`}>
      <path d={`M${x},${y} H${x + w} L${x + w + 12},${y + h / 2} L${x + w},${y + h} H${x} Z`} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="bd-step-label">{label}</text>
    </g>
  );
}

function AnswerBox({ x, y, w, h, value }: { x: number; y: number; w: number; h: number; value: string }) {
  // "Q 2 · R 5" needs a smaller face than "374" to stay inside the box
  const compact = value.length > 5;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} className="bd-ansbox" />
      <text
        x={x + w / 2}
        y={y + h / 2 + (compact ? 6 : 9)}
        textAnchor="middle"
        className={`bd-ansnum${compact ? " bd-ansnum-sm" : ""}`}
      >
        {value}
      </text>
    </g>
  );
}

// Book p.54 — Multiplication by 11, first example: 34 × 11.
// "34" fans down to its outer digits; the neighbour sum (3+4) arcs in between.
function Mult11Diagram({ lang }: { lang: Lang }) {
  return (
    <svg viewBox="0 0 300 196" className="bd-svg">
      <text x="155" y="34" className="bd-digit-lg" textAnchor="middle">34</text>
      <path d="M147,42 L119,70" className="bd-fan" markerEnd="url(#m11Fan)" />
      <path d="M163,42 L191,70" className="bd-fan" markerEnd="url(#m11Fan)" />

      <text x="112" y="96" className="bd-digit-lg" textAnchor="middle">3</text>
      <text x="155" y="96" className="bd-digit-lg bd-mid" textAnchor="middle">7</text>
      <text x="198" y="96" className="bd-digit-lg" textAnchor="middle">4</text>

      <path d="M114,106 Q155,150 196,106" className="bd-arc" fill="none" markerStart="url(#m11Arc)" markerEnd="url(#m11Arc)" />
      <text x="155" y="122" className="bd-plus" textAnchor="middle">+</text>

      <StepArrow x={10} y={80} label={lang === "ja" ? "手順1" : "Step 1"} tone="a" />
      <StepArrow x={24} y={116} label={lang === "ja" ? "手順2" : "Step 2"} tone="b" />

      <AnswerBox x={104} y={148} w={110} h={40} value="374" />
      <defs>
        <marker id="m11Fan" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" className="bd-fanHead" />
        </marker>
        <marker id="m11Arc" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-arcTip" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.54 — second example: 825 × 11 = 9075.
// Outer 8 and 5 fan down; each neighbour pair is summed (8+2 = 10, 2+5 = 7);
// the 1 of the 10 carries back onto the 8.
function Mult11Diagram2({ lang }: { lang: Lang }) {
  return (
    <svg viewBox="0 0 340 140" className="bd-svg bd-svg-wide">
      <text x="148" y="28" className="bd-digit-lg" textAnchor="middle">8</text>
      <text x="166" y="28" className="bd-digit-lg" textAnchor="middle">2</text>
      <text x="184" y="28" className="bd-digit-lg" textAnchor="middle">5</text>
      {/* neighbour pairs */}
      <path d="M168,34 C168,62 150,62 150,40" className="bd-arc" fill="none" markerEnd="url(#m11bArc)" />
      <path d="M186,34 C186,62 168,62 168,40" className="bd-arc" fill="none" markerEnd="url(#m11bArc)" />
      {/* outer digits */}
      <path d="M141,34 L113,64" className="bd-fan" markerEnd="url(#m11bFan)" />
      <path d="M191,34 L219,64" className="bd-fan" markerEnd="url(#m11bFan)" />

      <text x="108" y="90" className="bd-digit-lg" textAnchor="middle">8</text>
      <text x="138" y="90" className="bd-num" textAnchor="middle">1</text>
      <text x="152" y="90" className="bd-digit-lg bd-mid" textAnchor="middle">0</text>
      <text x="182" y="90" className="bd-digit-lg bd-mid" textAnchor="middle">7</text>
      <text x="224" y="90" className="bd-digit-lg" textAnchor="middle">5</text>

      <text x="186" y="108" className="bd-plus" textAnchor="middle">2+5</text>
      <text x="150" y="128" className="bd-plus" textAnchor="middle">8+2</text>
      {/* carry the 1 onto the 8 */}
      <path d="M140,98 Q128,120 110,100" className="bd-arc" fill="none" markerEnd="url(#m11bArc)" />

      <StepArrow x={10} y={68} label={lang === "ja" ? "手順1" : "Step 1"} tone="a" />
      <StepArrow x={24} y={100} label={lang === "ja" ? "手順2" : "Step 2"} tone="b" />

      <AnswerBox x={246} y={62} w={86} h={38} value="9075" />
      <defs>
        <marker id="m11bFan" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" className="bd-fanHead" />
        </marker>
        <marker id="m11bArc" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-arcTip" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.44 — Tens sum 10 and Units is same, first example: 34 × 74 = 2516.
// Left: the tens multiply (vertical ×) and the shared unit is added (the "+" flag) → 25.
// Right: the boxed units column multiplies → 16.
function SpecialMult2Diagram() {
  return (
    <svg viewBox="0 0 340 230" className="bd-svg bd-svg-wide">
      <text x="10" y="18" className="bd-note">(3×7) + 4 = 25</text>
      <text x="10" y="44" className="bd-note">4 × 4 = 16</text>

      {/* left panel */}
      <text x="60" y="64" className="bd-opk">+</text>
      <path d="M68,82 V64 L106,84" className="bd-curve" fill="none" markerEnd="url(#sm3Tip)" />
      <path d="M68,84 V130" className="bd-curve" markerStart="url(#sm3Tip)" markerEnd="url(#sm3Tip)" />
      <text x="50" y="112" className="bd-opk">×</text>
      <text x="84" y="100" className="bd-num" textAnchor="middle">3</text>
      <text x="112" y="100" className="bd-num" textAnchor="middle">4</text>
      <text x="40" y="136" className="bd-opk">×</text>
      <text x="84" y="136" className="bd-num" textAnchor="middle">7</text>
      <text x="112" y="136" className="bd-num" textAnchor="middle">4</text>
      <line x1="34" y1="146" x2="140" y2="146" className="bd-rule" />
      <text x="86" y="170" className="bd-part" textAnchor="middle">(3×7)+4</text>

      {/* right panel */}
      <text x="226" y="100" className="bd-num" textAnchor="middle">3</text>
      <text x="254" y="100" className="bd-num" textAnchor="middle">4</text>
      <text x="198" y="136" className="bd-opk">×</text>
      <text x="226" y="136" className="bd-num" textAnchor="middle">7</text>
      <text x="254" y="136" className="bd-num" textAnchor="middle">4</text>
      <rect x="242" y="80" width="26" height="62" rx="4" className="bd-colbox" />
      <path d="M280,84 V136" className="bd-vdouble" markerStart="url(#sm3Up)" markerEnd="url(#sm3Up)" />
      <text x="288" y="114" className="bd-op">×</text>
      <line x1="196" y1="146" x2="284" y2="146" className="bd-rule" />
      <text x="238" y="170" className="bd-part" textAnchor="end">25</text>
      <text x="244" y="170" className="bd-part bd-part-hi">16</text>

      <AnswerBox x={110} y={184} w={120} h={38} value="2516" />
      <defs>
        <marker id="sm3Tip" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-curveHead" />
        </marker>
        <marker id="sm3Up" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-vdoubleHead" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.44 — second example: 27 × 87 = 2349, both steps in one figure.
function SpecialMult2Diagram2() {
  return (
    <svg viewBox="0 0 300 222" className="bd-svg">
      <text x="10" y="18" className="bd-note">(2×8) + 7 = 23</text>
      <text x="10" y="44" className="bd-note">7 × 7 = 49</text>

      <path d="M132,82 V64 L172,84" className="bd-curve" fill="none" markerEnd="url(#sm4Tip)" />
      <path d="M132,84 V130" className="bd-curve" markerStart="url(#sm4Tip)" markerEnd="url(#sm4Tip)" />
      <text x="114" y="112" className="bd-opk">×</text>
      <text x="150" y="100" className="bd-num" textAnchor="middle">2</text>
      <text x="179" y="100" className="bd-num" textAnchor="middle">7</text>
      <text x="104" y="136" className="bd-opk">×</text>
      <text x="150" y="136" className="bd-num" textAnchor="middle">8</text>
      <text x="179" y="136" className="bd-num" textAnchor="middle">7</text>
      <rect x="166" y="80" width="26" height="62" rx="4" className="bd-colbox" />
      <path d="M204,84 V136" className="bd-vdouble" markerStart="url(#sm4Up)" markerEnd="url(#sm4Up)" />
      <text x="212" y="114" className="bd-op">×</text>
      <line x1="100" y1="148" x2="214" y2="148" className="bd-rule" />
      <text x="164" y="172" className="bd-part" textAnchor="end">23</text>
      <text x="170" y="172" className="bd-part bd-part-hi">49</text>

      <AnswerBox x={90} y={182} w={120} h={36} value="2349" />
      <defs>
        <marker id="sm4Tip" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-curveHead" />
        </marker>
        <marker id="sm4Up" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-vdoubleHead" />
        </marker>
      </defs>
    </svg>
  );
}

/* Inline so these figures never depend on stylesheet timing: carries must read as small prefixes. */
const S_NUM = { fontFamily: "var(--font-num)", fontSize: 17, fontWeight: 800, fill: "var(--ink)" } as const;
const S_CARRY = { fontFamily: "var(--font-num)", fontSize: 10, fontWeight: 800, fill: "var(--ink-dim)" } as const;
const S_ORANGE = { fontFamily: "Nunito, sans-serif", fontSize: 13, fontWeight: 900, fill: "var(--sun1)" } as const;
const S_BLUE = { fill: "var(--blue)" } as const;

// Book p.64 — both numbers start with 1 (12–19). Step 1: units × units, write the
// units, carry the tens. Step 2: first number + units of the second (+ carry).
function Mult1xFig({ a, b, lang }: { a: number; b: number; lang: Lang }) {
  const ja = lang === "ja";
  const ua = a % 10, ub = b % 10, p = ua * ub, u = p % 10, c = Math.floor(p / 10);
  const left = a + ub;
  const answer = (left + c) * 10 + u;
  const x2 = 176;
  const notes = c > 0;
  const digits = (x0: number, blue: boolean) => (
    <>
      <text x={x0 + 58} y="52" className="bd-num" textAnchor="middle">1</text>
      <text x={x0 + 80} y="52" className="bd-num" textAnchor="middle">{ua}</text>
      <text x={x0 + 36} y="92" className="bd-opk">×</text>
      <text x={x0 + 58} y="92" className="bd-num" textAnchor="middle">1</text>
      <text x={x0 + 80} y="92" className="bd-num" textAnchor="middle">{ub}</text>
      <path d={`M${x0 + 92},86 Q${x0 + 128},68 ${x0 + 92},46`} className={blue ? "bd-arc" : "bd-curve"} fill="none"
        markerStart={`url(#m1x${blue ? "B" : "K"}${a})`} markerEnd={`url(#m1x${blue ? "B" : "K"}${a})`} />
      <text x={x0 + 116} y="72" className={blue ? "bd-plus" : "bd-opk"}>{blue ? "+" : "×"}</text>
      <line x1={x0 + 26} y1="102" x2={x0 + 104} y2="102" className="bd-rule" />
    </>
  );
  return (
    <svg viewBox={`0 0 340 ${notes ? 262 : 214}`} className="bd-svg bd-svg-wide">
      <text x="10" y="16" className="bd-steplabel">{ja ? "手順1・一の位×一の位" : "Step 1 · units × units"}</text>
      <text x={x2} y="16" className="bd-steplabel">{ja ? `手順2・${a} + ${ub}` : `Step 2 · ${a} + ${ub}`}</text>

      {digits(0, false)}
      {c > 0 && <text x="68" y="126" style={S_CARRY}>{c}</text>}
      <text x="80" y="126" className="bd-num" textAnchor="middle">{u}</text>

      <line x1={x2 + 48} y1="32" x2={x2 + 90} y2="32" className="bd-rule" />
      {digits(x2, true)}
      <text x={x2 + 60} y="126" className="bd-num" textAnchor="end">(<tspan style={S_BLUE}>{a}+{ub}</tspan>)</text>
      {c > 0 && <text x={x2 + 66} y="126" style={S_CARRY}>{c}</text>}
      <text x={x2 + 80} y="126" className="bd-num" textAnchor="middle">{u}</text>
      <text x={x2 + 56} y="156" className="bd-num" style={S_BLUE} textAnchor="end">{left}</text>
      <text x={x2 + 61} y="156" className="bd-num">|</text>
      {c > 0 && <text x={x2 + 73} y="158" style={S_CARRY}>{c}</text>}
      <text x={x2 + 86} y="156" className="bd-num" textAnchor="middle">{u}</text>
      {c > 0 && (
        <>
          <path d={`M${x2 + 76},164 Q${x2 + 68},192 ${x2 + 44},164`} className="bd-arc" fill="none" markerEnd={`url(#m1xB${a})`} />
          <text x={x2 + 58} y="194" className="bd-plus" textAnchor="middle">+</text>
        </>
      )}

      {notes && (
        <>
          <text x="10" y={214} className="bd-note">{ja ? `手順1：${ua} × ${ub} = ${p}（${u}を書き、${c}を繰り上げ）` : `Step 1: ${ua} × ${ub} = ${p}  (write ${u}, carry ${c})`}</text>
          <text x="10" y={234} className="bd-note">{ja ? `手順2：${a} + ${ub} = ${left}、＋${c} = ${left + c}` : `Step 2: ${a} + ${ub} = ${left},  + ${c} = ${left + c}`}</text>
        </>
      )}
      <AnswerBox x={notes ? 240 : 196} y={notes ? 244 - 34 : 168} w={notes ? 92 : 120} h={notes ? 44 : 40} value={String(answer)} />
      <defs>
        <marker id={`m1xK${a}`} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-curveHead" />
        </marker>
        <marker id={`m1xB${a}`} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-arcTip" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.68 — ×12 to 19 ("Ultimate & Twice the Penultimate", flag = units of the multiplier).
// The number is sandwiched in 0s. Each stage works one place further left:
// digit + flag × the digit to its left (+ carry). One mini-figure per stage.
function FlagStagesFig({ n, flag, setup }: { n: string; flag: number; setup?: boolean }) {
  const D = ("0" + n + "0").split("").map(Number);
  const L = D.length;
  type Stage = { cur: number; nb: number; written: string; carry: number };
  const stages: Stage[] = [];
  let carry = 0, written = "";
  for (let cur = L - 1; cur >= 1; cur--) {
    const v = D[cur] + flag * D[cur - 1] + carry;
    const last = cur === 1;
    written = (last ? String(v) : String(v % 10)) + written;
    carry = last ? 0 : Math.floor(v / 10);
    stages.push({ cur, nb: cur - 1, written, carry });
  }
  const panels: (Stage | null)[] = setup ? [null, ...stages] : stages;
  const PW = 170, PH = 132, SP = 18;
  const rows = Math.ceil(panels.length / 2);
  const answer = stages[stages.length - 1].written;
  const H = rows * PH + 58;
  return (
    <svg viewBox={`0 0 ${PW * 2} ${H}`} className="bd-svg bd-svg-wide">
      {panels.map((st, i) => {
        const ox = (i % 2) * PW, oy = Math.floor(i / 2) * PH;
        const xOf = (k: number) => ox + PW - 18 - (L - 1 - k) * SP;
        const flagX = xOf(L - 1), oneX = xOf(L - 2);
        return (
          <g key={i}>
            {D.map((d, k) => (
              <text key={k} x={xOf(k)} y={oy + 50} style={S_NUM} textAnchor="middle">{d}</text>
            ))}
            {st && (
              <>
                <text x={(xOf(st.nb) + xOf(st.cur)) / 2 - 4} y={oy + 20} style={S_ORANGE}>+</text>
                <path d={`M${xOf(st.nb) - 4},${oy + 28} H${xOf(st.cur) + 4}`} className="bd-arc" markerEnd={`url(#fsTip${n})`} />
                <path d={`M${flagX - 2},${oy + 80} L${xOf(st.nb) + 3},${oy + 58}`} className="bd-arc" markerEnd={`url(#fsTip${n})`} />
                <text x={(flagX + xOf(st.nb)) / 2 + 6} y={oy + 72} style={S_ORANGE}>×</text>
              </>
            )}
            <text x={ox + 10} y={oy + 96} className="bd-opk">×</text>
            <text x={oneX} y={oy + 96} style={S_NUM} textAnchor="middle">1</text>
            <text x={flagX} y={oy + 96} style={S_NUM} textAnchor="middle">{flag}</text>
            <line x1={ox + 8} y1={oy + 104} x2={ox + PW - 6} y2={oy + 104} className="bd-rule" />
            {st && st.written.split("").map((d, k, arr) => (
              <text key={k} x={xOf(L - arr.length + k)} y={oy + 126} style={S_NUM} textAnchor="middle">{d}</text>
            ))}
            {st && st.carry > 0 && (
              <text x={xOf(L - st.written.length) - 6} y={oy + 128} style={S_CARRY} textAnchor="end">{st.carry}</text>
            )}
          </g>
        );
      })}
      <AnswerBox x={PW - 60} y={rows * PH + 10} w={120} h={40} value={answer} />
      <defs>
        <marker id={`fsTip${n}`} markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-arcTip" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.156 — square of a number ending with 5, first example: 35².
// Step 1 (tens place): 3 × its next number 4 = 12. Step 2 (units place): 5 × 5 = 25.
function Square5Diagram({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  const x0 = 196;
  return (
    <svg viewBox="0 0 340 214" className="bd-svg bd-svg-wide">
      <text x="10" y="16" className="bd-steplabel">{ja ? "手順1・十の位" : "Step 1 · tens place"}</text>
      <text x={x0} y="16" className="bd-steplabel">{ja ? "手順2・一の位" : "Step 2 · units place"}</text>

      {/* left: 3 × (3 + 1) */}
      <text x="36" y="58" className="bd-carry" textAnchor="middle">4</text>
      <text x="48" y="58" className="bd-opk">×</text>
      <path d="M82,52 H64" className="bd-arc" markerEnd="url(#sq5B)" />
      <text x="92" y="58" className="bd-num" textAnchor="middle">3</text>
      <text x="116" y="58" className="bd-num" textAnchor="middle">5</text>
      <path d="M84,82 Q52,84 39,66" className="bd-curve" fill="none" markerEnd="url(#sq5K)" />
      <text x="16" y="86" className="bd-opk">+1</text>
      <text x="62" y="100" className="bd-op">×</text>
      <text x="92" y="98" className="bd-num" textAnchor="middle">3</text>
      <text x="116" y="98" className="bd-num" textAnchor="middle">5</text>
      <line x1="60" y1="108" x2="140" y2="108" className="bd-rule" />
      <text x="100" y="132" className="bd-part" textAnchor="middle">12</text>
      <text x="100" y="148" className="bd-opk" textAnchor="middle">= 4×3</text>

      {/* right: 5 × 5 */}
      <text x={x0 + 40} y="58" className="bd-num" textAnchor="middle">3</text>
      <text x={x0 + 64} y="58" className="bd-num" textAnchor="middle">5</text>
      <text x={x0 + 14} y="98" className="bd-op">×</text>
      <text x={x0 + 40} y="98" className="bd-num" textAnchor="middle">3</text>
      <text x={x0 + 64} y="98" className="bd-num" textAnchor="middle">5</text>
      <path d={`M${x0 + 80},44 V96`} className="bd-vdouble" markerStart="url(#sq5V)" markerEnd="url(#sq5V)" />
      <text x={x0 + 88} y="74" className="bd-op">×</text>
      <line x1={x0 + 8} y1="108" x2={x0 + 86} y2="108" className="bd-rule" />
      <text x={x0 + 62} y="132" className="bd-part bd-part-hi" textAnchor="middle">25</text>

      <text x="100" y="190" className="bd-part" textAnchor="middle">12 | 25 = 1225</text>
      <AnswerBox x={212} y={166} w={118} h={40} value="1225" />
      <defs>
        <marker id="sq5B" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-arcTip" />
        </marker>
        <marker id="sq5K" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-curveHead" />
        </marker>
        <marker id="sq5V" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-vdoubleHead" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.156 — second example: 115² = 13225. Step 1: 11 × 12 = 132; Step 2: 5 × 5 = 25.
function Square5Diagram2({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  const x0 = 176;
  return (
    <svg viewBox="0 0 340 204" className="bd-svg bd-svg-wide">
      <text x="10" y="18" className="bd-note">{ja ? "手順1：11 × 12 = 132" : "Step 1:  11 × 12 = 132"}</text>
      <text x="10" y="38" className="bd-note">{ja ? "手順2：5 × 5 = 25" : "Step 2:  5 × 5 = 25"}</text>

      {/* left: 11 × its next number 12 */}
      <text x="46" y="62" className="bd-num" textAnchor="middle">12</text>
      <path d="M84,70 L62,60" className="bd-curve" markerEnd="url(#sq5bK)" />
      <text x="104" y="76" className="bd-num" textAnchor="end">11</text>
      <text x="122" y="76" className="bd-num" textAnchor="middle">5</text>
      <path d="M42,68 Q34,102 80,108" className="bd-curve" fill="none" markerStart="url(#sq5bK2)" markerEnd="url(#sq5bK2)" />
      <text x="20" y="92" className="bd-opk">×</text>
      <text x="104" y="112" className="bd-num" textAnchor="end">11</text>
      <text x="122" y="112" className="bd-num" textAnchor="middle">5</text>
      <line x1="60" y1="122" x2="140" y2="122" className="bd-rule" />
      <text x="100" y="146" className="bd-part" textAnchor="middle">132</text>

      {/* right: boxed units 5 × 5 */}
      <text x={x0 + 54} y="76" className="bd-num" textAnchor="end">11</text>
      <text x={x0 + 71} y="76" className="bd-num" textAnchor="middle">5</text>
      <text x={x0 + 8} y="112" className="bd-opk">×</text>
      <text x={x0 + 54} y="112" className="bd-num" textAnchor="end">11</text>
      <text x={x0 + 71} y="112" className="bd-num" textAnchor="middle">5</text>
      <rect x={x0 + 60} y="56" width="22" height="62" rx="4" className="bd-colbox" />
      <path d={`M${x0 + 94},60 V114`} className="bd-vdouble" markerStart="url(#sq5bV)" markerEnd="url(#sq5bV)" />
      <text x={x0 + 102} y="92" className="bd-op">×</text>
      <line x1={x0 + 6} y1="122" x2={x0 + 100} y2="122" className="bd-rule" />
      <text x={x0 + 58} y="146" className="bd-part" textAnchor="end">132</text>
      <text x={x0 + 63} y="146" className="bd-part bd-part-hi">25</text>

      <AnswerBox x={110} y={158} w={120} h={40} value="13225" />
      <defs>
        <marker id="sq5bK" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-curveHead" />
        </marker>
        <marker id="sq5bK2" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-curveHead" />
        </marker>
        <marker id="sq5bV" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-vdoubleHead" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.112 — Subtraction from 10's multiples ("All from 9 and the Last from 10").
// Left: the sum as set. Right: 9 over every 0 and 10 over the last, the minuend struck out,
// the subtrahend padded with 0s to the same length, and the answer read off left to right.
function Nik10Fig({ minuend, sub, ex, lang }: { minuend: string; sub: string; ex: 1 | 2; lang: Lang }) {
  const ja = lang === "ja";
  const k = minuend.length - 1;
  const padded = sub.padStart(k, "0");
  const pads = k - sub.length;
  const digits = padded.split("").map(Number);
  const res = digits.map((d, i) => (i === k - 1 ? 10 : 9) - d);
  const answer = String(Number(minuend) - Number(sub));
  const SP = 17;
  const lx = (i: number, len: number, right: number) => right - (len - 1 - i) * SP;
  const LR = 138, RR = 316;
  const orange = { fill: "#B5773A" };
  const green = { fill: "var(--green-dk)", fontStyle: "italic" as const };
  const caption = ex === 1
    ? (ja ? "0には9を、最後の0には10を上に書く" : "Write 9 for all 0s and 10 for last 0 above the minuend")
    : (ja ? "引く数の桁が足りないときは、前に0をつける" : "Fewer digits? Put zeros in front of the subtrahend.");
  return (
    <svg viewBox="0 0 340 256" className="bd-svg bd-svg-wide">
      <text x="10" y="16" className="bd-caption">{caption}</text>

      {/* left: the sum as written */}
      {minuend.split("").map((d, i) => (
        <text key={i} x={lx(i, minuend.length, LR)} y="68" style={S_NUM} textAnchor="middle">{d}</text>
      ))}
      <text x="22" y="104" style={S_NUM}>−</text>
      {sub.split("").map((d, i) => (
        <text key={i} x={lx(i, sub.length, LR)} y="104" style={S_NUM} textAnchor="middle">{d}</text>
      ))}
      <line x1="18" y1="112" x2={LR + 10} y2="112" className="bd-rule" />

      <path d={`M${LR + 12},134 H${RR - k * SP - 8}`} className="bd-arc" markerEnd={`url(#nk10Tip${ex})`} />

      {/* right: 9 9 … 10 over the zeros, minuend struck out */}
      {res.map((_, i) => (
        <text key={i} x={lx(i + 1, minuend.length, RR)} y="40" className="bd-nine" textAnchor="middle">{i === k - 1 ? 10 : 9}</text>
      ))}
      {minuend.split("").map((d, i) => (
        <text key={i} x={lx(i, minuend.length, RR)} y="68" style={S_NUM} textAnchor="middle">{d}</text>
      ))}
      <line x1={lx(0, minuend.length, RR) - 8} y1="62" x2={RR + 8} y2="62" className="bd-rule" />
      <text x={RR - minuend.length * SP - 6} y="104" style={S_NUM}>−</text>
      {padded.split("").map((d, i) => (
        <text key={i} x={lx(i + 1, minuend.length, RR)} y="104" style={i < pads ? { ...S_NUM, fill: "var(--muted)" } : S_NUM} textAnchor="middle">{d}</text>
      ))}
      <line x1={RR - minuend.length * SP - 10} y1="112" x2={RR + 10} y2="112" className="bd-rule" />
      {res.map((d, i) => (
        <text key={i} x={lx(i + 1, minuend.length, RR)} y="138" style={{ ...S_NUM, ...orange }} textAnchor="middle">{d}</text>
      ))}

      {ex === 1 ? (
        <text x="10" y="176" className="bd-note">{ja ? "左から答える：" : "Answer from Left: "}<tspan style={green}>{ja ? "すべて9から、最後は10から" : "All from 9 and the Last from 10"}</tspan></text>
      ) : (
        <text x="10" y="176" className="bd-note">{ja ? `${sub} を ${padded} にそろえる（${k}桁）` : `Pad ${sub} to ${padded} (${k} digits, matching ${k} zeros)`}</text>
      )}
      <text x="10" y="196" className="bd-note">{digits.map((d, i) => `${i === k - 1 ? 10 : 9}−${d}=${res[i]}`).join(", ")}</text>
      <AnswerBox x={110} y={210} w={120} h={38} value={answer} />
      <defs>
        <marker id={`nk10Tip${ex}`} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-arcTip" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.108 — Digit Sum (DS), casting out 9. One small card per worked number.
// Tokens are laid out one per slot so a strike can cover exactly a group that makes 9.
type DsLine = { toks: string[]; strikes?: [number, number][] };
function DsCard({ lines, answer, caption }: { lines: DsLine[]; answer: string; caption?: string }) {
  const STEP = 15, X0 = 16;
  const H = 30 + lines.length * 30 + (caption ? 28 : 0);
  const strike = { stroke: "#A0454A", strokeWidth: 2 };
  return (
    <svg viewBox={`0 0 340 ${Math.max(H, 76)}`} className="bd-svg bd-svg-wide" style={{ padding: "6px 0" }}>
      {lines.map((ln, li) => {
        const y = 36 + li * 30;
        let x = X0;
        const xs = ln.toks.map((t) => { const at = x; x += t === "→" ? 26 : t.length > 1 ? t.length * 8.5 + 8 : STEP; return at; });
        return (
          <g key={li}>
            {ln.toks.map((t, i) => (
              <text key={i} x={xs[i]} y={y} style={{ ...S_NUM, fontWeight: 600 }}>{t}</text>
            ))}
            {(ln.strikes ?? []).map(([a, b], k) => (
              <line key={k} x1={xs[a] - 4} y1={y + 3} x2={xs[b] + 14} y2={y - 12} style={strike} />
            ))}
          </g>
        );
      })}
      <AnswerBox x={248} y={14} w={80} h={40} value={answer} />
      {caption && <text x="16" y={H - 10} className="bd-note" style={{ fontWeight: 800, fill: "var(--violet, #5B3A8C)" }}>{caption}</text>}
    </svg>
  );
}
const dsTok = (s: string) => s.split(" ");
function Ds512() {
  return <DsCard lines={[{ toks: dsTok("5 + 1 + 2 → 8") }]} answer="8" />;
}
function Ds37() {
  return <DsCard lines={[{ toks: dsTok("3 + 7 = 10 → (1+0) → 1") }]} answer="1" />;
}
function Ds6379({ lang }: { lang: Lang }) {
  return (
    <DsCard
      lines={[{ toks: dsTok("6 + 3 + 7 + 9 → 7"), strikes: [[0, 2], [6, 6]] }]}
      answer="7"
      caption={lang === "ja" ? "数字をたすときに9を消す" : "Casting out 9 during digit sum"}
    />
  );
}
function Ds34278318({ lang }: { lang: Lang }) {
  return (
    <DsCard
      lines={[
        { toks: dsTok("3 + 4 + 2 + 7 + 8 + 3 + 1 + 8"), strikes: [[4, 6], [12, 14]] },
        { toks: dsTok("→ 3 + 4 + 8 + 3") },
        { toks: dsTok("→ 18 → (1+8) → 0") },
      ]}
      answer="0"
      caption={lang === "ja" ? "たし算の途中で9を消す" : "Casting out 9 during digits addition"}
    />
  );
}

// Book p.104 — Multiplication by 9, drawn as a step chain so the rule reads at a glance:
// split the number into its "rest" digits and its units; Left = number − 1 − rest;
// Right = 10 − units; write them side by side.
function Mult9Fig({ n, lang }: { n: string; lang: Lang }) {
  const ja = lang === "ja";
  const N = Number(n), rest = n.slice(0, -1), u = Number(n.slice(-1));
  const left = N - 1 - Number(rest), right = 10 - u;
  const RED = "#D63A3A", BLUE = "var(--blue)";
  const big = { fontFamily: "var(--font-num)", fontSize: 26, fontWeight: 800 } as const;
  const small = { fontFamily: "Nunito, sans-serif", fontSize: 11.5, fontWeight: 800 } as const;
  const len = n.length;
  const dx = (i: number) => 164 - (len - 1) * 12 + i * 24 + (i === len - 1 ? 14 : 0);

  /* a row of boxes joined by labelled arrows */
  type Node = { v: string; color?: string };
  const chain = (y: number, nodes: Node[], ops: { t: string; color?: string }[]) => {
    let x = 40;
    const out: React.ReactElement[] = [];
    nodes.forEach((nd, i) => {
      const w = nd.v.length * 11 + 22;
      out.push(
        <g key={`n${i}`}>
          <rect x={x} y={y - 20} width={w} height={30} rx={8} fill="var(--surface)" stroke={nd.color ?? "var(--line-strong)"} strokeWidth={2} />
          <text x={x + w / 2} y={y + 1} textAnchor="middle" style={{ ...S_NUM, fill: nd.color ?? "var(--ink)" }}>{nd.v}</text>
        </g>
      );
      x += w;
      if (i < ops.length) {
        out.push(
          <g key={`o${i}`}>
            <path d={`M${x + 4},${y - 5} H${x + 42}`} stroke={ops[i].color ?? "var(--ink)"} strokeWidth={1.8} markerEnd={`url(#m9Tip${n})`} />
            <text x={x + 23} y={y - 11} textAnchor="middle" style={{ ...small, fill: ops[i].color ?? "var(--ink)" }}>{ops[i].t}</text>
          </g>
        );
        x += 48;
      }
    });
    return out;
  };

  return (
    <svg viewBox="0 0 340 290" className="bd-svg bd-svg-wide">
      {/* the number, split */}
      <rect x={dx(0) - 13} y="8" width={(len - 1) * 24 + 2} height="38" rx="8" fill={`color-mix(in srgb, ${RED} 12%, var(--surface))`} stroke={RED} strokeWidth="1.6" />
      <rect x={dx(len - 1) - 13} y="8" width="26" height="38" rx="8" fill={`color-mix(in srgb, var(--blue) 12%, var(--surface))`} stroke={BLUE} strokeWidth="1.6" />
      {n.split("").map((d, i) => (
        <text key={i} x={dx(i)} y="37" textAnchor="middle" style={{ ...big, fill: i < len - 1 ? RED : BLUE }}>{d}</text>
      ))}
      <text x={dx(len - 2) + 13} y="62" textAnchor="end" style={{ ...small, fill: RED }}>{ja ? "残りの数字" : "rest digits"}</text>
      <text x={dx(len - 1) - 13} y="62" textAnchor="start" style={{ ...small, fill: BLUE }}>{ja ? "一の位" : "units"}</text>
      <text x={dx(len - 1) + 26} y="36" style={S_NUM}>× 9</text>

      {/* 1 · left part */}
      <circle cx="18" cy="92" r="10" fill="var(--ink)" />
      <text x="18" y="96" textAnchor="middle" style={{ ...small, fill: "#fff" }}>1</text>
      <text x="34" y="96" style={{ ...small, fill: "var(--ink-dim)" }}>{ja ? "左の部分：数 − 1 − 残りの数字" : "Left part: number − 1 − rest digits"}</text>
      {chain(128, [{ v: n }, { v: String(N - 1) }, { v: String(left), color: BLUE }], [{ t: "− 1" }, { t: `− ${rest}`, color: RED }])}

      {/* 2 · right part */}
      <circle cx="18" cy="164" r="10" fill="var(--ink)" />
      <text x="18" y="168" textAnchor="middle" style={{ ...small, fill: "#fff" }}>2</text>
      <text x="34" y="168" style={{ ...small, fill: "var(--ink-dim)" }}>{ja ? "右の部分：10 − 一の位" : "Right part: 10 − units digit"}</text>
      {chain(200, [{ v: String(u), color: BLUE }, { v: String(right), color: BLUE }], [{ t: "10 −" }])}
      <text x="190" y="200" style={{ ...small, fill: "var(--muted)" }}>{`(${u} + ${right} = 10)`}</text>

      {/* 3 · together */}
      <circle cx="18" cy="236" r="10" fill="var(--ink)" />
      <text x="18" y="240" textAnchor="middle" style={{ ...small, fill: "#fff" }}>3</text>
      <text x="40" y="244" className="bd-part"><tspan style={{ fill: BLUE }}>{left}</tspan> | <tspan style={{ fill: BLUE }}>{right}</tspan></text>
      <AnswerBox x={200} y={218} w={130} h={40} value={String(N * 9)} />
      <text x="10" y="282" style={{ ...small, fill: "var(--muted)" }}>
        {ja ? `なぜ？ ${n} × 9 = ${n}0 − ${n} = ${N * 9}` : `Why it works: ${n} × 9 = ${n}0 − ${n} = ${N * 9}`}
      </text>
      <defs>
        <marker id={`m9Tip${n}`} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="context-stroke" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.50 — Balancing (thumb rule), drawn as a carry ladder: one row per step,
// the working segment outlined, its tens carried left on an arc, finished segments in blue.
function BalanceFig({ segs, lang }: { segs: number[]; lang: Lang }) {
  const ja = lang === "ja";
  const n = segs.length;
  type Row = { vals: number[]; cur: number | null; keep?: number; carry?: number };
  const rows: Row[] = [];
  const st = [...segs];
  for (let i = n - 1; i >= 1; i--) {
    const keep = st[i] % 10, carry = Math.floor(st[i] / 10);
    rows.push({ vals: [...st], cur: i, keep, carry });
    st[i] = keep; st[i - 1] += carry;
  }
  rows.push({ vals: [...st], cur: null });
  const answer = st.join("");
  const ORANGE = "#E8631C", BLUE = "var(--blue)";
  const small = { fontFamily: "Nunito, sans-serif", fontSize: 11, fontWeight: 800 } as const;
  const PITCH = 78, TOP = 74;
  const width = (v: number) => String(v).length * 11 + 18;
  const GAP = 9;
  const layout = (vals: number[]) => {
    const ws = vals.map(width);
    const total = ws.reduce((a, b) => a + b, 0) + GAP * (n - 1);
    let x = 30 + (300 - total) / 2;
    return ws.map((w) => { const at = x; x += w + GAP; return { x: at, w, cx: at + w / 2 }; });
  };
  const H = TOP + rows.length * PITCH + 70;
  return (
    <svg viewBox={`0 0 340 ${H}`} className="bd-svg bd-svg-wide">
      <text x="10" y="18" className="bd-caption">{ja ? "いちばん左以外の区切りは、1桁だけにする" : "Except the leftmost, every segment keeps only one digit."}</text>
      {rows.map((r, ri) => {
        const y = TOP + ri * PITCH;
        const pos = layout(r.vals);
        const final = r.cur === null;
        return (
          <g key={ri}>
            <circle cx="14" cy={y} r="9" fill={final ? BLUE : "var(--ink)"} />
            <text x="14" y={y + 4} textAnchor="middle" style={{ ...small, fill: "#fff" }}>{final ? "✓" : ri + 1}</text>
            {r.vals.map((v, i) => {
              const p = pos[i];
              const done = final || (r.cur !== null && i > r.cur);
              const cur = r.cur === i;
              return (
                <g key={i}>
                  <rect x={p.x} y={y - 15} width={p.w} height={30} rx={7}
                    fill={cur ? `color-mix(in srgb, ${ORANGE} 10%, var(--surface))` : "var(--surface)"}
                    stroke={cur ? ORANGE : done ? BLUE : "var(--line-strong)"} strokeWidth={cur ? 2.4 : 1.6} />
                  <text x={p.cx} y={y + 6} textAnchor="middle" style={{ ...S_NUM, fill: done ? BLUE : "var(--ink)" }}>{v}</text>
                </g>
              );
            })}
            {r.cur !== null && (
              <>
                <path d={`M${pos[r.cur].cx},${y - 17} Q${(pos[r.cur].cx + pos[r.cur - 1].cx) / 2},${y - 44} ${pos[r.cur - 1].cx + 4},${y - 19}`}
                  fill="none" stroke={ORANGE} strokeWidth={1.8} markerEnd={`url(#balTip${n})`} />
                <text x={(pos[r.cur].cx + pos[r.cur - 1].cx) / 2} y={y - 34} textAnchor="middle" style={{ ...small, fontSize: 12, fill: ORANGE }}>+{r.carry}</text>
                <text x={Math.min(pos[r.cur].cx, 282)} y={y + 30} textAnchor="middle" style={{ ...small, fill: "var(--ink-dim)" }}>
                  {ja ? `${r.keep}を残す・${r.carry}を送る` : `keep ${r.keep} · carry ${r.carry}`}
                </text>
              </>
            )}
          </g>
        );
      })}
      <AnswerBox x={100} y={TOP + rows.length * PITCH - 30} w={140} h={40} value={`= ${answer}`} />
      {n <= 3 ? (
        <text x="10" y={H - 8} style={{ ...small, fill: "var(--muted)" }}>
          {(ja ? "なぜ？ " : "Why it works: ") + segs.map((v, i) => `${v}${"0".repeat(n - 1 - i)}`).join(" + ") + ` = ${answer}`}
        </text>
      ) : (
        <text x="10" y={H - 8} style={{ ...small, fill: "var(--muted)" }}>
          {ja ? "なぜ？ 区切りは左へ1つ進むごとに10倍の値。" : "Why? Each segment is worth 10× the one on its right."}
        </text>
      )}
      <defs>
        <marker id={`balTip${n}`} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={ORANGE} />
        </marker>
      </defs>
    </svg>
  );
}





// Book p.37 — "Numbers are friends to each other": digits on a clock face, each joined to
// its friend (the digit that makes 10 with it). Coloured chords make the pairs visible.
function FriendsCircle({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  const cx = 238, cy = 90, R = 56;
  const ang = (d: number) => (d / 10) * 2 * Math.PI - Math.PI / 2;
  const pt = (d: number, r = R) => ({ x: cx + r * Math.cos(ang(d)), y: cy + r * Math.sin(ang(d)) });
  const pairs: [number, number, string][] = [[9, 1, "#E8631C"], [8, 2, "var(--blue)"], [7, 3, "var(--green-dk)"], [6, 4, "#9B3FA0"]];
  const small = { fontFamily: "var(--font-num)", fontSize: 14, fontWeight: 800 } as const;
  return (
    <svg viewBox="0 0 340 204" className="bd-svg bd-svg-wide">
      {pairs.map(([a, b, c], i) => (
        <text key={i} x="12" y={40 + i * 28} style={{ ...small, fill: c }}>{a} + {b} = 10</text>
      ))}
      <text x="12" y="152" style={{ ...small, fontSize: 12, fill: "var(--ink-dim)" }}>{ja ? "5 + 5 = 10（5の友だちは5）" : "5 + 5 = 10 (5 is its own friend)"}</text>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      {pairs.map(([a, b, c], i) => {
        const p1 = pt(a), p2 = pt(b);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={c} strokeWidth="2" />;
      })}
      {Array.from({ length: 10 }, (_, d) => {
        const p = pt(d), q = pt(d, R + 14);
        return (
          <g key={d}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--ink)" />
            <text x={q.x} y={q.y + 5} textAnchor="middle" style={small}>{d === 0 ? "0/10" : d}</text>
          </g>
        );
      })}
      <text x="12" y="196" className="bd-note">{ja ? "9の友だち（補数）は1、8の友だちは2" : "9's friend / complement is 1 · 8's friend is 2"}</text>
    </svg>
  );
}

// p.37 example 1 — 38 + 17 + 22: pair the friends first (units 8 and 2 make a ten).
function FriendsAddFig({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  const G = "var(--green-dk)";
  const big = { fontFamily: "var(--font-num)", fontSize: 24, fontWeight: 800, fill: "var(--ink)" } as const;
  return (
    <svg viewBox="0 0 340 204" className="bd-svg bd-svg-wide">
      <text x="60" y="44" style={big}>3<tspan style={{ fill: G }}>8</tspan></text>
      <text x="118" y="44" style={{ ...big, fill: "var(--muted)" }}>+</text>
      <text x="146" y="44" style={big}>17</text>
      <text x="204" y="44" style={{ ...big, fill: "var(--muted)" }}>+</text>
      <text x="232" y="44" style={big}>2<tspan style={{ fill: G }}>2</tspan></text>
      <path d="M86,54 Q170,98 250,54" fill="none" stroke={G} strokeWidth="2" />
      <text x="170" y="92" textAnchor="middle" className="bd-note" style={{ fill: G, fontWeight: 800 }}>{ja ? "8と2は友だち → 10" : "8 and 2 are friends → a ten"}</text>
      <text x="16" y="124" className="bd-note">{ja ? "① 友だちを先に：38 + 2 + 20 = 60" : "① Friends first: 38 + 2 + 20 = 60"}</text>
      <text x="16" y="146" className="bd-note">{ja ? "② 残りをたす：60 + 17 = 77" : "② Then add the rest: 60 + 17 = 77"}</text>
      <AnswerBox x={115} y={158} w={110} h={40} value="77" />
    </svg>
  );
}

// p.37 example 2 — 54 + 39: no friend in the sum, so borrow one: 39 is 1 short of 40.
function BorrowFriendFig({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  const O = "#E8631C";
  const box = (x: number, v: string, c = "var(--line-strong)") => (
    <g>
      <rect x={x} y="40" width="46" height="30" rx="8" fill="var(--surface)" stroke={c} strokeWidth="2" />
      <text x={x + 23} y="61" textAnchor="middle" style={{ ...S_NUM, fill: c === "var(--line-strong)" ? "var(--ink)" : c }}>{v}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 340 196" className="bd-svg bd-svg-wide">
      <text x="10" y="18" className="bd-caption">{ja ? "友だちがいない → 大丈夫、友だちを借りる" : "No Friend | No Problem | Borrow Friend"}</text>
      {box(30, "39")}
      <path d="M80,55 H122" stroke={O} strokeWidth="1.8" markerEnd="url(#bfTip)" />
      <text x="101" y="48" textAnchor="middle" className="bd-note" style={{ fill: O, fontWeight: 800 }}>+1</text>
      {box(128, "40", "var(--blue)")}
      <text x="186" y="60" className="bd-note">{ja ? "9の友だち1を借りる" : "borrow 9's friend, 1"}</text>
      <text x="16" y="104" className="bd-note">① 54 + 40 = 94</text>
      <text x="16" y="126" className="bd-note">{ja ? "② 借りた1を返す：94 − 1 = 93" : "② Give the borrowed 1 back: 94 − 1 = 93"}</text>
      <AnswerBox x={220} y={140} w={110} h={40} value="93" />
      <defs>
        <marker id="bfTip" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={O} />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.136 — Subtraction, General Method, told as three easy rules (see SubGenRules):
// the sum is written once, answer digits coloured by the rule used, then one line per column.
function SubGenFig({ a, b, lang }: { a: string; b: string; lang: Lang }) {
  const ja = lang === "ja";
  const n = a.length;
  const U = a.split("").map(Number), L = b.padStart(n, "0").split("").map(Number);
  const flip = U.map((u, i) => u < L[i]);
  const BLUE = "var(--blue)", ORANGE = "#D9772B", GREY = "var(--ink-dim)";
  type Col = { r: number; kind: "sub" | "give" | "flip"; head: string; work: string; from?: number };
  const cols: Col[] = U.map((u, i) => {
    const l = L[i];
    if (flip[i]) {
      const d = l - u, from = i === n - 1 || !flip[i + 1] ? 10 : 9;
      return {
        r: from - d, kind: "flip", from,
        head: ja ? `${u} は ${l} より小さい → ひっくり返す` : `${u} is smaller than ${l} → flip`,
        work: ja ? `${l} − ${u} = ${d}、${d} の ${from} の友だちは ${from - d}` : `${l} − ${u} = ${d}, and ${d}'s friend to ${from} is ${from - d}`,
      };
    }
    const d = u - l;
    if (i < n - 1 && flip[i + 1]) {
      return {
        r: d - 1, kind: "give",
        head: ja ? `${u} は ${l} より大きい → ひき算、次がひっくり返るので1わたす` : `${u} is bigger → subtract, then give 1 (next one flips)`,
        work: `${u} − ${l} = ${d},  ${d} − 1 = ${d - 1}`,
      };
    }
    return { r: d, kind: "sub", head: ja ? `${u} は ${l} より大きい → そのままひく` : `${u} is bigger → just subtract`, work: `${u} − ${l} = ${d}` };
  });
  const answer = cols.map((c) => c.r).join("").replace(/^0+(?=\d)/, "");
  const colour = (k: Col["kind"]) => (k === "flip" ? ORANGE : k === "give" ? GREY : BLUE);
  const SP = 22, RX = 200;
  const x = (i: number) => RX - (n - 1 - i) * SP;
  const small = { fontFamily: "Nunito, sans-serif", fontSize: 11.5, fontWeight: 700, fill: "var(--ink-dim)" } as const;
  const TOP = 132, ROW = 42;
  const H = TOP + n * ROW + 58;
  return (
    <svg viewBox={`0 0 340 ${H}`} className="bd-svg bd-svg-wide">
      {/* the sum, written once */}
      {cols.map((c, i) => c.from && (
        <text key={`f${i}`} x={x(i)} y="18" textAnchor="middle" style={{ ...small, fontWeight: 900, fill: ORANGE }}>{c.from}</text>
      ))}
      {U.map((d, i) => <text key={`u${i}`} x={x(i)} y="44" textAnchor="middle" style={{ ...S_NUM, fontSize: 20 }}>{d}</text>)}
      <text x={x(0) - 30} y="78" style={{ ...S_NUM, fontSize: 20 }}>−</text>
      {L.map((d, i) => <text key={`l${i}`} x={x(i)} y="78" textAnchor="middle" style={{ ...S_NUM, fontSize: 20 }}>{d}</text>)}
      <line x1={x(0) - 32} y1="88" x2={x(n - 1) + 12} y2="88" className="bd-rule" />
      {cols.map((c, i) => (
        <g key={`r${i}`}>
          <text x={x(i)} y="114" textAnchor="middle" style={{ ...S_NUM, fontSize: 20, fill: colour(c.kind) }}>{c.r}</text>
          <text x={x(i)} y="128" textAnchor="middle" style={{ ...small, fontSize: 9 }}>{i + 1}</text>
        </g>
      ))}

      {/* one line per column */}
      {cols.map((c, i) => {
        const y = TOP + 18 + i * ROW;
        return (
          <g key={`s${i}`}>
            <circle cx="16" cy={y + 4} r="9" fill={colour(c.kind)} />
            <text x="16" y={y + 8} textAnchor="middle" style={{ ...small, fill: "#fff", fontWeight: 900 }}>{i + 1}</text>
            <text x="32" y={y} style={{ ...small, fill: "var(--ink)", fontWeight: 800 }}>{c.head}</text>
            <text x="32" y={y + 16} style={{ ...small, fill: colour(c.kind), fontWeight: 800 }}>{c.work} → {ja ? "書く" : "write"} {c.r}</text>
          </g>
        );
      })}
      <AnswerBox x={105} y={TOP + n * ROW + 10} w={130} h={40} value={answer} />
    </svg>
  );
}

// The three rules behind every column, shown once before the examples.
function SubGenRules({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  const rules: [string, string, string][] = ja
    ? [
        ["var(--blue)", "上が大きい", "そのままひく"],
        ["#D9772B", "上が小さい", "ひっくり返してひき、9の友だちを書く\n（最後の桁は10の友だち）"],
        ["var(--ink-dim)", "次がひっくり返る", "その前の桁は1をわたす（−1）"],
      ]
    : [
        ["var(--blue)", "Top is bigger", "just subtract"],
        ["#D9772B", "Top is smaller", "flip it, then write the friend to 9\n(the friend to 10 on the last digit)"],
        ["var(--ink-dim)", "Next one flips", "the digit before it gives 1 away (−1)"],
      ];
  const small = { fontFamily: "Nunito, sans-serif", fontSize: 12.5, fontWeight: 700 } as const;
  return (
    <svg viewBox="0 0 340 166" className="bd-svg bd-svg-wide">
      {rules.map(([c, h, t], i) => {
        const y = 22 + i * 44 + (i > 1 ? 16 : 0);
        return (
          <g key={i}>
            <circle cx="18" cy={y + 6} r="11" fill={c} />
            <text x="18" y={y + 11} textAnchor="middle" style={{ ...small, fill: "#fff", fontWeight: 900 }}>{i + 1}</text>
            <text x="38" y={y + 2} style={{ ...small, fill: c, fontWeight: 900 }}>{h}</text>
            {t.split("\n").map((ln, k) => (
              <text key={k} x="38" y={y + 20 + k * 16} style={{ ...small, fill: "var(--ink)" }}>{ln}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}


// Book p.114 — Subtraction from 4000, 7000…: the leading digit goes "one less" (after taking
// away the subtrahend's leading digit, if it has one); the zeros go All from 9, Last from 10.
function SubRoundFig({ a, b, lang }: { a: string; b: string; lang: Lang }) {
  const ja = lang === "ja";
  const k = a.length - 1;
  const D = Number(a[0]);
  const sub = b.padStart(k + 1, "0");
  const bl = Number(sub[0]);
  const rest = sub.slice(1).split("").map(Number);
  const lead = D - bl - 1;
  const res = rest.map((d, i) => (i === k - 1 ? 10 : 9) - d);
  const answer = String(Number(a) - Number(b));
  const BROWN = "#B5773A", BLUE = "var(--blue)";
  const SP = 24, RX = 196;
  const x = (i: number) => RX - (k - i) * SP;
  const big = { ...S_NUM, fontSize: 21 };
  const small = { fontFamily: "Nunito, sans-serif", fontSize: 12, fontWeight: 800, fill: "var(--ink-dim)" } as const;
  const shown = b.split("");
  return (
    <svg viewBox="0 0 340 288" className="bd-svg bd-svg-wide">
      {/* marks over the minuend */}
      <text x={x(0)} y="20" textAnchor="middle" style={{ ...small, fontSize: 14, fill: BROWN }}>{lead}</text>
      {res.map((_, i) => (
        <text key={i} x={x(i + 1)} y="20" textAnchor="middle" style={{ ...small, fontSize: 14, fill: BLUE }}>{i === k - 1 ? 10 : 9}</text>
      ))}
      {a.split("").map((d, i) => <text key={i} x={x(i)} y="50" textAnchor="middle" style={big}>{d}</text>)}
      <line x1={x(0) - 12} y1="43" x2={x(k) + 12} y2="43" className="bd-rule" />
      <text x={x(k - shown.length + 1) - 30} y="88" style={big}>−</text>
      {shown.map((d, i) => <text key={i} x={x(k - shown.length + 1 + i)} y="88" textAnchor="middle" style={big}>{d}</text>)}
      <line x1={x(0) - 34} y1="98" x2={x(k) + 14} y2="98" className="bd-rule" />
      <path d={`M${x(0) - 80},116 H${x(0) - 22}`} stroke={BLUE} strokeWidth="2" markerEnd={`url(#srTip${a})`} />
      <text x={x(0)} y="124" textAnchor="middle" style={{ ...big, fill: BROWN }}>{lead}</text>
      {res.map((d, i) => <text key={i} x={x(i + 1)} y="124" textAnchor="middle" style={{ ...big, fill: BLUE }}>{d}</text>)}

      {/* three easy steps */}
      <circle cx="16" cy="150" r="9" fill={BROWN} />
      <text x="16" y="154" textAnchor="middle" style={{ ...small, fill: "#fff" }}>1</text>
      <text x="32" y="154" style={{ ...small, fill: "var(--ink)" }}>
        {bl > 0
          ? (ja ? `先頭：${D} − ${bl} = ${D - bl}、1つ小さく → ` : `Leading digit: ${D} − ${bl} = ${D - bl}, one less → `)
          : (ja ? `先頭：${D} を1つ小さく → ` : `Leading digit: ${D}, one less → `)}
        <tspan style={{ fill: BROWN }}>{lead}</tspan>
      </text>
      <circle cx="16" cy="176" r="9" fill={BLUE} />
      <text x="16" y="180" textAnchor="middle" style={{ ...small, fill: "#fff" }}>2</text>
      <text x="32" y="180" style={{ ...small, fill: "var(--ink)" }}>{ja ? "0の部分：すべて9から、最後は10から" : "The zeros: all from 9, last from 10"}</text>
      <text x="32" y="197" style={{ ...small, fill: BLUE }}>{rest.map((d, i) => `${i === k - 1 ? 10 : 9}−${d}=${res[i]}`).join(",  ")}</text>
      <circle cx="16" cy="220" r="9" fill="var(--ink)" />
      <text x="16" y="224" textAnchor="middle" style={{ ...small, fill: "#fff" }}>3</text>
      <text x="32" y="224" style={{ ...small, fill: "var(--ink)" }}>{ja ? "ならべる：" : "Put together: "}<tspan style={{ fill: BROWN }}>{lead}</tspan> | <tspan style={{ fill: BLUE }}>{res.join("")}</tspan></text>
      <AnswerBox x={222} y={200} w={110} h={38} value={answer} />
      <text x="10" y="276" style={{ ...small, fill: "var(--muted)" }}>
        {ja
          ? `なぜ？ ${a} = ${D - 1}${"0".repeat(k)} + 1${"0".repeat(k)} だから、1${"0".repeat(k)} から引けばいい`
          : `Why? ${a} = ${D - 1}${"0".repeat(k)} + 1${"0".repeat(k)}, so subtract from the 1${"0".repeat(k)}`}
      </text>
      <defs>
        <marker id={`srTip${a}`} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={BLUE} />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.160 — Square of a number starting with 5. Left: 5 × 5 = 25 (vertical ×) and the rest
// added once (the "+" flag). Right: the rest squared in the boxed column.
function Sq5StartFig({ rest, leftLabel, leftPart, rightPart, answer, carry, notes, lang }: {
  rest: string; leftLabel: string; leftPart: string; rightPart: string; answer: string;
  carry?: boolean; notes?: string[]; lang: Lang;
}) {
  const ja = lang === "ja";
  const uw = rest.length > 1 ? 34 : 26;
  const ux = 116, rx = 252;
  const noteY = carry ? 226 : 196;
  const H = noteY + (notes?.length ?? 0) * 18 + 56;
  const uid = rest;
  return (
    <svg viewBox={`0 0 340 ${H}`} className="bd-svg bd-svg-wide">
      <text x="10" y="18" className="bd-steplabel">{ja ? "手順1・十の位" : "Step 1 · tens"}</text>
      <text x="190" y="18" className="bd-steplabel">{ja ? "手順2・一の位" : "Step 2 · units"}</text>
      {/* left: 5 × 5, then + rest */}
      <text x="60" y="64" className="bd-opk">+</text>
      <path d={`M68,82 V64 L${ux - 8},84`} className="bd-curve" fill="none" markerEnd={`url(#s5sK${uid})`} />
      <path d="M68,84 V130" className="bd-curve" markerStart={`url(#s5sK${uid})`} markerEnd={`url(#s5sK${uid})`} />
      <text x="50" y="112" className="bd-opk">×</text>
      <text x="84" y="100" className="bd-num" textAnchor="middle">5</text>
      <text x={ux} y="100" className="bd-num" textAnchor="middle">{rest}</text>
      <text x="36" y="136" className="bd-opk">×</text>
      <text x="84" y="136" className="bd-num" textAnchor="middle">5</text>
      <text x={ux} y="136" className="bd-num" textAnchor="middle">{rest}</text>
      <line x1="10" y1="146" x2="150" y2="146" className="bd-rule" />
      <text x="80" y="170" className="bd-part" textAnchor="middle" style={{ fontSize: leftLabel.length > 10 ? 14 : undefined }}>{leftLabel}</text>
      {/* right: rest × rest */}
      <text x="226" y="100" className="bd-num" textAnchor="middle">5</text>
      <text x={rx} y="100" className="bd-num" textAnchor="middle">{rest}</text>
      <text x="198" y="136" className="bd-opk">×</text>
      <text x="226" y="136" className="bd-num" textAnchor="middle">5</text>
      <text x={rx} y="136" className="bd-num" textAnchor="middle">{rest}</text>
      <rect x={rx - uw / 2} y="80" width={uw} height="62" rx="4" className="bd-colbox" />
      <path d={`M${rx + uw / 2 + 12},84 V136`} className="bd-vdouble" markerStart={`url(#s5sV${uid})`} markerEnd={`url(#s5sV${uid})`} />
      <text x={rx + uw / 2 + 20} y="114" className="bd-op">×</text>
      <line x1="190" y1="146" x2="300" y2="146" className="bd-rule" />
      <text x="240" y="170" className="bd-part" textAnchor="end">{leftPart}</text>
      <text x="246" y="170" className="bd-part bd-part-hi">{rightPart}</text>
      {carry && (
        <>
          <path d="M252,176 Q246,198 232,178" className="bd-arc" fill="none" markerEnd={`url(#s5sB${uid})`} />
          <text x="246" y="206" className="bd-plus">+</text>
        </>
      )}
      {(notes ?? []).map((n, i) => (
        <text key={i} x="10" y={noteY + i * 18} className="bd-note">{n}</text>
      ))}
      <AnswerBox x={105} y={H - 48} w={130} h={40} value={answer} />
      <defs>
        <marker id={`s5sK${uid}`} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-curveHead" />
        </marker>
        <marker id={`s5sV${uid}`} markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-vdoubleHead" />
        </marker>
        <marker id={`s5sB${uid}`} markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-arcTip" />
        </marker>
      </defs>
    </svg>
  );
}
function Sq54({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  return (
    <Sq5StartFig rest="4" leftLabel="(5×5)+4" leftPart="29" rightPart="16" answer="2916" lang={lang}
      notes={[ja ? "左：5 × 5 = 25、+ 4 = 29" : "Left: 5 × 5 = 25, + 4 = 29", ja ? "右：4 × 4 = 16（いつも2桁）" : "Right: 4 × 4 = 16 (always 2 digits)"]} />
  );
}
function Sq512({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  return (
    <Sq5StartFig rest="12" leftLabel="[(5×5)×10+12]×10" leftPart="2620" rightPart="144" answer="262144" carry lang={lang}
      notes={ja ? [
        "5 | 12 に分ける。12は2桁なので、右の部分は2桁ぶん",
        "左：25 × 10 + 12 = 262、× 10 = 2620",
        "右：12 × 12 = 144 → 44を残して1を送る",
        "2620 + 1 = 2621 | 44",
      ] : [
        "5 | 12: 12 has 2 digits → the right part gets 2 places",
        "Left: 25 × 10 + 12 = 262, × 10 = 2620",
        "Right: 12 × 12 = 144 → keep 44, carry 1",
        "After adding the carry: 2621 | 44",
      ]} />
  );
}

// Book p.181 — Square by the Duplex method: each D-term worked on its own line, then the
// segments balanced right to left with the same carry ladder as the Balancing lesson.
function DuplexFig({ n, lang }: { n: string; lang: Lang }) {
  const ja = lang === "ja";
  const d = n.split("").map(Number);
  type Term = { label: string; work: string; v: number };
  const terms: Term[] = d.length === 2
    ? [
        { label: `D(${d[0]})`, work: `${d[0]}²`, v: d[0] * d[0] },
        { label: `D(${n})`, work: `2×${d[0]}×${d[1]}`, v: 2 * d[0] * d[1] },
        { label: `D(${d[1]})`, work: `${d[1]}²`, v: d[1] * d[1] },
      ]
    : [
        { label: `D(${d[0]})`, work: `${d[0]}²`, v: d[0] * d[0] },
        { label: `D(${d[0]}${d[1]})`, work: `2×${d[0]}×${d[1]}`, v: 2 * d[0] * d[1] },
        { label: `D(${n})`, work: `2×${d[0]}×${d[2]} + ${d[1]}²`, v: 2 * d[0] * d[2] + d[1] * d[1] },
        { label: `D(${d[1]}${d[2]})`, work: `2×${d[1]}×${d[2]}`, v: 2 * d[1] * d[2] },
        { label: `D(${d[2]})`, work: `${d[2]}²`, v: d[2] * d[2] },
      ];
  const PLUM = "#8E3B6A";
  const num = { fontFamily: "var(--font-num)", fontSize: 15, fontWeight: 800 } as const;
  const H = 40 + terms.length * 26 + 34;
  return (
    <div>
      <svg viewBox={`0 0 340 ${H}`} className="bd-svg bd-svg-wide" style={{ paddingBottom: 0 }}>
        <text x="10" y="22" style={{ ...num, fill: "var(--ink)" }}>{n}² = {terms.map((t) => t.label).join(" | ")}</text>
        {terms.map((t, i) => (
          <g key={i}>
            <text x="30" y={52 + i * 26} style={{ ...num, fill: PLUM }}>{t.label}</text>
            <text x="120" y={52 + i * 26} style={{ ...num, fill: "var(--ink)" }}>= {t.work}</text>
            <text x="300" y={52 + i * 26} textAnchor="end" style={{ ...num, fill: "var(--blue)" }}>= {t.v}</text>
          </g>
        ))}
        <text x="10" y={H - 10} style={{ ...num, fill: "var(--ink)" }}>
          {n}² = {terms.map((t) => t.v).join(" | ")}
          <tspan style={{ fontSize: 12, fill: "var(--muted)" }}>{ja ? "  → バランス" : "  → balance"}</tspan>
        </text>
      </svg>
      <BalanceFig segs={terms.map((t) => t.v)} lang={lang} />
    </div>
  );
}

// Book p.41 — second example: 103 × 107 = 11021.
// 10 × 11 = 110 (11 is One More than 10); 3 × 7 = 21 in the boxed units column.
function SpecialMult1Diagram2({ lang }: { lang: Lang }) {
  const ja = lang === "ja";
  return (
    <svg viewBox="0 0 300 214" className="bd-svg">
      <text x="10" y="18" className="bd-note">{ja ? "10 × 11 = 110；11 は 10 より1大きい" : "10 × 11 = 110;  11 is One More of 10"}</text>
      <text x="10" y="44" className="bd-note">3 × 7 = 21</text>

      <text x="120" y="72" className="bd-carry" textAnchor="middle">11</text>
      <path d="M150,82 L132,70" className="bd-vdev" markerEnd="url(#sm2Or)" />
      <path d="M112,76 Q88,114 138,124" className="bd-curve" fill="none" markerStart="url(#sm2Tip)" markerEnd="url(#sm2Tip)" />
      <text x="92" y="92" className="bd-op">×</text>
      <text x="112" y="132" className="bd-op">×</text>

      <text x="164" y="98" className="bd-num" textAnchor="end">10</text>
      <text x="178" y="98" className="bd-num" textAnchor="middle">3</text>
      <text x="164" y="128" className="bd-num" textAnchor="end">10</text>
      <text x="178" y="128" className="bd-num" textAnchor="middle">7</text>
      <rect x="167" y="78" width="22" height="56" rx="4" className="bd-colbox" />
      <path d="M200,82 V130" className="bd-vdouble" markerStart="url(#sm2Up)" markerEnd="url(#sm2Up)" />
      <text x="208" y="110" className="bd-op">×</text>

      <line x1="118" y1="140" x2="214" y2="140" className="bd-rule" />
      <text x="166" y="164" className="bd-part bd-dev-part" textAnchor="end">110</text>
      <text x="170" y="164" className="bd-part bd-part-hi">21</text>

      <AnswerBox x={96} y={174} w={128} h={36} value="11021" />
      <defs>
        <marker id="sm2Tip" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-curveHead" />
        </marker>
        <marker id="sm2Or" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-devHead" />
        </marker>
        <marker id="sm2Up" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-vdoubleHead" />
        </marker>
      </defs>
    </svg>
  );
}

// Book pp.41/44/156/160 — the shared two-panel column set-out.
// Left panel builds the first part ("one more than the one before"),
// right panel multiplies the units column; the two parts join into the answer.
type ColumnSpec = {
  noteL1: string; noteL2: string; noteR: string;
  noteL2Ja?: string;
  top: [string, string]; bot: [string, string];
  carry: string; leftPart: string; rightPart: string; answer: string;
  /* "One More than the one before": the book draws an arrow from the tens digit up to it. */
  oneMore?: boolean;
};

function ColumnFormDiagram({ spec, lang }: { spec: ColumnSpec; lang: Lang }) {
  const s = spec;
  return (
    <svg viewBox="0 0 340 210" className="bd-svg bd-svg-wide">
      <text x="10" y="16" className="bd-note">{s.noteL1}</text>
      <text x="10" y="31" className="bd-note">{lang === "ja" && s.noteL2Ja ? s.noteL2Ja : s.noteL2}</text>
      <text x="196" y="16" className="bd-note">{s.noteR}</text>
      <text x="10" y="50" className="bd-steplabel">{lang === "ja" ? "手順1・十の位" : "Step 1 · tens"}</text>
      <text x="196" y="50" className="bd-steplabel">{lang === "ja" ? "手順2・一の位" : "Step 2 · units"}</text>

      {/* left panel — a wider carry ("+6") needs more clearance from the arrowhead */}
      <text x={s.oneMore ? 68 : s.carry.length > 1 ? 82 : 74} y="70" className="bd-carry" textAnchor="middle">{s.carry}</text>
      {s.oneMore && <path d="M84,80 L77,71" className="bd-curve" markerEnd="url(#bdTip)" />}
      <text x="36" y="90" className="bd-op">×</text>
      <path d="M52,92 Q50,72 56,68" className="bd-curve" fill="none" markerEnd="url(#bdTip)" />
      <path d="M52,96 Q52,116 62,120" className="bd-curve" fill="none" markerEnd="url(#bdTip)" />
      <text x="82" y="96" className="bd-num" textAnchor="middle">{s.top[0]}</text>
      <text x="108" y="96" className="bd-num" textAnchor="middle">{s.top[1]}</text>
      <text x="82" y="126" className="bd-num" textAnchor="middle">{s.bot[0]}</text>
      <text x="108" y="126" className="bd-num" textAnchor="middle">{s.bot[1]}</text>
      <line x1="62" y1="136" x2="124" y2="136" className="bd-rule" />
      <text x="95" y="160" className="bd-part" textAnchor="middle">{s.leftPart}</text>

      {/* right panel */}
      <rect x="242" y="80" width="26" height="54" rx="4" className="bd-colbox" />
      <text x="222" y="96" className="bd-num" textAnchor="middle">{s.top[0]}</text>
      <text x="255" y="96" className="bd-num" textAnchor="middle">{s.top[1]}</text>
      <text x="200" y="126" className="bd-op">×</text>
      <text x="222" y="126" className="bd-num" textAnchor="middle">{s.bot[0]}</text>
      <text x="255" y="126" className="bd-num" textAnchor="middle">{s.bot[1]}</text>
      <path d="M280,84 V130" className="bd-vdouble" markerStart="url(#bdTipUp)" markerEnd="url(#bdTipDn)" />
      <text x="290" y="112" className="bd-op">×</text>
      <line x1="204" y1="136" x2="270" y2="136" className="bd-rule" />
      <text x="222" y="160" className="bd-part" textAnchor="middle">{s.leftPart}</text>
      <text x="256" y="160" className="bd-part bd-part-hi" textAnchor="middle">{s.rightPart}</text>

      <AnswerBox x={110} y={170} w={120} h={36} value={s.answer} />
      <defs>
        <marker id="bdTip" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-curveHead" />
        </marker>
        <marker id="bdTipUp" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-vdoubleHead" />
        </marker>
        <marker id="bdTipDn" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-vdoubleHead" />
        </marker>
      </defs>
    </svg>
  );
}

const COLUMN_SPECS: Record<string, ColumnSpec> = {
  // p.41 — units sum to 10, tens the same: 74 × 76
  specialMult1: {
    oneMore: true,
    noteL1: "7 × 8 = 56", noteL2: "8 is One More of 7", noteL2Ja: "8 は 7 より1大きい", noteR: "4 × 6 = 24",
    top: ["7", "4"], bot: ["7", "6"], carry: "8",
    leftPart: "56", rightPart: "24", answer: "5624",
  },
  // p.44 — tens sum to 10, units the same: 46 × 66
  specialMult2: {
    noteL1: "(3 × 7) + 4 = 25", noteL2: "tens × tens, add the units", noteL2Ja: "十の位×十の位に一の位をたす", noteR: "4 × 4 = 16",
    top: ["3", "4"], bot: ["7", "4"], carry: "+4",
    leftPart: "25", rightPart: "16", answer: "2516",
  },
  // p.156 — square of a number ending in 5: 35²
  square5: {
    oneMore: true,
    noteL1: "3 × 4 = 12", noteL2: "4 is One More of 3", noteL2Ja: "4 は 3 より1大きい", noteR: "5 × 5 = 25",
    top: ["3", "5"], bot: ["3", "5"], carry: "4",
    leftPart: "12", rightPart: "25", answer: "1225",
  },
  // p.160 — square of a number starting with 5: 54²
  squareStart5: {
    noteL1: "(5 × 5) + 4 = 29", noteL2: "25, then add the units digit", noteL2Ja: "25に一の位をたす", noteR: "4 × 4 = 16",
    top: ["5", "4"], bot: ["5", "4"], carry: "+4",
    leftPart: "29", rightPart: "16", answer: "2916",
  },
};

// Book pp.75/84/94/99 — the base-method pages.
// Left panel cross-subtracts (or cross-adds) for the left part; right panel
// multiplies the two deviations for the right part.
type BaseSpec = {
  caption: string;
  numA: string; devA: string;
  numB: string; devB: string;
  leftPart: string; baseMult?: string; rightPart: string;
  /* the left part after "× sub-base tens", shown in the right panel (book: 54 | 12) */
  leftFinal?: string;
  notes: string[]; answer: string;
  /* Right part overflows the base's digits: the book arcs the carry back into the left part. */
  carry?: boolean;
};

function BaseMethodDiagram({ spec }: { spec: BaseSpec }) {
  const s = spec;
  const uid = s.numA + s.numB;
  /* The numbers are end-anchored, so a three-digit one reaches further left than
     a two-digit one. The multiplication sign and the rule follow it instead of
     sitting at a fixed x, where 107 had the sign struck through its leading 1. */
  const digits = Math.max(s.numA.length, s.numB.length);
  const opL = 80 - digits * 12 - 14;
  const opR = 255 - digits * 12 - 14;
  /* Same idea on the right: the deviations are 16px and start at x=285, so the
     vertical "x" arrow is parked clear of the longest of them. */
  const devW = Math.max(s.devA.length, s.devB.length) * 9;
  const vx = 285 + devW + 10;
  return (
    <svg viewBox={`0 0 ${Math.max(340, vx + 26)} ${236 + (s.carry ? 20 : 0)}`} className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">{s.caption}</text>

      {/* left panel — cross the numbers with the opposite deviation */}
      <text x="80" y="56" className="bd-num" textAnchor="end">{s.numA}</text>
      <text x="110" y="56" className="bd-dev">{s.devA}</text>
      <text x={opL} y="84" className="bd-op">×</text>
      <text x="80" y="84" className="bd-num" textAnchor="end">{s.numB}</text>
      <text x="110" y="84" className="bd-dev">{s.devB}</text>
      {/* One diagonal is enough: both cross-subtractions (or cross-additions) give the
          same left part, and the note works it as top number with the bottom deviation. */}
      <path d="M84,60 L106,79" className="bd-curve" markerEnd={`url(#bmTip${uid})`} />
      <line x1={opL} y1="92" x2="132" y2="92" className="bd-rule" />
      <text x="80" y="116" className="bd-part" textAnchor="end">{s.leftPart}</text>
      {s.baseMult && <text x="88" y="116" className="bd-basemult">{s.baseMult}</text>}

      {/* right panel — multiply the two deviations */}
      <text x="255" y="56" className="bd-num" textAnchor="end">{s.numA}</text>
      <text x="285" y="56" className="bd-dev">{s.devA}</text>
      <text x={opR} y="84" className="bd-op">×</text>
      <text x="255" y="84" className="bd-num" textAnchor="end">{s.numB}</text>
      <text x="285" y="84" className="bd-dev">{s.devB}</text>
      <path d={`M${vx},52 V88`} className="bd-vdev" markerStart={`url(#bmTipUp${uid})`} markerEnd={`url(#bmTipDn${uid})`} />
      <text x={vx + 8} y="74" className="bd-op">×</text>
      <line x1={opR} y1="92" x2="307" y2="92" className="bd-rule" />
      <text x="255" y="116" className="bd-part" textAnchor="end">{s.leftFinal ?? s.leftPart}</text>
      <text x="265" y="116" className="bd-part bd-dev-part">{s.rightPart}</text>
      {s.carry && (
        <>
          <path d="M271,122 Q262,146 246,123" className="bd-vdev" fill="none" markerEnd={`url(#bmTipDn${uid})`} />
          <text x="258" y="150" className="bd-op" style={{ fill: "var(--sun1)" }}>+</text>
        </>
      )}

      {s.notes.map((n, i) => (
        <text key={i} x="10" y={146 + (s.carry ? 20 : 0) + i * 17} className="bd-note">{n}</text>
      ))}
      <AnswerBox x={196} y={186 + (s.carry ? 20 : 0)} w={134} h={40} value={s.answer} />
      <defs>
        <marker id={`bmTip${uid}`} markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-curveHead" />
        </marker>
        <marker id={`bmTipUp${uid}`} markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-devHead" />
        </marker>
        <marker id={`bmTipDn${uid}`} markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-devHead" />
        </marker>
      </defs>
    </svg>
  );
}

const BASE_SPECS: Record<string, BaseSpec> = {
  // p.79 — 19 × 16, sub-base 20
  baseBelow20to90: {
    caption: "sub-base 20 · left = cross-subtract, then × 2",
    numA: "19", devA: "- 1", numB: "16", devB: "- 4",
    leftPart: "15", baseMult: "× 2", leftFinal: "30", rightPart: "4",
    notes: ["Sub-base = 2 × 10 = 20.", "Cross: 19 − 4 = 15, then 15 × 2 = 30", "Right: -1 × -4 = 4 → 30 | 4"],
    answer: "304",
  },
  // p.89 — 23 × 24, sub-base 20
  baseAbove20to90: {
    carry: true,
    caption: "sub-base 20 · left = cross-add, then × 2",
    numA: "23", devA: "+ 3", numB: "24", devB: "+ 4",
    leftPart: "27", baseMult: "× 2", leftFinal: "54", rightPart: "12",
    notes: ["Sub-base = 2 × 10 = 20.", "Cross: 23 + 4 = 27, then 27 × 2 = 54", "Right: 3 × 4 = 12 (carry 1) → 55 | 2"],
    answer: "552",
  },
  baseBelow10: {
    caption: "left = cross-subtract · right = product of deficiencies",
    numA: "7", devA: "- 3", numB: "8", devB: "- 2",
    leftPart: "5", rightPart: "6",
    notes: ["Deficiencies: - 3 and - 2", "Left: 7 − 2 = 5 · Right: -3 × -2 = 6"],
    answer: "56",
  },
  baseAbove10: {
    carry: true,
    caption: "left = cross-add · right = product of surpluses",
    numA: "14", devA: "+ 4", numB: "18", devB: "+ 8",
    leftPart: "22", baseMult: "× 1", rightPart: "32",
    notes: ["First digit of the Base is 1.", "Surpluses: +4 and +8", "Left: 14 + 8 = 22 · Right: 4 × 8 = 32 (carry 3)"],
    answer: "252",
  },
  baseBelow100: {
    caption: "left = cross-subtract · right = product of deficiencies in 2-digit",
    numA: "96", devA: "- 04", numB: "98", devB: "- 02",
    leftPart: "94", rightPart: "08",
    notes: ["Deficiencies: −04 and −02", "Left: 96 − 02 = 94", "Right: 04 × 02 = 08 (in 2-digit)"],
    answer: "9408",
  },
  baseAbove100: {
    caption: "left = cross-add · right = product of surpluses in 2-digit",
    numA: "104", devA: "+ 04", numB: "107", devB: "+ 07",
    leftPart: "111", rightPart: "28",
    notes: ["Surpluses: +04 and +07", "Left: 104 + 07 = 111", "Right: 04 × 07 = 28"],
    answer: "11128",
  },
};

// Book pp.143/149 — the division pages.
// The last dividend digit is fenced off as the remainder zone; each quotient
// digit feeds into the next dividend digit (×2 for the 8s case).
type DivSpec = {
  caption: string[];
  dividend: string[]; quotient: string[]; remainder: string;
  hop: string; notes: string[]; answer: string;
};

function DivisionDiagram({ spec }: { spec: DivSpec }) {
  const s = spec;
  const x0 = 46, pitch = 30;
  const barX = x0 + s.quotient.length * pitch - 8;
  return (
    <svg viewBox="0 0 320 232" className="bd-svg bd-svg-wide">
      {s.caption.map((c, i) => (
        <text key={`c${i}`} x="10" y={15 + i * 15} className="bd-caption">{c}</text>
      ))}

      {s.dividend.map((d, i) => (
        <text key={`d${i}`} x={x0 + i * pitch} y="58" className="bd-num" textAnchor="middle">{d}</text>
      ))}
      <line x1={barX} y1="34" x2={barX} y2="106" className="bd-flag" />
      <line x1={x0 - 18} y1="72" x2={barX + s.remainder.length * pitch + 10} y2="72" className="bd-rule" />

      {s.quotient.map((q, i) => (
        <text key={`q${i}`} x={x0 + i * pitch} y="100" className="bd-num bd-qdigit" textAnchor="middle">{q}</text>
      ))}
      <text x={barX + 20} y="100" className="bd-num bd-rdigit" textAnchor="middle">{s.remainder}</text>

      {/* 19px digits on the y=100 baseline start at about y=87, so the hop runs
          in the band between the rule and the digits rather than across them. */}
      <path
        d={`M${x0 + 8},84 Q${(x0 + barX) / 2 + 14},76 ${barX + 8},84`}
        className="bd-hop"
        fill="none"
        markerEnd="url(#bdHopTip)"
      />
      <text x={(x0 + barX) / 2 + 16} y="124" className="bd-hoplabel" textAnchor="middle">{s.hop}</text>

      <text x={x0} y="146" className="bd-tag" textAnchor="middle">Q</text>
      <text x={barX + 20} y="146" className="bd-tag bd-rdigit" textAnchor="middle">R</text>

      {s.notes.map((n, i) => (
        <text key={`n${i}`} x="10" y={168 + i * 16} className="bd-note">{n}</text>
      ))}
      <AnswerBox x={95} y={192} w={130} h={34} value={s.answer} />
      <defs>
        <marker id="bdHopTip" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-hopHead" />
        </marker>
      </defs>
    </svg>
  );
}

const DIV_SPECS: Record<string, DivSpec> = {
  // p.143 — 23 ÷ 9
  // p.149 — 31 ÷ 8 (8 is 2 less than base 10, so double each quotient digit)
};

// Book p.68 — Multiplication by 12 to 19, worked as 243 × 14 (flag = 4).
// The number is sandwiched in zeros and swept right to left.
/* Multiplication by 12-19, drawn the way page 68 draws it: one panel per step,
   each showing the whole column form with the pair being combined arrowed, the
   multiplier underlined, and the answer built up with its carry as a subscript.
   The previous version explained the same arithmetic in four lines of prose,
   which is a different thing from showing the work. */


/* Page 59: two zeros either side, then a three-digit window slid right to left,
   each panel adding one digit to the answer. */
function Mult111Panel({ digits, at, answer, carry, uid }: {
  digits: string[]; at: number; answer: string; carry: number; uid: string;
}) {
  const x0 = 9, pitch = 13;
  const w = x0 + digits.length * pitch + 4;
  const wl = x0 + at * pitch - 7;
  const wr = x0 + (at + 2) * pitch + 7;
  return (
    <svg viewBox={`0 0 ${w} 70`} className="bd-svg bd-flagpanel">
      <defs>
        <marker id={uid} markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--sun1)" />
        </marker>
      </defs>
      {/* the three-digit window */}
      <rect x={wl} y="12" width={wr - wl} height="24" rx="5" className="bd-window" />
      {digits.map((d, i) => (
        <text key={i} x={x0 + i * pitch} y="30" className="bd-num" textAnchor="middle">{d}</text>
      ))}
      {carry > 0 && <text x={wl - 2} y="46" className="bd-carry" textAnchor="end">{carry}</text>}
      <text x={w - 5} y="60" className="bd-partline" textAnchor="end">{answer}</text>
    </svg>
  );
}

function Mult111Diagram() {
  const n = "4213";
  const digits = `00${n}00`.split("");
  /* Sum each group of three, right to left, carrying as the book does. */
  const panels: { at: number; answer: string; carry: number }[] = [];
  let carry = 0;
  let out = "";
  for (let at = digits.length - 3; at >= 0; at--) {
    const sum = Number(digits[at]) + Number(digits[at + 1]) + Number(digits[at + 2]) + carry;
    out = String(sum % 10) + out;
    carry = Math.floor(sum / 10);
    /* A carry off the left end belongs in the answer — without this, 999 x 111
       reads 10889 instead of 110889. */
    panels.push({ at, answer: (at === 0 && carry > 0 ? String(carry) : "") + out, carry: at === 0 ? 0 : carry });
  }
  const total = Number(n) * 111;
  return (
    <div className="bd-flaggrid">
      <div className="bd-flagcap">two zeros either side · slide a 3-digit window right → left</div>
      <div className="bd-flagrow bd-flagrow-3">
        {panels.map((p, i) => (
          <Mult111Panel key={i} digits={digits} at={p.at} answer={p.answer} carry={p.carry} uid={`m111${i}`} />
        ))}
      </div>
      <div className="bd-flaganswer">{total}</div>
    </div>
  );
}


type NikhilamSpec = { caption: string; top: string[]; minuend: string[]; subtrahend: string[]; notes: string[]; answer: string[] };

const NK_RIGHT = 232, NK_PITCH = 30;

function DigitRow({ cells, y, cls }: { cells: string[]; y: number; cls: string }) {
  return (
    <>
      {cells.map((v, i) => (
        <text
          key={i}
          x={NK_RIGHT - (cells.length - 1 - i) * NK_PITCH}
          y={y}
          className={cls}
          textAnchor="middle"
        >
          {v}
        </text>
      ))}
    </>
  );
}

function AllFrom9Diagram({ spec }: { spec: NikhilamSpec }) {
  const s = spec;
  const widest = Math.max(s.top.length, s.minuend.length, s.subtrahend.length, s.answer.length);
  const leftEdge = NK_RIGHT - (widest - 1) * NK_PITCH - 20;
  return (
    <svg viewBox="0 0 330 220" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">{s.caption}</text>

      <DigitRow cells={s.top} y={44} cls="bd-nine" />
      <DigitRow cells={s.minuend} y={76} cls="bd-num" />
      <text x={leftEdge - 22} y={108} className="bd-op">−</text>
      <DigitRow cells={s.subtrahend} y={108} cls="bd-num" />
      <line x1={leftEdge - 26} y1="118" x2={NK_RIGHT + 16} y2="118" className="bd-rule" />
      <DigitRow cells={s.answer} y={146} cls="bd-part bd-part-hi" />

      {s.notes.map((n, i) => (
        <text key={`n${i}`} x="10" y={176 + i * 16} className="bd-note">{n}</text>
      ))}
    </svg>
  );
}

const NIKHILAM_SPECS: Record<string, NikhilamSpec> = {
  // p.175 — 8324 − 2348 without borrowing; bar the columns that go negative
  subFromPower10: {
    caption: "all from 9, the last from 10",
    top: ["9", "9", "9", "9", "10"],
    minuend: ["1", "0", "0", "0", "0", "0"],
    subtrahend: ["3", "5", "8", "7", "5"],
    notes: ["Five zeros, so five digits to take.", "9−3=6, 9−5=4, 9−8=1, 9−7=2, 10−5=5"],
    answer: ["6", "4", "1", "2", "5"],
  },

  subOtherThan10s: {
    caption: "drop the leading digit by 1, then Nikhilam",
    top: ["3", "9", "9", "10"],
    minuend: ["4", "0", "0", "0"],
    subtrahend: ["6", "2", "8"],
    notes: ["4 becomes 'one less' → 3", "then 1000 − 628 = 372"],
    answer: ["3", "3", "7", "2"],
  },
};


// Books pp.104/64 — answers built from a left part and a right part.
type PartsSpec = { caption: string; leftLabel: string; leftWork: string[]; rightLabel: string; rightWork: string[]; join: string; answer: string };

function TwoPartsDiagram({ spec }: { spec: PartsSpec }) {
  const s = spec;
  const rows = Math.max(s.leftWork.length, s.rightWork.length);
  const boxH = 44 + rows * 22;
  return (
    <svg viewBox="0 0 330 214" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">{s.caption}</text>

      <rect x="10" y="28" width="152" height={boxH} rx="12" className="bd-partbox" />
      <text x="86" y="48" className="bd-steplabel" textAnchor="middle">{s.leftLabel}</text>
      {s.leftWork.map((w, i) => (
        <text key={i} x="86" y={74 + i * 22} className="bd-partline" textAnchor="middle">{w}</text>
      ))}

      <rect x="170" y="28" width="150" height={boxH} rx="12" className="bd-partbox bd-partbox-hi" />
      <text x="245" y="48" className="bd-steplabel" textAnchor="middle">{s.rightLabel}</text>
      {s.rightWork.map((w, i) => (
        <text key={i} x="245" y={74 + i * 22} className="bd-partline bd-part-hi" textAnchor="middle">{w}</text>
      ))}

      <text x="165" y={boxH + 58} className="bd-part" textAnchor="middle">{s.join}</text>
      <AnswerBox x={100} y={boxH + 70} w={130} h={38} value={s.answer} />
    </svg>
  );
}

const PARTS_SPECS: Record<string, PartsSpec> = {
  // p.181 — 56² by duplexes
  duplexSquare: {
    caption: "D(a) = a² · D(ab) = 2ab · lay them side by side",
    leftLabel: "D(5) then D(56)", leftWork: ["5² = 25", "2 × 5 × 6 = 60"],
    rightLabel: "D(6)", rightWork: ["6² = 36", "balance the parts"],
    join: "25 | 60 | 36", answer: "3136",
  },
  // p.164 — vinculating the units of 47
  // p.170 — devinculating 7 2̄
  // p.23 — 47 + 29, one more than the one before
  add9: {
    caption: "add the next ten, then give one back",
    leftLabel: "step 1 · the ten", leftWork: ["9 → 10", "36 + 10 = 46"],
    rightLabel: "step 2 · give back", rightWork: ["one too many", "46 − 1 = 45"],
    join: "46 − 1", answer: "45",
  },
  // p.27 — 63 − 29
  sub9: {
    caption: "take the next ten, then hand one back",
    leftLabel: "step 1 · the ten", leftWork: ["9 → 10", "36 − 10 = 26"],
    rightLabel: "step 2 · hand back", rightWork: ["one too many taken", "26 + 1 = 27"],
    join: "26 + 1", answer: "27",
  },
  // p.31 — 73 + 8, one more in the tens and two less in the units
  add8sub8: {
    caption: "a number ending in 8 is 2 less than the next ten",
    leftLabel: "1 More · tens", leftWork: ["73 + 10", "= 83"],
    rightLabel: "2 Less · units", rightWork: ["83 − 2", "= 81"],
    join: "83 − 2", answer: "81",
  },
  mult9: {
    caption: "answer in two parts — no multiplication!",
    leftLabel: "left part", leftWork: ["(32 − 1) − 3", "= 28"],
    rightLabel: "right part", rightWork: ["10 − 2", "= 8"],
    join: "28 | 8", answer: "288",
  },
};


/* Page 64: two column panels — units by units first, then the cross-total on the
   left with the carry folded in. */


/* Page 136: the column subtraction revealed a column at a time, with the ones
   that needed a complement marked. */


/* Pages 188 and 195-199 all draw division the same way: the dividend with its
   remainder zone fenced off, the quotient growing underneath, and one panel per
   divide-then-flag step. One component, four lessons. */
type FlagStep = { note: string; work?: string; quotient: string; rem: string };
type FlagDivSpec = {
  caption: string;
  dividend: string;
  /* how many digits at the right belong to the remainder zone */
  zone: number;
  steps: FlagStep[];
  answer: string;
};

function FlagDivPanel({ dividend, zone, step }: { dividend: string; zone: number; step: FlagStep }) {
  const pitch = 17, x0 = 10;
  const w = x0 + dividend.length * pitch + 16;
  const fenceX = x0 + (dividend.length - zone) * pitch - pitch / 2;
  return (
    <svg viewBox={`0 0 ${w} 104`} className="bd-svg bd-flagpanel">
      {dividend.split("").map((d, i) => (
        <text key={i} x={x0 + i * pitch} y="26" className="bd-num" textAnchor="middle">{d}</text>
      ))}
      {/* the fence between the quotient side and the remainder zone */}
      <line x1={fenceX} y1="10" x2={fenceX} y2="70" className="bd-rule" />
      <line x1="6" y1="40" x2={w - 6} y2="40" className="bd-rule" />

      {/* Quotient and remainder sit under the rule and inside the fence, as the
          book sets them; the prose goes below the whole figure so neither the
          fence nor a long note has to cut across the other. */}
      <text x={fenceX - 6} y="62" className="bd-partline" textAnchor="end">{step.quotient}</text>
      <text x={w - 8} y="62" className="bd-dev" style={{ fontSize: 13 }} textAnchor="end">{step.rem}</text>

      {/* textLength keeps a long note inside its panel rather than letting it
          run into the neighbouring one. */}
      <text
        x={x0 - 4} y="88" className="bd-caption" textAnchor="start"
        style={{ fontSize: 8 }} lengthAdjust="spacingAndGlyphs"
        textLength={step.note.length * 4.2 > w - 12 ? w - 12 : undefined}
      >
        {step.note}
      </text>
      {step.work && (
        <text
          x={x0 - 4} y="102" className="bd-dev" textAnchor="start"
          style={{ fontSize: 9 }} lengthAdjust="spacingAndGlyphs"
          textLength={step.work.length * 4.8 > w - 12 ? w - 12 : undefined}
        >
          {step.work}
        </text>
      )}
    </svg>
  );
}

function FlagDivDiagram({ spec }: { spec: FlagDivSpec }) {
  return (
    <div className="bd-flaggrid">
      <div className="bd-flagcap">{spec.caption}</div>
      <div className="bd-flagrow bd-flagrow-2">
        {spec.steps.map((st, i) => (
          <FlagDivPanel key={i} dividend={spec.dividend} zone={spec.zone} step={st} />
        ))}
      </div>
      <div className="bd-flaganswer">{spec.answer}</div>
    </div>
  );
}

const FLAGDIV_SPECS: Record<string, FlagDivSpec> = {
  // p.144 — 3794 ÷ 9, drawn as the book draws it: one panel per carry
  // p.195 — 5367 ÷ 72, divisor 7 with flag 2
  // p.196 — 3425 ÷ 73, where a remainder goes negative
  // p.199 — 3425 ÷ 58, the flag is a bar so it adds
  // p.188 — 123123 ÷ 99, base 100 so two digits are the remainder zone
};


export const BOOK_DIAGRAMS: Partial<Record<string, (p: { lang: Lang }) => React.ReactElement>> = {
  mult1x: ({ lang }: { lang: Lang }) => <Mult1xFig a={14} b={12} lang={lang} />,
  ...Object.fromEntries(
    Object.entries(FLAGDIV_SPECS).map(([id, spec]) => [id, () => <FlagDivDiagram spec={spec} />])
  ),
  subtractionGeneral: ({ lang }: { lang: Lang }) => <SubGenFig a="624" b="347" lang={lang} />,
  mult11: Mult11Diagram,
  mult12to19: () => <FlagStagesFig n="243" flag={4} />,
  mult111: Mult111Diagram,
  balancing: ({ lang }: { lang: Lang }) => <BalanceFig segs={[24, 51, 39]} lang={lang} />,
  additionGeneral: FriendsAddFig,
  digitsum: Ds512,
  ...Object.fromEntries(
    Object.entries(NIKHILAM_SPECS).map(([id, spec]) => [id, () => <AllFrom9Diagram spec={spec} />])
  ),
  ...Object.fromEntries(
    Object.entries(PARTS_SPECS).map(([id, spec]) => [id, () => <TwoPartsDiagram spec={spec} />])
  ),
  ...Object.fromEntries(
    Object.entries(DIV_SPECS).map(([id, spec]) => [id, () => <DivisionDiagram spec={spec} />])
  ),
  ...Object.fromEntries(
    Object.entries(BASE_SPECS).map(([id, spec]) => [id, () => <BaseMethodDiagram spec={spec} />])
  ),
  ...Object.fromEntries(
    Object.entries(COLUMN_SPECS).map(([id, spec]) => [
      id,
      ({ lang }: { lang: Lang }) => <ColumnFormDiagram spec={spec} lang={lang} />,
    ])
  ),  /* p.44 draws its own figure (vertical × plus the "+ unit" flag), not the shared column set-out. */
  specialMult2: SpecialMult2Diagram,
  square5: Square5Diagram,
  subFromPower10: ({ lang }: { lang: Lang }) => <Nik10Fig minuend="100000" sub="35875" ex={1} lang={lang} />,
  mult9: ({ lang }: { lang: Lang }) => <Mult9Fig n="32" lang={lang} />,
  subOtherThan10s: ({ lang }: { lang: Lang }) => <SubRoundFig a="4000" b="628" lang={lang} />,
  squareStart5: Sq54,
  duplexSquare: ({ lang }: { lang: Lang }) => <DuplexFig n="56" lang={lang} />,
};

// The worked example each diagram draws, shown in the card header.
/* p.94 second example: 83 × 97 (base 100). */
const BASE_BELOW100_EX2: BaseSpec = {
  caption: "left = cross-subtract · right = product of deficiencies in 2-digit",
  numA: "83", devA: "- 17", numB: "97", devB: "- 03",
  leftPart: "80", rightPart: "51",
  notes: ["Deficiencies: −17 and −03", "Left: 83 − 03 = 80", "Right: 17 × 03 = 51"],
  answer: "8051",
};

/* p.99 second example: 112 × 115 (base 100) — 180 overflows the two right digits, carry 1. */
const BASE_ABOVE100_EX2: BaseSpec = {
  carry: true,
  caption: "left = cross-add · right = product of surpluses in 2-digit",
  numA: "112", devA: "+ 12", numB: "115", devB: "+ 15",
  leftPart: "127", rightPart: "180",
  notes: ["Surpluses: +12 and +15", "Left: 112 + 15 = 127", "Right: 12 × 15 = 180 (carry 1)"],
  answer: "12880",
};

/* p.89 second example: 72 × 75 (sub-base 70). */
const BASE_ABOVE2090_EX2: BaseSpec = {
  carry: true,
  caption: "sub-base 70 · left = cross-add, then × 7",
  numA: "72", devA: "+ 2", numB: "75", devB: "+ 5",
  leftPart: "77", baseMult: "× 7", leftFinal: "539", rightPart: "10",
  notes: ["Sub-base = 7 × 10 = 70.", "Cross: 72 + 5 = 77, then 77 × 7 = 539", "Right: 2 × 5 = 10 (carry 1) → 540 | 0"],
  answer: "5400",
};

/* p.79 second example: 76 × 77 (sub-base 80). */
const BASE_BELOW2090_EX2: BaseSpec = {
  carry: true,
  caption: "sub-base 80 · left = cross-subtract, then × 8",
  numA: "76", devA: "- 4", numB: "77", devB: "- 3",
  leftPart: "73", baseMult: "× 8", leftFinal: "584", rightPart: "12",
  notes: ["Sub-base = 8 × 10 = 80.", "Cross: 76 − 3 = 73, then 73 × 8 = 584", "Right: 4 × 3 = 12 (carry 1) → 585 | 2"],
  answer: "5852",
};

/* The book's second worked example, where the page draws it too. */
export const BOOK_DIAGRAMS2: Partial<Record<string, (p: { lang: Lang }) => React.ReactElement>> = {
  mult11: Mult11Diagram2,
  specialMult1: SpecialMult1Diagram2,
  baseBelow100: () => <BaseMethodDiagram spec={BASE_BELOW100_EX2} />,
  baseAbove100: () => <BaseMethodDiagram spec={BASE_ABOVE100_EX2} />,
  baseAbove20to90: () => <BaseMethodDiagram spec={BASE_ABOVE2090_EX2} />,
  baseBelow20to90: () => <BaseMethodDiagram spec={BASE_BELOW2090_EX2} />,
  squareStart5: Sq512,
  duplexSquare: ({ lang }: { lang: Lang }) => <DuplexFig n="648" lang={lang} />,
  additionGeneral: BorrowFriendFig,
  subtractionGeneral: ({ lang }: { lang: Lang }) => <SubGenFig a="62535" b="26756" lang={lang} />,
  subOtherThan10s: ({ lang }: { lang: Lang }) => <SubRoundFig a="8000" b="5732" lang={lang} />,
  specialMult2: SpecialMult2Diagram2,
  square5: Square5Diagram2,
  subFromPower10: ({ lang }: { lang: Lang }) => <Nik10Fig minuend="10000" sub="78" ex={2} lang={lang} />,
  digitsum: Ds37,
  mult9: ({ lang }: { lang: Lang }) => <Mult9Fig n="423" lang={lang} />,
  balancing: ({ lang }: { lang: Lang }) => <BalanceFig segs={[20, 76, 8, 35, 143, 46]} lang={lang} />,
  mult1x: ({ lang }: { lang: Lang }) => <Mult1xFig a={19} b={16} lang={lang} />,
  mult12to19: () => <FlagStagesFig n="5437" flag={5} setup />,
};
export const BOOK_DIAGRAM_EQ2: Partial<Record<string, string>> = {
  mult11: "825 × 11",
  specialMult1: "103 × 107",
  baseBelow100: "83 × 97  (base 100)",
  baseAbove100: "112 × 115  (base 100)",
  baseAbove20to90: "72 × 75  (base 70)",
  baseBelow20to90: "76 × 77  (base 80)",
  squareStart5: "512²",
  duplexSquare: "648²",
  additionGeneral: "54 + 39",
  subtractionGeneral: "62535 − 26756",
  subOtherThan10s: "8000 − 5732",
  specialMult2: "27 × 87",
  square5: "115²",
  subFromPower10: "10000 − 78",
  digitsum: "DS of 37",
  mult9: "423 × 9",
  balancing: "20 | 76 | 8 | 35 | 143 | 46",
  mult1x: "19 × 16",
  mult12to19: "5437 × 15  (flag = 5)",
};

/* A card the book puts before the examples (e.g. "Numbers are friends to each other"). */
export const BOOK_INTRO: Partial<Record<string, { title: string; titleJa: string; D: (p: { lang: Lang }) => React.ReactElement }>> = {
  subtractionGeneral: { title: "3 easy rules", titleJa: "かんたん3つのルール", D: SubGenRules },
  additionGeneral: { title: "Numbers are friends to each other", titleJa: "数は友だちどうし", D: FriendsCircle },
};

/* Further example cards, where the book page has more than two. */
export const BOOK_MORE: Partial<Record<string, { eq: string; D: (p: { lang: Lang }) => React.ReactElement }[]>> = {
  digitsum: [
    { eq: "DS of 6379", D: Ds6379 },
    { eq: "DS of 34278318", D: Ds34278318 },
  ],
};
/* Pages whose example headers are just the sum ("DS of 512"), without "Example:". */
export const BOOK_BARE_HEADERS = new Set(["digitsum"]);

export const BOOK_DIAGRAM_EQ: Partial<Record<string, string>> = {
  baseBelow20to90: "19 × 16  (base 20)",
  baseAbove20to90: "23 × 24  (base 20)",
  duplexSquare: "56²",
  add9: "36 + 9",
  sub9: "36 − 9",
  add8sub8: "73 + 8",
  mult11: "34 × 11",
  specialMult1: "74 × 76",
  specialMult2: "34 × 74",
  square5: "35²",
  squareStart5: "54²",
  baseBelow10: "7 × 8",
  baseAbove10: "14 × 18",
  baseBelow100: "96 × 98  (base 100)",
  baseAbove100: "104 × 107  (base 100)",
  mult12to19: "243 × 14  (flag = 4)",
  mult111: "4213 × 111",
  balancing: "24 | 51 | 39",
  additionGeneral: "38 + 17 + 22",
  digitsum: "DS of 512",
  subFromPower10: "100000 − 35875",
  subtractionGeneral: "624 − 347",
  subOtherThan10s: "4000 − 628",
  mult9: "32 × 9",
  mult1x: "14 × 12",
};
