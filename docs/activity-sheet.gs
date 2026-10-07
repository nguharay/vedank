/* VedAnk — player activity, written into the existing registration sheet.
   This is its OWN Apps Script project (script.google.com → New project), so the
   sheet's registration script is never touched.

   Tabs it adds (Registrations / Enquiries stay where they are, first):
     Activity          — every row the app sends (created automatically)
     Visits            — one row per visit: who, when (JST), how long, and every
                         section in order with the time and score on each
     Sections          — one row per section of each visit (for sorting/filters)
     Players           — one row per player: their registration details joined
                         with everything they did; rebuilt every hour
     Activity Summary  — live tables
   Run setupSummary() once: it makes the tabs and the hourly Players update. */

const SHEET_ID = 'PASTE_SHEET_ID_HERE';  // the long id in the sheet's link: /spreadsheets/d/<THIS>/edit
const SECRET = 'PASTE_SECRET_HERE';      // the same secret the registration connection uses (SHEET_WEBHOOK_SECRET)
const DATA_TAB = 'Activity';
const SUMMARY_TAB = 'Activity Summary';
const PLAYERS_TAB = 'Players';
const VISITS_TAB = 'Visits';
const SECTIONS_TAB = 'Sections';
const VISIT_HEADERS = ['Date', 'Start', 'End', 'Player', 'Player ID', 'Email', 'Signed in', 'Visit #', 'Minutes', 'Sections',
  'Games finished', 'Visit details', 'Device', 'OS', 'Browser', 'Installed', 'Lang'];
const SECTION_HEADERS = ['Date', 'Visit start', 'Player', 'Player ID', 'Email', 'Visit #', 'Order', 'Section', 'Area',
  'Seconds', 'Time', 'Result'];
const ALL_TABS = {};
ALL_TABS[DATA_TAB] = null; ALL_TABS[VISITS_TAB] = VISIT_HEADERS; ALL_TABS[SECTIONS_TAB] = SECTION_HEADERS;
// new columns only ever go on the end, so the summary formulas (A–N) keep working
const HEADERS = ['Date', 'Time', 'Player', 'Player ID', 'Signed in', 'Event', 'Game', 'Topic', 'Score', 'Stars', 'Detail', 'Device', 'Installed', 'Lang',
  'Email', 'OS', 'Browser', 'Screen', 'Timezone', 'Device ID'];

function book() {
  return SHEET_ID && SHEET_ID !== 'PASTE_SHEET_ID_HERE' ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

/* the registration tab: the first whose name starts with "Regist", else the first tab */
function regTab(ss) {
  return ss.getSheets().filter(function (sh) { return /^regist/i.test(sh.getName()); })[0] || ss.getSheets()[0];
}

/* put our tabs, in order, straight after Registrations */
function arrangeTabs(ss) {
  let pos = regTab(ss).getIndex();   // 1-based; ours go after it
  [DATA_TAB, VISITS_TAB, SECTIONS_TAB, PLAYERS_TAB, SUMMARY_TAB].forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(Math.min(pos + 1, ss.getSheets().length));
    pos = sh.getIndex();
  });
  ss.setActiveSheet(regTab(ss));
}

/* a data tab by name, made (with its header row) after Registrations if missing */
function tabFor(ss, name) {
  if (name === DATA_TAB) return dataSheet(ss);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name, ss.getSheets().length);
    const h = ALL_TABS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground(name === VISITS_TAB ? '#cfe2f3' : '#ead1dc');
    sh.setFrozenRows(1);
    if (name === VISITS_TAB) sh.setColumnWidth(12, 700);   // Visit details
    if (name === SECTIONS_TAB) sh.setColumnWidth(8, 320);  // Section
  }
  return sh;
}

/* append rows to a tab, matching columns by header name */
function appendTo(sh, rows) {
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
}

/* If this visit # for this player is already in the last rows of Visits,
   extend that row (end time, minutes, sections, details) and return true.
   `offsets` remembers how far the section numbering had got, for Sections. */
