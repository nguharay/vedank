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

// Book p.54 — Multiplication by 11, worked as 34 × 11.
// Outer digits fan down; the neighbour sum arcs into the middle.
function Mult11Diagram({ lang }: { lang: Lang }) {
  const a = 3, b = 4, sum = a + b;
  return (
    <svg viewBox="0 0 300 200" className="bd-svg">
      <text x="140" y="34" className="bd-digit" textAnchor="middle">{a}</text>
      <text x="170" y="34" className="bd-digit" textAnchor="middle">{b}</text>

      <path d="M136,42 L116,62" className="bd-fan" markerEnd="url(#bdFan)" />
      <path d="M174,42 L194,62" className="bd-fan" markerEnd="url(#bdFan)" />

      <text x="110" y="90" className="bd-digit-lg" textAnchor="middle">{a}</text>
      <text x="155" y="90" className="bd-digit-lg bd-mid" textAnchor="middle">{sum}</text>
      <text x="200" y="90" className="bd-digit-lg" textAnchor="middle">{b}</text>

      <path d="M114,102 Q155,136 196,102" className="bd-arc" fill="none" />
      <path d="M110,108 L114,100 L118,108 Z" className="bd-arcTip" />
      <path d="M192,108 L196,100 L200,108 Z" className="bd-arcTip" />
      <text x="155" y="130" className="bd-plus" textAnchor="middle">+</text>

      <StepArrow x={10} y={78} label={lang === "ja" ? "手順1" : "Step 1"} tone="a" />
      <StepArrow x={10} y={112} label={lang === "ja" ? "手順2" : "Step 2"} tone="b" />

      <AnswerBox x={100} y={152} w={110} h={40} value={String(34 * 11)} />
      <defs>
        <marker id="bdFan" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" className="bd-fanHead" />
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
  top: [string, string]; bot: [string, string];
  carry: string; leftPart: string; rightPart: string; answer: string;
};

function ColumnFormDiagram({ spec, lang }: { spec: ColumnSpec; lang: Lang }) {
  const s = spec;
  return (
    <svg viewBox="0 0 340 210" className="bd-svg bd-svg-wide">
      <text x="10" y="16" className="bd-note">{s.noteL1}</text>
      <text x="10" y="31" className="bd-note">{s.noteL2}</text>
      <text x="196" y="16" className="bd-note">{s.noteR}</text>
      <text x="10" y="50" className="bd-steplabel">{lang === "ja" ? "手順1・十の位" : "Step 1 · tens"}</text>
      <text x="196" y="50" className="bd-steplabel">{lang === "ja" ? "手順2・一の位" : "Step 2 · units"}</text>

      {/* left panel — a wider carry ("+6") needs more clearance from the arrowhead */}
      <text x={s.carry.length > 1 ? 82 : 74} y="72" className="bd-carry" textAnchor="middle">{s.carry}</text>
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
        <marker id="bdTipUp" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
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
    noteL1: "7 × 8 = 56", noteL2: "8 is One More of 7", noteR: "4 × 6 = 24",
    top: ["7", "4"], bot: ["7", "6"], carry: "8",
    leftPart: "56", rightPart: "24", answer: "5624",
  },
  // p.44 — tens sum to 10, units the same: 46 × 66
  specialMult2: {
    noteL1: "(3 × 7) + 4 = 25", noteL2: "tens × tens, add the units", noteR: "4 × 4 = 16",
    top: ["3", "4"], bot: ["7", "4"], carry: "+4",
    leftPart: "25", rightPart: "16", answer: "2516",
  },
  // p.156 — square of a number ending in 5: 35²
  square5: {
    noteL1: "3 × 4 = 12", noteL2: "4 is One More of 3", noteR: "5 × 5 = 25",
    top: ["3", "5"], bot: ["3", "5"], carry: "4",
    leftPart: "12", rightPart: "25", answer: "1225",
  },
  // p.160 — square of a number starting with 5: 54²
  squareStart5: {
    noteL1: "(5 × 5) + 4 = 29", noteL2: "25, then add the units digit", noteR: "4 × 4 = 16",
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
  notes: string[]; answer: string;
};

function BaseMethodDiagram({ spec }: { spec: BaseSpec }) {
  const s = spec;
  return (
    <svg viewBox="0 0 340 236" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">{s.caption}</text>

      {/* left panel — cross the numbers with the opposite deviation */}
      <text x="80" y="56" className="bd-num" textAnchor="end">{s.numA}</text>
      <text x="110" y="56" className="bd-dev">{s.devA}</text>
      <text x="44" y="84" className="bd-op">×</text>
      <text x="80" y="84" className="bd-num" textAnchor="end">{s.numB}</text>
      <text x="110" y="84" className="bd-dev">{s.devB}</text>
      <path d="M86,60 L104,78" className="bd-curve" markerEnd="url(#bmTip)" />
      <path d="M104,60 L86,78" className="bd-curve" markerEnd="url(#bmTip)" />
      <line x1="44" y1="92" x2="132" y2="92" className="bd-rule" />
      <text x="80" y="116" className="bd-part" textAnchor="end">{s.leftPart}</text>
      {s.baseMult && <text x="88" y="116" className="bd-basemult">{s.baseMult}</text>}

      {/* right panel — multiply the two deviations */}
      <text x="255" y="56" className="bd-num" textAnchor="end">{s.numA}</text>
      <text x="285" y="56" className="bd-dev">{s.devA}</text>
      <text x="219" y="84" className="bd-op">×</text>
      <text x="255" y="84" className="bd-num" textAnchor="end">{s.numB}</text>
      <text x="285" y="84" className="bd-dev">{s.devB}</text>
      <path d="M318,52 V88" className="bd-vdev" markerStart="url(#bmTipUp)" markerEnd="url(#bmTipDn)" />
      <text x="326" y="74" className="bd-op">×</text>
      <line x1="219" y1="92" x2="307" y2="92" className="bd-rule" />
      <text x="255" y="116" className="bd-part" textAnchor="end">{s.leftPart}</text>
      <text x="265" y="116" className="bd-part bd-dev-part">{s.rightPart}</text>

      {s.notes.map((n, i) => (
        <text key={i} x="10" y={146 + i * 17} className="bd-note">{n}</text>
      ))}
      <AnswerBox x={196} y={186} w={134} h={40} value={s.answer} />
      <defs>
        <marker id="bmTip" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-curveHead" />
        </marker>
        <marker id="bmTipUp" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-devHead" />
        </marker>
        <marker id="bmTipDn" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
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
    leftPart: "15", baseMult: "× 2", rightPart: "04",
    notes: ["Sub-base = 2 × 10 = 20.", "Cross: 19 − 4 = 15, then 15 × 2 = 30", "Right: -1 × -4 = 4 → 04"],
    answer: "304",
  },
  // p.89 — 23 × 24, sub-base 20
  baseAbove20to90: {
    caption: "sub-base 20 · left = cross-add, then × 2",
    numA: "23", devA: "+ 3", numB: "24", devB: "+ 4",
    leftPart: "27", baseMult: "× 2", rightPart: "12",
    notes: ["Sub-base = 2 × 10 = 20.", "Cross: 23 + 4 = 27, then 27 × 2 = 54", "Right: 3 × 4 = 12 (carry 1)"],
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
    notes: ["Deficiencies: −04 and −02", "Left: 96 − 02 = 94", "Right: 04 × 02 = 08"],
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

      <path
        d={`M${x0 + 8},92 Q${(x0 + barX) / 2 + 14},72 ${barX + 12},84`}
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
  // p.144 — 3794 ÷ 9, where a running sum reaches 9 and carries
  div9carry: {
    caption: ["When a sum reaches 9 or more,", "divide it by 9 and carry its quotient left."],
    dividend: ["3", "7", "9", "4"], quotient: ["4", "2", "1"], remainder: "5", hop: "+",
    notes: ["3 down; 3 + 7 = 10 → carry 1, keep 1", "1 + 9 = 10 → carry again, keep 1"],
    answer: "Q 421 · R 5",
  },
  // p.188 — 123123 ÷ 99, base 100 so the last two digits are the remainder zone
  div99: {
    caption: ["Base 100 · multiplier = 100 − 99 = 1;", "the last two digits are the remainder."],
    dividend: ["1", "2", "3", "1"], quotient: ["1", "2", "4", "3"], remainder: "66", hop: "+1",
    notes: ["Multiplier 01 for 99 · 02 for 98 · 03 for 97", "The last two digits are the remainder zone"],
    answer: "Q 1243 · R 66",
  },
  // p.195 — 3425 ÷ 43: main divisor 4, flag 3
  flagDivision: {
    caption: ["Divisor 72 → main divisor 7, flag 2.", "divide → flag × quotient → subtract."],
    dividend: ["5", "3", "6", "7"], quotient: ["7", "4"], remainder: "39", hop: "−2×",
    notes: ["53 ÷ 7 = 7 remainder 4", "Flag: 2 × 7 = 14; 46 − 14 = 32, then ÷ 7"],
    answer: "Q 74 · R 39",
  },
  // p.196 — 3425 ÷ 73: fix the negative remainder
  flagAboveBase: {
    caption: ["Divisor 73 → main 7, flag 3.", "A negative remainder: add 73, quotient − 1."],
    dividend: ["3", "4", "2", "5"], quotient: ["4", "6"], remainder: "67", hop: "−3×",
    notes: ["34 ÷ 7 = 4 remainder 6", "Flag 3 × 4 = 12; add 73 back if it goes negative"],
    answer: "Q 46 · R 67",
  },
  // p.199 — 3425 ÷ 58: round 5 up to 6, flag becomes a bar digit
  flagBelowBase: {
    caption: ["Divisor 58 → main 6, flag 2\u0304 (a bar).", "If the remainder exceeds 58, divide once more."],
    dividend: ["3", "4", "2", "5"], quotient: ["5", "9"], remainder: "3", hop: "+2×",
    notes: ["From 58: main 6, bar flag 2 — a bar flag adds", "Remainder 61 > 58 → − 58 and quotient + 1"],
    answer: "Q 59 · R 3",
  },
  // p.143 — 23 ÷ 9
  div9: {
    caption: ["Quotient (Q) builds left → right;", "the last sum is the Remainder (R)."],
    dividend: ["2", "3"], quotient: ["2"], remainder: "5", hop: "+",
    notes: ["Bring down 2 → Q.", "2 + 3 = 5 → R"],
    answer: "Q 2 · R 5",
  },
  // p.149 — 31 ÷ 8 (8 is 2 less than base 10, so double each quotient digit)
  div8: {
    caption: ["8 is 2 less than the base (10),", "so double each quotient digit."],
    dividend: ["3", "1"], quotient: ["3"], remainder: "7", hop: "×2",
    notes: ["3 down as the first quotient digit.", "(2 × 3) + 1 = 7 = remainder"],
    answer: "Q 3 · R 7",
  },
};

// Book p.68 — Multiplication by 12 to 19, worked as 243 × 14 (flag = 4).
// The number is sandwiched in zeros and swept right to left.
/* Multiplication by 12-19, drawn the way page 68 draws it: one panel per step,
   each showing the whole column form with the pair being combined arrowed, the
   multiplier underlined, and the answer built up with its carry as a subscript.
   The previous version explained the same arithmetic in four lines of prose,
   which is a different thing from showing the work. */
function FlagPanel({
  digits,
  mult,
  at,
  answer,
  carry,
  uid,
}: {
  digits: number[];
  mult: string;
  /* index of the left digit of the pair being combined */
  at: number;
  answer: string;
  carry: number;
  /* marker ids must be unique per panel — four panels share one document */
  uid: string;
}) {
  /* Tight digit pitch, as the book sets them: 02430, not 0 2 4 3 0. */
  const x0 = 10;
  const pitch = 15;
  const w = x0 + digits.length * pitch + 6;
  const rx = x0 + (at + 1) * pitch;
  const lx = x0 + at * pitch;
  return (
    <svg viewBox={`0 0 ${w} 100`} className="bd-svg bd-flagpanel">
      <defs>
        <marker id={uid} markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#5B7BB4" />
        </marker>
        <marker id={`${uid}t`} markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--sun1)" />
        </marker>
      </defs>

      {/* Every digit the same weight — the book does not dim the others. */}
      {digits.map((d, i) => (
        <text key={i} x={x0 + i * pitch} y="38" className="bd-digit-lg" textAnchor="middle">
          {d}
        </text>
      ))}

      {/* orange + above the pair, with its little arrow */}
      <text x={rx - 4} y="12" className="bd-plus" textAnchor="middle">+</text>
      <path d={`M ${rx + 1} 9 L ${rx + 9} 9`} className="bd-tick" markerEnd={`url(#${uid}t)`} />

      {/* blue arrow up-left from the right digit to the left one, orange x beside it */}
      <path d={`M ${rx - 2} 50 L ${lx + 4} 42`} className="bd-hop" markerEnd={`url(#${uid})`} />
      <text x={rx + 5} y="52" className="bd-dev" textAnchor="middle">×</text>

      {/* x on the far left, the multiplier on the right, rule beneath */}
      <text x={x0 - 4} y="70" className="bd-num" textAnchor="start">×</text>
      <text x={w - 8} y="70" className="bd-num" textAnchor="end">{mult}</text>
      <line x1={x0 - 6} y1="76" x2={w - 6} y2="76" className="bd-rule" />

      {/* the carry rides as a small subscript at the left of the answer */}
      {carry > 0 && (
        <text x={w - 8 - answer.length * 11} y="96" className="bd-flagcarry" textAnchor="end">
          {carry}
        </text>
      )}
      <text x={w - 8} y="95" className="bd-partline" textAnchor="end">{answer}</text>
    </svg>
  );
}

function FlagDigitDiagram() {
  const n = "243";
  const flag = 4;
  const digits = `0${n}0`.split("").map(Number);

  /* Walk right to left exactly as the book does, keeping each panel's state. */
  const panels: { at: number; answer: string; carry: number }[] = [];
  let carry = 0;
  let out = "";
  for (let i = digits.length - 1; i >= 1; i--) {
    const v = digits[i] + flag * digits[i - 1] + carry;
    out = String(v % 10) + out;
    carry = Math.floor(v / 10);
    panels.push({ at: i - 1, answer: out, carry });
  }

  return (
    <div className="bd-flaggrid">
      <div className="bd-flagcap">flag = {flag} · sandwich with 0 · right → left</div>
      <div className="bd-flagrow">
        {panels.map((p, i) => (
          <FlagPanel
            key={i}
            digits={digits}
            mult={`1${flag}`}
            at={p.at}
            answer={p.answer}
            carry={p.carry}
            uid={`bdFlag${i}`}
          />
        ))}
      </div>
      <div className="bd-flaganswer">3402</div>
    </div>
  );
}

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

function BalancingDiagram() {
  const segs = [24, 51, 39];
  const kept: number[] = [];
  const carries: number[] = [];
  let carry = 0;
  for (let i = segs.length - 1; i >= 0; i--) {
    const v = segs[i] + carry;
    kept.unshift(i === 0 ? v : v % 10);
    carry = i === 0 ? 0 : Math.floor(v / 10);
    if (i > 0) carries.unshift(carry);
  }
  const value = segs.reduce((a, v, i) => a + v * Math.pow(10, segs.length - 1 - i), 0);
  const x = [70, 150, 230];

  return (
    <svg viewBox="0 0 320 190" className="bd-svg bd-svg-wide">
      <defs>
        <marker id="balTip" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--sun1)" />
        </marker>
      </defs>

      <text x="10" y="16" className="bd-caption">keep the units, carry the rest to the left</text>

      {segs.map((v, i) => (
        <text key={i} x={x[i]} y="52" className="bd-digit-lg" textAnchor="middle">{v}</text>
      ))}
      {[0, 1].map((i) => (
        <text key={i} x={(x[i] + x[i + 1]) / 2} y="52" className="bd-op" textAnchor="middle">|</text>
      ))}

      {/* each carry hops back into the segment on its left */}
      {carries.map((c, i) =>
        c > 0 ? (
          <g key={i}>
            <path d={`M ${x[i + 1] - 16} 60 Q ${(x[i] + x[i + 1]) / 2} 84 ${x[i] + 14} 62`} className="bd-tick" markerEnd="url(#balTip)" />
            <text x={(x[i] + x[i + 1]) / 2} y="82" className="bd-carry" textAnchor="middle">{c}</text>
          </g>
        ) : null
      )}

      {kept.map((v, i) => (
        <text key={i} x={x[i]} y="122" className="bd-digit-lg" textAnchor="middle">{v}</text>
      ))}
      {[0, 1].map((i) => (
        <text key={i} x={(x[i] + x[i + 1]) / 2} y="122" className="bd-op" textAnchor="middle">|</text>
      ))}

      <AnswerBox x={104} y={142} w={112} h={34} value={String(value)} />
    </svg>
  );
}

function CrosswisePanel({
  a,
  b,
  kind,
  label,
  running,
  note,
  uid,
}: {
  a: number[];
  b: number[];
  kind: "left" | "cross" | "right";
  label: string;
  running: string;
  note?: string;
  uid: string;
}) {
  const xL = 38, xR = 68, w = 104;
  const yTop = 34, yBot = 56;
  return (
    <svg viewBox={`0 0 ${w} 96`} className="bd-svg bd-flagpanel">
      <defs>
        <marker id={uid} markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--sun1)" />
        </marker>
      </defs>

      <text x="8" y="13" className="bd-steplabel" style={{ fontSize: 9 }}>{label}</text>

      <text x={xL} y={yTop} className="bd-digit" textAnchor="middle">{a[0]}</text>
      <text x={xR} y={yTop} className="bd-digit" textAnchor="middle">{a[1]}</text>
      <text x="10" y={yBot} className="bd-num" textAnchor="start">×</text>
      <text x={xL} y={yBot} className="bd-digit" textAnchor="middle">{b[0]}</text>
      <text x={xR} y={yBot} className="bd-digit" textAnchor="middle">{b[1]}</text>

      {/* the pattern the step is named after */}
      {kind === "left" && (
        <path d={`M ${xL} ${yTop + 5} L ${xL} ${yBot - 13}`} className="bd-tick" markerEnd={`url(#${uid})`} />
      )}
      {kind === "right" && (
        <path d={`M ${xR} ${yTop + 5} L ${xR} ${yBot - 13}`} className="bd-tick" markerEnd={`url(#${uid})`} />
      )}
      {kind === "cross" && (
        <>
          <path d={`M ${xL + 5} ${yTop + 5} L ${xR - 5} ${yBot - 13}`} className="bd-tick" markerEnd={`url(#${uid})`} />
          <path d={`M ${xR - 5} ${yTop + 5} L ${xL + 5} ${yBot - 13}`} className="bd-tick" />
        </>
      )}

      <line x1="8" y1="64" x2={w - 6} y2="64" className="bd-rule" />
      <text x={w - 6} y="82" className="bd-partline" textAnchor="end">{running}</text>
      {note && <text x={w - 6} y="93" className="bd-caption" style={{ fontSize: 8 }} textAnchor="end">{note}</text>}
    </svg>
  );
}

