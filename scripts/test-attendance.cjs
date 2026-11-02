const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attendance-logic-'));
try {
  for (const name of ['grades', 'dates', 'status', 'attendance-to-date']) {
    const source = fs.readFileSync(path.join(__dirname, '../src/lib', name + '.ts'), 'utf8');
    fs.writeFileSync(path.join(dir, name + '.js'), ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText);
  }
  const { creditClassTotal, maxSkip } = require(path.join(dir, 'grades'));
  for (const [credits, total, skips] of [[0.75, 5, 1], [1.5, 10, 2], [2.25, 15, 3], [3, 20, 4]]) {
    assert.equal(creditClassTotal(credits, 0), total);
    assert.equal(maxSkip(0, 0, total, 80), skips);
  }
  assert.equal(creditClassTotal(1.5, 5), 10, 'an incomplete timetable must not shrink the allowance');
  assert.equal(maxSkip(0, 1, 10, 80), 1, 'one skip is valid after one of two absences is spent');
  assert.equal(maxSkip(0, 2, 10, 80), 0);
  for (let total = 1; total <= 100; total++) {
    for (let held = 0; held <= total; held++) {
      for (let present = 0; present <= held; present++) {
        const skips = maxSkip(present, held, total, 80);
        const remaining = total - held;
        assert(skips >= 0 && skips <= remaining);
        if (skips > 0) assert((present + remaining - skips) * 100 >= 80 * total);
        if (skips < remaining) assert((present + remaining - skips - 1) * 100 < 80 * total);
      }
    }
  }
  const { attendanceToDate, sessionHasEnded } = require(path.join(dir, 'attendance-to-date'));
  const sessions = [
    { courseId: 'a', date: '2026-11-01', slot: '09:00-10:30', status: 'PRESENT' },
    { courseId: 'a', date: '2026-11-02', slot: '09:00-10:30', status: 'OD' },
    { courseId: 'a', date: '2026-11-01', slot: '10:45-12:15', status: 'ABSENT' },
    { courseId: 'a', date: '2026-11-01', slot: '13:15-14:45' },
    { courseId: 'a', date: '2026-11-02', slot: '10:45-12:15', status: 'PRESENT' },
    { courseId: 'a', date: '2026-11-03', slot: '09:00-10:30', status: 'PRESENT' },
  ];
  const now = new Date('2026-11-02T06:00:00Z'); // 11:30 IST, during the 10:45 class
  const result = attendanceToDate(sessions, now);
  assert.deepEqual(result.overall, { attended: 2, total: 4, marked: 3, unmarked: 1, od: 1 });
  assert.deepEqual(result.byCourse.get('a'), result.overall);
  assert.equal(attendanceToDate([], now).overall.total, 0);
  assert(sessionHasEnded('2026-11-02', '09:00-10:30', new Date('2026-11-02T05:00:00Z')));
  assert(!sessionHasEnded('2026-11-02', '09:00-10:30', new Date('2026-11-02T04:59:59Z')));
  assert(!sessionHasEnded('2026-11-02', 'unknown', now));
  console.log('PASS: credit totals, exhaustive skip budgets, OD/unmarked counts, future classes and IST boundaries');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
