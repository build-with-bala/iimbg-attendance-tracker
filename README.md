# ECAP Attendance Tracker — IIM Bodh Gaya

Attendance marking + analytics for DBM/MBA/HHM elective courses. Data (students,
enrollments, class sessions) is seeded from the ECAP system.

## Stack
Next.js 14 (App Router) · Prisma · PostgreSQL · Auth.js (Google SSO) · Recharts.

## Roles
- **Admin** (email in `ADMIN_EMAILS`): mark attendance per session, see all analytics.
- **Student** (any `@iimbg.ac.in`): sees only their own attendance & trend.

## Features
- **Mark**: pick a scheduled session → enrolled roster → tick present/absent.
- **Attendance %**: per student / course / term, `<75%` flags.
- **Correlations**: course↔course (Pearson r), slot (morning vs evening), professor.
- **Comparisons**: student vs class average, biggest gaps/outliers.
- **Trends**: weekly attendance line (spot drop-offs around exams/placement).

## Env (see `.env.example`)
`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `ALLOWED_HD`, `ADMIN_EMAILS`, `DEMO_MODE`.

Set `DEMO_MODE=true` to use a login bypass before Google OAuth is configured
(type `admin` for admin, or `name@iimbg.ac.in` for a student).

## Local dev
```bash
npm install
cp .env.example .env        # point DATABASE_URL at a Postgres
npx prisma db push
ECAP_SQLITE="/path/db.sqlite3" SCHEDULE_XLSX="/path/Schedule_DBM03_TERM IV (FINAL).xlsx" node scripts/seed.mjs
npm run dev
```

## Seeding (never commit ECAP sources)
The seed reads the ECAP sqlite + a schedule xlsx and writes to `DATABASE_URL`.
Run it locally against the production Postgres at deploy time. Configure with
`PROGRAM_ID` (DBM=1, HHM=2, MBA=3) and `TERM`.

## Deploy (Coolify)
Dockerfile builds a Next standalone image; `docker-entrypoint.sh` runs
`prisma db push` on boot then starts the server. Point the app's `DATABASE_URL`
at the Coolify Postgres and set the auth env vars.
