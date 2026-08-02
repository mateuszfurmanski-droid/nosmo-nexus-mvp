# Connected NOSMO Nexus demonstrations

All user-facing demonstrations below are connected from the canonical Nexus Menu and use the fictional `Riverside Heights Demo` context.

## Working entries

- `/first-run` — Android-first Nexus Awakening, Work Mode and Discovery Cloud prototype;
- `/doorflow-demo/` — self-contained synthetic DoorFlow workflow;
- `/electrical-commissioning/` — complete anonymised Electrical Commissioning demonstrator;
- `/relationship-tree` — independently bundled Nexus Relationship Tree export;
- `/workspace` — compatibility alias for the same exported Relationship Tree;
- `/person-card-demo` — synthetic Personal InfoCard;
- `/people` — broader People directory and availability demonstrator;
- `/card-maker` — AI-assisted Card Maker demonstrator;
- `/communication-hub` — contextual Person Card communication demonstrator.

## Relationship Tree export boundary

The Relationship Tree was originally developed in a Replit workspace, but the user-facing version is now stored and built inside `nosmo-nexus-mvp`.

Its production route does not load a Replit URL and does not require a running Replit deployment. Replit may remain an optional development workspace for future changes. Approved updates must be exported into the Nexus repository and validated before replacing the bundled snapshot.

Current export manifest:

- version: `2026.08.02-export-1`;
- canonical route: `/relationship-tree`;
- compatibility route: `/workspace`;
- runtime: Nexus production bundle;
- external runtime required: no.

## DoorFlow source boundary

The full production-oriented DoorFlow source remains in the private repository:

`mateuszfurmanski-droid/nosmo-doorflow`

That repository includes authentication, API services, PDF and Excel processing, project persistence, deep zoom and the full inspection workspace. It is not copied into the static Nexus demo because it currently depends on its own backend and Replit authentication environment.

The connected static DoorFlow demo provides a stable user-facing experience while that full module is migrated behind a portable Nexus service boundary.
