# NOSMO Nexus — Android Work Mode E2E handoff

Status: active Android integration track stacked on PR #90 foundation.

Branch: `codex/android-work-mode-e2e-handoff`

Draft PR: #96.

Protected: PR #91 is untouched and must remain untouched.

## Canonical role

Android Work Mode is a native field-intake client for Nexus. It is not a second Nexus backend, identity system, permission engine, Cloud backend or autonomous Action Engine.

Target path:

`permitted Android source -> candidate -> user review/approval -> exact Project World -> authenticated Nexus session -> canonical Person binding -> canonical ProjectParticipation + PermissionGrant -> Android handoff access decision -> Ask Nexus metadata assistance -> separate WorkSuite review access decision -> human review`

Raw evidence bytes use the canonical Nexus Cloud path only when that runtime endpoint is available.

## Donor and parallel reconciliation

Android donors:

- #27 — first discovery donor;
- #41 — native Java / Personal Cloud donor; whole-phone/full-file scanning direction rejected;
- #44 — native Work Mode base;
- #85 — latest safe installable Knowledge Vacuum UI donor;
- #50 — deterministic Work Mode AI boundary donor;
- #78/#79 — WorkSuite draft/permission donors.

Shared Nexus donors discovered after #96 started:

- #106 — canonical Project Memory Person persistence and exact provider-subject binding;
- #107 — canonical fail-closed #90 access resolver;
- #112 — workspace-scoped canonical ProjectParticipation/PermissionGrant persistence and loader.

The earlier Android-only `nexusRuntimeAuthority` tables/evaluator/bootstrap were removed. Android now composes shared Nexus authority instead of owning another Auth/ACL store.

Historical #56 `ACTIVE_PARTICIPATION_SHARED_ACCESS` is not restored.

## Native intake / Knowledge Vacuum

Implemented under `native/nexus-work-mode-native`:

- native Java client;
- Android Photo Picker on API 33+ with system document fallback;
- `ACTION_OPEN_DOCUMENT` document picker;
- `ACTION_OPEN_DOCUMENT_TREE` folder picker;
- Contacts and Calendar only after runtime permission;
- visible candidate review queue, selected by default but deselectable;
- candidate source, content type, device-local reference, timestamp, confidence, approval state and handoff state;
- no Accessibility Service;
- no broad storage permission;
- no WhatsApp/Gmail/Teams private database reads;
- no WebView;
- no cleartext traffic;
- no Android auth token logging/storage.

App shortcuts remain `LAUNCHERS / DEEP LINKS — NOT API INTEGRATIONS` unless a separate real connector exists.

## Project World isolation

Current #90 fixture pair:

- `projectId=project-esafe-catania`
- `worldId=world-esafe-catania`

Riverside remains `NEEDS_USER_CONFIRMATION` until Project Memory supplies a current canonical pair. Historical Riverside aliases are not reused and e-SAFE/Riverside are never mixed.

## Android -> Nexus context envelope

Compatibility markers:

- `nexusIntent=ask-nexus`
- `nexusAiContext=android-work-discovery-v1`

Canonical envelope:

`nexus-android-work-mode-context-v1`

It carries:

- one Android-generated `handoffRequestId` UUID;
- exact project/world;
- approved opaque candidate IDs;
- source types;
- user intent;
- `PENDING_SERVER_CONFIRMATION`.

It does not carry:

- local content URI;
- raw photo/PDF bytes;
- OIDC subject;
- canonical Person ID supplied by Android;
- Project Participation;
- permission grant;
- session token in the browser URL.

`handoffRequestId` is correlation/one-flight state only. It is never authentication, Person identity, Project authority or permission evidence.

## One-flight request correlation

Before opening the Nexus browser bootstrap, Android generates a UUID and stores it as `pendingHandoffRequestId`.

Only one handoff batch may be pending at a time.

The UUID is passed through:

`APK -> GET /api/nexus/android-work-mode/handoff -> login-safe returnTo -> authenticated bootstrap page -> POST /api/nexus/work-mode-ai/context -> handoff receipt -> browser deep-link callback -> HandoffResultActivity`

