import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tasksTable, projectsTable, activityTable } from "@workspace/db";
import {
  ListTasksQueryParams,
  ListTasksResponse,
  CreateTaskBody,
  GetTaskParams,
  GetTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const where = parsed.data.projectId
    ? and(eq(tasksTable.workspaceId, workspaceId), eq(tasksTable.projectId, parsed.data.projectId))
    : eq(tasksTable.workspaceId, workspaceId);
  const tasks = await db.select().from(tasksTable).where(where).orderBy(tasksTable.createdAt);
  res.json(ListTasksResponse.parse(tasks));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { dueDate: dueDateIn, ...restIn } = parsed.data;
  // Ensure the target project belongs to this workspace.
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, restIn.projectId), eq(projectsTable.workspaceId, workspaceId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [task] = await db.insert(tasksTable).values({
    ...restIn,
    workspaceId,
    ...(dueDateIn ? { dueDate: dueDateIn.toISOString() } : {}),
  }).returning();
  await db.insert(activityTable).values({
    workspaceId,
    type: "task_created",
    description: `Task created`,
    entityName: task.title,
    projectId: task.projectId ?? null,
  });
  res.status(201).json(GetTaskResponse.parse(task));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.workspaceId, workspaceId)));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(GetTaskResponse.parse(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { dueDate: dueDateUp, ...restUp } = parsed.data;
  const [task] = await db.update(tasksTable).set({
    ...restUp,
    ...(dueDateUp ? { dueDate: dueDateUp.toISOString() } : {}),
    updatedAt: new Date(),
  }).where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.workspaceId, workspaceId))).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  await db.insert(activityTable).values({
    workspaceId,
    type: "task_moved",
    description: `Task moved to ${task.status.replace("_", " ")}`,
    entityName: task.title,
    projectId: task.projectId ?? null,
  });
  res.json(UpdateTaskResponse.parse(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [task] = await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, params.data.id), eq(tasksTable.workspaceId, workspaceId)))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
