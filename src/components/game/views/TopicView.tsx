"use client";

import { STAGE_POS } from "../util";
import { BOOK_DIAGRAMS, BOOK_DIAGRAM_EQ, BOOK_DIAGRAMS2, BOOK_DIAGRAM_EQ2, BOOK_MORE, BOOK_BARE_HEADERS, BOOK_INTRO } from "../BookDiagrams";
import { Mascot } from "../Mascot";
import type { UIDict } from "../i18n";
import { DIGIT_ARROW_EX, DIGIT_FLOW_TOPICS } from "./shared";
import type { TopicOverride } from "@/lib/game/overrides";
import { stageBlocker, stageUnlocked, starsForStage, topicProgressOf } from "@/lib/game/state";
import type { ProgressState } from "@/lib/game/state";
import { STAGE_COUNT, TOPICS, TOPIC_BY_ID, gradCss } from "@/lib/game/topics";
import type { Lang, Topic } from "@/lib/game/topics";
import { useState } from "react";

export function DigitArrowSVG({ before, after, lang }: { before: string; after: string; lang: Lang }) {
  const beforeTens = before[0];
  const beforeUnits = before[1];
  const afterTens = after[after.length - 2];
  const afterUnits = after[after.length - 1];
  const tensWord = lang === "ja" ? "十の位" : "tens";
  const unitsWord = lang === "ja" ? "一の位" : "units";
  return (
    <svg viewBox="0 0 300 190" className="digitarrow-svg">
      <text x="14" y="56" className="digitarrow-line">{tensWord} {beforeTens} → {afterTens}</text>
      <text x="14" y="82" className="digitarrow-line">{unitsWord} {beforeUnits} → {afterUnits}</text>

      <text x="172" y="36" className="digitarrow-newdigit" textAnchor="middle">{afterTens}</text>
      <path d="M202,72 H172 V48" className="digitarrow-elbow" fill="none" markerEnd="url(#daArrow)" />
      <text x="214" y="80" className="digitarrow-digit" textAnchor="middle">{beforeTens}</text>
      <text x="240" y="80" className="digitarrow-digit" textAnchor="middle">{beforeUnits}</text>
      <path d="M252,80 H276 V110" className="digitarrow-elbow" fill="none" markerEnd="url(#daArrow)" />
      <text x="276" y="136" className="digitarrow-newdigit" textAnchor="middle">{afterUnits}</text>

      <rect x="48" y="112" width="104" height="44" rx="11" className="digitarrow-ansbox" />
      <text x="100" y="144" className="digitarrow-ansnum" textAnchor="middle">{after}</text>
      <defs>
        <marker id="daArrow" markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" className="digitarrow-elbow" />
        </marker>
      </defs>
    </svg>
  );
}

export function DigitFlowIllus({
  topic,
  rows,
  blurb,
  lang,
}: {
  topic: Topic;
  rows: [string, string][];
  blurb: string;
  lang: Lang;
}) {
  const [eq] = rows[0];
  const tens = rows[1];
  const units = rows[2];
  const [unitsVal, unitsAnswer] = units[1].split("→").map((s) => s.trim());
  const arrowEx = DIGIT_ARROW_EX[topic.id];
  return (
    <div className="bookmethod-wrap">
      <div className="bookmethod-card" style={{ background: `color-mix(in srgb, ${topic.grad[0]} 14%, var(--surface-2))`, borderColor: topic.grad[0] }}>
        <span className="bookmethod-badge" style={{ background: gradCss(topic.grad) }}>{topic.icon}</span>
        <div>
          <div className="bookmethod-title">{lang === "ja" ? "ルール" : "The Rule"}</div>
          <div className="bookmethod-desc">{blurb}</div>
          {arrowEx && (
            <div className="bookmethod-badges">
              <span className="bookmethod-pill plus">{arrowEx.tensLabel} {lang === "ja" ? "十の位" : "tens"}</span>
              <span className="bookmethod-pill minus">{arrowEx.unitsLabel} {lang === "ja" ? "一の位" : "units"}</span>
            </div>
          )}
        </div>
      </div>
      <div className="bookexample-flow-title">
        {lang === "ja" ? (
          <>まずパターンを見つける <span>→</span> それから左から右へ計算</>
        ) : (
          <>Spot the Pattern First <span>→</span> Then Calculate From Left to Right</>
        )}
      </div>
      <div className="bookexample-card">
        <div className="bookexample-header mono" style={{ background: gradCss(topic.grad) }}>
          {lang === "ja" ? "例：" : "Example: "}{arrowEx ? arrowEx.eq : eq}
        </div>
        {arrowEx ? (
          <DigitArrowSVG before={arrowEx.before} after={arrowEx.after} lang={lang} />
        ) : (
          <div className="bookexample-body">
            <div className="bookexample-col">
              <div className="bookexample-col-label">{lang === "ja" ? "手順1・十の位" : "Step 1 · tens"}</div>
              <div className="bookexample-arrow up">▲</div>
              <div className="bookexample-expr mono">{tens[0]}</div>
              <div className="bookexample-val mono">{tens[1]}</div>
            </div>
            <div className="bookexample-col">
              <div className="bookexample-col-label">{lang === "ja" ? "手順2・一の位" : "Step 2 · units"}</div>
              <div className="bookexample-arrow down">▼</div>
              <div className="bookexample-expr mono">{units[0]}</div>
              <div className="bookexample-val mono">{unitsVal}</div>
            </div>
          </div>
        )}
        {!arrowEx && (
          <div className="bookexample-answer mono" style={{ borderColor: topic.grad[0], color: topic.grad[0] }}>{unitsAnswer}</div>
        )}
      </div>
    </div>
  );
}

