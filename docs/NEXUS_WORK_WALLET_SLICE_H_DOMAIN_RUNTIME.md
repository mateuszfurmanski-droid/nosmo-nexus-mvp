# Work Wallet Slice H — Canonical Domain Runtime Bridge

Status: `IMPLEMENTED / ROUTES NOT ENABLED / DB_SCHEMA_NOT_APPLIED`

## Purpose

The API runtime must invoke the same Work Wallet mapping, access and sanitized-context logic already established on the #90-native source line. It must not copy those rules into Express route handlers.

## Canonical composition

`server Project Memory loader (#109)`

→ `materializeWorkWalletDomainScope(...)`

→ `resolveWorkWalletCanonicalMapping(...)` from Slice A / PR #92

→ `evaluateWorkWalletTicketEligibility(...)` from Slice D / PR #99

→ after successful issue/exchange access re-check, `buildWorkWalletVerifiedContext(...)` from Slice B / PR #95.

`artifacts/api-server/src/lib/work-wallet-domain-runtime.ts` is only a runtime composition and validation adapter. It does not own mapping policy, permission policy, Person identity, Project Participation, AccessDecision or verified-context semantics.

## Build boundary

`@workspace/api-server` TypeScript `rootDir` is widened to the repository root so the server may consume canonical source modules directly. The production build already uses esbuild bundling and can follow these static source imports. No second shared package or copied domain implementation is introduced.

## Fail-closed rules

The runtime adapter rejects malformed Project Memory JSON before invoking canonical domain functions. A loader/storage mismatch or incomplete record becomes `CANONICAL_SCOPE_INVALID`; it is never converted into an allow.

Mapping remains exact and server verified. Access remains active canonical Person + exactly one active Project Participation + explicit allow + no matching deny + latest exact allowed AccessDecision.

## Not enabled yet

No HTTP Context Ticket route is enabled by this slice.

Next slice must compose:

1. existing authenticated Nexus session;
2. PR #106 exact canonical Person binding;
3. PR #109 Project Memory loader;
4. this runtime bridge;
5. PR #102 single-use 60-second Context Ticket core;
6. origin validation before consume;
7. full canonical access re-check after consume;
8. sanitized PR #95 context only after the re-check succeeds.

## External capability truth

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write capability is introduced.
