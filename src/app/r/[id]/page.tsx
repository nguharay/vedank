import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { raceInvite } from "@/lib/game/competition";
import { ensureFriendship } from "@/lib/game/friends";
import { Mascot } from "@/components/game/Mascot";

/* A race invite. Before this, two people had to swap VEDA- codes before they
   could race at all, which is a lot of ceremony for "want a game?".
 
   Joining is a decision, not a side effect: the page says who is inviting you
   and that accepting makes you friends, and only the button does it. Signed
   out, the middleware sends you to /login?from=/r/<id> and the form carries
   you back here. */

export default async function RaceInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ join?: string }>;
}) {
  const { id } = await params;
  const { join } = await searchParams;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect(`/login?from=/r/${encodeURIComponent(id)}`);

  const invite = await raceInvite(id);

  if (!invite.ok) {
    return (
      <Shell title="リンクが見つかりません" titleEn="Invite not found" note={invite.error}>
        <Link className="btn btn-primary auth-submit" href="/">ホームへ · Home</Link>
      </Shell>
    );
  }

  const mine = invite.hostId === userId;

  /* The button posts back with ?join=1 — the befriending happens here, once,
     and never on a bare page view. */
  if (join === "1" && !mine) {
    await ensureFriendship(userId, invite.hostId);
    redirect(`/?race=${encodeURIComponent(id)}`);
  }
  if (mine) redirect(`/?race=${encodeURIComponent(id)}`);

  const ended = invite.status !== "live";

  return (
    <Shell
      title={ended ? "このレースは終了しました" : `${invite.hostName} さんからの挑戦状`}
      titleEn={ended ? "This race has ended" : `${invite.hostName} invited you to a race`}
    >
      <div className="invite-card">
        <div className="invite-name">{invite.name}</div>
        <div className="invite-meta mono">
          {invite.levelName} · {invite.questionCount}問 · {Math.round(invite.durationSec / 60)}分
        </div>
      </div>
      <p className="invite-note">
        全員が同じ問題に挑戦します。参加すると {invite.hostName} さんとフレンドになります。
        <br />
        <span className="invite-note-en">
          Everyone sits the same paper. Joining adds {invite.hostName} to your friends.
        </span>
      </p>
      {ended ? (
        <Link className="btn btn-primary auth-submit" href="/">ホームへ · Home</Link>
      ) : (
        <Link className="btn btn-primary auth-submit" href={`/r/${id}?join=1`}>
          参加する · Join the race
        </Link>
      )}
    </Shell>
  );
}

function Shell({
  title,
  titleEn,
  note,
  children,
}: {
  title: string;
  titleEn: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <img src="/brand/vedank-logo.png" alt="VedAnk Academy" className="auth-logo" />
        <div className="auth-mascot"><Mascot mood="excited" /></div>
        <h1>{title}</h1>
        <p className="sub">{titleEn}</p>
        {note && <div className="auth-error">{note}</div>}
        {children}
      </div>
    </div>
  );
}
