import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { isNexusCorsOriginAllowed } from "./lib/nexus-cors";
import { logger } from "./lib/logger";
import { resolveNexusWebPublicDirectory } from "./lib/nexus-runtime-paths";
import {
  getWorkWalletRuntimeStatus,
  workWalletRuntimeMiddleware,
} from "./lib/work-wallet-runtime";
import {
  getNexusCloudStorageRuntimeStatus,
  nexusCloudStorageRuntimeMiddleware,
} from "./lib/nexus-cloud-storage-runtime";

const app: Express = express();
const publicDirectory = resolveNexusWebPublicDirectory();

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
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  next();
});

app.get("/health", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      status: "ok",
      service: "nosmo-nexus-unified-runtime",
      workWallet: await getWorkWalletRuntimeStatus(),
      cloudStorage: await getNexusCloudStorageRuntimeStatus(),
    });
  } catch {
    res.status(503).json({
      status: "degraded",
      service: "nosmo-nexus-unified-runtime",
      error: "NEXUS_RUNTIME_DEPENDENCY_UNAVAILABLE",
    });
  }
});

// Work Wallet owns its raw webhook body and server-to-server integration key.
// Keep it first and before every generic body parser.
app.use(workWalletRuntimeMiddleware);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      callback(null, isNexusCorsOriginAllowed(origin) ? origin || false : false);
    },
  }),
);
app.use(cookieParser());

// Resolve the existing Nexus session before Cloud binary handling. authMiddleware
// reads only cookies/session state and never consumes req.body.
app.use(authMiddleware);

// Cloud storage owns arbitrary binary request bodies. Its middleware performs
// canonical Person + Project Participation authorization before delegating to
// the shared storage handler, so no browser storage API key is needed.
app.use(nexusCloudStorageRuntimeMiddleware);

// Generic parsers are intentionally after raw Work Wallet and Cloud handlers.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

app.use(
  express.static(publicDirectory, {
    index: false,
    fallthrough: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

// SPA history fallback. API paths are never rewritten into index.html.
app.use((req, res, next) => {
  if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api/")) {
    next();
    return;
  }

  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(publicDirectory, "index.html"), (error) => {
    if (error) next(error);
  });
});

export default app;