function mergeVisit(sh, r, offsets) {
  if (!r['Visit #'] || sh.getLastRow() < 2) return false;
  const width = sh.getLastColumn();
  const H = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
  const from = Math.max(2, sh.getLastRow() - 300);
  const block = sh.getRange(from, 1, sh.getLastRow() - from + 1, width).getValues();
  const ci = function (h) { return H.indexOf(h); };
  for (let i = block.length - 1; i >= 0; i--) {
    const row = block[i];
    if (String(row[ci('Player ID')]) !== String(r['Player ID']) || Number(row[ci('Visit #')]) !== Number(r['Visit #'])) continue;
    const had = Number(row[ci('Sections')]) || 0;
    offsets[r['Player ID'] + '|' + r['Visit #']] = { order: had, start: row[ci('Start')], date: row[ci('Date')] };
    const more = String(r['Visit details'] || '').split('  |  ').filter(String).map(function (part, k) {
      return part.replace(/^\d+\.\s*/, (had + k + 1) + '. ');
    });
    row[ci('End')] = r['End'];
    row[ci('Minutes')] = Math.round(((Number(row[ci('Minutes')]) || 0) + (Number(r['Minutes']) || 0)) * 10) / 10;
    row[ci('Sections')] = had + (Number(r['Sections']) || 0);
    row[ci('Games finished')] = (Number(row[ci('Games finished')]) || 0) + (Number(r['Games finished']) || 0);
    const before = String(row[ci('Visit details')] || '');
    row[ci('Visit details')] = [before].concat(more).filter(String).join('  |  ').slice(0, 45000);
    sh.getRange(from + i, 1, 1, width).setValues([row]);
    return true;
  }
  return false;
}

/* the Activity tab, made right after Registrations if missing */
function dataSheet(ss) {
  let sh = ss.getSheetByName(DATA_TAB);
  if (!sh) {
    sh = ss.insertSheet(DATA_TAB, regTab(ss).getIndex());
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
    // either { tab, rows } or { batches: [{ tab, rows }, …] }
    const batches = Array.isArray(data.batches) ? data.batches : [{ tab: data.tab, rows: data.rows }];
    for (let i = 0; i < batches.length; i++) {
      if (!(String(batches[i].tab || '') in ALL_TABS)) return out({ ok: false, error: 'unknown tab ' + batches[i].tab });
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ss = book();
      // a visit that carries on (same player, same visit #) merges into its row
      const offsets = {};
      batches.forEach(function (b) {
        let rows = Array.isArray(b.rows) ? b.rows.slice(0, 300) : [];
        if (String(b.tab) === VISITS_TAB) rows = rows.filter(function (r) { return !mergeVisit(tabFor(ss, VISITS_TAB), r, offsets); });
        if (String(b.tab) === SECTIONS_TAB) rows.forEach(function (r) {
          const o = offsets[r['Player ID'] + '|' + r['Visit #']];
          if (o) { r['Order'] = Number(r['Order'] || 0) + o.order; r['Visit start'] = o.start; r['Date'] = o.date; }
        });
        if (rows.length) appendTo(tabFor(ss, String(b.tab)), rows);
      });
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
  tabFor(ss, VISITS_TAB);
  tabFor(ss, SECTIONS_TAB);
  buildPlayers();
  // rebuild the Players tab every hour (once; running setup again won't duplicate it)
  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'buildPlayers'; })) {
    ScriptApp.newTrigger('buildPlayers').timeBased().everyHours(1).create();
  }
  dataSheet(ss).getRange('A:A').setNumberFormat('yyyy-mm-dd');
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
    ['AY1', '🧭 Time per section (all visits)', '=IFERROR(QUERY(Sections!A:L, "select H, I, count(H), sum(J)/60, avg(J) where H is not null group by H, I order by sum(J)/60 desc label H \'Section\', I \'Area\', count(H) \'Times visited\', sum(J)/60 \'Total minutes\', avg(J) \'Avg seconds\'", 1), "no data yet")'],
    ['BE1', '🗓 Visits (latest first)', '=IFERROR(QUERY(Visits!A:L, "select A, B, D, I, L where A is not null order by A desc, B desc limit 200 label A \'Date\', B \'Start\', D \'Player\', I \'Minutes\', L \'Sections\'", 1), "no data yet")'],
    ['AV1', '🔒 Guests hitting locked content', q("select A, count(F) where F = 'locked_tap' group by A order by A desc label A 'Date', count(F) 'Locked taps'")],
  ];
  blocks.forEach(function (b) {
    const cell = sh.getRange(b[0]);
    cell.setValue(b[1]).setFontWeight('bold').setFontSize(12);
    cell.offset(1, 0).setFormula(b[2]);
  });
  sh.setFrozenRows(2);
  // QUERY returns dates as plain numbers — show those columns as dates
  ['A', 'D', 'G', 'J', 'R', 'AK', 'AO', 'AV', 'BE'].forEach(function (c) { sh.getRange(c + '3:' + c).setNumberFormat('yyyy-mm-dd'); });
  sh.getRange('BF3:BF').setNumberFormat('hh:mm');                                   // visit start time
  ['L', 'M', 'V', 'BB', 'BH'].forEach(function (c) { sh.getRange(c + '3:' + c).setNumberFormat('0.0'); });   // minutes
  ['AC', 'AD', 'BC'].forEach(function (c) { sh.getRange(c + '3:' + c).setNumberFormat('0'); });             // scores, seconds
  ['AE', 'AI'].forEach(function (c) { sh.getRange(c + '3:' + c).setNumberFormat('0.0'); });                 // average stars
  arrangeTabs(ss);
}

