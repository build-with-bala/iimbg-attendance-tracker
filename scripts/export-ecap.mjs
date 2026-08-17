// Parse ECAP sqlite + schedule xlsx into a JSON payload for
// the in-container loader. Same parsing rules as seed.mjs, no DB access.
//   ECAP_SQLITE=... SCHEDULE_XLSX=... PROGRAM_ID=3 TERM=4 OUT=mba.json node scripts/_export-ecap.mjs
import Database from "better-sqlite3";
import xlsx from "xlsx";
import { writeFileSync } from "node:fs";

const ECAP = process.env.ECAP_SQLITE;
const XLSX_PATH = process.env.SCHEDULE_XLSX;
const PROGRAM_ID = Number(process.env.PROGRAM_ID || 1);
const TERM = Number(process.env.TERM || 4);
const OUT = process.env.OUT || "payload.json";
const PROGRAM_NAME = { 1: "DBM", 2: "HHM", 3: "MBA" }[PROGRAM_ID] || "DBM";

if (!ECAP || !XLSX_PATH) { console.error("Set ECAP_SQLITE and SCHEDULE_XLSX"); process.exit(1); }
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const db = new Database(ECAP, { readonly: true });

const courses = db.prepare(`
  SELECT DISTINCT cm.code, cm.name, cm.credits
  FROM ecap_config_courseoffering co
  JOIN academic_mirror_coursemaster cm ON cm.id = co.course_id
  JOIN ecap_config_electivecycle ec ON ec.id = co.cycle_id
  WHERE ec.program_id = ? AND ec.term_number = ?`).all(PROGRAM_ID, TERM);
const codeByName = new Map(courses.map((c) => [norm(c.name), c.code]));

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

const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const grid = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd" });
const header = grid[0];
const slotCols = {};
header.forEach((h, i) => { if (typeof h === "string" && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(h.trim())) slotCols[i] = h.trim(); });
const hasLower = (s) => /[a-z]/.test(s);

const sessions = [];
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
  for (const [ci, slot] of Object.entries(slotCols)) {
    const cell = row[ci];
    if (!cell || !hasLower(String(cell))) continue;
    const code = codeByName.get(norm(cell));
    if (!code) continue;
    sessions.push({ code, date: date.toISOString(), slot, professor: (profRow[ci] || "").toString().trim() || null });
  }
}

const payload = { program: PROGRAM_NAME, term: TERM, courses, students, sels, sessions };
writeFileSync(OUT, JSON.stringify(payload));
console.log(`${PROGRAM_NAME} term ${TERM}: ${courses.length} courses, ${students.length} students, ${sels.length} selections, ${sessions.length} sessions -> ${OUT}`);
