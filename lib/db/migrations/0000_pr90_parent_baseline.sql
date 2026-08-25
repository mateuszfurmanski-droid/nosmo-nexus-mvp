-- NOSMO Nexus repository migration 0000
-- Canonical known parent baseline: PR #90 / codex/nexus-mvp-modular-foundation.
-- This migration is intentionally non-destructive so it can establish the ledger
-- against an already-provisioned PR #90-shaped development database.

CREATE TABLE IF NOT EXISTS sessions (
  sid varchar PRIMARY KEY,
  sess jsonb NOT NULL,
  expire timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar,
  first_name varchar,
  last_name varchar,
  profile_image_url varchar,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

CREATE TABLE IF NOT EXISTS workspaces (
  id serial PRIMARY KEY,
  owner_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Workspace',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_owner_id_unique ON workspaces (owner_id);

CREATE TABLE IF NOT EXISTS projects (
  id serial PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  location text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id serial PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id integer NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text,
  assignee text,
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans (
  id serial PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id integer NOT NULL,
  filename text NOT NULL,
  original_name text NOT NULL,
  file_size integer,
  mime_type text,
  file_data text,
  status text NOT NULL DEFAULT 'uploaded',
  analysis_result text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id serial PRIMARY KEY,
  task_id integer NOT NULL,
  content text NOT NULL,
  author_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity (
  id serial PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text NOT NULL,
  entity_name text NOT NULL,
  project_id integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id serial PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id integer NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Note',
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id serial PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demo_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size integer NOT NULL,
  kind text NOT NULL,
  original_bytes bytea NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  error text,
  page_count integer NOT NULL DEFAULT 0,
  processed_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS demo_file_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES demo_files(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/png',
  image_bytes bytea NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_door_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES demo_files(id) ON DELETE CASCADE,
  door_id text NOT NULL,
  review_status text,
  photo_bytes bytea,
  photo_mime_type text,
  x real,
  y real,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS demo_door_state_file_door_uq
  ON demo_door_state (file_id, door_id);

CREATE TABLE IF NOT EXISTS nexus_pm_files (
  file_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  provider_connector_id text NOT NULL,
  provider_object_id text NOT NULL,
  storage_object_key text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_pm_files_provider_object_uq
  ON nexus_pm_files (workspace_id, provider_connector_id, provider_object_id);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_pm_files_storage_object_uq
  ON nexus_pm_files (workspace_id, provider_connector_id, storage_object_key);

CREATE TABLE IF NOT EXISTS nexus_pm_canonical_objects (
  object_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  object_type text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS nexus_pm_external_references (
  external_reference_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nexus_object_id text NOT NULL,
  provider_connector_id text NOT NULL,
  provider_object_id text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_pm_external_ref_provider_object_uq
  ON nexus_pm_external_references (workspace_id, provider_connector_id, provider_object_id);

CREATE TABLE IF NOT EXISTS nexus_pm_storage_records (
  storage_record_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  object_id text NOT NULL,
  provider_connector_id text NOT NULL,
  storage_object_key text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_pm_storage_object_key_uq
  ON nexus_pm_storage_records (workspace_id, provider_connector_id, storage_object_key);

CREATE TABLE IF NOT EXISTS nexus_pm_audit_events (
  event_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  event_type text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS nexus_pm_cloud_commits (
  idempotency_key text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  pending_asset_id text NOT NULL,
  access_decision_id text NOT NULL,
  provider_connector_id text NOT NULL,
  provider_object_id text NOT NULL,
  file_id text NOT NULL,
  canonical_file_object_id text NOT NULL,
  external_reference_id text NOT NULL,
  storage_record_id text NOT NULL,
  audit_event_id text NOT NULL,
  committed_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_pm_cloud_commit_provider_object_uq
  ON nexus_pm_cloud_commits (workspace_id, provider_connector_id, provider_object_id);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_pm_cloud_commit_file_uq
  ON nexus_pm_cloud_commits (workspace_id, file_id);
