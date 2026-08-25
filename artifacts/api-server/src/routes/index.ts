import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import plansRouter from "./plans";
import commentsRouter from "./comments";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import notesRouter from "./notes";
import searchRouter from "./search";
import conversationsRouter from "./conversations";
import filesRouter from "./files";
import nexusCoreIdentityClaimRouter from "./nexus-core-identity-claim";
import nexusCoreE2eRouter from "./nexus-core-e2e";
import { requireWorkspace } from "../middlewares/requireWorkspace";
import { resolveNexusCoreWorkspace } from "../middlewares/resolveNexusCoreWorkspace";

const router: IRouter = Router();

// Public routes — no authentication required.
router.use(healthRouter);
router.use(authRouter);
// Unauthenticated MVP file storage (upload + auto-processing). Public by design.
router.use(filesRouter);

// One-time identity claim must run after authMiddleware but before Core workspace
// resolution because its sole purpose is to create the exact provider-subject-digest
// -> canonical Person binding needed by the downstream Core authority boundary.
router.use(nexusCoreIdentityClaimRouter);

// Canonical Core resolves the shared project workspace from authenticated Person ->
// exactly one active Project Participation. It must not use the legacy personal starter
// workspace because manager and recipient are distinct authenticated users.
router.use(resolveNexusCoreWorkspace);
router.use(nexusCoreE2eRouter);

// Legacy MVP routes below continue to use the existing one-workspace-per-user boundary.
router.use(requireWorkspace);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(plansRouter);
router.use(commentsRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(notesRouter);
router.use(searchRouter);
router.use(conversationsRouter);

export default router;
