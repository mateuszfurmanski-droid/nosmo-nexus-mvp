import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { nexusRuntimeIdentityBindingsTable } from "./schema/nexusRuntimeIdentity";

export interface NexusRuntimeIdentityBindingLookupInput {
  providerKey: string;
  providerSubject: string;
}

export interface NexusRuntimeIdentityBindingResolution {
  bindingId: string;
  canonicalPersonId: string;
  verifiedAt: Date;
}

export class NexusRuntimeIdentityBindingStoreError extends Error {
  constructor(message = "NEXUS_RUNTIME_IDENTITY_BINDING_STORE_UNAVAILABLE", cause?: unknown) {
    super(message, { cause });
    this.name = "NexusRuntimeIdentityBindingStoreError";
  }
}

export const fingerprintNexusProviderSubject = (providerSubject: string): string => {
  const subject = providerSubject.trim();
  if (!subject) throw new Error("NEXUS_RUNTIME_IDENTITY_EMPTY_PROVIDER_SUBJECT");
  return createHash("sha256").update(subject, "utf8").digest("hex");
};

/**
 * Resolve one exact external provider subject to a canonical Nexus Person ID.
 *
 * This lookup does not create a Person, infer identity from email/name, or grant
 * project authority. The returned Person ID must still enter the canonical
 * Project Participation + PermissionGrant resolver before any Cloud write.
 */
export const resolveNexusRuntimeIdentityBinding = async (
  input: NexusRuntimeIdentityBindingLookupInput,
): Promise<NexusRuntimeIdentityBindingResolution | null> => {
  const providerKey = input.providerKey.trim();
  if (!providerKey) throw new Error("NEXUS_RUNTIME_IDENTITY_EMPTY_PROVIDER_KEY");

  const providerSubjectSha256 = fingerprintNexusProviderSubject(input.providerSubject);

  try {
    const rows = await db
      .select({
        bindingId: nexusRuntimeIdentityBindingsTable.bindingId,
        canonicalPersonId: nexusRuntimeIdentityBindingsTable.canonicalPersonId,
        verifiedAt: nexusRuntimeIdentityBindingsTable.verifiedAt,
      })
      .from(nexusRuntimeIdentityBindingsTable)
      .where(
        and(
          eq(nexusRuntimeIdentityBindingsTable.providerKey, providerKey),
          eq(nexusRuntimeIdentityBindingsTable.providerSubjectSha256, providerSubjectSha256),
          eq(nexusRuntimeIdentityBindingsTable.status, "ACTIVE"),
          isNull(nexusRuntimeIdentityBindingsTable.revokedAt),
        ),
      )
      .limit(2);

    if (rows.length === 0) return null;
    if (rows.length !== 1) {
      throw new NexusRuntimeIdentityBindingStoreError(
        "NEXUS_RUNTIME_IDENTITY_BINDING_AMBIGUOUS",
      );
    }

    const row = rows[0]!;
    if (!row.canonicalPersonId.trim()) {
      throw new NexusRuntimeIdentityBindingStoreError(
        "NEXUS_RUNTIME_IDENTITY_BINDING_INVALID_PERSON",
      );
    }

    return row;
  } catch (error) {
    if (error instanceof NexusRuntimeIdentityBindingStoreError) throw error;
    throw new NexusRuntimeIdentityBindingStoreError(undefined, error);
  }
};
