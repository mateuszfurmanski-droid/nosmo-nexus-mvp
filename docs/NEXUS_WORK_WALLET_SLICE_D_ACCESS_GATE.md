# NOSMO Nexus — Work Wallet Slice D Access Gate

Status: IMPLEMENTED / RUNTIME_BINDING_PENDING
Base: `codex/work-wallet-reconcile-slice-c-runtime` / PR #98
Branch: `codex/work-wallet-reconcile-slice-d-access`

External capability label:

`DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API`

## Purpose

Define the fail-closed authorization gate that must pass before a Work Wallet Context Ticket may be issued.

The gate deliberately consumes the canonical PR #90 access model rather than porting PR #56 as a second authorization system.

## Canonical authority consumed

The evaluator uses only existing #90 records and contracts:

- `NexusRuntimeIdentityContext`;
- canonical `Person`;
- canonical `NexusCanonicalObjectRecord`;
- `NexusProjectParticipationRecord`;
- `NexusPermissionGrantRecord`;
- `NexusAccessDecisionRecord`;
- `NexusProjectMemorySnapshot`.

No Work Wallet role table, Work Wallet ACL table or parallel Project Participation model is introduced.

## Required allow path

A ticket is eligible only when all of the following are true at the evaluated time:

1. Nexus runtime identity is valid, authenticated and `BOUND` to a canonical `personId`.
2. That canonical Person exists and is active in Project Memory.
3. The target canonical Nexus Object exists, is active and belongs to the exact requested `projectId + worldId`.
4. Exactly one active Project Participation exists for the Person in that project/world at that time.
5. No matching explicit deny grant applies.
6. An explicit allow grant exists for:
   - module `work-wallet`;
   - action `connector.context.read`;
   - the requested object or a deliberately broader canonical object scope.
7. An exact canonical AccessDecision exists for the same Person, Participation, project, world, module, action and canonical object.
8. The latest decision at or before issuance is uniquely determined and is `allowed`.

If any check fails, issuance remains denied.

## Deny semantics

A matching deny grant wins even when an allow grant also exists.

Active Project Participation by itself never grants Work Wallet access.

Provider/OIDC subject, email, Work Wallet user identity and Work Wallet external record identifiers are not accepted as canonical Person identity or authorization authority.

## Temporal semantics

The evaluator does not assume only one AccessDecision exists forever. Access decisions are historical/auditable records.

For issuance it considers decisions at or before the requested evaluation time and selects the unique latest decision. Equal-time ambiguity fails closed.

Participation and permission grant validity windows are evaluated at the same issuance time.

## Validation coverage

`tsconfig.work-wallet.json` has been added and the repository root `typecheck` now includes `typecheck:work-wallet`. This ensures the Work Wallet foundation contracts are part of normal TypeScript validation instead of being outside the existing project references.

Draft PR Actions may still be skipped by repository policy. A skipped workflow is not a PASS.

## Runtime work still required

This slice is an authorization contract, not yet the Context Ticket server.

Still required before ticket issue can be enabled:

- server-owned exact provider-subject -> canonical Person binding adapter;
- server-owned source for current canonical Project Memory access records;
- issue endpoint wired to this eligibility gate;
- 60-second single-use Context Ticket store/exchange;
- exact-origin exchange;
- same authorization re-check immediately before exchange;
- authenticated bootstrap page;
- memory-only extension receiver.

## Protected surfaces

No changes to PR #91, Relationship Tree gestures/layout, Object Card, Person Card UI, Cloud/Drive, BIM/IFC/FabStation, Android Work Mode, DoorFlow or Electrical Commissioning.
