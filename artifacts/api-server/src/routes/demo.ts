import { Router, type IRouter } from "express";
import { db, projectsTable, tasksTable, plansTable, activityTable } from "@workspace/db";

const router: IRouter = Router();

const DEMO_PROJECTS = [
  {
    name: "One Circular Quay — Tower B",
    description: "Premium residential tower, 54 floors, 380 apartments. Structural concrete frame with glass curtain wall.",
    status: "active" as const,
    location: "Sydney CBD, NSW",
  },
  {
    name: "Perth Convention Centre Expansion",
    description: "6,000 sqm conference hall addition with basement car park and landscaped forecourt.",
    status: "active" as const,
    location: "Perth, WA",
  },
  {
    name: "Gold Coast Light Rail Stage 4",
    description: "5.8km extension including 6 stations, at-grade and elevated sections.",
    status: "on_hold" as const,
    location: "Gold Coast, QLD",
  },
];

const DEMO_TASKS = [
  { title: "Concrete pour — Level 22 slab", status: "done" as const, priority: "high" as const, assignee: "Marcus Webb" },
  { title: "Curtain wall installation — Floors 10–18", status: "in_progress" as const, priority: "high" as const, assignee: "Sarah Chen" },
  { title: "MEP coordination — Floors 5–9", status: "in_progress" as const, priority: "medium" as const, assignee: "Tom Bradley" },
  { title: "Submit for building permit — Stage 2", status: "todo" as const, priority: "high" as const, assignee: "Lisa Torres" },
  { title: "Waterproofing inspection — Basement B2", status: "todo" as const, priority: "medium" as const, assignee: "James Park" },
  { title: "Scaffold erection — East elevation", status: "done" as const, priority: "medium" as const, assignee: "David Kim" },
  { title: "Fire services rough-in — Levels 1–4", status: "todo" as const, priority: "medium" as const, assignee: "Sarah Chen" },
  { title: "Pre-pour inspection — Level 23", status: "todo" as const, priority: "high" as const, assignee: "Marcus Webb" },
];

const DEMO_PLANS = [
  { filename: "A-100_architectural_floor_plans.pdf", originalName: "A-100 Architectural Floor Plans.pdf", status: "ready" as const },
  { filename: "S-200_structural_steel_framing.pdf", originalName: "S-200 Structural Steel Framing.pdf", status: "ready" as const },
  { filename: "M-300_mechanical_services.pdf", originalName: "M-300 Mechanical Services.pdf", status: "processing" as const },
  { filename: "E-400_electrical_layout.pdf", originalName: "E-400 Electrical Layout.pdf", status: "uploaded" as const },
  { filename: "C-500_civil_site_works.pdf", originalName: "C-500 Civil Site Works.pdf", status: "ready" as const },
];

router.post("/demo/seed", async (req, res): Promise<void> => {
  const createdProjects = [];

  for (const p of DEMO_PROJECTS) {
    const [project] = await db.insert(projectsTable).values(p).returning();
    createdProjects.push(project);
    await db.insert(activityTable).values({
      type: "project_created",
      description: "Project created",
      entityName: project.name,
      projectId: project.id,
    });
  }

  const primaryProject = createdProjects[0];
  let tasksCreated = 0;

  for (const t of DEMO_TASKS) {
    const projectId = createdProjects[tasksCreated % createdProjects.length].id;
    const [task] = await db.insert(tasksTable).values({
      ...t,
      projectId,
      description: `Detailed scope: ${t.title.toLowerCase()}. Contractor responsible for all materials and compliance.`,
    }).returning();
    await db.insert(activityTable).values({
      type: "task_created",
      description: "Task created",
      entityName: task.title,
      projectId: task.projectId ?? null,
    });
    tasksCreated++;
  }

  let plansCreated = 0;
  for (const pl of DEMO_PLANS) {
    await db.insert(plansTable).values({
      ...pl,
      projectId: primaryProject.id,
      fileSize: Math.floor(Math.random() * 10_000_000) + 2_000_000,
      analysisResult: pl.status === "ready" ? JSON.stringify({
        pages: Math.floor(Math.random() * 24) + 4,
        summary: "Drawing set processed successfully. All sheets stamped current revision.",
      }) : null,
    });
    if (pl.status !== "uploaded") {
      await db.insert(activityTable).values({
        type: "plan_uploaded",
        description: "PDF plan uploaded",
        entityName: pl.originalName,
        projectId: primaryProject.id,
      });
    }
    plansCreated++;
  }

  res.json({
    message: "Demo data seeded successfully",
    projectsCreated: createdProjects.length,
    tasksCreated,
    plansCreated,
  });
});

export default router;
