# NOSMO Nexus — Android Work Mode E2E handoff

Status: active Android integration track stacked on PR #90 foundation.

Branch: `codex/android-work-mode-e2e-handoff`

Draft PR: #96.

Protected: PR #91 is untouched and must remain untouched.

## Canonical role

Android Work Mode is a native field-intake client for Nexus. It is not a second Nexus backend, identity system, permission engine, Cloud backend or autonomous agent.

Target path:

`permitted Android source -> candidate -> user review/approval -> exact Project World -> existing Nexus auth/session -> canonical Person binding -> canonical ProjectParticipation + PermissionGrant -> Ask Nexus assistance -> WorkSuite draft -> separate review permission -> human review`

Raw evidence bytes use the canonical Nexus Cloud path when that runtime endpoint is available.

## Donor / parallel reconciliation

Android donors:

- #27 — first discovery donor;
- #41 — native Java / Personal Cloud donor; whole-phone/full-file scanning direction rejected;
- #44 — native Work Mode base;
- #85 — latest safe installable Knowledge Vacuum UI donor;
- #50 — deterministic Work Mode AI boundary donor;
- #78/#79 — WorkSuite draft/permission donors.

Shared Nexus donors discovered after #96 started:

- #106 — shared canonical Person persistence/binding using `nexus_pm_people` + exact provider-subject digest;
- #107 — canonical fail-closed #90 access resolver requiring exact participation + explicit allow and deny precedence;
- #112 — workspace-scoped persistence/loader for canonical `nexus_pm_project_participations` + `nexus_pm_permission_grants`.

Because these shared layers appeared in parallel, the earlier Android-only `nexusRuntimeAuthority` tables/evaluator/bootstrap were removed from #96. Android now composes the shared contracts instead of owning another Auth/ACL store.

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

Riverside remains `NEEDS_USER_CONFIRMATION` until Nexus Project Memory supplies a current canonical pair. Historical Riverside aliases are not reused and e-SAFE/Riverside are never mixed.

## Android -> Nexus context envelope

Compatibility markers:

- `nexusIntent=ask-nexus`
- `nexusAiContext=android-work-discovery-v1`

Canonical extended envelope:

`nexus-android-work-mode-context-v1`

It carries exact project/world, approved opaque candidate IDs, source types, user intent and `PENDING_SERVER_CONFIRMATION`.

It does not carry:

- local content URI;
- raw photo/PDF bytes;
- OIDC subject;
- canonical Person ID supplied by Android;
- Project Participation;
- permission grant;
- session token in the browser URL.

## Explicit Nexus origin

The APK consumes build-time `NEXUS_ANDROID_WEB_ORIGIN` through `BuildConfig.NEXUS_WEB_ORIGIN`.

Only HTTPS is accepted. Missing/invalid origin fails closed; no preview/production host is guessed.

Bootstrap:

`GET /api/nexus/android-work-mode/handoff`

## Existing Nexus auth and shared Person binding

No Android identity system exists.

The browser handoff reuses the existing OIDC/session login path. Direct API transport may use the existing Bearer session mechanism.

Shared Person binding files on #96 are reconciled from the shared #106 direction:

- `lib/db/src/schema/nexusProjectMemoryIdentity.ts`;
- `artifacts/api-server/src/lib/nexus-person-binding.ts`.

Canonical behavior:

`exact OIDC issuer + SHA-256(exact provider subject) -> canonical Nexus personId`

Rules:

- raw provider subject is not persisted in the new binding table;
- email/name fuzzy binding is forbidden;
- authenticated provider identity is not promoted directly to Person ID;
- binding disabled -> `UNBOUND`;
- binding store failure -> fail closed.

No schema was applied to a live database in this track.

## Shared Project access

#96 now reuses the shared #112/#107 shape:

- `lib/db/src/schema/nexusProjectAccess.ts`;
- `lib/db/src/nexusProjectAccessPersistence.ts`;
- `src/core/permissions/canonicalAccessResolver.ts`.

Android-specific composition only:

`artifacts/api-server/src/lib/nexus-android-work-mode-authority.ts`

Path:

`server session -> shared Person binding -> existing workspace -> exact workspace/person/project/world access rows -> canonical #90 resolver`

Policy:

- exactly one active valid participation;
- participation alone never grants access;
- matching broader/exact deny wins;
- exact explicit module + action allow required;
- scoped grants cannot widen silently;
- role/trade alone is not authority;
- server-owned persistence only.

The removed Android-only tables/scripts must not be restored:

- `nexusRuntimeAuthority.ts`;
- `nexus-runtime-authority.ts`;
- `bootstrap-nexus-android-work-mode-authority.mjs`.

## Ask Nexus boundary

Routes:

- `GET /api/nexus/work-mode-ai/status`;
- `POST /api/nexus/work-mode-ai/context`.

Current AI truth:

- `modelExecution=disabled-demo-boundary`;
- deterministic metadata assistance only;
- no raw photo/PDF recognition;
- no Project Memory mutation;
- no autonomous action execution.

