import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import {
  nexusIdentityBindingsTable,
  nexusPmPeopleTable,
} from "./schema/nexusProjectMemoryIdentity";

export interface NexusRuntimeIdentityBindingLookupInput {
  providerKey: string;
  providerSubject: string;
}

export interface NexusRuntimeIdentityBindingResolution {
  bindingId: string;
  canonicalPersonId: string;
  displayName: string;
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
 * Resolve one exact external provider subject to an existing canonical Nexus Person.
 *
 * This is intentionally the shared #106-compatible identity boundary:
 * provider/issuer + SHA-256(subject) -> nexus_pm_people.person_id.
 *
 * The lookup never creates a Person, never matches email/display name and never
 * grants project authority. A BOUND Person must still pass Project Participation
 * + explicit PermissionGrant evaluation before a Cloud write.
 */
export const resolveNexusRuntimeIdentityBinding = async (
  input: NexusRuntimeIdentityBindingLookupInput,
): Promise<NexusRuntimeIdentityBindingResolution | null> => {
  const providerKey = input.providerKey.trim();
  if (!providerKey) throw new Error("NEXUS_RUNTIME_IDENTITY_EMPTY_PROVIDER_KEY");

  const providerSubjectDigest = fingerprintNexusProviderSubject(input.providerSubject);

  try {
    const rows = await db
      .select({
        bindingId: nexusIdentityBindingsTable.bindingId,
        canonicalPersonId: nexusPmPeopleTable.personId,
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
          eq(nexusIdentityBindingsTable.provider, providerKey),
          eq(nexusIdentityBindingsTable.providerSubjectDigest, providerSubjectDigest),
          eq(nexusIdentityBindingsTable.status, "ACTIVE"),
          isNull(nexusIdentityBindingsTable.revokedAt),
          eq(nexusPmPeopleTable.status, "active"),
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
    if (
      !row.canonicalPersonId.trim() ||
      row.bindingStatus !== "ACTIVE" ||
      row.personStatus !== "active" ||
      row.revokedAt !== null
    ) {
      throw new NexusRuntimeIdentityBindingStoreError(
        "NEXUS_RUNTIME_IDENTITY_BINDING_INVALID_PERSON",
      );
    }

    return {
      bindingId: row.bindingId,
      canonicalPersonId: row.canonicalPersonId,
      displayName: row.displayName,
      verifiedAt: row.verifiedAt,
    };
  } catch (error) {
    if (error instanceof NexusRuntimeIdentityBindingStoreError) throw error;
    throw new NexusRuntimeIdentityBindingStoreError(undefined, error);
  }
};
