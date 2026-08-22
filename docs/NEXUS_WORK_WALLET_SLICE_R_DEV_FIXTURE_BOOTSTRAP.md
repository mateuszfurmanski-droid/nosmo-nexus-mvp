# Work Wallet Slice R — Preflight-Gated Development Fixture Bootstrap

Status: `IMPLEMENTED_IN_SOURCE / NOT_EXECUTED / DB_SCHEMA_NOT_APPLIED`

## Purpose

Prepare one synthetic, explicit Work Wallet canonical scope for a future DB-backed issue/exchange smoke after a safe non-production `nosmo-nexus-mvp` PostgreSQL target is identified and the proposed schema is reviewed/applied.

This slice does not run the bootstrap.

## Separation from authentication

The fixture bootstrap does not create:

- workspace records;
- canonical Person records;
- OIDC/provider identity bindings.

It requires an existing workspace and an existing active canonical Nexus Person. Authentication identity remains the responsibility of the separate development identity bootstrap.

This preserves the architecture rule:

`authentication != canonical Person binding != Project Participation != permission`.

## Mandatory gates

Execution is forbidden when `NODE_ENV=production`.

It also requires explicit:

`NEXUS_DEV_WORK_WALLET_BOOTSTRAP=true`.

Before a PostgreSQL pool is created, the script invokes Slice P:

`verify-nexus-work-wallet-db-target.mjs --assert-safe-dev`

Therefore the reviewed DB fingerprint, development-purpose attestation, Postgres identity-binding mode and exact Chromium extension-origin configuration must already pass.

## Synthetic fixture scope

The bootstrap creates only deterministic records derived from an explicit fixture key:

- one canonical Nexus Object;
- one Work Wallet connector account with `connectorDefinitionId=work-wallet`;
- one exact `verified-external-id` read-only mapping;
- one active Project Participation;
- one explicit allow PermissionGrant for `work-wallet / connector.context.read` and the exact object;
- one matching allowed AccessDecision.

Project ID, World ID, external object type/reference, workspace ID and canonical Person ID are all explicit development inputs.

No e-SAFE, Riverside, Halifax or other real/demo project is hard-coded.

## Transaction / conflict behavior

All fixture records are checked/created in one PostgreSQL transaction.

For each deterministic ID:

- missing record -> insert;
- existing record with the exact same indexed scope -> reuse;
- existing record with different scope -> fail;
- any failure -> rollback.

The script does not silently update canonical records and does not use `ON CONFLICT DO UPDATE`.

## Guardrail audit

Adds:

`audit-nexus-work-wallet-dev-fixture-bootstrap.mjs`

Expected marker:

`WORK_WALLET_DEV_FIXTURE_BOOTSTRAP_AUDIT_PASS`

The audit verifies production hard-stop, explicit opt-in, safe-target preflight before DB pool creation, existing workspace/Person requirements, transaction/rollback behavior, exact six-table scope, Work Wallet connector/mapping/access semantics, and absence of Person/identity/workspace creation or project-specific coupling.

Only this audit is wired into normal CI. The mutating bootstrap command is never executed by CI.

## Execution status

`NOT_EXECUTED`.

A safe Nexus MVP development database has not been identified and the Work Wallet schema has not been applied. Running this bootstrap before those conditions are met is intentionally blocked.

## Future DB smoke sequence

After a real safe dev DB is identified:

1. Slice P inspect + reviewed fingerprint + `--assert-safe-dev`;
2. Slice Q schema audit and actual Drizzle diff review;
3. apply proposed schema to non-production only;
4. run separate identity bootstrap for one explicit dev Person/provider subject;
5. run this Work Wallet synthetic fixture bootstrap;
6. verify `/api/nexus/session` becomes `BOUND` for that identity;
7. run same-origin Context Ticket issue;
8. run exact-origin one-time exchange;
9. confirm current canonical access re-check and sanitized context;
10. then run unpacked Chromium overlay E2E.

## External capability

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write is implemented.

## Protected surfaces

PR #91, accepted Object Card, Relationship Tree gestures/layout, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android implementation, DoorFlow and Electrical remain untouched.

Draft only. Do not auto-merge, deploy, apply DB schema or run the mutating bootstrap automatically.
