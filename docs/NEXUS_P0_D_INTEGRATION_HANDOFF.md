# D — canonical P0 integration

OWNER: JOANNA / GPT PRO. One candidate, one PR: #189. No auto-merge, remote DB mutation or deployment performed. The exact verified head and CI runs are recorded in the PR, avoiding a self-referential SHA inside its own commit.

## Lineage and bounded audit

Audit cutoff: 2026-09-13 22:04 UTC. Base branch `codex/esafe-work-package-semantic-drop-core-c2`; exact base `f667469ac371454fd226aa5500d683e34459a794`. A `20d8293a69eacfbd448585291e74e916051af170`; B2 `bfdb67d2a511747d613f8ddec2ff439619ae8844`. B2 #187 and C2 #188 heads were unchanged at audit and before D publication. No newer accepted D candidate or post-#188 product PR existed. Mateusz's Android #183 continues #181; Agency excluded.

Architecture main: `4f7548a6f1f32ab177277cecb4b0796f8b2ccfe6`. ADDON_056 and semantic ADDON_059 apply. The latter is the full path `docs/ADDON_059_Semantic_Drag_and_Drop_Workspace_Work_Package_Composition_and_Role_Adaptive_Interaction.md` at architecture PR #24 `221eb98609a9ad4b3b0a5375d44bf38be80006bd`. Main's different Android ADDON_059 is not a semantic supersession. New accepted Agency, Worker import and Emergency additions do not change the frozen contracts.

## Duplication and donor inventory

| Surface | Classification / source | D change |
|---|---|---|
| Person / Participation / grants / decisions | CANONICAL A and frozen B2 | Durable mapping to frozen repository interfaces; no HTTP resolver |
| ModuleEntitlement / competence | CANONICAL B2 snapshots | 0005 provides missing durable storage for those exact projections |
| Work Package / assignment / checklist / receipts | CANONICAL C2 | Hydration-only optional constructor state; existing persistence receives the enclosing transaction |
| Task / Evidence / Approval / Timeline | CANONICAL A | Existing persistence receives enclosing transaction |
| Relationship edges | CANONICAL C2 consequences | Retained in existing semantic receipt `effectSummaryJson`; no new graph table |
| Runtime / identity / browser transport | DONOR #177 `efb9865b4a644c93d3eb48ee860aff4d66974893` | Selective staging entrypoint/build, CORS, device login, identity claim, mobile bootstrap, 0003 |
| Manager components | DONOR same #177 | Source palette, approval panel, floating windows, login, semantic adapter; data/HTTP wiring only |
| Relationship Tree | Existing renderer + DONOR input props | Inject authoritative data/status, add node IDs for existing drag adapter, suppress session demo mutation callbacks in injected mode; layout/gestures untouched |
| Android | DONOR contract #183 `aca7ce098ecb0f4e7087642fcd7c05c8e394e10d` | Existing Worker Home response shape, Start/Evidence/Finish. No native source changes |
| Android recents | Accepted #181 `8de4ff5d706cd7992fc6025ae23c7ccff501600e` | Preserved in external donor lineage; no lifecycle changes |
| Old authority and Task JSON package | SUPERSEDED donor semantics | Not imported |
| HTTP/migration fixtures | SYNTHETIC E2E | Two synthetic identities, explicit grants and entitlement; all work records created over real HTTP |

#177 validated checkpoint was `bcae8988675304d5e7eca6d719a967144317ce3f`; current-head skipped checks were not treated as validation. Android #178 base `af988a870e7dfa8c0e6b2f15db8c8149a2b3871a` is a contract donor, not D's git base. Native APK/AAB for D: NOT RUN, because native code was not changed; physical acceptance must record the installed donor APK SHA.

Changed files: GitHub PR Files changed is authoritative; `git diff --name-status f667469ac371454fd226aa5500d683e34459a794 HEAD` reproduces the inventory. No #91, Person Card, Object Card, DoorFlow, Electrical, Work Wallet, Agency or production infrastructure changes.

## Runtime and API

All paths start `/api/nexus/core`. GET query / mutation bodies carry business `projectId` and `worldId`; only the released canonical e-SAFE scope is accepted. Opaque bearer or authenticated same-origin session -> exact provider binding -> Person -> one storage workspace -> frozen B2. Client actor IDs and requested timestamps cannot establish authority. Scope/action/owner/approval/target requirements and companion effects are server-built.

