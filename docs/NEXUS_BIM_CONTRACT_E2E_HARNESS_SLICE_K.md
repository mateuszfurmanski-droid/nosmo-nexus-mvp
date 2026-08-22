# BIM / IFC / WorkSuite Slice K — integrated contract E2E harness

Status: EXECUTABLE SYNTHETIC HARNESS PREPARED / RUNNER EXECUTION BLOCKED / NOT REAL IFC VALIDATION

## Base

Stacked on PR #119 (`codex/worksuite-raise-rfi-slice-j`) at head `8a321642d5b9a80aca0af9279adb63bcf63c9e22`.

PR #90 was rechecked immediately before branch creation and remained at `35a6757ce19fe590754fb7ad13ed48a68cb51705`.

Protected PR #91 remained at `d62b1c1216beaba149dfb93aad46d738c08617bd` and was not changed.

## Purpose

This slice verifies that the new #90-native BIM contracts compose as one bounded operational chain rather than existing only as independent modules.

The harness is deterministic and permanently labelled `SYNTHETIC_DEMO`.

It must never produce `REAL IFC PASS`, `TRUSTED VIEWER PASS`, `ANDROID/FOLD PASS` or `PARTNER HANDOFF PASS`.

## Synthetic pair

The harness contains two minimal STEP/IFC4 sources representing revision A and revision B.

They deliberately keep:

- the same IFCPROJECT GlobalId;
- the same mapped object IFC GlobalId;
- the same canonical Nexus Object ID.

They deliberately change:

- STEP/express ID from `#20` to `#200`;
- object name/description;
- source SHA-256 fingerprint;
- revision label A -> B.

Expected rule:

`STEP ID changed != object identity changed`

The same IFC GlobalId remains the cross-revision identity anchor. Metadata change produces `HUMAN_REVIEW_REQUIRED`.

## Integrated path

The harness executes the following contract sequence:

1. bounded structural intake for both synthetic IFC revisions;
2. explicit verified Nexus Object ID <-> IFC GlobalId identity resolution;
3. cross-revision comparison;
4. proof that STEP/express ID is diagnostic only;
5. canonical `NexusEventRecord` Change Event review;
6. explicit authority-safe `worksuite:RAISE_RFI` Apply;
7. canonical `NexusIssueRecord(issueKind=rfi)` creation;
8. Issue + human decision + WorkSuite action + Timeline semantic Project Memory commit;
9. Issue backlink/integrity validation;
10. exact RAISE_RFI idempotent retry;
11. bounded vendor-neutral SpatialConnector packet;
12. assertion that partner execution/write/live-sync flags remain false.

## Readiness reconciliation

The Change Review option contract is corrected to current implementation truth:

- `HOLD_WORK` -> `EXECUTABLE_ACTION_ENGINE_AVAILABLE`;
- `RAISE_RFI` -> `EXECUTABLE_ACTION_ENGINE_AVAILABLE`;
- `NO_IMPACT`, `RE_PLAN_TASK`, `NEW_EVIDENCE_REQUIRED`, `RE_INSPECTION_REQUIRED` remain review-only until separately ported;
- procurement remains blocked pending an authorised target contract;
- as-built acceptance remains blocked pending high-authority/evidence contracts.

This changes readiness metadata only; it does not auto-apply an action.

## CI integration

Root command:

`pnpm run smoke:bim-contract-e2e`

The command uses the repository's existing `tsx` dependency from `@workspace/scripts`; no new package is introduced.

Standard `Validate and Build` now runs the synthetic contract smoke after workspace typecheck and before the Nexus web build.

The harness is also included in `tsconfig.bim-ifc.json`.

## Current execution truth

The repository/account GitHub Actions problem remains active: runnable jobs have repeatedly failed before runner steps with `steps=null`.

Therefore this slice is **not yet reported as AUTOMATED PASS from CI**. The source is executable and wired into CI, but an actual runner must execute it first.

## External gates remain blocked

- representative real IFC: BLOCKED — no permitted `.ifc` exists in the connected validation folders;
- trusted viewer comparison: BLOCKED;
- Android/Fold IFC smoke: BLOCKED;
- FabStation partner hand-off: BLOCKED;
- FabStation API/SDK/deep-link/file-exchange/webhook capability: `BLOCKED_PENDING_PARTNER_EVIDENCE`;
- web-ifc package/lockfile/local WASM generation: BLOCKED by package-manager/Actions infrastructure.

## No external mutation

The harness creates only in-memory synthetic canonical records.

It does not:

- write raw IFC;
- write BIM source state;
- send an RFI externally;
- mutate FabStation or another partner;
- mutate Google Drive/Nexus Cloud;
- mutate Work Wallet;
- touch Relationship Tree layout/gestures;
- touch PR #91.

Do not merge automatically.
