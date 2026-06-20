---
name: Activity type enum is contract-governed
description: Adding a new activity/timeline event type requires updating the OpenAPI enum + regenerating codegen, plus invalidating the activity query client-side.
---

The set of allowed `activity.type` values is constrained by an `enum` in the OpenAPI spec (`lib/api-spec/openapi.yaml`, the Activity schema), NOT just the free-text DB column.

**Why:** `GET /projects/:id/activity` validates its response against the generated Zod schema (`@workspace/api-zod`). Inserting a row with a `type` not in the enum causes the route to 500 with a ZodError at response-validation time — even though the DB insert (free-text column) succeeds. This bit us when `note_added` was logged but missing from the enum.

**How to apply:** When introducing a new timeline/activity event type:
1. Add the value to the Activity `type` enum in `lib/api-spec/openapi.yaml`.
2. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate api-zod + api-client-react.
3. Client-side: any mutation that creates an activity row must invalidate the project activity query (`getGetProjectActivityQueryKey(projectId)`) so the Timeline updates without a reload — list-only invalidation (e.g. notes list) is not enough.
4. Add label/dot entries for the new type in the frontend activity maps (project-detail.tsx).
