# NOSMO Nexus — Phase 11 PKG-004 Connector / Source-of-Record Reconciliation

Status: CONTRACT_RECONCILED / PRODUCT_RUNTIME_GATED
PR: #90
Branch: `codex/nexus-mvp-modular-foundation`
Authority: `nosmo-nexus/docs/NEXUS_BUILD_CONTROL/packages/PKG_004_CONNECTOR_REGISTRY_AND_SOURCE_OF_RECORD_CONTRACT.md`

## Purpose

Reconcile the Phase 1 connector registry, Phase 7 Project Memory connector schemas, Phase 9 invariants and the current parallel connector work against PKG-004 before any real Nexus shell consumes connector state.

This phase is deliberately contract-first. It does not add a new connector runtime, credentials, vendor API, browser secret, live sync claim, Spark UI change or external write action.

## Current source state

### Registry layer

`src/registry/connectorRegistry.ts` currently lists:

- Google Drive / Nexus Cloud;
- Work Wallet;
- BIM / FabStation;
- CompanyCam;
- Hilti / Assets;
- Microsoft 365;
- Gmail / WhatsApp;
- Suppliers / Materials.

The registry currently uses simplified statuses:

- `active-reference`;
- `reference-layer`;
- `planned`;
- `disabled`.

It does not yet carry the PKG-004 integration level `0..7`, lifecycle state, authentication method, readable/writable fields, scopes, freshness or source-of-record rules in a machine-checkable form.

### Project Memory layer

`src/data/schemas/connector.schema.ts` already models most PKG-004 fields:

- integration level `0..7`;
- lifecycle state;
- authentication method;
- readable/writable object types and fields;
- event support;
- rate-limit policy;
- licence/customer-role requirements;
- source-of-record rules;
- conflict/sync policy;
- account scopes and freshness;
- object mappings, confidence, verification and read-only state.

`NexusProjectMemorySnapshot` already has:

- `connectorDefinitions`;
- `connectorAccounts`;
- `connectorObjectMappings`.

However, the current e-SAFE fixture does not populate those arrays, so PKG-004 behaviour is not yet exercised by the Project Memory invariant suite.

## Findings

### F1 — Registry maturity vocabulary is not PKG-004-complete

The Phase 1 registry status is useful for UI/catalogue presentation, but it is not enough for authorization or truthful capability display.

Required post-gate direction:

`registry catalogue status -> PKG-004 connector definition -> connector account -> object mapping`

The UI must never infer API/write capability from the catalogue status alone.

### F2 — Integration level must gate actions

PKG-004 requires one declared level:

0. MANUAL_REFERENCE
1. DEEP_LINK_HANDOFF
2. FILE_EXPORT_IMPORT
3. APPROVED_MIDDLEWARE
4. READ_ONLY_API
5. CONTROLLED_TWO_WAY_API
6. SIDECAR_OR_REPRESENTATION
7. AUTHORISED_PARTNER_EXTENSION

A connector below level 5 must not expose controlled external writes merely because a registry `actions[]` string exists.

### F3 — Lifecycle and freshness are separate

`LIVE`, `DEGRADED`, `DISCONNECTED` etc. describe connector lifecycle/connection state.

`LIVE`, `RECENT`, `STALE`, `UNKNOWN`, `SOURCE_UNAVAILABLE`, `SYNC_PENDING`, `AUTHENTICATION_ERROR`, `PERMISSION_ERROR` describe source freshness/availability.

The shell must not collapse these into one green/red label.

### F4 — Source-of-record ownership must be explicit

Examples to preserve:

- Work Wallet owns formal induction / permit / safety / audit source records;
- BIM/FabStation/model source owns geometry, external model identity and approved design intent;
- Nexus owns Project Graph relationships, operational context, cross-system history and Nexus decisions;
- DoorFlow/Nexus module owns its own fire-door process record;
- Google Drive may own file bytes/folder identity while Nexus owns file relationships, classification, project/world association and audit history.

Nexus may store references, summaries, provenance and decisions without silently copying the controlled external record.

### F5 — e-SAFE connector fixtures are missing

The e-SAFE Project World currently declares connector IDs, but Project Memory does not yet contain a corresponding connector definition/account/mapping fixture set.

Post-gate fixture coverage should remain minimal and honest:

- a manual/reference external-source connector for public CORDIS/Zenodo-style references or a clearly named source-reference adapter;
- a synthetic/demo Work Wallet connector definition only if used to test DEMO truthfulness;
- no fake customer account, token, API scope or live sync.

### F6 — `storageConnectorId = external-reference` is not a registered connector

The current e-SAFE D5.1 file uses `storageConnectorId: 'external-reference'` even though `external-reference` is not a connector registry ID.

This should not be silently treated as a real storage connector.

Post-gate choices:

1. make storage location a typed union that can explicitly represent `external-reference` / `nexus-local-reference` without pretending it is a connector; or
2. create a truthful read-only source-reference connector definition with level 0/1 and no credentials.

Do not map this to Google Drive merely to satisfy a type check.

### F7 — Current invariant suite does not validate connector topology

Phase 9 validates many Project Memory relationships but does not yet enforce PKG-004-specific connector rules.

Required post-gate invariant codes:

