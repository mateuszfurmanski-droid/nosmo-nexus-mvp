import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, projectsTable, tasksTable, plansTable, activityTable } from "@workspace/db";
import { GetDashboardSummaryResponse, GetRecentActivityResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const tasks = await db.select().from(tasksTable);
  const plans = await db.select().from(plansTable);

  const summary = {
    totalProjects: projects.length,
    totalPlans: plans.length,
    openTasks: tasks.filter(t => t.status === "todo").length,
    inProgressTasks: tasks.filter(t => t.status === "in_progress").length,
    completedTasks: tasks.filter(t => t.status === "done").length,
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const activity = await db.select().from(activityTable).orderBy(desc(activityTable.createdAt)).limit(20);
  res.json(GetRecentActivityResponse.parse(activity));
});

export default router;
