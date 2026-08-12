// Students/courses are stored with the short program code (DBM / HHM / MBA);
// the UI always shows the full programme name.
export const PROGRAM_NAMES: Record<string, string> = {
  DBM: "MBA in Digital Business Management",
  HHM: "MBA in Hospital and Health Management",
  MBA: "Master of Business Administration",
};

export const programName = (code?: string | null) =>
  (code && PROGRAM_NAMES[code.trim().toUpperCase()]) || code || "";
