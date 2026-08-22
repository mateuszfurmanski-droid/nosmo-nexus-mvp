# Work Wallet Slice V — Browser Input Validation Hardening

Status: `IMPLEMENTED / ISOLATED_BEHAVIORAL_PASS / LIVE_BROWSER_E2E_PENDING`

## Purpose

Make Work Wallet browser-side scope validation consistently fail closed for over-length values.

The extension options UI already rejected values longer than the canonical maximums. The content runtime and service worker previously used bounded slicing internally, which could normalize an invalid value to a valid prefix. Slice V removes that behavior.

## Change

`runtime.js` and `background.js` now:

- trim input;
- reject empty values;
- reject control characters;
- reject values whose full length exceeds the configured maximum;
- never truncate a project/world/account/object/reference value into a different value.

`normaliseApiBase(...)` likewise validates full input length and control characters before comparing against the fixed allowed API-base set.

The raw Context Ticket remains validated by its exact 43-character regex and is never persisted.

## Regression case

The behavioral validator constructs:

- a legal 160-character configured project ID;
- an invalid 161-character message project ID sharing the exact same first 160 characters.

The old truncation behavior could make those values equal. The hardened browser path must reject the 161-character value and must not create pending Context Ticket bootstrap state.

A legal exact 160-character value remains accepted.

## Validator

Adds:

`tools/nexus-overlay-extension/tests/validate-browser-input-hardening.mjs`

It executes the actual extension runtime/service-worker sources in controlled VM contexts and checks:

- over-length stored runtime config resolves to null rather than a truncated ID;
- the 161-character ticket-start request is rejected as `INVALID_CONTEXT_TICKET_BOOTSTRAP`;
- no pending bootstrap state is created for the rejected request;
- exact legal 160-character scope still creates one pending bootstrap;
- neither runtime nor background contains the old `.slice(0, maxLength)` normalization.

The validator is wired into normal `Validate and Build` before the other extension behavioral validators.

## Isolated result

The fail-closed 160/161 regression behavior was executed in the current local tool runtime and completed with:

`WORK_WALLET_BROWSER_INPUT_HARDENING_PASS`

This is an isolated browser-input behavioral PASS, not a Chrome/Edge E2E claim.

## External capability

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write is implemented.

## Protected surfaces

PR #91, accepted Object Card, Relationship Tree layout/gestures, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android implementation, DoorFlow and Electrical remain untouched.

Draft only. Do not auto-merge or deploy.
