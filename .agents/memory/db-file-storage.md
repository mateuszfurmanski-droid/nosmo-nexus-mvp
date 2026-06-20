---
name: DB file storage (base64 PDFs)
description: How user-uploaded files are stored/served in NOSMO Nexus and the security rules that must hold.
---

# DB file storage for plans

Files (PDF plans) are stored directly in Postgres as base64 text on `plans.file_data`, with `plans.mime_type`. There is NO object storage and NO filesystem storage — the user declined Replit Object Storage.

**Why:** investor-demo MVP; user explicitly declined Object Storage and AI credits. AI chat + PDF *analysis* remain mocked.

**How to apply / invariants that must not regress:**
- List/get endpoints must NEVER return `file_data` — expose a `hasFile` boolean (computed `file_data IS NOT NULL` in SQL) instead. Returning the blob bloats payloads.
- Upload (`POST /plans`) must validate: reject non-`application/pdf` mime AND verify the `%PDF-` magic bytes after base64-decoding the first ~16 bytes. Reject with 400 otherwise.
- File serving (`GET /plans/:id/file`) must NOT reflect the stored mime type. Always force `Content-Type: application/pdf` + `X-Content-Type-Options: nosniff`. Reflecting stored mime + inline rendering is a stored-XSS vector (architect flagged this).
- Express body limit raised to 30mb (`app.ts`) to accept base64 payloads.
- The raw file route is a streaming endpoint (base64 → Buffer), documented in OpenAPI as `getPlanFile` producing `application/pdf` binary, but accessed via a direct href link in the UI, not a generated hook.
