import {
  db,
  nexusProjectParticipationsTable,
  projectsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  evaluateNexusProjectParticipationAccess,
  isSafeNexusProjectId,
  type NexusProjectAuthorizationReason,
  type NexusServerApplicationKey,
} from "./nexus-project-access-policy";

export type NexusProjectApplicationAccessDecision = {
  allowed: boolean;
  personId: string;
  nexusProjectId: string;
  participationId: string | null;
  application: NexusServerApplicationKey;
  reason: NexusProjectAuthorizationReason;
};

export class NexusProjectAuthorizationStoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Nexus project authorization store is unavailable", { cause });
    this.name = "NexusProjectAuthorizationStoreUnavailableError";
  }
}

export function getNexusProjectAuthorizationMode(): "disabled" | "postgres" {
  return process.env.NEXUS_PROJECT_AUTH_MODE === "postgres"
    ? "postgres"
    : "disabled";
}

function deny(
  personId: string,
  nexusProjectId: string,
  application: NexusServerApplicationKey,
  reason: NexusProjectAuthorizationReason,
  participationId: string | null = null,
): NexusProjectApplicationAccessDecision {
  return {
    allowed: false,
    personId,
    nexusProjectId,
    participationId,
    application,
    reason,
  };
}

/**
 * First server-side Project Participation authorization boundary.
 *
 * The DB layer resolves only an exact canonical Nexus project ID and exact
 * canonical Person ID. Policy is delegated to nexus-project-access-policy so
 * the active-participation / explicit-deny rule is independently testable.
 */
export async function resolveNexusProjectApplicationAccess(
  personId: string,
  nexusProjectId: string,
  application: NexusServerApplicationKey,
  now = new Date(),
): Promise<NexusProjectApplicationAccessDecision> {
  if (getNexusProjectAuthorizationMode() !== "postgres") {
    return deny(personId, nexusProjectId, application, "PROJECT_AUTH_DISABLED");
  }

  if (!isSafeNexusProjectId(nexusProjectId)) {
    return deny(personId, nexusProjectId, application, "INVALID_PROJECT_ID");
  }

  try {
    const projectRows = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.nexusProjectId, nexusProjectId))
      .limit(2);

    if (projectRows.length === 0) {
      return deny(personId, nexusProjectId, application, "PROJECT_NOT_FOUND");
    }
    if (projectRows.length !== 1) {
      throw new NexusProjectAuthorizationStoreUnavailableError();
    }

    const rows = await db
      .select({
        participationId: nexusProjectParticipationsTable.id,
        status: nexusProjectParticipationsTable.status,
        startsAt: nexusProjectParticipationsTable.startsAt,
        endsAt: nexusProjectParticipationsTable.endsAt,
        applicationPermissions:
          nexusProjectParticipationsTable.applicationPermissions,
      })
      .from(nexusProjectParticipationsTable)
      .where(
        and(
          eq(nexusProjectParticipationsTable.personId, personId),
          eq(nexusProjectParticipationsTable.projectId, projectRows[0]!.id),
        ),
      )
      .limit(20);

    const result = evaluateNexusProjectParticipationAccess(
      rows.map((row) => ({
        participationId: row.participationId,
        status: row.status,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        applicationPermissions: row.applicationPermissions,
      })),
      application,
      now,
    );

    if (result.reason === "AMBIGUOUS_ACTIVE_PARTICIPATION") {
      throw new NexusProjectAuthorizationStoreUnavailableError();
    }

    return {
      allowed: result.allowed,
      personId,
      nexusProjectId,
      participationId: result.participationId,
      application,
      reason: result.reason,
    };
  } catch (error) {
    if (error instanceof NexusProjectAuthorizationStoreUnavailableError) {
      throw error;
    }
    throw new NexusProjectAuthorizationStoreUnavailableError(error);
  }
}
