-- NOSMO Nexus repository migration 0003
-- Reconciles the existing #170 one-time non-production identity-claim contract
-- with the canonical ordered migration path introduced by current #162.
-- This does not create a new identity model; it persists the table already
-- represented by nexusIdentityClaimsTable.

CREATE TABLE IF NOT EXISTS nexus_identity_claims (
  claim_id text PRIMARY KEY,
  code_digest text NOT NULL,
  person_id text NOT NULL REFERENCES nexus_pm_people(person_id) ON DELETE RESTRICT,
  project_id text NOT NULL,
  world_id text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  consumed_provider_subject_digest text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS nexus_identity_claim_code_digest_uq
  ON nexus_identity_claims (code_digest);