The context endpoint makes two distinct canonical access decisions:

1. module `soft`, action `android.work-mode.handoff` — can the approved Android metadata context enter this Project World?
2. module `soft`, action `worksuite.draft.review` — may the generated draft enter human WorkSuite review?

The second decision is never inferred from the first.

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

Current status semantics:

- unauthenticated -> `blocked`;
- authenticated but unbound -> `blocked`;
- missing/invalid participation -> `blocked`;
- explicit deny -> `blocked`;
- missing exact allow -> `blocked`;
- exact canonical allow for `worksuite.draft.review` -> `needs-review`;
- `ready-for-approval` remains outside Android/AI and requires later human/Action Engine approval boundary.

## Server acknowledgement -> device queue

Receipt schema:

`nexus-android-work-mode-handoff-receipt/v1`

Browser callback:

`nosmo-nexus-workmode://handoff-result`

Native receiver:

`HandoffResultActivity`

Local-state rules:

- receipt affects only the device-local queue;
- successful `HANDED_OFF` requires a random 32-character server receipt ID;
- callback projectId/worldId must equal current local Project World;
- every receipt item must already be `PENDING_SERVER_CONFIRMATION` or idempotently already in the target state;
- callback cannot promote arbitrary `LOCAL_ONLY` items;
- blocked/network failure -> `FAILED_RETRYABLE`;
- receipt is correlation evidence, not server auth, Person binding, permission or Action Engine approval.

Queue lifecycle:

`LOCAL_ONLY -> PENDING_SERVER_CONFIRMATION -> HANDED_OFF | FAILED_RETRYABLE`

`HANDED_OFF` means the bounded metadata context was accepted. It does not claim raw evidence bytes were uploaded.

## Android evidence -> canonical Nexus Cloud seam

New contract:

`src/core/android/androidEvidenceTransferContract.ts`

Schema:

`nexus-android-evidence-transfer-request/v1`

It directly references existing #90 Cloud contracts:

- `nexus-cloud-pending-asset/v2`;
- module `cloud`;
- action `cloud.file.write`;
- source module `android-work-mode`.

The transfer request contains provider-neutral metadata such as exact project/world, candidate ID, original file name, MIME type, optional size/checksum and capture timestamp.

It deliberately does not contain a device-local URI or provider folder/credential.

The pure preparation function has all side effects false:

- no binary read;
- no network upload;
- no provider write;
- no Project Memory mutation;
- no Project Graph mutation.

Current Cloud track truth from #112: canonical access persistence exists, but the final authenticated multipart Cloud endpoint is still a remaining gate. Therefore binary transfer from Android remains:

`PENDING_CANONICAL_CLOUD_ENDPOINT`

Do not add a second upload/Drive backend to #96. When the Cloud track exposes the canonical endpoint, Android should locally open its approved URI and stream bytes to that endpoint under the existing Nexus session/Cloud `cloud.file.write` decision.

## Build / APK status

Workflow:

`.github/workflows/android-native-work-mode-e2e.yml`

Configured validation includes:

- full workspace TypeScript typecheck;
- shared identity/access schema + resolver checks;
- Android handoff vs WorkSuite permission separation;
- Java 17;
- Gradle 8.9;
- AGP 8.7.3;
- compileSdk 35;
- targetSdk 35;
- minSdk 26;
- debug APK + release AAB;
- permission/picker/callback checks.

GitHub Actions on this track have repeatedly ended before runner steps (`steps=null`) with no usable logs. Status is:

`BLOCKED BY ACTIONS INFRA`

not a Gradle/typecheck failure.

`LOCAL BUILD PASS` is not claimed because the available local runtime has no validated Android SDK/Gradle build toolchain.

`APK INSTALL PASS`: PENDING.

`DEVICE SMOKE PASS`: PENDING.

## Remaining real E2E gates

1. Identify a safe non-production `DATABASE_URL` and reconcile/apply the shared identity/access schemas there — not the removed Android-only schema.
2. Run real authenticated `UNBOUND -> BOUND` Person smoke.
3. Run exact e-SAFE participation/grant cases for both `android.work-mode.handoff` and `worksuite.draft.review`.
4. Confirm metadata handoff receipt returns to Android and changes only pending local queue entries.
5. Wait for/reuse the canonical authenticated multipart Nexus Cloud endpoint for actual selected photo/PDF bytes.
6. Then allow Ask Nexus content-specific interpretation using authorised evidence, still as assistance rather than source of truth.
7. Obtain real APK/AAB build output.
8. Install on Android and execute picker/auth/browser-return/resume/orientation/fold smoke.

## Protected surfaces

Unchanged:

- PR #91 Spark SKANSKA Demo Core;
- accepted Object Card design;
- Google Drive/Nexus Cloud implementation track;
- Work Wallet track;
- BIM/IFC/FabStation;
- DoorFlow;
- Electrical Commissioning;
- Relationship Tree gestures/layout;
- Person Card design.
