import crypto from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  nexusIdentityBindingsTable,
  nexusIdentityClaimsTable,
  nexusPmPeopleTable,
  nexusPmProjectParticipationsTable,
} from "@workspace/db";
import {
  digestProviderSubject,
  getCurrentIdentityProviderKey,
} from "../lib/nexus-person-binding";
import { resolveEsafeCataniaCanonicalScope } from "../../../../src/data/demo/esafeCataniaRuntimeScope";

const router: IRouter = Router();

class IdentityClaimError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "IdentityClaimError";
  }
}

function activeParticipation(record: Record<string, unknown>, now: Date): boolean {
  if (record.status !== "active") return false;
  for (const key of ["validFrom", "validTo"] as const) {
    const value = record[key];
    if (value === undefined) continue;
    if (typeof value !== "string") return false;
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return false;
    if (key === "validFrom" && parsed > now.getTime()) return false;
    if (key === "validTo" && parsed < now.getTime()) return false;
  }
  return true;
}

function readClaimCode(req: Request): string {
  const raw = req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? (req.body as Record<string, unknown>).claimCode
    : undefined;
  if (typeof raw !== "string") {
    throw new IdentityClaimError(400, "CLAIM_CODE_REQUIRED", "claimCode is required.");
  }
  const claimCode = raw.trim();
  if (claimCode.length < 32 || claimCode.length > 200) {
    throw new IdentityClaimError(400, "CLAIM_CODE_INVALID", "claimCode is invalid.");
  }
  return claimCode;
}

router.post("/nexus/core/identity/claim", async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated() || !req.user?.id) {
      throw new IdentityClaimError(401, "AUTHENTICATION_REQUIRED", "An authenticated Nexus session is required.");
    }

    const claimCode = readClaimCode(req);
    const codeDigest = crypto.createHash("sha256").update(claimCode, "utf8").digest("hex");
    const provider = getCurrentIdentityProviderKey();
    const providerSubjectDigest = digestProviderSubject(String(req.user.id));
    const now = new Date();

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
        throw new IdentityClaimError(403, "IDENTITY_CLAIM_INVALID", "Identity claim is invalid or expired.");
      }

      const scope = resolveEsafeCataniaCanonicalScope({
        projectReference: claim.projectId,
        worldReference: claim.worldId,
      });
      if (!scope || scope.projectId !== claim.projectId || scope.worldId !== claim.worldId) {
        throw new IdentityClaimError(409, "IDENTITY_CLAIM_SCOPE_INVALID", "Identity claim does not target the released canonical Project World.");
      }

      const [person] = await tx
        .select()
        .from(nexusPmPeopleTable)
        .where(eq(nexusPmPeopleTable.personId, claim.personId))
        .limit(1);
      if (!person || person.status !== "active") {
        throw new IdentityClaimError(409, "IDENTITY_CLAIM_PERSON_INVALID", "Identity claim target Person is not active.");
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
        throw new IdentityClaimError(409, "IDENTITY_CLAIM_PARTICIPATION_INVALID", `Claim target requires exactly one active Project Participation; resolved ${active.length}.`);
      }

      const [existing] = await tx
        .select()
        .from(nexusIdentityBindingsTable)
        .where(
          and(
            eq(nexusIdentityBindingsTable.provider, provider),
            eq(nexusIdentityBindingsTable.providerSubjectDigest, providerSubjectDigest),
          ),
        )
        .limit(1);

      if (existing && (existing.personId !== person.personId || existing.status !== "ACTIVE" || existing.revokedAt !== null)) {
        throw new IdentityClaimError(409, "IDENTITY_ALREADY_BOUND", "Authenticated identity is already bound to a different or inactive canonical Person.");
      }

      if (!existing) {
        const bindingId = `identity-binding-${crypto
          .createHash("sha256")
          .update(`${provider}|${providerSubjectDigest}`)
          .digest("hex")
          .slice(0, 24)}`;
        await tx.insert(nexusIdentityBindingsTable).values({
          bindingId,
          provider,
          providerSubjectDigest,
          personId: person.personId,
          status: "ACTIVE",
          verifiedAt: now,
        });
      }

      const [consumed] = await tx
        .update(nexusIdentityClaimsTable)
        .set({
          status: "CONSUMED",
          consumedAt: now,
          consumedProviderSubjectDigest: providerSubjectDigest,
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
        throw new IdentityClaimError(409, "IDENTITY_CLAIM_ALREADY_CONSUMED", "Identity claim was already consumed.");
      }

      return {
        personId: person.personId,
        displayName: person.displayName,
        projectId: scope.projectId,
        worldId: scope.worldId,
        workspaceId: active[0]!.workspaceId,
      };
    });

    res.status(201).json({
      schema: "nexus-canonical-identity-claim-result/v1",
      bound: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof IdentityClaimError) {
      res.status(error.status).json({
        schema: "nexus-canonical-identity-claim-error/v1",
        error: error.code,
        message: error.message,
      });
      return;
    }
    req.log.error({ err: error }, "Canonical identity claim failed");
    res.status(500).json({
      schema: "nexus-canonical-identity-claim-error/v1",
      error: "IDENTITY_CLAIM_STORE_UNAVAILABLE",
      message: "Canonical identity claim service is unavailable.",
    });
  }
});

export default router;
