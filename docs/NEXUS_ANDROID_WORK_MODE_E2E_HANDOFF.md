# NOSMO Nexus — Android Work Mode E2E handoff

Status: active Android integration track stacked on PR #90 foundation.

Branch: `codex/android-work-mode-e2e-handoff`

Draft PR: #96.

Protected: PR #91 is untouched and must remain untouched.

## Donor reconciliation

- PR #27: historical first Android discovery donor; Expo/EAS is not restored as the canonical line.
- PR #41: native Java / Personal Cloud donor; historical whole-phone/full-file direction is not canonical.
- PR #44: native Java Work Mode base donor.
- PR #85: latest safe installable Work Mode / Knowledge Vacuum UI donor.
- PR #50: donor for deterministic Android -> Nexus Work Mode AI boundary.
- PR #55: donor for exact provider-subject -> canonical Person binding persistence.
- PR #56: participation persistence donor only; its historical active-participation shared-access policy is explicitly rejected.
- PR #78/#79: WorkSuite draft permission/inbox donors.

Do not bulk-merge donor stacks. Current #90 semantics remain authoritative.

## Canonical architecture

`Android Work Mode` is a native field-intake client for Nexus, not a second Nexus backend and not an identity provider.

Target flow:

`permitted local source -> local candidate -> user review -> exact Project World -> bounded Nexus handoff -> existing Nexus auth/session -> exact Person binding -> exact Project Participation -> explicit grant/deny decision -> Ask Nexus assistance -> WorkSuite draft -> separate WorkSuite review permission -> human review`

Android never self-grants project access and never executes WorkSuite mutations.

## Native intake / Knowledge Vacuum

Implemented under `native/nexus-work-mode-native`:

- native Java Android client;
- Android Photo Picker on API 33+ with system document fallback;
- `ACTION_OPEN_DOCUMENT` document picker;
- `ACTION_OPEN_DOCUMENT_TREE` folder picker;
- Contacts and Calendar only after Android runtime permission;
- user-visible candidate review queue selected by default but deselectable;
- candidate source, content type, device-local reference, timestamp, confidence, approval state and handoff state;
- no Accessibility Service;
- no broad storage permission;
- no WhatsApp/Gmail/Teams private database reads;
- no WebView;
- no cleartext traffic;
- no Android auth token logging/storage.

Device-local URI/reference is never a Nexus canonical identity and is not placed in the browser handoff URL.

## Project World isolation

Current #90 fixture pair:

- `projectId=project-esafe-catania`
- `worldId=world-esafe-catania`

Riverside remains `NEEDS_USER_CONFIRMATION` until Nexus Project Memory supplies a current canonical pair. Historical Riverside aliases are not reused and e-SAFE/Riverside are never mixed.

## Android -> Nexus envelope

Compatibility markers retained:

- `nexusIntent=ask-nexus`
- `nexusAiContext=android-work-discovery-v1`

Canonical extended envelope:

`nexus-android-work-mode-context-v1`

It carries exact project/world, approved opaque item IDs, source types, user intent and `PENDING_SERVER_CONFIRMATION`. Raw photo/PDF bytes, local URI, provider subject, Person ID, role, Project Participation and permission grants are not sent as Android authority.

Shared contract:

`src/core/android/androidWorkModeContract.ts`

## Explicit Nexus origin

The APK reads build-time `NEXUS_ANDROID_WEB_ORIGIN` through `BuildConfig.NEXUS_WEB_ORIGIN`.

Only HTTPS is accepted. Missing/invalid origin fails closed; no legacy preview URL is guessed.

Bootstrap path:

`GET /api/nexus/android-work-mode/handoff`

No session token is placed in the URL.

## Existing Nexus auth reused

The server reuses the existing OIDC/session and mobile-token runtime. No Android identity system was added.

The browser bootstrap redirects unauthenticated users through the existing `/api/login` flow. Work Mode POSTs accept either the existing same-origin HttpOnly browser session or existing Bearer session transport.

A valid provider session is still not a canonical Nexus Person.

## Canonical runtime authority adapter

Prepared on #96:

- `lib/db/src/schema/nexusRuntimeAuthority.ts`
- `artifacts/api-server/src/lib/nexus-runtime-authority.ts`

Persistence adapter tables:

- `nexus_persons`;
- `nexus_identity_bindings`;
- `nexus_project_participations`;
- `nexus_permission_grants`.

Semantics:

`exact provider + providerSubject -> exact canonical personId`

then:

`personId + exact projectId + exact worldId -> one active participation -> matching explicit grant/deny`

Rules:

- provider subject is never promoted to Person ID;
- no email/name fuzzy binding;
- active participation alone never grants access;
- matching explicit deny wins;
- a matching explicit allow is mandatory;
- ambiguous active bindings/participations fail closed;
- disabled/unavailable authority stores fail closed;
- after explicit allow, current runtime ceiling is still `requires-review` because the full #90 ModuleEntitlement/competence gate runtime is not yet reconciled.

The schema has **not** been pushed to any database in this track.

## Safe development/staging bootstrap

Prepared but **not executed**:

`pnpm --filter @workspace/db bootstrap-nexus-android-authority`

Script:

`lib/db/scripts/bootstrap-nexus-android-work-mode-authority.mjs`

It requires all of the following:

- non-production `NODE_ENV`;
- explicit `NEXUS_DEV_ANDROID_AUTHORITY_BOOTSTRAP=true`;
- explicit `DATABASE_URL`;
- exact `NEXUS_DEV_PERSON_ID`;
- exact `NEXUS_DEV_PROVIDER_SUBJECT`.

It targets only the current e-SAFE project/world and prepares two exact development/staging allows:

