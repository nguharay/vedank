"use client";

import { ClassroomBoard, type ClassroomApi } from "../../classroom/ClassroomBoard";
import type { ClassGroup, ClassStudent, ClassSummary } from "@/lib/game/classroom";

/* An in-memory class standing in for the server, so the board can be tried
   on localhost. Mirrors the server's behaviour closely enough to review. */
const PRESETS = [
  { emoji: "🐯", name: "Tigers · トラ", color: "#F28C28" },
  { emoji: "🐬", name: "Dolphins · イルカ", color: "#2F8FD8" },
  { emoji: "🐸", name: "Frogs · カエル", color: "#3DAA5C" },
  { emoji: "🦄", name: "Unicorns · ユニコーン", color: "#B05CD8" },
  { emoji: "🐼", name: "Pandas · パンダ", color: "#4B5563" },
  { emoji: "🦊", name: "Foxes · キツネ", color: "#E0603A" },
  { emoji: "🐧", name: "Penguins · ペンギン", color: "#1F6FB2" },
  { emoji: "🐝", name: "Bees · ハチ", color: "#D9A400" },
];
const NAMES = ["Haruto", "Yui", "Sota", "Aoi", "Riku", "Hina", "Minato", "Mei", "Ren", "Sakura", "Yuto", "Akari", "Kaito", "Rin"];
const cls: ClassSummary = { id: "c1", name: "5年2組 Vedic Math", joinCode: "MATH7", open: true, assignedTopicId: null, assignedNote: null, memberCount: NAMES.length };
let students: ClassStudent[] = NAMES.map((name, i) => ({
  id: `s${i}`, name, level: 1 + ((i * 7) % 9), gems: 40 + i * 13, dailyStreak: i % 5, lastActiveDate: null,
  stagesCleared: (i * 3) % 17, puzzlesSolved: i % 6, dueReviews: i % 3, weakest: [], assignedCleared: null, groupId: null,
}));
let groups: ClassGroup[] = [];
let gid = 0;
const ok = { ok: true as const };
const wait = () => new Promise((r) => setTimeout(r, 120));

const fake = {
  createClassAction: async () => ({ ok: false, error: "Preview: one class only." }),
  rosterAction: async () => { await wait(); return { ok: true, students: students.map((s) => ({ ...s })), assignedTopicId: null }; },
  setAssignmentAction: async () => ok,
  setClassOpenAction: async () => ok,
  removeStudentAction: async (_c: string, id: string) => { students = students.filter((s) => s.id !== id); return ok; },
  createCompetitionAction: async () => ({ ok: false, error: "Preview: competitions need the database." }),
  classCompetitionsAction: async () => ({ ok: true, rows: [] }),
  endCompetitionAction: async () => ok,
  competitionBoardAction: async () => ({ ok: true, name: "", rows: [] }),
  classGroupsAction: async () => ({ ok: true, groups: groups.map((g) => ({ ...g })) }),
  makeGroupsAction: async (_c: string, count: number, mode: "random" | "mixed") => {
    await wait();
    const n = Math.max(2, Math.min(8, count));
    const order = mode === "mixed" ? [...students].sort((a, b) => b.level - a.level) : [...students].sort(() => Math.random() - 0.5);
    const start = Math.floor(Math.random() * PRESETS.length);
    groups = Array.from({ length: n }, (_, i) => ({ id: `g${++gid}`, stars: 0, sort: i, ...PRESETS[(start + i) % PRESETS.length] }));
    order.forEach((s, i) => {
      const lap = Math.floor(i / n), pos = i % n;
      students = students.map((x) => (x.id === s.id ? { ...x, groupId: groups[lap % 2 === 0 ? pos : n - 1 - pos].id } : x));
    });
    return ok;
  },
  moveToGroupAction: async (_c: string, id: string, g: string | null) => { students = students.map((x) => (x.id === id ? { ...x, groupId: g } : x)); return ok; },
  addGroupAction: async () => {
    const p = PRESETS.find((q) => !groups.some((g) => g.emoji === q.emoji));
    if (!p) return { ok: false, error: "Up to 8 groups." };
    const g = { id: `g${++gid}`, stars: 0, sort: groups.length, ...p };
    groups = [...groups, g];
    return { ok: true, group: g };
  },
  updateGroupAction: async (_c: string, id: string, patch: { name?: string; starsDelta?: number; resetStars?: boolean }) => {
    groups = groups.map((g) => (g.id !== id ? g : {
      ...g,
      name: patch.name?.trim() || g.name,
      stars: patch.resetStars ? 0 : Math.max(0, g.stars + (patch.starsDelta ?? 0)),
    }));
    return { ok: true, group: groups.find((g) => g.id === id) };
  },
  deleteGroupAction: async (_c: string, id: string) => {
    groups = groups.filter((g) => g.id !== id);
    students = students.map((s) => (s.groupId === id ? { ...s, groupId: null } : s));
    return ok;
  },
  clearGroupsAction: async () => { groups = []; students = students.map((s) => ({ ...s, groupId: null })); return ok; },
} as unknown as ClassroomApi;

export function ClassroomPreview() {
  return <ClassroomBoard initialClasses={[cls]} teacherName="Ray先生 (preview)" api={fake} />;
}
