# NOSMO Nexus — SKANSKA Property Commercial Building / Asset Operations Demo

Status: isolated synthetic demonstrator. Draft only. No real SKANSKA Property project, asset, worker or operational data.

## Purpose

This demonstrator shows NOSMO Nexus as a **Construction + Building Operating Layer** rather than another standalone asset-management application.

The governing story is:

`building -> floor -> space -> asset -> material -> person/company -> work -> inspection -> documentation -> maintenance -> replacement/reuse -> ESG evidence`

The Project / Building Graph is the contextual operating layer. BIM, CAFM, document storage, Work Wallet, spatial tools and LCA/material sources remain source systems where appropriate.

## Route

`/skanska-property-demo`

## Protected boundaries

This branch is forked from the current protected SKANSKA Residential Demo head and does not edit its route or demo files.

Unchanged:

- `/spark-skanska-demo` and PR #91 demo files;
- accepted Relationship Tree implementation and gestures;
- canonical Object Card components/contracts;
- Person Card UI;
- Work Wallet runtime;
- BIM / IFC / FabStation runtime;
- Nexus Cloud runtime;
- DoorFlow;
- Electrical Commissioning;
- native Android Work Mode.

The commercial demonstrator contains an isolated graph projection and an isolated bounded Work Mode representation so the full commercial operations story can be executed without changing protected production/prototype surfaces.

## Demo data

All commercial data is explicitly `SYNTHETIC_DEMO`.

Minimum fixture:

- 1 building;
- 3 floors;
- 6 spaces;
- 8 assets;
- 3 companies;
- 5 people;
- installation, inspection and maintenance history;
- active issue on `AHU-04`;
- replacement case on `AHU-04`;
- synthetic cross-project reuse opportunity;
- asset-level circular / ESG evidence.

No fabricated quantitative kgCO2e value is presented. Carbon quantification remains unavailable until a verified EPD/LCA source factor is connected.

## Executable demo story

Primary asset: `AHU-04 — Air Handling Unit 04`.

1. Navigate graph: SKANSKA PROPERTY -> Demo Building -> L00 -> Mechanical Plant Room -> AHU-04.
2. Open Object Card projection and review WHAT / WHERE / WHO / WHEN / PROOF / NEXT context.
3. Ask `What do we know about this asset?`.
4. Nexus returns a deterministic answer assembled from the visible synthetic graph.
5. Open the active bearing/fan inspection issue.
6. Create the bounded task for the service technician.
7. Open the isolated Work Mode representation.
8. Complete every checklist item and record two required demo photos.
9. Finish work; evidence returns to the same asset context.
10. Facility Manager approves the evidence.
11. Update Object Card / Building Graph history.
12. Open replacement / reuse decision.
13. Review material composition, retained assemblies, recycling route and synthetic cross-project compatibility opportunity.
14. Confirm the circular route.
15. ESG evidence is generated from the same asset history with provenance and carbon-integrity boundaries.

## Typed Building Graph projection

The commercial fixture now has an explicit typed graph contract in:

`artifacts/nosmo-nexus/src/skanska-property-demo/graph.ts`

Schema:

`nexus-commercial-building-graph/v1`

The projection models typed nodes for:

- PROPERTY_PORTFOLIO;
- BUILDING;
- FLOOR;
- SPACE;
- ASSET;
- MATERIAL;
- PERSON;
- COMPANY;
- ISSUE;
- TASK;
- INSPECTION;
- DOCUMENT;
- PHOTO;
- MAINTENANCE_EVENT;
- APPROVAL;
- REPLACEMENT_EVENT;
- REUSE_EVENT;
- ESG_EVIDENCE.

It also models explicit edges such as:

- CONTAINS;
- LOCATED_ON / LOCATED_IN;
- COMPOSED_OF;
- INSTALLED_BY / INSTALLED_BY_COMPANY;
- OWNED_BY / SERVICED_BY;
- HAS_ISSUE / HAS_TASK;
- ASSIGNED_TO / ABOUT_ASSET;
- PRODUCED_EVIDENCE;
- APPROVED_BY;
- TRIGGERED_REPLACEMENT;
- HAS_REUSE_ROUTE;
- HAS_ESG_EVIDENCE.

