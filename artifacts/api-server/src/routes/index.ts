import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import tasksRouter from "./tasks";
import plansRouter from "./plans";
import commentsRouter from "./comments";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import demoRouter from "./demo";
import notesRouter from "./notes";
import searchRouter from "./search";
import conversationsRouter from "./conversations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(tasksRouter);
router.use(plansRouter);
router.use(commentsRouter);
router.use(dashboardRouter);
router.use(aiRouter);
router.use(demoRouter);
router.use(notesRouter);
router.use(searchRouter);
router.use(conversationsRouter);

export default router;
