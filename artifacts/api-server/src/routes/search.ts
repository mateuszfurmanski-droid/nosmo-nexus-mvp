import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, tasksTable, plansTable, notesTable } from "@workspace/db";
import { ilike, or, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q || q.length < 1) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }
  const pattern = `%${q}%`;

  const [projects, tasks, plans, notes] = await Promise.all([
    db
      .select()
      .from(projectsTable)
      .where(or(ilike(projectsTable.name, pattern), ilike(projectsTable.description, pattern), ilike(projectsTable.location, pattern)))
      .limit(10),
    db
      .select()
      .from(tasksTable)
      .where(or(ilike(tasksTable.title, pattern), ilike(tasksTable.description, pattern), ilike(tasksTable.assignee, pattern)))
      .limit(10),
    db
      .select()
      .from(plansTable)
      .where(or(ilike(plansTable.originalName, pattern), ilike(plansTable.filename, pattern)))
      .limit(10),
    db
      .select()
      .from(notesTable)
      .where(or(ilike(notesTable.title, pattern), ilike(notesTable.content, pattern)))
      .limit(10),
  ]);

  // Fetch project names for tasks/plans/notes
  const projectIds = [
    ...new Set([
      ...tasks.map((t) => t.projectId),
      ...plans.map((p) => p.projectId),
      ...notes.map((n) => n.projectId),
    ]),
  ];
  const projectMap: Record<number, string> = {};
  if (projectIds.length > 0) {
    const relatedProjects = await db
      .select({ id: projectsTable.id, name: projectsTable.name })
      .from(projectsTable);
    for (const p of relatedProjects) {
      projectMap[p.id] = p.name;
    }
  }
  for (const p of projects) {
    projectMap[p.id] = p.name;
  }

  type ResultItem = {
    id: number;
    type: "project" | "task" | "plan" | "note";
    title: string;
    excerpt: string | null;
    projectId: number | null;
    projectName: string | null;
  };

  const results: ResultItem[] = [
    ...projects.map((p) => ({
      id: p.id,
      type: "project" as const,
      title: p.name,
      excerpt: p.description ?? p.location ?? null,
      projectId: p.id,
      projectName: p.name,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      excerpt: t.description ?? `Status: ${t.status}`,
      projectId: t.projectId,
      projectName: projectMap[t.projectId] ?? null,
    })),
    ...plans.map((p) => ({
      id: p.id,
      type: "plan" as const,
      title: p.originalName,
      excerpt: `Status: ${p.status}`,
      projectId: p.projectId,
      projectName: projectMap[p.projectId] ?? null,
    })),
    ...notes.map((n) => ({
      id: n.id,
      type: "note" as const,
      title: n.title,
      excerpt: n.content.slice(0, 120) || null,
      projectId: n.projectId,
      projectName: projectMap[n.projectId] ?? null,
    })),
  ];

  res.json({ query: q, results, total: results.length });
});

export default router;
