/* ---------- progression: game unlocks, the card collection, the daily gift ----------
   Everything here lives in the browser (localStorage), like Math Town and the
   dragon — no server round trip, works for guests too.

   - Games open in tiers. Five starters are open; the rest unlock as the
     player finishes games (any games). A game already played before this
     existed stays open.
   - Cards: famous mathematicians, each with their quote or a fun fact. One
     comes with the daily gift (open the app each day), and one the first
     time each game is finished — so trying every game pays off.
   - When something unlocks, or a card is won, a window event tells the UI
     (vedank:unlock, vedank:card), so any screen can trigger it. */

export type Rarity = "common" | "rare" | "legendary";
export type Card = {
  id: string;
  name: string; nameJa: string;
  years: string;
  glyph: string;           /* the symbol on the card — no portraits of real people */
  color: string;
  rarity: Rarity;
  line: string; lineJa: string;   /* their quote, or a fact about them */
  quote: boolean;
};

export const CARDS: Card[] = [
  /* ---- legendary ---- */
  { id: "tirtha", name: "Bharati Krishna Tirtha", nameJa: "バーラティー・クリシュナ・ティールタ", years: "1884–1960", glyph: "🕉", color: "#E07B39", rarity: "legendary", quote: false,
    line: "Wrote the book “Vedic Mathematics” — the 16 sutras this app is built on.", lineJa: "インド式数学の本『Vedic Mathematics』を書いた人。このアプリの16のスートラはここから。" },
  { id: "ramanujan", name: "Srinivasa Ramanujan", nameJa: "シュリニヴァーサ・ラマヌジャン", years: "1887–1920", glyph: "∞", color: "#B84A6E", rarity: "legendary", quote: true,
    line: "An equation for me has no meaning, unless it expresses a thought of God.", lineJa: "数式は、神の思いを表していなければ意味がない。" },
  { id: "aryabhata", name: "Aryabhata", nameJa: "アーリヤバタ", years: "476–550", glyph: "π", color: "#7A58C0", rarity: "legendary", quote: false,
    line: "Worked out π as about 3.1416 — over 1,500 years ago.", lineJa: "1500年以上前に、円周率を約3.1416と計算した。" },
  /* ---- rare ---- */
  { id: "shakuntala", name: "Shakuntala Devi", nameJa: "シャクンタラ・デヴィ", years: "1929–2013", glyph: "⚡", color: "#D4A233", rarity: "rare", quote: true,
    line: "Without mathematics, there's nothing you can do. Everything around you is mathematics.", lineJa: "数学がなければ何もできない。まわりのものはすべて数学。" },
  { id: "brahmagupta", name: "Brahmagupta", nameJa: "ブラーマグプタ", years: "598–668", glyph: "0", color: "#2E8B57", rarity: "rare", quote: false,
    line: "Wrote down the rules for calculating with zero.", lineJa: "「0」を使った計算のルールを書きのこした。" },
  { id: "bhaskara", name: "Bhaskara II", nameJa: "バースカラ2世", years: "1114–1185", glyph: "📜", color: "#C0392B", rarity: "rare", quote: false,
    line: "Wrote “Lilavati”, a famous book of maths puzzles in verse.", lineJa: "詩でかかれた算数パズルの本『リーラーヴァティー』を書いた。" },
  { id: "seki", name: "Seki Takakazu", nameJa: "関孝和", years: "c.1642–1708", glyph: "算", color: "#3E7CC9", rarity: "rare", quote: false,
    line: "Japan’s great wasan master — found determinants before European mathematicians.", lineJa: "和算の大家。ヨーロッパより早く「行列式」を見つけた。" },
  { id: "ito", name: "Kiyoshi Itô", nameJa: "伊藤清", years: "1915–2008", glyph: "∫", color: "#4B5563", rarity: "rare", quote: false,
    line: "His “Itô formula” is used all over science and finance. First winner of the Gauss Prize (2006).", lineJa: "「伊藤の公式」は世界中で使われている。初代ガウス賞（2006年）。" },
  { id: "gauss", name: "Carl Friedrich Gauss", nameJa: "カール・フリードリヒ・ガウス", years: "1777–1855", glyph: "Σ", color: "#2F8FD8", rarity: "rare", quote: true,
    line: "Mathematics is the queen of science, and arithmetic is the queen of mathematics.", lineJa: "数学は科学の女王、算数は数学の女王である。" },
  { id: "euler", name: "Leonhard Euler", nameJa: "レオンハルト・オイラー", years: "1707–1783", glyph: "e", color: "#E0603A", rarity: "rare", quote: false,
    line: "Kept doing brilliant maths even after he lost his sight.", lineJa: "目が見えなくなっても、すごい数学を書きつづけた。" },
  { id: "einstein", name: "Albert Einstein", nameJa: "アルベルト・アインシュタイン", years: "1879–1955", glyph: "E=mc²", color: "#7A58C0", rarity: "rare", quote: true,
    line: "Do not worry about your difficulties in Mathematics. I can assure you mine are still greater.", lineJa: "数学でこまっても心配しないで。わたしのほうがもっとこまっているから。" },
  { id: "noether", name: "Emmy Noether", nameJa: "エミー・ネーター", years: "1882–1935", glyph: "⟳", color: "#B05CD8", rarity: "rare", quote: false,
    line: "Her theorem links symmetry and the laws of physics. Einstein called her a genius.", lineJa: "対称性と物理の法則をむすぶ定理をつくった。アインシュタインも天才とよんだ。" },
  { id: "lovelace", name: "Ada Lovelace", nameJa: "エイダ・ラブレス", years: "1815–1852", glyph: "⌨", color: "#1F6FB2", rarity: "rare", quote: false,
    line: "Wrote what is often called the first computer program.", lineJa: "世界初のコンピュータープログラムを書いたと言われる。" },
  { id: "turing", name: "Alan Turing", nameJa: "アラン・チューリング", years: "1912–1954", glyph: "⚙", color: "#4B5563", rarity: "rare", quote: false,
    line: "A founder of computer science, and helped break wartime secret codes.", lineJa: "コンピューター科学の生みの親の一人。暗号の解読にも活やくした。" },
  { id: "mirzakhani", name: "Maryam Mirzakhani", nameJa: "マリアム・ミルザハニ", years: "1977–2017", glyph: "◎", color: "#2E8B57", rarity: "rare", quote: false,
    line: "The first woman to win the Fields Medal, maths’ top prize (2014).", lineJa: "数学のノーベル賞「フィールズ賞」を女性で初めて受賞（2014年）。" },
  /* ---- common ---- */
  { id: "pythagoras", name: "Pythagoras", nameJa: "ピタゴラス", years: "c.570–490 BC", glyph: "△", color: "#D9A400", rarity: "common", quote: true,
    line: "Number rules the universe.", lineJa: "数が宇宙を支配している。" },
  { id: "aristotle", name: "Aristotle", nameJa: "アリストテレス", years: "384–322 BC", glyph: "♪", color: "#3DAA5C", rarity: "common", quote: true,
    line: "The whole heaven is number and harmony.", lineJa: "天のすべては、数と調和でできている。" },
  { id: "euclid", name: "Euclid", nameJa: "ユークリッド", years: "c.300 BC", glyph: "⟂", color: "#3E7CC9", rarity: "common", quote: false,
    line: "His book “Elements” was used to teach geometry for over 2,000 years.", lineJa: "『原論』は2000年以上、図形の教科書として使われた。" },
  { id: "archimedes", name: "Archimedes", nameJa: "アルキメデス", years: "c.287–212 BC", glyph: "◯", color: "#E07B39", rarity: "common", quote: false,
    line: "Said to have shouted “Eureka!” in the bath when an idea struck.", lineJa: "ひらめいた時、お風呂で「エウレカ！」とさけんだと言われる。" },
  { id: "hypatia", name: "Hypatia", nameJa: "ヒュパティア", years: "c.360–415", glyph: "✦", color: "#B84A6E", rarity: "common", quote: false,
    line: "A teacher of maths and astronomy in ancient Alexandria.", lineJa: "古代アレクサンドリアで数学と天文学を教えた。" },
  { id: "fibonacci", name: "Fibonacci", nameJa: "フィボナッチ", years: "c.1170–1250", glyph: "🐚", color: "#D4A233", rarity: "common", quote: false,
    line: "Helped bring Indian–Arabic numerals (0–9) to Europe.", lineJa: "インドの数字（0〜9）をヨーロッパに広めた。" },
  { id: "galileo", name: "Galileo Galilei", nameJa: "ガリレオ・ガリレイ", years: "1564–1642", glyph: "🔭", color: "#1F6FB2", rarity: "common", quote: true,
    line: "Nature is written in mathematical language.", lineJa: "自然は数学のことばで書かれている。" },
  { id: "newton", name: "Isaac Newton", nameJa: "アイザック・ニュートン", years: "1643–1727", glyph: "🍎", color: "#C0392B", rarity: "common", quote: false,
    line: "One of the inventors of calculus.", lineJa: "微分積分をつくった一人。" },
  { id: "russell", name: "Bertrand Russell", nameJa: "バートランド・ラッセル", years: "1872–1970", glyph: "✧", color: "#7A58C0", rarity: "common", quote: true,
    line: "Mathematics, rightly viewed, possesses not only truth but supreme beauty.", lineJa: "数学には、真理だけでなく最高の美しさがある。" },
  { id: "sylvester", name: "James Joseph Sylvester", nameJa: "ジェームス・ジョセフ・シルベスター", years: "1814–1897", glyph: "♫", color: "#2F8FD8", rarity: "common", quote: true,
    line: "Mathematics is the music of reason.", lineJa: "数学は、理性の音楽である。" },
  { id: "banach", name: "Stefan Banach", nameJa: "ステファン・バナッハ", years: "1892–1945", glyph: "☕", color: "#4B5563", rarity: "common", quote: true,
    line: "Mathematics is the most beautiful and most powerful creation of the human spirit.", lineJa: "数学は、人間の心がつくった最も美しく強いもの。" },
  { id: "johnson", name: "Katherine Johnson", nameJa: "キャサリン・ジョンソン", years: "1918–2020", glyph: "🚀", color: "#E0603A", rarity: "common", quote: false,
    line: "Calculated the flight paths that took NASA astronauts to space and back.", lineJa: "NASAの宇宙飛行の道すじを計算した。" },
  { id: "liuhui", name: "Liu Hui", nameJa: "劉徽", years: "3rd century", glyph: "⬡", color: "#3DAA5C", rarity: "common", quote: false,
    line: "Calculated π very precisely using a polygon with thousands of sides.", lineJa: "何千もの辺をもつ多角形で、円周率をくわしく計算した。" },
];

