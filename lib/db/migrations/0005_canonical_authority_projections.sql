-- D runtime storage for the already-frozen B2 repository projections.
-- No new authority rules, Person, ACL or scope system. Missing rows fail closed.
CREATE TABLE nexus_pm_module_entitlements (
  entitlement_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  module_id text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamptz NOT NULL
);
CREATE INDEX "IDX_nexus_pm_entitlement_scope"
  ON nexus_pm_module_entitlements(workspace_id, project_id, world_id, module_id);

CREATE TABLE nexus_pm_competences (
  competence_id text PRIMARY KEY,
  person_id text NOT NULL REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  requirement_key text NOT NULL,
  record_json jsonb NOT NULL,
  persisted_at timestamptz NOT NULL
);
CREATE INDEX "IDX_nexus_pm_competence_person"
  ON nexus_pm_competences(person_id, requirement_key);
