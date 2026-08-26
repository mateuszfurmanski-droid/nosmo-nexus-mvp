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
import { resolveEsafeCataniaCanonicalScope } from "../../../../src/data/demo/esafeCataniaRuntimeScope";
import {
  digestProviderSubject,
  STAGING_DEVICE_IDENTITY_PROVIDER,
  STAGING_DEVICE_SUBJECT_PREFIX,
} from "../lib/nexus-person-binding";

const router: IRouter = Router();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

class StagingDeviceLoginError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
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

function activeParticipation(record: Record<string, unknown>, now: Date): boolean {
  if (record.status !== "active") return false;
  const validFrom = typeof record.validFrom === "string" ? Date.parse(record.validFrom) : null;
  const validTo = typeof record.validTo === "string" ? Date.parse(record.validTo) : null;
  if (validFrom !== null && (!Number.isFinite(validFrom) || validFrom > now.getTime())) return false;
  if (validTo !== null && (!Number.isFinite(validTo) || validTo < now.getTime())) return false;
  return true;
}

/**
 * NON-PRODUCTION ONLY.
 *
 * Possession of a high-entropy, one-time, expiring claim code authenticates a
 * physical staging device for the bounded e-SAFE E2E. This deliberately does
 * not impersonate Replit/OIDC. It mints a random opaque staging-device subject,
 * persists only its digest in the canonical binding table, consumes the claim,
 * and creates a short-lived opaque Nexus session in one database transaction.
 *
 * This router is mounted only by vercel-core-staging.ts and never by the normal
 * application route index.
 */
router.post("/nexus/core/staging-device-login", async (req, res): Promise<void> => {
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

      const scope = resolveEsafeCataniaCanonicalScope({
        projectReference: claim.projectId,
        worldReference: claim.worldId,
      });
      if (!scope || scope.projectId !== claim.projectId || scope.worldId !== claim.worldId) {
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

      const participations = await tx
        .select()
        .from(nexusPmProjectParticipationsTable)
        .where(
          and(
            eq(nexusPmProjectParticipationsTable.personId, person.personId),
            eq(nexusPmProjectParticipationsTable.projectId, scope.projectId),
            eq(nexusPmProjectParticipationsTable.worldId, scope.worldId),
            eq(nexusPmProjectParticipationsTable.participationStatus, "active"),
          ),
        );
      const active = participations.filter((row) => activeParticipation(row.recordJson, now));
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
        personId: person.personId,
        displayName: person.displayName,
        projectId: scope.projectId,
        worldId: scope.worldId,
        workspaceId: active[0]!.workspaceId,
      };
    });

    res.status(201).json({
      schema: "nexus-staging-device-login-result/v1",
      environment: "NON_PRODUCTION",
      authentication: "STAGING_DEVICE_CLAIM",
      expiresAt: sessionExpiresAt.toISOString(),
      ...result,
    });
  } catch (error) {
    if (error instanceof StagingDeviceLoginError) {
      res.status(error.status).json({
        schema: "nexus-staging-device-login-error/v1",
        error: error.code,
        message: error.message,
      });
      return;
    }
    req.log.error({ err: error }, "Staging device login failed");
    res.status(500).json({
      schema: "nexus-staging-device-login-error/v1",
      error: "STAGING_DEVICE_LOGIN_UNAVAILABLE",
      message: "Staging device login service is unavailable.",
    });
  }
});

export default router;