/* ---------- storage ---------- */
const PLAYS_KEY = "sutraSprint.plays";       /* { [game]: { o: opened, f: finished } } */
const CARDS_KEY = "sutraSprint.cards";       /* { [cardId]: dayObtained } */
const GIFT_KEY = "sutraSprint.dailyGift";    /* { day, streak } */

type Plays = Record<string, { o: number; f: number }>;
function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}
export function jstDay(d = new Date()): string {
  return new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}
function emit(name: string, detail: unknown) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(name, { detail }));
}

/* ---------- game unlocks ---------- */
/* games finished (any) needed to open each game */
export const UNLOCK_AT: Record<string, number> = {
  ninja: 0, runner: 0, pop: 0, tf: 0, match: 0, ttt: 0, town: 0,
  sushi: 2, bigger: 2, missing: 2,
  castle: 4, memory: 4, lastdigit: 4,
  konbini: 6, odd: 6, digitsum: 6,
  rhythm: 9, sortg: 9, div9: 9,
  crossword: 12, sq5: 12, x11: 12,
  race: 15, sprint: 15, estimate: 15,
};
export const GAME_NAMES: Record<string, [string, string]> = {
  ninja: ["Ninja Slice", "忍者スライス"], runner: ["Math Runner", "計算ランナー"], pop: ["Number Pop", "かずの風船ポップ"],
  tf: ["True or False", "○×スピード"], match: ["Number Match", "ナンバーマッチ"], sushi: ["Sushi Shop", "おすし屋さん"],
  bigger: ["Which is Bigger?", "どっちが大きい？"], missing: ["Missing Number", "穴うめ"], castle: ["Castle Defense", "お城をまもれ"],
  memory: ["Memory Pairs", "神経衰弱"], lastdigit: ["Last Digit", "一の位あて"], konbini: ["Konbini Cashier", "コンビニのレジ"],
  odd: ["Odd One Out", "仲間はずれ"], digitsum: ["Digit Sum", "数字の和"], rhythm: ["Rhythm Tap", "リズムタップ"],
  sortg: ["Smallest First", "小さい順"], div9: ["Divisible by 9?", "9でわれる？"], crossword: ["Number Crossword", "数字クロスワード"],
  sq5: ["Squares ending in 5", "5で終わる数の2乗"], x11: ["× 11", "×11"], race: ["Math Race", "計算レース"],
  sprint: ["Matchstick Sprint", "マッチ棒スプリント"], estimate: ["Estimate", "見積もり"], ttt: ["Tic-Tac-Toe", "三目ならべ"], town: ["Math Town", "マスタウン"],
};

