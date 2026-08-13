# NOSMO Nexus Overlay Prototype — PKG-013

Status: **DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API**

This folder contains the isolated Chrome / Edge Manifest V3 prototype of the reusable NOSMO Nexus Overlay Runtime. Work Wallet is the first adapter.

## Security / external boundary

Approved prototype host:

```text
https://portal.work-wallet.com/*
```

Requested permissions:

```text
permission: storage
host: https://portal.work-wallet.com/*
```

The prototype has:

- no Work Wallet API key;
- no live Work Wallet sync;
- no Work Wallet write capability;
- no password, cookie or bearer-token capture;
- no request interception;
- no hidden form submission;
- no automatic approval, permit, incident, audit or sign-off action;
- no claim of Work Wallet partnership, certification or approval.

Work Wallet remains source-of-record for its formal safety/compliance records.

## Implemented

- Manifest V3 extension shell;
- one fixed Nexus `N` launcher;
- Shadow DOM sidecar;
- Work Wallet adapter and reusable adapter fixture;
- local Nexus Context Packet;
- SPA route-continuity watcher;
- safe URL/path-only external-page hints;
- local non-vendor Work Wallet mock;
- project/person/task/document context display;
- Project Tree, People, Tasks, Plans, Communication, External Tools, Integrations and Connector Status launch surfaces;
- Call / SMS / WhatsApp / Gmail / Teams launch-only strip;
- local-only Supply Request drafts;
- adapter enable/disable state;
- minimal local diagnostics;
- Work Wallet → Relationship Tree focused handoff;
- exact user-confirmed Work Wallet record → Nexus node mapping registry;
- dependency-free validators.

## Relationship Tree handoff

PKG-014 consumes the controlled launch contract:

```text
/relationship-tree?nexusSource=work-wallet&nexusFocus=<NEXUS_NODE_ID>
```

The overlay carries optional Nexus-owned navigation metadata:

```text
nexusNodeId
```

A Work Wallet external record ID is never automatically treated as a Nexus node ID.

### Synthetic mock mappings

Only the local development mock has automatic mappings:

```text
project | halifax-demo      -> proj
person  | person-demo-001   -> p-mateusz
job     | JOB-01            -> t-install
```

Permit, Audit and Risk mock records deliberately fall back to the generic Relationship Tree unless an explicit local mapping is added.

## Explicit local Work Wallet record mapping

Extension Options contains an optional exact mapping registry for an authorised real Work Wallet route before an official connector supplies verified mapping data.

Contract:

```text
project + object type + external record reference -> Nexus node ID
```

Example:

```text
halifax-demo + permit + PER-201 -> t-fire
```

Rules:

- exact composite-key match only;
- no fuzzy/prefix/substring match;
- no cross-project, cross-type or cross-application reuse;
- safe identifier validation;
- stored only in `chrome.storage.local`;
- labelled `USER_CONFIRMED_LOCAL_MAPPING`;
- stale focus is cleared on route change;
- mapping can be removed at any time;
- nothing is written to Work Wallet.

## Account-free local mock

A Work Wallet account is not required for UI/runtime development.

1. Load the extension unpacked.
2. Open extension Options.
3. Click `Open local Work Wallet mock`.
4. Use Dashboard, People, Jobs, Permits, Audits and Risk.
5. Seed the Halifax demo context.
6. Open the Nexus sidecar.
7. Verify `DEMO / LOCAL CONTEXT`.
8. Test Project Tree, communication launch actions, Supply Request and Connector Status.
9. Disable/re-enable the overlay and verify the mock remains operational.

The mock is an extension-owned test harness. It is **not Work Wallet** and contains only synthetic data.

## Load unpacked

Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose `Load unpacked`.
4. Select `tools/nexus-overlay-extension`.

Edge:

1. Open `edge://extensions`.
2. Enable Developer mode.
3. Choose `Load unpacked`.
4. Select `tools/nexus-overlay-extension`.

Confirm site access remains limited to `portal.work-wallet.com`.

## Validation

Primary validator:

```bash
node tools/nexus-overlay-extension/tests/validate-extension.mjs
```

It performs static package-contract checks and invokes:

```bash
node tools/nexus-overlay-extension/tests/validate-tree-handoff.mjs
node tools/nexus-overlay-extension/tests/validate-record-mapping.mjs
```

The behavioural validators check focused Tree URLs, safe fallback, exact record mapping, cross-project/type/application isolation, unsafe ID rejection and mapping removal.

## Real Work Wallet smoke test — still required

Using an authorised Work Wallet session:

1. Confirm exactly one Nexus launcher appears.
2. Open/close the sidecar without changing Work Wallet state.
3. Navigate normal portal routes and verify no duplicate overlay appears.
4. Confirm URL-only page hints are not labelled connector-verified.
5. Add an exact local external-reference → Nexus-node mapping in Options.
6. Open that exact Work Wallet record route.
7. Confirm Project Tree opens the expected `nexusFocus` target.
8. Navigate to another record and verify stale focus is not reused.
9. Disable/re-enable the overlay.
10. Confirm no Work Wallet form is submitted.

Chrome and Edge visual smoke tests remain required before merge review.

## Current limitations

- no vendor-approved/live Work Wallet API integration;
- no production rollout;
- no automatic mapping from arbitrary Work Wallet IDs to Nexus nodes;
- no Gmail/Teams OAuth or automatic message sending;
- no native Android/iOS overlay;
- `Ask Nexus` is not connected in this slice;
- real portal compatibility still requires an authorised Work Wallet account or vendor sandbox/demo tenant.

## Package boundary

PKG-013 may modify only:

```text
tools/nexus-overlay-extension/**
```

Any required change outside this folder is a separate controlled package / decision.
