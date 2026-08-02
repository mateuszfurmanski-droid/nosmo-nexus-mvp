# Connected NOSMO Nexus demonstrations

All user-facing demonstrations below are connected from the canonical Nexus Menu and use the fictional `Riverside Heights Demo` context.

## Working entries

- `/doorflow-demo/` — self-contained synthetic DoorFlow workflow;
- `/electrical-commissioning/` — complete anonymised Electrical Commissioning demonstrator;
- `/workspace` — interactive Nexus relationship tree originally developed in Replit;
- `/person-card-demo` — synthetic Personal InfoCard;
- `/people` — broader People directory and availability demonstrator;
- `/card-maker` — AI-assisted Card Maker demonstrator;
- `/communication-hub` — contextual Person Card communication demonstrator.

## Source boundaries

The full production-oriented DoorFlow source remains in the private repository:

`mateuszfurmanski-droid/nosmo-doorflow`

That repository includes authentication, API services, PDF and Excel processing, project persistence, deep zoom and the full inspection workspace. It is not copied into the static Nexus demo because it currently depends on its own backend and Replit authentication environment.

The connected static DoorFlow demo provides a stable user-facing experience while that full module is migrated behind a portable Nexus service boundary.
