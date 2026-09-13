import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  nexusIdentityBindingsTable,
  nexusPmPeopleTable,
} from "@workspace/db";
import { ISSUER_URL } from "./auth";
import { canonicalAuthorityService } from "./nexus-canonical-authority-repositories";

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
  return crypto
    .createHash("sha256")
    .update(providerSubject, "utf8")
    .digest("hex");
}

/**
 * Resolve the authenticated provider subject to one canonical Nexus Person.
 * Provider identity is server-side lookup input only and never becomes personId.
 * Email/name fuzzy matching and login-time Person creation are forbidden.
 *
 * The staging-device provider is released only for opaque subjects minted by the
 * isolated non-production Core staging runtime. Production/browser/mobile OIDC
 * subjects continue to resolve against the configured issuer provider key.
 */
export async function resolveNexusPersonBinding(
  providerSubject: string,
): Promise<NexusPersonBindingResolution | null> {
  if (getNexusIdentityBindingMode() !== "postgres") return null;

  const subject = providerSubject.trim();
  if (!subject) return null;

  const provider = getIdentityProviderKeyForSubject(subject);
  const providerSubjectDigest = digestProviderSubject(subject);

  try {
    const resolved = await canonicalAuthorityService().resolveSessionPerson({ providerKey: provider, providerSubjectDigest });
    if (resolved.state === "STORE_UNAVAILABLE") throw new NexusIdentityBindingStoreUnavailableError();
    if (resolved.state !== "BOUND") return null;
    const [row] = await db.select({ verifiedAt: nexusIdentityBindingsTable.verifiedAt }).from(nexusIdentityBindingsTable)
      .where(eq(nexusIdentityBindingsTable.bindingId, resolved.bindingId));
    if (!row) throw new NexusIdentityBindingStoreUnavailableError();
    return {
      personId: resolved.personId,
      displayName: resolved.displayName ?? resolved.personId,
      provider,
      verifiedAt: row.verifiedAt,
    };
  } catch (error) {
    if (error instanceof NexusIdentityBindingStoreUnavailableError) throw error;
    throw new NexusIdentityBindingStoreUnavailableError(error);
  }
}
