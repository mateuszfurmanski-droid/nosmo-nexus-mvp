import { Router, type IRouter, type Request, type Response } from "express";
import { buildNexusBrowserSession } from "../lib/nexus-browser-session";

const router: IRouter = Router();

router.get("/nexus/session", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");

  const payload = buildNexusBrowserSession(
    req.isAuthenticated() ? req.user : null,
  );

  if (!payload.authenticated) {
    res.status(401).json(payload);
    return;
  }

  res.json(payload);
});

export default router;