| Operation | API |
|---|---|
| Person, own inbox, assigned snapshot, Task | GET `person`, `work-inbox`, `assignments/:id`, `tasks/:id` |
| Compose / read / revise | POST `work-packages`, GET/PATCH `work-packages/:id` |
| Add / remove / group / order | POST `work-packages/:id/items`, DELETE `work-packages/:id/items/:itemId`, PUT `work-packages/:id/ordering`; PATCH supports groups/context/deadline |
| Semantic drop | POST `semantic-drop/validate` -> signed token -> POST `semantic-drop/commit`; compatibility POST `semantic-drop` performs both server-side |
| Worker | POST `tasks/:id/start`, `checklist`, `evidence`, `finish`; GET `tasks/:id/approval-state` |
| Approver | GET `approval-queue`, `approvals/:id/evidence`; POST `approvals/:id/decision` (`approved` or `rejected` + reason) |
| Projection / Memory | GET `projection`, `manager-projection`, `timeline`, `project-memory` |

All five C2 intents remain canonical. Package composition is persisted before assignment. Assignment preserves its `snapshot.packageRevision`; Task JSON never stores a Work Package. Android's legacy `task.workPackage` exists only in the response, derived from that snapshot. Boolean Finish IDs become authorized ChecklistRun responses; other response types require the checklist endpoint.

Mutations serialize P0 writes with PostgreSQL locks over existing authority/session tables, recheck frozen B2 with server time, and commit A/C2 effects in that transaction. This deliberately favors correctness over throughput for bounded P0. A/C2 nested transactions are savepoints. Same actor/scope/request key and identical business intent replay existing canonical receipts/events; changed semantics conflict. A denied or unavailable authority store cannot mutate domain rows. Read retries reauthorize current access.

Canonical ModuleEntitlement/competence must be provisioned from the existing authority source. D does not infer eligibility from job title, Person name or UI role. Exact object/task grants and AccessDecisions are required. Companion capability is created by C2; it does not silently create an AccessDecision or bypass a deny. A companion grant alone is not proof of current usable access.

## Migration chain and test matrix

| Version | Role | Byte preservation |
|---|---|---|
| 0000 | PR90 parent baseline from A | unchanged |
| 0001 | canonical identity/access from A | unchanged |
| 0002 | canonical work cycle from A | unchanged |
| 0003 | #177 one-time identity claims | exact donor bytes |
| 0004 | C2 first-class Work Package / semantic drop | unchanged |
| 0005 | B2 entitlement and competence durable projections | additive; no destructive operation |

C2-only prior installations have 0000/1/2/4; the migrator applies missing independent 0003 and then 0005 without renumbering or replacing 0004. Recorded checksums protect prior files.

| Gate | Evidence owner |
|---|---|
| Full repository typecheck / web build / existing runtime smoke | exact-head Validate and Build |
| A core, B2 68-case authority and C2 contract smokes | same workflow + dedicated P0 workflow |
| C2 real PostgreSQL concurrent retry / rollback | NEXUS Work Package Database E2E |
| Clean/A-B2/C2 upgrade, replay, checksum mismatch, failed migration rollback | `lib/db/scripts/nexusP0MigrationE2e.ts`, dedicated PostgreSQL 16 service |
| Two-session authenticated full cycle / semantics / negative authority / retry / projections | `artifacts/api-server/scripts/validate-nexus-p0-http-e2e.ts`, bundled like runtime, real loopback HTTP + PostgreSQL |
| Remote migration refusal | migration E2E; production refusal remains migrator invariant |
| Actual binary transfer / provider persistence | NOT RUN; no second upload pipeline introduced |
| Native APK/AAB build on D | NOT RUN; installed donor build must be identified for physical acceptance |
| Two real people on devices | NOT RUN |
| Remote DEV / production deploy or migration | NOT RUN |

Do not infer PASS from file presence, a successful build, a skipped job, metadata evidence or Vercel status. The PR records PASS/FAIL/SKIPPED/NOT RUN and exact run links after completion.

## DEV readiness gate — no mutation authorization

| Required field | Current state |
|---|---|
| DEV TARGET CANDIDATE | Existing isolated non-production e-SAFE Core staging runtime; D narrow entrypoint prepared |
| DEV PROJECT / BRANCH / DB | Project and DB binding not verified in this session; product branch `codex/esafe-p0-final-integration-d` |
| TARGET FINGERPRINT | NOT VERIFIED; must record deployment project ID, branch, database hostname/name and server identity without credentials |
| CURRENT MIGRATION VERSION | Remote NOT READ; disposable 0005 chain checked in CI |
| SCHEMA DIFF | Compared with A: add 0003/4/5; C2-only: add 0003/5; actual DEV inventory determines pending set |
| PENDING MIGRATIONS | Conditional on verified remote inventory; never assume max(version) implies all migrations exist |
| ROLLBACK / RECOVERY | Before authorized migration: snapshot/PITR and inventory/checksums. Each migration transactional. Roll runtime back to prior release; retain additive tables. Do not drop canonical data. Restore snapshot only by separate approved recovery plan |
| SECRETS REQUIRED | DEV-only DATABASE_URL; random server `NEXUS_P0_VALIDATION_SECRET` >=32 chars; existing OIDC config or privately issued one-time expiring claims; existing provider credentials only for photo transfer |
| REAL USERS REQUIRED | Joanna and Mateusz each bound to their real canonical Person, same project/world/workspace; explicit Participation/grants/decisions/entitlement and any competence records |
| SAFE TO MIGRATE DEV | NO — target fingerprint/inventory and later explicit orchestrator approval are missing |
| READY_FOR_DEV | NO until those gates are supplied and verified |

