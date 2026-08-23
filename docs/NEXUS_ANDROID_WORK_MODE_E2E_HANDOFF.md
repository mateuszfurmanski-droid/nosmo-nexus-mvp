# NOSMO Nexus — Android Work Mode E2E handoff

Status: active Android integration track stacked on PR #90 foundation.

Branch: `codex/android-work-mode-e2e-handoff`

Draft PR: #96.

Protected: PR #91 is untouched and must remain untouched.

## Canonical role

Android Work Mode is a native field-intake client for Nexus. It is not a second Nexus backend, Person system, permission engine, Cloud/Drive backend or autonomous Action Engine.

Current intended path:

`permitted Android source -> local candidate -> user review -> exact Project World -> authenticated metadata handoff -> canonical Person/Project access -> deterministic Ask Nexus metadata assistance -> WorkSuite draft review`

For user-selected PHOTO/DOCUMENT evidence the binary path is separate:

`confirmed metadata receipt -> receipt-bound Project World -> native PKCE Nexus session -> Bearer POST /api/nexus/cloud/files -> cloud.file.write -> provider receipt -> Project Memory commit -> TRANSFER_CONFIRMED`

Metadata acceptance never implies binary upload success.

## Native intake / Knowledge Vacuum

Implemented under `native/nexus-work-mode-native`:

- native Java client;
- Android Photo Picker on API 33+ with system document fallback;
- `ACTION_OPEN_DOCUMENT` and `ACTION_OPEN_DOCUMENT_TREE`;
- Contacts and Calendar only after runtime permission;
- visible local candidate review queue;
- exact #90 e-SAFE fixture only: `project-esafe-catania` + `world-esafe-catania`;
- Riverside remains `NEEDS_USER_CONFIRMATION`;
- no Accessibility Service;
- no broad storage permission;
- no private WhatsApp/Gmail/Teams database access;
- no WebView;
- no cleartext traffic;
- no provider OAuth/Drive implementation in the APK.

WhatsApp/Gmail/Teams/Drive buttons remain launchers unless a separate real connector exists.

## Metadata handoff

Compatibility markers:

- `nexusIntent=ask-nexus`;
- `nexusAiContext=android-work-discovery-v1`.

Canonical schema:

`nexus-android-work-mode-context-v1`

Bootstrap:

`GET /api/nexus/android-work-mode/handoff`

The URL contains only bounded metadata such as exact Project World, opaque candidate IDs/source types, fixed non-sensitive intent and one-flight `handoffRequestId`.

It does not contain:

- local content URI;
- raw file/photo bytes;
- session ID;
- provider subject;
- canonical Person ID supplied by Android;
- Project Participation or PermissionGrant authority;
- free-text Ask Nexus content.

Free-text was deliberately removed from the login/bootstrap GET path to avoid browser-history/proxy/request-log leakage.

## One-flight receipt correlation

Queue lifecycle:

`LOCAL_ONLY -> PENDING_SERVER_CONFIRMATION -> HANDED_OFF | FAILED_RETRYABLE`

A successful native metadata transition requires:

- exact locally pending `handoffRequestId`;
- exact current project/world;
- exact complete pending candidate set;
- valid random 32-character server receipt ID.

Callback:

`nosmo-nexus-workmode://handoff-result`

Stale/unsolicited callbacks fail closed. Project World changes and duplicate sends are blocked while one handoff is pending. Abandoned browser/login may be explicitly recovered to `FAILED_RETRYABLE`.

`HANDED_OFF` means metadata only.

## Shared Person and access authority

#96 consumes the shared canonical direction rather than owning an Android ACL:

- PR #106 — canonical Project Memory Person persistence + exact hashed provider-subject binding;
- PR #107 — canonical fail-closed access resolver;
- PR #112 — workspace-scoped ProjectParticipation/PermissionGrant persistence and loader.

Authority path:

`server session -> exact provider binding -> canonical Person -> exact workspace/person/project/world participation + grants -> NexusAccessDecisionRecord`

Rules:

- provider subject != canonical Person ID;
- no email/name fuzzy binding;
- exactly one active valid participation;
- participation alone grants nothing;
- explicit deny wins;
- exact explicit module + action allow required;
- role/trade alone is not authority.

Android metadata handoff and WorkSuite draft review are two independent access decisions:

