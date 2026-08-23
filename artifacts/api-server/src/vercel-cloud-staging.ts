import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import { requireNexusCloudMutationOrigin } from "./middlewares/requireNexusCloudMutationOrigin";
import { requireWorkspace } from "./middlewares/requireWorkspace";
import nexusCloudRouter from "./routes/nexus-cloud";
import { logger } from "./lib/logger";

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
