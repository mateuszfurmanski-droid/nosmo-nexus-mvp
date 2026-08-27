import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  nexusIdentityBindingsTable,
  nexusIdentityClaimsTable,
  nexusPmPeopleTable,
  nexusPmProjectParticipationsTable,
  sessionsTable,
} from "@workspace/db";
import {
  digestProviderSubject,
  STAGING_DEVICE_IDENTITY_PROVIDER,
  STAGING_DEVICE_SUBJECT_PREFIX,
} from "./nexus-person-binding";

export const ESAFE_PROJECT_ID = "project-esafe-catania";
export const ESAFE_WORLD_ID = "world-esafe-catania";
export const CLOUD_CONTROL_PERSON_ID = "person-staging-cloud-e2e-bd60e8bb69d6";
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export class StagingDeviceLoginError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "StagingDeviceLoginError";
  }
}

export async function consumeNexusCloudStagingClaim(claimCode: string) {
  const normalized = claimCode.trim();
  if (normalized.length < 32 || normalized.length > 200) {
    throw new StagingDeviceLoginError(400, "CLAIM_CODE_INVALID", "claimCode is invalid.");
  }

  const codeDigest = crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
  const now = new Date();
  const sessionExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  const result = await db.transaction(async (tx) => {
    const [claim] = await tx
      .select()
      .from(nexusIdentityClaimsTable)
      .where(
        and(
          eq(nexusIdentityClaimsTable.codeDigest, codeDigest),
          eq(nexusIdentityClaimsTable.status, "ACTIVE"),
          isNull(nexusIdentityClaimsTable.consumedAt),
        ),
      )
      .limit(1);

    if (!claim || claim.expiresAt <= now) {
      throw new StagingDeviceLoginError(403, "STAGING_DEVICE_CLAIM_INVALID", "Staging device claim is invalid or expired.");
    }
    if (claim.projectId !== ESAFE_PROJECT_ID || claim.worldId !== ESAFE_WORLD_ID) {
      throw new StagingDeviceLoginError(409, "STAGING_DEVICE_SCOPE_INVALID", "Claim does not target the released e-SAFE Project World.");
    }

    const [person] = await tx
      .select()
      .from(nexusPmPeopleTable)
      .where(eq(nexusPmPeopleTable.personId, claim.personId))
      .limit(1);
    if (!person || person.status !== "active") {
      throw new StagingDeviceLoginError(409, "STAGING_DEVICE_PERSON_INVALID", "Claim target Person is not active.");
    }

    const rows = await tx
      .select()
      .from(nexusPmProjectParticipationsTable)
      .where(
        and(
          eq(nexusPmProjectParticipationsTable.canonicalPersonId, person.personId),
          eq(nexusPmProjectParticipationsTable.projectId, ESAFE_PROJECT_ID),
          eq(nexusPmProjectParticipationsTable.worldId, ESAFE_WORLD_ID),
          eq(nexusPmProjectParticipationsTable.participationStatus, "active"),
        ),
      );
    const active = rows.filter((row) => {
      if (row.validFrom && row.validFrom > now) return false;
      if (row.validTo && row.validTo <= now) return false;
      return true;
    });
    if (active.length !== 1) {
      throw new StagingDeviceLoginError(
        409,
        "STAGING_DEVICE_PARTICIPATION_INVALID",
        `Exactly one active Project Participation is required; resolved ${active.length}.`,
      );
    }

    const subject = `${STAGING_DEVICE_SUBJECT_PREFIX}${crypto.randomBytes(32).toString("hex")}`;
    const subjectDigest = digestProviderSubject(subject);
    const bindingId = `identity-binding-staging-${crypto.randomBytes(12).toString("hex")}`;
    const sid = crypto.randomBytes(32).toString("hex");

    await tx.insert(nexusIdentityBindingsTable).values({
      bindingId,
      provider: STAGING_DEVICE_IDENTITY_PROVIDER,
      providerSubjectDigest: subjectDigest,
      personId: person.personId,
      status: "ACTIVE",
      verifiedAt: now,
    });

    await tx.insert(sessionsTable).values({
      sid,
      sess: {
        user: {
          id: subject,
          email: null,
          firstName: person.displayName,
          lastName: null,
          profileImageUrl: null,
        },
        access_token: "STAGING_DEVICE_CLAIM",
        expires_at: Math.floor(sessionExpiresAt.getTime() / 1000),
      },
      expire: sessionExpiresAt,
    });

    const [consumed] = await tx
      .update(nexusIdentityClaimsTable)
      .set({
        status: "CONSUMED",
        consumedAt: now,
        consumedProviderSubjectDigest: subjectDigest,
      })
      .where(
        and(
          eq(nexusIdentityClaimsTable.claimId, claim.claimId),
          eq(nexusIdentityClaimsTable.status, "ACTIVE"),
          isNull(nexusIdentityClaimsTable.consumedAt),
        ),
      )
      .returning({ claimId: nexusIdentityClaimsTable.claimId });

    if (!consumed) {
      throw new StagingDeviceLoginError(409, "STAGING_DEVICE_CLAIM_ALREADY_CONSUMED", "Staging device claim was already consumed.");
    }

    return {
      token: sid,
      providerSubject: subject,
      bindingId,
      personId: person.personId,
      displayName: person.displayName,
      projectId: ESAFE_PROJECT_ID,
      worldId: ESAFE_WORLD_ID,
      workspaceId: active[0]!.workspaceId,
      expiresAt: sessionExpiresAt,
    };
  });

  return result;
}

export async function createNexusCloudControlSession() {
  if (process.env.NEXUS_CLOUD_CONTROL_HARNESS_ENABLED !== "true") {
    throw new StagingDeviceLoginError(404, "CONTROL_HARNESS_DISABLED", "Controlled staging harness is disabled.");
  }

  const claimCode = crypto.randomBytes(48).toString("base64url");
  const codeDigest = crypto.createHash("sha256").update(claimCode, "utf8").digest("hex");
  const now = new Date();
  const claimId = `claim-cloud-control-${crypto.randomBytes(12).toString("hex")}`;

  await db.insert(nexusIdentityClaimsTable).values({
    claimId,
    codeDigest,
    personId: CLOUD_CONTROL_PERSON_ID,
    projectId: ESAFE_PROJECT_ID,
    worldId: ESAFE_WORLD_ID,
    status: "ACTIVE",
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
  });

  return consumeNexusCloudStagingClaim(claimCode);
}
