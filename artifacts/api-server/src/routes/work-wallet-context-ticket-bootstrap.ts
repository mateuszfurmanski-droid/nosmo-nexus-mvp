import { Router, type IRouter, type Request, type Response } from "express";
import {
  buildContextTicketBootstrapReturnTo,
  parseContextTicketBootstrapRequest,
  sendContextTicketBootstrapPage,
} from "../lib/nexus-context-ticket-bootstrap";

const router: IRouter = Router();

router.get(
  "/nexus/context-tickets/work-wallet/bootstrap",
  (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");

    const bootstrap = parseContextTicketBootstrapRequest(
      req.query as Record<string, unknown>,
    );
    if (!bootstrap) {
      res
        .status(400)
        .type("text/plain")
        .send("Invalid Nexus Work Wallet connector bootstrap request.");
      return;
    }

    if (!req.isAuthenticated()) {
      const returnTo = buildContextTicketBootstrapReturnTo(bootstrap);
      res.redirect(302, `/api/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    sendContextTicketBootstrapPage(res, bootstrap);
  },
);

export default router;
