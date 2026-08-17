// Parse ECAP sqlite + schedule xlsx into a JSON payload for the in-container
// loader (load-payload.mjs). No DB access. Run on the laptop where the ECAP
// sqlite and schedule files live:
//   ECAP_SQLITE=... SCHEDULE_XLSX=... PROGRAM_ID=3 TERM=4 OUT=mba.json node scripts/export-ecap.mjs
//
// Schedule-cell mapping rules (learned from the MBA11/HHM03 Term-IV files):
//   - a cell may hold SEVERAL courses separated by newlines — each line maps alone
//   - a line that is itself a time range ("17:00-18:30") re-slots the lines after it
//   - "(Sec A)" / "(SecB)" suffixes are stripped and kept as the session's section
//   - "&" ≡ "and"; ECAP "Track-X-YZ " name prefixes are ignored for matching
//   - when two ECAP courses normalise to the same name, the one students actually
//     opted (PENDING selections) wins; a tie ships sessions to BOTH and warns
//   - every non-holiday line that fails to map is REPORTED and fails the export
//     (EXPORT_ALLOW_UNMATCHED=1 downgrades that to a warning)
import Database from "better-sqlite3";
import xlsx from "xlsx";
import { writeFileSync } from "node:fs";

const ECAP = process.env.ECAP_SQLITE;
const XLSX_PATH = process.env.SCHEDULE_XLSX;
const PROGRAM_ID = Number(process.env.PROGRAM_ID || 1);
const TERM = Number(process.env.TERM) || 4; // NB: bare TERM inherits the terminal type from the shell — never trust it as a string
const OUT = process.env.OUT || "payload.json";
const PROGRAM_NAME = { 1: "DBM", 2: "HHM", 3: "MBA" }[PROGRAM_ID] || "DBM";

