import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { Router, type IRouter, type Request } from "express";
import {
  createNexusOnboardingInviteToken,
  NexusOnboardingInviteError,
  verifyNexusOnboardingInviteToken,
  type NexusOnboardingInvitePayload,
} from "../lib/nexus-person-onboarding-invite";

const router: IRouter = Router();
const MAX_CV_TEXT = 20_000;
const MAX_INVITE_DAYS = 14;
const clean = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : undefined;
};

const isAuthed = (req: Request): boolean =>
  typeof req.isAuthenticated === "function" && req.isAuthenticated();

router.get("/nexus/person/onboarding/_health", (_req, res) => {
  res.json({
    schema: "nexus-person-onboarding-health/v1",
    status: "ok",
    inviteSigningConfigured: Boolean(
      process.env.NEXUS_ONBOARDING_INVITE_SECRET?.trim(),
    ),
    aiConfigured: Boolean(
      process.env.OPENAI_API_KEY?.trim() &&
        process.env.NEXUS_ONBOARDING_AI_MODEL?.trim(),
    ),
    personPersistenceConfigured: false,
    serverPersonMutationPerformed: false,
  });
});

router.post("/nexus/person/onboarding/invites", (req, res) => {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "NEXUS_AUTH_REQUIRED" });
    return;
  }

  const agency = clean(req.body?.agency, 120);
  if (!agency) {
    res.status(400).json({ error: "NEXUS_ONBOARDING_AGENCY_REQUIRED" });
    return;
  }

  const daysRaw = Number(req.body?.expiresInDays ?? 7);
  const expiresInDays = Number.isFinite(daysRaw)
    ? Math.max(1, Math.min(MAX_INVITE_DAYS, Math.round(daysRaw)))
    : 7;
  const now = Date.now();
  const payload: NexusOnboardingInvitePayload = {
    schema: "nexus-person-onboarding-invite/v1",
    inviteId: randomUUID(),
    agency,
    trade: clean(req.body?.trade, 120),
    location: clean(req.body?.location, 120),
    message: clean(req.body?.message, 240),
    issuedAt: now,
    expiresAt: now + expiresInDays * 24 * 60 * 60 * 1000,
  };

  try {
    const token = createNexusOnboardingInviteToken(payload);
    const base =
      process.env.NEXUS_ONBOARDING_PUBLIC_BASE_URL?.trim() ||
      "https://nosmotechnology.co.uk/person-card-onboarding.html";
    const url = new URL(base);
    url.searchParams.set("inviteId", payload.inviteId);
    url.searchParams.set("agency", payload.agency);
    if (payload.trade) url.searchParams.set("trade", payload.trade);
    if (payload.location) url.searchParams.set("location", payload.location);
    if (payload.message) url.searchParams.set("message", payload.message);
    url.searchParams.set("inviteToken", token);

    res.status(201).json({
      schema: "nexus-person-onboarding-invite-created/v1",
      inviteId: payload.inviteId,
      expiresAt: new Date(payload.expiresAt).toISOString(),
      onboardingUrl: url.toString(),
      serverPersonMutationPerformed: false,
    });
  } catch (error) {
    if (error instanceof NexusOnboardingInviteError) {
      res.status(error.status).json({ error: error.code });
      return;
    }
    res.status(500).json({ error: "NEXUS_ONBOARDING_INVITE_CREATE_FAILED" });
  }
});

const prefillSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    firstName: { type: ["string", "null"] },
    lastName: { type: ["string", "null"] },
    trade: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    experienceYears: { type: ["integer", "null"], minimum: 0, maximum: 60 },
    summary: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    warnings: {
      type: "array",
      maxItems: 6,
      items: { type: "string" },
    },
  },
  required: [
    "firstName",
    "lastName",
    "trade",
    "location",
    "experienceYears",
    "summary",
    "confidence",
    "warnings",
  ],
} as const;

router.post("/nexus/person/onboarding/ai-prefill", async (req, res) => {
  const token = clean(req.body?.inviteToken, 8_000);
  if (!token) {
    res.status(401).json({ error: "NEXUS_ONBOARDING_INVITE_REQUIRED" });
    return;
  }

  let invite: NexusOnboardingInvitePayload;
  try {
    invite = verifyNexusOnboardingInviteToken(token);
  } catch (error) {
    if (error instanceof NexusOnboardingInviteError) {
      res.status(error.status).json({ error: error.code });
      return;
    }
    res.status(401).json({ error: "NEXUS_ONBOARDING_INVITE_INVALID" });
    return;
  }

  const cvText =
    typeof req.body?.cvText === "string" ? req.body.cvText.trim() : "";
  if (!cvText || cvText.length > MAX_CV_TEXT) {
    res.status(400).json({ error: "NEXUS_ONBOARDING_CV_TEXT_INVALID" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.NEXUS_ONBOARDING_AI_MODEL?.trim();
  if (!apiKey || !model) {
    res.status(503).json({
      schema: "nexus-person-onboarding-ai-error/v1",
      error: "NEXUS_ONBOARDING_AI_NOT_CONFIGURED",
      serverPersonMutationPerformed: false,
    });
    return;
  }

  const current =
    req.body?.current && typeof req.body.current === "object"
      ? req.body.current
      : {};

  const prompt = {
    task:
      "Extract a draft construction work profile from supplied CV/work-history text. Use only explicit evidence. Do not invent credentials, certifications, legal status, addresses, dates or employers. Return null when uncertain.",
    inviteContext: {
      agency: invite.agency,
      suggestedTrade: invite.trade,
      suggestedLocation: invite.location,
    },
    currentDraft: current,
    cvText,
  };

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model,
      store: false,
      input: JSON.stringify(prompt),
      text: {
        format: {
          type: "json_schema",
          name: "nexus_person_onboarding_prefill",
          strict: true,
          schema: prefillSchema,
        },
      },
    });
    const parsed = JSON.parse(response.output_text || "{}") as Record<
      string,
      unknown
    >;

    res.json({
      schema: "nexus-person-onboarding-ai-prefill/v1",
      inviteId: invite.inviteId,
      prefill: {
        firstName: clean(parsed.firstName, 80) ?? null,
        lastName: clean(parsed.lastName, 80) ?? null,
        trade: clean(parsed.trade, 140) ?? null,
        location: clean(parsed.location, 140) ?? null,
        experienceYears:
          typeof parsed.experienceYears === "number" &&
          Number.isInteger(parsed.experienceYears)
            ? Math.max(0, Math.min(60, parsed.experienceYears))
            : null,
        summary: clean(parsed.summary, 600) ?? null,
        confidence:
          typeof parsed.confidence === "number"
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0,
        warnings: Array.isArray(parsed.warnings)
          ? parsed.warnings
              .map((value) => clean(value, 180))
              .filter((value): value is string => Boolean(value))
              .slice(0, 6)
          : [],
      },
      serverPersonMutationPerformed: false,
      humanReviewRequired: true,
    });
  } catch (error) {
    req.log?.error?.({ err: error }, "Nexus onboarding AI prefill failed");
    res.status(502).json({
      schema: "nexus-person-onboarding-ai-error/v1",
      error: "NEXUS_ONBOARDING_AI_FAILED",
      serverPersonMutationPerformed: false,
    });
  }
});

export default router;