- `soft / android.work-mode.handoff`;
- `soft / worksuite.draft.review`.

Exact WorkSuite review allow reaches only human review. No Action Engine execution occurs here.

## Native mobile Nexus authentication

The repository already had `POST /api/mobile-auth/token-exchange`, which creates the same DB-backed Nexus session used by normal browser auth and returns its session ID for Bearer transport.

#96 now completes the missing native start/callback bridge without creating a second identity provider flow.

Server route:

`GET /api/mobile-auth/start`

Flow:

1. APK generates PKCE verifier, S256 challenge, random state and nonce.
2. Only challenge/state/nonce enter the browser start URL.
3. Nexus OIDC uses the existing registered HTTPS callback: `/api/callback`.
4. A separate HttpOnly mobile-flow cookie distinguishes native auth from ordinary browser login.
5. The HTTPS callback validates server-held state and forwards only the short-lived provider authorization code + state to:
   `nosmo-nexus-workmode://auth-result`.
6. APK validates its own state and POSTs code/verifier/state/nonce to the existing `/api/mobile-auth/token-exchange`.
7. Token exchange accepts only the exact HTTPS `/api/callback` redirect URI.
8. The resulting Nexus session ID is encrypted locally with Android Keystore AES/GCM and used only as `Authorization: Bearer <sid>`.

The session ID is never placed in a deep link or browser URL.

Server-confirmed logout:

`POST /api/mobile-auth/logout`

The APK deletes its encrypted local session only after server success, or when the server reports the session is already invalid. Network/5xx failure retains the local ciphertext so the UI cannot falsely claim logout.

Current documentation debt: `/api/mobile-auth/start` has not yet been reconciled into `lib/api-spec/openapi.yaml`; runtime code and validator exist, but OpenAPI/codegen remains a follow-up.

## Raw PHOTO/DOCUMENT evidence lifecycle

Evidence state is separate from metadata state:

- `PENDING_CANONICAL_CLOUD_ENDPOINT`;
- `READY_FOR_AUTHORISED_TRANSFER`;
- `FAILED_RETRYABLE`;
- `TRANSFER_CONFIRMED`;
- `NOT_APPLICABLE` for non-binary sources.

A metadata callback can never set `TRANSFER_CONFIRMED`.

On successful PHOTO/DOCUMENT metadata receipt, Android stores exact receipt-derived `projectId + worldId` in an app-private `EvidenceBindingStore`, keyed by candidate ID. This sidecar exists because MainActivity may rewrite its presentation queue; mutable queue/global Project World state must never retarget already-confirmed evidence bytes.

Cloud Evidence consumes this sidecar and fails closed if it is absent. Legacy queue binding fields may be migrated once when still present. Orphaned sidecar records are pruned when their local candidate no longer exists.

Local URI access remains device-local and is retained after metadata handoff. Explicit local candidate removal releases only the exact persisted picker grant when no other candidate uses it. It never deletes Nexus/Cloud/WorkSuite/Person/Timeline/Graph data.

## Canonical Nexus Cloud client

Parallel Cloud work has now exposed PR #125:

`Add authenticated Nexus Cloud upload pipeline to Google Drive`

Canonical endpoint contract:

`POST /api/nexus/cloud/files`

Required client inputs:

- multipart `file`;
- exact canonical `projectId`;
- exact canonical `worldId`;
- `Idempotency-Key`.

#96 consumes this contract only. It does not copy the Drive writer, provider mappings, OAuth secrets or Cloud persistence implementation.

Native Cloud upload properties:

- explicit Bearer Nexus session;
- `content://` source only;
- max 25 MiB, checked before/while streaming;
- stable candidate key: `android-evidence-<candidateId>`;
- receipt-bound Project World from `EvidenceBindingStore`;
- no Drive folder ID/provider account/credential in APK;
- `403` remains denied;
- auth expiry clears the local encrypted session and leaves evidence retryable;
- provider/DB failure remains `FAILED_RETRYABLE` with the same idempotency key.

Android marks `TRANSFER_CONFIRMED` only when the server returns all of:

- HTTP 200/201;
- `providerWriteConfirmed=true`;
- `projectMemoryCommitted=true`;
- non-empty canonical `fileId`;
- non-empty `driveFileId`.

A provider write followed by persistence failure is never reported as a canonical success.

