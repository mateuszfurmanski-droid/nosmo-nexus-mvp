# Nexus × FabStation — Revision Execution Evidence / Slice R

Status: controlled canonical evidence gate

Base: PR #144 / `codex/fabstation-revision-handoff-slice-q`

## Purpose

Close the final evidence gap between revision advice and a future real human FabStation upload.

A Package History state such as `Complete` is not sufficient by itself. Nexus must verify that the human execution matches the exact revision advice that was reviewed before upload.

Canonical path:

`revision advice -> human package/upload -> observed Processing Filter + uploaded file IDs + Package History + reviewed canonical evidence -> revision execution assessment -> canonical Event proposal`

No FabStation-specific datastore is added.

## Contract

Adds:

`nexus-fabstation-revision-execution-evidence/v1`

and:

`assessFabStationRevisionExecutionEvidence(...)`

Inputs:

- package-ready `nexus-fabstation-revision-handoff/v1` advice;
- existing canonical manual hand-off evidence assessment;
- observed FabStation Package History status;
- actual human-selected Processing Filter (`ON`/`OFF`);
- canonical evidence ID supporting the filter observation;
- human-attested actual uploaded canonical File IDs;
- canonical reviewer/event identity and timestamp.

## Mandatory alignment

The evaluator requires:

- revision advice state `REVISION_PACKAGE_READY`;
- advice filter is executable `ON` or `OFF`;
- manual hand-off and revision advice target the same Nexus Object;
- explicit project/world scope;
- Processing Filter evidence ID exists in the already reviewed manual hand-off evidence set;
- observed filter equals advised filter;
- actual uploaded File ID set equals the advised selected File ID set exactly;
- observed FabStation Package History state maps to the same Nexus processing state already recorded by manual hand-off evidence.

## Outcome precedence

Evidence conflicts are never converted into a stronger partner claim.

Order:

1. blocking scope/advice errors -> evaluator returns blocked resolution;
2. any non-blocking evidence contradiction -> `REVISION_HANDOFF_EXECUTION_MISMATCH`;
3. only coherent Failed/Cancelled + manual rejection -> `REVISION_HANDOFF_EXECUTION_REJECTED`;
4. exact execution + non-synthetic source + base `PARTNER_HANDOFF_PASS` + Complete -> `REVISION_HANDOFF_EXECUTION_PASS`;
5. otherwise -> `REVISION_HANDOFF_EXECUTION_PENDING_EXTERNAL_VALIDATION`.

This means a Package History screenshot saying `Failed` while the manual hand-off record says `PROCESSED` is `MISMATCH`, not a fabricated rejection conclusion.

## PASS gate

`REVISION_HANDOFF_EXECUTION_PASS` requires all of:

- exact advice/object scope;
- exact advised file set uploaded;
- exact advised Processing Filter observed;
- Processing Filter evidence reviewed;
- Package History `Complete` -> `PROCESSED`;
- manual hand-off already reached real `PARTNER_HANDOFF_PASS`;
- source provenance is not `SYNTHETIC_DEMO`.

Therefore Slice R cannot independently promote a partner PASS. It is downstream of the base partner hand-off gate.

## Synthetic boundary

Synthetic advice can exercise all logic but remains:

`REVISION_HANDOFF_EXECUTION_PENDING_EXTERNAL_VALIDATION`

Even simulated Complete + exact ON/OFF + exact file set + reviewed synthetic evidence cannot release PASS.

## Canonical event proposal

Successful structural evaluation prepares a normal `NexusEventRecord` proposal:

- event type `SPATIAL_PARTNER_REVISION_HANDOFF_REVIEWED`;
- canonical project/world/object scope from the existing manual hand-off;
- related IDs include advised/uploaded File IDs, Processing Filter Evidence ID and the source manual hand-off Event ID;
- source system `bim-fabstation`;
- event source `MANUAL`;
- package SHA correlation;
- verification state:
  - PASS -> `VERIFIED_BY_USER`;
  - coherent rejection -> `REJECTED`;
  - mismatch -> `CONFLICTING`;
  - pending -> `UNKNOWN`.

The evaluator does not persist the event. Normal Project Memory access/persistence remains mandatory.

## Synthetic smoke

Adds:

`pnpm run smoke:fabstation-revision-execution`

Cases:

- exact synthetic Complete/ON/file-set/evidence -> pending external validation;
- wrong Processing Filter -> mismatch;
- missing uploaded file -> mismatch;
- observed Failed vs recorded Processed -> mismatch;
- coherent Failed + recorded rejection -> rejected;
- synthetic PASS remains impossible.

Expected marker:

`FABSTATION_REVISION_EXECUTION_EVIDENCE_SMOKE_PASS`

Local isolated decision result:

`FABSTATION_REVISION_EXECUTION_SLICE_R_ISOLATED_BEHAVIOR_PASS`

## Validation truth

- source/typecheck/smoke wiring: implemented;
- isolated behavior: PASS;
- GitHub Actions runner: `BLOCKED_BY_ACTIONS_QUOTA`;
- repository-wide CI PASS: NOT CLAIMED;
- real FabStation revision upload: NOT EXECUTED;
- real revision execution PASS: NOT ESTABLISHED.

## Boundaries

No partner API read/write, no connector-confirmed receipt, no live sync, no ZIP creation/upload, no new evidence datastore, no `REAL IFC PASS` implication.

No PR #91/Spark Object Card changes. No Work Wallet, Nexus Cloud/Drive behavior, Android Work Mode, DoorFlow, Electrical, Person Card UI or Relationship Tree gesture/layout changes. No auto merge/deploy.
