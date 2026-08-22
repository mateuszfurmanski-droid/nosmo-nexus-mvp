# Work Wallet Slice U — Extension Content / Runtime Behavioral Validation

Status: `IMPLEMENTED / ISOLATED_BEHAVIORAL_PASS / CHROME_E2E_BLOCKED`

## Purpose

Validate the existing canonical MV3 Work Wallet overlay content/runtime behavior before a real unpacked-browser smoke is possible.

This slice does not create a second extension runtime and does not add a second connector path. It tests the existing `tools/nexus-overlay-extension` implementation from Slice K.

## Executable validator

Adds:

`tools/nexus-overlay-extension/tests/validate-content-route-context.mjs`

The validator executes the actual `runtime.js` and `content.js` sources inside controlled Node VM contexts.

## Runtime assertions

The runtime section verifies:

- configured project/world/connector-account scope is loaded;
- a verified context is returned only for the exact project/world/account/object-type/external-record scope;
- changing the external record makes the context stale;
- stale verified context is physically removed from extension local storage rather than merely hidden;
- `startContextTicket(...)` sends exactly one `NEXUS_CONTEXT_TICKET_START` message containing the current record metadata.

## Content-route assertions

The content section verifies:

- a Work Wallet permit detail URL is classified as `PERMIT_PAGE / permit`;
- the final path segment is captured as the exact external record reference;
- source URL persisted into Nexus context contains only origin + pathname;
- query parameters and fragments are stripped, including values that could contain portal/session secrets;
- initial verified context is rendered only when it matches the current record;
- the sidecar authorisation callback delegates to the canonical runtime ticket-start path;
- SPA navigation from a permit record to an asset record triggers refresh and renders the new `ASSET_PAGE / asset` scope;
- stale prior verified context is not rendered on the new record;
- navigating to a generic collection route such as `/permits` produces no external record reference and clears existing verified context;
- content does not call `contextForRecord` for a collection route with no exact record reference;
- local extension config/context storage changes trigger current-route re-evaluation.

## Isolated result

An isolated Node VM harness using the current GitHub `runtime.js` and `content.js` behavior executed successfully with:

`WORK_WALLET_EXTENSION_CONTENT_RUNTIME_PASS`

This is an isolated behavioral PASS. It is not an unpacked Chrome/Edge E2E claim.

## CI

The validator is wired into normal `Validate and Build` before the existing extension Context Ticket receiver validator.

GitHub-hosted workflow execution remains affected by the repository runner-startup issue and is therefore not independently claimed as CI PASS.

## Browser validation truth

Real unpacked Chromium smoke remains blocked in the current tool container by browser administrator policy (`ERR_BLOCKED_BY_ADMINISTRATOR`).

Therefore:

- content/runtime isolated behavior: PASS;
- service-worker Context Ticket receiver isolated behavior: PASS;
- real Chrome injection/Shadow DOM/bootstrap/exchange E2E: BLOCKED / PENDING;
- Edge smoke: PENDING.

## Validation note — browser configuration length

The extension options UI already rejects over-length project/world/account values. `runtime.js` and service-worker helpers still defensively normalize some stored values by bounded slicing. This is not changed in Slice U because normal configuration cannot persist those values and the server remains fail-closed; a later small hardening slice may make all browser helpers reject rather than truncate for consistency.

## External capability

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

No external Work Wallet write is implemented.

## Protected surfaces

PR #91, accepted Object Card, Relationship Tree layout/gestures, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android implementation, DoorFlow and Electrical remain untouched.

Draft only. Do not auto-merge or deploy.
