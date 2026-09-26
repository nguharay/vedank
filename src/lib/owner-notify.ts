import "server-only";

/* Class enquiries and new registrations go to the owner's Google Sheet: each one
   is posted to a Google Apps Script web app (SHEET_WEBHOOK_URL) that lives in the
   sheet and appends a row to the right tab. Nothing is stored in the app.
   Setup: ~/vedank-sheet-setup.md */

export function ownerSheetEnabled(): boolean {
  return !!process.env.SHEET_WEBHOOK_URL;
}

export async function addOwnerRow(tab: "Enquiries" | "Registrations", row: Record<string, string>): Promise<boolean> {
  const url = process.env.SHEET_WEBHOOK_URL;
  if (!url) {
    console.error("[sheet] SHEET_WEBHOOK_URL not set — row not saved:", tab, row.Email ?? "");
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.SHEET_WEBHOOK_SECRET || "", tab, row }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    if (!res.ok || !/"ok"\s*:\s*true/.test(text)) {
      console.error("[sheet] script refused:", res.status, text.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[sheet] error", e);
    return false;
  }
}
