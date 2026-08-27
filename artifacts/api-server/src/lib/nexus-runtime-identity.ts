import type { Request } from "express";
import {
  resolveNexusRuntimeIdentityBinding,
  NexusRuntimeIdentityBindingStoreError,
} from "@workspace/db/nexus-runtime-identity-binding";
import { ISSUER_URL } from "./auth";

export type NexusServerRuntimeIdentityContext =
  | {
      schema: "nexus-runtime-identity-context/v1";
      authenticated: false;
      identityState: "UNAUTHENTICATED";
      source: "server-session";
    }
  | {
      schema: "nexus-runtime-identity-context/v1";
      authenticated: true;
      identityState: "UNBOUND";
      source: "server-session";
    }
  | {
      schema: "nexus-runtime-identity-context/v1";
      authenticated: true;
      identityState: "BOUND";
      personId: string;
      source: "server-session";
    };

export class NexusRuntimeIdentityResolutionError extends Error {
  constructor(cause?: unknown) {
    super("NEXUS_RUNTIME_IDENTITY_RESOLUTION_UNAVAILABLE", { cause });
    this.name = "NexusRuntimeIdentityResolutionError";
  }
}

export function getNexusRuntimeIdentityBindingMode(): "disabled" | "postgres" {
  return process.env.NEXUS_IDENTITY_BINDING_MODE === "postgres"
    ? "postgres"
    : "disabled";
}

export const STAGING_DEVICE_IDENTITY_PROVIDER = "staging-device-claim/v1";
export const STAGING_DEVICE_SUBJECT_PREFIX = "staging-device:";

export function getCurrentNexusIdentityProviderKey(providerSubject?: string): string {
  if (providerSubject?.startsWith(STAGING_DEVICE_SUBJECT_PREFIX)) {
    return STAGING_DEVICE_IDENTITY_PROVIDER;
  }
  try {
    const issuer = new URL(ISSUER_URL);
    issuer.search = "";
    issuer.hash = "";
    return `oidc:${issuer.toString().replace(/\/$/, "")}`;
  } catch (error) {
    throw new NexusRuntimeIdentityResolutionError(error);
  }
}

/**
 * Convert the authenticated server session into the canonical #90 runtime
 * identity context.
 *
 * `req.user.id` is used only as the external OIDC/provider subject for an exact
 * server-side binding lookup. It is never promoted directly to `personId` and
 * no email/display-name matching is performed.
 *
 * Identity binding is deliberately disabled by default. If postgres mode is
 * explicitly enabled and the binding store fails, the request must fail closed
 * rather than silently degrading to a different identity rule.
 */
export async function resolveNexusServerRuntimeIdentity(
  req: Request,
): Promise<NexusServerRuntimeIdentityContext> {
  if (!req.isAuthenticated() || !req.user?.id) {
    return {
      schema: "nexus-runtime-identity-context/v1",
      authenticated: false,
      identityState: "UNAUTHENTICATED",
      source: "server-session",
    };
  }

  if (getNexusRuntimeIdentityBindingMode() !== "postgres") {
    return {
      schema: "nexus-runtime-identity-context/v1",
      authenticated: true,
      identityState: "UNBOUND",
      source: "server-session",
    };
  }

  try {
    const binding = await resolveNexusRuntimeIdentityBinding({
      providerKey: getCurrentNexusIdentityProviderKey(req.user.id),
      providerSubject: req.user.id,
    });

    if (!binding) {
      return {
        schema: "nexus-runtime-identity-context/v1",
        authenticated: true,
        identityState: "UNBOUND",
        source: "server-session",
      };
    }

    return {
      schema: "nexus-runtime-identity-context/v1",
      authenticated: true,
      identityState: "BOUND",
      personId: binding.canonicalPersonId,
      source: "server-session",
    };
  } catch (error) {
    if (error instanceof NexusRuntimeIdentityBindingStoreError) {
      throw new NexusRuntimeIdentityResolutionError(error);
    }
    if (error instanceof NexusRuntimeIdentityResolutionError) throw error;
    throw new NexusRuntimeIdentityResolutionError(error);
  }
}
