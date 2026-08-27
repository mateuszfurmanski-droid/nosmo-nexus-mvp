# ADDON_060 Product Slice A — Person Card Work Profile

**Status:** DRAFT IMPLEMENTATION / SYNTHETIC DEMO  
**Architecture:** `nosmo-nexus#25` / ADDON_060 / PKG-007  
**Base:** PR #90 exact head `35a6757ce19fe590754fb7ad13ed48a68cb51705`

## Scope

Additive Work Profile projection only.

New route:

`/person-card-work-profile`

New page:

`artifacts/nosmo-nexus/src/pages/person-card-work-profile.tsx`

## Protected donor

`artifacts/nosmo-nexus/src/pages/person-card-demo.tsx`

must remain byte-for-byte unchanged from the base.

Base blob SHA:

`0a9da1a7c5994797fd56cee6c47b89d2c2f2a88d`

## Slice behaviour

- one-screen ID/bank-card composition;
- synthetic Alex Carter identity aligned with the existing Person Card demo donor;
- availability selector;
- work preferences;
- compact document/readiness states;
- compact references;
- synthetic AI-ranked job matches;
- AI profile readiness recommendations;
- profile share action;
- WhatsApp/email compose actions with explicit no-delivery-claim boundary.

## Explicit non-capabilities

This slice does not:

- scrape Indeed or any job board;
- create a production Job connector;
- send WhatsApp through an API;
- claim email delivery;
- create a second Person identity;
- persist recruitment state to a database;
- alter the existing Person Card;
- alter Spark #91, e-SAFE, Relationship Tree, Android, Work Wallet, DoorFlow, Electrical or BIM/FabStation.

## Validation

Required exact-head checks:

1. `pnpm --filter @workspace/nosmo-nexus typecheck`;
2. `pnpm --filter @workspace/nosmo-nexus build`;
3. compare protected donor blob SHA with base;
4. route/source audit for `/person-card-work-profile`;
5. browser visual smoke when available.
