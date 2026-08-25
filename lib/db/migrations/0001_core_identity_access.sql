-- NOSMO Nexus repository migration 0001
-- Shared canonical Person identity + Project Participation / PermissionGrant /
-- AccessDecision persistence required by the e-SAFE core commit boundary.
-- IF NOT EXISTS preserves compatibility with the already-provisioned non-production
-- donor schema documented by PR #148; shape is verified by the real DB smoke.

CREATE TABLE IF NOT EXISTS nexus_pm_people (
  person_id text PRIMARY KEY,
  display_name text NOT NULL,
  person_type text NOT NULL,
  status text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS nexus_identity_bindings (
  binding_id text PRIMARY KEY,
  provider text NOT NULL,
  provider_subject_digest text NOT NULL,
  person_id text NOT NULL REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'ACTIVE',
  verified_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_identity_provider_subject_digest_uq
  ON nexus_identity_bindings (provider, provider_subject_digest);

CREATE TABLE IF NOT EXISTS nexus_pm_project_participations (
  participation_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  person_id text NOT NULL REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  project_id text NOT NULL,
  world_id text NOT NULL,
  participation_status text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_pm_participation_person_scope"
  ON nexus_pm_project_participations (workspace_id, person_id, project_id, world_id);

CREATE TABLE IF NOT EXISTS nexus_pm_permission_grants (
  grant_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  participation_id text NOT NULL REFERENCES nexus_pm_project_participations(participation_id) ON DELETE CASCADE,
  effect text NOT NULL,
  module_id text,
  action_key text,
  object_scope_id text,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_pm_permission_grant_scope"
  ON nexus_pm_permission_grants (workspace_id, participation_id, module_id, action_key, object_scope_id);

CREATE TABLE IF NOT EXISTS nexus_pm_access_decisions (
  decision_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  person_id text REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  participation_id text REFERENCES nexus_pm_project_participations(participation_id) ON DELETE RESTRICT,
  project_id text NOT NULL,
  world_id text NOT NULL,
  module_id text,
  action_key text,
  object_scope_id text,
  result text NOT NULL,
  evaluated_at timestamp with time zone NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_pm_access_decision_scope"
  ON nexus_pm_access_decisions (
    workspace_id,
    person_id,
    project_id,
    world_id,
    module_id,
    action_key,
    object_scope_id,
    evaluated_at
  );
