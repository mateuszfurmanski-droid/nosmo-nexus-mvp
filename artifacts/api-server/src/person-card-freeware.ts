import path from "node:path";
import express from "express";
import pinoHttp from "pino-http";
import jobSearchRouter from "./person-card-freeware/job-search";
import jobAiRouter from "./person-card-freeware/job-ai-match";
import onboardingRouter from "./person-card-freeware/onboarding";

const app = express();
const port = Number(process.env.PORT || process.env.PERSON_CARD_FREEWARE_PORT || 4177);
const staticDir = path.resolve(process.cwd(), "modules/person-card-freeware");

app.disable("x-powered-by");
app.use(pinoHttp());
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "256kb" }));

app.get("/api/person-card/_health", (_req, res) => {
  res.json({
    schema: "nosmo-person-card-freeware-health/v1",
    status: "ok",
    standalone: true,
    relationshipTreeRequired: false,
    workProfileSchema: "nexus-person-work-profile/v1",
    jobObjectSchema: "nexus-job-object/v1",
  });
});

app.use("/api", jobSearchRouter);
app.use("/api", jobAiRouter);
app.use("/api", onboardingRouter);
app.use(express.static(staticDir, { index: "index.html", fallthrough: true }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`NOSMO Person Card Freeware listening on :${port}`);
});
