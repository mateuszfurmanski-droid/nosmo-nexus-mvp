# Nexus QFieldCloud ephemeral upstream E2E

This slice upgrades the QFieldCloud connector from the shared Nexus-owned protocol fixture in PR #157 to a real disposable QFieldCloud backend.

## Pinned upstream

- official repository: `opengisch/QFieldCloud`;
- pinned upstream commit: `371b0d88a2956c20e530f988140b899550f7a10a`;
- the workflow builds the official QFieldCloud Django application from that exact source;
- disposable PostGIS, Memcached and object-storage services run only on the GitHub runner;
- all containers, data and credentials are destroyed after the run.

## Authentication correction

The upstream QFieldCloud backend uses Django REST Framework-style token authentication:

`Authorization: Token <token>`

The earlier Nexus protocol fixture used a Bearer header. This slice corrects the server-side Nexus client and connector auth vocabulary before claiming real-upstream compatibility.

## E2E path

1. fetch the exact pinned QFieldCloud source;
2. boot disposable supporting services;
3. build the official QFieldCloud application image;
4. run the official Django migrations;
5. create a disposable user and one disposable field project inside the runner;
6. start the real QFieldCloud API;
7. authenticate through `POST /api/v1/auth/login/` and mask the returned token;
8. verify `GET /api/v1/projects/` using `Authorization: Token ...`;
9. execute the existing Nexus `QFieldCloudServerClient` against the real API;
10. require the Nexus connector to perform only project-list and project-detail GET requests;
11. emit a sanitised proof summary;
12. destroy the complete disposable environment.

Expected success marker:

`QFIELDCLOUD_EPHEMERAL_E2E_PASS`

## What a PASS proves

A PASS proves that the current Nexus QFieldCloud server-side adapter uses the authentication scheme accepted by a real pinned QFieldCloud backend and can read both the project collection and a concrete project detail through the implemented API paths.

## Truth boundary

This is real-upstream ephemeral validation, not a persistent QFieldCloud Cloud/customer tenant. The user/project created by the workflow are synthetic and exist only to make both implemented read paths testable.

The workflow does not claim:

- a production QFieldCloud deployment;
- access to the hosted `app.qfield.cloud` service;
- customer or NOSMO operational field data;
- persistent Nexus-held QFieldCloud credentials;
- external QFieldCloud write capability from the Nexus connector;
- automatic Project Graph mutation;
- automatic canonical Evidence, Approval or Person promotion;
- partnership or endorsement by OPENGIS.ch/QFieldCloud.

Upstream mutations are limited to disposable test-environment setup. The Nexus connector itself remains GET-only.
