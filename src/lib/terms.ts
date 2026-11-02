// Completed terms stay in the database and are reviewed in Previous Term Audit.
// Advance this when the next teaching term starts, independently of data imports.
export const CURRENT_TERM = 5;
export const isPreviousTerm = (term: number) => term < CURRENT_TERM;
