/* The app's public address — every link the app hands out (invites, QR
   codes, class joins, race and tic-tac-toe invites, share cards, link
   previews) uses this, whichever address the player happens to be on. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://game.vedankacademy.com").replace(/\/$/, "");
