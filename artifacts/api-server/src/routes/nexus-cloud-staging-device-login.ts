import { Router, type IRouter, type Request } from "express";
import {
  consumeNexusCloudStagingClaim,
  StagingDeviceLoginError,
} from "../lib/nexus-cloud-staging-device-session";

const router: IRouter = Router();

function readClaimCode(req: Request): string {
  const raw =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>).claimCode
      : undefined;
  if (typeof raw !== "string") {
    throw new StagingDeviceLoginError(
      400,
      "CLAIM_CODE_REQUIRED",
      "claimCode is required.",
    );
  }
  return raw;
}

router.post(
  "/nexus/cloud/_staging/device-login",
  async (req, res): Promise<void> => {
    try {
      const result = await consumeNexusCloudStagingClaim(readClaimCode(req));
      res.status(201).json({
        schema: "nexus-cloud-staging-device-login-result/v1",
        environment: "NON_PRODUCTION",
        authentication: "STAGING_DEVICE_CLAIM",
        expiresAt: result.expiresAt.toISOString(),
        token: result.token,
        personId: result.personId,
        projectId: result.projectId,
        worldId: result.worldId,
        workspaceId: result.workspaceId,
      });
    } catch (error) {
      if (error instanceof StagingDeviceLoginError) {
        res.status(error.status).json({
          error: error.code,
          message: error.message,
        });
        return;
      }
      req.log.error({ err: error }, "Cloud staging device login failed");
      res.status(500).json({ error: "STAGING_DEVICE_LOGIN_UNAVAILABLE" });
    }
  },
);

export default router;
