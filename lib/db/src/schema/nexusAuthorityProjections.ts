import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";
import { nexusPmPeopleTable } from "./nexusProjectMemoryIdentity";

// Durable representations of existing frozen B2 repository contracts only.
export const nexusPmModuleEntitlementsTable = pgTable("nexus_pm_module_entitlements", {
  entitlementId: text("entitlement_id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull(), worldId: text("world_id").notNull(),
  moduleId: text("module_id").notNull(),
  recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
  persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
}, (t) => [index("IDX_nexus_pm_entitlement_scope").on(t.workspaceId, t.projectId, t.worldId, t.moduleId)]);

export const nexusPmCompetencesTable = pgTable("nexus_pm_competences", {
  competenceId: text("competence_id").primaryKey(),
  personId: text("person_id").notNull().references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
  requirementKey: text("requirement_key").notNull(),
  recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
  persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
}, (t) => [index("IDX_nexus_pm_competence_person").on(t.personId, t.requirementKey)]);
