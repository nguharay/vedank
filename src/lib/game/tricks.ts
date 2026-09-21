export type TrickStep = {
  say: string;
  sayJa: string;
  // what the performer secretly tracks at this point, given the volunteer's number
  secret?: (n: number) => string;
  secretJa?: (n: number) => string;
};

export type Trick = {
  id: string;
  icon: string;
  grad: [string, string];
  title: string;
  titleJa: string;
  hook: string;
  hookJa: string;
  why: string;
  whyJa: string;
  // a number the performer can rehearse with
  sample: () => number;
  steps: TrickStep[];
  reveal: (n: number) => string;
  revealJa: (n: number) => string;
};

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export const TRICKS: Trick[] = [
  {
    id: "always1089",
    icon: "🔮",
    grad: ["#7C3AED", "#C026D3"],
    title: "The 1089 Prophecy",
    titleJa: "1089の予言",
    hook: "Write 1089 on paper, fold it, and hand it over before you begin. They will land on it every time.",
    hookJa: "先に紙に1089と書いて、たたんで渡しておこう。だれがやっても必ず1089になります。",
    why: "Reversing and subtracting a 3-digit number always gives a multiple of 99, and adding that to its own reverse always lands on 1089.",
    whyJa: "3桁の数を逆さにして引くと必ず99の倍数になり、それをまた逆さにして足すと必ず1089になります。",
    sample: () => {
      const a = ri(3, 9);
      const c = ri(0, a - 2);
      return a * 100 + ri(0, 9) * 10 + c;
    },
    steps: [
      {
        say: "Think of any 3-digit number where the first and last digit differ by at least 2. Don't tell me!",
        sayJa: "最初と最後の数字が2以上ちがう、3桁の数を思いうかべて。言わないでね！",
      },
      {
        say: "Now reverse it, and subtract the smaller from the bigger.",
        sayJa: "その数を逆さにして、大きいほうから小さいほうを引いて。",
        // the reverse of e.g. 370 is written 073, so pad it for display
        secret: (n) => {
          const rev = String(n).split("").reverse().join("");
          const d = Math.abs(n - Number(rev));
          return `${n} → ${rev}, difference = ${String(d).padStart(3, "0")}`;
        },
        secretJa: (n) => {
          const rev = String(n).split("").reverse().join("");
          const d = Math.abs(n - Number(rev));
          return `${n} → ${rev}、差 = ${String(d).padStart(3, "0")}`;
        },
      },
      {
        say: "Reverse that answer too, and add the two together.",
        sayJa: "その答えも逆さにして、2つを足して。",
        secret: (n) => {
          const rev = Number(String(n).split("").reverse().join(""));
          const d = String(Math.abs(n - rev)).padStart(3, "0");
          const dr = d.split("").reverse().join("");
          return `${d} + ${dr} = 1089 — always`;
        },
        secretJa: (n) => {
          const rev = Number(String(n).split("").reverse().join(""));
          const d = String(Math.abs(n - rev)).padStart(3, "0");
          const dr = d.split("").reverse().join("");
          return `${d} + ${dr} = 1089 ――いつでも`;
        },
      },
      {
        say: "Now open the paper I gave you.",
        sayJa: "さあ、さっきの紙を開いてみて。",
      },
    ],
    reveal: () => "1089",
    revealJa: () => "1089",
  },
  {
    id: "guessAge",
    icon: "🎂",
    grad: ["#EA580C", "#F59E0B"],
    title: "I Know Your Number",
    titleJa: "きみの数、当てます",
    hook: "They do four steps in secret. You never see a single digit — and you still name their number.",
    hookJa: "相手はこっそり4つの計算をするだけ。数字は一度も見ていないのに、ぴたりと当てられます。",
    why: "Every step is undone by the last one. (n × 2 + 10) ÷ 2 − 5 is just n again, no matter what they started with.",
    whyJa: "すべての手順が最後に打ち消し合います。(n × 2 + 10) ÷ 2 − 5 は、どんな数でも元のnに戻ります。",
    sample: () => ri(2, 40),
    steps: [
      { say: "Think of any number. Keep it secret.", sayJa: "すきな数を思いうかべて。ひみつだよ。", secret: (n) => `they chose ${n}`, secretJa: (n) => `相手は ${n}` },
      { say: "Double it.", sayJa: "2倍にして。", secret: (n) => `${n} × 2 = ${n * 2}`, secretJa: (n) => `${n} × 2 = ${n * 2}` },
      { say: "Add 10.", sayJa: "10を足して。", secret: (n) => `${n * 2} + 10 = ${n * 2 + 10}`, secretJa: (n) => `${n * 2} + 10 = ${n * 2 + 10}` },
      { say: "Halve it.", sayJa: "半分にして。", secret: (n) => `${n * 2 + 10} ÷ 2 = ${n + 5}`, secretJa: (n) => `${n * 2 + 10} ÷ 2 = ${n + 5}` },
      {
        say: "Now take away the number you started with. Tell me what's left.",
        sayJa: "最初の数を引いて。残った数を教えて。",
        secret: () => "they will say 5 — every single time",
        secretJa: () => "相手は必ず5と言います",
      },
      {
        say: "It's 5, isn't it? I could hear you thinking.",
        sayJa: "5でしょ？　考えてるのが聞こえたよ。",
      },
    ],
    reveal: () => "5",
    revealJa: () => "5",
  },
  {
    id: "lightningSquare",
    icon: "⚡",
    grad: ["#0891B2", "#22D3EE"],
    title: "Lightning Squares",
    titleJa: "いなずま2乗",
    hook: "Ask for any number ending in 5. Say the square before they've finished writing it down.",
    hookJa: "5で終わる数を言ってもらおう。相手が書き終わる前に2乗を言えます。",
    why: "This is the book's own rule: n5² = n × (n+1), then 25 on the end. You already know it — now perform it.",
    whyJa: "これは本のルールそのもの。n5² = n×(n+1) のあとに25。もう知っているはず――披露しよう。",
    sample: () => ri(1, 9) * 10 + 5,
    steps: [
      { say: "Give me any number that ends in 5. Big ones are fine.", sayJa: "5で終わる数を何でも言って。大きくてもOK。" },
      {
        say: "(Don't say this part out loud.)",
        sayJa: "（ここは声に出さないで）",
        secret: (n) => {
          const f = Math.floor(n / 10);
          return `front is ${f} → ${f} × ${f + 1} = ${f * (f + 1)}`;
        },
        secretJa: (n) => {
          const f = Math.floor(n / 10);
          return `前は ${f} → ${f} × ${f + 1} = ${f * (f + 1)}`;
        },
      },
      {
        say: "Stick 25 on the end, and say it like it was obvious.",
        sayJa: "うしろに25をつけて、当たり前のように言おう。",
        secret: (n) => `${Math.floor(n / 10) * (Math.floor(n / 10) + 1)} then 25 → ${n * n}`,
        secretJa: (n) => `${Math.floor(n / 10) * (Math.floor(n / 10) + 1)} のあと25 → ${n * n}`,
      },
    ],
    reveal: (n) => String(n * n),
    revealJa: (n) => String(n * n),
  },
  {
    id: "missingDigit",
    icon: "🕵️",
    grad: ["#15803D", "#4ADE80"],
    title: "The Missing Digit",
    titleJa: "消えた数字",
    hook: "They scramble a number, subtract, then hide one digit from the answer. You name the hidden digit.",
    hookJa: "数をバラバラに並べかえて引き算し、答えの数字を1つかくす。かくした数字を当てます。",
    why: "A number minus its own scramble is always a multiple of 9, so its digits add to 9. Whatever is missing is what makes the rest reach 9.",
    whyJa: "元の数から並べかえた数を引くと必ず9の倍数。だから各桁の合計も9になります。足りない分がかくれた数字です。",
    sample: () => ri(1000, 9999),
    steps: [
      { say: "Write down any number with 4 or more digits.", sayJa: "4桁以上の数を書いて。" },
      { say: "Jumble its digits into a new number, and subtract the smaller from the bigger.", sayJa: "その数字を並べかえて別の数を作り、大きいほうから小さいほうを引いて。" },
      {
        say: "Circle any ONE digit of the answer that isn't zero, and read me the rest.",
        sayJa: "答えの中から0ではない数字を1つえらんでかくし、残りを読みあげて。",
        secret: () => "add what they read, cast out 9s",
        secretJa: () => "読まれた数を足して、9を取り除く",
      },
      {
        say: "(Secretly) add their digits down to one digit. The hidden one is 9 minus that.",
        sayJa: "（こっそり）読まれた数字を1桁になるまで足す。かくれた数字は 9 からその数を引いた数。",
        secret: () => "if the rest already adds to 9, the hidden digit is 9",
        secretJa: () => "残りがちょうど9なら、かくれた数字は9",
      },
    ],
    reveal: () => "9 − (their digit sum)",
    revealJa: () => "9 −（読まれた数の合計）",
  },
];

export const TRICK_BY_ID: Record<string, Trick> = Object.fromEntries(TRICKS.map((t) => [t.id, t]));
