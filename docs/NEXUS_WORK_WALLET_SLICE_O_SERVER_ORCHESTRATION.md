# Work Wallet Slice O — Server Ticket Orchestration Boundary

Status: `IMPLEMENTED_IN_SOURCE / ISOLATED_SERVICE_VALIDATION_PENDING / DB_E2E_BLOCKED`

## Purpose

Remove the remaining duplicated orchestration from the Express Work Wallet Context Ticket route without changing the canonical access policy introduced in the earlier reconciliation slices.

The HTTP layer must stay responsible only for transport/security gates:

- same-origin issue gate;
- authenticated Nexus session;
- workspace resolution;
- exact allowed exchange origin before consume;
- request parsing;
- HTTP status/error mapping;
- no-store response headers.

The canonical connector decision path is now owned by one service:

`work-wallet-context-ticket-service.ts`

## Issue orchestration

The service composes:

1. exact provider subject -> canonical Nexus Person binding;
2. exact workspace/person/project/world/connector/external-record Project Memory load;
3. active canonical connector account check;
4. existing exact Work Wallet mapping contract;
5. existing canonical ticket eligibility contract;
6. short-lived Context Ticket issue.

Browser input still cannot supply canonical Person, Participation, PermissionGrant, AccessDecision or Nexus Object authority.

## Exchange orchestration

The HTTP route rejects an unapproved origin before invoking the service.

The service then:

1. atomically consumes the raw Context Ticket;
2. validates frozen purpose/adapter/source/action scope;
3. reloads current workspace-scoped canonical Project Memory;
4. checks the connector account is still active;
5. re-runs the existing mapping/access gate using `server-context-ticket` identity source;
6. requires current Person/Participation/AccessDecision/Object IDs to equal the frozen ticket scope;
7. builds the existing sanitized `nexus-work-wallet-context/v1` only after the re-check succeeds.

A consumed ticket is not a durable permission grant.

## Dependency boundary

`work-wallet-context-ticket-service.ts` depends on interfaces for:

- Person binding resolution;
- Project Memory scope loading;
- ticket issue;
- ticket consume;
- source-event ID generation.

The service imports Context Ticket types/purpose from the DB-agnostic `nexus-context-ticket-core`, not from the PostgreSQL wrapper.

Production Express wiring supplies:

- `resolveNexusPersonBinding`;
- `loadNexusWorkWalletProjectMemoryScope`;
- `issueNexusContextTicket`;
- `consumeNexusContextTicket`;
- cryptographic source-event ID generation.

There is no production in-memory fallback and no auth/access bypass.

## Behavioral validator

Adds `work-wallet-context-ticket-service.ts` under API-server tests.

Coverage includes:

- valid issue and verified exchange;
- exact frozen workspace/person/object scope;
- replay -> invalid ticket;
- unbound identity stops before Project Memory/ticket issue;
- inactive connector account stops before ticket issue;
- explicit deny after issue -> access changed;
- exact mapping removal after issue -> access changed;
- newer AccessDecision ID after issue -> access changed;
- tampered adapter scope -> scope rejected before Project Memory reload.

Expected marker:

`WORK_WALLET_CONTEXT_TICKET_SERVICE_PASS`

The validator is wired into the normal `Validate and Build` sequence after the bootstrap validator.

## Validation truth

- GitHub Actions is currently affected by the repository runner-startup failure pattern where jobs terminate with `steps=null` before checkout; such a run is infrastructure-blocked, not a Work Wallet code validation result.
- direct git clone in the current tool runtime still fails DNS resolution for `github.com`;
- isolated service validation is therefore pending at the time of this document commit;
- PostgreSQL schema is not applied;
- live OIDC/Person binding runtime smoke is pending;
- Chrome unpacked smoke remains blocked in the current container by browser administrator policy;
- real authorised Work Wallet portal smoke remains pending.

## External capability

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write is implemented.

## Protected surfaces

PR #91, accepted Object Card, Relationship Tree gestures/layout, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android implementation, DoorFlow and Electrical are untouched.

Draft only. Do not auto-merge, deploy or apply DB schema.
