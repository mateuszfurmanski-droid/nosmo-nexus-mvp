# Nexus × FabStation — Revision Handoff / Slice Q

Status: controlled synthetic revision-handoff contract

Base: PR #140 / `codex/fabstation-synthetic-package-smoke-slice-p`

## Purpose

Connect the existing canonical IFC revision comparator from PR #101 to the publicly documented FabStation Steel revision/package workflow without creating a second IFC diff engine and without performing a partner upload.

Canonical sequence:

`IFC revision A + IFC revision B -> #101 compare same IFC GlobalId -> KSS assembly revision observation -> FabStation incremental package advice -> human review/upload`

## Official FabStation revision rules used

Current public FabStation documentation states:

- every project-package upload, including revision/sequence uploads, requires a KSS file;
- incremental uploads should contain revised or additional files rather than blindly resending the whole project;
- for FabStation Steel, model revision is derived from KSS assembly revision data;
- with Processing Filter ON, new assemblies and higher revisions are processed while same/lower revisions are ignored;
- Processing Filter OFF processes all assemblies in the uploaded KSS;
- OFF is the documented path when correcting an incorrectly exported assembly without increasing its revision number;
- PDF files with the same filename replace the current drawing while a different filename is added as another drawing;
- current steel project IFC evidence remains IFC2x3.

Official evidence:

- https://www.fabstation.com/kb/revisions-mgmt/
- https://www.fabstation.com/kb/uploading-files/
- https://www.fabstation.com/kb/creating-zip/
- https://www.fabstation.com/kb/manual_kss/

No API, SDK, webhook or live-sync capability is inferred from these manual package rules.

## Revision B fixtures

Adds deterministic repo fixtures:

### `nexus_fabstation_smoke_r2.ifc`

- IFC2X3;
- 474 bytes;
- SHA-256 `f9bac5b926087d2c40718b53cbd4506fefd0c1d96fe147616f7fb62e5ac72510`;
- same IFCPROJECT GlobalId as revision A: `0NXSFSPROJECT000000001`;
- same IFCBEAM GlobalId: `0NXSFSBEAM000000000001`;
- diagnostic STEP ID changes `#20 -> #200`;
- bounded metadata changes from `B1007` to `B1007 Rev 1 / Revised beam / B1007-R1`.

### `nexus_fabstation_smoke_r2.kss`

- 135 bytes;
- SHA-256 `c0504ca7bfb7bba8b0c8c4165d6955e7a6db07c99b2ff25addb75afa8bf9fb0f`;
- assembly B1007 revision changes `0 -> 1`.

### `nexus_fabstation_smoke_correction.kss`

- 146 bytes;
- SHA-256 `a19d16b0e995845ca817754218b6849a6e54687a6de1a1e4b6d6d01de850eb6a`;
- assembly B1007 remains revision `0` while representing the documented same-revision correction scenario.

## Fixture validator

Adds:

`node scripts/validate-fabstation-revision-smoke-fixtures.mjs`

It checks actual repo bytes/hashes, IFC2X3 lineage/object identity, expected diagnostic STEP ID, bounded metadata change, KISS identification, B1007 revision values and KSS 254-character line limit.

Local result:

`FABSTATION_REVISION_SMOKE_FIXTURES_PASS`

## KSS revision observation

Adds:

`nexus-fabstation-kss-revision/v1`

The bounded observer reads only the fields needed for revision routing:

`D, Drawing No, Drawing Rev, Assembly Mark, Part Mark, Quantity, ...`

It requires:

- `.kss` source;
- valid size/fingerprint when supplied;
- KISS identification record;
- line length <=254;
- exact assembly mark;
- one unambiguous exported revision for that assembly.

Revision relation:

- equal value -> `SAME`;
- strictly numeric increase -> `HIGHER`;
- strictly numeric decrease -> `LOWER`;
- non-numeric ordering that cannot be proven -> `UNDETERMINED` and human review.

