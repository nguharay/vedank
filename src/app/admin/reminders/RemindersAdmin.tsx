"use client";

import { useState } from "react";
import Link from "next/link";
import type { Reminder, ReminderInput } from "@/lib/game/reminders";
import { saveReminderAction, deleteReminderAction, sendTestReminderAction, sendReminderNowAction } from "@/lib/actions/admin-actions";

type Run = { slot: string; day: string; reminderId: number | null; sent: number; ranAt: string };

/* For now only the evening slot is scheduled (vercel.json): one notification
   a day. Morning messages are kept but not sent until it is switched back on. */
const SLOT_LABEL: Record<string, string> = { morning: "🌅 Morning · ⏸ paused (not sent)", evening: "🌙 Evening · 19:00 JST — the daily notification" };
const AUD_LABEL: Record<string, string> = {
  all: "Everyone with notifications on (signed in + guests)",
  guests: "Guests only (not signed in) — good for 'save your progress' nudges",
  not_played_today: "Hasn't played today",
  streak_risk: "Has a streak and hasn't played today",
};
const BLANK: ReminderInput = { slot: "evening", audience: "not_played_today", titleJa: "", bodyJa: "", titleEn: "", bodyEn: "", url: "/", enabled: true, sort: 0 };

export function RemindersAdmin({ rows: initial, runs, reach, adminEmail, pushOn }: {
  rows: Reminder[]; runs: Run[]; reach: { players: number; guests: number }; adminEmail: string; pushOn: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<ReminderInput | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing) return;
    setBusy(true); setNote(null);
    const res = await saveReminderAction(editing);
    setBusy(false);
    if (!res.ok) { setNote(res.error); return; }
    setRows((rs) => (editing.id ? rs.map((r) => (r.id === res.row.id ? res.row : r)) : [...rs, res.row]));
    setEditing(null);
    setNote("Saved.");
  }
  async function remove(id: number) {
    if (!confirm("Delete this reminder?")) return;
    setBusy(true);
    const res = await deleteReminderAction(id);
    setBusy(false);
    if (res.ok) setRows((rs) => rs.filter((r) => r.id !== id));
  }
  async function toggle(r: Reminder) {
    const res = await saveReminderAction({ ...r, enabled: !r.enabled });
    if (res.ok) setRows((rs) => rs.map((x) => (x.id === r.id ? res.row : x)));
  }
  async function test(id: number) {
    setBusy(true); setNote(null);
    const res = await sendTestReminderAction(id);
    setBusy(false);
    setNote(res.ok ? "Test sent to your phone — if nothing arrived, turn on 🔔 Notifications in the game menu first." : res.error);
  }
  async function sendNow(r: Reminder) {
    if (!confirm(`Send "${r.titleJa}" to its audience right now?`)) return;
    setBusy(true); setNote(null);
    const res = await sendReminderNowAction(r.id);
    setBusy(false);
    setNote(res.ok ? `Sent to ${res.sent} of ${res.targets} players.` : res.error);
  }

  const bySlot = (slot: string) => rows.filter((r) => r.slot === slot);
  return (
    <div id="app" className="admin-app">
      <header className="admin-header">
        <div style={{ flex: 1 }}>
          <h1>Daily reminders</h1>
          <div className="admin-whoami">{adminEmail}</div>
        </div>
        <Link className="admin-back" href="/admin">Signups</Link>
        <Link className="admin-back" href="/">← Game</Link>
      </header>
      <main className="admin-main rem-main">
        <div className="admin-stats">
          <div className="admin-stat"><b className="mono">{reach.players}</b><span>signed-in players reachable</span></div>
          <div className="admin-stat"><b className="mono">{reach.guests}</b><span>guests reachable</span></div>
          <div className="admin-stat"><b className="mono">{rows.filter((r) => r.enabled).length}</b><span>messages on</span></div>
          <div className="admin-stat"><b>{pushOn ? "✅" : "⚠️"}</b><span>{pushOn ? "push configured" : "push keys missing"}</span></div>
        </div>
        <p className="rem-help">
          <b>One notification goes out a day, at 19:00 JST</b>, from the <b>evening</b> list. Each day the next message in that list is sent,
          cycling through it in order, so write several and they rotate. The morning list is paused — its messages are kept but not sent. Players receive the version in their language.
          Keep titles under ~30 characters and bodies under ~80 so they fit on a lock screen.
        </p>
        {note && <div className="rem-note">{note}</div>}

        {["morning", "evening"].map((slot) => (
          <section key={slot} className="rem-slot">
            <h2>{SLOT_LABEL[slot]}</h2>
            {bySlot(slot).length === 0 && <p className="rem-empty">No messages yet — nothing will be sent in this slot.</p>}
            <ol className="rem-list">
              {bySlot(slot).map((r) => (
                <li key={r.id} className={`rem-item${r.enabled ? "" : " off"}`}>
                  <div className="rem-item-main">
                    <div className="rem-title">{r.titleJa} <span className="rem-en">/ {r.titleEn}</span></div>
                    <div className="rem-body">{r.bodyJa}</div>
                    <div className="rem-body rem-en">{r.bodyEn}</div>
                    <div className="rem-meta">👥 {AUD_LABEL[r.audience]} · 🔗 {r.url} · #{r.sort}{r.updatedBy ? ` · ${r.updatedBy}` : ""}</div>
                  </div>
                  <div className="rem-actions">
                    <label className="rem-toggle"><input type="checkbox" checked={r.enabled} onChange={() => toggle(r)} /> on</label>
                    <button onClick={() => setEditing({ ...r })} disabled={busy}>Edit</button>
                    <button onClick={() => test(r.id)} disabled={busy}>Test → me</button>
                    <button onClick={() => sendNow(r)} disabled={busy}>Send now</button>
                    <button className="danger" onClick={() => remove(r.id)} disabled={busy}>Delete</button>
                  </div>
                </li>
              ))}
            </ol>
            <button className="rem-add" onClick={() => setEditing({ ...BLANK, slot: slot as "morning" | "evening", sort: bySlot(slot).length + 1 })}>＋ Add a {slot} message</button>
          </section>
        ))}

        <section className="rem-slot">
          <h2>📬 Recent sends</h2>
          {runs.length === 0 ? <p className="rem-empty">Nothing sent yet.</p> : (
            <table className="rem-runs">
              <thead><tr><th>When (UTC)</th><th>Slot</th><th>Message</th><th>Sent</th></tr></thead>
              <tbody>
                {runs.map((u, i) => (
                  <tr key={i}><td className="mono">{u.ranAt.replace("T", " ").slice(0, 16)}</td><td>{u.slot.startsWith("manual") ? "manual" : u.slot}</td><td>{rows.find((r) => r.id === u.reminderId)?.titleJa ?? (u.reminderId ? `#${u.reminderId}` : "—")}</td><td className="mono">{u.sent}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {editing && (
        <div className="rem-modal-wrap" onClick={() => setEditing(null)}>
          <form className="rem-modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <h3>{editing.id ? "Edit message" : "New message"}</h3>
            <div className="rem-grid">
              <label>Slot
                <select value={editing.slot} onChange={(e) => setEditing({ ...editing, slot: e.target.value as "morning" | "evening" })}>
                  <option value="morning">Morning · 08:00 JST</option><option value="evening">Evening · 19:00 JST</option>
                </select>
              </label>
              <label>Who gets it
                <select value={editing.audience} onChange={(e) => setEditing({ ...editing, audience: e.target.value as ReminderInput["audience"] })}>
                  {Object.entries(AUD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Title 🇯🇵<input value={editing.titleJa} maxLength={60} onChange={(e) => setEditing({ ...editing, titleJa: e.target.value })} placeholder="🐉 おはよう！" /></label>
              <label>Title 🇬🇧<input value={editing.titleEn} maxLength={60} onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })} placeholder="🐉 Good morning!" /></label>
              <label className="wide">Body 🇯🇵<textarea value={editing.bodyJa} maxLength={160} rows={2} onChange={(e) => setEditing({ ...editing, bodyJa: e.target.value })} /></label>
              <label className="wide">Body 🇬🇧<textarea value={editing.bodyEn} maxLength={160} rows={2} onChange={(e) => setEditing({ ...editing, bodyEn: e.target.value })} /></label>
              <label>Opens page<input value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="/" /></label>
              <label>Order<input type="number" min={0} value={editing.sort} onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })} /></label>
            </div>
            <div className="rem-preview">
              <div className="rem-preview-card"><b>{editing.titleJa || "タイトル"}</b><span>{editing.bodyJa || "本文"}</span></div>
              <div className="rem-preview-card"><b>{editing.titleEn || "Title"}</b><span>{editing.bodyEn || "Body"}</span></div>
            </div>
            <div className="rem-modal-actions">
              <button type="button" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="primary" disabled={busy}>Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
