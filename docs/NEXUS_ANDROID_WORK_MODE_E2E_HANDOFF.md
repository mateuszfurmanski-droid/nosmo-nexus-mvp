# NOSMO Nexus — Android Work Mode E2E handoff

Status: active Android integration track stacked on PR #90 foundation.

Branch: `codex/android-work-mode-e2e-handoff`

Draft PR: #96.

Protected: PR #91 is untouched and must remain untouched.

## Donor reconciliation

- PR #27: historical first Android discovery donor; do not restore Expo/EAS as the canonical line.
- PR #41: native Java / Personal Cloud donor. Its PR body is stale versus the current live head and its historical whole-phone/full-file direction is not canonical for this privacy-first integration.
- PR #44: native Java Work Mode base donor.
- PR #85: latest safe installable Work Mode / Knowledge Vacuum UI donor and the visual/native starting point.
- PR #50: donor for the historical Android -> Nexus Work Mode AI receiver and deterministic server boundary.
- PR #78: donor for the historical WorkSuite draft permission resolver.
- PR #79: donor for historical permission-decision UI behavior.

Do not bulk-merge these stacks. Reconcile only the required contracts and runtime slices onto current #90.

## Canonical architecture

`Android Work Mode` is a native field-intake client for Nexus, not a second Nexus backend and not an identity provider.

Target flow:

`permitted local source -> local candidate -> user review -> exact Project World -> bounded Nexus handoff -> existing server session/auth -> exact canonical Person binding -> Project Participation/access resolver -> Ask Nexus assistance -> WorkSuite draft -> permission resolver -> human review`

Android never self-grants project access and never executes WorkSuite mutations.

## Current implementation

### Native intake

- pure Android Java under `native/nexus-work-mode-native`;
- Android Photo Picker on API 33+ with `ACTION_OPEN_DOCUMENT` fallback;
- `ACTION_OPEN_DOCUMENT` for a document;
- `ACTION_OPEN_DOCUMENT_TREE` for an explicitly authorised folder;
- Contacts and Calendar only after Android runtime permission;
- no Accessibility Service;
- no broad storage permission;
- no WhatsApp/Gmail/Teams private database reads;
- no WebView;
- no cleartext traffic;
- no auth token storage/logging.

### Knowledge Vacuum candidate

Each device-local candidate carries:

- stable local candidate ID;
- source;
- content type;
- local URI/reference;
- timestamp;
- confidence;
- approval state;
- handoff state.

Candidates are selected by default for review and can be deselected by the user. A rejected candidate is not included in the handoff.

The local URI/reference is device-local state. It is not a canonical Nexus identity and is not sent in the browser handoff URL.

### Project World isolation

Current #90 canonical fixture pair:

- `projectId=project-esafe-catania`
- `worldId=world-esafe-catania`

Riverside is intentionally **not** mapped to the e-SAFE fixture or to historical aliases. Until a current canonical Riverside pair is supplied by Nexus Project Memory, Android uses:

`NEEDS_USER_CONFIRMATION`

and blocks handoff.

### Android -> Nexus envelope

Historical compatibility markers remain:

- `nexusIntent=ask-nexus`
- `nexusAiContext=android-work-discovery-v1`

Canonical extended envelope marker:

`nexus-android-work-mode-context-v1`

The envelope carries:

- exact `projectId + worldId`;
- `projectResolution=EXACT`;
- selected opaque item IDs;
- source types;
- optional approved metadata in authenticated API transport;
- user intent;
- `PENDING_SERVER_CONFIRMATION`.

Raw file/photo content and local URI values are deliberately absent from the URL handoff.

Shared TypeScript contract:

`src/core/android/androidWorkModeContract.ts`

### Explicit Nexus web origin

The APK does not guess a production Nexus host.

`native/nexus-work-mode-native/app/build.gradle` reads:

`NEXUS_ANDROID_WEB_ORIGIN`

and exposes it as `BuildConfig.NEXUS_WEB_ORIGIN`.

The origin must be HTTPS. If it is absent or invalid, `Approve + Send to Nexus` fails closed instead of using a hard-coded preview host.

Canonical bootstrap path:

`/api/nexus/android-work-mode/handoff`

No session token, provider subject or Person ID is placed in the URL.

## Existing auth / Person boundary

The current API server already has OIDC/session and mobile token-exchange runtime.

This track reuses that runtime. It does not create Android identity.

Current #90 Phase 14 deliberately stops before the exact runtime binding:

`provider subject -> canonical Nexus Person ID`

Therefore the Android Work Mode server boundary treats a valid existing session as:

`authenticated + UNBOUND`

until a server-owned exact IdentityBinding exists.

It never treats `req.user.id` / provider subject as canonical `personId`.

This is a real blocker, not a demo substitution.

## Authenticated server handoff

Implemented on #96:

### `GET /api/nexus/android-work-mode/handoff`

