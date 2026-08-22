# NOSMO Nexus — Phase 21 BIM / IFC Local Source Intake

Status: DRAFT CONTROLLED SLICE  
Base: PR #94 / `codex/bim-ifc-foundation-contract-slice-a`  
Branch: `codex/bim-ifc-local-source-intake-slice-b`  
Architecture authority: `mateuszfurmanski-droid/nosmo-nexus#17` / PKG-012

## Purpose

Prepare the current #90 Project Memory foundation to inspect a real IFC source without importing the historical BIM UI/runtime stack wholesale.

This slice is intentionally read-only and structural. It extracts only enough STEP/SPF identity context to support explicit human mapping review and a later representative IFC validation run.

## Canonical flow implemented by this slice

```text
local/server-authorised IFC STEP/SPF text
  -> bounded source intake
  -> FILE_SCHEMA
  -> IFCPROJECT GlobalId
  -> IfcRoot GlobalId candidates
  -> human mapping review
  -> PR #94 canonical IFC external-reference mapping
```

It does not implement:

```text
source intake -> automatic mapping
source intake -> operational mutation
source intake -> geometry PASS
source intake -> REAL IFC PASS
```

## Donor extraction

Historical PR #28 contained a useful lightweight STEP parser. Only its vendor-neutral structural parsing pattern was reused conceptually.

Not ported:

- historical browser localStorage mapping store;
- trade scoring;
- old BIM Object Card UI;
- old installation-pilot fixtures;
- automatic or heuristic mapping approval;
- old runtime/viewer ownership assumptions.

## New contracts

### `nexus-ifc-source-intake/v1`

`src/data/ifcSourceIntake.ts`

Provides:

- 64 MB bounded local source limit;
- STEP header check;
- IFC schema normalization (`IFC2X3`, `IFC4`, `IFC4X3`);
- IFCPROJECT GlobalId extraction;
- valid 22-character IfcRoot GlobalId candidates;
- diagnostic STEP/express ID;
- entity type/name/description/tag where structurally available;
- duplicate GlobalId detection;
- optional SHA-256 provenance check;
- `READY_FOR_MAPPING_REVIEW` / `BLOCKED` state.

Blocking cases include:

- invalid/zero file size;
- source larger than the bounded intake limit;
- missing `ISO-10303-21` header;
- unsupported/unresolved `FILE_SCHEMA`;
- unresolved IFCPROJECT GlobalId;
- no valid IfcRoot GlobalIds;
- duplicate IFC GlobalIds;
- malformed supplied SHA-256.

Raw IFC text is not included in the result envelope.

### `nexus-ifc-validation-run/v1`

`src/data/ifcValidationRun.ts`

Creates an evidence run envelope that keeps these states separate:

- `AUTOMATED_PASS`;
- `SYNTHETIC_BROWSER_PASS`;
- `REAL_IFC_PASS`;
- `TRUSTED_VIEWER_PASS`;
- `ANDROID_FOLD_PASS`;
- `PARTNER_HANDOFF_PASS`;
- `BLOCKED`;
- `NOT_VALIDATED`.

The run constructor may only mark structural intake/mapping consistency as `AUTOMATED_PASS`. It never upgrades representative-model, trusted-viewer, device or partner gates automatically.

## Identity boundary

Unchanged from PR #94:

```text
stable Nexus Object ID
  <-> explicit Project Memory external reference <->
IFC GlobalId
```

STEP/express ID remains diagnostic only.

## Real IFC truth

This slice does not establish `REAL IFC PASS`.

At implementation time, the connected validation pack existed but no usable permitted representative `.ifc` file had been found in the inspected source folder/File Library search. When one is supplied, the first real run should record:

- source file name;
- file size;
- SHA-256;
- IFC schema;
- IFCPROJECT GlobalId;
- selected object GlobalId;
- explicit Nexus Object mapping;
- model revision label;
- trusted viewer comparison evidence.

## Two-revision next slice

After one representative source passes intake/mapping review, the next controlled slice is identity/revision comparison only:

```text
revision A intake
+ revision B intake
+ same IFCPROJECT lineage
+ same mapped IFC GlobalId
-> structural change candidate
-> HUMAN REVIEW REQUIRED / COMPARISON_BLOCKED
```

Do not implement clash detection or automatic operational mutation in that slice.

## Protected boundaries

Not changed:

- PR #91 Spark Demo;
- Relationship Tree gesture/layout engine;
- Work Wallet;
- Google Drive / Nexus Cloud;
- Android Work Mode;
- DoorFlow;
- Electrical Commissioning;
- Person Card UI;
- historical web-ifc runtime packaging;
- Change Event / WorkSuite Action Engine semantics;
- FabStation capability maturity.

## Validation performed

- isolated TypeScript compilation of the new intake contract: PASS;
- isolated TypeScript compilation of the validation-run contract: PASS;
- no full repository CI PASS is claimed from these isolated checks;
- representative real IFC remains `NOT_VALIDATED`.

Draft only. No automatic merge.