/* ?unlockall in the address (or the saved flag) opens everything — for teachers and testing */
function unlockAll(): boolean {
  try {
    if (new URLSearchParams(location.search).has("unlockall")) localStorage.setItem("sutraSprint.unlockAll", "1");
    return localStorage.getItem("sutraSprint.unlockAll") === "1";
  } catch { return false; }
}

export function finishedTotal(p: Plays = load<Plays>(PLAYS_KEY, {})): number {
  return Object.values(p).reduce((t, x) => t + (x.f || 0), 0);
}
export function isUnlocked(id: string): boolean {
  const need = UNLOCK_AT[id];
  if (need === undefined || need === 0) return true;
  const p = load<Plays>(PLAYS_KEY, {});
  if (p[id]?.o || p[id]?.f) return true;        /* played before — never take it away */
  return unlockAll() || finishedTotal(p) >= need;
}
/* how many more finished games until this one opens */
export function gamesToUnlock(id: string): number {
  return Math.max(0, (UNLOCK_AT[id] ?? 0) - finishedTotal());
}
/* a game the player can play but hasn't yet */
export function untriedGames(): string[] {
  const p = load<Plays>(PLAYS_KEY, {});
  return Object.keys(UNLOCK_AT).filter((g) => g !== "town" && isUnlocked(g) && !p[g]?.o && !p[g]?.f);
}
export function playsOf(id: string): { o: number; f: number } {
  return load<Plays>(PLAYS_KEY, {})[id] ?? { o: 0, f: 0 };
}
/* players from before unlocks existed keep the games they already had */
export function seedPlayed(ids: string[]) {
  const p = load<Plays>(PLAYS_KEY, {});
  let changed = false;
  ids.forEach((id) => { if (!p[id]) { p[id] = { o: 1, f: 0 }; changed = true; } });
  if (changed) save(PLAYS_KEY, p);
}

