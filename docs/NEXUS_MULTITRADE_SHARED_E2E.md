# Nexus multitrade shared E2E harness

This slice validates one shared read-only connector path for the first multitrade adapter batch:

- ERPNext — items, warehouses, material requests, purchase orders;
- QFieldCloud — field project list/detail;
- openMAINT/CMDBuild — classes and asset/maintenance cards;
- buildingSMART BCF API — projects and topics.

The harness runs the real Nexus server-side client classes against a disposable local HTTP fixture server that preserves the currently implemented request paths and authorization-header shapes. It then projects one representative external record from each source through the shared `external-reference-only` Nexus context contract.

## What this proves

- all four Nexus clients can complete their read paths through a real HTTP boundary;
- connector-specific credentials remain server-side in the harness and are absent from sanitized output;
- the shared context projection rejects source/connector mismatches and requires explicit Nexus context links;
- canonical Evidence creation remains disabled;
- Project Graph mutation remains disabled;
- external identities and external approval/status values are not promoted to canonical Nexus authority;
- the harness issues GET requests only.

## What this does not prove

This is not a real persistent upstream integration proof. The fixture server is Nexus-owned and disposable. No ERPNext, QFieldCloud, openMAINT/CMDBuild or third-party BCF tenant is created, authenticated or mutated by this slice.

A later provider-specific upstream phase is still required before any connector may be described as real-provider E2E validated.

Expected marker:

`MULTITRADE_SHARED_E2E_PASS`
