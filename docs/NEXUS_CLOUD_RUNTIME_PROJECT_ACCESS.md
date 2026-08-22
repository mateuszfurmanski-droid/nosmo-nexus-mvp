# NOSMO Nexus — Runtime Project Access Persistence for Cloud

Status: integration slice stacked on PR #110. No database migration has been executed.

## Purpose

Complete the server-owned authorization inputs needed before a Google Drive Cloud write.

Current chain after this slice:

`session -> exact IdentityBinding -> canonical personId -> persisted ProjectParticipation + PermissionGrant -> canonical Cloud access resolver -> NexusAccessDecisionRecord`

The access decision is still separate from provider capability, provider target mapping and the actual Drive write.

## Canonical persistence

New tables:

- `nexus_pm_project_participations`
- `nexus_pm_permission_grants`

These are persistence adapters for the existing #90 canonical records, not a new permission model.

Security-relevant fields are indexed explicitly. The complete canonical source record may also be retained in `recordJson`, but access decisions do not depend on arbitrary JSON interpretation.

Project Participation indexed fields include:

- workspace;
- canonical Person ID;
- exact project ID;
- exact world ID;
- participation status;
- canonical `permissionGrantIds`;
- validity window.

PermissionGrant indexed fields include:

- workspace;
- participation ID;
- allow/deny effect;
- module ID;
- action key;
- object/data scope;
- validity window.

## Exact loader

Export:

`@workspace/db/nexus-project-access-persistence`

`loadNexusProjectAccessRows(...)` loads records only for one exact:

`workspaceId + canonicalPersonId + projectId + worldId`

It deliberately returns inactive/expired records too. Status, validity windows and deny precedence are evaluated by the canonical #90 resolver, not by the database query.

## Canonical access-view correction

`canonicalAccessResolver.ts` now consumes narrow security-relevant views instead of requiring full presentation/audit records.

This reduces the runtime trust surface. The resolver uses only fields required to decide access and does not depend on unrelated `recordJson` content.

## API server authority bridge

New:

`artifacts/api-server/src/lib/nexus-cloud-access-authority.ts`

The bridge:

1. resolves runtime identity through PR #110;
2. refuses to treat an unbound account as a Person;
3. loads exact Project Participation/PermissionGrant rows from the authenticated workspace;
4. validates DB enum/list fields before use;
5. maps only security-relevant columns into the canonical access views;
6. invokes the existing `resolveNexusCloudWriteAccess(...)` policy engine;
7. returns a canonical `NexusAccessDecisionRecord`.

No client-supplied Person, role, participation, permission or provider target is accepted.

## Historical PR #56

PR #56 remains donor material only for persistence ideas.

Its old policy `active participation -> allow` is not used.

Current rule remains:

- exactly one active valid participation;
- exact explicit `cloud.file.write` allow;
- matching explicit deny wins;
- no policy match -> deny.

## API server source reuse

The API server TypeScript root was widened only so it can import the canonical #90 core resolver directly instead of copying the policy into the server artifact.

This prevents a second permission engine.

## Not executed

- no `drizzle-kit push`;
- no access records inserted;
- no live database read;
- no Google Drive API call;
- no Project Graph mutation;
- no File Loader UI change.

## Remaining path to real E2E

External/runtime gates now dominate:

1. identify a safe non-production `DATABASE_URL` for `nosmo-nexus-mvp`;
2. inspect/apply Phase 19 + identity/access tables there;
3. create one controlled canonical Person binding + Project Participation + exact Cloud allow grant;
4. provision server-side Google OAuth credential for the existing My Drive hierarchy;
5. configure server-owned Drive target mappings;
6. mount one authenticated multipart Cloud endpoint composing the existing pipeline;
7. run a controlled real-file smoke and verify Drive + Project Memory records + audit + replay.

## Protected surfaces

PR #91, Object Card, Relationship Tree, Work Wallet, BIM/IFC/FabStation, Android Work Mode, DoorFlow, Electrical, Person Card and File Loader UI remain unchanged.

Do not merge automatically.