/* called for every game_open / game_end (from lib/analytics track()) */
export function notePlay(kind: "open" | "end", game: string) {
  if (!game || !(game in UNLOCK_AT)) return;
  const p = load<Plays>(PLAYS_KEY, {});
  const before = Object.keys(UNLOCK_AT).filter((g) => isUnlocked(g));
  const cur = p[game] ?? { o: 0, f: 0 };
  const firstFinish = kind === "end" && !cur.f;
  if (kind === "open") cur.o += 1; else cur.f += 1;
  p[game] = cur;
  save(PLAYS_KEY, p);

  if (kind !== "end") return;
  /* newly opened games */
  const opened = Object.keys(UNLOCK_AT).filter((g) => isUnlocked(g) && !before.includes(g));
  /* first finish of a game → a card, then any unlock celebration */
  if (firstFinish) {
    const card = awardCard("game");
    if (card) setTimeout(() => emit("vedank:card", { card, reason: "game", game }), 1800);
  }
  if (opened.length) setTimeout(() => emit("vedank:unlock", { games: opened }), firstFinish ? 4200 : 1800);
  /* the same game a lot, with new ones waiting → suggest one */
  else if (cur.f >= 3 && cur.f % 2 === 1) {
    const fresh = untriedGames();
    if (fresh.length) setTimeout(() => emit("vedank:nudge", { from: game, to: fresh[Math.floor(Math.random() * fresh.length)] }), 2200);
  }
}

/* ---------- cards ---------- */
export function ownedCards(): Record<string, string> {
  return load<Record<string, string>>(CARDS_KEY, {});
}
/* a random card the player doesn't have; legendaries are rare unless `boost` */
export function awardCard(_reason: "game" | "daily", boost = 0): Card | null {
  const owned = ownedCards();
  const left = CARDS.filter((c) => !owned[c.id]);
  if (!left.length) return null;
  const weight = (c: Card) => (c.rarity === "legendary" ? 1 + boost * 2 : c.rarity === "rare" ? 3 + boost : 6);
  const total = left.reduce((t, c) => t + weight(c), 0);
  let r = Math.random() * total;
  let pick = left[0];
  for (const c of left) { r -= weight(c); if (r <= 0) { pick = c; break; } }
  owned[pick.id] = jstDay();
  save(CARDS_KEY, owned);
  return pick;
}

/* ---------- daily gift: open the app each day ---------- */
export function dailyGiftDue(): boolean {
  return load<{ day: string }>(GIFT_KEY, { day: "" }).day !== jstDay();
}
/* claim today's gift: a card (better odds on a longer daily streak) and coins */
export function claimDailyGift(): { card: Card | null; coins: number; streak: number } {
  const g = load<{ day: string; streak: number }>(GIFT_KEY, { day: "", streak: 0 });
  const today = jstDay();
  if (g.day === today) return { card: null, coins: 0, streak: g.streak };
  const yesterday = jstDay(new Date(Date.now() - 86400_000));
  const streak = g.day === yesterday ? g.streak + 1 : 1;
  save(GIFT_KEY, { day: today, streak });
  const card = awardCard("daily", streak >= 7 ? 3 : streak >= 3 ? 1 : 0);
  const coins = 10 + Math.min(streak, 7) * 5;
  return { card, coins, streak };
}
export function giftStreak(): number {
  return load<{ streak: number }>(GIFT_KEY, { streak: 0 }).streak;
}
