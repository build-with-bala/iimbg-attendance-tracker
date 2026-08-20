import type { IconKey } from "@/components/admin/Icon";

export type NavItem = { href: string; label: string; icon: IconKey; hint?: string };
export type NavGroup = { title?: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  { items: [{ href: "/admin", label: "Overview", icon: "home", hint: "Headline attendance for the batch" }] },
  {
    title: "Register",
    items: [
      { href: "/admin/students", label: "Students", icon: "users", hint: "Every student, ranked by standing" },
      { href: "/admin/courses", label: "Courses", icon: "book", hint: "Attendance and demand per elective" },
      { href: "/admin/sessions", label: "Sessions", icon: "calendar", hint: "Timetable and marking coverage" },
    ],
  },
  {
    title: "Operate",
    items: [
      { href: "/admin/mark", label: "Roster mark", icon: "check", hint: "Mark a whole class at once" },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/admin/queries", label: "Queries", icon: "chat", hint: "Questions and suggestions from students" },
    ],
  },
  {
    title: "Analysis",
    items: [
      { href: "/admin/insights", label: "Insights", icon: "spark", hint: "Correlations, slots and professors" },
    ],
  },
  {
    title: "Console",
    items: [{ href: "/admin/access", label: "Access", icon: "shield", hint: "Who can open this console" }],
  },
];
