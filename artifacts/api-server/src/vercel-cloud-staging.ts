import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import { requireNexusCloudMutationOrigin } from "./middlewares/requireNexusCloudMutationOrigin";
import { requireWorkspace } from "./middlewares/requireWorkspace";
import nexusCloudRouter from "./routes/nexus-cloud";
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

/**
 * Sanitized staging-only runtime audit. The optional provider probe is enabled
 * by an explicit non-secret switch and performs OAuth exchange plus GET-only
 * Drive folder metadata/capability reads. The query/header contains no token or
 * credential value. The preflight contract never returns OAuth values, database
 * credentials, or performs provider/database writes.
 */
app.get("/api/nexus/cloud/_staging/preflight", async (req, res) => {
  try {
    const providerProbeRequested =
      req.get("x-nexus-provider-probe") === "read-only" ||
      req.query.probe === "read-only";
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
});

// Multipart upload parsing is owned by nexusCloudRouter/multer. Generic parsers
// do not consume multipart bodies and remain available for future narrow API
// additions.
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(authMiddleware);

app.use(
  "/api/nexus/cloud",
  requireNexusCloudMutationOrigin,
  requireWorkspace,
  nexusCloudRouter,
);

export default app;
