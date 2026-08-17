// Audit: list every schedule cell and whether it mapped to an ECAP course
import Database from "better-sqlite3";
import xlsx from "xlsx";
const [ECAP, XLSX_PATH, PROGRAM_ID, TERM] = [process.env.ECAP_SQLITE, process.env.SCHEDULE_XLSX, +process.env.PROGRAM_ID, +(process.env.TERM||4)];
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const db = new Database(ECAP, { readonly: true });
const courses = db.prepare(`SELECT DISTINCT cm.code, cm.name FROM ecap_config_courseoffering co JOIN academic_mirror_coursemaster cm ON cm.id=co.course_id JOIN ecap_config_electivecycle ec ON ec.id=co.cycle_id WHERE ec.program_id=? AND ec.term_number=?`).all(PROGRAM_ID, TERM);
const codeByName = new Map(courses.map((c) => [norm(c.name), c.code]));
console.log("DEBUG courses:", courses.length, "PROGRAM_ID:", PROGRAM_ID, "TERM:", TERM, "sample key:", [...codeByName.keys()][0]);
console.log("DEBUG supplychain in map:", codeByName.has("supplychainmanagement"));
const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
const grid = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, dateNF: "yyyy-mm-dd" });
const header = grid[0];
const slotCols = {};
header.forEach((h, i) => { if (typeof h === "string" && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(h.trim())) slotCols[i] = h.trim(); });
console.log("slot columns:", Object.values(slotCols).join(" | ") || "NONE — header row:", JSON.stringify(header).slice(0,300));
const hasLower = (s) => /[a-z]/.test(s);
const tally = new Map();
let dateRows = 0, skippedDateRows = 0;
for (let i = 1; i < grid.length; i++) {
  const row = grid[i]; if (!row) continue;
  const dcell = row[0];
  let date = null;
  if (dcell instanceof Date) date = dcell;
  else if (typeof dcell === "string") {
    const s = dcell.trim(); let m;
    if ((m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/))) date = new Date(Date.UTC(+m[3], +m[2]-1, +m[1]));
    else if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) date = new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
  }
  if (!date) { if (dcell) skippedDateRows++; continue; }
  dateRows++;
  for (const [ci] of Object.entries(slotCols)) {
    const cell = row[ci]; if (!cell) continue;
    const txt = String(cell).trim();
    const why = !hasLower(txt) ? "ALLCAPS-skip" : codeByName.has(norm(txt)) ? "OK->" + codeByName.get(norm(txt)) : "NO-MATCH";
    const k = why + " | " + txt;
    tally.set(k, (tally.get(k)||0)+1);
  }
}
console.log(`date rows: ${dateRows}, rows with unparsed first cell: ${skippedDateRows}`);
for (const [k, n] of [...tally.entries()].sort()) console.log(String(n).padStart(3), k);
