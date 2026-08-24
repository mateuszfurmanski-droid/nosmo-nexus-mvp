# Nexus openMAINT ephemeral E2E

This slice validates the existing Nexus openMAINT/CMDBuild read adapter against a disposable runtime containing the real openMAINT 2.4.2 application on CMDBuild core 4.2.0.

## Upstream and runtime provenance

Current official openMAINT distribution identifies openMAINT 2.4 on CMDBuild core 4.2 as the current release family. The executable runtime used by this CI slice is the public community Docker packaging `itmicus/cmdbuild:om-2.4.2-4.2.0`.

The packaging source is pinned to `itmicus/cmdbuild_docker` commit:

`29378affd13f875c5a8185e829ddd0b158050ae2`

That packaging explicitly installs `openmaint-2.4.2-4.2.0.war`. The workflow verifies the pinned packaging evidence, pulls the tagged runtime and records the concrete resolved Docker image digest in the proof output.

Important: the Docker packaging is community maintained, not an official openMAINT/Tecnoteca container. The test therefore proves Nexus compatibility with the real openMAINT application as packaged in that disposable runtime; it does not claim an official container or vendor-certified deployment.

## Authentication boundary

CMDBuild REST v3 creates a service session through:

`POST /services/rest/v3/sessions?scope=service&returnId=true`

Subsequent REST v3 reads use the returned session identifier in:

`CMDBuild-Authorization: <session-token>`

The Nexus connector models this as `session-token`, not OAuth or a generic bearer token.

## E2E path

1. validate the pinned community packaging evidence;
2. pull the openMAINT 2.4.2 / CMDBuild 4.2.0 runtime and record its resolved digest;
3. boot disposable PostGIS;
4. boot openMAINT with its demo database inside the disposable runner;
5. authenticate as the runtime's disposable demo administrator and mask the returned session token;
6. preflight the authenticated CMDBuild REST v3 class collection;
7. execute the repository `OpenMaintServerClient` against that runtime;
8. read the class collection and one accessible class card collection;
9. fail if the Nexus adapter attempts any method other than GET;
10. emit a sanitised proof summary;
11. destroy the application container, database container, network and session with the runner.

Expected marker:

`OPENMAINT_EPHEMERAL_E2E_PASS`

## What a PASS proves

A PASS proves that the current Nexus server-side adapter can use CMDBuild REST v3 session-token authentication and can execute the implemented class/card reads against an actual openMAINT 2.4.2 / CMDBuild 4.2.0 application runtime.

The demo data belongs only to the disposable runtime and exists to verify provider/API compatibility. The Nexus adapter itself remains read-only.

## Truth boundary

This test does not claim:

- a persistent NOSMO or customer openMAINT tenant;
- customer data ingestion;
- persistent Nexus-held openMAINT credentials;
- external openMAINT write capability from Nexus;
- automatic Project Graph mutation;
- automatic canonical Evidence, Approval or Person promotion;
- modification or redistribution of openMAINT source UI;
- partnership, certification or endorsement by openMAINT, CMDBuild or Tecnoteca;
- that the community Docker packaging is an official vendor container.

openMAINT remains the external source of truth. Nexus consumes authorised API data into a separately authored Nexus-owned surface.