- `CONNECTOR_DEFINITION_MISSING`;
- `CONNECTOR_ACCOUNT_DEFINITION_MISSING`;
- `CONNECTOR_MAPPING_ACCOUNT_MISSING`;
- `CONNECTOR_MAPPING_OBJECT_MISSING`;
- `CONNECTOR_LEVEL_CAPABILITY_VIOLATION`;
- `CONNECTOR_LIFECYCLE_CAPABILITY_VIOLATION`;
- `CONNECTOR_FRESHNESS_TRUTH_VIOLATION`;
- `CONNECTOR_WRITE_WITHOUT_CONFIRMATION`;
- `CONNECTOR_SOURCE_OF_RECORD_MISSING`;
- `CONNECTOR_SECRET_BOUNDARY_VIOLATION`;
- `CONNECTOR_MAPPING_VERIFICATION_CONFLICT`.

### F8 — Secret references are references only

`credentialReference` / `secretReference` may contain server-side lookup identifiers, never credential material.

No Project Memory fixture, registry record, browser payload, exported public demo or GitHub file may contain:

- API keys;
- access tokens;
- refresh tokens;
- cookies;
- passwords;
- OAuth client secrets;
- vendor integration secrets.

### F9 — External mapping does not transfer identity authority

`ConnectorObjectMapping` maps an external object to a canonical Nexus object. It must not implicitly:

- create a Person;
- grant Project Participation;
- grant module/action permission;
- treat an external user/reference ID as Nexus `personId`;
- change source-of-record ownership.

Identity and authorization remain governed by the Person / Project Participation / access contracts.

### F10 — Parallel connector PRs already exist and must be reused, not duplicated

The repository contains parallel Work Wallet / connector-runtime work, including draft PKG-015/016/017 slices. Those PRs explicitly retain the boundary `DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API` and contain server-side/context-ticket/identity work.

PR #90 must not create a second Work Wallet gateway, second auth/session system, second connector-context model or competing production connector runtime.

Phase 11 only defines the common Project Memory truth model that later runtime stacks must reconcile into.

## Post-gate invariant policy

When implementation is explicitly released, the Project Memory validator should enforce at minimum:

1. Every connector account references an existing connector definition.
2. Every object mapping references an existing connector account and existing canonical/raw Nexus object.
3. `readOnly=true` mappings cannot be used as evidence of write capability.
4. Integration level below 5 cannot claim controlled two-way write support.
5. `CONCEPT`, `DEMO`, `DISCONNECTED`, `DEPRECATED` cannot be presented as live production integration.
6. `STALE`, `SOURCE_UNAVAILABLE`, `AUTHENTICATION_ERROR`, `PERMISSION_ERROR` cannot be presented as current live source state.
7. Unknown write capability remains disabled.
8. A submitted write remains pending until source confirmation is recorded.
9. Source-of-record ownership remains explicit for mapped domains.
10. Mapping confidence does not equal verification; AI candidates remain unverified until an allowed verification path occurs.
11. Secret material never appears in client-facing records or fixtures.

## Registry reconciliation target

Do not delete the lightweight registry. Instead separate concerns:

- Connector Registry = discoverability/catalogue and Nexus module wiring;
- ConnectorDefinition = capability truth contract;
- ConnectorAccount = tenant/customer connection state;
- ConnectorObjectMapping = object-level mapping/provenance;
- ExternalReference = source record reference and freshness/provenance;
- Access Decision = who may invoke a Nexus action;
- Runtime adapter = actual implementation, only where independently authorised.

The shell may combine these for display, but they are not interchangeable.

## e-SAFE-only validation scenarios after release

1. Public D5.1 reference is represented as read-only/source reference, not fake Drive storage.
2. A DEMO Work Wallet connector remains visibly demo and cannot expose live/write claims.
3. A stale external reference remains stale even when Nexus has a newer local interpretation.
4. A missing connector account fails mapping resolution without deleting the Nexus object.
5. An AI candidate mapping does not become verified automatically.
6. A read-only mapping cannot drive external mutation.
7. An external source record retains provider/external ID and source-of-record ownership.
8. No connector fixture contains a secret value.

## Gate

PKG-004 itself states the implementation target is an isolated connector service or Nexus Core **after founder checkpoint**. `PROJECT_CONTROL.md` also gates PKG-001 to PKG-005 product-code integration behind Joanna's Spark Smoke Test and founder checkpoint.

Therefore this Phase 11 document does not modify connector runtime, Project Memory connector arrays, registry types, e-SAFE connector fixtures or invariants yet.

The implementation slice after explicit release should be narrow:

1. reconcile registry metadata with PKG-004 capability truth;
2. add minimal connector fixtures;
3. add connector invariants;
4. fix `storageConnectorId` semantics without inventing a provider;
5. run focused TypeScript/invariant validation;
6. verify no external write/live/vendor claim was introduced;
7. then proceed to shell consumption of connector state.

## Protected surfaces

Do not touch in this phase:

- `/spark` and Joanna-protected surfaces;
- public `NOSMO-website` Relationship Tree;
- Person Card visual implementation;
- DoorFlow runtime;
- Fire Door Register runtime;
- BIM runtime;
- Work Wallet gateway/runtime branches;
- Android/APK;
- production credentials or deployment.
