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
import nexusAndroidWorkModeRouter from "./nexus-android-work-mode";
import { androidWorkModeRequestBoundary } from "../middlewares/androidWorkModeRequestBoundary";
import { requireWorkspace } from "../middlewares/requireWorkspace";

const router: IRouter = Router();

// Public routes — no authentication required.
router.use(healthRouter);
router.use(authRouter);
// Unauthenticated MVP file storage (upload + auto-processing). Public by design.
router.use(filesRouter);

// Android Work Mode reuses existing Nexus auth. The transport boundary permits only
// same-origin browser-cookie POSTs or the existing Bearer session token, then the route
// itself enforces authenticated-session and fail-closed Person/access semantics.
router.use(androidWorkModeRequestBoundary);
router.use(nexusAndroidWorkModeRouter);

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
