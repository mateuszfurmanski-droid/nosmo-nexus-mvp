# Work Wallet Slice T — DB-backed Context Ticket Smoke

Status: `IMPLEMENTED_IN_SOURCE / GUARDRAIL_AUDIT_PASS / LIVE_DB_SMOKE_NOT_RUN`

## Purpose

Exercise the real server-side Work Wallet Context Ticket path against the future reviewed Nexus MVP development PostgreSQL target before attempting HTTP/browser E2E.

This smoke uses the same production dependencies as the API route:

- exact canonical Person binding resolver;
- workspace-scoped Project Memory loader;
- PostgreSQL Context Ticket issue store;
- atomic PostgreSQL Context Ticket consume store;
- canonical Work Wallet issue/exchange orchestration service.

It does not replace OIDC/HTTP/browser testing. It proves the persisted canonical data + production service + production ticket store compose correctly.

## Mandatory gates

Execution is forbidden when `NODE_ENV=production`.

It requires explicit opt-in:

`NEXUS_DEV_WORK_WALLET_DB_SMOKE=true`

Before any Context Ticket is issued, the smoke executes:

1. Slice P `--assert-safe-dev` target preflight;
2. Slice S read-only canonical DB readiness verifier.

If either gate fails, ticket issue never starts.

## Production path exercised

Issue:

`resolveNexusPersonBinding -> loadNexusWorkWalletProjectMemoryScope -> canonical mapping/access service -> issueNexusContextTicket`

Exchange:

`consumeNexusContextTicket -> current Project Memory reload -> canonical mapping/access re-check -> sanitized verified context`

The smoke then attempts one replay and requires `INVALID_TICKET`.

## Mutation boundary

The smoke does not directly execute SQL.

It does not:

- migrate schema;
- create/update Person;
- create/update OIDC binding;
- create/update workspace;
- create/update canonical object;
- create/update Participation;
- create/update PermissionGrant;
- create/update AccessDecision;
- create/update connector account;
- create/update mapping;
- call external HTTP services.

The only intended DB mutation is the normal production Context Ticket lifecycle: insert one short-lived digest-only capability record and atomically mark it consumed.

## Raw-ticket handling

The 43-character raw Context Ticket:

- exists only in process memory;
- is removed from the issue result object immediately;
- is used for first exchange and replay assertion only;
- is cleared afterwards;
- is never printed or included in JSON output.

## Success conditions

The future live development smoke must prove:

- ticket issue returns `ISSUED`;
- ticket purpose is `CONNECTOR_CONTEXT_READ`;
- ticket has a future expiry;
- exchange returns `VERIFIED_CONTEXT`;
- context schema is `nexus-work-wallet-context/v1`;
- context source is `CONNECTOR_VERIFIED_CONTEXT`;
- canonical Person/project/object and external locator exactly match the reviewed fixture;
- verification source remains `WORK_WALLET_DEMO`;
- development context remains explicit;
- external capability label remains truthful;
- replay returns `INVALID_TICKET`.

Expected successful smoke output schema:

`nexus-work-wallet-db-context-ticket-smoke/v1`

No raw ticket is included.

## Commands

Manual, mutating development smoke:

`pnpm --filter @workspace/api-server smoke:work-wallet-db-context-ticket`

Non-mutating guardrail audit:

`pnpm --filter @workspace/api-server audit:work-wallet-db-context-ticket-smoke`

The smoke command is deliberately NOT wired into CI. Only the audit is.

## Audit result

The guardrail audit was executed locally against the current Slice T smoke source and completed with:

`WORK_WALLET_DB_CONTEXT_TICKET_SMOKE_AUDIT_PASS`

The audit verifies production hard-stop, explicit opt-in, preflight/readiness ordering, production dependency use, deterministic fixture scope, raw-ticket cleanup, replay rejection, no direct DML/DDL/schema/bootstrap commands, no external HTTP call and no secret/ticket logging.

The workflow is required to run only the non-mutating audit and must not invoke the DB smoke command.

## Live execution truth

`LIVE_DB_SMOKE_NOT_RUN`

Reason:

- safe Nexus MVP development PostgreSQL target is not yet identified;
- schema is not applied;
- canonical Person/OIDC binding is not bootstrapped;
- Slice R fixture is not bootstrapped;
- Slice S live readiness has not passed.

## Next controlled sequence

1. identify and approve real non-production Nexus MVP Postgres;
2. inspect schema diff and apply reviewed schema only there;
3. bootstrap Person/OIDC binding explicitly;
4. bootstrap Slice R synthetic canonical Work Wallet scope;
5. run Slice S read-only readiness;
6. run this Slice T DB-backed ticket smoke;
7. only after Slice T PASS, run authenticated HTTP issue/bootstrap/exchange smoke;
8. unpacked Chrome E2E;
9. Edge smoke;
10. authorised real Work Wallet portal smoke when access is available.

## External capability

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write is implemented.

## Protected surfaces

PR #91, accepted Object Card, Relationship Tree layout/gestures, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android implementation, DoorFlow and Electrical remain untouched.

Draft only. Do not auto-merge, deploy, migrate or run the live DB smoke automatically.