- validates the bounded Android query packet;
- accepts only the current exact e-SAFE project/world pair in this foundation slice;
- rejects unresolved/mixed Project Worlds;
- unauthenticated browser users are redirected through the existing `/api/login` OIDC flow;
- after authentication, returns an isolated no-store bootstrap page;
- bootstrap POSTs the bounded context same-origin to the Work Mode AI boundary;
- raw local URI/content and auth token remain absent from the browser URL.

### `GET /api/nexus/work-mode-ai/status`

Truthfully reports:

- `modelExecution=disabled-demo-boundary`;
- no Project Memory mutation;
- no WorkSuite execution;
- content recognition requires a separately authorised evidence-content path.

### `POST /api/nexus/work-mode-ai/context`

- requires the existing Nexus server session;
- validates exact project/world and Android handoff schema;
- derives authentication from server session only;
- currently resolves authenticated legacy session identity as `UNBOUND` because the canonical Person binding runtime is not yet reconciled;
- returns deterministic metadata-only assistance;
- does **not** claim photo/PDF content recognition because raw content was not transferred;
- creates a WorkSuite draft-only envelope;
- performs no Project Memory mutation or Action Engine execution.

Current deterministic classifications are evidence/context candidate labels such as:

- `PHOTO_EVIDENCE_CANDIDATE`;
- `DOCUMENT_CONTEXT_CANDIDATE`;
- `FOLDER_CONTEXT_CANDIDATE`.

They are suggestions based on approved source metadata, not source-of-truth content interpretation.

## WorkSuite draft boundary

Implemented routes:

- `GET /api/nexus/worksuite/draft-actions/status`
- `POST /api/nexus/worksuite/draft-actions/validate`

Draft invariants:

- `mutationMode=draft-only-no-mutation`;
- `executionBoundary=worksuite-action-engine-required`;
- WorkSuite Action Engine approval remains mandatory;
- exact project/world is preserved;
- no graph mutation;
- no file write;
- no approval execution.

The resolver does **not** accept a client-supplied actor authority object as source of truth. Identity is derived from the server session.

Current decision ceiling:

- unauthenticated -> `blocked`;
- authenticated but canonical Person unbound -> `blocked / IDENTITY_UNBOUND`;
- future BOUND Person without canonical access decision -> `needs-review / CANONICAL_ACCESS_DECISION_REQUIRED`;
- `ready-for-approval` must not be returned until the #90 canonical Project Participation + explicit permission/access resolver runtime is reconciled.

## Offline truthfulness

Local queue states are distinct from server confirmation.

The APK can persist candidates and mark approved items:

`PENDING_SERVER_CONFIRMATION`

Opening the browser does **not** mark an item uploaded, synced or fully handed off.

The current bootstrap/API response can prove that Nexus received the metadata packet, but raw evidence binary transfer is not implemented in this slice. A later authenticated evidence transfer/Cloud contract must update local state only after server confirmation.

## Build / APK state

Workflow:

`.github/workflows/android-native-work-mode-e2e.yml`

Configured build:

- Java 17;
- Gradle 8.9;
- Android Gradle Plugin 8.7.3;
- compileSdk 35;
- targetSdk 35;
- minSdk 26;
- debug APK + release AAB;
- manifest/permission/picker/handoff/server-boundary guardrail checks.

The latest observed GitHub Actions Android job failed before its first runner step with no job steps and no retrievable log blob. That is:

`BLOCKED BY ACTIONS INFRA`

not a Gradle/Android build failure.

The local tool runtime has Java but no Android SDK/Gradle installation, so no `LOCAL BUILD PASS` is claimed.

No APK install/device smoke pass is claimed.

Use only these status labels:

- `LOCAL BUILD PASS`
- `GITHUB ACTIONS PASS`
- `APK INSTALL PASS`
- `DEVICE SMOKE PASS`
- `BLOCKED BY ACTIONS INFRA`
- `PENDING`

## Remaining blockers to the requested full E2E

1. Reconcile exact server-owned OIDC/provider-subject -> canonical Person binding from the historical auth donor stack into current #90 semantics.
2. Reconcile runtime Project Participation + explicit grant/deny/access decision adapter into the #90 canonical resolver; active participation alone must never grant access.
3. After BOUND Person + canonical allow exists, allow the WorkSuite resolver to reach `ready-for-approval` without execution.
4. Define/reuse the authorised binary evidence transfer contract so an approved photo/PDF can be read server-side without leaking device-local URI and without duplicating Nexus Cloud.
5. Return explicit server acknowledgement to the Android queue before changing an item from pending to handed-off/synced.
6. Run an actual Android build and produce APK/AAB.
7. Install on Android and perform the specified picker/auth/return-resume smoke; Samsung Fold smoke remains device-dependent.

## Next controlled slice

The next architecture-critical slice is **runtime canonical Person binding + canonical access decision adapter**, not more Android UI. Until that exists, fail closed at `IDENTITY_UNBOUND` and keep all WorkSuite output draft-only.
