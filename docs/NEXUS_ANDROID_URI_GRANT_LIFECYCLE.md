# NEXUS Android — persisted URI grant lifecycle

Status: implemented security rule for PR #96 Android Work Mode.

## Scope

This rule applies only to Android document/folder/photo references obtained through system pickers where the provider grants read access and, when supported, persistable read access.

It does not create a Nexus file identity, Cloud permission, Project Participation, provider credential or upload authority.

## Current reason for retaining the grant

`HANDED_OFF` in Android Work Mode confirms only the bounded metadata context handoff.

It does **not** prove that the raw photo/PDF/document bytes were uploaded to Nexus Cloud.

The canonical Android evidence path is:

`local picker URI -> authenticated Nexus Cloud multipart endpoint -> cloud.file.write access decision -> provider write -> canonical persistence receipt`

PR #125 now exposes the canonical backend endpoint contract, but it remains open/not deployed and still has runtime/provenance gates. Therefore automatically calling `releasePersistableUriPermission(...)` when metadata becomes `HANDED_OFF` would still be incorrect: it could destroy the durable local read capability before an authorised binary transfer occurs.

## Canonical lifecycle rule

A persistable URI read grant may exist only while a local candidate still exists and may reasonably require a later raw-evidence transfer.

Grant acquisition:

- only after explicit Android system picker selection;
- only when `FLAG_GRANT_PERSISTABLE_URI_PERMISSION` is actually returned;
- read-only;
- no broad external-storage permission is introduced.

Grant retention:

- allowed for `LOCAL_ONLY`;
- allowed for `PENDING_SERVER_CONFIRMATION`;
- allowed for `FAILED_RETRYABLE`;
- allowed for `HANDED_OFF` while raw Cloud evidence transfer is still pending/available to the user;
- allowed during `RESELECTION_REQUIRED` only for any exact old URI grant that Android still reports, until a valid replacement selection is accepted or the local candidate is removed.

Grant release:

- occurs on explicit local candidate removal when the exact URI is no longer referenced by another local candidate;
- occurs during successful evidence reselection for the previous exact URI only when no other local candidate still references it;
- may occur later after a canonical Cloud binary transfer is independently confirmed and local retention policy says device access is no longer needed;
- is not triggered merely by metadata handoff receipt;
- is not triggered by WorkSuite review status;
- is not triggered by Project Graph/Timeline projection.

## Implemented local removal semantics

`Remove local candidate` is device-local only:

1. removal is rejected while that candidate is `PENDING_SERVER_CONFIRMATION`; the active handoff must first complete or be explicitly recovered to `FAILED_RETRYABLE`;
2. removal requires an explicit confirmation dialog;
3. a `HANDED_OFF` item gets an additional warning that Nexus accepted metadata but raw bytes may still be local-only;
4. for a `content://` reference, the app checks the exact persisted read grant and calls `releasePersistableUriPermission(uri, FLAG_GRANT_READ_URI_PERMISSION)` only for that exact URI;
5. if another candidate still references the same exact local URI, the persisted grant is retained;
6. providers that never granted persistable access are tolerated;
7. the candidate and its local URI reference are removed from SharedPreferences;
8. no Nexus Project Memory record, Cloud object, WorkSuite record, Person record, Timeline event or Project Graph node is deleted or mutated;
9. local removal is not interpreted as revocation of any server-side record.

## Expired/revoked URI recovery

Before a PHOTO/DOCUMENT binary upload starts, `CloudEvidenceActivity` now performs an actual read-open probe on the exact local `content://` URI.

If the URI cannot be read:

`PENDING/READY/FAILED_RETRYABLE -> RESELECTION_REQUIRED`

The app does not keep issuing network retries against an unreadable local source.

Recovery is explicit and device-local:

1. the user chooses `Re-select original evidence`;
2. the app launches Android `ACTION_OPEN_DOCUMENT` with a source-appropriate filter;
3. one pending reselection candidate ID is persisted locally so a picker result can be correlated even if the Activity is recreated;
4. only a returned `content://` reference is accepted;
5. the app attempts to retain read access when the provider returns persistable permission capability;
6. the newly selected URI must be actually readable before it replaces the old local reference;
7. PHOTO recovery additionally requires an `image/*` MIME type;
8. the existing candidate ID, metadata handoff state, receipt-derived Project World binding and Cloud idempotency key are retained;
9. reselection writes a device-local timestamp and counter for audit/debug purposes;
10. only after the replacement is accepted may the old persisted URI grant be released, and only if no other local candidate uses that exact old URI.

Reselection is **not** a new Nexus handoff and is **not** authority. It does not mint a new Person binding, Project Participation, PermissionGrant, Project World binding or Cloud receipt.

If a prior provider write already occurred and the user accidentally selects different bytes, the canonical Cloud idempotency/content fingerprint path is still expected to reject changed-content reuse rather than silently create a second object.

## Folder grants

A folder selected through `ACTION_OPEN_DOCUMENT_TREE` may carry prefix access. Local removal releases only the exact persisted tree URI permission held by the candidate. No recursive file deletion or child enumeration is permitted.

## Photo Picker

Modern Android Photo Picker references may not always survive with document-style persisted grant semantics. Release is therefore best-effort: the app only releases a grant when the exact URI appears in Android's persisted URI permission list.

The explicit reselection path uses `ACTION_OPEN_DOCUMENT` because the recovery goal is a durable user-approved read reference suitable for a later Cloud stream.

## Failure / corruption

If a persisted grant cannot be released because the provider no longer exposes it, the local candidate may still be removed. Failure to release does not become a server-side Nexus mutation or permission decision.

If a reselection result arrives without the locally pending candidate correlation, it is ignored as stale.

The app never revokes unrelated persisted URI grants to repair a Work Mode queue.

## Current implementation truth

PR #96 now implements:

- persistable read acquisition where the picker/provider permits it;
- explicit local candidate removal;
- `PENDING_SERVER_CONFIRMATION` removal block;
- extra warning for `HANDED_OFF` metadata-only items;
- duplicate-local-reference protection;
- targeted exact-URI persisted read release;
- pre-upload local URI readability probe;
- explicit `RESELECTION_REQUIRED` recovery state;
- system-picker reselection with persisted candidate correlation;
- preservation of receipt-bound Project World and stable Cloud idempotency identity during reselection;
- device-local removal/recovery with zero server-side deletion or authority semantics.

Automatic release on `HANDED_OFF` remains intentionally **not implemented** because metadata confirmation alone is not a raw evidence receipt.

## Protected boundaries

This lifecycle rule does not modify:

- PR #91 Spark demo;
- canonical Nexus auth/Person/access contracts;
- Nexus Cloud provider implementation;
- Work Wallet;
- BIM/IFC/FabStation;
- DoorFlow/Electrical;
- Relationship Tree or Person Card UI.