function CrosswiseDiagram({ lang }: { lang: Lang }) {
  const a = [2, 1], b = [1, 3];
  const left = a[0] * b[0];
  const cross = a[0] * b[1] + a[1] * b[0];
  const right = a[1] * b[1];
  const total = (a[0] * 10 + a[1]) * (b[0] * 10 + b[1]);

  /* Each panel shows the answer as far as it has been built. */
  const r1 = String(left);
  const r2 = String(left) + String(cross % 10);
  const r3 = String(total);

  return (
    <div className="bd-flaggrid">
      <div className="bd-flagcap">
        {lang === "ja" ? "たて → たすきがけ → たて" : "vertically → crosswise → vertically"}
      </div>
      <div className="bd-flagrow bd-flagrow-3">
        <CrosswisePanel a={a} b={b} kind="left" label={lang === "ja" ? "① たて" : "STEP 1"} running={r1} uid="cwA" />
        <CrosswisePanel a={a} b={b} kind="cross" label={lang === "ja" ? "② たすきがけ" : "STEP 2"} running={r2} note={`(${a[0] * b[1]}+${a[1] * b[0]})`} uid="cwB" />
        <CrosswisePanel a={a} b={b} kind="right" label={lang === "ja" ? "③ たて" : "STEP 3"} running={r3} uid="cwC" />
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
  subVinculum: {
    caption: "subtract straight down; bar a column instead of borrowing",
    top: ["", "", "", ""],
    minuend: ["8", "3", "2", "4"],
    subtrahend: ["2", "3", "4", "8"],
    notes: ["Column differences: 6, 0, 2\u0304, 4\u0304", "Devinculate 6 0 2\u0304 4\u0304 → 5976", "No borrowing anywhere"],
    answer: ["5", "9", "7", "6"],
  },
  subFromPower10: {
    caption: "all from 9, the last from 10",
    top: ["9", "9", "9", "9", "10"],
    minuend: ["1", "0", "0", "0", "0", "0"],
    subtrahend: ["3", "5", "8", "7", "5"],
    notes: ["Five zeros, so five digits to take.", "9−3=6, 9−5=4, 9−8=1, 9−7=2, 10−5=5"],
    answer: ["6", "4", "1", "2", "5"],
  },
  subtractionGeneral: {
    caption: "smaller digit above? take the complement",
    top: ["", "9", "10"],
    minuend: ["6", "2", "4"],
    subtrahend: ["3", "4", "7"],
    notes: ["Left: 6−3=3 → reduce to 2", "Middle: 4−2=2 → (9−2)=7", "Last: 7−4=3 → (10−3)=7"],
    answer: ["2", "7", "7"],
  },
  subOtherThan10s: {
    caption: "drop the leading digit by 1, then Nikhilam",
    top: ["9", "9", "10"],
    minuend: ["4", "0", "0", "0"],
    subtrahend: ["6", "2", "8"],
    notes: ["4 becomes 'one less' → 3", "then 1000 − 628 = 372"],
    answer: ["3", "3", "7", "2"],
  },
};

// Book p.37 — Complete the Ten First, worked as 38 + 17 + 22.
function FriendlyTensDiagram() {
  return (
    <svg viewBox="0 0 330 208" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">make friendly tens — 8&apos;s friend is 2</text>

      <text x="60" y="56" className="bd-num" textAnchor="middle">38</text>
      <text x="100" y="56" className="bd-op">+</text>
      <text x="142" y="56" className="bd-num" textAnchor="middle">17</text>
      <text x="182" y="56" className="bd-op">+</text>
      <text x="224" y="56" className="bd-num" textAnchor="middle">22</text>

      <path d="M66,66 Q142,108 218,66" className="bd-pair" />
      <text x="142" y="102" className="bd-hoplabel" textAnchor="middle">pair these first</text>

      <text x="14" y="136" className="bd-note">38 + 2 + 20 = 60</text>
      <text x="14" y="154" className="bd-note">then add the rest: 60 + 17 = 77</text>

      <AnswerBox x={100} y={166} w={130} h={34} value="77" />
    </svg>
  );
}

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
  // p.181 — 43² by duplexes
  duplexSquare: {
    caption: "D(a) = a² · D(ab) = 2ab · lay them side by side",
    leftLabel: "D(5) then D(56)", leftWork: ["5² = 25", "2 × 5 × 6 = 60"],
    rightLabel: "D(6)", rightWork: ["6² = 36", "balance the parts"],
    join: "25 | 60 | 36", answer: "3136",
  },
  // p.164 — vinculating the units of 47
  vinculum: {
    caption: "a bar digit is negative, so 47 = 50 − 3",
    leftLabel: "the left digit", leftWork: ["4 → 5", "one more"],
    rightLabel: "the units", rightWork: ["7 → 3\u0304", "10 − 7, barred"],
    join: "5 3\u0304", answer: "47",
  },
  // p.170 — devinculating 7 2̄
  devinculum: {
    caption: "all from 9 and the last from 10, then one less on the left",
    leftLabel: "the left digit", leftWork: ["7 → 6", "one less"],
    rightLabel: "the barred digit", rightWork: ["2\u0304 → 8", "10 − 2"],
    join: "6 | 8", answer: "68",
  },
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
  mult1x: {
    caption: "units × units, then the cross-total",
    leftLabel: "step 2 · left", leftWork: ["19 + 6 = 25", "+ carry 5 = 30"],
    rightLabel: "step 1 · units", rightWork: ["9 × 6 = 54", "write 4, carry 5"],
    join: "30 | 4", answer: "304",
  },
};

