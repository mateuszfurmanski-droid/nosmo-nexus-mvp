import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import nexusSessionRouter from "./nexus-session";
import workWalletContextTicketBootstrapRouter from "./work-wallet-context-ticket-bootstrap";
import workWalletContextTicketRouter from "./work-wallet-context-tickets";
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

// Public/auth-aware routes. nexus-session is read-only and returns 401 when no
// authenticated Nexus session exists; it never promotes provider identity to Person.
router.use(healthRouter);
router.use(authRouter);
router.use(nexusSessionRouter);

// The bootstrap route is auth-aware and may redirect through the existing login
// flow before any workspace gate. It carries non-secret connector metadata only.
router.use(workWalletContextTicketBootstrapRouter);

// Work Wallet Context Ticket exchange must be reachable by an exact configured
// extension origin without a browser cookie. Its issue route applies
// `requireWorkspace` locally and remains authenticated + same-origin only.
router.use(workWalletContextTicketRouter);

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
