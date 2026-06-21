export type FocusEntityType = "person" | "project" | "document" | "task" | "note" | "company";

export interface FocusTarget {
  type: FocusEntityType;
  /** Entity id, or for `company` the company name (companies have no record). */
  id: string;
}

export const focusKey = (t: FocusTarget) => `${t.type}:${t.id}`;
