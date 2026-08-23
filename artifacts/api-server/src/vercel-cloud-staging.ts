import { createRequire } from "node:module";
import type { NextFunction, Request, Response } from "express";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import { requireNexusCloudMutationOrigin } from "./middlewares/requireNexusCloudMutationOrigin.js";
import { requireWorkspace } from "./middlewares/requireWorkspace.js";
import nexusCloudRouter from "./routes/nexus-cloud.js";
import { logger } from "./lib/logger.js";

const require = createRequire(import.meta.url);
const express = require("express") as any;
const cookieParser = require("cookie-parser") as any;
const pinoHttp = require("pino-http") as any;

/**
 * Narrow serverless staging runtime for the real Nexus Cloud backend path.
 *
 * Deliberately excludes the web UI, generic MVP routes and Work Wallet. It
 * mounts the existing authenticated Cloud router unchanged so staging can
 * validate the real identity/access/provider/persistence boundary without
 * coupling the exercise to a frontend deployment.
 */
const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: Request) {
        return {
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: Response) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex");
  next();
});

app.get("/api/nexus/cloud/_staging/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "nosmo-nexus-cloud-staging-runtime",
    environment: "non-production",
    cloudRouter: "canonical-repo-router",
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
