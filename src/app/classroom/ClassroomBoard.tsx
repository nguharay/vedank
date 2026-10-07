"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  createClassAction, rosterAction, setAssignmentAction, setClassOpenAction, removeStudentAction,
  createCompetitionAction, classCompetitionsAction, endCompetitionAction, competitionBoardAction,
  classGroupsAction, makeGroupsAction, moveToGroupAction, addGroupAction, updateGroupAction,
  deleteGroupAction, clearGroupsAction,
} from "@/lib/actions/game-actions";
import { COMP_LEVELS, type CompetitionSummary, type CompRow } from "@/lib/game/competition";
import type { ClassSummary, ClassStudent, ClassGroup } from "@/lib/game/classroom";
import { TOPICS } from "@/lib/game/topics";
import { SITE_URL } from "@/lib/site";

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
/* The server calls the board makes. Passed in so /dev/classroom can show the
   board against an in-memory class; the real page always uses these. */
const REAL_API = {
  createClassAction, rosterAction, setAssignmentAction, setClassOpenAction, removeStudentAction,
  createCompetitionAction, classCompetitionsAction, endCompetitionAction, competitionBoardAction,
  classGroupsAction, makeGroupsAction, moveToGroupAction, addGroupAction, updateGroupAction,
  deleteGroupAction, clearGroupsAction,
};
export type ClassroomApi = typeof REAL_API;

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const pickOne = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

type Tab = "groups" | "progress" | "comps" | "assign";
type Picker = { title: string; names: string[]; shown: string; done: boolean; color?: string };

