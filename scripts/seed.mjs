// Seed Postgres from ECAP data. Reads local ECAP sqlite + schedule xlsx.
// NEVER commit those sources — this runs at deploy time against DATABASE_URL.
//
//   ECAP_SQLITE   path to Elective-selection/NEW/backend/db.sqlite3
//   SCHEDULE_XLSX path to Schedule_DBM03_TERM IV (FINAL).xlsx
//   PROGRAM_ID    ECAP program id (DBM=1, HHM=2, MBA=3)   default 1
//   TERM          term number                              default 4
//
// Usage: DATABASE_URL=... ECAP_SQLITE=... SCHEDULE_XLSX=... node scripts/seed.mjs

import Database from "better-sqlite3";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ECAP = process.env.ECAP_SQLITE;
const XLSX_PATH = process.env.SCHEDULE_XLSX;
const PROGRAM_ID = Number(process.env.PROGRAM_ID || 1);
const TERM = Number(process.env.TERM || 4);
const PROGRAM_NAME = { 1: "DBM", 2: "HHM", 3: "MBA" }[PROGRAM_ID] || "DBM";

if (!ECAP || !XLSX_PATH) { console.error("Set ECAP_SQLITE and SCHEDULE_XLSX"); process.exit(1); }
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const db = new Database(ECAP, { readonly: true });

// 1) DBM term-4 courses (code,name,credits) from ECAP
const courses = db.prepare(`
  SELECT DISTINCT cm.code, cm.name, cm.credits
  FROM ecap_config_courseoffering co
  JOIN academic_mirror_coursemaster cm ON cm.id = co.course_id
  JOIN ecap_config_electivecycle ec ON ec.id = co.cycle_id
  WHERE ec.program_id = ? AND ec.term_number = ?`).all(PROGRAM_ID, TERM);
const codeByName = new Map(courses.map((c) => [norm(c.name), c.code]));

// 2) students with a term-TERM selection in this program
const students = db.prepare(`
  SELECT DISTINCT sm.student_id, sm.name, sm.email
  FROM academic_mirror_studentmaster sm
  JOIN ecap_runtime_studentcourseselection sc ON sc.student_id = sm.id
  JOIN ecap_config_electivecycle ec ON ec.id = sc.cycle_id
  WHERE ec.program_id = ? AND ec.term_number = ? AND sm.program_id = ?`).all(PROGRAM_ID, TERM, PROGRAM_ID);

// 3) enrollments: PENDING selections in this term
const sels = db.prepare(`
  SELECT sm.student_id, cm.code
  FROM ecap_runtime_studentcourseselection sc
  JOIN academic_mirror_studentmaster sm ON sm.id = sc.student_id
  JOIN ecap_config_electivecycle ec ON ec.id = sc.cycle_id
  JOIN ecap_config_courseoffering co ON co.id = sc.offering_id
  JOIN academic_mirror_coursemaster cm ON cm.id = co.course_id
  WHERE ec.program_id = ? AND ec.term_number = ? AND sc.status = 'PENDING'`).all(PROGRAM_ID, TERM);

// 4) sessions from schedule xlsx
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
    if ((m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/))) date = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])); // DD-MM-YYYY
    else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }
  if (!date) continue;
  const profRow = grid[i + 1] || [];
  for (const [ci, slot] of Object.entries(slotCols)) {
    const cell = row[ci];
    if (!cell || !hasLower(String(cell))) continue; // skip holidays/exams (all caps) & empty
    const code = codeByName.get(norm(cell));
    if (!code) continue; // only real elective courses become sessions
    sessions.push({ code, date, slot, professor: (profRow[ci] || "").toString().trim() || null });
  }
}

console.log(`ECAP: ${courses.length} courses, ${students.length} students, ${sels.length} selections`);
console.log(`Schedule: ${sessions.length} class sessions parsed (${PROGRAM_NAME} term ${TERM})`);

// ---- write ----
async function main() {
  await prisma.attendance.deleteMany();
  await prisma.session.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();

  const courseId = new Map();
  for (const c of courses) {
    const rec = await prisma.course.create({ data: { code: c.code, name: c.name.trim(), credits: Number(c.credits) || 0, term: TERM, program: PROGRAM_NAME } });
    courseId.set(c.code, rec.id);
  }
  const studentId = new Map();
  for (const s of students) {
    const rec = await prisma.student.create({ data: { studentId: s.student_id, name: s.name, email: s.email.toLowerCase(), program: PROGRAM_NAME, batch: s.student_id.split("/").pop() } });
    studentId.set(s.student_id, rec.id);
  }
  let enr = 0;
  for (const e of sels) {
    if (!studentId.has(e.student_id) || !courseId.has(e.code)) continue;
    await prisma.enrollment.create({ data: { studentId: studentId.get(e.student_id), courseId: courseId.get(e.code) } }).then(() => enr++).catch(() => {});
  }
  let ses = 0;
  for (const s of sessions) {
    if (!courseId.has(s.code)) continue;
    await prisma.session.create({ data: { courseId: courseId.get(s.code), date: s.date, slot: s.slot, professor: s.professor } }).then(() => ses++).catch(() => {});
  }
  console.log(`Seeded: ${courseId.size} courses, ${studentId.size} students, ${enr} enrollments, ${ses} sessions`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
