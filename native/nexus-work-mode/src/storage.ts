import { File, Paths } from "expo-file-system";
import type { DiscoveryItem } from "./discovery";

export type AuditEntry = {
  id: string;
  at: string;
  action: string;
  detail: string;
};

export type WorkModeState = {
  workMode: boolean;
  activeProject: string;
  items: DiscoveryItem[];
  audit: AuditEntry[];
};

const stateFile = new File(Paths.document, "nexus-work-mode-state.json");

export function loadWorkModeState(): WorkModeState | null {
  try {
    if (!stateFile.exists) return null;
    const parsed = JSON.parse(stateFile.textSync()) as Partial<WorkModeState>;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.audit)) return null;
    return {
      workMode: Boolean(parsed.workMode),
      activeProject: typeof parsed.activeProject === "string" ? parsed.activeProject : "Unassigned work",
      items: parsed.items,
      audit: parsed.audit,
    };
  } catch {
    return null;
  }
}

export function saveWorkModeState(state: WorkModeState) {
  try {
    if (!stateFile.exists) stateFile.create({ intermediates: true });
    stateFile.write(JSON.stringify(state));
  } catch {
    // The UI remains usable even if local persistence is unavailable.
  }
}

export function clearWorkModeState() {
  try {
    if (stateFile.exists) stateFile.delete();
  } catch {
    // Best-effort local deletion.
  }
}
