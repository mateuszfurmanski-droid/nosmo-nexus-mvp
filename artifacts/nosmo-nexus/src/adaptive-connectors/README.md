# Adaptive Connector Lab

This directory is an isolated visual proof for ADDON_057.

Safety rules:

- PR #91 Spark demo is a visual reference only and is not modified from this branch.
- Existing Relationship Tree, Object Card and AppLayout components are not modified by this lab.
- `/adaptive-connectors-lab` is a standalone full-screen route.
- Connector presentation never grants API, write, permission, source-of-record or partner authority.
- Work Wallet is represented only as a restricted Nexus-side context because no vendor UI approval is recorded.
- Snipe-IT and ODK contexts correspond to the read-adapter candidates in the parent PR; no live tenant or secret is configured here.
- Runtime labels are projected from the actual parent connector contracts, not duplicated capability claims in the visual component.
- Future live checks may supply only a client-safe probe (`configured`, `reachable`, `lastError`); credentials and tokens must remain server-side.
- Closing the visual-lab PR removes this experiment without changing the parent connector contracts.
