import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
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
} from "../lib/nexus-person-binding";

const router: IRouter = Router();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const ESAFE_PROJECT_ID = "project-esafe-catania";
const ESAFE_WORLD_ID = "world-esafe-catania";

class StagingDeviceLoginError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "StagingDeviceLoginError";
  }
}

function readClaimCode(req: Request): string {
  const raw = req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? (req.body as Record<string, unknown>).claimCode
    : undefined;
  if (typeof raw !== "string") {
    throw new StagingDeviceLoginError(400, "CLAIM_CODE_REQUIRED", "claimCode is required.");
  }
  const value = raw.trim();
  if (value.length < 32 || value.length > 200) {
    throw new StagingDeviceLoginError(400, "CLAIM_CODE_INVALID", "claimCode is invalid.");
  }
  return value;
}

router.post("/nexus/cloud/_staging/device-login", async (req, res): Promise<void> => {
  try {
    const claimCode = readClaimCode(req);
    const codeDigest = crypto.createHash("sha256").update(claimCode, "utf8").digest("hex");
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

      const active = await tx
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
      const valid = active.filter((row) => {
        if (row.validFrom && row.validFrom > now) return false;
        if (row.validTo && row.validTo <= now) return false;
        return true;
      });
      if (valid.length !== 1) {
        throw new StagingDeviceLoginError(409, "STAGING_DEVICE_PARTICIPATION_INVALID", `Exactly one active Project Participation is required; resolved ${valid.length}.`);
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
        personId: person.personId,
        projectId: ESAFE_PROJECT_ID,
        worldId: ESAFE_WORLD_ID,
        workspaceId: valid[0]!.workspaceId,
      };
    });

    res.status(201).json({
      schema: "nexus-cloud-staging-device-login-result/v1",
      environment: "NON_PRODUCTION",
      authentication: "STAGING_DEVICE_CLAIM",
      expiresAt: sessionExpiresAt.toISOString(),
      ...result,
    });
  } catch (error) {
    if (error instanceof StagingDeviceLoginError) {
      res.status(error.status).json({ error: error.code, message: error.message });
      return;
    }
    req.log.error({ err: error }, "Cloud staging device login failed");
    res.status(500).json({ error: "STAGING_DEVICE_LOGIN_UNAVAILABLE" });
  }
});

export default router;
