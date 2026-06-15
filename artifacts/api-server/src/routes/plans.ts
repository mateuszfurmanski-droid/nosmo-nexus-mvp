import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, plansTable, activityTable } from "@workspace/db";
import {
  ListPlansQueryParams,
  ListPlansResponse,
  CreatePlanBody,
  GetPlanParams,
  GetPlanResponse,
  DeletePlanParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/plans", async (req, res): Promise<void> => {
  const parsed = ListPlansQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const plans = parsed.data.projectId
    ? await db.select().from(plansTable).where(eq(plansTable.projectId, parsed.data.projectId)).orderBy(plansTable.createdAt)
    : await db.select().from(plansTable).orderBy(plansTable.createdAt);
  res.json(ListPlansResponse.parse(plans));
});

router.post("/plans", async (req, res): Promise<void> => {
  const parsed = CreatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [plan] = await db.insert(plansTable).values(parsed.data).returning();
  await db.insert(activityTable).values({
    type: "plan_uploaded",
    description: `PDF plan uploaded`,
    entityName: plan.originalName,
  });
  // Mock: simulate async analysis after 2 seconds
  setTimeout(async () => {
    await db.update(plansTable).set({
      status: "ready",
      analysisResult: JSON.stringify({
        pages: Math.floor(Math.random() * 20) + 5,
        sheets: ["A-001 Site Plan", "S-001 Foundation", "M-001 Mechanical", "E-001 Electrical"],
        summary: "Drawing set contains site, structural, mechanical, and electrical plans. All sheets are marked current revision.",
      }),
    }).where(eq(plansTable.id, plan.id));
  }, 2000);
  res.status(201).json(GetPlanResponse.parse(plan));
});

router.get("/plans/:id", async (req, res): Promise<void> => {
  const params = GetPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, params.data.id));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(GetPlanResponse.parse(plan));
});

router.delete("/plans/:id", async (req, res): Promise<void> => {
  const params = DeletePlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [plan] = await db.delete(plansTable).where(eq(plansTable.id, params.data.id)).returning();
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
