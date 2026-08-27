import { and, eq } from "drizzle-orm";
import type { Request } from "express";
import { db, nexusPmProjectParticipationsTable } from "@workspace/db";
import { resolveNexusServerRuntimeIdentity } from "./nexus-runtime-identity";

export class NexusCloudWorkspaceResolutionError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) {
    super(message);
    this.name = "NexusCloudWorkspaceResolutionError";
  }
}

export async function resolveNexusCloudProjectWorkspace(input: {
  req: Request;
  projectId: string;
  worldId: string;
}): Promise<number> {
  if (!input.req.isAuthenticated() || !input.req.user?.id) {
    throw new NexusCloudWorkspaceResolutionError("NEXUS_CLOUD_AUTH_REQUIRED", 401, "Authentication required.");
  }

  const identity = await resolveNexusServerRuntimeIdentity(input.req);
  if (identity.identityState !== "BOUND") {
    throw new NexusCloudWorkspaceResolutionError("NEXUS_CLOUD_CANONICAL_PERSON_UNBOUND", 403, "Canonical Person binding is required.");
  }

  const now = new Date();
  const rows = await db
    .select()
    .from(nexusPmProjectParticipationsTable)
    .where(
      and(
        eq(nexusPmProjectParticipationsTable.canonicalPersonId, identity.personId),
        eq(nexusPmProjectParticipationsTable.projectId, input.projectId),
        eq(nexusPmProjectParticipationsTable.worldId, input.worldId),
        eq(nexusPmProjectParticipationsTable.participationStatus, "active"),
      ),
    );

  const active = rows.filter((row) => {
    if (row.validFrom && row.validFrom > now) return false;
    if (row.validTo && row.validTo <= now) return false;
    return true;
  });

  if (active.length !== 1) {
    throw new NexusCloudWorkspaceResolutionError(
      "NEXUS_CLOUD_PARTICIPATION_WORKSPACE_INVALID",
      403,
      `Exactly one active Project Participation is required; resolved ${active.length}.`,
    );
  }

  return active[0]!.workspaceId;
}
