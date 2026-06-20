import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, projectsTable, tasksTable, plansTable, activityTable } from "@workspace/db";
import { GetDashboardSummaryResponse, GetRecentActivityResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const [projects, tasks, plans] = await Promise.all([
    db.select().from(projectsTable).where(eq(projectsTable.workspaceId, workspaceId)),
    db.select().from(tasksTable).where(eq(tasksTable.workspaceId, workspaceId)),
    db.select().from(plansTable).where(eq(plansTable.workspaceId, workspaceId)),
  ]);

  const summary = {
    totalProjects: projects.length,
    totalPlans: plans.length,
    openTasks: tasks.filter((t) => t.status === "todo").length,
    inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
    completedTasks: tasks.filter((t) => t.status === "done").length,
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const activity = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.workspaceId, workspaceId))
    .orderBy(desc(activityTable.createdAt))
    .limit(20);
  res.json(GetRecentActivityResponse.parse(activity));
});

export default router;
