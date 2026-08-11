# NOSMO Nexus Overlay Prototype — PKG-013 + PKG-015 bridge

Status: **DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API**

This folder contains the Chrome / Edge Manifest V3 NOSMO Nexus Overlay Runtime. Work Wallet is the first external adapter. PKG-015 adds a development-safe connector-originated Context Packet on top of the PKG-013 overlay without turning the browser extension into a holder of server credentials.

## Security / external boundary

The Work Wallet content script still injects only on:

```text
https://portal.work-wallet.com/*
```

Extension API permission remains:

```text
storage
```

Exact host permissions used by PKG-015 are:

```text
https://portal.work-wallet.com/*
https://nosmotechnology.co.uk/*
http://127.0.0.1:3000/*
```

The two Nexus hosts are for service-worker connector fetches. They do not receive content-script injection.

The prototype has:

- no Work Wallet API key in the browser;
- no server-to-server integration key in extension source, storage or URL;
- no live Work Wallet customer sync claim;
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
- Project Tree, People, Tasks, Plans, Communication, External Tools, Integrations and Connector Status launch surfaces;
- Call / SMS / WhatsApp / Gmail / Teams launch-only strip;
- local-only Supply Request drafts;
- Work Wallet → Relationship Tree focused handoff;
- exact user-confirmed Work Wallet record → Nexus node mapping registry;
- PKG-015 service-worker connector-context client;
- visible `DEMO / CONNECTOR VERIFIED` state;
- connector provenance fields (`contextSchema`, `verificationSource`, `verifiedAt`, `sourceEventId`);
- dependency-free package and behavioural validators.

## Relationship Tree handoff

PKG-014 consumes:

```text
/relationship-tree?nexusSource=work-wallet&nexusFocus=<NEXUS_NODE_ID>
```

The overlay carries optional Nexus-owned navigation metadata:

```text
nexusNodeId
```

A Work Wallet external record ID is never automatically treated as a Nexus node ID.

Synthetic mock mappings remain explicit:

```text
project | halifax-demo      -> proj
person  | person-demo-001   -> p-mateusz
job     | JOB-01            -> t-install
```

Permit, Audit and Risk mock records fall back to the generic Relationship Tree unless an explicit local mapping or Nexus connector mapping exists.

## Connector-verified development context

PKG-015 uses the existing Nexus Work Wallet gateway rather than a second connector.

Development flow:

```text
local Work Wallet mock
-> extension service worker
-> Nexus demo event endpoint
-> Nexus server normalises/stores event
-> Nexus server returns nexus-work-wallet-context/v1
-> Overlay stores CONNECTOR_VERIFIED_CONTEXT
-> sidecar shows DEMO / CONNECTOR VERIFIED
-> server-owned nexusNodeId may drive PKG-014 focus
```

The connector response is deliberately minimal. It carries project/person/reference/object/navigation provenance but not event `title` or `detail`.

`DEMO / CONNECTOR VERIFIED` means the Nexus connector accepted and normalised a **synthetic development event**. It is not a claim that a live Work Wallet customer record was vendor-verified.

The server-to-server inbound integration key is never used by the extension. Production browser verification requires a separate authenticated Nexus session, short-lived context ticket, or equivalent approved partner/OAuth mechanism.

## Connector API target

Options exposes only two controlled development targets:

```text
http://127.0.0.1:3000
https://nosmotechnology.co.uk
```

The local server is the default. There is no arbitrary connector URL field and no integration-key field.

The public host option is only useful once that deployment exposes the matching Nexus connector API. Do not infer public deployment from the presence of the option.

## Explicit local Work Wallet record mapping

The PKG-013 fallback registry remains available when connector context is unavailable.

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

A Work Wallet account is not required for development testing.

1. Start a local Nexus server on port 3000 when connector verification is required.
2. Load the extension unpacked.
3. Open extension Options.
4. Keep `Local Nexus server — http://127.0.0.1:3000` selected.
5. Click `Open local Work Wallet mock`.
6. Use Dashboard, People, Jobs, Permits, Audits and Risk.
7. Seed the Halifax demo context.
8. Open the Nexus sidecar and confirm `DEMO / LOCAL CONTEXT`.
9. Click `Verify via Nexus Connector`.
10. When the local Nexus API is available, confirm `DEMO / CONNECTOR VERIFIED`.
11. On Jobs / `JOB-01`, Project Tree may use server-owned `t-install` focus.
12. On an unmapped Permit/Audit/Risk record, connector verification remains valid but Project Tree falls back to the generic tree.
13. Change route and confirm the prior record's verified state is not carried to the new record before re-verification.

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

Review the exact site-access list before testing.

## Validation

Primary overlay validator:

```bash
node tools/nexus-overlay-extension/tests/validate-extension.mjs
```

It invokes:

```bash
node tools/nexus-overlay-extension/tests/validate-tree-handoff.mjs
node tools/nexus-overlay-extension/tests/validate-record-mapping.mjs
node tools/nexus-overlay-extension/tests/validate-connector-context.mjs
```

Server connector context validator:

```bash
node scripts/src/validate-work-wallet-context.mjs
```

PKG-015 GitHub Actions runs both validators from a complete checkout before workspace typecheck/build and then exercises demo and protected Work Wallet context endpoints with synthetic CI data.

## Real Work Wallet smoke test — still required

Using an authorised Work Wallet session:

1. Confirm exactly one Nexus launcher appears.
2. Open/close the sidecar without changing Work Wallet state.
3. Navigate normal portal routes and verify no duplicate overlay appears.
4. Confirm URL-only page hints are not labelled connector-verified.
5. Confirm the extension never requests or stores the server-to-server integration key.
6. Use exact local mapping only where explicitly configured.
7. Navigate to another record and verify stale focus is not reused.
8. Disable/re-enable the overlay.
9. Confirm no Work Wallet form is submitted.

Real portal `CONNECTOR VERIFIED` is deliberately out of scope until browser authentication/ticketing is implemented. Chrome and Edge visual smoke tests remain required before merge review.

## Current limitations

- no vendor-approved/live Work Wallet API integration;
- no production browser authentication/ticket for connector context;
- no production rollout;
- no automatic mapping from arbitrary Work Wallet IDs to Nexus nodes;
- no Gmail/Teams OAuth or automatic message sending;
- no native Android/iOS overlay;
- `Ask Nexus` is not connected in this slice;
- real portal compatibility still requires an authorised Work Wallet account or vendor sandbox/demo tenant.

## Package boundary

PKG-013 extension work remains inside:

```text
tools/nexus-overlay-extension/**
```

PKG-015 additionally changes the existing Nexus Work Wallet server boundary and CI under its own controlled package. It does not modify WorkSuite, e-SAFE Project World, Cloud Data Layer, Relationship Tree gesture algorithms, DoorFlow or Electrical Commissioning.
