import fs from "fs";
import { PUZZLES, SEG_LINE, SEG_TIP, OP_GEO, OP_TIP } from "../src/lib/game/matchstick";
const css = fs.readFileSync("src/app/globals.css", "utf8");
const cellW = 46, gap = 26, opW = 44;
function board(glyphs: any[]) {
  let total = 0; for (const g of glyphs) total += (g.type === "digit" ? cellW : opW) + gap; total -= gap;
  let x = Math.max(10, (440 - total) / 2); const y = 24; const out: string[] = [];
  for (const g of glyphs) {
    const geo: any = g.type === "digit" ? SEG_LINE : OP_GEO;
    const tips: any = g.type === "digit" ? SEG_TIP : OP_TIP;
    for (const slot of Object.keys(geo)) {
      const c = geo[slot], on = !!g.active[slot];
      const x1 = x + c[0], y1 = y + c[1], x2 = x + c[2], y2 = y + c[3];
      const tx = tips[slot] === "start" ? x1 : x2, ty = tips[slot] === "start" ? y1 : y2;
      out.push(`<line class="stick ${on ? "stick-active" : "stick-inactive"}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
        + `<circle class="${on ? "stick-tip" : "stick-tip-off"}" cx="${tx}" cy="${ty}" r="${on ? 5.5 : 4}"/>`);
    }
    x += (g.type === "digit" ? cellW : opW) + gap;
  }
  return `<svg viewBox="0 0 440 140" width="440" height="140">${out.join("")}</svg>`;
}
const rows = PUZZLES.slice(0, 4).map((p, i) =>
  `<div class="puzzle-board"><div class="board-svg-wrap">${board(p.start())}</div></div><p>${p.id}</p>`).join("");
fs.writeFileSync("/tmp/board.html", `<!doctype html><meta charset=utf8><style>${css}
 body{background:#1d2333;padding:16px;width:520px;display:block}.puzzle-board{display:block;width:480px;margin:0 0 6px}.board-svg-wrap{display:block}.board-svg-wrap svg{max-width:none;width:440px;height:140px} p{color:#aaa;font:700 11px system-ui;margin:2px 0 14px}</style>${rows}`);
console.log("ok");
