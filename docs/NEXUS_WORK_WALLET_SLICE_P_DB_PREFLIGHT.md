# Work Wallet Slice P — Safe Development DB Target Preflight

Status: `IMPLEMENTED / LOCAL_PREFLIGHT_PASS / DB_SCHEMA_NOT_APPLIED`

## Purpose

Prepare the Work Wallet runtime for a future non-production PostgreSQL schema review without guessing which `DATABASE_URL` belongs to `nosmo-nexus-mvp` and without exposing database credentials or silently applying schema changes.

This slice does **not** connect to PostgreSQL and does **not** run Drizzle schema push.

## Preflight commands

The DB package now exposes:

- `preflight-nexus-work-wallet-db` — inspect the current runtime and print a safe target fingerprint plus boolean readiness checks;
- `assert-nexus-work-wallet-db` — fail closed unless the exact development target has already been reviewed and attested;
- `test:nexus-work-wallet-db-preflight` — behavioral test for the guard.

No existing `push` or `push-force` command is invoked by these preflight commands.

## Database target fingerprint

`DATABASE_URL` is parsed only to identify the database target.

The report does not print:

- database hostname;
- username;
- password;
- database name;
- connection query parameters;
- raw `DATABASE_URL`.

Instead it emits a SHA-256 fingerprint of the normalized `host + port + database-path` target.

The workflow is intentionally two-step:

1. inspect an environment and record the safe fingerprint;
2. only after that target is independently confirmed as the intended `nosmo-nexus-mvp` development database, set the same fingerprint in `NEXUS_WORK_WALLET_DB_EXPECTED_FINGERPRINT`.

A different database target then fails closed even if the same application secrets/configuration are copied elsewhere.

## `--assert-safe-dev` requirements

All checks must pass:

- `DATABASE_URL` exists;
- URL protocol is PostgreSQL;
- runtime is not `NODE_ENV=production`;
- `NEXUS_WORK_WALLET_DB_TARGET_PURPOSE=nosmo-nexus-mvp-development`;
- `NEXUS_WORK_WALLET_DB_EXPECTED_FINGERPRINT` is a valid SHA-256 fingerprint;
- current target fingerprint exactly matches the reviewed fingerprint;
- `NEXUS_IDENTITY_BINDING_MODE=postgres`;
- at least one exact Chromium extension origin exists in `NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS`;
- the context-ticket origin list contains no malformed entries.

Failure returns exit code 2 and explicitly states that no schema command was executed.

## Behavioral validation

`test-verify-nexus-work-wallet-db-target.mjs` covers:

- empty environment -> inspect reports not ready;
- empty environment with assert -> rejected;
- valid target before fingerprint approval -> not ready;
- reviewed matching fingerprint -> ready;
- wrong fingerprint -> rejected;
- production environment -> rejected;
- wrong target purpose -> rejected;
- missing Chromium extension origin -> rejected;
- malformed context-ticket origin -> rejected;
- no host/user/password/database leakage in stdout/stderr.

Local isolated execution completed with:

`WORK_WALLET_DB_PREFLIGHT_PASS`

The validator is also wired into the normal `Validate and Build` workflow. GitHub Actions runner-startup failures remain an infrastructure blocker and are not counted as code validation failures.

## Current DB truth

A safe `nosmo-nexus-mvp` development database has still **not** been identified in the connected runtime.

The Replit application `WeightySeveralPorts` could not be verified because repeated Replit Agent inspection attempts timed out. It is therefore not treated as a safe DB target.

The known `Nexus Data Fetcher` database is not used for this Work Wallet stack.

No schema application, bootstrap or live DB mutation was performed in this slice.

## Next safe DB sequence

1. identify a real non-production `nosmo-nexus-mvp` PostgreSQL environment;
2. run inspect preflight without exposing credentials;
3. independently confirm ownership/purpose of that target;
4. pin its fingerprint and development-purpose attestation;
5. run `--assert-safe-dev`;
6. inspect the Drizzle schema diff;
7. only then consider schema application;
8. after schema application, bootstrap one explicit development canonical Person binding and canonical Work Wallet access/mapping fixture;
9. run DB-backed issue/exchange smoke;
10. only after that proceed to unpacked browser E2E.

## External capability

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write is implemented.

## Protected surfaces

PR #91, accepted Object Card, Relationship Tree gestures/layout, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android implementation, DoorFlow and Electrical remain untouched.

Draft only. Do not auto-merge, deploy or apply DB schema.
