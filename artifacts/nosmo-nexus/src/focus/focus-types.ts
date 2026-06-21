export type FocusEntityType = "person" | "project" | "document" | "task" | "note";

export interface FocusTarget {
  type: FocusEntityType;
  id: string;
}

export const focusKey = (t: FocusTarget) => `${t.type}:${t.id}`;