Do not run migration remotely in this stage. A later operator first verifies a non-production target and compares ordered migration/checksum inventory and schema to this candidate. Only after separate approval may the existing migration command be used; `NEXUS_DEV_MIGRATION_APPROVAL` is the existing explicit gate, never set by D here.

Runtime requires `NEXUS_ENV=development` and refuses `VERCEL_ENV=production`. Build: `node artifacts/api-server/build-vercel-core-staging.mjs`. For local server use `node artifacts/api-server/build-vercel-core-staging.mjs --server` then `node artifacts/api-server/dist/core-staging-server.mjs` or the existing approved host wrapper around the default Express export. Manager path `/esafe-core`; same-origin API preferred. An approved cross-origin release uses build-time `VITE_NEXUS_CORE_API_ORIGIN` (HTTPS origin only) and server's exact released origins; bearer transport, no cross-origin cookies. No URL, credentials, claim codes or Person IDs are hardcoded into the client.

## Physical three-screen runbook — NOT RUN

Prerequisites: verified isolated DEV target; approved migrations and runtime publication; identify web SHA, runtime SHA and installed accepted Android APK SHA/checksum (including #181 recents). Provision real separate Persons and required explicit authority. Work Package creation does not self-grant manager edit/assignment or worker task permissions: the authority owner must provision exact package/task scopes before the relevant action. Missing scope is a visible 403 and is a provisioning blocker, never an excuse to relax B2.

1. **Joanna laptop:** open `/esafe-core`, authenticate with her privately issued one-time claim or existing login. Refresh authoritative projection; verify e-SAFE Catania and real Persons. Drag Task into the existing package tray and enter its title; wait for persisted revision. Add Checklist (semicolon-separated Boolean entries) and Evidence Requirement (`inspection-answer` for metadata acceptance). Click package heading to set title/deadline/Object/Location from existing scoped records. Item labels edit title/order/group; remove controls save a new revision. Capture canonical package/task IDs for exact authority provisioning. Drag the persisted Work Package onto Mateusz after required scope grants/decisions exist. Confirm server COMMITTED receipt, ASSIGNED state, recipient and immutable assigned revision. Record IDs, not credentials.
2. **Mateusz Android:** open existing NEXUS Worker Home; activate his own encrypted opaque staging session using protected accepted transport. Open Work Inbox and assigned package; compare IDs/revision/title/checklist/deadline/context. Start. Perform checklist, submit actual answers (current native Finish supports Boolean completion IDs). Add inspection evidence; submit Finish. Confirm requested human approval / ready-for-review. Repeat a captured request with the same key through the acceptance harness: no duplicate.
3. **Joanna laptop (or existing compatible Android approver surface):** open Human Approval, Refresh; inspect Evidence through the dedicated protected API. Verify actual evidence before selecting Approve. Reject requires a reason and must return work for correction. Approve the completed case; refresh projection and Timeline.
4. **Backend acceptance:** compare canonical IDs; Task `done`, Evidence `reviewed`, Approval `approved`; C2 assigned snapshot and assignedPackageRevision retained; assignment completed; events/Timeline/Memory durable after runtime restart; no duplicate on retries; no mutation under explicit deny; refreshed Tree/Person/Object consequences.

Photo acceptance is a separate physical gate. Reuse accepted Android shared Cloud pending-asset/provider pipeline (#178/#183 and predecessor #96 contract); D accepts a photo only with a scoped existing canonical File and provider commit receipt. It does not transfer the binary. Concrete blocker: the approved DEV Android Cloud transfer/provider receipt path has not been connected and exercised on the identified real device/target. A photo label or inspection-answer is not photo PASS.

Record date, both human testers, all three screen captures, app/runtime/web SHAs, canonical record IDs and test result. Redact tokens, claim codes, raw provider subjects and credentials. Until both people execute this on actual devices, status remains PHYSICAL_E2E_NOT_RUN.
