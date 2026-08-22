# NOSMO Nexus — Phase 20 BIM / IFC Identity Reconciliation

Status: IMPLEMENTED CONTRACT / NOT RUNTIME VALIDATED  
Product repo: `mateuszfurmanski-droid/nosmo-nexus-mvp`  
Foundation PR: `#90`  
Foundation branch: `codex/nexus-mvp-modular-foundation`  
Foundation head used for this slice: `35a6757ce19fe590754fb7ad13ed48a68cb51705`  
Slice branch: `codex/bim-ifc-foundation-contract-slice-a`  
Architecture authority: `mateuszfurmanski-droid/nosmo-nexus#17` / `PKG_012_BIM_FABSTATION_OPERATIONAL_LAYER.md`  
Architecture head inspected: `78eacb68345710ac0bba8451efdc4832b6b8fa9b`

## Purpose

This is the first controlled BIM / IFC reconciliation slice on the current PR #90 foundation.

It does not merge the historical BIM stack. It ports only the canonical identity and provenance boundary required before real IFC runtime, revision intelligence, Change Event, WorkSuite Action Engine or SpatialConnector work can be reconciled.

## Canonical identity decision

Nexus canonical identity and IFC model-source identity remain distinct:

```text
Nexus Object ID
  <-> explicit Project Memory external reference <->
IFC GlobalId
```

STEP / express ID is diagnostic only.

The implementation reuses the existing PR #90 Project Memory structures:

- `NexusCanonicalObjectRecord` remains the stable Nexus object;
- `NexusExternalReferenceRecord` remains the external-identity store;
- `NexusCanonicalObjectRecord.externalReferenceIds` provides the explicit backlink;
- `NexusIfcExternalReferenceRecord` is a typed IFC specialization stored in the same `externalReferences` collection;
- `NexusIfcObjectIdentityProjection` is a read projection only and is not persisted as a second mapping store.

No `BimObject` database or parallel canonical Object Card is introduced.

## Model source and spatial partner separation

PR #90 previously exposed `bim-fabstation` as one source-system label. This slice adds `bim-ifc` for model-source provenance while retaining the existing label for compatibility.

This is intentional:

```text
BIM / IFC model source
  -> geometry / design intent / IFC GlobalId / revision / authored Psets

FabStation or another confirmed spatial partner
  -> partner-specific field presentation / guidance only where confirmed

Nexus
  -> canonical Object ID / operational state / decisions / audit
```

A real IFC file is therefore not represented as a FabStation record merely because FabStation is a candidate downstream spatial partner.

## New IFC external-reference contract

Schema:

```text
nexus-ifc-object-identity/v1
```

A resolvable mapping requires:

- canonical Nexus Object ID;
- external-reference backlink in both directions;
- provider `bim-ifc`;
- external object type `ifc-global-id`;
- valid 22-character IFC GlobalId;
- explicit model revision label;
- source IFC file name;
- explicit provenance class;
- read-only model-source semantics;
- mapping verification state `verified`;
- optional IFC Project GlobalId for lineage;
- optional positive diagnostic express ID;
- IFC schema/version;
- SHA-256 fingerprint when provenance is `REAL`.

`REAL` model-source mappings fail closed when:

- source SHA-256 is absent;
- IFC schema is unresolved;
- source system is not `bim-ifc`.

This intentionally makes a future representative real IFC run stronger than the current synthetic fixture path.

## Object Card relationship

PR #90 already defines Object Card v1 as a Project Memory projection. `InstallationObject` resolves through the shared `Component` profile.

The BIM layer must therefore enrich the shared Object Card with source/provenance context later. It must not restore the historical BIM-only card as a second canonical object model.

## Historical donor classification

The historical line remains donor material:

```text
#25 -> #28 -> #29 -> #30 -> #31 -> #33 -> #34 -> #36 -> #39 -> #43 -> #51 -> #53 -> #62 -> #87
```

Use later, in controlled slices:

- #28 — local IFC GlobalId mapping behavior and explicit Apply Mapping UX;
- #29/#30/#31/#87 — renderer/runtime delivery behavior;
- #33 — bounded read-only Pset/type/material source context;
- #34/#36 — revision and geometry-review intelligence;
- #39 — canonical Change Event donor;
- #43 — canonical WorkSuite Action Engine donor and compensating action behavior;
- #51 — vendor-neutral SpatialConnector hand-off boundary;
- #53 — representative IFC validation harness;
- #62 — synthetic fixture only.

Do not bulk-merge these branches.