/* ---------- Players: one row per player, details + everything they did ----------
   Reads the Activity tab and the registration tab (the first tab whose name
   starts with "Regist", else the first tab), joins them on email, and writes
   plain values — fast to open, easy to filter and sort. */
function buildPlayers() {
  const ss = book();
  const act = ss.getSheetByName(DATA_TAB);
  if (!act || act.getLastRow() < 2) return;
  const rows = act.getDataRange().getValues();
  const H = rows.shift().map(String);
  const col = function (name) { return H.indexOf(name); };
  const c = { date: col('Date'), time: col('Time'), player: col('Player'), id: col('Player ID'), signed: col('Signed in'), ev: col('Event'),
    game: col('Game'), topic: col('Topic'), score: col('Score'), stars: col('Stars'), detail: col('Detail'), device: col('Device'),
    installed: col('Installed'), lang: col('Lang'), email: col('Email'), os: col('OS'), browser: col('Browser'), dev: col('Device ID'),
    screen: col('Screen'), tz: col('Timezone') };
  const get = function (r, k) { return c[k] >= 0 ? r[c[k]] : ''; };
  // dates/times in the sheet are read in the sheet's own timezone, so format them in it too
  const tz = ss.getSpreadsheetTimeZone();
  const day = function (v) { return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v || ''); };

  // registration details by email
  const regSheet = regTab(ss);
  const reg = {};
  if (regSheet && regSheet.getLastRow() > 1) {
    const rv = regSheet.getDataRange().getValues();
    const rh = rv.shift().map(String);
    const ei = rh.findIndex(function (h) { return /e-?mail/i.test(h); });
    if (ei >= 0) rv.forEach(function (r) {
      const e = String(r[ei] || '').trim().toLowerCase();
      if (e) { const o = {}; rh.forEach(function (h, i) { o[h] = r[i]; }); reg[e] = o; }
    });
  }

  const P = {};
  rows.forEach(function (r) {
    const id = String(get(r, 'id') || '');
    if (!id) return;
    const p = P[id] || (P[id] = {
      id: id, name: get(r, 'player'), email: '', signed: 'no', first: '', last: '', days: {}, visits: 0, secs: 0,
      opened: 0, finished: 0, perGame: {}, best: {}, stages: 0, starSum: 0, starN: 0, lessons: {}, daily: 0,
      taps: 0, installed: 'no', devices: {}, os: {}, browsers: {}, lang: '', chests: 0, locked: 0, demos: 0, sources: {},
      devIds: {}, screens: {}, tz: '', newDevice: false,
    });
    const d = day(get(r, 'date'));
    const t = get(r, 'time') instanceof Date ? Utilities.formatDate(get(r, 'time'), tz, 'HH:mm') : String(get(r, 'time') || '').replace(/^(\d):/, '0$1:').slice(0, 5);
    const stamp = d + ' ' + t;
    if (!p.first || stamp < p.first) p.first = stamp;
    if (!p.last || stamp > p.last) p.last = stamp;
    p.days[d] = 1;
    if (get(r, 'email')) p.email = String(get(r, 'email')).toLowerCase();
    if (get(r, 'signed') === 'yes') p.signed = 'yes';
    if (get(r, 'installed') === 'yes') p.installed = 'yes';
    if (get(r, 'device')) p.devices[get(r, 'device')] = 1;
    if (get(r, 'os')) p.os[get(r, 'os')] = 1;
    if (get(r, 'browser')) p.browsers[get(r, 'browser')] = 1;
    if (get(r, 'lang')) p.lang = get(r, 'lang');
    const dv = String(get(r, 'dev') || '');
    if (dv && dv !== 'push') p.devIds[dv] = 1;
    if (get(r, 'screen')) p.screens[get(r, 'screen')] = 1;
    if (get(r, 'tz')) p.tz = get(r, 'tz');
    const ev = get(r, 'ev'), g = String(get(r, 'game') || ''), sc = Number(get(r, 'score')) || 0, st = get(r, 'stars');
    if (ev === 'app_open') {
      p.visits++;
      const m = /source=(\S+)/.exec(String(get(r, 'detail')));
      if (m) p.sources[m[1]] = 1;
      if (/first_visit=true/.test(String(get(r, 'detail')))) p.newDevice = true;
    } else if (ev === 'visit_end') p.secs += sc;
    else if (ev === 'game_open') { p.opened++; p.perGame[g] = (p.perGame[g] || 0) + 1; }
    else if (ev === 'game_end') {
      p.finished++;
      // for "secs" and "turns" games lower is better; everything else higher
      const lower = /unit=(secs|turns)/.test(String(get(r, 'detail')));
      if (!(g in p.best) || (lower ? sc < p.best[g] : sc > p.best[g])) p.best[g] = sc;
    }
    else if (ev === 'lesson_stage_end') {
      p.stages++; if (st !== '') { p.starSum += Number(st) || 0; p.starN++; }
      if (get(r, 'topic')) p.lessons[get(r, 'topic')] = 1;
    }
    else if (ev === 'daily_done') p.daily++;
    else if (ev === 'notification_open') p.taps++;
    else if (ev === 'chest_open') p.chests++;
    else if (ev === 'locked_tap') p.locked++;
    else if (ev === 'demo_view') p.demos++;
  });

  const keys = function (o) { return Object.keys(o).filter(String).join(', '); };

  /* guests who later signed up: a guest and an account seen on the same device */
  const guestByDevice = {};
  Object.keys(P).forEach(function (k) {
    const p = P[k];
    if (p.signed === 'yes') return;
    Object.keys(p.devIds).forEach(function (d) { guestByDevice[d] = p; });
  });
  const convertedGuests = {};
  const regCols = ['Name', 'Username', 'Country', 'Phone', 'Language'];
  const header = ['Player', 'Player ID', 'Signed in', 'Email'].concat(regCols.map(function (h) { return 'Reg: ' + h; })).concat([
    'Registered', 'First seen', 'Last seen', 'Days active', 'Visits', 'Minutes played', 'Avg min / visit',
    'Games opened', 'Games finished', 'Favourite game', 'Plays per game', 'Best scores', 'Lesson stages', 'Avg lesson stars',
    'Topics played', 'Daily challenges', 'Notification taps', 'Chests opened', 'Demos watched', 'Locked taps (guest)',
    'Installed app', 'Devices', 'OS', 'Browsers', 'Screens', 'Timezone', 'App language', 'Came from',
    'Type', 'Guest before sign-up', 'Signed up later as']);
  const out = Object.keys(P).map(function (k) {
    const p = P[k];
    const r = reg[p.email] || {};
    const regTime = r['Timestamp'] || r['Time'] || r['Date'] || r['Registered'] || r['Created'] || '';
    const fav = Object.keys(p.perGame).sort(function (a, b) { return p.perGame[b] - p.perGame[a]; })[0] || '';
    const mins = Math.round(p.secs / 6) / 10;
    let wasGuest = '';
    if (p.signed === 'yes') {
      const g = Object.keys(p.devIds).map(function (d) { return guestByDevice[d]; }).filter(Boolean)[0];
      if (g) { wasGuest = 'yes — ' + g.id + ' since ' + g.first; convertedGuests[g.id] = p.name; }
    }
    return [p.name, p.id, p.signed, p.email].concat(regCols.map(function (h) { return r[h] === undefined ? '' : r[h]; })).concat([
      regTime, p.first, p.last, Object.keys(p.days).length, p.visits, mins, p.visits ? Math.round((mins / p.visits) * 10) / 10 : 0,
      p.opened, p.finished, fav,
      Object.keys(p.perGame).map(function (g) { return g + ' ' + p.perGame[g]; }).join(', '),
      Object.keys(p.best).map(function (g) { return g + ' ' + p.best[g]; }).join(', '),
      p.stages, p.starN ? Math.round((p.starSum / p.starN) * 10) / 10 : '', keys(p.lessons), p.daily, p.taps, p.chests, p.demos, p.locked,
      p.installed, keys(p.devices), keys(p.os), keys(p.browsers), keys(p.screens), p.tz, p.lang, keys(p.sources),
      p.signed === 'yes' ? 'Member' : (p.newDevice ? 'Guest (new)' : 'Guest'), wasGuest, '']).map(function (v) {
        return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
      });
  }).sort(function (a, b) { return String(b[header.indexOf('Last seen')]).localeCompare(String(a[header.indexOf('Last seen')])); });

  // fill "Signed up later as" on the guests who became members
  const idCol = header.indexOf('Player ID'), laterCol = header.indexOf('Signed up later as');
  out.forEach(function (row) { if (convertedGuests[row[idCol]]) row[laterCol] = convertedGuests[row[idCol]]; });

  let sh = ss.getSheetByName(PLAYERS_TAB);
  if (!sh) sh = ss.insertSheet(PLAYERS_TAB, ss.getSheetByName(DATA_TAB).getIndex());
  sh.clear();
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#d9ead3');
  if (out.length) sh.getRange(2, 1, out.length, header.length).setValues(out);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  sh.getRange(1, header.length + 2).setValue('Updated ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm') + ' JST (every hour)');
}
