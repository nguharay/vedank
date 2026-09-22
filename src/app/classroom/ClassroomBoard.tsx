"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createClassAction, rosterAction, setAssignmentAction, setClassOpenAction, removeStudentAction,
  createCompetitionAction, classCompetitionsAction, endCompetitionAction, competitionBoardAction,
} from "@/lib/actions/game-actions";
import { COMP_LEVELS, type CompetitionSummary, type CompRow } from "@/lib/game/competition";
import type { ClassSummary, ClassStudent } from "@/lib/game/classroom";
import { TOPICS } from "@/lib/game/topics";

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - new Date(d + "T00:00:00").getTime()) / 864e5);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return d;
}

export function ClassroomBoard({
  initialClasses,
  teacherName,
}: {
  initialClasses: ClassSummary[];
  teacherName: string | null;
}) {
  const [classes, setClasses] = useState(initialClasses);
  const [newName, setNewName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<ClassSummary | null>(null);
  const [students, setStudents] = useState<ClassStudent[] | null>(null);
  const [assignedTopicId, setAssignedTopicId] = useState<string | null>(null);
  const [assignNote, setAssignNote] = useState("");
  const [busy, setBusy] = useState(false);

  /* competitions for the open class */
  const [comps, setComps] = useState<CompetitionSummary[]>([]);
  const [compName, setCompName] = useState("");
  const [compLevelId, setCompLevelId] = useState(COMP_LEVELS[1].id as string);
  const [compMins, setCompMins] = useState(5);
  const [board, setBoard] = useState<{ name: string; rows: CompRow[] } | null>(null);

  async function onCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    const res = await createClassAction(newName);
    setBusy(false);
    if (res.ok && res.classroom) {
      setClasses((c) => [res.classroom!, ...c]);
      setNewName("");
      setNote(null);
    } else {
      setNote(res.error ?? null);
    }
  }

  async function openClass(c: ClassSummary) {
    setOpen(c);
    setStudents(null);
    setNote(null);
    const [res, cr] = await Promise.all([rosterAction(c.id), classCompetitionsAction(c.id)]);
    if (cr.ok) setComps(cr.rows ?? []);
    if (res.ok) {
      setStudents(res.students ?? []);
      setAssignedTopicId(res.assignedTopicId ?? null);
      setAssignNote(c.assignedNote ?? "");
    } else {
      setNote(res.error ?? null);
      setStudents([]);
    }
  }

  async function saveAssignment(topicId: string | null) {
    if (!open) return;
    setBusy(true);
    const res = await setAssignmentAction(open.id, topicId, assignNote || null);
    setBusy(false);
    if (res.ok) {
      setAssignedTopicId(topicId);
      setClasses((cs) =>
        cs.map((c) => (c.id === open.id ? { ...c, assignedTopicId: topicId, assignedNote: assignNote || null } : c))
      );
      await openClass({ ...open, assignedTopicId: topicId, assignedNote: assignNote || null });
    } else setNote(res.error ?? null);
  }

  async function toggleOpen() {
    if (!open) return;
    const next = !open.open;
    const res = await setClassOpenAction(open.id, next);
    if (res.ok) {
      setOpen({ ...open, open: next });
      setClasses((cs) => cs.map((c) => (c.id === open.id ? { ...c, open: next } : c)));
    } else setNote(res.error ?? null);
  }

  async function drop(studentId: string) {
    if (!open) return;
    const res = await removeStudentAction(open.id, studentId);
    if (res.ok) {
      setStudents((s) => (s ? s.filter((x) => x.id !== studentId) : s));
      setClasses((cs) => cs.map((c) => (c.id === open.id ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c)));
    } else setNote(res.error ?? null);
  }

  async function refreshComps() {
    if (!open) return;
    const cr = await classCompetitionsAction(open.id);
    if (cr.ok) setComps(cr.rows ?? []);
  }

  async function onCreateComp() {
    if (!open || !compName.trim()) return;
    setBusy(true);
    const res = await createCompetitionAction(open.id, compName, compLevelId, compMins * 60);
    setBusy(false);
    if (res.ok) {
      setCompName("");
      setNote(null);
      refreshComps();
    } else setNote(res.error ?? null);
  }

  async function onEndComp(id: string) {
    const res = await endCompetitionAction(id);
    if (res.ok) refreshComps();
    else setNote(res.error ?? null);
  }

  async function onViewBoard(id: string) {
    const res = await competitionBoardAction(id);
    if (res.ok) setBoard({ name: res.name ?? "", rows: res.rows ?? [] });
    else setNote(res.error ?? null);
  }

  const assignedTopic = TOPICS.find((t) => t.id === assignedTopicId);

  return (
    <div id="app" className="admin-app">
      <header className="admin-header">
        <Link className="admin-back" href="/">← Game</Link>
        <div className="header-title">
          <h1>Classroom</h1>
          <div className="admin-whoami">{teacherName ?? "Teacher"}</div>
        </div>
      </header>

      <main className="admin-main">
        {note && <div className="shop-note cls-note">{note}</div>}

        {!open ? (
          <>
            <div className="cls-create">
              <input
                className="admin-search"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New class name, e.g. Year 5 Maths"
                aria-label="New class name"
                maxLength={60}
              />
              <button className="btn btn-primary" onClick={onCreate} disabled={busy || !newName.trim()}>
                + Create class
              </button>
            </div>

            <div className="cls-grid">
              {classes.map((c) => (
                <button key={c.id} className="cls-card" onClick={() => openClass(c)}>
                  <div className="cls-card-top">
                    <span className="cls-card-name">{c.name}</span>
                    {!c.open && <span className="admin-pill">closed</span>}
                  </div>
                  <div className="cls-card-code mono">{c.joinCode}</div>
                  <div className="cls-card-meta">
                    {c.memberCount} student{c.memberCount === 1 ? "" : "s"}
                    {c.assignedTopicId ? " · has an assignment" : ""}
                  </div>
                </button>
              ))}
              {classes.length === 0 && (
                <div className="admin-empty">
                  No classes yet. Create one, then read the code out to your students — they enter it
                  under Class in the app menu.
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="cls-head">
              <button className="admin-back" onClick={() => { setOpen(null); setStudents(null); }}>
                ← All classes
              </button>
              <div className="cls-head-main">
                <div className="cls-head-name">{open.name}</div>
                <div className="cls-head-sub">
                  Join code <b className="mono">{open.joinCode}</b> · {students?.length ?? "…"} students
                </div>
              </div>
              <button className="btn btn-ghost cls-toggle" onClick={toggleOpen}>
                {open.open ? "Close to joiners" : "Reopen"}
              </button>
            </div>

            <div className="cls-assign">
              <div className="cls-assign-label">Assignment</div>
              <div className="cls-assign-row">
                <select
                  className="cls-select"
                  value={assignedTopicId ?? ""}
                  onChange={(e) => saveAssignment(e.target.value || null)}
                  aria-label="Assigned topic"
                >
                  <option value="">— none —</option>
                  {TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.title}
                    </option>
                  ))}
                </select>
                <input
                  className="cls-assign-note"
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  onBlur={() => saveAssignment(assignedTopicId)}
                  placeholder="Note for the class, e.g. stages 1–3 by Friday"
                  maxLength={140}
                  aria-label="Assignment note"
                />
              </div>
              {assignedTopic && (
                <div className="cls-assign-hint">
                  Students see this on their home screen. Progress below is stages cleared in{" "}
                  <b>{assignedTopic.title}</b>.
                </div>
              )}
            </div>

            <div className="cls-assign comp-block">
              <div className="cls-assign-label">Competition</div>
              <div className="cls-assign-row">
                <input
                  className="cls-assign-note"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="Competition name, e.g. Friday Sprint"
                  maxLength={60}
                  aria-label="Competition name"
                />
                <select
                  className="cls-select"
                  value={compLevelId}
                  onChange={(e) => setCompLevelId(e.target.value)}
                  aria-label="Competition level"
                >
                  {COMP_LEVELS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.questions} questions
                    </option>
                  ))}
                </select>
                <label className="comp-mins">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={compMins}
                    onChange={(e) => setCompMins(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                    aria-label="Duration in minutes"
                  />
                  <span>min</span>
                </label>
                <button className="btn btn-primary comp-start" onClick={onCreateComp} disabled={busy || !compName.trim()}>
                  Start competition
                </button>
              </div>
              <div className="cls-assign-hint">
                Everyone sits the same paper, generated from the level you pick. Students see it on
                their home screen and get one attempt each; answers are marked here, not on their device.
              </div>

              {comps.length > 0 && (
                <div className="comp-list">
                  {comps.map((c) => (
                    <div key={c.id} className={`comp-row${c.status === "ended" ? " ended" : ""}`}>
                      <span className="comp-row-name">
                        {c.name}
                        <span className="comp-row-meta">
                          {c.levelName} · {c.questionCount} Qs · {Math.round(c.durationSec / 60)} min
                          {c.status === "ended" ? " · ended" : ""}
                        </span>
                      </span>
                      <span className="comp-row-count mono">
                        {c.finished}/{c.entrants} done
                      </span>
                      <button className="comp-row-btn" onClick={() => onViewBoard(c.id)}>Results</button>
                      {c.status === "live" && (
                        <button className="comp-row-btn danger" onClick={() => onEndComp(c.id)}>End</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th className="num">Level</th>
                    <th className="num">Gems</th>
                    <th className="num">Streak</th>
                    <th>Last active</th>
                    <th className="num">Stages</th>
                    <th className="num">Puzzles</th>
                    {assignedTopic && <th className="num">Assigned</th>}
                    <th className="num">To review</th>
                    <th>Keeps missing</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(students ?? []).map((s) => (
                    <tr key={s.id}>
                      <td className="admin-name">{s.name}</td>
                      <td className="num mono">{s.level}</td>
                      <td className="num mono">{s.gems}</td>
                      <td className="num mono">{s.dailyStreak}</td>
                      <td className="mono">{fmtDate(s.lastActiveDate)}</td>
                      <td className="num mono">{s.stagesCleared}</td>
                      <td className="num mono">{s.puzzlesSolved}</td>
                      {assignedTopic && (
                        <td className="num mono">
                          {s.assignedCleared ?? 0}/5
                        </td>
                      )}
                      <td className="num mono">
                        {s.dueReviews > 0 ? (
                          <span className="cls-due">{s.dueReviews}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="cls-weak">
                        {s.weakest.length
                          ? s.weakest.map((w) => (
                              <span key={w.prompt} className="cls-weak-chip mono">
                                {w.prompt}
                                {w.misses > 1 ? ` ×${w.misses}` : ""}
                              </span>
                            ))
                          : "—"}
                      </td>
                      <td>
                        <button className="friend-remove" onClick={() => drop(s.id)} aria-label={`Remove ${s.name}`}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students !== null && students.length === 0 && (
                    <tr>
                      <td colSpan={assignedTopic ? 11 : 10} className="admin-empty">
                        Nobody has joined yet. Read out the code <b className="mono">{open.joinCode}</b>.
                      </td>
                    </tr>
                  )}
                  {students === null && (
                    <tr>
                      <td colSpan={assignedTopic ? 11 : 10} className="admin-empty">
                        Loading…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {board && (
        <>
          <div className="menu-overlay" onClick={() => setBoard(null)} />
          <div className="comp-board">
            <div className="comp-board-head">
              <span>🏅 {board.name}</span>
              <button className="share-close" onClick={() => setBoard(null)} aria-label="Close">✕</button>
            </div>
            {board.rows.length === 0 ? (
              <div className="admin-empty">Nobody has finished yet.</div>
            ) : (
              <ol className="comp-board-list">
                {board.rows.map((r) => (
                  <li key={r.userId} className={`comp-board-row rank-${r.rank <= 3 ? r.rank : "n"}`}>
                    <span className="comp-rank mono">{r.rank}</span>
                    <span className="comp-who">{r.name}</span>
                    <span className="comp-detail mono">
                      {r.correct}/{r.answered || r.correct} · {(r.elapsedMs / 1000).toFixed(0)}s
                    </span>
                    <span className="comp-score mono">{r.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </div>
  );
}
