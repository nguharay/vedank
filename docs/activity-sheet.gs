/* VedAnk — player activity, written into the existing registration sheet.
   This is its OWN Apps Script project (script.google.com → New project), so the
   sheet's registration script is never touched.

   Tabs it adds (Registrations / Enquiries stay where they are, first):
     Activity          — every row the app sends (created automatically)
     Activity Summary  — live tables; run setupSummary() once to create it */

const SHEET_ID = 'PASTE_SHEET_ID_HERE';  // the long id in the sheet's link: /spreadsheets/d/<THIS>/edit
const SECRET = 'PASTE_SECRET_HERE';      // the same secret the registration connection uses (SHEET_WEBHOOK_SECRET)
const DATA_TAB = 'Activity';
const SUMMARY_TAB = 'Activity Summary';
const HEADERS = ['Date', 'Time', 'Player', 'Player ID', 'Signed in', 'Event', 'Game', 'Topic', 'Score', 'Stars', 'Detail', 'Device', 'Installed', 'Lang'];

function book() {
  return SHEET_ID && SHEET_ID !== 'PASTE_SHEET_ID_HERE' ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

/* the Activity tab, made right after the first tab (Registrations) if missing */
function dataSheet(ss) {
  let sh = ss.getSheetByName(DATA_TAB);
  if (!sh) {
    sh = ss.insertSheet(DATA_TAB, Math.min(1, ss.getSheets().length));
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#fff2cc');
    sh.setFrozenRows(1);
    sh.setColumnWidth(11, 420);   // Detail
  }
  return sh;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== SECRET) return out({ ok: false, error: 'bad secret' });
    if (String(data.tab || '') !== DATA_TAB) return out({ ok: false, error: 'unknown tab' });
    const rows = Array.isArray(data.rows) ? data.rows.slice(0, 200) : [];
    if (!rows.length) return out({ ok: true });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sh = dataSheet(book());
      const headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String).filter(String);
      let grew = false;
      rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (headers.indexOf(k) < 0) { headers.push(k); grew = true; } }); });
      if (grew) sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      const values = rows.map(function (r) {
        return headers.map(function (h) {
          const v = r[h];
          if (v === undefined || v === null) return '';
          // never let a name or note be read as a formula
          return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
        });
      });
      sh.getRange(sh.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
    } finally {
      lock.releaseLock();
    }
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* Run once (▶ Run → setupSummary). Creates Activity (if needed) and the
   "Activity Summary" tab with live tables. Safe to run again: it rebuilds
   the summary tab only.
   Activity columns: A Date · B Time · C Player · D Player ID · E Signed in ·
   F Event · G Game · H Topic · I Score · J Stars · K Detail · L Device ·
   M Installed · N Lang */
function setupSummary() {
  const ss = book();
  dataSheet(ss);
  let sh = ss.getSheetByName(SUMMARY_TAB);
  if (!sh) sh = ss.insertSheet(SUMMARY_TAB, ss.getSheetByName(DATA_TAB).getIndex());
  sh.clear();
  const A = "Activity!A:N";
  const q = function (query) { return '=IFERROR(QUERY(' + A + ', "' + query + '", 1), "no data yet")'; };
  const blocks = [
    ['A1', '👥 Players per day', '=IFERROR(QUERY(UNIQUE(FILTER({Activity!A2:A, Activity!D2:D}, Activity!F2:F="app_open")), "select Col1, count(Col2) group by Col1 order by Col1 desc label Col1 \'Date\', count(Col2) \'Players\'"), "no data yet")'],
    ['D1', '📱 Visits per day', q("select A, count(F) where F = 'app_open' group by A order by A desc label A 'Date', count(F) 'Visits'")],
    ['G1', '🆕 New devices per day', q("select A, count(F) where F = 'app_open' and K contains 'first_visit=true' group by A order by A desc label A 'Date', count(F) 'New devices'")],
    ['J1', '⏱ Play time per day', q("select A, count(F), sum(I)/60, avg(I)/60 where F = 'visit_end' group by A order by A desc label A 'Date', count(F) 'Sessions', sum(I)/60 'Total minutes', avg(I)/60 'Avg minutes'")],
    ['O1', '🧑 Each player', q("select C, D, count(F), max(A) where F = 'app_open' group by C, D order by count(F) desc label C 'Player', D 'ID', count(F) 'Visits', max(A) 'Last seen'")],
    ['T1', '⏱ Minutes per player', q("select C, D, sum(I)/60 where F = 'visit_end' group by C, D order by sum(I)/60 desc label C 'Player', D 'ID', sum(I)/60 'Total minutes'")],
    ['X1', '🎮 Plays per game', q("select G, count(F) where F = 'game_open' group by G order by count(F) desc label G 'Game', count(F) 'Plays'")],
    ['AA1', '🏆 Finished games', q("select G, count(F), avg(I), max(I), avg(J) where F = 'game_end' group by G order by count(F) desc label G 'Game', count(F) 'Finished', avg(I) 'Avg score', max(I) 'Top score', avg(J) 'Avg stars'")],
    ['AG1', '📚 Lesson stages', q("select H, count(F), avg(J) where F = 'lesson_stage_end' group by H order by count(F) desc label H 'Topic', count(F) 'Stages played', avg(J) 'Avg stars'")],
    ['AK1', '🔔 Notifications sent', q("select A, I, K where F = 'notification_sent' order by A desc label A 'Date', I 'Sent', K 'Message'")],
    ['AO1', '👆 Notification taps', q("select A, count(F) where F = 'notification_open' group by A order by A desc label A 'Date', count(F) 'Taps'")],
    ['AR1', '📲 Installs / 🔔 permissions', q("select F, K, count(F) where F = 'install_result' or F = 'push_permission' group by F, K label F 'What', K 'Result', count(F) 'Count'")],
    ['AV1', '🔒 Guests hitting locked content', q("select A, count(F) where F = 'locked_tap' group by A order by A desc label A 'Date', count(F) 'Locked taps'")],
  ];
  blocks.forEach(function (b) {
    const cell = sh.getRange(b[0]);
    cell.setValue(b[1]).setFontWeight('bold').setFontSize(12);
    cell.offset(1, 0).setFormula(b[2]);
  });
  sh.setFrozenRows(2);
}