- `android.work-mode.handoff`;
- `worksuite.draft.review`.

It refuses to override a matching explicit deny and does not print the provider subject.

Do not run this command until the exact disposable/staging database is identified and the schema diff is reviewed.

## Ask Nexus boundary

Routes:

- `GET /api/nexus/work-mode-ai/status`;
- `POST /api/nexus/work-mode-ai/context`.

Current AI behavior remains truthful:

- `modelExecution=disabled-demo-boundary`;
- no production model execution;
- no raw photo/PDF recognition;
- metadata-only candidate interpretation such as `PHOTO_EVIDENCE_CANDIDATE` or `DOCUMENT_CONTEXT_CANDIDATE`;
- no Project Memory mutation.

The context endpoint now performs **two distinct authority decisions**:

1. `android.work-mode.handoff` — permission to accept the bounded Android context for the exact Project World;
2. `worksuite.draft.review` — separate permission decision for the generated WorkSuite draft.

The WorkSuite decision is no longer inferred from the Android handoff permission.

If the first decision fails, the context handoff is blocked. If the first succeeds, Nexus may accept the metadata context and create a draft even when the separate WorkSuite review decision remains blocked.

## WorkSuite draft boundary

Routes:

- `GET /api/nexus/worksuite/draft-actions/status`;
- `POST /api/nexus/worksuite/draft-actions/validate`.

Draft invariants:

- `mutationMode=draft-only-no-mutation`;
- `executionBoundary=worksuite-action-engine-required`;
- exact project/world retained;
- server-session identity only;
- separate `worksuite.draft.review` access evaluation;
- no graph mutation;
- no file write;
- no approval execution;
- no Action Engine execution.

Current resolver ceiling:

- unauthenticated -> `blocked`;
- authenticated but unbound -> `blocked / IDENTITY_UNBOUND`;
- BOUND Person without active participation -> `blocked`;
- participation without explicit allow -> `blocked / NO_EXPLICIT_ALLOW`;
- matching explicit deny -> `blocked / EXPLICIT_DENY`;
- exact BOUND Person + active participation + explicit allow -> `needs-review / MODULE_ENTITLEMENT_RUNTIME_REQUIRED`;
- `ready-for-approval` remains intentionally unreachable until the remaining #90 module/competence policy is reconciled.

## Server acknowledgement -> Android queue

Canonical receipt contract:

`nexus-android-work-mode-handoff-receipt/v1`

The server generates a random correlation receipt after processing a valid authenticated handoff. This receipt is **not** a credential, permission grant or Action Engine approval.

Browser bootstrap exposes an explicit `Return to Work Mode` link using the custom callback:

`nosmo-nexus-workmode://handoff-result`

Native callback receiver:

`HandoffResultActivity`

Security/local-state rules:

- callback can change device-local queue state only;
- successful `HANDED_OFF` requires a 32-character server receipt;
- exact current projectId/worldId must match;
- every callback item must already exist in the local queue as `PENDING_SERVER_CONFIRMATION` or already be in the idempotent target state;
- callback cannot convert arbitrary `LOCAL_ONLY` candidates into handed-off items;
- failure/blocked response becomes `FAILED_RETRYABLE`;
- no receipt grants Nexus server authority.

This closes the previous local queue gap:

`LOCAL_ONLY -> PENDING_SERVER_CONFIRMATION -> HANDED_OFF | FAILED_RETRYABLE`

It still does **not** mean the raw evidence binary was uploaded.

## Evidence bytes / Cloud boundary

Current Android handoff sends approved metadata only.

Therefore Nexus cannot truthfully answer photo/PDF content-specific questions yet. Actual evidence bytes must use the authorised canonical Nexus Cloud/evidence transfer contract from the separate Cloud track. Do not duplicate Drive/provider logic inside the APK.

## Build / APK state

Workflow:

`.github/workflows/android-native-work-mode-e2e.yml`

Configured validation now includes:

- pnpm workspace typecheck;
- Java 17;
- Gradle 8.9;
- Android Gradle Plugin 8.7.3;
- compileSdk 35;
- targetSdk 35;
- minSdk 26;
- debug APK + release AAB;
- manifest/permission/picker/callback checks;
- exact Project World checks;
- runtime authority/schema checks;
- Android handoff vs WorkSuite review permission separation checks;
- dev bootstrap production/deny guardrails.

The latest observed Actions jobs continue to fail before runner steps (`steps=null`) and expose no usable job logs. Classify this as:

`BLOCKED BY ACTIONS INFRA`

not a Gradle/typecheck failure.

Local environment has no Android SDK/Gradle toolchain, so `LOCAL BUILD PASS` is not claimed.

APK install/device smoke remains `PENDING`.

## Remaining blockers

1. Identify a safe disposable/staging `DATABASE_URL` and inspect/apply the authority schema there only.
2. Run real authenticated `UNBOUND -> BOUND` smoke using exact IdentityBinding.
3. Run exact e-SAFE participation/grant cases: no allow, explicit deny, exact allow.
4. Confirm Android context acceptance followed by separate WorkSuite `needs-review` decision.
5. Reuse canonical Cloud/evidence transfer for actual selected photo/PDF bytes.
6. Obtain a real APK/AAB build after Actions or local Android build infrastructure is available.
7. Install on Android and perform picker/auth/browser-return/resume smoke. Samsung Fold validation remains device-dependent.

## Protected boundaries

Still untouched:

- PR #91 Spark SKANSKA demo;
- accepted Object Card design;
- Google Drive/Nexus Cloud implementation track;
- Work Wallet track;
- BIM/IFC/FabStation;
- DoorFlow;
- Electrical Commissioning;
- Relationship Tree gestures/layout;
- Person Card design.