export function BookMethodCard({
  topic,
  rows,
  rows2,
  blurb,
  lang,
}: {
  topic: Topic;
  rows: [string, string][];
  /* The book's second worked example, where the page has one. */
  rows2?: [string, string][];
  blurb: string;
  lang: Lang;
}) {
  const [eq] = rows[0];
  const bodyRows = rows.slice(1);
  const Diagram = BOOK_DIAGRAMS[topic.id];
  const diagramEq = BOOK_DIAGRAM_EQ[topic.id];
  const Diagram2 = BOOK_DIAGRAMS2[topic.id];
  const more = BOOK_MORE[topic.id] ?? [];
  const intro = BOOK_INTRO[topic.id];
  const bare = BOOK_BARE_HEADERS.has(topic.id);
  const pattern = lang === "ja" ? topic.patternJa : topic.pattern;
  return (
    <div className="bookmethod-wrap">
      {pattern && (
        <div className="bookmethod-card bookpattern-card" style={{ background: `color-mix(in srgb, ${topic.grad[0]} 14%, var(--surface-2))`, borderColor: topic.grad[0] }}>
          <span className="bookmethod-badge bookpattern-badge">✓</span>
          <div>
            <div className="bookmethod-title">{lang === "ja" ? "パターン" : "Pattern"}</div>
            <div className="bookmethod-desc">{pattern}</div>
          </div>
        </div>
      )}
      <div className="bookmethod-card" style={{ background: `color-mix(in srgb, ${topic.grad[0]} 14%, var(--surface-2))`, borderColor: topic.grad[0] }}>
        <span className="bookmethod-badge" style={{ background: gradCss(topic.grad) }}>{topic.icon}</span>
        <div>
          <div className="bookmethod-title">{lang === "ja" ? (topic.methodTitleJa ?? "やり方") : (topic.methodTitle ?? "The Method")}</div>
          <div className="bookmethod-desc">{blurb.replace(/ (Step 2)|(?<=。)(手順2)/, "\n$1$2")}</div>
        </div>
      </div>
      <div className="bookexample-flow-title">
        {lang === "ja" ? (
          <>まずパターンを見つける <span>→</span> それから左から右へ計算</>
        ) : (
          <>Spot the Pattern First <span>→</span> Then Calculate From Left to Right</>
        )}
      </div>
      {intro && (
        <div className="bookexample-card">
          <div className="bookexample-header mono" style={{ background: gradCss(topic.grad) }}>
            {lang === "ja" ? intro.titleJa : intro.title}
          </div>
          <intro.D lang={lang} />
        </div>
      )}
      <div className="bookexample-card">
        <div className="bookexample-header mono" style={{ background: gradCss(topic.grad) }}>
          {bare ? "" : lang === "ja" ? "例：" : "Example: "}{Diagram ? diagramEq! : eq}
        </div>
        {Diagram ? (
          <Diagram lang={lang} />
        ) : (
          <div className="bookexample-list">
            {bodyRows.map((r, i) => (
              <div className="bookexample-list-row mono" key={i}>
                <span>{r[0]}</span>
                <b>{r[1]}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The second Example box. The diagram draws the first, so this one is
          listed out — two diagrams of the same method teach less than one
          diagram and a second set of numbers to follow. */}
      {Diagram2 && (
        <div className="bookexample-card bookexample-second">
          <div className="bookexample-header mono" style={{ background: gradCss(topic.grad) }}>
            {bare ? "" : lang === "ja" ? "例2：" : "Example 2: "}{BOOK_DIAGRAM_EQ2[topic.id]}
          </div>
          <Diagram2 lang={lang} />
        </div>
      )}
      {more.map(({ eq: moreEq, D }, i) => (
        <div className="bookexample-card bookexample-second" key={moreEq}>
          <div className="bookexample-header mono" style={{ background: gradCss(topic.grad) }}>
            {bare ? "" : lang === "ja" ? `例${i + 3}：` : `Example ${i + 3}: `}{moreEq}
          </div>
          <D lang={lang} />
        </div>
      ))}
      {!Diagram2 && rows2 && rows2.length > 1 && (
        <div className="bookexample-card bookexample-second">
          <div className="bookexample-header mono" style={{ background: gradCss(topic.grad) }}>
            {lang === "ja" ? "例2：" : "Example 2: "}{rows2[0][0]}
          </div>
          <div className="bookexample-list">
            {rows2.slice(1).map((r, i) => (
              <div className="bookexample-list-row mono" key={i}>
                <span>{r[0]}</span>
                <b>{r[1]}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopicView({
  topic, lang, t, canEdit = false, override, onSave, onOpenClasses,
}: {
  topic: Topic; lang: Lang; t: UIDict;
  onOpenClasses?: () => void;
  canEdit?: boolean;
  override?: TopicOverride;
  onSave?: (topicId: string, data: TopicOverride) => Promise<boolean>;
}) {
  const ex = topic.example();
  const rows = topic.exSteps(ex, lang);
  const rows2 = topic.example2 ? topic.exSteps(topic.example2(), lang) : undefined;
  const title = lang === "ja" ? topic.titleJa : topic.title;
  const blurb = lang === "ja" ? topic.blurbJa : topic.blurb;
  return (
    <section className="view active">
      <div className="topic-head">
        <div className="icon-badge" style={{ background: gradCss(topic.grad) }}>{topic.icon}</div>
        <h1>{title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8, lineHeight: 1.5, fontWeight: 600 }}>{blurb}</p>
      </div>
      <div className="card">
        <h4>{t.topicView.howItWorks}</h4>
        {DIGIT_FLOW_TOPICS.has(topic.id) ? (
          <DigitFlowIllus topic={topic} rows={rows} blurb={blurb} lang={lang} />
        ) : (
          <BookMethodCard topic={topic} rows={rows} rows2={rows2} blurb={blurb} lang={lang} />
        )}
      </div>

      {canEdit && onSave && <LessonEditor topic={topic} override={override} lang={lang} onSave={onSave} />}

      {/* The line the book's mascot says on this page, in its speech bubble. */}
      {topic.tip && (
        <div className="lesson-tip">
          <div className="lesson-tip-bubble">
            <span className="lesson-tip-ja">{topic.tipJa}</span>
            <span className="lesson-tip-en">{topic.tip}</span>
          </div>
          <div className="lesson-tip-mascot">
            <Mascot mood="excited" />
          </div>
        </div>
      )}

      {onOpenClasses && (
        <div className="classes-cta">
          <span className="classes-cta-badge" aria-hidden="true"><Mascot mood="excited" /></span>
          <div className="classes-cta-text">
            <div className="classes-cta-title">この方法をRay先生と学びたい？</div>
            <div className="classes-cta-sub">日本で対面・オンライン授業あり</div>
          </div>
          <button className="classes-cta-btn" onClick={onOpenClasses}>問い合わせる →</button>
        </div>
      )}
    </section>
  );
}

export function LessonEditor({
  topic, override, lang, onSave,
}: { topic: Topic; override?: TopicOverride; lang: Lang; onSave: (id: string, d: TopicOverride) => Promise<boolean> }) {
  const base = TOPIC_BY_ID[topic.id];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepsJa, setStepsJa] = useState((override?.stepsJa ?? base.stepsJa).join("\n"));
  const [steps, setSteps] = useState((override?.steps ?? base.steps).join("\n"));
  const [tipJa, setTipJa] = useState(override?.tipJa ?? base.tipJa ?? "");
  const [tip, setTip] = useState(override?.tip ?? base.tip ?? "");
  const [blurbJa, setBlurbJa] = useState(override?.blurbJa ?? base.blurbJa);
  const [blurb, setBlurb] = useState(override?.blurb ?? base.blurb);
  const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
  const ja = lang === "ja";

  async function save() {
    setBusy(true);
    /* Send only what differs from the code, so clearing a field restores it. */
    const d: TopicOverride = {};
    if (lines(stepsJa).join("|") !== base.stepsJa.join("|")) d.stepsJa = lines(stepsJa);
    if (lines(steps).join("|") !== base.steps.join("|")) d.steps = lines(steps);
    if (tipJa.trim() !== (base.tipJa ?? "")) d.tipJa = tipJa.trim();
    if (tip.trim() !== (base.tip ?? "")) d.tip = tip.trim();
    if (blurbJa.trim() !== base.blurbJa) d.blurbJa = blurbJa.trim();
    if (blurb.trim() !== base.blurb) d.blurb = blurb.trim();
    const ok = await onSave(topic.id, d);
    setBusy(false);
    if (ok) setOpen(false);
  }
  function reset() {
    setStepsJa(base.stepsJa.join("\n")); setSteps(base.steps.join("\n"));
    setTipJa(base.tipJa ?? ""); setTip(base.tip ?? ""); setBlurbJa(base.blurbJa); setBlurb(base.blurb);
  }

  return (
    <div className="lesson-editor">
      <button className="lesson-editor-toggle" onClick={() => setOpen((o) => !o)}>
        ✏️ {open ? (ja ? "閉じる" : "Close") : (ja ? "このレッスンを編集（管理者）" : "Edit this lesson (admin)")}
        {override && Object.keys(override).length > 0 && <span className="lesson-editor-dot" title="edited" />}
      </button>
      {open && (
        <div className="lesson-editor-form">
          <label>{ja ? "説明（日本語）" : "Blurb (JA)"}<textarea rows={2} value={blurbJa} onChange={(e) => setBlurbJa(e.target.value)} /></label>
          <label>{ja ? "説明（英語）" : "Blurb (EN)"}<textarea rows={2} value={blurb} onChange={(e) => setBlurb(e.target.value)} /></label>
          <label>{ja ? "手順（日本語・1行に1つ）" : "Steps (JA, one per line)"}<textarea rows={4} value={stepsJa} onChange={(e) => setStepsJa(e.target.value)} /></label>
          <label>{ja ? "手順（英語・1行に1つ）" : "Steps (EN, one per line)"}<textarea rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} /></label>
          <label>{ja ? "ひとこと（日本語）" : "Tip (JA)"}<textarea rows={2} value={tipJa} onChange={(e) => setTipJa(e.target.value)} /></label>
          <label>{ja ? "ひとこと（英語）" : "Tip (EN)"}<textarea rows={2} value={tip} onChange={(e) => setTip(e.target.value)} /></label>
          <div className="lesson-editor-actions">
            <button className="btn btn-ghost" onClick={reset} disabled={busy}>{ja ? "元にもどす" : "Reset to default"}</button>
            <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "…" : (ja ? "保存" : "Save")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StageMapView({
  topic,
  progress,
  onPlay,
  lang,
  t,
}: {
  topic: Topic;
  progress: ProgressState;
  onPlay: (n: number) => void;
  lang: Lang;
  t: UIDict;
}) {
  const p = topicProgressOf(progress, topic.id);
  return (
    <section className="view active">
      <div className="stagemap-head">
        <h1 style={{ fontSize: 22 }}>{lang === "ja" ? topic.titleJa : topic.title}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6, fontWeight: 600 }}>
          {t.stageMap.instructions}
        </p>
      </div>
      <div className="stage-track">
        <div className="stage-line" />
        {Array.from({ length: STAGE_COUNT }, (_, k) => k + 1).map((n) => {
          const unlocked = stageUnlocked(progress, topic.id, n);
          const blocker = unlocked ? null : stageBlocker(progress, topic.id, n);
          const blockerTopic = blocker ? TOPICS.find((tp) => tp.id === blocker.topicId) : null;
          const stars = starsForStage(progress, topic.id, n);
          const isCurrent = unlocked && n === p.cleared + 1;
          return (
            <div className={`stage-row pos-${STAGE_POS[(n - 1) % STAGE_POS.length]}`} key={n}>
              <div className="node-wrap">
                {isCurrent && <div className="node-bubble">{t.stageMap.play}</div>}
                <div
                  className={`stage-node${unlocked ? "" : " locked"}${isCurrent ? " current" : ""}`}
                  style={unlocked ? { background: gradCss(topic.grad) } : {}}
                  onClick={() => unlocked && onPlay(n)}
                >
                  {unlocked ? n : "🔒"}
                  {unlocked && (
                    <span className="stars-mini">
                      {[0, 1, 2].map((k) => (
                        <span key={k} className={k < stars ? "on" : "off"}>★</span>
                      ))}
                    </span>
                  )}
                </div>
                {blockerTopic && (
                  <div className="stage-blocked-note">
                    {lang === "ja"
                      ? `先に「${blockerTopic.titleJa}」のステージ${blocker!.stage}をクリア`
                      : `Clear Stage ${blocker!.stage} of ${blockerTopic.title} first`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
