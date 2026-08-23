# Nexus ERPNext ephemeral upstream E2E

This slice upgrades the ERPNext connector from a Nexus-owned protocol fixture to a real disposable ERPNext runtime.

## Pinned upstream

- official orchestration repository: `frappe/frappe_docker`;
- pinned config commit: `4b9d35666abd84157ffadbf67558bbd3e1e39de7`;
- official disposable `pwd.yml` configuration;
- ERPNext image declared by that pinned config: `frappe/erpnext:v16.32.3`;
- site: disposable `frontend` site created by the upstream config;
- database/cache/runtime volumes are destroyed with the GitHub runner.

## E2E path

1. fetch the exact pinned official disposable Docker Compose config;
2. boot real ERPNext/Frappe services and create a real ERPNext site;
3. generate a disposable Administrator API key/secret inside that site;
4. mask both credentials before any Nexus execution;
5. verify token authentication against `frappe.auth.get_logged_user`;
6. execute the existing Nexus `ErpNextServerClient` against the real ERPNext HTTP API;
7. read Item, Warehouse, Material Request and Purchase Order collections;
8. require all Nexus adapter requests to be GET only;
9. emit only a sanitised proof summary;
10. destroy containers, database and volumes.

Expected success marker:

`ERPNEXT_EPHEMERAL_E2E_PASS`

## What a PASS proves

A PASS proves that the current Nexus ERPNext server-side client authenticates with ERPNext token authentication and that all four implemented resource-list reads are accepted by a real pinned ERPNext runtime.

The read collections are permitted to be empty because the purpose of this slice is provider/API compatibility, authentication and read-path validation. The disposable site is not populated with fake commercial transactions merely to manufacture non-zero counters.

## Truth boundary

This is a real-upstream, ephemeral E2E proof. It is stronger than the shared local HTTP fixture in PR #157, but it is not a persistent customer/NOSMO ERPNext tenant.

The workflow does not claim:

- a production ERPNext deployment;
- customer data ingestion;
- persistent Nexus-held ERPNext credentials;
- external ERPNext write capability from the Nexus connector;
- automatic Project Graph mutation;
- automatic canonical Evidence, Approval or Person promotion;
- partnership or endorsement by Frappe/ERPNext.

The only upstream mutation is disposable environment setup and API-key generation inside the runner. The Nexus ERPNext connector itself remains read-only.
