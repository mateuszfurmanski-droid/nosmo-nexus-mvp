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
import nexusCloudRouter from "./nexus-cloud";
import { requireWorkspace } from "../middlewares/requireWorkspace";
import { requireNexusCloudMutationOrigin } from "../middlewares/requireNexusCloudMutationOrigin";

const router: IRouter = Router();

// Public routes — no authentication required.
router.use(healthRouter);
router.use(authRouter);
// Historical unauthenticated MVP file storage remains separate from Nexus Cloud.
router.use(filesRouter);

// Cloud write mutations reject cross-site cookie requests before workspace resolution.
// The endpoint then reuses the normal authenticated workspace boundary.
router.use(
  "/nexus/cloud",
  requireNexusCloudMutationOrigin,
  requireWorkspace,
  nexusCloudRouter,
);

// Everything below requires an authenticated user with a resolved workspace.
// `requireWorkspace` returns 401 when unauthenticated and sets `req.workspaceId`.
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
