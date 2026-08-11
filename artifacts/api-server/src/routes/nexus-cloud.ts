import { Router, type IRouter } from "express";
import {
  createNexusCloudUploadSessionPlan,
  getNexusCloudUploadSessionCapabilities,
  NexusCloudUploadSessionError,
} from "../lib/nexus-cloud-upload-session";

const router: IRouter = Router();

router.get("/nexus-cloud/upload-sessions/capabilities", (_req, res): void => {
  res.json(getNexusCloudUploadSessionCapabilities());
});

router.post("/nexus-cloud/upload-sessions", (req, res): void => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      throw new NexusCloudUploadSessionError("Authenticated workspaceId is required before upload-session planning", 500);
    }

    const plan = createNexusCloudUploadSessionPlan(req.body, {
      workspaceId,
      userId: req.user?.id ?? "unknown-user",
      createdAt: new Date().toISOString(),
    });

    res.status(202).json(plan);
  } catch (err) {
    if (err instanceof NexusCloudUploadSessionError) {
      res.status(err.statusCode).json({
        error: err.message,
        schema: "nexus-cloud-upload-session-error/v1",
      });
      return;
    }

    req.log.error({ err }, "Nexus Cloud upload-session planning failed");
    res.status(500).json({
      error: "Nexus Cloud upload-session planning failed",
      schema: "nexus-cloud-upload-session-error/v1",
    });
  }
});

export default router;
