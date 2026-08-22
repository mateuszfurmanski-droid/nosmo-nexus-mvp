# NEXUS Android — persisted URI grant lifecycle

Status: design/security rule for PR #96 Android Work Mode.

## Scope

This rule applies only to Android document/folder/photo references obtained through system pickers where the provider grants persistable read access.

It does not create a Nexus file identity, Cloud permission, Project Participation, provider credential or upload authority.

## Current reason for retaining the grant

`HANDED_OFF` in Android Work Mode currently confirms only the bounded metadata context handoff.

It does **not** prove that the raw photo/PDF/document bytes were uploaded to Nexus Cloud.

The canonical Android evidence path remains:

`local picker URI -> future authenticated Nexus Cloud multipart endpoint -> cloud.file.write access decision -> provider write -> canonical persistence receipt`

Therefore automatically calling `releasePersistableUriPermission(...)` when metadata becomes `HANDED_OFF` would be incorrect: it could destroy the only durable local read capability before the future authorised binary transfer occurs.

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

- must occur when the user explicitly removes the local candidate;
- may occur after a future canonical Cloud binary transfer is independently confirmed **and** the user/local retention policy says the device copy is no longer required;
- must not be triggered merely by metadata handoff receipt;
- must not be triggered by WorkSuite review status;
- must not be triggered by Project Graph/Timeline projection.

## Local removal semantics

Future `Remove local candidate` behavior must be device-local only:

1. reject removal while that candidate is `PENDING_SERVER_CONFIRMATION` unless the active handoff is first recovered/cancelled to `FAILED_RETRYABLE`;
2. for a `content://` reference, attempt `releasePersistableUriPermission(uri, FLAG_GRANT_READ_URI_PERMISSION)`;
3. tolerate providers that never granted persistable access;
4. remove the candidate and local URI reference from SharedPreferences;
5. do not delete or mutate any Nexus Project Memory record, Cloud object, WorkSuite record, Person record, Timeline event or Project Graph node;
6. do not interpret local removal as revocation of any server-side record.

## Folder grants

A folder selected through `ACTION_OPEN_DOCUMENT_TREE` may carry prefix access. Local removal must release only the exact persisted URI permission held by this Work Mode candidate. No recursive file deletion is permitted.

## Photo Picker

Modern Android Photo Picker references may not use the same persistable-document grant semantics. Release logic must therefore be best-effort and must not assume every `PHOTO` candidate owns a persisted grant.

## Failure / corruption

If a persisted grant cannot be released because the provider no longer exposes it, the local candidate may still be removed. Failure to release must not become a server-side Nexus mutation or permission decision.

The app must not enumerate and revoke unrelated persisted URI grants merely to repair a corrupt Work Mode queue.

## Current implementation truth

PR #96 currently acquires persistable read access where the picker/provider permits it.

Automatic release on `HANDED_OFF` is intentionally **not implemented** because raw canonical Cloud transfer is still pending.

An explicit local candidate removal control with targeted grant release remains a separate native UI hardening slice.

## Protected boundaries

This lifecycle rule does not modify:

- PR #91 Spark demo;
- canonical Nexus auth/Person/access contracts;
- Nexus Cloud provider implementation;
- Work Wallet;
- BIM/IFC/FabStation;
- DoorFlow/Electrical;
- Relationship Tree or Person Card UI.
