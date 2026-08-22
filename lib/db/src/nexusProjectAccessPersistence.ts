import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
  nexusPmPermissionGrantsTable,
  nexusPmProjectParticipationsTable,
  type NexusPmPermissionGrantRow,
  type NexusPmProjectParticipationRow,
} from "./schema/nexusProjectAccess";

export interface NexusProjectAccessLoadInput {
  workspaceId: number;
  canonicalPersonId: string;
  projectId: string;
  worldId: string;
}

export interface NexusProjectAccessRows {
  participations: NexusPmProjectParticipationRow[];
  permissionGrants: NexusPmPermissionGrantRow[];
}

const requireString = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`NEXUS_PROJECT_ACCESS_INVALID_${label}`);
  return normalized;
};

/**
 * Load only canonical ProjectParticipation/PermissionGrant persistence rows for
 * one exact workspace + Person + Project World boundary.
 *
 * This function does not decide access. It deliberately returns both active and
 * inactive/expired records so the canonical #90 access resolver can evaluate
 * status, validity windows and explicit deny precedence in one place.
 */
export const loadNexusProjectAccessRows = async (
  input: NexusProjectAccessLoadInput,
): Promise<NexusProjectAccessRows> => {
  if (!Number.isInteger(input.workspaceId) || input.workspaceId <= 0) {
    throw new Error("NEXUS_PROJECT_ACCESS_INVALID_WORKSPACE_ID");
  }

  const canonicalPersonId = requireString(input.canonicalPersonId, "PERSON_ID");
  const projectId = requireString(input.projectId, "PROJECT_ID");
  const worldId = requireString(input.worldId, "WORLD_ID");

  const participations = await db
    .select()
    .from(nexusPmProjectParticipationsTable)
    .where(
      and(
        eq(nexusPmProjectParticipationsTable.workspaceId, input.workspaceId),
        eq(nexusPmProjectParticipationsTable.canonicalPersonId, canonicalPersonId),
        eq(nexusPmProjectParticipationsTable.projectId, projectId),
        eq(nexusPmProjectParticipationsTable.worldId, worldId),
      ),
    );

  if (participations.length === 0) {
    return { participations: [], permissionGrants: [] };
  }

  const participationIds = participations.map((row) => row.participationId);
  const permissionGrants = await db
    .select()
    .from(nexusPmPermissionGrantsTable)
    .where(
      and(
        eq(nexusPmPermissionGrantsTable.workspaceId, input.workspaceId),
        inArray(nexusPmPermissionGrantsTable.participationId, participationIds),
      ),
    );

  return { participations, permissionGrants };
};
