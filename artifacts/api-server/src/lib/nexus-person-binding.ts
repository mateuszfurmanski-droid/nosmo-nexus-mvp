import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  nexusIdentityBindingsTable,
  nexusPmPeopleTable,
} from "@workspace/db";
import { ISSUER_URL } from "./auth";

export const STAGING_DEVICE_IDENTITY_PROVIDER = "staging-device-claim/v1";
export const STAGING_DEVICE_SUBJECT_PREFIX = "staging-device:";

export type NexusPersonBindingResolution = {
  personId: string;
  displayName: string;
  provider: string;
  verifiedAt: Date;
};

export class NexusIdentityBindingStoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Nexus identity binding store is unavailable", { cause });
    this.name = "NexusIdentityBindingStoreUnavailableError";
  }
}

export function getNexusIdentityBindingMode(): "disabled" | "postgres" {
  return process.env.NEXUS_IDENTITY_BINDING_MODE === "postgres"
    ? "postgres"
    : "disabled";
}

export function getCurrentIdentityProviderKey(): string {
  try {
    const issuer = new URL(ISSUER_URL);
    issuer.search = "";
    issuer.hash = "";
    return `oidc:${issuer.toString().replace(/\/$/, "")}`;
  } catch (error) {
    throw new NexusIdentityBindingStoreUnavailableError(error);
  }
}

export function getIdentityProviderKeyForSubject(providerSubject: string): string {
  return providerSubject.startsWith(STAGING_DEVICE_SUBJECT_PREFIX)
    ? STAGING_DEVICE_IDENTITY_PROVIDER
    : getCurrentIdentityProviderKey();
}

export function digestProviderSubject(providerSubject: string): string {
  return crypto.createHash("sha256").update(providerSubject, "utf8").digest("hex");
}

export async function resolveNexusPersonBinding(
  providerSubject: string,
): Promise<NexusPersonBindingResolution | null> {
  if (getNexusIdentityBindingMode() !== "postgres") return null;

  const subject = providerSubject.trim();
  if (!subject) return null;

  const provider = getIdentityProviderKeyForSubject(subject);
  const providerSubjectDigest = digestProviderSubject(subject);

  try {
    const rows = await db
      .select({
        personId: nexusPmPeopleTable.personId,
        displayName: nexusPmPeopleTable.displayName,
        personStatus: nexusPmPeopleTable.status,
        bindingStatus: nexusIdentityBindingsTable.status,
        verifiedAt: nexusIdentityBindingsTable.verifiedAt,
        revokedAt: nexusIdentityBindingsTable.revokedAt,
      })
      .from(nexusIdentityBindingsTable)
      .innerJoin(
        nexusPmPeopleTable,
        eq(nexusPmPeopleTable.personId, nexusIdentityBindingsTable.personId),
      )
      .where(
        and(
          eq(nexusIdentityBindingsTable.provider, provider),
          eq(nexusIdentityBindingsTable.providerSubjectDigest, providerSubjectDigest),
          eq(nexusIdentityBindingsTable.status, "ACTIVE"),
          isNull(nexusIdentityBindingsTable.revokedAt),
          eq(nexusPmPeopleTable.status, "active"),
        ),
      )
      .limit(2);

    if (rows.length === 0) return null;
    if (rows.length !== 1) throw new NexusIdentityBindingStoreUnavailableError();

    const row = rows[0]!;
    return {
      personId: row.personId,
      displayName: row.displayName,
      provider,
      verifiedAt: row.verifiedAt,
    };
  } catch (error) {
    if (error instanceof NexusIdentityBindingStoreUnavailableError) throw error;
    throw new NexusIdentityBindingStoreUnavailableError(error);
  }
}
