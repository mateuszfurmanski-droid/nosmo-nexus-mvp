import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import nexusSessionRouter from "./nexus-session";
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
import { requireWorkspace } from "../middlewares/requireWorkspace";

const router: IRouter = Router();

// Public/bootstrap routes. nexusSessionRouter performs its own authenticated check
// so an authenticated but canonically-unbound account can be reported without
// requiring a workspace or inventing a Nexus personId.
router.use(healthRouter);
router.use(authRouter);
router.use(nexusSessionRouter);
// Unauthenticated MVP file storage (upload + auto-processing). Public by design.
router.use(filesRouter);

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
