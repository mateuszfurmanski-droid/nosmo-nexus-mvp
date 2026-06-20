import { type Request, type Response, type NextFunction } from "express";
import { ensureWorkspace } from "../lib/workspace";

declare global {
  namespace Express {
    interface Request {
      workspaceId?: number;
    }
  }
}

/**
 * Gate for all per-user data routes. Requires an authenticated user, resolves
 * (or lazily creates) their workspace, and exposes `req.workspaceId` for
 * downstream handlers to scope every query.
 */
export async function requireWorkspace(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const workspace = await ensureWorkspace(req.user.id, req.user.firstName);
    req.workspaceId = workspace.id;
    next();
  } catch (err) {
    req.log.error({ err }, "Failed to resolve workspace");
    res.status(500).json({ error: "Failed to resolve workspace" });
  }
}
