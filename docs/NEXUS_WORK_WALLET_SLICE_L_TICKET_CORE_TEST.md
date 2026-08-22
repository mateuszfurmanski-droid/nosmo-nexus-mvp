# Work Wallet Slice L — Testable Context Ticket Core

Status: `IMPLEMENTED / PRODUCTION STORE POSTGRES ONLY / EXECUTION PENDING`

## Purpose

Make the exact short-lived Work Wallet Context Ticket capability testable without applying a database schema or introducing a development authentication/access bypass.

This slice does not create a second ticket policy. It separates the existing capability semantics from the PostgreSQL persistence adapter.

## Core boundary

`artifacts/api-server/src/lib/nexus-context-ticket-core.ts`

Owns:

- 32 random-byte opaque ticket generation;
- 43-character base64url format validation;
- SHA-256 ticket/session digesting;
- 60-second TTL;
- 10 tickets per `workspace + person + project` / 60-second issue window;
- immutable capability scope;
- generic single-use consume contract;
- malformed/unknown/expired/replayed ticket -> null behavior.

The core does not resolve Person, Project Participation, PermissionGrant, AccessDecision or Work Wallet mapping. Those remain required before issue in the existing canonical route.

## Production persistence

`artifacts/api-server/src/lib/nexus-context-ticket.ts` remains the production wrapper.

Production uses only the existing PostgreSQL/Drizzle `nexus_context_tickets` table.

There is no environment flag that changes production issue/exchange to an in-memory store and no auth/access bypass.

## Executable test store

The in-memory implementation exists only inside:

`artifacts/api-server/tests/work-wallet-context-ticket-core.ts`

It is a test double for the generic store interface, not an application runtime store.

The executable test validates:

- correct schema/purpose;
- exact 60-second expiry;
- digest-only raw ticket persistence;
- issuing session stored as digest, not raw value;
- workspace and canonical object scope frozen into the capability;
- first consume succeeds;
- replay returns null;
- malformed ticket returns null;
- exact-expiry consume returns null;
- 11th issue in one scoped window is rate-limited;
- the same Person/Project in another workspace has an independent rate-limit scope;
- invalid workspace scope is rejected.

The successful marker is:

`WORK_WALLET_CONTEXT_TICKET_CORE_PASS`

## Validation integration

`@workspace/api-server` exposes `validate:work-wallet-ticket-core`, bundling the exact TypeScript test/core with the package's existing `esbuild` and executing the result with Node.

The repository `Validate and Build` workflow invokes this immediately after the MV3 receiver validator and before workspace typecheck.

## Current blockers

- GitHub Actions runner has repeatedly failed before producing steps/logs on Work Wallet branch pushes.
- No verified non-production `nosmo-nexus-mvp` PostgreSQL target has been identified, so the schema remains unapplied.
- Chrome unpacked full connector E2E remains pending.

No database schema was applied and no protected product/demo surface was changed.
