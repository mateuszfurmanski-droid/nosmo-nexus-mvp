# Nexus Cloud upload-session UI bridge

This slice connects the visible Nexus Cloud File Loader route to the authenticated upload-session planning stub added in the API server.

## Route

`/nexus-cloud/file-loader`

## User flow

1. The user selects the Project World before selecting files.
2. The File Loader bridge prepares a `nexus-cloud-pending-asset/v1` record in the browser.
3. The user explicitly clicks `Request upload-session plan` for a prepared pending asset.
4. The UI posts the pending asset metadata to `POST /api/nexus-cloud/upload-sessions`.
5. The API returns a `nexus-cloud-upload-session-plan/v1` when the user is authenticated and the server-side project/world/folder guard passes.

## Auth boundary

The endpoint is mounted behind `requireWorkspace` in the API server. If the browser session is unauthenticated, the UI displays the HTTP 401 response as an expected workspace guard result.

This is not treated as a Google Drive failure. It means upload-session planning correctly requires an authenticated workspace.

## Mutation boundary

This UI bridge still does not:

- read binary file contents;
- hash files;
- upload files;
- create Google Drive files;
- append the Asset Index;
- mutate Project Graph;
- approve graph candidate links.

The server response is only an upload-session plan. The next implementation step remains the real Drive upload adapter.

## Safety checks in the frontend client

The frontend client rejects a response if it does not use `nexus-cloud-upload-session-plan/v1` or if the response indicates any prohibited side effect such as:

- `binaryHandled !== false`;
- `driveWritePerformed !== false`;
- `assetIndexAppendPerformed !== false`;
- `projectGraphMutationPerformed !== false`.

## Expected next slice

The next slice should add an authenticated browser/API smoke around this plan request. It should verify both states:

- unauthenticated browser receives and displays HTTP 401;
- authenticated workspace receives `planned_metadata_only` with all mutation flags false.
