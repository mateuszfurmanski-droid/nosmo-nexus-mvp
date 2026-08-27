import { jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * Canonical Nexus Person persistence shared by every runtime integration.
 *
 * `personId` is Nexus-owned and must never be replaced by an OIDC subject,
 * email address, connector identifier or browser-supplied identity. The full
 * Project Memory Person record remains the canonical source payload.
 */
export const nexusPmPeopleTable = pgTable("nexus_pm_people", {
  personId: text("person_id").primaryKey(),
  displayName: text("display_name").notNull(),
  personType: text("person_type").notNull(),
  status: text("status").notNull(),
  recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
  persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
});

/**
 * Exact server-owned authentication-provider -> canonical Person binding.
 *
 * Raw provider subjects are not persisted. Runtime resolves only exact
 * normalized issuer/provider + SHA-256 subject digest. No email/name matching
 * and no automatic Person creation are permitted.
 */
export const nexusIdentityBindingsTable = pgTable(
  "nexus_identity_bindings",
  {
    bindingId: text("binding_id").primaryKey(),
    provider: text("provider").notNull(),
    providerSubjectDigest: text("provider_subject_digest").notNull(),
    personId: text("person_id")
      .notNull()
      .references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    status: text("status").notNull().default("ACTIVE"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    unique("nexus_identity_provider_subject_digest_uq").on(
      table.provider,
      table.providerSubjectDigest,
    ),
  ],
);

/**
 * One-time non-production identity claim. Only a digest of the high-entropy
 * claim code is persisted; the staging provider subject is also stored only as
 * its digest when the claim is consumed.
 */
export const nexusIdentityClaimsTable = pgTable(
  "nexus_identity_claims",
  {
    claimId: text("claim_id").primaryKey(),
    codeDigest: text("code_digest").notNull(),
    personId: text("person_id")
      .notNull()
      .references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    consumedProviderSubjectDigest: text("consumed_provider_subject_digest"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("nexus_identity_claim_code_digest_uq").on(table.codeDigest)],
);

export type NexusPmPersonRow = typeof nexusPmPeopleTable.$inferSelect;
export type NexusIdentityBindingRow = typeof nexusIdentityBindingsTable.$inferSelect;
export type NexusIdentityClaimRow = typeof nexusIdentityClaimsTable.$inferSelect;
