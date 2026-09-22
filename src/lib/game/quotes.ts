/* ---------- what the buddy says when you tap it ----------
   Lifted from the printed books rather than written fresh, so the app and the
   page say the same things: MATH_QUOTES and HOPE_QUOTES from the school
   edition's quote bands, and the "Did you know?" cards from the book's fun
   panels. Attributions are kept exactly as the books print them. */

export type Quote = {
  kind: "math" | "hope" | "india";
  text: string;
  textJa?: string;
  by?: string;
};

export const QUOTES: Quote[] = [
  /* ---- mathematics ---- */
  { kind: "math", text: "The whole heaven is number and harmony.", by: "Aristotle (384–322 BC)" },
  { kind: "math", text: "Number rules the universe.", by: "Pythagoras (570–490 BC)" },
  {
    kind: "math",
    text: "Where there is life there is pattern, and where there is pattern there is mathematics.",
    by: "John D. Barrow (1952–2020)",
  },
  {
    kind: "math",
    text: "Do not worry about your difficulties in Mathematics. I can assure you mine are still greater.",
    by: "Albert Einstein (1879–1955)",
  },
  {
    kind: "math",
    text: "Mathematics, rightly viewed, possesses not only truth but supreme beauty.",
    by: "Bertrand Russell (1872–1970)",
  },
  {
    kind: "india",
    text: "We owe a lot to the Indians, who taught us how to count, without which no worthwhile scientific discovery could have been made.",
    by: "Albert Einstein (1879–1955)",
  },
  {
    kind: "math",
    text: "The important thing is not to stop questioning. Curiosity has its own reason for existence.",
    by: "Albert Einstein (1879–1955)",
  },
  {
    kind: "math",
    text: "What is mathematics? It is only a systematic effort of solving puzzles posed by nature.",
    by: "Shakuntala Devi (1929–2013)",
  },
  {
    kind: "math",
    text: "Mathematics is the most beautiful and most powerful creation of the human spirit.",
    by: "Stefan Banach (1892–1945)",
  },
  { kind: "math", text: "Mathematics is the music of reason.", by: "James Joseph Sylvester (1814–1897)" },
  {
    kind: "math",
    text: "Mathematics is the language with which God has written the universe.",
    by: "Galileo Galilei (1564–1642)",
  },
  { kind: "math", text: "Nature is written in mathematical language.", by: "Galileo Galilei (1564–1642)" },
  {
    kind: "math",
    text: "Without mathematics, there's nothing you can do. Everything around you is mathematics. Everything around you is numbers.",
    by: "Shakuntala Devi (1929–2013)",
  },
  {
    kind: "math",
    text: "Mathematics is the queen of science, and arithmetic is the queen of mathematics.",
    by: "Carl Friedrich Gauss (1777–1855)",
  },
  {
    kind: "math",
    text: "Mathematics is the most powerful weapon you can use to change the world.",
    by: "Max Tegmark (1967– )",
  },
  {
    kind: "india",
    text: "The origin of mathematics in India can be traced to the Indus Valley Civilization, where numerals were widely used.",
    by: "Kim Plofker (1964– )",
  },
  {
    kind: "math",
    text: "An equation for me has no meaning, unless it expresses a thought of God.",
    by: "Srinivasa Ramanujan (1887–1920)",
  },
  {
    kind: "hope",
    text: "A person who never made a mistake never tried anything new.",
    by: "Albert Einstein (1879–1955)",
  },

  /* ---- encouragement ---- */
  { kind: "hope", text: "Your growth is the hope of the world.", textJa: "あなたの成長は世界の希望です。" },
  { kind: "hope", text: "Just be confident and do your best.", textJa: "自信をもって、ベストをつくそう。" },
  { kind: "hope", text: "You are the hope of the world.", textJa: "あなたは世界の希望です。" },
  {
    kind: "hope",
    text: "One who possesses hope is forever young. One who continually advances is forever beautiful.",
    textJa: "希望をもつ人は永遠に若い。進み続ける人は永遠に美しい。",
  },
  {
    kind: "hope",
    text: "A pyramid isn't built from the top down. The apex is attained only by laying strong foundation stones, one by one.",
    textJa: "ピラミッドは上からは建てられない。一つずつ土台を積むからこそ頂に届く。",
  },
  {
    kind: "hope",
    text: "Challenge yourself in something — it doesn't matter what.",
    textJa: "何かに挑戦しよう。なんでもいい。",
  },
  {
    kind: "hope",
    text: "It takes great effort to build something, but destruction takes only an instant.",
    textJa: "築くには努力がいる。こわすのは一瞬。",
  },
  {
    kind: "hope",
    text: "As long as we are human, we are bound to make mistakes.",
    textJa: "人間だから、まちがえるのは当たり前。",
  },
  {
    kind: "hope",
    text: "You are your own person; you don't need to compare yourself to others.",
    textJa: "あなたはあなた。だれかと比べなくていい。",
  },
  {
    kind: "hope",
    text: "You are an amazing person. The most important thing is to never think, 'I'm no good.'",
    textJa: "あなたはすばらしい。「自分はダメだ」と思わないことがいちばん大事。",
  },

  /* ---- India & the history of the sutras ---- */
  {
    kind: "india",
    text: "The Sulba Sutra of Baudhayana (800–740 BCE) states the Pythagorean theorem — a thousand years before Pythagoras.",
    textJa: "バウダーヤナの『シュルバ・スートラ』（前800〜740年）はピタゴラスの定理を記している。ピタゴラスより千年も前のこと。",
  },
  {
    kind: "india",
    text: "Brahmagupta formalised zero and negative numbers in 598 CE — centuries before Europe.",
    textJa: "ブラフマグプタは598年にゼロと負の数を定式化した。ヨーロッパより何世紀も前。",
  },
  {
    kind: "india",
    text: "Aryabhata (476–550 CE) wrote of heliocentric ideas, the concept of infinity, and the first sine tables.",
    textJa: "アーリヤバタ（476〜550年）は地動説、無限の概念、最初の正弦表を記した。",
  },
  {
    kind: "india",
    text: "Indus Valley bricks were made in a 4:2:1 ratio for stability, with standard weights based on a unit of about 28 grams — close to a modern ounce.",
    textJa: "インダス文明のレンガは安定のため4:2:1の比。基準の重さは約28グラム、現代のオンスにほぼ等しい。",
  },
  {
    kind: "india",
    text: "Maths was lived, not just written — passed down orally in Gurukuls with deep reasoning and mental agility.",
    textJa: "数学は書かれるだけでなく生きられた。グルクルで口伝され、深い理由づけと暗算力とともに受けつがれた。",
  },
  {
    kind: "india",
    text: "Ramanujan (1887–1920) opened up number theory, infinite series and continued fractions — largely self-taught.",
    textJa: "ラマヌジャン（1887〜1920）は数論・無限級数・連分数を切り開いた。ほとんど独学で。",
  },
  {
    kind: "india",
    text: "Bharati Krishna Tirtha studied the Vedas deeply and reconstructed a hidden system of maths: 16 Sutras and 13 Sub-Sutras.",
    textJa: "バーラティ・クリシュナ・ティルタはヴェーダを深く学び、16のスートラと13のサブスートラからなる数学の体系を再構成した。",
  },
  {
    kind: "india",
    text: "A sutra is a short, elegant formula — a line you can hold in your head that simplifies even a hard problem.",
    textJa: "スートラは短く美しい公式。頭の中に置いておけて、むずかしい問題もかんたんにする一行。",
  },
  {
    kind: "india",
    text: "Aryabhata, Brahmagupta, Bhaskara II and Madhava each broke new ground in algebra, trigonometry and infinity.",
    textJa: "アーリヤバタ、ブラフマグプタ、バースカラ2世、マーダヴァ——代数・三角法・無限のそれぞれを切り開いた。",
  },
];

export function quoteText(q: Quote, ja: boolean): string {
  return ja && q.textJa ? q.textJa : q.text;
}

/* Walks the list in a shuffled order and only reshuffles once it is exhausted,
   so tapping repeatedly never repeats until every quote has been seen. */
export function makeQuoteCycle(seed = QUOTES.length) {
  let order: number[] = [];
  let at = 0;

  function reshuffle(avoid?: number) {
    order = QUOTES.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    /* Don't open the new pass with the quote that closed the last one. */
    if (avoid !== undefined && order[0] === avoid && order.length > 1) {
      [order[0], order[1]] = [order[1], order[0]];
    }
    at = 0;
  }

  reshuffle();
  void seed;

  return function next(): Quote {
    if (at >= order.length) reshuffle(order[order.length - 1]);
    return QUOTES[order[at++]];
  };
}
