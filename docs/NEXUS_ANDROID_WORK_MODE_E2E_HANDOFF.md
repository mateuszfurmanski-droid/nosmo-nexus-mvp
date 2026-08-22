# NOSMO Nexus — Android Work Mode E2E handoff

Status: active Android integration track stacked on PR #90 foundation.

Branch: `codex/android-work-mode-e2e-handoff`

Protected: PR #91 is untouched and must remain untouched.

## Donor reconciliation

- PR #27: historical first Android discovery donor; do not restore Expo/EAS as the canonical line.
- PR #41: native Java / Personal Cloud donor. Its PR body is stale versus the current live head and its historical whole-phone/full-file direction is not canonical for this privacy-first integration.
- PR #44: native Java Work Mode base donor.
- PR #85: latest safe installable Work Mode / Knowledge Vacuum UI donor and the visual/native starting point.
- PR #50: historical Android -> Nexus Work Mode AI receiver and deterministic server boundary donor.
- PR #78: historical WorkSuite draft permission resolver donor.
- PR #79: historical permission-decision inbox donor.

Do not bulk-merge these stacks. Reconcile only the required contracts and runtime slices onto current #90.

## Canonical architecture

`Android Work Mode` is a native field-intake client for Nexus, not a second Nexus backend and not an identity provider.

Target flow:

`permitted local source -> local candidate -> user review -> exact Project World -> bounded Nexus handoff -> server session/auth -> canonical Person binding -> Project Participation/access resolver -> Ask Nexus assistance -> WorkSuite draft -> permission resolver -> human review`

Android never self-grants project access and never executes WorkSuite mutations.

## Current slice implemented

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

Candidates are selected for review by the user. A rejected candidate is not included in the handoff.

### Project World isolation

Current #90 canonical fixture pair:

- `projectId=project-esafe-catania`
- `worldId=world-esafe-catania`

Riverside is intentionally **not** mapped to the e-SAFE fixture or to historical aliases. Until a current canonical Riverside pair is supplied by Nexus Project Memory, Android uses:

`NEEDS_USER_CONFIRMATION`

and blocks handoff.

### Android -> Nexus envelope

The historical compatibility markers remain:

- `nexusIntent=ask-nexus`
- `nexusAiContext=android-work-discovery-v1`

The extended canonical envelope is:

`nexus-android-work-mode-context/v1`

It adds exact `projectId + worldId`, approved item references, source/content metadata, user intent and a pending handoff state. Raw file/photo content and local URI values are deliberately absent from the URL/server context envelope.

Shared TypeScript contract:

`src/core/android/androidWorkModeContract.ts`

The server bridges the envelope into the existing #90 `NexusRuntimeIdentityContext`; Android does not send provider subjects, Person IDs, roles or permission grants.

## Offline truthfulness

Local queue states are distinct from server confirmation.

The current slice can store local candidates and mark approved items:

`PENDING_SERVER_CONFIRMATION`

Opening Nexus in a browser does **not** mark an item uploaded, synced or handed off successfully.

A later authenticated server callback/API acknowledgement is required before `HANDED_OFF` may be used.

## AI / WorkSuite boundary

Current #90 does not yet contain the historical PR #50 Work Mode AI runtime nor the PR #78/#79 WorkSuite permission runtime.

Historical #50 was deterministic and explicitly reported model execution disabled. Reconciliation must preserve that claim until a real authenticated server-side model exists.

Required next runtime slice:

1. reconcile #50 receiver/API contract onto #90 without its old project alias authority;
2. derive identity from server session only;
3. require `BOUND` canonical Person;
4. run canonical Project Participation/access decision for exact project/world;
5. produce structured AI/deterministic assistance only from approved context;
6. create a WorkSuite draft-only envelope;
7. reconcile #78 permission resolver to current #90 access contract;
8. expose only `blocked`, `needs-review`, or `ready-for-approval`;
9. never execute Action Engine operations from Android/AI.

## Build status semantics

Workflow:

`.github/workflows/android-native-work-mode-e2e.yml`

Configured build:

- Java 17;
- Gradle 8.9;
- compileSdk 35;
- targetSdk 35;
- minSdk 26;
- debug APK + release AAB;
- manifest/permission/picker/handoff guardrail checks.

Do not report a successful build until an actual runner or equivalent local Android SDK build produces the artifact.

Use only these status labels:

- `LOCAL BUILD PASS`
- `GITHUB ACTIONS PASS`
- `APK INSTALL PASS`
- `DEVICE SMOKE PASS`
- `BLOCKED BY ACTIONS INFRA`
- `PENDING`

## Next slice

Reconcile authenticated Nexus receiver + deterministic Ask Nexus boundary + WorkSuite draft permission validation from #50/#78/#79 onto #90 contracts, without Cloud duplication and without touching PR #91.
