# Nexus Cloud upload-session stub

Schema: `nexus-cloud-upload-session-plan/v1`

This slice adds the first authenticated backend planning endpoint for Nexus Cloud uploads.

It is intentionally a **stub**. It accepts pending asset metadata and returns a server-side upload-session plan. It does not accept binary content and does not write to Google Drive.

## Endpoint

`POST /api/nexus-cloud/upload-sessions`

Mounted after `requireWorkspace`, so the request must have an authenticated Nexus user and resolved workspace before planning.

## Capability endpoint

`GET /api/nexus-cloud/upload-sessions/capabilities`

Returns supported schemas, supported project worlds and explicit false capability flags for binary upload, Google Drive write, Asset Index append and Project Graph mutation.

## Accepted input

The endpoint accepts either:

```json
{
  "schema": "nexus-cloud-upload-session-request/v1",
  "pendingAsset": { "schema": "nexus-cloud-pending-asset/v1" }
}
```

or the pending asset record directly.

The pending asset must come from the previous metadata-only File Loader path:

- schema: `nexus-cloud-pending-asset/v1`;
- namespace: `PENDING-NCA-*`;
- upload state: `metadata_prepared` or `awaiting_binary_upload`;
- project/world pair: e-SAFE Catania + `esafe-demo`, or Riverside + `dev`;
- target folder must match the server-side manifest copy;
- classification cannot be `linked_to_graph`.

## Output

The endpoint returns HTTP `202` with:

- `uploadSessionId`;
- provider: `google-drive`;
- pending asset identifiers;
- workspace/user context;
- target folder id/url/path hint;
- one-hour expiry;
- `nextRequiredStep: implement_drive_upload_adapter`;
- all dangerous side-effect flags set to `false`.

## Explicit non-capabilities

This endpoint does not implement:

- file content reading;
- binary upload session URLs;
- Google OAuth;
- Google Drive API mutation;
- Asset Index append;
- Project Graph mutation;
- Relationship Tree mutation;
- production storage change.

## Position in the Nexus Cloud chain

Current chain after this slice:

`file selected -> project/world resolved -> pending asset metadata -> visible route -> authenticated upload-session plan`

Future chain:

`upload-session plan -> Drive upload adapter -> Asset Index append -> Project Graph link review`
