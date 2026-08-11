import {
  db,
  nexusIdentityBindingsTable,
  nexusPersonsTable,
} from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { ISSUER_URL } from "./auth";

export type NexusPersonBindingResolution = {
  personId: string;
  displayName: string | null;
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

/**
 * OIDC subjects are scoped by issuer. The issuer is therefore part of the
 * binding key and remains server-side; it is never returned by /api/nexus/session.
 */
export function getCurrentIdentityProviderKey(): string {
  try {
    const issuer = new URL(ISSUER_URL);
    issuer.search = "";
    issuer.hash = "";
    return `oidc:${issuer.toString().replace(/\/$/, "")}`;
  } catch {
    throw new NexusIdentityBindingStoreUnavailableError();
  }
}

/**
 * Resolve the current authenticated bootstrap account to a canonical Nexus Person.
 *
 * Current auth.ts persists OIDC `sub` as users.id. This function uses that value
 * only as the external provider subject half of the binding key. It never promotes
 * it to personId and never matches on email/name.
 */
export async function resolveNexusPersonBinding(
  providerSubject: string,
): Promise<NexusPersonBindingResolution | null> {
  if (getNexusIdentityBindingMode() !== "postgres") return null;
  if (!providerSubject.trim()) return null;

  const provider = getCurrentIdentityProviderKey();

  try {
    const rows = await db
      .select({
        personId: nexusPersonsTable.id,
        displayName: nexusPersonsTable.displayName,
        verifiedAt: nexusIdentityBindingsTable.verifiedAt,
      })
      .from(nexusIdentityBindingsTable)
      .innerJoin(
        nexusPersonsTable,
        eq(nexusPersonsTable.id, nexusIdentityBindingsTable.personId),
      )
      .where(
        and(
          eq(nexusIdentityBindingsTable.provider, provider),
          eq(nexusIdentityBindingsTable.providerSubject, providerSubject),
          eq(nexusIdentityBindingsTable.status, "ACTIVE"),
          isNull(nexusIdentityBindingsTable.revokedAt),
          eq(nexusPersonsTable.status, "ACTIVE"),
        ),
      )
      .limit(2);

    if (rows.length === 0) return null;
    if (rows.length !== 1) {
      throw new NexusIdentityBindingStoreUnavailableError();
    }

    return {
      personId: rows[0]!.personId,
      displayName: rows[0]!.displayName,
      provider,
      verifiedAt: rows[0]!.verifiedAt,
    };
  } catch (error) {
    if (error instanceof NexusIdentityBindingStoreUnavailableError) throw error;
    throw new NexusIdentityBindingStoreUnavailableError(error);
  }
}
