# NOSMO Nexus — Work Wallet Reconciliation

Status: SLICE_A_IMPLEMENTED / RUNTIME_RECONCILIATION_PENDING
Foundation: PR #90 / `codex/nexus-mvp-modular-foundation`
Integration branch: `codex/work-wallet-reconcile-slice-a`
Audit baseline: `35a6757ce19fe590754fb7ad13ed48a68cb51705`

External capability label:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

This label means NOSMO Nexus does not currently have a vendor-approved live Work Wallet API integration. Work Wallet's public support material does document administrator-created API keys and an official Zapier integration; those are vendor capability evidence for a future authorised adapter, not evidence that Nexus is currently connected.

## Protected surfaces

This reconciliation does not modify:

- PR #91 / Spark SKANSKA Demo Core;
- accepted Object Card design;
- Relationship Tree gestures/layout;
- Person Card UI;
- Nexus Cloud / Google Drive development;
- BIM / IFC / FabStation;
- Android Work Mode;
- DoorFlow / Fire Door Register;
- Electrical Commissioning;
- external Work Wallet records or status.

## Current foundation findings

PR #90 already contains the canonical connector catalogue and Project Memory connector/object-mapping schemas. It also contains the Phase 14 auth/identity reconciliation boundary.

The current foundation inherits one historical Work Wallet gateway module at:

`scripts/src/work-wallet-api.mjs`

It does not contain the PKG-015 `work-wallet-context.mjs`, PKG-016 Context Ticket runtime, or `tools/nexus-overlay-extension` package.

Therefore the correct reconciliation direction is:

`#90 canonical contracts -> adapt existing donor runtime -> keep one gateway/context/auth path`

not:

`copy old Work Wallet stack beside #90`.

## Donor classification

### Browser client

- PR #18: Manifest V3 Shadow DOM overlay, exact Work Wallet host, route continuity, local mock and exact local mapping.
- PR #52: `nexus-work-wallet-context/v1`, `CONNECTOR_VERIFIED_CONTEXT`, server-owned mapping and browser-without-integration-key boundary.
- PR #63: memory-only raw Context Ticket receiver, one exchange attempt and sanitized verified-context persistence.

Use these as one client lineage. Do not create another overlay.

### Server/auth/runtime

- PR #54: canonical browser-session facade.
- PR #55: exact provider-subject -> canonical Person binding.
- PR #56: historical Project Participation persistence/policy donor.
- PR #57: one Express runtime and bridge to the existing Work Wallet gateway.
- PR #58: Work Wallet context folded into that same runtime.
- PR #59: 60-second, single-use Context Ticket server flow.
- PR #60: exact-origin CORS hardening.
- PR #61: authenticated Nexus bootstrap page.

Use these as one server lineage, with one required policy correction: PR #56's historical `active participation` allow rule is not sufficient under #90. Ticket issue and exchange must consume the canonical #90 access decision, where active Project Participation alone does not grant permission.

## Slice A — canonical mapping and capability truth

Implemented on this branch:

1. Work Wallet catalogue mode is no longer described as current `api-sync` capability.
2. Current canonical mode is read/context/navigation with no external write or Project Graph mutation claim.
3. The external capability label is machine-visible from the Work Wallet connector contract.
4. `resolveWorkWalletCanonicalMapping(...)` uses the existing #90 `NexusConnectorObjectMappingRecord` rather than inventing another mapping registry.
5. Mapping resolution requires:
   - exact connector account;
   - exact project;
   - exact external object type;
   - exact external record reference;
   - one server-verified mapping;
   - one active canonical Nexus object in the same project.
6. `verified-external-id` mappings are accepted. Manual mappings are accepted only when they carry explicit `verifiedBy` and `verifiedAt` evidence.
7. Fuzzy/filename/email/BIM/AI-candidate/unknown mapping methods cannot produce connector-verified Work Wallet focus.
8. External Work Wallet identity is never promoted to Nexus canonical identity.

This slice intentionally does not create a second Context Packet, gateway, overlay, Person resolver, Project Participation model, connector registry or auth implementation.

## Donor correction required before runtime port

The historical PKG-015 server mapping key used `project + external reference` for `nexusNodeId` resolution. That is weaker than the current required contract.

The reconciled server path must use:

`connector account + exact project + external object type + exact external reference -> canonical Nexus object`

Only after canonical object resolution may an existing graph projection determine an appropriate Relationship Tree node/focus. A Work Wallet external ID must never be used directly as a Nexus Object/Node ID.

## Next runtime slices

### Slice B — gateway/context reconciliation

Reuse `scripts/src/work-wallet-api.mjs` as the only gateway. Port the PKG-015 context capability from #58, but replace its old environment node-map authority with the Slice A canonical mapping boundary. Preserve `nexus-work-wallet-context/v1` unless a compatibility migration is explicitly designed for both server and extension together.

### Slice C — auth/access/ticket reconciliation

Port/reconcile #54-#61 into the #90 runtime semantics. Provider identity -> canonical Person remains server-owned. Convert historical Project Participation persistence into #90 access inputs. Require an explicit canonical #90 allow decision at ticket issue and exchange. Preserve short TTL, single use, exact origins, no URL ticket, no persistent raw-ticket storage, no browser integration secret and no retry after consumption.

### Slice D — browser client reconciliation

Use the #18 -> #52 -> #63 extension lineage as the only overlay. Preserve Manifest V3, Shadow DOM, exact host permissions, route-clears-stale-context behavior and memory-only ticket handling. The extension must consume the same context schema emitted by the server.

### Slice E — browser E2E

Required labels:

- Chrome unpacked against local Work Wallet mock: `LOCAL CONNECTOR E2E PASS` only after actual browser evidence.
- Edge unpacked: PASS or explicit PENDING.
- Real `portal.work-wallet.com`: no LIVE claim without authorised access and vendor/customer permission.

### Slice F — official API readiness

Work Wallet public support currently exposes an Integrations API area, API-key creation with permission selection, and Zapier events. Before an official Nexus API adapter is implemented, obtain authorised customer/vendor documentation defining endpoints, scopes, rate limits, data model, webhook/event semantics, test environment and allowed use. Keep Work Wallet as source-of-record for its formal records and keep external writes disabled by default.

## Write boundary

Current connector direction remains READ / CONTEXT / NAVIGATION.

Do not automatically:

- close permits;
- approve audits;
- sign inspections;
- create formal incidents;
- change compliance status.

Any future external write requires a separate explicit contract, provider capability evidence, server-side authorization and human approval.
