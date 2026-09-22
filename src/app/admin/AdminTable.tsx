"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SignupRow, SignupSummary } from "@/lib/actions/admin-actions";

type SortKey = "createdAt" | "name" | "email" | "country" | "level" | "gems" | "lastActiveDate" | "dailyStreak";

const COLUMNS: { key: SortKey | null; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: null, label: "Username" },
  { key: "country", label: "Country" },
  { key: null, label: "Phone" },
  { key: null, label: "Lang" },
  { key: "createdAt", label: "Signed up" },
  { key: "lastActiveDate", label: "Last active" },
  { key: "level", label: "Level", numeric: true },
  { key: "gems", label: "Gems", numeric: true },
  { key: "dailyStreak", label: "Streak", numeric: true },
  { key: null, label: "Stages", numeric: true },
  { key: null, label: "Puzzles", numeric: true },
  { key: null, label: "Dailies", numeric: true },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Formatted from UTC parts rather than toLocaleDateString: this table is
   server-rendered first, and a locale- or timezone-dependent string would
   hydrate to something different in the browser. */
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function csvCell(v: string | number | null) {
  const s = v === null || v === undefined ? "" : String(v);
  /* Prefix formula-leading characters so a cell can't execute on open in Excel. */
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function AdminTable({ rows, summary, adminEmail }: { rows: SignupRow[]; summary: SignupSummary; adminEmail: string }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [desc, setDesc] = useState(true);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle
      ? rows.filter((r) =>
          [r.name, r.email, r.username, r.countryName, r.phone]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(needle))
        )
      : rows;

    const sorted = [...base].sort((a, b) => {
      let cmp: number;
      switch (sort) {
        case "level":
        case "gems":
        case "dailyStreak":
          cmp = (a[sort] as number) - (b[sort] as number);
          break;
        case "country":
          cmp = (a.countryName || "").localeCompare(b.countryName || "");
          break;
        case "lastActiveDate":
          cmp = (a.lastActiveDate || "").localeCompare(b.lastActiveDate || "");
          break;
        default:
          cmp = String(a[sort] || "").localeCompare(String(b[sort] || ""));
      }
      return desc ? -cmp : cmp;
    });
    return sorted;
  }, [rows, q, sort, desc]);


  function toggleSort(k: SortKey) {
    if (k === sort) setDesc((d) => !d);
    else {
      setSort(k);
      setDesc(true);
    }
  }

  function exportCsv() {
    const head = [
      "Name", "Email", "Username", "Country code", "Country", "Phone", "Language",
      "Signed up", "Last active", "Level", "Rank", "Gems", "Daily streak", "Best streak",
      "Stages cleared", "Puzzles solved", "Dailies played", "Week points", "Locked",
    ];
    const lines = [head.map(csvCell).join(",")];
    for (const r of filtered) {
      lines.push(
        [
          r.name, r.email, r.username, r.country, r.countryName, r.phone, r.preferredLang,
          r.createdAt, r.lastActiveDate, r.level, r.rank, r.gems, r.dailyStreak, r.bestDailyStreak,
          r.stagesCleared, r.puzzlesSolved, r.dailiesPlayed, r.weekPoints, r.locked ? "yes" : "no",
        ].map(csvCell).join(",")
      );
    }
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vedank-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div id="app" className="admin-app">
      <header className="admin-header">
        <img src="/brand/vedank-mark.png" alt="" className="header-mark" />
        <div className="header-title">
          <h1>Signups</h1>
          <div className="admin-whoami">{adminEmail}</div>
        </div>
        <Link className="admin-back" href="/">← Game</Link>
      </header>

      <main className="admin-main">
        <div className="admin-stats">
          <div className="admin-stat"><b className="mono">{summary.total}</b><span>Total players</span></div>
          <div className="admin-stat"><b className="mono">{summary.newThisWeek}</b><span>New this week</span></div>
          <div className="admin-stat"><b className="mono">{summary.activeToday}</b><span>Active today</span></div>
          <div className="admin-stat"><b className="mono">{summary.jp}</b><span>Japanese UI</span></div>
        </div>

        <div className="admin-toolbar">
          <input
            className="admin-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, username, country, phone…"
            aria-label="Search signups"
          />
          <button className="btn btn-ghost admin-export" onClick={exportCsv}>
            ⬇ Export CSV ({filtered.length})
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th
                    key={c.label}
                    className={`${c.numeric ? "num" : ""}${c.key ? " sortable" : ""}`}
                    aria-sort={c.key === sort ? (desc ? "descending" : "ascending") : undefined}
                  >
                    {c.key ? (
                      <button onClick={() => toggleSort(c.key as SortKey)}>
                        {c.label}
                        {c.key === sort && <span aria-hidden="true">{desc ? " ▾" : " ▴"}</span>}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="admin-name">
                    {r.name}
                    {r.locked && <span className="admin-pill admin-pill-locked" title="Locked by failed logins">locked</span>}
                  </td>
                  <td className="admin-email">{r.email}</td>
                  <td>{r.username || "—"}</td>
                  <td>{r.countryFlag ? `${r.countryFlag} ${r.countryName}` : r.countryName || "—"}</td>
                  <td className="mono">{r.phone || "—"}</td>
                  <td><span className="admin-pill">{r.preferredLang === "ja" ? "日本語" : "EN"}</span></td>
                  <td className="mono">{fmtDate(r.createdAt)}</td>
                  <td className="mono">{fmtDate(r.lastActiveDate)}</td>
                  <td className="num mono">{r.level}</td>
                  <td className="num mono">{r.gems}</td>
                  <td className="num mono">{r.dailyStreak}</td>
                  <td className="num mono">{r.stagesCleared}</td>
                  <td className="num mono">{r.puzzlesSolved}</td>
                  <td className="num mono">{r.dailiesPlayed}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="admin-empty">
                    {rows.length === 0 ? "No one has signed up yet." : "No player matches that search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
