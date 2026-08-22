# Nexus public representative IFC evidence

Status: controlled public-source evidence

This slice provides a real, publicly readable IFC source for structural validation while project/client IFC evidence remains unavailable.

## Source

Repository: `IfcOpenShell/IfcOpenShell`

Pinned commit:

`9089a20ce3f25040baac4f1f303336c70026cb67`

Path:

`src/ifcviewer-web/sample.ifc`

The IFC itself is **not copied into the Nexus repository**.

Observed repository licence evidence: root `COPYING` contains `GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007`.

## Byte-level source evidence

The pinned raw file was read directly from GitHub.

- byte length: `3054`
- Git blob SHA: `04836854226fa503d04b3e7720c58548d15f8fe7`
- SHA-256: `1939f447de02d0ade9ce88433bba53ef8b70f24e0031fe292093d3b037783563`

The computed Git object hash of the observed bytes matches the GitHub blob SHA, so the recorded SHA-256 and structural facts refer to the exact pinned Git blob.

## Structural evidence observed

- STEP header: `ISO-10303-21`
- IFC schema: `IFC4`
- IFCPROJECT GlobalId: `25w1yVg1T899knOFDT7GF4`
- IFCSLAB GlobalId: `3gVQKme9v8sg$$0VTyX93s`
- IFCWALL GlobalId: `2HL9ynl8T508xbd_ydwK8F`
- IFCBEAM GlobalId: `2kfTOWRMj0NvT3RcC4doCF`

These are source facts only. STEP/express IDs remain diagnostic runtime values.

## Nexus contract

`src/data/publicRepresentativeIfcEvidence.ts` defines:

`nexus-public-representative-ifc-evidence/v1`

The manifest records the immutable source identity, fingerprint and expected structural facts.

`assessIfcOpenShellPublicRepresentativeIntake(...)` accepts a future `nexus-ifc-source-intake/v1` result and fails closed unless:

- bounded intake is `READY_FOR_MAPPING_REVIEW`;
- IFC schema is `IFC4`;
- IFCPROJECT GlobalId matches;
- SHA-256 matches the exact pinned source;
- selected slab/wall/beam GlobalIds resolve with the expected IFC entity types.

## Validation status

Current source-evidence status:

`PUBLIC_SOURCE_STRUCTURAL_EVIDENCE_VERIFIED`

Current Nexus repository execution status:

`NOT_EXECUTED_REPOSITORY_RUNNER_BLOCKED`

GitHub Actions/package-manager runner infrastructure is still failing before runnable job steps. Therefore no repository CI PASS or browser Full WASM PASS is claimed from this source yet.

## Hard claim boundary

This public source is not a customer, recipient or active construction-project model.

It can support:

`PUBLIC REPRESENTATIVE IFC — STRUCTURAL EVIDENCE VERIFIED`

It cannot satisfy:

- `REAL IFC PASS` for a permitted representative project/client model;
- real two-revision project comparison;
- `TRUSTED VIEWER PASS`;
- representative browser Full WASM PASS;
- `ANDROID/FOLD PASS`;
- coordinate/survey validation;
- `PARTNER HANDOFF PASS`.

Those gates remain separate and blocked until their exact evidence exists.

## Protected boundaries

No change to PR #91, Spark Object Card, Work Wallet, Nexus Cloud/Drive implementation, Android Work Mode, DoorFlow, Electrical Commissioning, Person Card UI, Relationship Tree gesture/layout or FabStation partner claims.

Draft only. No automatic merge.
