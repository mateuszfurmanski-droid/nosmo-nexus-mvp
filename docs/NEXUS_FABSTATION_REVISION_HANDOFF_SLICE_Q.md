# Nexus × FabStation — Revision Handoff / Slice Q

Status: controlled synthetic revision-handoff contract

Base: PR #140 / `codex/fabstation-synthetic-package-smoke-slice-p`

## Purpose

Connect the existing canonical IFC revision comparator from PR #101 to the publicly documented FabStation Steel revision/package workflow without creating a second IFC diff engine and without performing a partner upload.

Canonical sequence:

`IFC revision A + IFC revision B -> #101 same-GlobalId comparison -> fingerprinted KSS revision observation -> exact current package binding -> FabStation incremental package advice -> human review/upload`

## Official FabStation revision rules used

Current public FabStation documentation states:

- every revision/sequence project-package upload requires a KSS;
- incremental uploads should contain revised/additional files rather than blindly resending the whole project;
- FabStation Steel model revision is derived from KSS assembly revision data;
- Processing Filter ON processes new assemblies/higher revisions and ignores same/lower revisions;
- Processing Filter OFF processes all assemblies in the uploaded KSS;
- OFF is the documented path when correcting an incorrectly exported assembly without increasing its revision number;
- same PDF filename replaces the current drawing while a different filename adds another drawing;
- current public Steel IFC evidence remains IFC2x3.

Official evidence:

- https://www.fabstation.com/kb/revisions-mgmt/
- https://www.fabstation.com/kb/uploading-files/
- https://www.fabstation.com/kb/creating-zip/
- https://www.fabstation.com/kb/manual_kss/

No API, SDK, webhook, deep-link or live-sync capability is inferred from these manual package rules.

## Revision fixtures

### Revision B IFC

`nexus_fabstation_smoke_r2.ifc`

- IFC2X3;
- 474 bytes;
- SHA-256 `f9bac5b926087d2c40718b53cbd4506fefd0c1d96fe147616f7fb62e5ac72510`;
- same IFCPROJECT GlobalId as revision A: `0NXSFSPROJECT000000001`;
- same IFCBEAM GlobalId: `0NXSFSBEAM000000000001`;
- diagnostic STEP ID changes `#20 -> #200`;
- bounded metadata changes to `B1007 Rev 1 / Revised beam / B1007-R1`.

### Revision B KSS

`nexus_fabstation_smoke_r2.kss`

- 135 bytes;
- SHA-256 `c0504ca7bfb7bba8b0c8c4165d6955e7a6db07c99b2ff25addb75afa8bf9fb0f`;
- B1007 revision `0 -> 1`.

### Same-revision correction KSS

`nexus_fabstation_smoke_correction.kss`

- 146 bytes;
- SHA-256 `a19d16b0e995845ca817754218b6849a6e54687a6de1a1e4b6d6d01de850eb6a`;
- B1007 remains revision `0` for the correction-without-revision-increase scenario.

## Fixture integrity

`node scripts/validate-fabstation-revision-smoke-fixtures.mjs`

Checks actual repo bytes/hashes, IFC2X3 lineage/object identity, diagnostic STEP ID, bounded metadata change, KISS identification, B1007 revision values and KSS 254-character line limit.

Local result:

`FABSTATION_REVISION_SMOKE_FIXTURES_PASS`

## Fingerprinted KSS observation

Adds `nexus-fabstation-kss-revision/v1`.

The observer reads only the fields required for routing:

`D, Drawing No, Drawing Rev, Assembly Mark, Part Mark, Quantity, ...`

It requires:

- `.kss` source;
- positive bounded file size;
- **mandatory exact SHA-256 fingerprint**;
- KISS identification record;
- line length <=254;
- exact assembly mark;
- one unambiguous exported revision for that assembly.

Revision relation:

- same exact value -> `SAME`;
- proven numeric increase -> `HIGHER`;
- proven numeric decrease -> `LOWER`;
- ordering Nexus cannot prove -> `UNDETERMINED` / human review.

Nexus does not guess alphanumeric revision ordering.

## Reuse of canonical IFC comparison

Slice Q imports PR #101 `nexus-ifc-revision-comparison/v1` directly.

No second IFC comparator exists.

