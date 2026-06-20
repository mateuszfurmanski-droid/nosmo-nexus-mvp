import { db, workspacesTable, projectsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Workspace } from "@workspace/db";

/**
 * Resolve the workspace for a user, creating it (and a starter project) on
 * first access. One workspace per user, enforced by a unique constraint on
 * `workspaces.owner_id`.
 */
export async function ensureWorkspace(
  userId: string,
  firstName?: string | null,
): Promise<Workspace> {
  const [existing] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.ownerId, userId));
  if (existing) return existing;

  const name = firstName ? `${firstName}'s Workspace` : "My Workspace";

  const [created] = await db
    .insert(workspacesTable)
    .values({ ownerId: userId, name })
    .onConflictDoNothing({ target: workspacesTable.ownerId })
    .returning();

  if (created) {
    // Seed a starter project so the workspace is not empty on first login.
    const [project] = await db
      .insert(projectsTable)
      .values({
        workspaceId: created.id,
        name: "NOSMO Nexus MVP",
        description: "Your first project on the NOSMO Nexus platform.",
        status: "active",
        location: "Poland / UK",
      })
      .returning({ id: projectsTable.id });
    // Seed a first timeline entry for the starter project.
    await db.insert(activityTable).values({
      workspaceId: created.id,
      type: "project_created",
      description: "Project created",
      entityName: "NOSMO Nexus MVP",
      projectId: project?.id ?? null,
    });
    return created;
  }

  // Lost a creation race — fetch the row the other request created.
  const [raced] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.ownerId, userId));
  if (!raced) {
    throw new Error(`Failed to resolve workspace for user ${userId}`);
  }
  return raced;
}