Important: PR #125 is still open/not deployed and still requires real runtime DB, Google OAuth secret, released provider mapping and production concurrency hardening. Therefore this Android code is a canonical client implementation, not a real Google Drive E2E PASS.

## Durable Cloud Evidence access

After the first confirmed PHOTO/DOCUMENT metadata receipt Android publishes a dynamic launcher shortcut:

`Cloud Evidence`

It appears under the existing NEXUS app icon (launcher long-press); it is not a second launcher icon/application.

The shortcut targets a parameter-free trampoline. It accepts no project/candidate/session authority and only opens the non-exported `CloudEvidenceActivity`, which re-reads app-private state and re-authorises every server action.

## Ask Nexus / WorkSuite truth

Current Ask Nexus execution remains intentionally bounded:

- `modelExecution=disabled-demo-boundary`;
- deterministic metadata-only assistance;
- `NOT_RUN_NO_RAW_CONTENT_TRANSFERRED` for content recognition;
- no Project Memory mutation;
- no autonomous action execution.

WorkSuite remains draft-only:

- `mutationMode=draft-only-no-mutation`;
- `executionBoundary=worksuite-action-engine-required`;
- no graph mutation;
- no file write;
- no approval execution.

Production/content-specific AI is still a later gate after real authorised evidence persistence.

## Validation

Static/executable guards configured in `.github/workflows/android-native-work-mode-e2e.yml` now cover:

- workspace typecheck;
- executable canonical authority fixtures;
- Android picker/storage security;
- exact Project World isolation;
- one-flight metadata receipt correlation/recovery;
- local candidate / persisted URI grant cleanup;
- PKCE S256 native auth start/callback;
- exact mobile redirect URI restriction;
- Android Keystore AES/GCM session storage;
- no session token in deep links;
- server-confirmed Bearer logout;
- canonical `/api/nexus/cloud/files` only;
- stable idempotency key;
- 25 MiB bound;
- provider + Project Memory success requirement;
- receipt-bound evidence sidecar;
- orphan binding pruning;
- no Drive/OAuth implementation in APK;
- durable parameter-free Cloud Evidence shortcut;
- Java 17 / Gradle 8.9 / AGP 8.7.3;
- compileSdk/targetSdk 35, minSdk 26;
- debug APK + release AAB when a runner actually starts.

Latest observed Android workflow run #150 still failed before the first runner step: job exists but `steps=null` and no usable log.

Classification remains:

`BLOCKED BY ACTIONS INFRA`

This is not a TypeScript/Java/Gradle failure signal.

Not claimed:

- `GITHUB ACTIONS PASS`;
- full local workspace/Gradle build pass;
- APK artifact/install pass;
- Fold/device smoke pass;
- live OIDC mobile sign-in pass;
- live BOUND Person/access DB smoke;
- real Google Drive upload/Project Memory commit;
- production AI/content recognition.

## Database safety

No safe non-production `DATABASE_URL` for this `nosmo-nexus-mvp` runtime has been identified.

PR #112 explicitly records that the existing `nosmo-nexus-data-fetcher` Replit DB is unrelated and must remain unused.

Therefore this track has not:

- run `drizzle-kit push`;
- inserted authority records;
- enabled a live BOUND Person smoke;
- claimed persisted e-SAFE allow/deny E2E.

## Remaining real E2E gates

1. reconcile `/api/mobile-auth/start` into the canonical OpenAPI/API contract;
2. obtain an actual Android build artifact once Actions/another safe build environment is available;
3. identify a safe non-production runtime DB and inspect/apply only the shared identity/access/Cloud schemas there;
4. seed one controlled canonical Person + e-SAFE participation + exact allows for Android handoff, WorkSuite review and Cloud write;
5. configure #125 runtime Google OAuth + exact server target mapping in non-production;
6. run real Android PKCE sign-in -> BOUND Person smoke;
7. run PHOTO/PDF metadata handoff -> Bearer Cloud upload -> real `driveFileId` + `projectMemoryCommitted=true` -> Android `TRANSFER_CONFIRMED`;
8. test retry after forced provider-written/DB-failed state with the same idempotency key;
9. install on device/Samsung Fold and smoke permissions, picker, auth callback, upload, return/resume and orientation/fold behavior;
10. only after durable authorised evidence passes, add content-specific Ask Nexus processing.

Do not auto-merge, deploy or apply database schema from this track.
