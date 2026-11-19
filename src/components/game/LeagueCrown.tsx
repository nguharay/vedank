/* The League champion's crown, for whoever is #1. Drawn by hand like the
   Daily Challenge crown, but a grander kind: five tall gold points over a
   purple velvet cap, pearls on the tips and a jewelled band. */
export function LeagueCrown({ ja }: { ja: boolean }) {
  const points = "M3.6 16 L2.4 7.2 L5.6 11.2 L7.4 4.6 L10.1 10.4 L12.5 2.4 L14.9 10.4 L17.6 4.6 L19.4 11.2 L22.6 7.2 L21.4 16 Z";
  const band = "M3.4 15.6 Q12.5 14 21.6 15.6 L21.2 21.4 Q12.5 22.8 3.8 21.4 Z";
  return (
    <svg className="lb-crown" viewBox="0 0 25 24" width="25" height="24" role="img" aria-label={ja ? "王冠：リーグ1位" : "Crown: #1 in the League"}>
      <path d="M4.4 15.4 Q4.6 6.8 12.5 6.4 Q20.4 6.8 20.6 15.4 Z" fill="#8A4FD8" stroke="#1d1b33" strokeWidth="1" strokeLinejoin="round" />
      <path d={points} fill="#FFC83D" stroke="#1d1b33" strokeWidth="1.3" strokeLinejoin="round" />
      <path d={points} fill="none" stroke="#1d1b33" strokeWidth=".6" opacity=".4" transform="translate(.4 .3) rotate(-1.2 12 10)" />
      <path d={band} fill="#F5A623" stroke="#1d1b33" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 17.2 Q7.2 16.5 9 17" fill="none" stroke="#fff" strokeWidth=".9" strokeLinecap="round" opacity=".8" />
      <circle cx="2.4" cy="7.2" r="1.3" fill="#fff" stroke="#1d1b33" strokeWidth=".7" />
      <circle cx="7.4" cy="4.6" r="1.3" fill="#fff" stroke="#1d1b33" strokeWidth=".7" />
      <circle cx="12.5" cy="2.2" r="1.5" fill="#fff" stroke="#1d1b33" strokeWidth=".7" />
      <circle cx="17.6" cy="4.6" r="1.3" fill="#fff" stroke="#1d1b33" strokeWidth=".7" />
      <circle cx="22.6" cy="7.2" r="1.3" fill="#fff" stroke="#1d1b33" strokeWidth=".7" />
      <circle cx="7.2" cy="18.6" r="1.2" fill="#36C98B" stroke="#1d1b33" strokeWidth=".7" />
      <path d="M12.5 16.6 L13.9 18.6 L12.5 20.6 L11.1 18.6 Z" fill="#FF5A7A" stroke="#1d1b33" strokeWidth=".7" strokeLinejoin="round" />
      <circle cx="17.8" cy="18.6" r="1.2" fill="#4FA3FF" stroke="#1d1b33" strokeWidth=".7" />
    </svg>
  );
}
