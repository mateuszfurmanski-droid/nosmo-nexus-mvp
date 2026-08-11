import { Router, type IRouter, type Request, type Response } from "express";
import { buildNexusBrowserSession } from "../lib/nexus-browser-session";
import {
  NexusIdentityBindingStoreUnavailableError,
  resolveNexusPersonBinding,
} from "../lib/nexus-person-binding";

const router: IRouter = Router();

router.get("/nexus/session", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");

  if (!req.isAuthenticated()) {
    res.status(401).json(buildNexusBrowserSession(null));
    return;
  }

  try {
    const person = await resolveNexusPersonBinding(req.user.id);
    res.json(buildNexusBrowserSession(req.user, person));
  } catch (error) {
    if (error instanceof NexusIdentityBindingStoreUnavailableError) {
      req.log.error({ err: error }, "Nexus identity binding store unavailable");
      res.status(503).json({
        schema: "nexus-browser-session/v1",
        authenticated: true,
        personId: null,
        bindingStatus: "UNBOUND",
        displayName: null,
        canIssueContextTicket: false,
        error: "IDENTITY_BINDING_STORE_UNAVAILABLE",
      });
      return;
    }

    throw error;
  }
});

export default router;