Nexus deliberately does not guess alphanumeric revision ordering.

## Reuse of canonical IFC comparison

Slice Q imports the existing PR #101 result:

`nexus-ifc-revision-comparison/v1`

No second IFC comparator is introduced.

The revision handoff is blocked when #101 returns `COMPARISON_BLOCKED`.

The same IFC GlobalId remains canonical model-source identity across revisions. STEP/express ID changes remain diagnostic only.

## FabStation revision handoff contract

Adds:

`nexus-fabstation-revision-handoff/v1`

### Normal higher revision

If:

- #101 comparison is not blocked;
- previous/current KSS target the exact same assembly;
- current KSS matches the current package plan;
- KSS revision is `HIGHER`;

then:

- state: `REVISION_PACKAGE_READY`;
- Processing Filter recommendation: `ON`;
- current KSS is always selected;
- current IFC is selected only when the source fingerprint changed;
- only explicitly selected revised/additional PDFs are included.

This follows the incremental-package boundary rather than resending unchanged project files.

### Same revision + changed IFC

If the IFC source/change signal changed but the KSS revision remains `SAME`, Nexus does not auto-select a filter.

Without explicit override:

`HUMAN_REVIEW_REQUIRED`

With:

- `correctionWithoutRevisionIncrease=true`;
- non-empty human correction reason;

then:

- state: `REVISION_PACKAGE_READY`;
- Processing Filter recommendation: `OFF`.

This models the documented FabStation correction case where the assembly export is fixed without increasing its revision number.

### Lower / ambiguous revisions

- lower KSS revision -> `BLOCKED`;
- unprovable non-numeric ordering -> `HUMAN_REVIEW_REQUIRED`;
- missing/ambiguous KSS observation -> `BLOCKED`.

## PDF boundary

The contract never assumes all PDFs are revised.

Only caller-supplied IDs that already exist as PDF files in the current package plan may be selected as revised/additional PDFs. Invalid IDs fail closed.

## Synthetic revision smoke

Adds:

`pnpm run smoke:fabstation-revision`

The deterministic flow proves:

1. revision A and B pass bounded IFC2X3 intake;
2. IFCPROJECT GlobalId remains the same;
3. IFCBEAM GlobalId remains the same;
4. diagnostic STEP ID changes `20 -> 200`;
5. PR #101 returns `HUMAN_REVIEW_REQUIRED` for bounded metadata/source change;
6. KSS revision `0 -> 1` resolves `HIGHER`;
7. normal revision advice is package-ready + Processing Filter ON;
8. changed IFC + same KSS revision without override remains human-review-required;
9. explicit same-revision correction reason produces package-ready + Processing Filter OFF;
10. provenance remains `SYNTHETIC_DEMO` and no partner PASS is released.

Expected marker:

`FABSTATION_REVISION_HANDOFF_SMOKE_PASS`

## CI wiring

The existing `Validate and Build` flow now adds:

- zero-dependency revision fixture validation before dependency install;
- `smoke:fabstation-revision` after the existing package smoke.

Current GitHub Actions account quota/budget still blocks runner execution before steps, so repository CI PASS is not claimed.

## Validation truth

- actual revision fixture integrity: LOCAL PASS (`FABSTATION_REVISION_SMOKE_FIXTURES_PASS`);
- source contracts/smoke: implemented and typecheck-wired;
- GitHub runner execution: BLOCKED_BY_ACTIONS_QUOTA;
- repository-wide CI PASS: NOT CLAIMED;
- real project revision pair: NOT VALIDATED;
- real FabStation revision package: NOT EXECUTED.

## Protected boundaries

No PR #91/Spark Object Card changes. No Work Wallet, Nexus Cloud/Drive behavior, Android Work Mode, DoorFlow, Electrical, Person Card UI or Relationship Tree gesture/layout changes. No automatic upload, partner mutation or merge.