// Book p.122 — Digit Sum, casting out 9.
function DigitSumDiagram() {
  const digits = [5, 1, 2];
  return (
    <svg viewBox="0 0 330 198" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">add the digits down to one digit</text>

      {digits.map((d, i) => (
        <text key={i} x={70 + i * 46} y="56" className="bd-num" textAnchor="middle">{d}</text>
      ))}
      <text x="93" y="56" className="bd-op">+</text>
      <text x="139" y="56" className="bd-op">+</text>
      <text x="196" y="56" className="bd-op">=</text>
      <text x="232" y="56" className="bd-part bd-part-hi" textAnchor="middle">8</text>

      <text x="14" y="94" className="bd-note">DS of 512 → 5+1+2 → 8</text>
      <text x="14" y="112" className="bd-note">DS of 37 → 3+7=10 → (1+0) → 1</text>
      <text x="14" y="130" className="bd-note">Cast out 9s — treat any 9 as 0.</text>

      <AnswerBox x={100} y={146} w={130} h={38} value="DS = 8" />
    </svg>
  );
}

export const BOOK_DIAGRAMS: Partial<Record<string, (p: { lang: Lang }) => React.ReactElement>> = {
  mult11: Mult11Diagram,
  mult12to19: FlagDigitDiagram,
  mult111: Mult111Diagram,
  balancing: BalancingDiagram,
  generalMult2d: CrosswiseDiagram,
  additionGeneral: FriendlyTensDiagram,
  digitsum: DigitSumDiagram,
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
  ),
};

// The worked example each diagram draws, shown in the card header.
export const BOOK_DIAGRAM_EQ: Partial<Record<string, string>> = {
  baseBelow20to90: "19 × 16",
  baseAbove20to90: "23 × 24",
  div9carry: "3794 ÷ 9",
  div99: "123123 ÷ 99",
  flagDivision: "5367 ÷ 72",
  flagAboveBase: "3425 ÷ 73",
  flagBelowBase: "3425 ÷ 58",
  duplexSquare: "56²",
  vinculum: "47 → 5 3\u0304",
  devinculum: "7 2\u0304 → 68",
  subVinculum: "8324 − 2348",
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
  baseBelow100: "96 × 98",
  baseAbove100: "104 × 107",
  div9: "23 ÷ 9",
  div8: "31 ÷ 8",
  mult12to19: "243 × 14",
  mult111: "4213 × 111",
  balancing: "24 | 51 | 39",
  generalMult2d: "21 × 13",
  additionGeneral: "342 + 256",
  digitsum: "DS of 512",
  subFromPower10: "100000 − 35875",
  subtractionGeneral: "624 − 347",
  subOtherThan10s: "4000 − 628",
  mult9: "32 × 9",
  mult1x: "19 × 16",
};
