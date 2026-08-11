import {
  db,
  nexusProjectParticipationsTable,
  projectsTable,
  type NexusProjectApplicationPermission,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type NexusServerApplicationKey = "work-wallet";

export type NexusProjectAuthorizationReason =
  | "PROJECT_AUTH_DISABLED"
  | "INVALID_PROJECT_ID"
  | "PROJECT_NOT_FOUND"
  | "NO_ACTIVE_PARTICIPATION"
  | "EXPLICIT_APPLICATION_DENY"
  | "ACTIVE_PARTICIPATION_SHARED_ACCESS";

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

function safeProjectId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{1,96}$/.test(value);
}

function validAt(
  status: string,
  startsAt: Date | null,
  endsAt: Date | null,
  now: Date,
): boolean {
  if (status !== "ACTIVE") return false;
  if (startsAt && startsAt.getTime() > now.getTime()) return false;
  if (endsAt && endsAt.getTime() <= now.getTime()) return false;
  return true;
}

function permissionsFor(
  value: NexusProjectApplicationPermission[] | null | undefined,
): NexusProjectApplicationPermission[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (permission): permission is NexusProjectApplicationPermission =>
      permission != null &&
      typeof permission === "object" &&
      typeof permission.app === "string" &&
      (permission.effect === "allow" || permission.effect === "deny"),
  );
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
 * This intentionally mirrors the existing shared-access rule for Work Wallet:
 * an active participation grants shared project access unless an explicit deny
 * exists. Profession/qualification/provider identity never grants this access.
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

  if (!safeProjectId(nexusProjectId)) {
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

    const active = rows.filter((row) =>
      validAt(row.status, row.startsAt, row.endsAt, now),
    );

    if (active.length === 0) {
      return deny(personId, nexusProjectId, application, "NO_ACTIVE_PARTICIPATION");
    }
    if (active.length !== 1) {
      throw new NexusProjectAuthorizationStoreUnavailableError();
    }

    const participation = active[0]!;
    const permissions = permissionsFor(participation.applicationPermissions);
    const explicitDeny = permissions.some(
      (permission) =>
        permission.app === application && permission.effect === "deny",
    );

    if (explicitDeny) {
      return deny(
        personId,
        nexusProjectId,
        application,
        "EXPLICIT_APPLICATION_DENY",
        participation.participationId,
      );
    }

    return {
      allowed: true,
      personId,
      nexusProjectId,
      participationId: participation.participationId,
      application,
      reason: "ACTIVE_PARTICIPATION_SHARED_ACCESS",
    };
  } catch (error) {
    if (error instanceof NexusProjectAuthorizationStoreUnavailableError) {
      throw error;
    }
    throw new NexusProjectAuthorizationStoreUnavailableError(error);
  }
}
