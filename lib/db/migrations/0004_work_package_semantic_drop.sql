-- NOSMO Nexus repository migration 0004
-- Canonical first-class Work Package / assignment / checklist / semantic operation persistence.
-- 0003 is intentionally reserved for the integration donor identity-claims migration (#177)
-- so later convergence preserves deterministic migration ordering without filename collision.

CREATE TABLE IF NOT EXISTS nexus_wp_packages (
  package_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  current_revision integer NOT NULL CHECK (current_revision >= 1),
  lifecycle text NOT NULL,
  composition_state text NOT NULL,
  assignment_state text NOT NULL,
  creator_person_id text NOT NULL REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  deadline timestamp with time zone,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_wp_package_scope"
  ON nexus_wp_packages (workspace_id, project_id, world_id, lifecycle, assignment_state);

CREATE TABLE IF NOT EXISTS nexus_wp_package_revisions (
  package_id text NOT NULL REFERENCES nexus_wp_packages(package_id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK (revision >= 1),
  snapshot_json jsonb NOT NULL,
  created_by_person_id text NOT NULL REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  created_at timestamp with time zone NOT NULL,
  PRIMARY KEY (package_id, revision)
);

CREATE TABLE IF NOT EXISTS nexus_wp_package_groups (
  package_id text NOT NULL,
  package_revision integer NOT NULL,
  group_id text NOT NULL,
  group_order integer NOT NULL,
  title text NOT NULL,
  PRIMARY KEY (package_id, package_revision, group_id),
  FOREIGN KEY (package_id, package_revision)
    REFERENCES nexus_wp_package_revisions(package_id, revision) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_wp_group_order"
  ON nexus_wp_package_groups (package_id, package_revision, group_order, group_id);

CREATE TABLE IF NOT EXISTS nexus_wp_package_items (
  package_id text NOT NULL,
  package_revision integer NOT NULL,
  item_id text NOT NULL,
  item_order integer NOT NULL,
  group_id text,
  item_kind text NOT NULL,
  title text NOT NULL,
  required boolean NOT NULL,
  task_id text REFERENCES nexus_pm_tasks(task_id) ON DELETE RESTRICT,
  app_id text,
  module_id text,
  document_id text,
  file_id text,
  drawing_reference_id text,
  checklist_id text,
  evidence_requirement_id text,
  object_context_id text,
  location_context_id text,
  target_capability_requirements_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (package_id, package_revision, item_id),
  FOREIGN KEY (package_id, package_revision)
    REFERENCES nexus_wp_package_revisions(package_id, revision) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_wp_item_order"
  ON nexus_wp_package_items (package_id, package_revision, item_order, item_id);

CREATE TABLE IF NOT EXISTS nexus_wp_checklist_definitions (
  package_id text NOT NULL,
  package_revision integer NOT NULL,
  checklist_id text NOT NULL,
  checklist_revision integer NOT NULL CHECK (checklist_revision >= 1),
  title text NOT NULL,
  PRIMARY KEY (package_id, package_revision, checklist_id, checklist_revision),
  FOREIGN KEY (package_id, package_revision)
    REFERENCES nexus_wp_package_revisions(package_id, revision) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nexus_wp_checklist_definition_items (
  package_id text NOT NULL,
  package_revision integer NOT NULL,
  checklist_id text NOT NULL,
  checklist_revision integer NOT NULL,
  item_id text NOT NULL,
  item_order integer NOT NULL,
  title text NOT NULL,
  required boolean NOT NULL,
  expected_response_type text NOT NULL,
  PRIMARY KEY (package_id, package_revision, checklist_id, checklist_revision, item_id),
  FOREIGN KEY (package_id, package_revision, checklist_id, checklist_revision)
    REFERENCES nexus_wp_checklist_definitions(package_id, package_revision, checklist_id, checklist_revision)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nexus_wp_evidence_requirements (
  package_id text NOT NULL,
  package_revision integer NOT NULL,
  requirement_id text NOT NULL,
  requirement_kind text NOT NULL,
  task_id text REFERENCES nexus_pm_tasks(task_id) ON DELETE RESTRICT,
  required_count integer NOT NULL CHECK (required_count >= 1),
  allowed_evidence_type text NOT NULL,
  description text NOT NULL,
  required_before_finish boolean NOT NULL,
  object_context_id text,
  location_context_id text,
  PRIMARY KEY (package_id, package_revision, requirement_id),
  FOREIGN KEY (package_id, package_revision)
    REFERENCES nexus_wp_package_revisions(package_id, revision) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nexus_wp_assignments (
  assignment_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  package_id text NOT NULL REFERENCES nexus_wp_packages(package_id) ON DELETE RESTRICT,
  assigned_package_revision integer NOT NULL CHECK (assigned_package_revision >= 1),
  recipient_type text NOT NULL CHECK (recipient_type IN ('PERSON', 'OBJECT')),
  recipient_person_id text REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  recipient_object_id text,
  assigned_by_person_id text NOT NULL REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  assigned_at timestamp with time zone NOT NULL,
  assignment_status text NOT NULL,
  deadline_snapshot timestamp with time zone,
  source_semantic_operation_id text NOT NULL,
  lifecycle_state text NOT NULL,
  snapshot_json jsonb NOT NULL,
  FOREIGN KEY (package_id, assigned_package_revision)
    REFERENCES nexus_wp_package_revisions(package_id, revision) ON DELETE RESTRICT,
  CONSTRAINT nexus_wp_assignment_recipient_xor CHECK (
    (recipient_type = 'PERSON' AND recipient_person_id IS NOT NULL AND recipient_object_id IS NULL)
    OR
    (recipient_type = 'OBJECT' AND recipient_object_id IS NOT NULL AND recipient_person_id IS NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_wp_assignment_semantic_operation_uq
  ON nexus_wp_assignments (source_semantic_operation_id);
CREATE UNIQUE INDEX IF NOT EXISTS nexus_wp_assignment_active_recipient_uq
  ON nexus_wp_assignments (
    package_id,
    recipient_type,
    COALESCE(recipient_person_id, ''),
    COALESCE(recipient_object_id, '')
  ) WHERE lifecycle_state = 'ACTIVE';
CREATE INDEX IF NOT EXISTS "IDX_nexus_wp_assignment_scope"
  ON nexus_wp_assignments (workspace_id, project_id, world_id, package_id, lifecycle_state);

CREATE TABLE IF NOT EXISTS nexus_wp_checklist_runs (
  run_id text PRIMARY KEY,
  work_package_assignment_id text NOT NULL REFERENCES nexus_wp_assignments(assignment_id) ON DELETE CASCADE,
  task_id text NOT NULL REFERENCES nexus_pm_tasks(task_id) ON DELETE RESTRICT,
  worker_person_id text NOT NULL REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  checklist_id text NOT NULL,
  checklist_revision integer NOT NULL CHECK (checklist_revision >= 1),
  started_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone,
  completion_state text NOT NULL
);

CREATE TABLE IF NOT EXISTS nexus_wp_checklist_run_responses (
  run_id text NOT NULL REFERENCES nexus_wp_checklist_runs(run_id) ON DELETE CASCADE,
  item_id text NOT NULL,
  response_json jsonb NOT NULL,
  responded_at timestamp with time zone NOT NULL,
  PRIMARY KEY (run_id, item_id)
);

CREATE TABLE IF NOT EXISTS nexus_pm_nexus_events (
  event_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  event_type text NOT NULL,
  correlation_id text,
  record_json jsonb NOT NULL,
  persisted_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_pm_nexus_event_scope"
  ON nexus_pm_nexus_events (workspace_id, project_id, world_id, correlation_id);

CREATE TABLE IF NOT EXISTS nexus_semantic_operation_receipts (
  semantic_operation_id text PRIMARY KEY,
  workspace_id integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  world_id text NOT NULL,
  canonical_fingerprint text NOT NULL,
  semantic_intent text NOT NULL,
  actor_person_id text NOT NULL REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  authority_revision text NOT NULL,
  package_id text REFERENCES nexus_wp_packages(package_id) ON DELETE RESTRICT,
  assignment_id text REFERENCES nexus_wp_assignments(assignment_id) ON DELETE RESTRICT,
  nexus_event_id text NOT NULL REFERENCES nexus_pm_nexus_events(event_id) ON DELETE RESTRICT,
  timeline_event_id text NOT NULL REFERENCES nexus_pm_timeline_events(timeline_event_id) ON DELETE RESTRICT,
  committed_at timestamp with time zone NOT NULL,
  effect_summary_json jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_nexus_semantic_receipt_scope"
  ON nexus_semantic_operation_receipts (workspace_id, project_id, world_id, committed_at);
