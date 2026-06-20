import { Router, type IRouter } from "express";
import { eq, and, count, desc } from "drizzle-orm";
import { db, projectsTable, tasksTable, plansTable, activityTable } from "@workspace/db";
import {
  ListProjectsResponse,
  CreateProjectBody,
  GetProjectParams,
  GetProjectResponse,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
  GetProjectStatsParams,
  GetProjectStatsResponse,
  GetProjectActivityParams,
  GetProjectActivityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.workspaceId, workspaceId))
    .orderBy(desc(projectsTable.createdAt));
  res.json(ListProjectsResponse.parse(projects));
});

router.post("/projects", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db.insert(projectsTable).values({ ...parsed.data, workspaceId }).returning();
  await db.insert(activityTable).values({
    workspaceId,
    type: "project_created",
    description: `Project created`,
    entityName: project.name,
    projectId: project.id,
  });
  res.status(201).json(GetProjectResponse.parse(project));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.workspaceId, workspaceId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetProjectResponse.parse(project));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.workspaceId, workspaceId)))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(UpdateProjectResponse.parse(project));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.workspaceId, workspaceId)))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/projects/:id/stats", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = GetProjectStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const projectId = params.data.id;
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.workspaceId, workspaceId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.projectId, projectId), eq(tasksTable.workspaceId, workspaceId)));
  const [plansCount] = await db
    .select({ value: count() })
    .from(plansTable)
    .where(and(eq(plansTable.projectId, projectId), eq(plansTable.workspaceId, workspaceId)));
  const stats = {
    projectId,
    totalTasks: tasks.length,
    todoTasks: tasks.filter((t) => t.status === "todo").length,
    inProgressTasks: tasks.filter((t) => t.status === "in_progress").length,
    doneTasks: tasks.filter((t) => t.status === "done").length,
    totalPlans: plansCount?.value ?? 0,
  };
  res.json(GetProjectStatsResponse.parse(stats));
});

router.get("/projects/:id/activity", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = GetProjectActivityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const projectId = params.data.id;
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.workspaceId, workspaceId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const activity = await db
    .select()
    .from(activityTable)
    .where(and(eq(activityTable.projectId, projectId), eq(activityTable.workspaceId, workspaceId)))
    .orderBy(desc(activityTable.createdAt))
    .limit(30);
  res.json(GetProjectActivityResponse.parse(activity));
});

export default router;
