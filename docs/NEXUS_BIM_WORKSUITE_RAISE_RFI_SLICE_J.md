# BIM / WorkSuite Slice J — canonical RAISE_RFI

Status: IMPLEMENTED CONTRACT / CI BLOCKED BY ACTIONS INFRA / NO EXTERNAL RFI WRITE

## Base

Stacked on PR #116 (`codex/bim-web-ifc-delivery-slice-i`) at head `e4bcf7b7aaa03f54ae6c661efc77618b69ee8a4f`.

PR #90 remained at `35a6757ce19fe590754fb7ad13ed48a68cb51705` immediately before this slice.

## Why a canonical Issue record was required

The #90 Project Memory foundation had tasks, evidence, approvals, events and human decisions, but no canonical Issue/RFI record.

RAISE_RFI is therefore not represented as an event-only shortcut and no separate BIM-local RFI store is introduced.

This slice adds `NexusIssueRecord` to Project Memory. `rfi` is one `issueKind`, alongside future design/technical/site issue profiles.

## RAISE_RFI action

`worksuite:RAISE_RFI` requires:

- persisted canonical IFC revision Change Event;
- explicit Apply;
- allowed `NexusAccessDecisionRecord`;
- exact reviewer Person;
- Project Participation reference;
- exact project/world/object scope;
- exact action key;
- non-empty human reason;
- non-empty RFI question, capped at 4000 characters;
- optimistic WorkSuite action revision;
- idempotent application IDs.

Successful Apply prepares:

- one canonical `NexusIssueRecord` with `issueKind=rfi` and `issueState=open`;
- one `NexusHumanDecisionRecord`;
- one `NexusEventRecord` with `WORKSUITE_ACTION_RAISE_RFI_APPLIED`.

No email, API call, partner state write, design-platform write or external RFI number is created.

## Project Memory semantic commit

`commitWorkSuiteActionToProjectMemory(...)` now accepts an optional canonical Issue record.

For RAISE_RFI the semantic unit is:

`Issue + human decision + WorkSuite action event + Timeline projection`

The function returns a new snapshot only when the full unit is valid. Partial pre-existing state is a conflict rather than an automatic repair.

Timeline carries the same canonical action event ID and Issue ID; it does not become a second RFI identity.

This remains in-memory semantic atomicity only, not durable database transaction atomicity.

## Issue integrity

`validateNexusIssueInvariants(...)` checks:

- Project exists;
- Project World exists and belongs to that Project;
- canonical Nexus Object exists in the same scope;
- source Change Event exists in the same scope;
- source RAISE_RFI action exists and is applied;
- action event links back to the Issue ID;
- RFI question is non-empty;
- answer fields agree with issue state.

## Idempotency / failure boundaries

Exact retry may resolve as `ALREADY_APPLIED` / `ALREADY_COMMITTED` only when the same Change Event, action ID, Issue ID and question are already represented consistently.

Fail closed on:

- stale WorkSuite revision;
- different application ID for the same source Change Event;
- reused Issue ID;
- partial action/Issue state;
- authority mismatch;
- source/project/world/object mismatch.

## Validation truth

The new files are included in `tsconfig.bim-ifc.json` and therefore in workspace `typecheck:bim-ifc`.

GitHub Actions is currently failing before runner steps on the repository/account infrastructure path (`steps=null`). Do not report this slice as repository CI PASS until a runner executes.

No real IFC, trusted viewer, Android/Fold or partner hand-off PASS is claimed.

## Protected boundaries

Unchanged:

- PR #91 Spark SKANSKA Demo Core;
- accepted Spark Object Card;
- Relationship Tree gesture/layout engine;
- Work Wallet;
- Google Drive / Nexus Cloud;
- Android Work Mode;
- DoorFlow;
- Electrical Commissioning;
- Person Card UI;
- FabStation capability status;
- production credentials.

Do not merge automatically.
