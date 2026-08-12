# Nexus Cloud upload-session endpoint smoke

This smoke validates the `POST /api/nexus-cloud/upload-sessions` Express route without using real authentication, binary upload, Google OAuth, Google Drive writes, Asset Index append or Project Graph mutation.

It is stacked on the pure planner smoke and exercises the real `nexusCloudRouter` through a minimal in-process Express app.

## Mock request context

The smoke app installs:

- `express.json()`;
- `req.workspaceId = 101`;
- `req.user.id = smoke-authenticated-user`;
- `req.log.error()` test logger;
- the real Nexus Cloud router.

This intentionally bypasses real session login while still proving that the endpoint reads workspace/user context from the request and sends metadata through the same route used by the frontend bridge.

## Valid e-SAFE path

The positive case posts an e-SAFE Catania pending asset to `/nexus-cloud/upload-sessions` and expects HTTP `202` with `nexus-cloud-upload-session-plan/v1`.

The response must keep the asset inside e-SAFE `00_INBOX` folder `1xsIITjBwTEE1z7whhub3RnsSXfrxwur9` and keep every side-effect flag false:

- `binaryHandled`;
- `driveWriteRequested`;
- `driveWritePerformed`;
- `assetIndexAppendRequested`;
- `assetIndexAppendPerformed`;
- `projectGraphMutationRequested`;
- `projectGraphMutationPerformed`.

The response must not include an upload URL or Drive file ID because this remains an upload-session planning stub.

## Fail-closed paths

The smoke also verifies that:

- e-SAFE with `worldId: dev` returns HTTP `400`;
- direct endpoint usage without mock `workspaceId` returns an error before planning.

These checks protect the e-SAFE/Riverside project-world boundary and keep the endpoint from silently accepting unscoped upload planning.