Server behavior:

- `handoffRequestId` must match UUID syntax;
- it survives the OIDC login `returnTo` path;
- it is echoed unchanged in `nexus-android-work-mode-handoff-receipt/v1`;
- it is not supplied to the canonical access resolver;
- it cannot alter Person binding, participation, grant or decision outcome.

Browser behavior before constructing the callback:

- receipt `handoffRequestId` must equal the envelope UUID;
- receipt project/world must equal the envelope Project World;
- receipt selected item IDs must equal the exact envelope item set;
- otherwise callback status is forced to `FAILED_RETRYABLE` and no server receipt ID is trusted.

Native callback behavior:

- callback `handoffRequestId` must equal locally stored `pendingHandoffRequestId`;
- stale/unsolicited callback UUIDs are ignored;
- exact current project/world must match;
- callback item set must equal the complete locally pending batch;
- only `PENDING_SERVER_CONFIRMATION` candidates may be transitioned;
- applying a valid callback clears the one-flight request ID.

This is anti-spoof/correlation hardening for the exported deep link. It is not a replacement for server authentication or access control.

## Explicit Nexus origin

The APK consumes build-time `NEXUS_ANDROID_WEB_ORIGIN` through `BuildConfig.NEXUS_WEB_ORIGIN`.

Only HTTPS is accepted. Missing/invalid origin fails closed; no preview or production host is guessed.

Bootstrap:

`GET /api/nexus/android-work-mode/handoff`

## Existing Nexus auth and shared Person binding

No Android identity system exists.

Browser handoff reuses the existing OIDC/session login path. Direct API transport may use the existing Bearer-session mechanism.

Shared identity files on #96:

- `lib/db/src/schema/nexusProjectMemoryIdentity.ts`;
- `artifacts/api-server/src/lib/nexus-person-binding.ts`.

Canonical behavior:

`exact OIDC issuer + SHA-256(exact provider subject) -> canonical Nexus personId`

Rules:

- raw provider subject is not persisted in the new binding table;
- email/name fuzzy binding is forbidden;
- authenticated provider identity is not promoted directly to Person ID;
- binding disabled -> `UNBOUND`;
- binding-store failure -> fail closed.

No schema was applied to a live database in this Android track.

## Shared Project access

#96 reuses:

- `lib/db/src/schema/nexusProjectAccess.ts`;
- `lib/db/src/nexusProjectAccessPersistence.ts`;
- `src/core/permissions/canonicalAccessResolver.ts`.

Android-specific composition only:

`artifacts/api-server/src/lib/nexus-android-work-mode-authority.ts`

Authority path:

`server session -> shared Person binding -> existing workspace -> exact workspace/person/project/world access rows -> canonical #90 NexusAccessDecisionRecord`

Policy:

- exactly one active valid participation;
- participation alone never grants access;
- matching broader/exact deny wins;
- exact explicit module + action allow required;
- scoped grants cannot widen silently;
- role/trade alone is not authority;
- persistence input is server-owned.

Removed Android-only files must not be restored:

- `nexusRuntimeAuthority.ts`;
- `nexus-runtime-authority.ts`;
- `bootstrap-nexus-android-work-mode-authority.mjs`.

## Ask Nexus boundary

Routes:

- `GET /api/nexus/work-mode-ai/status`;
- `POST /api/nexus/work-mode-ai/context`.

Current truth:

- `modelExecution=disabled-demo-boundary`;
- deterministic metadata assistance only;
- no raw photo/PDF recognition;
- no Project Memory mutation;
- no autonomous action execution.

Two distinct canonical access decisions are made:

1. module `soft`, action `android.work-mode.handoff`;
2. module `soft`, action `worksuite.draft.review`.

The WorkSuite review decision is never inferred from the Android handoff decision.

## WorkSuite draft boundary

Routes:

- `GET /api/nexus/worksuite/draft-actions/status`;
- `POST /api/nexus/worksuite/draft-actions/validate`.

Draft invariants:

- `mutationMode=draft-only-no-mutation`;
- `executionBoundary=worksuite-action-engine-required`;
- exact project/world retained;
- no graph mutation;
- no file write;
- no approval execution;
- no Action Engine execution.

