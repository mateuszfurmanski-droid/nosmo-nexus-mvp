# NEXUS Android — persisted URI grant lifecycle

Status: implemented security rule for PR #96 Android Work Mode.

## Scope

This rule applies only to Android document/folder/photo references obtained through system pickers where the provider grants persistable read access.

It does not create a Nexus file identity, Cloud permission, Project Participation, provider credential or upload authority.

## Current reason for retaining the grant

`HANDED_OFF` in Android Work Mode currently confirms only the bounded metadata context handoff.

It does **not** prove that the raw photo/PDF/document bytes were uploaded to Nexus Cloud.

The canonical Android evidence path remains:

`local picker URI -> future authenticated Nexus Cloud multipart endpoint -> cloud.file.write access decision -> provider write -> canonical persistence receipt`

Therefore automatically calling `releasePersistableUriPermission(...)` when metadata becomes `HANDED_OFF` would be incorrect: it could destroy the durable local read capability before the future authorised binary transfer occurs.

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
- allowed for `HANDED_OFF` while raw Cloud evidence transfer is still pending/available to the user.

Grant release:

- occurs on explicit local candidate removal when the exact URI is no longer referenced by another local candidate;
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

## Folder grants

A folder selected through `ACTION_OPEN_DOCUMENT_TREE` may carry prefix access. Local removal releases only the exact persisted tree URI permission held by the candidate. No recursive file deletion or child enumeration is permitted.

## Photo Picker

Modern Android Photo Picker references may not use persistable-document grant semantics. Release is therefore best-effort: the app only releases a grant when the exact URI appears in Android's persisted URI permission list.

## Failure / corruption

If a persisted grant cannot be released because the provider no longer exposes it, the local candidate may still be removed. Failure to release does not become a server-side Nexus mutation or permission decision.

The app never revokes unrelated persisted URI grants to repair a Work Mode queue.

## Current implementation truth

PR #96 now implements:

- persistable read acquisition where the picker/provider permits it;
- explicit local candidate removal;
- `PENDING_SERVER_CONFIRMATION` removal block;
- extra warning for `HANDED_OFF` metadata-only items;
- duplicate-local-reference protection;
- targeted exact-URI persisted read release;
- device-local removal with zero server-side deletion semantics.

Automatic release on `HANDED_OFF` remains intentionally **not implemented** because raw canonical Cloud transfer is still pending.

## Protected boundaries

This lifecycle rule does not modify:

- PR #91 Spark demo;
- canonical Nexus auth/Person/access contracts;
- Nexus Cloud provider implementation;
- Work Wallet;
- BIM/IFC/FabStation;
- DoorFlow/Electrical;
- Relationship Tree or Person Card UI.
