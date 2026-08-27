import express, { type Express, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import { requireNexusCloudMutationOrigin } from "./middlewares/requireNexusCloudMutationOrigin";
import nexusCloudRouter from "./routes/nexus-cloud";
import nexusCloudStagingDeviceLoginRouter from "./routes/nexus-cloud-staging-device-login";
import nexusCloudStagingControlRouter from "./routes/nexus-cloud-staging-control";
import nexusJobSearchRouter from "./routes/nexus-job-search";
import nexusJobAiMatchRouter from "./routes/nexus-job-ai-match";
import { logger } from "./lib/logger";
import { runNexusCloudRuntimePreflight } from "./lib/nexus-cloud-runtime-preflight";

/**
 * Narrow serverless staging runtime for the real Nexus Cloud backend path.
 *
 * Deliberately excludes the web UI, generic MVP routes and Work Wallet. It
 * mounts the existing authenticated Cloud router unchanged so staging can
 * validate the real identity/access/provider/persistence boundary without
 * coupling the exercise to a frontend deployment.
 */
const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex");
  next();
});

app.get("/api/nexus/cloud/_staging/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "nosmo-nexus-cloud-staging-runtime",
    environment: "non-production",
    cloudRouter: "canonical-repo-router",
    postgresIdentityBindingConfigured:
      process.env.NEXUS_IDENTITY_BINDING_MODE === "postgres",
    providerWriteReleased: false,
  });
});

const runSanitizedPreflight = async (
  req: Request,
  res: Response,
  providerProbeRequested: boolean,
): Promise<void> => {
  try {
    const result = await runNexusCloudRuntimePreflight({
      ...process.env,
      NEXUS_CLOUD_PREFLIGHT_PROVIDER_PROBE: providerProbeRequested
        ? "true"
        : "false",
    });
    res.json(result);
  } catch (error) {
    req.log?.error?.({ err: error }, "Nexus Cloud staging preflight failed");
    res.status(500).json({
      schema: "nexus-cloud-runtime-preflight/v1",
      status: "BLOCKED",
      error: "NEXUS_CLOUD_STAGING_PREFLIGHT_FAILED",
      secretValuesReturned: false,
      providerWritePerformed: false,
      databaseMutationPerformed: false,
    });
  }
};

/**
 * Sanitized staging-only runtime audit. The optional provider probe performs
 * OAuth exchange plus GET-only Drive folder metadata/capability reads. No token
 * or credential value is accepted from the request or returned in the response.
 */
app.get("/api/nexus/cloud/_staging/preflight", async (req, res) => {
  const providerProbeRequested =
    req.get("x-nexus-provider-probe") === "read-only" ||
    req.query.probe === "read-only";
  await runSanitizedPreflight(req, res, providerProbeRequested);
});

/**
 * Path-only form of the same explicit GET-only provider probe. This exists so
 * protected Vercel previews can be exercised without a query-string transport
 * edge. It does not release writes and accepts no credential material.
 */
app.get("/api/nexus/cloud/_staging/preflight/read-only", async (req, res) => {
  await runSanitizedPreflight(req, res, true);
});

// Multipart upload parsing is owned by nexusCloudRouter/multer. Generic parsers
// do not consume multipart bodies and remain available for future narrow API
// additions.
// Public read-only job discovery gateway. It accepts no secret material and performs no external write/application action.
app.use("/api", nexusJobSearchRouter);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(authMiddleware);

// Authenticated AI refinement. Only bounded work-profile fields and normalized Job Objects are accepted.
app.use("/api", nexusJobAiMatchRouter);

// NON_PRODUCTION only: one-time canonical staging session bootstrap. The claim
// code is high-entropy, expiring and consumed atomically; no raw provider
// subject is accepted or persisted.
app.use("/api", nexusCloudStagingDeviceLoginRouter);
app.use("/api", nexusCloudStagingControlRouter);

app.use(
  "/api/nexus/cloud",
  requireNexusCloudMutationOrigin,
  nexusCloudRouter,
);

export default app;
