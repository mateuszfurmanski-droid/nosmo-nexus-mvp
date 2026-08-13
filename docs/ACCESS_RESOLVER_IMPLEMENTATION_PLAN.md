# Nexus Access Resolver — implementation plan

Issue: #23
Source architecture: ADDON_056
Target product surface: Relationship Tree / persistent project graph

## Objective

Implement project-scoped access resolution so the visible Nexus application set is derived from:

- Person Card identity;
- active Project Participation;
- role;
- trade;
- explicit permissions;
- competence/certification where required;
- active project.

## Canonical rules

1. Relationship Tree remains the Nexus home environment.
2. Access is recalculated whenever active project or project participation changes.
3. Role, trade, permission and competence are separate dimensions.
4. Explicit deny overrides inherited/default allow.
5. Managers may receive the Trades control when permitted.
6. Non-manager tradespeople do not receive a generic Trades menu; they receive only their resolved application set.
7. The same person can resolve to different application sets in different projects.
8. UI filtering is not backend authorization; resolver output must be reusable by later server-side enforcement.

## First implementation slice

Create a typed resolver contract with synthetic fixtures for:

- Project Manager;
- Joiner / Doors & Fire;
- Electrician;
- same person on two projects;
- explicit deny override.

Wire the resolved application set into the Relationship Tree launcher/dock without changing graph physics, pinch, drag, timeline or module workflow logic.

## Expected application examples

### Manager
- Projects
- People / Person Card
- Tasks
- Trades
- WorkSuite
- Fire Door Register
- Electrical Commissioning
- Work Wallet
- External Apps

### Joiner / Doors & Fire
- WorkSuite
- Fire Door Register
- permitted shared Tasks / Documents / Communication / Work Wallet
- no Trades control by default
- no Electrical specialist workflow unless separately granted

### Electrician
- Electrical Commissioning
- permitted shared Tasks / Documents / Communication / Work Wallet
- no Trades control by default
- no Doors & Fire specialist workflow unless separately granted

## Validation

- deterministic resolver tests;
- typecheck and production build;
- project-switch test proves same person gets different app sets;
- explicit deny test;
- Android launcher smoke test;
- graph pinch/drag regression check;
- timeline/project-world bridge regression check.