The revision handoff is blocked if #101 returns `COMPARISON_BLOCKED`. The IFC GlobalId remains the cross-revision model-source identity; STEP/express ID is diagnostic only.

## Exact current-source binding

Before FabStation advice can be package-ready, Slice Q proves that the current package is the exact source set reviewed by the revision flow:

- comparison Nexus Object ID == package Nexus Object ID;
- comparison IFC GlobalId == package IFC GlobalId;
- `comparison.currentRevision == package.sourceModelRevision`;
- package IFC filename == `comparison.currentSourceFileName`;
- when #101 exposes a changed current source SHA in its diagnostic delta, package IFC SHA must equal that exact current SHA;
- current KSS observation filename + mandatory SHA must equal the KSS frozen in the package plan.

Mismatch is `BLOCKED`; same names or revision labels are not accepted as sufficient identity.

## Revision handoff contract

Adds `nexus-fabstation-revision-handoff/v1`.

### Normal higher revision

For a valid `0 -> 1` KSS revision:

- state `REVISION_PACKAGE_READY`;
- Processing Filter `ON`;
- current KSS always included;
- current IFC included only when #101 source fingerprint changed;
- only explicitly declared revised/additional PDFs included.

This follows FabStation's incremental-package guidance.

### Same revision + changed IFC

If #101 shows source/change evidence but KSS revision is unchanged, Nexus does not guess.

Without explicit override:

`HUMAN_REVIEW_REQUIRED`

With:

- `correctionWithoutRevisionIncrease=true`;
- non-empty human reason;

result:

- `REVISION_PACKAGE_READY`;
- Processing Filter `OFF`.

This is the documented correction path for an export fixed without raising the assembly revision.

### Fail-closed cases

- #101 comparison blocked -> `BLOCKED`;
- current IFC/package source mismatch -> `BLOCKED`;
- current revision label/package mismatch -> `BLOCKED`;
- KSS without fingerprint -> `BLOCKED`;
- KSS/package fingerprint mismatch -> `BLOCKED`;
- lower KSS revision -> `BLOCKED`;
- missing/ambiguous KSS observation -> `BLOCKED`;
- unprovable revision ordering -> `HUMAN_REVIEW_REQUIRED`;
- invalid revised/additional PDF selection -> `BLOCKED`;
- correction override when KSS is already higher -> `BLOCKED`.

## Synthetic revision smoke

`pnpm run smoke:fabstation-revision`

Deterministic assertions:

1. revisions A/B pass IFC2X3 intake;
2. IFCPROJECT GlobalId remains stable;
3. IFCBEAM GlobalId remains stable;
4. STEP ID changes `20 -> 200` diagnostic-only;
5. #101 returns `HUMAN_REVIEW_REQUIRED` for bounded metadata/source change;
6. KSS `0 -> 1` = `HIGHER`;
7. normal revision -> package-ready + Filter ON;
8. changed IFC + unchanged KSS revision without override -> human review;
9. explicit same-revision correction reason -> package-ready + Filter OFF;
10. synthetic provenance remains synthetic and cannot release partner PASS.

Expected marker:

`FABSTATION_REVISION_HANDOFF_SMOKE_PASS`

## Validation wiring and truth

`Validate and Build` now includes the zero-dependency revision fixture validator before install and the revision contract smoke after the existing FabStation package smoke.

Current evidence:

- actual revision fixture integrity: LOCAL PASS — `FABSTATION_REVISION_SMOKE_FIXTURES_PASS`;
- isolated decision mirror: `FABSTATION_REVISION_SLICE_Q_ISOLATED_BEHAVIOR_PASS`;
- source/typecheck/smoke wiring: prepared;
- GitHub runner execution: `BLOCKED_BY_ACTIONS_QUOTA`;
- repository-wide CI PASS: NOT CLAIMED;
- real project revision pair: NOT VALIDATED;
- real FabStation revision package: NOT EXECUTED.

## Boundaries

No ZIP creation, partner upload/API call, state mutation or `PARTNER_HANDOFF_PASS`. Synthetic provenance cannot promote a real gate.

No PR #91/Spark Object Card change. No Work Wallet, Nexus Cloud/Drive behavior, Android Work Mode, DoorFlow, Electrical, Person Card UI or Relationship Tree gesture/layout change. No automatic merge/deploy.