export function ClassroomBoard({
  initialClasses,
  teacherName,
  api = REAL_API,
}: {
  initialClasses: ClassSummary[];
  teacherName: string | null;
  api?: ClassroomApi;
}) {
  const [classes, setClasses] = useState(initialClasses);
  const [newName, setNewName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<ClassSummary | null>(null);
  const [students, setStudents] = useState<ClassStudent[] | null>(null);
  const [assignedTopicId, setAssignedTopicId] = useState<string | null>(null);
  const [assignNote, setAssignNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("groups");

  /* groups */
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [groupCount, setGroupCount] = useState(4);
  const [groupMode, setGroupMode] = useState<"random" | "mixed">("mixed");
  const [selected, setSelected] = useState<string | null>(null);   /* a student waiting to be moved */
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [bumped, setBumped] = useState<string | null>(null);        /* the group that just got a star */
  const [picker, setPicker] = useState<Picker | null>(null);
  const [bigScreen, setBigScreen] = useState(false);
  const [inviteBig, setInviteBig] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const spinRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* competitions for the open class */
  const [comps, setComps] = useState<CompetitionSummary[]>([]);
  const [compName, setCompName] = useState("");
  const [compLevelId, setCompLevelId] = useState(COMP_LEVELS[1].id as string);
  const [compMins, setCompMins] = useState(5);
  const [board, setBoard] = useState<{ name: string; rows: CompRow[] } | null>(null);

  /* the join link and its QR code, for the open class */
  const openCode = open?.joinCode ?? null;
  useEffect(() => {
    if (!openCode) return;
    const url = `${SITE_URL}/c/${openCode}`;
    let live = true;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1d1b33", light: "#ffffff" } })
      .then((svg) => { if (live) { setQrSvg(svg); setInviteUrl(url); } })
      .catch(() => {});
    return () => { live = false; };
  }, [openCode]);
  useEffect(() => () => { if (spinRef.current) clearTimeout(spinRef.current); }, []);

  async function onCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    const res = await api.createClassAction(newName);
    setBusy(false);
    if (res.ok && res.classroom) {
      setClasses((c) => [res.classroom!, ...c]);
      setNewName("");
      setNote(null);
      void openClass(res.classroom);
    } else {
      setNote(res.error ?? null);
    }
  }

  async function loadGroups(classId: string) {
    const g = await api.classGroupsAction(classId);
    if (g.ok) setGroups(g.groups ?? []);
  }

  async function openClass(c: ClassSummary) {
    setOpen(c);
    setStudents(null);
    setGroups([]);
    setSelected(null);
    setNote(null);
    setTab("groups");
    const [res, cr, g] = await Promise.all([api.rosterAction(c.id), api.classCompetitionsAction(c.id), api.classGroupsAction(c.id)]);
    if (cr.ok) setComps(cr.rows ?? []);
    if (g.ok) setGroups(g.groups ?? []);
    if (res.ok) {
      setStudents(res.students ?? []);
      setAssignedTopicId(res.assignedTopicId ?? null);
      setAssignNote(c.assignedNote ?? "");
    } else {
      setNote(res.error ?? null);
      setStudents([]);
    }
  }

  async function reloadRoster() {
    if (!open) return;
    const res = await api.rosterAction(open.id);
    if (res.ok) setStudents(res.students ?? []);
  }

  async function saveAssignment(topicId: string | null) {
    if (!open) return;
    setBusy(true);
    const res = await api.setAssignmentAction(open.id, topicId, assignNote || null);
    setBusy(false);
    if (res.ok) {
      setAssignedTopicId(topicId);
      setClasses((cs) =>
        cs.map((c) => (c.id === open.id ? { ...c, assignedTopicId: topicId, assignedNote: assignNote || null } : c))
      );
      setNote(topicId ? "Assignment saved — students see it on their home screen." : "Assignment cleared.");
    } else setNote(res.error ?? null);
  }

  async function toggleOpen() {
    if (!open) return;
    const next = !open.open;
    const res = await api.setClassOpenAction(open.id, next);
    if (res.ok) {
      setOpen({ ...open, open: next });
      setClasses((cs) => cs.map((c) => (c.id === open.id ? { ...c, open: next } : c)));
    } else setNote(res.error ?? null);
  }

  async function drop(studentId: string) {
    if (!open) return;
    const who = students?.find((s) => s.id === studentId);
    if (!confirm(`Remove ${who?.name ?? "this student"} from the class?`)) return;
    const res = await api.removeStudentAction(open.id, studentId);
    if (res.ok) {
      setStudents((s) => (s ? s.filter((x) => x.id !== studentId) : s));
      setClasses((cs) => cs.map((c) => (c.id === open.id ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c)));
    } else setNote(res.error ?? null);
  }

  /* ---------- groups ---------- */
  async function onMakeGroups() {
    if (!open) return;
    if (groups.length && !confirm("Make new groups? The current groups and their stars will be replaced.")) return;
    setBusy(true);
    const res = await api.makeGroupsAction(open.id, groupCount, groupMode);
    setBusy(false);
    if (!res.ok) { setNote(res.error ?? null); return; }
    setSelected(null);
    await Promise.all([loadGroups(open.id), reloadRoster()]);
    setNote(null);
  }

  /* move a student — from a tap (the selected one) or a drag on desktop */
  async function placeStudent(id: string, groupId: string | null) {
    if (!open) return;
    setSelected(null);
    setStudents((s) => s?.map((x) => (x.id === id ? { ...x, groupId } : x)) ?? s);
    const res = await api.moveToGroupAction(open.id, id, groupId);
    if (!res.ok) { setNote(res.error ?? null); void reloadRoster(); }
  }
  const moveTo = (groupId: string | null) => { if (selected) void placeStudent(selected, groupId); };
  const onDropTo = (groupId: string | null) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) void placeStudent(id, groupId);
  };

  async function star(g: ClassGroup, delta: number) {
    if (!open) return;
    setGroups((gs) => gs.map((x) => (x.id === g.id ? { ...x, stars: Math.max(0, x.stars + delta) } : x)));
    if (delta > 0) { setBumped(g.id); setTimeout(() => setBumped((b) => (b === g.id ? null : b)), 700); }
    const res = await api.updateGroupAction(open.id, g.id, { starsDelta: delta });
    if (!res.ok) { setNote(res.error ?? null); void loadGroups(open.id); }
  }

  async function saveRename() {
    if (!open || !renaming) return;
    const { id, name } = renaming;
    setRenaming(null);
    if (!name.trim()) return;
    setGroups((gs) => gs.map((x) => (x.id === id ? { ...x, name: name.trim() } : x)));
    const res = await api.updateGroupAction(open.id, id, { name });
    if (!res.ok) { setNote(res.error ?? null); void loadGroups(open.id); }
  }

  async function onAddGroup() {
    if (!open) return;
    const res = await api.addGroupAction(open.id);
    if (res.ok && res.group) setGroups((gs) => [...gs, res.group!]);
    else setNote(res.error ?? null);
  }

  async function onDeleteGroup(g: ClassGroup) {
    if (!open || !confirm(`Remove ${g.emoji} ${g.name}? Its members become ungrouped.`)) return;
    setGroups((gs) => gs.filter((x) => x.id !== g.id));
    setStudents((s) => s?.map((x) => (x.groupId === g.id ? { ...x, groupId: null } : x)) ?? s);
    const res = await api.deleteGroupAction(open.id, g.id);
    if (!res.ok) setNote(res.error ?? null);
  }

  async function onClearGroups() {
    if (!open || !confirm("Remove all groups? Students stay in the class.")) return;
    const res = await api.clearGroupsAction(open.id);
    if (res.ok) {
      setGroups([]);
      setStudents((s) => s?.map((x) => ({ ...x, groupId: null })) ?? s);
    } else setNote(res.error ?? null);
  }

  async function resetStars() {
    if (!open || !confirm("Reset every group's stars to 0?")) return;
    setGroups((gs) => gs.map((g) => ({ ...g, stars: 0 })));
    await Promise.all(groups.map((g) => api.updateGroupAction(open.id, g.id, { resetStars: true })));
  }

  /* the random picker: names flicker past, slow down, and land on one */
  function spin(title: string, names: string[], colorOf?: (n: string) => string | undefined) {
    if (!names.length) return;
    if (spinRef.current) clearTimeout(spinRef.current);
    const final = pickOne(names);
    let step = 0;
    const steps = 18 + Math.floor(Math.random() * 6);
    const tick = () => {
      step++;
      const done = step >= steps;
      const shown = done ? final : names[(step + Math.floor(Math.random() * names.length)) % names.length];
      setPicker({ title, names, shown, done, color: colorOf?.(shown) });
      if (!done) spinRef.current = setTimeout(tick, 50 + step * step * 1.1);
    };
    tick();
  }
  function pickStudent(fromGroup?: ClassGroup) {
    const pool = (students ?? []).filter((s) => !fromGroup || s.groupId === fromGroup.id).map((s) => s.name);
    spin(fromGroup ? `${fromGroup.emoji} ${fromGroup.name}` : "Who's next?", pool);
  }
  function pickGroup() {
    spin("Which group?", groups.map((g) => `${g.emoji} ${g.name}`), (n) => groups.find((g) => `${g.emoji} ${g.name}` === n)?.color);
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  /* ---------- competitions ---------- */
  async function refreshComps() {
    if (!open) return;
    const cr = await api.classCompetitionsAction(open.id);
    if (cr.ok) setComps(cr.rows ?? []);
  }

  async function onCreateComp() {
    if (!open || !compName.trim()) return;
    setBusy(true);
    const res = await api.createCompetitionAction(open.id, compName, compLevelId, compMins * 60);
    setBusy(false);
    if (res.ok) {
      setCompName("");
      setNote(null);
      refreshComps();
    } else setNote(res.error ?? null);
  }

  async function onEndComp(id: string) {
    const res = await api.endCompetitionAction(id);
    if (res.ok) refreshComps();
    else setNote(res.error ?? null);
  }

  async function onViewBoard(id: string) {
    const res = await api.competitionBoardAction(id);
    if (res.ok) setBoard({ name: res.name ?? "", rows: res.rows ?? [] });
    else setNote(res.error ?? null);
  }

  const assignedTopic = TOPICS.find((t) => t.id === assignedTopicId);
  const roster = students ?? [];
  const ungrouped = roster.filter((s) => !s.groupId || !groups.some((g) => g.id === s.groupId));
  const standings = [...groups].sort((a, b) => b.stars - a.stars);
  const topStars = standings[0]?.stars ?? 0;
  const groupOf = (id: string | null) => groups.find((g) => g.id === id);
  const selectedName = roster.find((s) => s.id === selected)?.name;

  /* team results for a competition board: the average score of each group's finishers */
  const teamRows = board && groups.length
    ? groups
        .map((g) => {
          const rows = board.rows.filter((r) => roster.find((s) => s.id === r.userId)?.groupId === g.id);
          return { g, n: rows.length, avg: rows.length ? Math.round(rows.reduce((t, r) => t + r.score, 0) / rows.length) : 0 };
        })
        .filter((t) => t.n > 0)
        .sort((a, b) => b.avg - a.avg)
    : [];

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
        {note && (
          <div className="shop-note cls-note" onClick={() => setNote(null)}>{note}</div>
        )}

        {!open ? (
          <>
            <div className="cls-how">
              <div className="cls-how-step"><b>1</b><span>Create a class</span></div>
              <div className="cls-how-step"><b>2</b><span>Students scan the QR code or type the code</span></div>
              <div className="cls-how-step"><b>3</b><span>Make groups, give stars, run competitions</span></div>
            </div>
            <div className="cls-create">
              <input
                className="admin-search"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void onCreate(); }}
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
                  No classes yet. Create one — you&apos;ll get a code and a QR code for your students to join.
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="cls-head">
              <button className="admin-back" onClick={() => { setOpen(null); setStudents(null); setGroups([]); }}>
                ← All classes
              </button>
              <div className="cls-head-main">
                <div className="cls-head-name">{open.name}</div>
                <div className="cls-head-sub">
                  {students?.length ?? "…"} students{groups.length ? ` · ${groups.length} groups` : ""}
                </div>
              </div>
              <button className="btn btn-ghost cls-toggle" onClick={toggleOpen}>
                {open.open ? "🔒 Close to joiners" : "🔓 Reopen"}
              </button>
            </div>

            <div className="cls-invite">
              <div className="cls-invite-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="QR code to join" />
              <div className="cls-invite-body">
                <div className="cls-invite-label">Students join with</div>
                <div className="cls-invite-code mono">{open.joinCode}</div>
                <div className="cls-invite-sub">Scan the QR code, or enter the code under 🏫 Class in the app menu.</div>
                <div className="cls-invite-btns">
                  <button className="cls-chip-btn" onClick={() => setInviteBig(true)}>🖥 Show on screen</button>
                  <button className="cls-chip-btn" onClick={copyLink} disabled={!inviteUrl}>{copied ? "✓ Copied" : "🔗 Copy link"}</button>
                </div>
              </div>
            </div>

            <nav className="cls-tabs" role="tablist">
              {([
                ["groups", "👥 Groups"],
                ["progress", "📊 Progress"],
                ["comps", "🏆 Competitions"],
                ["assign", "📌 Assignment"],
              ] as [Tab, string][]).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={`cls-tab${tab === id ? " on" : ""}`} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </nav>

            {tab === "groups" && (
              <section className="cls-groups">
                {roster.length === 0 && students !== null ? (
                  <div className="admin-empty">
                    Nobody has joined yet. Show the QR code or read out <b className="mono">{open.joinCode}</b> — groups can be made once students are in.
                  </div>
                ) : (
                  <>
                    <div className="cls-make">
                      <div className="cls-make-row">
                        <span className="cls-make-label">Groups</span>
                        <div className="cls-stepper">
                          <button onClick={() => setGroupCount((n) => Math.max(2, n - 1))} aria-label="Fewer groups">−</button>
                          <b className="mono">{groupCount}</b>
                          <button onClick={() => setGroupCount((n) => Math.min(8, n + 1))} aria-label="More groups">+</button>
                        </div>
                        <span className="cls-make-hint">
                          ≈ {Math.max(1, Math.round(roster.length / groupCount))} per group
                        </span>
                      </div>
                      <div className="cls-make-row">
                        <div className="cls-seg" role="radiogroup" aria-label="How to split">
                          <button role="radio" aria-checked={groupMode === "mixed"} className={groupMode === "mixed" ? "on" : ""} onClick={() => setGroupMode("mixed")}>
                            ⚖️ Mixed levels
                          </button>
                          <button role="radio" aria-checked={groupMode === "random"} className={groupMode === "random" ? "on" : ""} onClick={() => setGroupMode("random")}>
                            🎲 Random
                          </button>
                        </div>
                        <button className="btn btn-primary cls-make-go" onClick={onMakeGroups} disabled={busy || !roster.length}>
                          {groups.length ? "🔀 Make new groups" : "✨ Make groups"}
                        </button>
                      </div>
                      <div className="cls-assign-hint">
                        {groupMode === "mixed"
                          ? "Mixed levels: stronger and newer players are dealt out evenly, so every group has a fair chance."
                          : "Random: a fresh shuffle every time."}
                      </div>
                    </div>

                    {groups.length > 0 && (
                      <>
                        <div className="cls-tools">
                          <button className="cls-chip-btn" onClick={() => pickStudent()}>🎲 Pick a student</button>
                          <button className="cls-chip-btn" onClick={pickGroup}>🎯 Pick a group</button>
                          <button className="cls-chip-btn" onClick={() => setBigScreen(true)}>🖥 Big screen</button>
                          <button className="cls-chip-btn" onClick={onAddGroup}>＋ Add group</button>
                          <button className="cls-chip-btn" onClick={resetStars}>↺ Reset stars</button>
                          <button className="cls-chip-btn danger" onClick={onClearGroups}>🗑 Remove groups</button>
                        </div>

                        <div className="cls-standings" aria-label="Team standings">
                          {standings.map((g, i) => (
                            <div key={g.id} className="cls-stand">
                              <span className="cls-stand-rank">{i === 0 && g.stars > 0 ? "👑" : i + 1}</span>
                              <span className="cls-stand-name">{g.emoji} {g.name}</span>
                              <span className="cls-stand-bar"><i style={{ width: `${topStars ? (g.stars / topStars) * 100 : 0}%`, background: g.color }} /></span>
                              <b className="mono">⭐ {g.stars}</b>
                            </div>
                          ))}
                        </div>

                        <div className={`cls-move-hint${selected ? " on" : ""}`}>
                          {selected
                            ? <>Moving <b>{selectedName}</b> — tap a group to put them there. <button onClick={() => setSelected(null)}>Cancel</button></>
                            : "Tip: tap a student, then tap a group to move them. Tap ⭐ to reward a group."}
                        </div>

                        <div className="cls-group-grid">
                          {groups.map((g) => {
                            const members = roster.filter((s) => s.groupId === g.id);
                            return (
                              <div
                                key={g.id}
                                className={`cls-group${selected ? " target" : ""}${bumped === g.id ? " bump" : ""}`}
                                style={{ ["--gc" as string]: g.color }}
                                onClick={() => selected && moveTo(g.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={onDropTo(g.id)}
                              >
                                <div className="cls-group-head">
                                  <span className="cls-group-emoji">{g.emoji}</span>
                                  {renaming?.id === g.id ? (
                                    <input
                                      className="cls-group-rename"
                                      autoFocus
                                      value={renaming.name}
                                      maxLength={30}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setRenaming({ id: g.id, name: e.target.value })}
                                      onBlur={saveRename}
                                      onKeyDown={(e) => { if (e.key === "Enter") void saveRename(); if (e.key === "Escape") setRenaming(null); }}
                                    />
                                  ) : (
                                    <button className="cls-group-name" title="Rename" onClick={(e) => { e.stopPropagation(); setRenaming({ id: g.id, name: g.name }); }}>
                                      {g.name} <span aria-hidden="true">✏️</span>
                                    </button>
                                  )}
                                  <button className="cls-group-x" aria-label={`Remove ${g.name}`} onClick={(e) => { e.stopPropagation(); void onDeleteGroup(g); }}>✕</button>
                                </div>
                                <div className="cls-group-stars">
                                  <button className="minus" aria-label="Take a star" onClick={(e) => { e.stopPropagation(); void star(g, -1); }} disabled={g.stars === 0}>−</button>
                                  <span className="mono">⭐ {g.stars}</span>
                                  <button className="plus" onClick={(e) => { e.stopPropagation(); void star(g, 1); }}>+⭐</button>
                                </div>
                                <div className="cls-group-members">
                                  {members.map((s) => (
                                    <button
                                      key={s.id}
                                      draggable
                                      onDragStart={(e) => e.dataTransfer.setData("text/plain", s.id)}
                                      className={`cls-kid${selected === s.id ? " sel" : ""}`}
                                      onClick={(e) => { e.stopPropagation(); setSelected(selected === s.id ? null : s.id); }}
                                      title={`Level ${s.level} · ${s.stagesCleared} stages`}
                                    >
                                      {s.name}<small>Lv{s.level}</small>
                                    </button>
                                  ))}
                                  {members.length === 0 && <span className="cls-group-empty">Empty — tap a student, then here</span>}
                                </div>
                                <button className="cls-group-pick" onClick={(e) => { e.stopPropagation(); pickStudent(g); }} disabled={!members.length}>
                                  🎲 Pick from this group
                                </button>
                              </div>
                            );
                          })}
                          {ungrouped.length > 0 && (
                            <div className={`cls-group loose${selected ? " target" : ""}`} onClick={() => selected && moveTo(null)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={onDropTo(null)}>
                              <div className="cls-group-head"><span className="cls-group-emoji">🙋</span><span className="cls-group-name static">Not in a group yet</span></div>
                              <div className="cls-group-members">
                                {ungrouped.map((s) => (
                                  <button key={s.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", s.id)}
                                    className={`cls-kid${selected === s.id ? " sel" : ""}`}
                                    onClick={(e) => { e.stopPropagation(); setSelected(selected === s.id ? null : s.id); }}>
                                    {s.name}<small>Lv{s.level}</small>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>
            )}

            {tab === "assign" && (
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
                    onBlur={() => assignedTopicId && saveAssignment(assignedTopicId)}
                    placeholder="Note for the class, e.g. stages 1–3 by Friday"
                    maxLength={140}
                    aria-label="Assignment note"
                  />
                </div>
                <div className="cls-assign-hint">
                  {assignedTopic
                    ? <>Students see this on their home screen. The Progress tab shows stages cleared in <b>{assignedTopic.title}</b>.</>
                    : "Pick a topic and it appears on every student's home screen."}
                </div>
              </div>
            )}

            {tab === "comps" && (
              <div className="cls-assign comp-block">
                <div className="cls-assign-label">New competition</div>
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
                  {groups.length > 0 && " Results also show which group scored best on average."}
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
            )}

            {tab === "progress" && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      {groups.length > 0 && <th>Group</th>}
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
                    {roster.map((s) => {
                      const g = groupOf(s.groupId);
                      return (
                        <tr key={s.id}>
                          <td className="admin-name">{s.name}</td>
                          {groups.length > 0 && <td>{g ? `${g.emoji} ${firstName(g.name)}` : "—"}</td>}
                          <td className="num mono">{s.level}</td>
                          <td className="num mono">{s.gems}</td>
                          <td className="num mono">{s.dailyStreak}</td>
                          <td className="mono">{fmtDate(s.lastActiveDate)}</td>
                          <td className="num mono">{s.stagesCleared}</td>
                          <td className="num mono">{s.puzzlesSolved}</td>
                          {assignedTopic && <td className="num mono">{s.assignedCleared ?? 0}/5</td>}
                          <td className="num mono">
                            {s.dueReviews > 0 ? <span className="cls-due">{s.dueReviews}</span> : "—"}
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
                            <button className="friend-remove" onClick={() => drop(s.id)} aria-label={`Remove ${s.name}`}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                    {students !== null && students.length === 0 && (
                      <tr>
                        <td colSpan={12} className="admin-empty">
                          Nobody has joined yet. Show the QR code or read out <b className="mono">{open.joinCode}</b>.
                        </td>
                      </tr>
                    )}
                    {students === null && (
                      <tr>
                        <td colSpan={12} className="admin-empty">Loading…</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
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
            {teamRows.length > 0 && (
              <div className="cls-team-results">
                <div className="cls-assign-label">Groups · average score</div>
                {teamRows.map((t, i) => (
                  <div key={t.g.id} className="cls-stand">
                    <span className="cls-stand-rank">{i === 0 ? "👑" : i + 1}</span>
                    <span className="cls-stand-name">{t.g.emoji} {t.g.name}</span>
                    <span className="cls-stand-bar"><i style={{ width: `${teamRows[0].avg ? (t.avg / teamRows[0].avg) * 100 : 0}%`, background: t.g.color }} /></span>
                    <b className="mono">{t.avg}</b>
                  </div>
                ))}
              </div>
            )}
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

      {picker && (
        <div className="cls-picker-wrap" onClick={() => picker.done && setPicker(null)}>
          <div className={`cls-picker${picker.done ? " done" : ""}`} style={picker.color ? { ["--gc" as string]: picker.color } : undefined}>
            <div className="cls-picker-title">{picker.title}</div>
            <div className="cls-picker-name">{picker.shown}</div>
            {picker.done && (
              <div className="cls-picker-btns" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-primary" onClick={() => spin(picker.title, picker.names, picker.color ? (n) => groups.find((g) => `${g.emoji} ${g.name}` === n)?.color : undefined)}>🎲 Again</button>
                <button className="btn btn-ghost" onClick={() => setPicker(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {inviteBig && open && (
        <div className="cls-screen" onClick={() => setInviteBig(false)}>
          <div className="cls-screen-invite">
            <div className="cls-screen-title">Join <b>{open.name}</b></div>
            <div className="cls-screen-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div className="cls-screen-code mono">{open.joinCode}</div>
            <div className="cls-screen-sub">Scan with your tablet, or open the app → 🏫 Class → enter the code</div>
            <div className="cls-screen-sub ja">タブレットでQRコードを読みこむか、アプリの 🏫 クラス でコードを入れてね</div>
            <div className="cls-screen-count">👥 {roster.length} joined</div>
          </div>
          <button className="cls-screen-x" onClick={() => setInviteBig(false)}>✕ Close</button>
        </div>
      )}

      {bigScreen && open && (
        <div className="cls-screen">
          <div className="cls-screen-head">
            <b>{open.name}</b>
            <span className="mono">Join: {open.joinCode}</span>
            <button className="cls-chip-btn" onClick={() => pickStudent()}>🎲 Pick a student</button>
            <button className="cls-chip-btn" onClick={pickGroup}>🎯 Pick a group</button>
            <button className="cls-screen-x inline" onClick={() => setBigScreen(false)}>✕ Close</button>
          </div>
          <div className="cls-screen-groups">
            {groups.map((g) => {
              const members = roster.filter((s) => s.groupId === g.id);
              const lead = g.stars > 0 && g.stars === topStars;
              return (
                <div key={g.id} className={`cls-screen-group${bumped === g.id ? " bump" : ""}${lead ? " lead" : ""}`} style={{ ["--gc" as string]: g.color }}>
                  <div className="cls-screen-emoji">{lead ? "👑" : ""}{g.emoji}</div>
                  <div className="cls-screen-gname">{g.name}</div>
                  <div className="cls-screen-stars mono">⭐ {g.stars}</div>
                  <div className="cls-screen-members">{members.map((s) => <span key={s.id}>{firstName(s.name)}</span>)}</div>
                  <button className="cls-screen-plus" onClick={() => star(g, 1)}>+⭐</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
