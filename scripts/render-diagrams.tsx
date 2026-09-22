import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { BOOK_DIAGRAMS } from "../src/components/game/BookDiagrams";
import { TOPICS } from "../src/lib/game/topics";
import fs from "fs";
const only = process.argv.slice(2);
const ids = (only.length ? only : TOPICS.map(t => t.id)).filter(id => (BOOK_DIAGRAMS as any)[id]);
const css = fs.readFileSync("src/app/globals.css", "utf8");
const body = ids.map(id => {
  const C = (BOOK_DIAGRAMS as any)[id];
  let html = "";
  try { html = renderToStaticMarkup(React.createElement(C, { lang: "en" })); }
  catch (e) { html = `<b style="color:red">threw: ${String(e)}</b>`; }
  return `<div class="cell"><h3>${id}</h3><div class="bd-wrap">${html}</div></div>`;
}).join("");
fs.writeFileSync("/tmp/diag.html", `<!doctype html><meta charset=utf8><style>${css}
 body{background:#fff;padding:14px;width:1180px;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
 .cell{break-inside:avoid} h3{font:700 11px system-ui;margin:0 0 4px;color:#555}
 .bd-wrap{display:block;border:1px solid #e6e6e6;padding:8px;border-radius:10px;width:100%}</style>${body}`);
console.log("rendered", ids.length, "diagrams");
