-- NOSMO Nexus repository migration 0002
-- Canonical Task -> Evidence -> Human Approval -> Timeline / Project Memory storage.
-- The Timeline row remains the durable idempotency marker. commit_fingerprint binds
-- that marker to the complete canonical commit input rather than Timeline JSON alone.

CREATE TABLE IF NOT EXISTS nexus_pm_tasks (
  task_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  task_status text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_pm_task_scope"
  ON nexus_pm_tasks (workspace_id, project_id, world_id, task_status);

CREATE TABLE IF NOT EXISTS nexus_pm_evidence (
  evidence_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  linked_task_id text REFERENCES nexus_pm_tasks(task_id) ON DELETE RESTRICT,
  evidence_status text NOT NULL,
  evidence_type text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_pm_evidence_task_scope"
  ON nexus_pm_evidence (workspace_id, project_id, world_id, linked_task_id, evidence_status);

CREATE TABLE IF NOT EXISTS nexus_pm_approvals (
  approval_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  approval_status text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_pm_approval_scope"
  ON nexus_pm_approvals (workspace_id, project_id, world_id, approval_status);

CREATE TABLE IF NOT EXISTS nexus_pm_timeline_events (
  timeline_event_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  event_type text NOT NULL,
  event_at timestamp with time zone NOT NULL,
  actor_person_id text REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL,
  commit_fingerprint text
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_pm_timeline_scope"
  ON nexus_pm_timeline_events (workspace_id, project_id, world_id, event_at);

-- A pre-versioned temporary #162 database may already have Timeline rows. Their
-- complete original commit input cannot be reconstructed safely from Timeline JSON,
-- so they receive a legacy marker that deliberately does NOT replay as an exact retry.
ALTER TABLE nexus_pm_timeline_events
  ADD COLUMN IF NOT EXISTS commit_fingerprint text;
UPDATE nexus_pm_timeline_events
SET commit_fingerprint = 'legacy:' || md5(timeline_event_id || ':' || record_json::text)
WHERE commit_fingerprint IS NULL;
ALTER TABLE nexus_pm_timeline_events
  ALTER COLUMN commit_fingerprint SET NOT NULL;
