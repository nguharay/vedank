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
    noteL1: "(4 × 6) + 6 = 30", noteL2: "tens × tens, add the units", noteR: "6 × 6 = 36",
    top: ["4", "6"], bot: ["6", "6"], carry: "+6",
    leftPart: "30", rightPart: "36", answer: "3036",
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
    numA: "83", devA: "- 17", numB: "97", devB: "- 03",
    leftPart: "80", rightPart: "51",
    notes: ["Deficiencies: −17 and −03", "Left: 83 − 03 = 80", "Right: 17 × 03 = 51"],
    answer: "8051",
  },
  baseAbove100: {
    caption: "left = cross-add · right = product of surpluses in 2-digit",
    numA: "112", devA: "+ 12", numB: "115", devB: "+ 15",
    leftPart: "127", rightPart: "180",
    notes: ["Surpluses: +12 and +15", "Left: 112 + 15 = 127", "Right: 12 × 15 = 180 (carry 1)"],
    answer: "12880",
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
function FlagDigitDiagram() {
  const n = "243", flag = 4;
  const s = `0${n}0`.split("").map(Number);
  const stages: { expr: string; write: number; carry: number }[] = [];
  let carry = 0;
  const out: number[] = [];
  for (let i = s.length - 1; i >= 1; i--) {
    const v = s[i] + flag * s[i - 1] + carry;
    out.unshift(v % 10);
    stages.push({ expr: `${s[i]} + ${flag}×${s[i - 1]}${carry ? ` + ${carry}` : ""} = ${v}`, write: v % 10, carry: Math.floor(v / 10) });
    carry = Math.floor(v / 10);
  }
  return (
    <svg viewBox="0 0 330 234" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">flag = {flag} · sweep right → left</text>

      {s.map((d, i) => (
        <text
          key={i}
          x={92 + i * 30}
          y="48"
          className={`bd-num${i === 0 || i === s.length - 1 ? " bd-sandwich" : ""}`}
          textAnchor="middle"
        >
          {d}
        </text>
      ))}
      <text x="250" y="48" className="bd-op">× 14</text>
      <path d="M232,60 H92" className="bd-sweep" markerEnd="url(#bdSweep)" />

      {stages.map((st, i) => (
        <g key={i}>
          <text x="14" y={84 + i * 22} className="bd-note">{st.expr}</text>
          <text x="196" y={84 + i * 22} className="bd-stagewrite">
            write {st.write}{st.carry ? ` · carry ${st.carry}` : ""}
          </text>
        </g>
      ))}

      <AnswerBox x={100} y={182} w={130} h={40} value={out.join("")} />
      <defs>
        <marker id="bdSweep" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" className="bd-sweepHead" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.59 — Multiplication by 111, the "Double-Naught Sandwich", worked as 4213 × 111.
function Mult111Diagram() {
  const digits = "004213 00".replace(" ", "").split("");
  const nums = digits.map(Number);
  const sums: number[] = [];
  for (let i = 0; i + 2 < nums.length; i++) sums.push(nums[i] + nums[i + 1] + nums[i + 2]);
  return (
    <svg viewBox="0 0 330 226" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">two zeros each side · slide a 3-digit window</text>

      {digits.map((d, i) => (
        <text
          key={i}
          x={40 + i * 32}
          y="50"
          className={`bd-num${i < 2 || i > digits.length - 3 ? " bd-sandwich" : ""}`}
          textAnchor="middle"
        >
          {d}
        </text>
      ))}
      <rect x="24" y="30" width="96" height="28" rx="7" className="bd-window" />

      {sums.map((v, i) => (
        <g key={i}>
          <text x={40 + (i + 1) * 32} y="92" className="bd-part bd-part-hi" textAnchor="middle">{v}</text>
          <path d={`M${40 + (i + 1) * 32},62 V78`} className="bd-hop" markerEnd="url(#bdWinTip)" />
        </g>
      ))}
      <text x="14" y="128" className="bd-note">Each window of three digits adds to one answer digit.</text>
      <text x="14" y="146" className="bd-note">Sums: {sums.join(" | ")}</text>

      <AnswerBox x={100} y={168} w={140} h={40} value={String(4213 * 111)} />
      <defs>
        <marker id="bdWinTip" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-hopHead" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.47 — the Balancing Method, worked as 24 | 51 | 39 → 2949.
function BalancingDiagram() {
  const segs = [24, 51, 39];
  const out = [29, 4, 9];
  return (
    <svg viewBox="0 0 330 216" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">carry right → left, keep one digit per segment</text>

      {segs.map((v, i) => (
        <g key={i}>
          <text x={80 + i * 80} y="58" className="bd-num" textAnchor="middle">{v}</text>
          <line x1={44 + i * 80} y1="34" x2={44 + i * 80} y2="68" className="bd-seg" />
        </g>
      ))}
      <line x1={44 + segs.length * 80} y1="34" x2={44 + segs.length * 80} y2="68" className="bd-seg" />

      <path d="M216,76 Q188,100 150,84" className="bd-hop" markerEnd="url(#bdBalTip)" />
      <text x="188" y="108" className="bd-hoplabel" textAnchor="middle">+3</text>
      <path d="M136,76 Q108,100 70,84" className="bd-hop" markerEnd="url(#bdBalTip)" />
      <text x="108" y="108" className="bd-hoplabel" textAnchor="middle">+5</text>

      {out.map((v, i) => (
        <text key={i} x={80 + i * 80} y="140" className="bd-part bd-part-hi" textAnchor="middle">{v}</text>
      ))}

      <text x="14" y="166" className="bd-note">39 → keep 9, carry 3. 51+3=54 → keep 4, carry 5. 24+5=29.</text>

      <AnswerBox x={100} y={176} w={130} h={34} value={String(out.join(""))} />
      <defs>
        <marker id="bdBalTip" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className="bd-hopHead" />
        </marker>
      </defs>
    </svg>
  );
}

// Book p.117 — Vertically and Crosswise, the "I X I" pattern, worked as 21 × 13.
function CrosswiseDiagram({ lang }: { lang: Lang }) {
  const a = [2, 1], b = [1, 3];
  const left = a[0] * b[0], cross = a[0] * b[1] + a[1] * b[0], right = a[1] * b[1];
  return (
    <svg viewBox="0 0 330 224" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">the I X I pattern</text>

      <text x="132" y="52" className="bd-num" textAnchor="middle">{a[0]}</text>
      <text x="196" y="52" className="bd-num" textAnchor="middle">{a[1]}</text>
      <text x="96" y="86" className="bd-op">×</text>
      <text x="132" y="86" className="bd-num" textAnchor="middle">{b[0]}</text>
      <text x="196" y="86" className="bd-num" textAnchor="middle">{b[1]}</text>

      <path d="M132,60 V78" className="bd-vert" />
      <path d="M196,60 V78" className="bd-vert" />
      <path d="M140,60 L188,78" className="bd-cross" />
      <path d="M188,60 L140,78" className="bd-cross" />

      <line x1="92" y1="98" x2="228" y2="98" className="bd-rule" />
      <text x="132" y="126" className="bd-part" textAnchor="middle">{left}</text>
      <text x="164" y="126" className="bd-part bd-part-hi" textAnchor="middle">{cross}</text>
      <text x="196" y="126" className="bd-part" textAnchor="middle">{right}</text>

      <text x="14" y="154" className="bd-note">
        {lang === "ja" ? "1・縦" : "1 · vertically"}: {a[0]}×{b[0]} = {left}
      </text>
      <text x="14" y="172" className="bd-note">
        {lang === "ja" ? "2・たすきがけ" : "2 · crosswise"}: ({a[0]}×{b[1]}) + ({a[1]}×{b[0]}) = {cross}
      </text>
      <text x="14" y="190" className="bd-note">
        {lang === "ja" ? "3・縦" : "3 · vertically"}: {a[1]}×{b[1]} = {right}
      </text>

      <AnswerBox x={196} y={196} w={124} h={26} value={String(21 * 13)} />
    </svg>
  );
}

// Books pp.109/136/114 — "all from 9, the last from 10" written above the minuend.
type NikhilamSpec = { caption: string; top: string[]; minuend: string; subtrahend: string; notes: string[]; answer: string };

function AllFrom9Diagram({ spec }: { spec: NikhilamSpec }) {
  const s = spec;
  return (
    <svg viewBox="0 0 330 214" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">{s.caption}</text>

      {s.top.map((v, i) => (
        <text key={i} x={70 + i * 34} y="44" className="bd-nine" textAnchor="middle">{v}</text>
      ))}
      <text x="70" y="74" className="bd-num" textAnchor="start">{s.minuend}</text>
      <text x="40" y="104" className="bd-op">−</text>
      <text x="70" y="104" className="bd-num" textAnchor="start">{s.subtrahend}</text>
      <line x1="36" y1="114" x2="250" y2="114" className="bd-rule" />
      <text x="70" y="142" className="bd-part bd-part-hi" textAnchor="start">{s.answer}</text>

      {s.notes.map((n, i) => (
        <text key={`n${i}`} x="14" y={168 + i * 17} className="bd-note">{n}</text>
      ))}
    </svg>
  );
}

const NIKHILAM_SPECS: Record<string, NikhilamSpec> = {
  subFromPower10: {
    caption: "all from 9, the last from 10",
    top: ["9", "9", "9", "10"], minuend: "1 0 0 0 0", subtrahend: "0 0 7 8",
    notes: ["Pad 78 to 0078 to match the four zeros.", "9−0=9, 9−0=9, 9−7=2, 10−8=2"],
    answer: "9 9 2 2",
  },
  subtractionGeneral: {
    caption: "smaller digit above? take the complement",
    top: ["", "9", "10"], minuend: "6 2 4", subtrahend: "3 4 7",
    notes: ["Left: 6−3=3 → reduce to 2", "Middle: 4−2=2 → (9−2)=7", "Last: 7−4=3 → (10−3)=7"],
    answer: "2 7 7",
  },
  subOtherThan10s: {
    caption: "drop the leading digit by 1, then Nikhilam",
    top: ["", "9", "9", "10"], minuend: "4 0 0 0", subtrahend: "  6 2 8",
    notes: ["4 becomes 'one less' → 3", "then 1000 − 628 = 372"],
    answer: "3 3 7 2",
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
type PartsSpec = { caption: string; leftLabel: string; leftWork: string; rightLabel: string; rightWork: string; join: string; answer: string };

function TwoPartsDiagram({ spec }: { spec: PartsSpec }) {
  const s = spec;
  return (
    <svg viewBox="0 0 330 200" className="bd-svg bd-svg-wide">
      <text x="10" y="15" className="bd-caption">{s.caption}</text>

      <rect x="12" y="30" width="150" height="62" rx="12" className="bd-partbox" />
      <text x="87" y="50" className="bd-steplabel" textAnchor="middle">{s.leftLabel}</text>
      <text x="87" y="76" className="bd-part" textAnchor="middle">{s.leftWork}</text>

      <rect x="172" y="30" width="146" height="62" rx="12" className="bd-partbox bd-partbox-hi" />
      <text x="245" y="50" className="bd-steplabel" textAnchor="middle">{s.rightLabel}</text>
      <text x="245" y="76" className="bd-part bd-part-hi" textAnchor="middle">{s.rightWork}</text>

      <text x="165" y="124" className="bd-part" textAnchor="middle">{s.join}</text>
      <AnswerBox x={100} y={142} w={130} h={40} value={s.answer} />
    </svg>
  );
}

const PARTS_SPECS: Record<string, PartsSpec> = {
  mult9: {
    caption: "answer in two parts — no multiplication!",
    leftLabel: "left part", leftWork: "(32−1) − 3 = 28",
    rightLabel: "right part", rightWork: "10 − 2 = 8",
    join: "28 | 8", answer: "288",
  },
  mult1x: {
    caption: "units × units, then the cross-total",
    leftLabel: "step 2 · left", leftWork: "19 + 6 = 25, +5 = 30",
    rightLabel: "step 1 · units", rightWork: "9 × 6 = 54",
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
  mult11: "34 × 11",
  specialMult1: "74 × 76",
  specialMult2: "46 × 66",
  square5: "35²",
  squareStart5: "54²",
  baseBelow10: "7 × 8",
  baseAbove10: "14 × 18",
  baseBelow100: "83 × 97",
  baseAbove100: "112 × 115",
  div9: "23 ÷ 9",
  div8: "31 ÷ 8",
  mult12to19: "243 × 14",
  mult111: "4213 × 111",
  balancing: "24 | 51 | 39",
  generalMult2d: "21 × 13",
  additionGeneral: "38 + 17 + 22",
  digitsum: "DS of 512",
  subFromPower10: "10000 − 78",
  subtractionGeneral: "624 − 347",
  subOtherThan10s: "4000 − 628",
  mult9: "32 × 9",
  mult1x: "19 × 16",
};
