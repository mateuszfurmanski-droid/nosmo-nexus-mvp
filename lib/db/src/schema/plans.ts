import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  fileData: text("file_data"),
  status: text("status").notNull().default("uploaded"),
  analysisResult: text("analysis_result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ id: true, createdAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;
