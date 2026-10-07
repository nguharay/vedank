import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { classByCode, isMember, joinClassroom } from "@/lib/game/classroom";
import { Mascot } from "@/components/game/Mascot";

export const dynamic = "force-dynamic";

/* A class join link — what the QR code on the teacher's screen opens, so
   children don't have to type a code. Like a race invite, joining is a
   decision: the page says which class and teacher, and only the button
   joins. Signed out, the proxy sends you to /login and back here. */
export default async function ClassJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ join?: string }>;
}) {
  const { code } = await params;
  const { join } = await searchParams;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect(`/login?from=/c/${encodeURIComponent(code)}`);

  const cls = await classByCode(code);
  if (!cls) {
    return (
      <Shell title="クラスが見つかりません" titleEn="No class has that code">
        <Link className="btn btn-primary auth-submit" href="/">ホームへ · Home</Link>
      </Shell>
    );
  }
  if (await isMember(userId, cls.id)) redirect("/?class=joined");

  let error: string | undefined;
  if (join === "1") {
    const res = await joinClassroom(userId, code);
    if (res.ok) redirect("/?class=joined");
    error = res.error;
  }

  return (
    <Shell title={`「${cls.name}」に参加しよう`} titleEn={`Join ${cls.name}`} note={error ?? (!cls.open ? "このクラスは今、参加を受け付けていません。 · This class is closed to new joiners." : undefined)}>
      <div className="invite-card">
        <div className="invite-name">🏫 {cls.name}</div>
        <div className="invite-meta">{cls.teacherName} 先生 · teacher</div>
      </div>
      <p className="invite-note">
        参加すると、先生があなたの進み具合を見られます。いつでも退出できます。
        <br />
        <span className="invite-note-en">Your teacher will see your progress. You can leave any time.</span>
      </p>
      {cls.open && (
        <Link className="btn btn-primary auth-submit" href={`/c/${encodeURIComponent(code)}?join=1`}>
          参加する · Join the class
        </Link>
      )}
      <p className="sub" style={{ textAlign: "center", marginTop: 12 }}><Link href="/">← アプリにもどる · Back</Link></p>
    </Shell>
  );
}

function Shell({ title, titleEn, note, children }: { title: string; titleEn: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/vedank-logo.png" alt="" className="auth-logo" />
        <div className="auth-mascot"><Mascot mood="excited" /></div>
        <h1>{title}</h1>
        <p className="sub">{titleEn}</p>
        {note && <div className="auth-error">{note}</div>}
        {children}
      </div>
    </div>
  );
}