Current semantics:

- unauthenticated -> `blocked`;
- authenticated but unbound -> `blocked`;
- invalid participation -> `blocked`;
- explicit deny -> `blocked`;
- missing exact allow -> `blocked`;
- exact canonical allow for `worksuite.draft.review` -> `needs-review`;
- `ready-for-approval` remains outside Android/AI.

## Server acknowledgement -> device queue

Receipt schema:

`nexus-android-work-mode-handoff-receipt/v1`

Browser callback:

`nosmo-nexus-workmode://handoff-result`

Native receiver:

`HandoffResultActivity`

Successful `HANDED_OFF` requires:

- exact pending `handoffRequestId`;
- valid random 32-character server `receiptId`;
- exact current project/world;
- exact complete pending candidate set.

Blocked/network/no-confirmation behavior becomes `FAILED_RETRYABLE`.

Queue lifecycle:

`LOCAL_ONLY -> PENDING_SERVER_CONFIRMATION -> HANDED_OFF | FAILED_RETRYABLE`

Retry rules:

- `LOCAL_ONLY` and `FAILED_RETRYABLE` may be sent;
- `PENDING_SERVER_CONFIRMATION` is locked against duplicate resend;
- `HANDED_OFF` is locked against duplicate resend;
- browser-launch failure immediately changes the attempted batch to `FAILED_RETRYABLE`;
- callback return reloads the queue from SharedPreferences through `onNewIntent`.

`HANDED_OFF` means bounded metadata context was accepted. It does not mean raw evidence bytes were uploaded.

## Android evidence -> canonical Nexus Cloud seam

Contract:

`src/core/android/androidEvidenceTransferContract.ts`

Schema:

`nexus-android-evidence-transfer-request/v1`

It references existing #90 Cloud contracts:

- `nexus-cloud-pending-asset/v2`;
- module `cloud`;
- action `cloud.file.write`;
- source module `android-work-mode`.

The plan contains provider-neutral evidence metadata and has explicit zero side effects:

- `binaryReadPerformed=false`;
- `networkUploadPerformed=false`;
- `providerWritePerformed=false`;
- `projectMemoryMutationPerformed=false`;
- `projectGraphMutationPerformed=false`.

The device-local URI is deliberately absent from the shared Cloud request.

Actual Android photo/PDF binary transfer remains:

`PENDING_CANONICAL_CLOUD_ENDPOINT`

PR #112 still lists the authenticated multipart Cloud endpoint as a remaining gate. #96 must not create a competing upload/Google Drive backend.

## Validation truth

Configured CI covers:

- root workspace typecheck;
- shared identity/access composition;
- Android permissions and picker boundaries;
- exact e-SAFE Project World;
- retry-state invariants;
- one-flight `handoffRequestId` propagation/validation;
- receipt/callback correlation;
- Android evidence -> canonical Cloud seam;
- Java 17 / Gradle 8.9 / AGP 8.7.3;
- compileSdk/targetSdk 35, minSdk 26;
- debug APK and release AAB.

Observed GitHub Actions on this track continue to fail before first runner step with `steps=null`. This remains:

`BLOCKED BY ACTIONS INFRA`

It is not a TypeScript/Gradle failure signal.

Not claimed:

- `LOCAL BUILD PASS`;
- `APK INSTALL PASS`;
- `DEVICE/FOLD SMOKE PASS`;
- real raw-evidence Cloud upload;
- production AI execution.

## Remaining real E2E gates

1. identify safe non-production `DATABASE_URL`;
2. inspect/apply shared identity/access schemas only there;
3. run authenticated `UNBOUND -> BOUND` smoke;
4. run exact e-SAFE allow/deny cases for both Android and WorkSuite actions;
5. obtain actual APK/AAB output and run install/device/Fold smoke;
6. consume the canonical authenticated multipart Cloud endpoint when the Cloud track exposes it;
7. only then add authorised content-specific Ask Nexus processing.

Do not auto-merge, deploy or apply database schema from this track.
