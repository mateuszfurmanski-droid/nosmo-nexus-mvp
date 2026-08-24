# Nexus OpenProject connector E2E handoff

## Scope

This slice validates OpenProject Community Edition as an external work-management engine for the Nexus adaptive connector layer.

Connector surface: `Nexus Work` / projects / work packages.

## Verified upstream proof

GitHub Actions `OpenProject Ephemeral E2E #12` completed successfully against the official `openproject/openproject:17.6.0` all-in-one image.

Verified flow:

1. boot disposable OpenProject Community Edition;
2. enable API tokens only inside the disposable instance;
3. create a short-lived API token with OpenProject's `APITokens::CreateService`;
4. verify authenticated `/api/v3/users/me` access;
5. create an ephemeral project through API v3;
6. resolve an available project work-package type;
7. create a work package through API v3;
8. read the project collection;
9. read the work-package collection;
10. read the created work-package detail;
11. destroy the container, token and database with the runner.

Sanitised proof snapshot:

- project: `NOSMO Nexus Ephemeral Work E2E`;
- work package: `#37 Nexus Work Package E2E`;
- type: `Task`;
- status: `New`;
- captured: `2026-08-24T04:51:57.875Z`.

## Release truth

This proof does **not** mean a persistent OpenProject tenant is configured for Nexus. The production connector remains configuration-gated and read-only.

Nexus does not automatically:

- mutate Project Graph records from OpenProject;
- promote OpenProject assignees into Nexus Person identities;
- promote external statuses into Nexus Approval truth;
- promote external records into Nexus Evidence truth;
- expose API tokens to browser code;
- claim OpenProject partnership or endorsement.

The Adaptive Connector Lab may display the sanitised snapshot as `EPHEMERAL` proof while runtime status remains `CONFIG REQUIRED` until a persistent server-side tenant probe is configured.
