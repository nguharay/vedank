import "server-only";

/* Player activity goes straight to a Google Sheet — no database involved.
   The sheet holds a small Apps Script web app (docs/activity-sheet-setup.md)
   that appends a batch of rows to a tab, creating the tab and its header row
   the first time. It can live in the same sheet as registrations (as its own
   script) and shares that connection's secret unless ACTIVITY_WEBHOOK_SECRET
   is set. Unset ACTIVITY_WEBHOOK_URL and nothing is sent. */

export type SheetRow = Record<string, string | number>;

export function activitySheetOn(): boolean {
  return !!process.env.ACTIVITY_WEBHOOK_URL;
}

export type SheetTab = "Activity" | "Visits" | "Sections";

/* one request, several tabs: { batches: [{ tab, rows }] } */
export async function appendBatches(batches: { tab: SheetTab; rows: SheetRow[] }[]): Promise<boolean> {
  const url = process.env.ACTIVITY_WEBHOOK_URL;
  const live = batches.filter((b) => b.rows.length);
  if (!url || !live.length) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.ACTIVITY_WEBHOOK_SECRET || process.env.SHEET_WEBHOOK_SECRET || "", batches: live }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    if (!res.ok || !/"ok"\s*:\s*true/.test(text)) {
      console.error("[activity] sheet refused:", res.status, text.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[activity] sheet error", e);
    return false;
  }
}

export function appendRows(tab: SheetTab, rows: SheetRow[]): Promise<boolean> {
  return appendBatches([{ tab, rows }]);
}

/* Japan time, as the sheet's readers see it */
export function jst(ms: number): { date: string; time: string } {
  const d = new Date(ms + 9 * 3600_000).toISOString();
  return { date: d.slice(0, 10), time: d.slice(11, 19) };
}
