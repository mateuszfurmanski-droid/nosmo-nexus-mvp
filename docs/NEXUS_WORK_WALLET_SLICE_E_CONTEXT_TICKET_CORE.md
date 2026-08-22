# NOSMO Nexus — Work Wallet Slice E Context Ticket Core

Status: IMPLEMENTED / ROUTE_DISABLED / DB_SCHEMA_NOT_APPLIED
Base: `codex/work-wallet-reconcile-slice-d-access` / PR #99
Branch: `codex/work-wallet-reconcile-slice-e-ticket-core`

External capability label:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

## Purpose

Reconcile only the safe short-lived capability mechanics from historical PR #59 into the current #90-native Work Wallet stack.

This slice intentionally does not expose an issue or exchange route yet. Runtime issuance remains blocked until the server can supply an exact canonical Person binding and current #90 Project Memory access records to the Slice D gate.

## Ticket primitive

The reconciled ticket core preserves:

- 32 cryptographically random bytes;
- base64url opaque browser ticket;
- 60-second TTL;
- SHA-256 digest persisted instead of raw ticket;
- single-use atomic database consumption;
- expired / unknown / already-consumed tickets sharing the same null result;
- rate limiting per canonical Person + Project issuance window;
- no browser integration credential;
- fixed `CONNECTOR_CONTEXT_READ` purpose.

## Canonical scope frozen into a ticket

After a successful Slice D authorization decision, the capability may carry:

- canonical `personId`;
- canonical `projectId`;
- canonical `worldId`;
- canonical `participationId`;
- canonical `accessDecisionId`;
- canonical `nexusObjectId`;
- canonical connector account ID;
- adapter `work-wallet`;
- source application `WORK_WALLET`;
- exact external object type;
- exact external record reference;
- digest of the issuing Nexus session ID.

The external Work Wallet reference is never promoted to Nexus identity.

## Persistence correction vs historical #59

Historical PKG-016 coupled the ticket table to historical `nexusPersonsTable` and `projectsTable.nexusProjectId` foreign keys.

Those historical tables are not the current #90 canonical Person/Project authority. This slice therefore does not recreate them and does not add false foreign-key ownership.

`nexus_context_tickets` is an ephemeral capability store only. Canonical identity/access validity is established by the #90 access gate before issuance and must be re-checked again before exchange context is returned.

## Origin boundary

The historical strict request-origin helpers are preserved:

- issue must be same-origin;
- exchange may be same-origin or one exact server-configured Chromium extension origin;
- no wildcard extension origin;
- no arbitrary web origin;
- exact HTTPS origins only for configured web origins.

The route that applies these checks is deliberately deferred until the canonical runtime authority adapter exists.

## Database state

The Drizzle schema is source-only in this slice.

No `drizzle-kit push`, migration application or live database modification was executed.

A live ticket PASS cannot be claimed until the exact non-production database target is identified and reviewed.

## Still required

- exact server-owned OIDC/provider subject -> canonical Person binding;
- current canonical Project Memory access source;
- ticket issue route invoking Slice D before `issueNexusContextTicket`;
- ticket exchange route checking origin before consume;
- canonical access re-check after consume and before returning context;
- exact mapping/context reconstruction through Slice A/B;
- authenticated bootstrap page;
- memory-only extension receiver;
- Chrome local browser E2E;
- Edge browser smoke.

## Protected surfaces

No changes to PR #91, Object Card, Relationship Tree gestures/layout, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android Work Mode, DoorFlow or Electrical Commissioning.
