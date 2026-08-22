# Nexus × FabStation — Synthetic Package Smoke / Slice P

Status: controlled synthetic contract validation slice

Base: PR #135 / `codex/fabstation-manual-handoff-evidence-slice-o`

This slice prepares a deterministic synthetic package fixture for the current FabStation FILE_EXCHANGE path without performing a real partner upload and without promoting any manual/partner validation gate.

## Official FabStation evidence used

Public FabStation documentation currently establishes:

- KSS/KISS is comma-delimited ASCII with `.kss` extension;
- a KSS identification line uses `KISS,<version>,<generating software>`;
- KSS lines should not exceed 254 characters;
- one KSS is required for a project package and only one KSS may exist in a ZIP;
- the documented steel project IFC route uses IFC2x3;
- KSS + IFC enables the 3D Viewer and Augmented Reality feature path;
- Drawings require PDF;
- project packages are uploaded as ZIP files;
- Package History statuses include In Progress, Complete, Failed and Cancelled.

Evidence:

- https://www.fabstation.com/kb/manual_kss/
- https://www.fabstation.com/kb/creating-zip/
- https://www.fabstation.com/kb/uploading-files/

## Repo-controlled fixtures

Adds:

- `artifacts/nosmo-nexus/public/fixtures/nexus_fabstation_smoke.ifc`
- `artifacts/nosmo-nexus/public/fixtures/nexus_fabstation_smoke.kss`

IFC fixture:

- schema: IFC2X3;
- byte length: 431;
- SHA-256: `a99150194945261c278c41e397375ec97aeae9c9864127eb1a557f6bf3255e52`;
- IFCPROJECT GlobalId: `0NXSFSPROJECT000000001`;
- IFCBEAM GlobalId: `0NXSFSBEAM000000000001`;
- provenance: always `SYNTHETIC_DEMO`.

KSS fixture:

- byte length: 135;
- SHA-256: `5fb4daec88a5b1105818ebe844bdf9214fe8ecb34104803d6e543730833f0e70`;
- identification: `KISS,1.0,NOSMO Nexus`;
- deterministic header and B1007 detail line;
- no line exceeds 254 characters.

## Fixture integrity validator

Adds:

`node scripts/validate-fabstation-smoke-fixtures.mjs`

The validator reads the actual repo files and fails closed on:

- byte drift;
- SHA-256 drift;
- missing STEP header;
- missing IFC2X3 schema marker;
- changed IFCPROJECT / IFCBEAM GlobalId;
- changed KSS identification/header/detail lines;
- KSS line length above 254 characters.

Local execution in the current tool runtime completed with:

`FABSTATION_SMOKE_FIXTURES_PASS`

This is fixture-integrity evidence only.

## Provenance gap closed

Slice N / PR #134 warned when a source IFC was `SYNTHETIC_DEMO`, but the package plan did not freeze that provenance value.

Slice P adds:

`sourceProvenanceClass`

to `nexus-fabstation-project-package-plan/v1`.

The manual hand-off evaluator now refuses `PARTNER_HANDOFF_PASS` when the package plan provenance is `SYNTHETIC_DEMO`, even if simulated status, manifest attestation, processing reference and reviewed evidence are all otherwise complete.

Synthetic evidence remains:

`PARTNER_HANDOFF_RECORDED_PENDING_REVIEW`

It can never become real partner hand-off evidence.

## Official package status mapping

Adds:

`nexus-fabstation-package-status-map/v1`

Mapping:

- `COMPLETE` -> `PROCESSED`;
- `FAILED` -> `REJECTED`;
- `CANCELLED` -> `REJECTED`;
- `IN_PROGRESS` -> `UNKNOWN`.

The mapping is an observed/manual status interpretation only. It is not an API receipt, does not prove package-manifest equality and cannot bypass Nexus evidence review.

## Contract smoke

Adds:

`runFabStationSyntheticPackageSmoke()`

and root command:

`pnpm run smoke:fabstation-package`

The smoke composes:

1. bounded IFC2X3 structural intake;
2. synthetic Nexus Object / IFC GlobalId projection;
3. SpatialConnector FILE_EXCHANGE packet;
4. KSS + IFC2X3 project package planning;
5. public FabStation package-status mapping;
6. manual hand-off evidence evaluation;
7. explicit assertion that synthetic provenance cannot release `PARTNER_HANDOFF_PASS`;
8. explicit rejection-state assertion for simulated failed processing.

The smoke is CI-wired after the existing BIM contract E2E smoke.

## Local isolated behavioral evidence

A local zero-network isolated behavioral run confirmed:

- IFC bytes/hash: match;
- KSS bytes/hash: match;
- `COMPLETE -> PROCESSED`;
- `FAILED/CANCELLED -> REJECTED`;
- `IN_PROGRESS -> UNKNOWN`;
- synthetic partner PASS: false.

Marker:

`FABSTATION_SLICE_P_ISOLATED_BEHAVIOR_PASS`

This is not repository-wide CI PASS.

## CI truth

GitHub Actions for the account remains blocked before runner steps by exhausted included Actions usage / current budget policy.

Therefore:

- fixture validator local execution: PASS;
- isolated behavioral mirror: PASS;
- repository `pnpm run typecheck`: NOT EXECUTED on this slice;
- repository `pnpm run smoke:fabstation-package`: NOT EXECUTED on GitHub runner;
- repository CI PASS: NOT CLAIMED.

## External gates unchanged

Still not established:

- project/client `REAL IFC PASS`;
- real FabStation ZIP upload;
- `PARTNER_HANDOFF_PASS`;
- API/SDK/webhook/deep-link/live sync;
- trusted-viewer PASS;
- Android/Fold PASS.

## Protected boundaries

No changes to PR #91, Spark Object Card, Work Wallet behavior, Nexus Cloud/Drive behavior, Android Work Mode, DoorFlow, Electrical, Person Card UI or Relationship Tree gestures/layout.

Draft only. No automatic merge or deployment.
