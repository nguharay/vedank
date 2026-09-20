// Decorative per-topic header illustrations. These render only our own
// fixed gradient hex strings (from Topic.grad) via dangerouslySetInnerHTML —
// never user input — so there's no injection risk.
export const ILLUS: Record<string, (c1: string, c2: string) => string> = {
  numberline: (c1, c2) =>
    `<svg viewBox="0 0 300 90" width="100%" height="90" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="300" height="90" fill="url(#g1)"/>` +
    `<line x1="20" y1="45" x2="280" y2="45" stroke="#fff" stroke-width="3" opacity=".85"/>` +
    Array.from({ length: 9 })
      .map((_, i) => {
        const x = 20 + i * 32.5;
        return `<circle cx="${x}" cy="45" r="${i === 4 ? 7 : 4}" fill="#fff" opacity="${i === 4 ? 1 : 0.75}"/>`;
      })
      .join("") +
    `<text x="150" y="30" font-family="JetBrains Mono" font-size="13" fill="#fff" text-anchor="middle" opacity=".9">…+1 −1…</text>` +
    `</svg>`,

  grid: (c1, c2) => {
    let cells = "";
    for (let r = 0; r < 4; r++)
      for (let col = 0; col < 7; col++)
        cells += `<rect x="${20 + col * 36}" y="${14 + r * 17}" width="30" height="12" rx="3" fill="#fff" opacity="${(0.25 + ((r + col) % 3) * 0.22).toFixed(2)}"/>`;
    return (
      `<svg viewBox="0 0 300 90" width="100%" height="90" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
      `<rect width="300" height="90" fill="url(#g2)"/>${cells}</svg>`
    );
  },

  ladder: (c1, c2) =>
    `<svg viewBox="0 0 300 90" width="100%" height="90" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="300" height="90" fill="url(#g3)"/>` +
    `<line x1="60" y1="12" x2="60" y2="78" stroke="#fff" stroke-width="4" opacity=".8"/>` +
    `<line x1="240" y1="12" x2="240" y2="78" stroke="#fff" stroke-width="4" opacity=".8"/>` +
    Array.from({ length: 5 })
      .map((_, i) => `<line x1="60" y1="${18 + i * 13}" x2="240" y2="${18 + i * 13}" stroke="#fff" stroke-width="3" opacity="${0.35 + i * 0.12}"/>`)
      .join("") +
    `<circle cx="150" cy="45" r="10" fill="#fff"/><text x="150" y="49" font-family="Baloo 2" font-size="12" fill="${c1}" text-anchor="middle" font-weight="700">10</text>` +
    `</svg>`,

  squaregrid: (c1, c2) => {
    let cells = "";
    for (let r = 0; r < 5; r++)
      for (let col = 0; col < 5; col++)
        cells += `<rect x="${100 + col * 20}" y="${5 + r * 16}" width="17" height="13" rx="2" fill="#fff" opacity="${(0.3 + ((r * 5 + col) % 5) * 0.14).toFixed(2)}"/>`;
    return (
      `<svg viewBox="0 0 300 90" width="100%" height="90" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
      `<rect width="300" height="90" fill="url(#g4)"/>${cells}</svg>`
    );
  },

  loop: (c1, c2) =>
    `<svg viewBox="0 0 300 90" width="100%" height="90" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><linearGradient id="g5" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="300" height="90" fill="url(#g5)"/>` +
    `<path d="M60 45a30 30 0 1 1 60 0a30 30 0 1 1 60 0a30 30 0 1 1 60 0" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>` +
    `<path d="M225 30 L240 45 L225 60" fill="none" stroke="#fff" stroke-width="3" opacity=".9" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`,
};
