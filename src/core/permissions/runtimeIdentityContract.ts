import type { NexusAccessDecisionResult } from '../../data/schemas/access.schema';
import type { NexusId } from '../../data/schemas/common.schema';

/**
 * Runtime authentication identity is deliberately separate from canonical Nexus Person identity.
 * Provider subjects, session ids and provider credentials remain server-only implementation details.
 */
export type NexusRuntimeIdentityState = 'UNAUTHENTICATED' | 'UNBOUND' | 'BOUND';

export interface NexusRuntimeIdentityContext {
  schema: 'nexus-runtime-identity-context/v1';
  authenticated: boolean;
  identityState: NexusRuntimeIdentityState;
  personId?: NexusId;
  displayName?: string;
  source: 'server-session';
}

export type NexusRuntimeIdentityValidationReason =
  | 'VALID_UNAUTHENTICATED'
  | 'VALID_UNBOUND'
  | 'VALID_BOUND'
  | 'INVALID_AUTH_STATE'
  | 'INVALID_PERSON_BINDING';

export interface NexusRuntimeIdentityValidation {
  valid: boolean;
  reason: NexusRuntimeIdentityValidationReason;
}

export const validateNexusRuntimeIdentityContext = (
  context: NexusRuntimeIdentityContext,
): NexusRuntimeIdentityValidation => {
  if (context.identityState === 'UNAUTHENTICATED') {
    if (context.authenticated || context.personId) {
      return { valid: false, reason: 'INVALID_AUTH_STATE' };
    }
    return { valid: true, reason: 'VALID_UNAUTHENTICATED' };
  }

  if (context.identityState === 'UNBOUND') {
    if (!context.authenticated || context.personId) {
      return { valid: false, reason: 'INVALID_PERSON_BINDING' };
    }
    return { valid: true, reason: 'VALID_UNBOUND' };
  }

  if (!context.authenticated || !context.personId) {
    return { valid: false, reason: 'INVALID_PERSON_BINDING' };
  }

  return { valid: true, reason: 'VALID_BOUND' };
};

/**
 * This request is the hand-off from the server-owned auth/session layer into the
 * canonical #90 access model. It contains no OIDC subject, email-derived authority,
 * connector identity or browser-supplied role/permission grant.
 */
export interface NexusRuntimeAccessBridgeRequest {
  schema: 'nexus-runtime-access-bridge-request/v1';
  identity: NexusRuntimeIdentityContext;
  projectId: NexusId;
  worldId: NexusId;
  moduleId?: string;
  actionKey?: string;
  objectScopeId?: NexusId;
}

export type NexusRuntimeAccessPreflightReason =
  | 'IDENTITY_CONTEXT_INVALID'
  | 'UNAUTHENTICATED'
  | 'IDENTITY_UNBOUND'
  | 'CANONICAL_ACCESS_DECISION_REQUIRED';

export interface NexusRuntimeAccessPreflight {
  result: NexusAccessDecisionResult;
  allowed: false;
  failClosed: true;
  personId?: NexusId;
  reason: NexusRuntimeAccessPreflightReason;
}

/**
 * Runtime identity never grants project access by itself.
 *
 * A valid BOUND Person can proceed only to the canonical Project Memory access
 * resolver (Project Participation + explicit grants/denials + policy gates).
 * Until a NexusAccessDecisionRecord is produced, the runtime remains fail closed.
 */
export const preflightNexusRuntimeAccess = (
  request: NexusRuntimeAccessBridgeRequest,
): NexusRuntimeAccessPreflight => {
  const identity = validateNexusRuntimeIdentityContext(request.identity);

  if (!identity.valid) {
    return {
      result: 'denied',
      allowed: false,
      failClosed: true,
      reason: 'IDENTITY_CONTEXT_INVALID',
    };
  }

  if (request.identity.identityState === 'UNAUTHENTICATED') {
    return {
      result: 'denied',
      allowed: false,
      failClosed: true,
      reason: 'UNAUTHENTICATED',
    };
  }

  if (request.identity.identityState === 'UNBOUND' || !request.identity.personId) {
    return {
      result: 'denied',
      allowed: false,
      failClosed: true,
      reason: 'IDENTITY_UNBOUND',
    };
  }

  return {
    result: 'requires-review',
    allowed: false,
    failClosed: true,
    personId: request.identity.personId,
    reason: 'CANONICAL_ACCESS_DECISION_REQUIRED',
  };
};
