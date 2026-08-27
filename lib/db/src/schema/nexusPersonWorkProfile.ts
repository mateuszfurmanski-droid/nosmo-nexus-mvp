import { jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { nexusPmPeopleTable } from "./nexusProjectMemoryIdentity";

export const nexusPersonOnboardingInvitesTable = pgTable(
  "nexus_person_onboarding_invites",
  {
    inviteId: text("invite_id").primaryKey(),
    tokenDigest: text("token_digest").notNull(),
    agency: text("agency").notNull(),
    suggestedTrade: text("suggested_trade"),
    suggestedLocation: text("suggested_location"),
    message: text("message"),
    status: text("status").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimedPersonId: text("claimed_person_id").references(
      () => nexusPmPeopleTable.personId,
      { onDelete: "restrict" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
  },
  (table) => [
    unique("nexus_person_onboarding_invite_token_digest_uq").on(table.tokenDigest),
    unique("nexus_person_onboarding_invite_claimed_person_uq").on(
      table.claimedPersonId,
    ),
  ],
);

export const nexusPersonWorkProfilesTable = pgTable(
  "nexus_person_work_profiles",
  {
    personId: text("person_id")
      .primaryKey()
      .references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    schemaVersion: text("schema_version").notNull(),
    status: text("status").notNull(),
    sourceInviteId: text("source_invite_id")
      .notNull()
      .references(() => nexusPersonOnboardingInvitesTable.inviteId, {
        onDelete: "restrict",
      }),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("nexus_person_work_profiles_source_invite_uq").on(table.sourceInviteId),
  ],
);

export type NexusPersonOnboardingInviteRow =
  typeof nexusPersonOnboardingInvitesTable.$inferSelect;
export type NexusPersonWorkProfileRow =
  typeof nexusPersonWorkProfilesTable.$inferSelect;