if (!ECAP || !XLSX_PATH) { console.error("Set ECAP_SQLITE and SCHEDULE_XLSX"); process.exit(1); }
const norm = (s) => (s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
const stripTrack = (s) => s.replace(/^\s*track\s*-?\s*[ivx]+\s*-?\s*[a-z]{2,4}\s+/i, "");
const SLOT_RE = /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/;
const SEC_RE = /\s*\(\s*sec\s*([a-z])\s*\)\s*$/i;
// schedule text → ECAP catalog name, for spellings norm() can't bridge
const ALIASES = { customerrelationshipmanagement: "crm", cusomerrelationshipmanagement: "crm" };
// non-course lines we expect and silently ignore (holidays etc. are all-caps already)
const IGNORE = new Set(["quizslot", "quizslots"]);

const db = new Database(ECAP, { readonly: true });
const courses = db.prepare(`
  SELECT DISTINCT cm.code, cm.name, cm.credits
  FROM ecap_config_courseoffering co
  JOIN academic_mirror_coursemaster cm ON cm.id = co.course_id
  JOIN ecap_config_electivecycle ec ON ec.id = co.cycle_id
  WHERE ec.program_id = ? AND ec.term_number = ?`).all(PROGRAM_ID, TERM);

const students = db.prepare(`
  SELECT DISTINCT sm.student_id, sm.name, sm.email
  FROM academic_mirror_studentmaster sm
  JOIN ecap_runtime_studentcourseselection sc ON sc.student_id = sm.id
  JOIN ecap_config_electivecycle ec ON ec.id = sc.cycle_id
  WHERE ec.program_id = ? AND ec.term_number = ? AND sm.program_id = ?`).all(PROGRAM_ID, TERM, PROGRAM_ID);

const sels = db.prepare(`
  SELECT sm.student_id, cm.code
  FROM ecap_runtime_studentcourseselection sc
  JOIN academic_mirror_studentmaster sm ON sm.id = sc.student_id
  JOIN ecap_config_electivecycle ec ON ec.id = sc.cycle_id
  JOIN ecap_config_courseoffering co ON co.id = sc.offering_id
  JOIN academic_mirror_coursemaster cm ON cm.id = co.course_id
  WHERE ec.program_id = ? AND ec.term_number = ? AND sc.status = 'PENDING'`).all(PROGRAM_ID, TERM);

// name index: exact names first, track-stripped as fallback; ties prefer opted courses
const optedCount = new Map();
for (const s of sels) optedCount.set(s.code, (optedCount.get(s.code) ?? 0) + 1);
const index = new Map(); // norm name -> [codes]
const addKey = (key, code) => { if (!key) return; const arr = index.get(key) ?? []; if (!arr.includes(code)) arr.push(code); index.set(key, arr); };
for (const c of courses) addKey(norm(c.name), c.code);
for (const c of courses) addKey(norm(stripTrack(c.name)), c.code);
const resolve = (line) => {
  let key = norm(line);
  key = ALIASES[key] ?? key;
  const cands = index.get(key) ?? [];
  if (cands.length <= 1) return cands;
  const opted = cands.filter((c) => (optedCount.get(c) ?? 0) > 0);
  return opted.length ? opted : cands; // ties: all opted candidates get the session
};

const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const grid = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd" });
const header = grid[0];
const slotCols = {};
header.forEach((h, i) => { if (typeof h === "string" && SLOT_RE.test(h.trim())) slotCols[i] = h.trim(); });
const hasLower = (s) => /[a-z]/.test(s);

const sessions = [];
const unmatched = new Map();
const seen = new Set(); // code|date|slot|section dedupe inside the file
for (let i = 1; i < grid.length; i++) {
  const row = grid[i]; if (!row) continue;
  const dcell = row[0];
  let date = null;
  if (dcell instanceof Date) date = dcell;
  else if (typeof dcell === "string") {
    const s = dcell.trim();
    let m;
    if ((m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/))) date = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }
  if (!date) continue;
  const profRow = grid[i + 1] || [];
  for (const [ci, colSlot] of Object.entries(slotCols)) {
    const cell = row[ci];
    if (!cell) continue;
    let slot = colSlot;
    for (let line of String(cell).split(/\n+/)) {
      line = line.trim();
      if (!line || !hasLower(line)) continue;           // holidays/exams are all-caps
      if (SLOT_RE.test(line)) { slot = line.replace(/\s/g, ""); continue; } // in-cell reslot
      let section = "";
      const sm = line.match(SEC_RE);
      if (sm) { section = sm[1].toUpperCase(); line = line.replace(SEC_RE, ""); }
      if (IGNORE.has(norm(line))) continue;
      const codes = resolve(line);
      if (codes.length === 0) { unmatched.set(line, (unmatched.get(line) ?? 0) + 1); continue; }
      if (codes.length > 1) console.warn(`ambiguous "${line}" -> ${codes.join(",")} (sessions created for each)`);
      for (const code of codes) {
        const k = `${code}|${date.toISOString()}|${slot}|${section}`;
        if (seen.has(k)) continue;
        seen.add(k);
        sessions.push({ code, date: date.toISOString(), slot, section, professor: (profRow[ci] || "").toString().trim() || null });
      }
    }
  }
}

// ---- coverage report ----
const perCourse = new Map();
for (const s of sessions) perCourse.set(s.code, (perCourse.get(s.code) ?? 0) + 1);
console.log(`\n${PROGRAM_NAME} term ${TERM}: ${courses.length} courses, ${students.length} students, ${sels.length} selections, ${sessions.length} sessions`);
console.log(`courses with sessions: ${perCourse.size}/${courses.length}`);
for (const c of courses) {
  const n = perCourse.get(c.code) ?? 0;
  const opted = optedCount.get(c.code) ?? 0;
  if (n === 0) console.log(`  NO SESSIONS: ${c.code} ${c.name} (${opted} opted)`);
}
if (unmatched.size) {
  console.error(`\nUNMATCHED schedule lines (${unmatched.size}):`);
  for (const [l, n] of unmatched) console.error(`  ${n}× ${l}`);
  if (!process.env.EXPORT_ALLOW_UNMATCHED) { console.error("Refusing to export — fix mapping or set EXPORT_ALLOW_UNMATCHED=1"); process.exit(1); }
}

writeFileSync(OUT, JSON.stringify({ program: PROGRAM_NAME, term: TERM, courses, students, sels, sessions }));
console.log(`wrote ${OUT}`);
