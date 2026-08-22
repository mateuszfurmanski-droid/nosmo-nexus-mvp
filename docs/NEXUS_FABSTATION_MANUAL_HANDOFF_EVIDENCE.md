# Nexus × FabStation manual hand-off evidence

Status: bounded partner-execution evidence contract

This slice defines how Nexus records a real human-executed FabStation FILE_EXCHANGE hand-off without inventing an API receipt or creating a second evidence datastore.

## Canonical storage rule

Nexus reuses existing canonical records:

- `NexusEvidenceRecord` in Project Memory for screenshots/documents/external references;
- `NexusEventRecord` for the canonical hand-off event.

No FabStation-specific evidence database is introduced.

## Input

The evaluator consumes:

- one successful `nexus-fabstation-project-package-plan/v1` plan;
- actual ZIP filename, SHA-256 and byte length;
- canonical uploader and reviewer Person IDs;
- upload/review/record timestamps;
- bounded FabStation project reference;
- optional bounded processing reference;
- partner processing state;
- human attestation that the uploaded ZIP matches the reviewed Nexus plan;
- canonical Project Memory evidence records.

## Evidence required for PARTNER_HANDOFF_PASS

`PARTNER_HANDOFF_PASS` is released only when all of the following hold:

1. the manual package record is structurally valid;
2. partner processing state is `PROCESSED`;
3. the human reviewer attests that the uploaded ZIP matches the bounded Nexus plan;
4. at least one canonical evidence record is:
   - in the exact project/world;
   - `evidenceStatus=reviewed`;
   - `connectorId=bim-fabstation`;
   - type `photo`, `document` or `external-reference`;
5. a bounded partner processing reference is present.

The validation basis is:

`USER_REVIEWED_EXTERNAL_EVIDENCE`

It is deliberately not `CONNECTOR_CONFIRMED` because no public FabStation API/receipt mechanism is currently claimed.

## Other states

If processing is explicitly rejected:

`PARTNER_HANDOFF_REJECTED`

If the upload is recorded but processing/evidence/review is incomplete:

`PARTNER_HANDOFF_RECORDED_PENDING_REVIEW`

A prepared project package plan alone can never create a partner pass.

## Canonical event proposal

The evaluator prepares one `NexusEventRecord` proposal:

- event type: `SPATIAL_PARTNER_FILE_HANDOFF_RECORDED`;
- actor: canonical uploader Person;
- project/world/object: exact plan scope;
- source: `MANUAL` / `bim-fabstation`;
- related objects: canonical Nexus File IDs and Evidence IDs;
- external/source reference: bounded FabStation project reference;
- correlation: actual ZIP SHA-256;
- verification state:
  - `VERIFIED_BY_USER` for pass;
  - `REJECTED` for recorded rejection;
  - `UNKNOWN` while pending review.

The function only proposes the canonical event. It does not persist or mutate Project Memory.

## Validation boundary

A `PARTNER_HANDOFF_PASS` from this contract means:

- an actual external file-exchange hand-off was executed;
- Nexus has reviewed external evidence that FabStation processed it.

It does not imply:

- public API/SDK/webhook availability;
- connector-confirmed receipt;
- live or two-way sync;
- `REAL IFC PASS`;
- `TRUSTED VIEWER PASS`;
- `ANDROID/FOLD PASS`.

Those remain independent validation gates.

## Next controlled step

When a real partner-approved FabStation project is available:

1. generate/review the Slice N package plan;
2. assemble the exact ZIP outside this planner;
3. calculate and record the ZIP SHA-256;
4. upload manually through the approved FabStation route;
5. capture canonical evidence of processing/result;
6. review that evidence in Nexus;
7. run this evaluator;
8. persist the resulting canonical event only through the normal Project Memory authority/persistence path.

## Protected boundaries

No PR #91/Spark Object Card changes. No Work Wallet, Nexus Cloud/Drive, Android Work Mode, DoorFlow, Electrical, Person Card UI or Relationship Tree gesture/layout changes. No automatic merge/deploy.
