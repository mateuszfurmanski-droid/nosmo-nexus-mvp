import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { nexusPmPeopleTable } from "./nexusPerson";

export const nexusPersonAgenciesTable = pgTable(
  "nexus_person_agencies",
  {
    agencyId: text("agency_id").primaryKey(),
    name: text("name").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    createdByUserId: varchar("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const nexusPersonAgencyMembersTable = pgTable(
  "nexus_person_agency_members",
  {
    authUserId: varchar("auth_user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    agencyId: text("agency_id")
      .notNull()
      .references(() => nexusPersonAgenciesTable.agencyId, { onDelete: "cascade" }),
    role: text("role").notNull().default("OWNER"),
    status: text("status").notNull().default("ACTIVE"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const nexusPersonAgencyCandidateStatesTable = pgTable(
  "nexus_person_agency_candidate_states",
  {
    agencyId: text("agency_id")
      .notNull()
      .references(() => nexusPersonAgenciesTable.agencyId, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    stage: text("stage").notNull().default("NEW"),
    note: text("note"),
    updatedByUserId: varchar("updated_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "nexus_person_agency_candidate_states_pk",
      columns: [table.agencyId, table.personId],
    }),
  ],
);

export const nexusPersonAgencyActionsTable = pgTable(
  "nexus_person_agency_actions",
  {
    actionId: text("action_id").primaryKey(),
    agencyId: text("agency_id")
      .notNull()
      .references(() => nexusPersonAgenciesTable.agencyId, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    actorUserId: varchar("actor_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    actionType: text("action_type").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("nexus_person_agency_actions_id_agency_uq").on(
      table.actionId,
      table.agencyId,
    ),
  ],
);

export type NexusPersonAgencyRow = typeof nexusPersonAgenciesTable.$inferSelect;
export type NexusPersonAgencyMemberRow =
  typeof nexusPersonAgencyMembersTable.$inferSelect;
export type NexusPersonAgencyCandidateStateRow =
  typeof nexusPersonAgencyCandidateStatesTable.$inferSelect;
export type NexusPersonAgencyActionRow =
  typeof nexusPersonAgencyActionsTable.$inferSelect;
