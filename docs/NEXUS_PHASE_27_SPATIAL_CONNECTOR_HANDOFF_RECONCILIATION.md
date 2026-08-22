# NOSMO Nexus — Phase 27 SpatialConnector Hand-off Reconciliation

Status: DRAFT CONTROLLED SLICE  
Base: PR #108 / `codex/worksuite-project-memory-commit-slice-g`  
Branch: `codex/bim-spatial-handoff-slice-h`  
Architecture authority: `mateuszfurmanski-droid/nosmo-nexus#17` / PKG-012

## Purpose

Reconcile the historical PR #51 SpatialConnector concept onto the current #90-native BIM/IFC/WorkSuite stack without claiming a FabStation integration or creating a vendor-specific core.

Canonical phrase remains:

`FabStation guides the work. Nexus remembers the work.`

## Connector catalogue correction

The early #90 connector scaffold still claimed:

- BIM/FabStation `ownsData = true`;
- evidence creation;
- Project Graph update capability;
- write-style model-link capabilities.

Those claims are too strong for the current verified capability state.

This slice corrects the existing compatibility connector ID `bim-fabstation` to a truthful vendor-neutral contract:

- display name: `BIM / Spatial partner`;
- mode: `manual-handoff`;
- `ownsData = false`;
- `canCreateNexusEvidence = false`;
- `canUpdateProjectGraph = false`;
- only read/review packet-preparation capabilities are declared;
- no API, SDK, deep link, webhook, embedded viewer or live-sync claim.

The connector ID is retained only for compatibility with existing registry references.

## Packet contract

Schema:

`nexus-spatial-hand-off/v1`

Source:

`src/connectors/bim-fabstation/spatialHandoff.ts`

The packet is built from the current canonical IFC identity projection and bounded operational context.

Allowed packet context includes:

- stable Nexus Object ID;
- mapped IFC GlobalId;
- optional diagnostic STEP/express ID;
- IFC schema / IFCPROJECT GlobalId;
- model revision;
- source file name and optional SHA-256;
- explicit provenance class;
- exact Nexus project/world;
- optional work package / task / inspection / issue / Change Event IDs;
- selected Nexus operational state.

## Hard boundaries

The packet structurally declares:

- `containsRawIfc = false`;
- `containsFullPsets = false`;
- `containsGeometryArrays = false`;
- `containsMeshes = false`;
- `containsCredentials = false`;
- `containsPartnerWriteInstruction = false`;
- `writesPartnerState = false`;
- `writesNexusState = false`;
- `isLiveSync = false`;
- `adapterExecution = false`;
- `requiresHumanReview = true`.

The serialized packet is capped at 16 KiB.

## Scope gates

Packet preparation fails closed when:

- project/world scope is missing;
- IFC identity project differs from operational project;
- IFC identity world differs from operational world;
- partner descriptor is invalid;
- bounded packet size is exceeded.

## FabStation current descriptor

Default descriptor remains:

- connector ID: `fabstation-candidate`;
- maturity: `SYNTHETIC_DEMO`;
- claim status: `BLOCKED_PENDING_PARTNER_EVIDENCE`.

Packet preparation emits warnings while capability is unconfirmed.

No maturity upgrade occurs in this slice.

## Execution state

Successful packet creation returns:

`PACKET_PREPARED_NO_PARTNER_EXECUTION`

This explicitly means:

- Nexus can prepare the bounded context contract;
- no partner adapter was called;
- no FabStation behavior was validated;
- no field data returned;
- no partner state changed;
- no Nexus state changed.

Therefore this is **not** `PARTNER_HANDOFF_PASS`.

## Partner evidence required before adapter

A FabStation-specific adapter remains blocked until at least one directly confirmed capability exists, such as:

- API;
- SDK;
- supported deep-link contract;
- supported file exchange/export mechanism;
- webhook/event contract;
- partner-approved small PoC.

Any future adapter must sit below this vendor-neutral boundary rather than changing Nexus core identity/Change/Action contracts.

## Runtime contract smoke

Isolated TypeScript compile/runtime smoke covered:

- valid exact-scope packet -> prepared preview-only packet;
- partner pending warning preserved;
- no partner/Nexus write flags possible;
- project mismatch -> blocked;
- packet >16 KiB -> blocked.

Result: PASS.

This is contract evidence only. It is not real FabStation execution, representative real IFC, trusted viewer, Android/Fold or production connector validation.

## Remaining external gates

The contract-level Nexus path is now largely reconciled. The major remaining external gates are:

1. permitted representative real IFC;
2. real IFC GlobalId mapping and trusted-viewer comparison;
3. two real revisions;
4. current-stack real-browser IFC runtime;
5. durable server-side WorkSuite persistence/auth;
6. partner-confirmed FabStation capability / approved PoC;
7. actual partner hand-off execution and returned field evidence/status;
8. Android/Fold field validation.

## Protected boundaries

No changes to PR #91, Spark Object Card design, Relationship Tree gesture/layout, Work Wallet, Nexus Cloud/Google Drive, Android Work Mode, DoorFlow, Electrical Commissioning or Person Card UI.

Draft only. No automatic merge.
