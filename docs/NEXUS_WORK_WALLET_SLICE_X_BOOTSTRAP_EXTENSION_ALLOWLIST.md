# Work Wallet Reconciliation — Slice X: Bootstrap Extension Allowlist Regression

Status: `VALIDATION ADDED / ISOLATED PASS / LIVE BROWSER E2E PENDING`

External capability remains exactly:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

## Scope

Slice X adds a narrow regression for the existing authenticated Context Ticket bootstrap policy. No runtime authorization rule is changed.

The bootstrap parser already derives:

`chrome-extension://<extensionId>`

and requires exact membership in:

`NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS`.

This slice makes that requirement executable and explicit.

## Regression cases

The validator uses two syntactically valid Chromium extension IDs.

1. The reviewed ID is present in the server allowlist and the bootstrap request is accepted.
2. A different but fully valid 32-character extension ID is not present in the allowlist and the bootstrap request is rejected.
3. After that second exact extension origin is explicitly added to the allowlist, the same request is accepted.

Therefore extension ID syntax alone never grants bootstrap authority.

## Validation

Added:

`validate:work-wallet-bootstrap-extension-allowlist`

The isolated regression completed with:

`WORK_WALLET_BOOTSTRAP_EXTENSION_ALLOWLIST_PASS`

The validator is wired into normal `Validate and Build` immediately after the existing authenticated bootstrap validation.

GitHub-hosted PASS is not claimed while repository Actions continues to fail before runner steps.

## Remaining truth

- bootstrap exact extension allowlist behavior: isolated PASS;
- HTTP origin boundary: isolated PASS in Slice W;
- safe Nexus MVP development Postgres: not identified;
- DB schema: not applied;
- DB-backed Context Ticket smoke: not run;
- unpacked Chrome E2E: blocked by current container browser administrator policy;
- Edge smoke: pending;
- authorised real Work Wallet portal smoke: pending.

No external Work Wallet write, deployment, schema mutation, PR #91 change or protected UI change is included.