The graph projection is stage-aware. The AHU task is absent in the initial issue state, appears only after the Facility Manager creates it, and later workflow stages add evidence, approval, replacement, reuse and ESG nodes/edges. This makes the demo contract testable as a changing graph rather than only as a sequence of screens.

Every generated graph node remains `SYNTHETIC_DEMO`.

## Relationship model represented in the demo

`SKANSKA PROPERTY -> BUILDING -> FLOOR -> SPACE -> ASSET`

Selected asset context projects relations to:

- MATERIAL;
- PERSON;
- COMPANY;
- TASK;
- INSPECTION;
- DOCUMENT;
- PHOTO;
- MAINTENANCE EVENT;
- REPLACEMENT / REUSE EVENT.

This is deliberately one graph story, not separate applications or disconnected dashboards.

## Source-system positioning

The Sources tab explicitly presents:

- BIM / IFC: object identity + spatial reference;
- FM / CAFM: maintenance/work-order source; current openMAINT adapter work exists separately;
- document storage: manuals/certificates/photos; Nexus Cloud work exists separately;
- Work Wallet: worker/compliance context; connector stack exists separately;
- FabStation / spatial connector: candidate hand-off, still evidence-gated;
- LCA/material data: external factor source; no live quantitative factor is claimed here.

The current openMAINT PR #161 has a separate successful disposable real-application compatibility check. That strengthens the credibility of FM/CAFM as an upstream source but does not turn this commercial demo into a live CAFM implementation or authorise upstream writes.

## Canonical runtime fold-in

The current browser workflow state is demonstrator state, not canonical WorkSuite / Android / Cloud authority.

The controlled productionisation path is documented in:

`docs/NEXUS_SKANSKA_PROPERTY_FOUNDATION_FOLDIN_PLAN.md`

Canonical donor stacks are reused deliberately rather than bulk-merged or copied. In particular, future production task execution/evidence must fold into the #90-lineage WorkSuite, Project Memory, Android Work Mode and Nexus Cloud paths instead of creating commercial-property-specific copies.

## Theme / UI

Default theme is Eco (`green`). The demonstrator uses the same theme preference storage key as the existing SKANSKA demo so the current Nexus skin choice follows the user between demonstrators.

The commercial route is full-screen and responsive. It does not alter the accepted Relationship Tree or Object Card implementation.

## Validation

Dedicated workflow:

`.github/workflows/skanska-property-demo-check.yml`

Checks:

- full-history checkout for isolation validation;
- explicit allowlist diff guard against protected PR #91 base;
- frozen dependency install;
- commercial fixture referential-integrity checks;
- typed graph validation for every workflow stage;
- required final graph relations through ESG evidence;
- workspace type-declaration build (`typecheck:libs`);
- Nexus web typecheck;
- Nexus web build;
- commercial demo markers present in build output;
- direct `/skanska-property-demo` route smoke through the repository-native Nexus server.

The operator walkthrough and acceptance checklist are documented in:

`docs/NEXUS_SKANSKA_PROPERTY_DEMO_OPERATOR_RUNBOOK.md`

## Vercel preview boundary

This isolated branch contains a branch-local `vercel.json` that builds only the Nexus web artifact and serves SPA routes from `artifacts/nosmo-nexus/dist/public`. It does not change the Nexus Cloud staging runtime code or protected Cloud implementation PRs.

Commercial branch deployments reach `READY`, confirming that the unrelated `artifacts/mockup-sandbox` / missing `PORT` root-build failure is not in the commercial preview path.

The connected Vercel project `nosmo-nexus-cloud-staging` currently enforces Vercel Authentication on preview aliases. Therefore a deployment is **READY but not anonymously public**: unauthenticated requests redirect to Vercel SSO. A temporary Vercel share link can be generated for review, but it expires and is not the Definition-of-Done stable public URL.

A safer stable-public option is a dedicated public demo deployment or controlled public-preview mirror. The public `NOSMO-website` repository already hosts isolated Nexus demo directories, but no commercial bundle is copied there from source by hand: the public mirror should be produced from a validated build artifact or dedicated deployment path so it cannot drift into a second source implementation.

The demo must not be called fully public/mobile-verified until that stable public path exists. No change to the Cloud staging protection policy is made from this branch.
