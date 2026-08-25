-- NOSMO Nexus repository migration 0003
-- Non-production real-device onboarding claim layered on the canonical #162 Core schema.
-- Only high-entropy claim-code digests are persisted; raw provider subjects remain outside storage.

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
