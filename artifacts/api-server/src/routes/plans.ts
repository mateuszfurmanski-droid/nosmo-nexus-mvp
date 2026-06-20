import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, plansTable, projectsTable, activityTable } from "@workspace/db";
import {
  ListPlansQueryParams,
  ListPlansResponse,
  CreatePlanBody,
  GetPlanParams,
  GetPlanResponse,
  DeletePlanParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Columns returned to clients — never include the heavy base64 fileData blob.
const planColumns = {
  id: plansTable.id,
  projectId: plansTable.projectId,
  filename: plansTable.filename,
  originalName: plansTable.originalName,
  fileSize: plansTable.fileSize,
  mimeType: plansTable.mimeType,
  status: plansTable.status,
  analysisResult: plansTable.analysisResult,
  createdAt: plansTable.createdAt,
  hasFile: sql<boolean>`(${plansTable.fileData} IS NOT NULL)`,
};

router.get("/plans", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const parsed = ListPlansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const where = parsed.data.projectId
    ? and(eq(plansTable.workspaceId, workspaceId), eq(plansTable.projectId, parsed.data.projectId))
    : eq(plansTable.workspaceId, workspaceId);
  const plans = await db.select(planColumns).from(plansTable).where(where).orderBy(plansTable.createdAt);
  res.json(ListPlansResponse.parse(plans));
});

router.post("/plans", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const parsed = CreatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { fileData, ...meta } = parsed.data;
  // Ensure the target project belongs to this workspace.
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, meta.projectId), eq(projectsTable.workspaceId, workspaceId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const hasFile = typeof fileData === "string" && fileData.length > 0;
  // Only accept genuine PDFs: enforce MIME and verify the %PDF- file signature.
  if (hasFile) {
    if (meta.mimeType && meta.mimeType !== "application/pdf") {
      res.status(400).json({ error: "Only PDF files are supported" });
      return;
    }
    const header = Buffer.from(fileData.slice(0, 16), "base64").toString("latin1");
    if (!header.startsWith("%PDF-")) {
      res.status(400).json({ error: "File is not a valid PDF" });
      return;
    }
  }
  const [plan] = await db
    .insert(plansTable)
    .values({ ...meta, workspaceId, fileData: hasFile ? fileData : null, status: hasFile ? "processing" : "uploaded" })
    .returning(planColumns);
  await db.insert(activityTable).values({
    workspaceId,
    type: "plan_uploaded",
    description: `PDF plan uploaded`,
    entityName: plan.originalName,
    projectId: plan.projectId ?? null,
  });
  // Mocked analysis: simulate async processing, then mark ready.
  if (hasFile) {
    setTimeout(async () => {
      await db.update(plansTable).set({
        status: "ready",
        analysisResult: JSON.stringify({
          pages: Math.floor(Math.random() * 20) + 5,
          summary: "Drawing set stored and indexed. AI sheet analysis is mocked in this build.",
        }),
      }).where(eq(plansTable.id, plan.id));
    }, 2000);
  }
  res.status(201).json(GetPlanResponse.parse(plan));
});

router.get("/plans/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = GetPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [plan] = await db
    .select(planColumns)
    .from(plansTable)
    .where(and(eq(plansTable.id, params.data.id), eq(plansTable.workspaceId, workspaceId)));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(GetPlanResponse.parse(plan));
});

// Stream the stored file back from the database (base64 -> binary).
router.get("/plans/:id/file", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const id = parseInt(req.params.id ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select({ fileData: plansTable.fileData, mimeType: plansTable.mimeType, originalName: plansTable.originalName })
    .from(plansTable)
    .where(and(eq(plansTable.id, id), eq(plansTable.workspaceId, workspaceId)));
  if (!row || !row.fileData) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const buffer = Buffer.from(row.fileData, "base64");
  // Never trust the stored MIME — always serve as PDF and block content sniffing.
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(row.originalName)}"`);
  res.setHeader("Content-Length", String(buffer.length));
  res.send(buffer);
});

router.delete("/plans/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = DeletePlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [plan] = await db
    .delete(plansTable)
    .where(and(eq(plansTable.id, params.data.id), eq(plansTable.workspaceId, workspaceId)))
    .returning({ id: plansTable.id });
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
