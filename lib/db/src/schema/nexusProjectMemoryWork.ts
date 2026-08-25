import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";
import { nexusPmPeopleTable } from "./nexusProjectMemoryIdentity";

/**
 * Durable persistence for the canonical PR #90 Task / Evidence / Approval / Timeline
 * records used by the e-SAFE core work cycle. Full domain truth stays in recordJson;
 * indexed columns exist only for exact workspace/project/world runtime lookups.
 */
export const nexusPmTasksTable = pgTable(
  "nexus_pm_tasks",
  {
    taskId: text("task_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    taskStatus: text("task_status").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("IDX_nexus_pm_task_scope").on(
      table.workspaceId,
      table.projectId,
      table.worldId,
      table.taskStatus,
    ),
  ],
);

export const nexusPmEvidenceTable = pgTable(
  "nexus_pm_evidence",
  {
    evidenceId: text("evidence_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    linkedTaskId: text("linked_task_id").references(() => nexusPmTasksTable.taskId, {
      onDelete: "restrict",
    }),
    evidenceStatus: text("evidence_status").notNull(),
    evidenceType: text("evidence_type").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("IDX_nexus_pm_evidence_task_scope").on(
      table.workspaceId,
      table.projectId,
      table.worldId,
      table.linkedTaskId,
      table.evidenceStatus,
    ),
  ],
);

export const nexusPmApprovalsTable = pgTable(
  "nexus_pm_approvals",
  {
    approvalId: text("approval_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    approvalStatus: text("approval_status").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("IDX_nexus_pm_approval_scope").on(
      table.workspaceId,
      table.projectId,
      table.worldId,
      table.approvalStatus,
    ),
  ],
);

export const nexusPmTimelineEventsTable = pgTable(
  "nexus_pm_timeline_events",
  {
    timelineEventId: text("timeline_event_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    eventType: text("event_type").notNull(),
    eventAt: timestamp("event_at", { withTimezone: true }).notNull(),
    actorPersonId: text("actor_person_id").references(() => nexusPmPeopleTable.personId, {
      onDelete: "restrict",
    }),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
    commitFingerprint: text("commit_fingerprint").notNull(),
  },
  (table) => [
    index("IDX_nexus_pm_timeline_scope").on(
      table.workspaceId,
      table.projectId,
      table.worldId,
      table.eventAt,
    ),
  ],
);

export type NexusPmTaskRow = typeof nexusPmTasksTable.$inferSelect;
export type NexusPmEvidenceRow = typeof nexusPmEvidenceTable.$inferSelect;
export type NexusPmApprovalRow = typeof nexusPmApprovalsTable.$inferSelect;
export type NexusPmTimelineEventRow = typeof nexusPmTimelineEventsTable.$inferSelect;
