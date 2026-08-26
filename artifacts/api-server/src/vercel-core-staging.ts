import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import { resolveNexusCoreWorkspace } from "./middlewares/resolveNexusCoreWorkspace";
import healthRouter from "./routes/health";
import mobileAuthBootstrapRouter from "./routes/mobile-auth-bootstrap";
import authRouter from "./routes/auth";
import nexusCoreIdentityClaimRouter from "./routes/nexus-core-identity-claim";
import nexusCoreE2eRouter from "./routes/nexus-core-e2e";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", true);

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
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(authMiddleware);

// Deliberately narrow non-production runtime. No generic MVP, public file upload,
// Work Wallet, Cloud/Drive or web UI routes are mounted here.
app.use("/api", healthRouter);
app.use("/api", mobileAuthBootstrapRouter);
app.use("/api", authRouter);
app.use("/api", nexusCoreIdentityClaimRouter);
app.use("/api", resolveNexusCoreWorkspace);
app.use("/api", nexusCoreE2eRouter);

app.get("/", (_req, res) => {
  res.json({
    service: "NOSMO Nexus Core staging",
    schema: "nexus-core-staging-runtime/v1",
    environment: "NON_PRODUCTION",
    projectId: "project-esafe-catania",
    worldId: "world-esafe-catania",
  });
});

export default app;