## Duplicate-system audit

### Object mapping

PR #90 has both generic `externalReferences` and connector-account `connectorObjectMappings`.

For local IFC model identity, the canonical choice is `externalReferences` because an IFC file does not require a live partner connector account.

`connectorObjectMappings` remains appropriate only where a confirmed connector account maps a Nexus object to a partner-owned external object. Do not create a FabStation connector account to represent a local IFC file.

### Object Card

Use shared Object Card v1. No BIM-only canonical card store.

### Change Event / WorkSuite

Do not create new Change Event or Action Engine contracts in this slice. The canonical donor remains #39/#43 and must later be reconciled with current PR #90 Project Memory, access and audit contracts.

Open WorkSuite draft-review PRs #78/#79 belong to the older Cloud / Work Mode draft-review line and do not replace the #43 Action Engine. They are outside this BIM slice.

### SpatialConnector

The existing PR #90 `bimFabstationConnector` registry/runtime stub is not partner-capability evidence. Its current catalogue actions/booleans must not be interpreted as proof of a FabStation write path.

A later SpatialConnector reconciliation slice must replace capability implication with the PKG-012 maturity/evidence boundary. Until then:

```text
FabStation candidate — SpatialConnector prepared — partner capability pending
```

## Current validation truth

Historical evidence supports:

- AUTOMATED PASS for selected donor PR build/typecheck checkpoints;
- SYNTHETIC BROWSER PASS for the PR #62 synthetic fixture path.

Current evidence does not support:

- REAL IFC PASS;
- TRUSTED VIEWER PASS;
- ANDROID/FOLD PASS;
- PARTNER HANDOFF PASS;
- production Full WASM representative IFC PASS.

## Representative real IFC blocker

The connected Nexus validation pack exists in Drive, including the `01_SOURCE_IFC` folder and run/checklist documents.

At inspection time no representative `.ifc` binary was present in that source folder; the folder contained only the source-upload rules document. Searches for `.ifc` returned validation documentation/folders rather than a usable representative IFC binary.

Therefore real IFC validation remains blocked by missing permitted representative model evidence, not by absence of the historical validation harness.

Required first real-model evidence remains:

- permitted representative IFC file;
- parsed IFC schema/version;
- real IFC GlobalId;
- explicit Nexus mapping;
- source file SHA-256;
- selected object source properties;
- geometry sanity;
- Pset/type/material read where present;
- explicit model revision label;
- shared Object Card projection.

## FabStation evidence status

The latest mailbox inspection found no new FabStation response after the August 21 outbound Teams-call message that confirms an API, SDK, webhook, deep-link contract, embeddable viewer, object-level API or two-way sync.

No partner maturity upgrade is authorised by this slice.

## web-ifc status

PR #87 remains the old-stack production-delivery policy slice. Issue #89 / PKG-012 Slice B defines exact `web-ifc@0.0.77`, pnpm-generated lockfile, deterministic same-origin JS/WASM/license generation and production fail-closed behavior.

That packaging work remains valid donor/runtime work, but it must not be mixed into this identity reconciliation branch. Production Full WASM remains unvalidated on a representative real IFC.

## Protected boundaries

This slice does not modify:

- PR #91 / Spark SKANSKA Demo Core;
- accepted Spark Object Card design;
- Relationship Tree gesture/layout engine;
- Google Drive / Nexus Cloud integration track;
- Work Wallet integration track;
- Android Work Mode;
- DoorFlow;
- Electrical Commissioning;
- Person Card UI;
- historical Change Event or Action Engine implementation;
- FabStation partner state.

## Next controlled BIM slices

1. Add a small foundation-facing local IFC source extraction adapter that produces this identity/provenance record without importing the old UI.
2. Run it against one permitted representative real IFC as soon as a model is available.
3. Reconcile the two-revision comparison contract around the same canonical Object ID + IFC GlobalId + model lineage.
4. Port one Change Event path into current PR #90 Project Memory.
5. Port one permission-checked WorkSuite Action Engine decision with explicit Apply, concurrency, idempotency and audit.
6. Reconcile `nexus-spatial-hand-off/v1` with fail-closed partner capability evidence.
7. Add a FabStation adapter only after partner-confirmed capability exists.

## Claim boundary

This slice may be described as:

`Canonical IFC identity/provenance contract reconciled into the PR #90 foundation.`

It must not be described as:

- real IFC integration complete;
- production IFC validated;
- FabStation integrated;
- partner API connected;
- two-way field sync operational.
