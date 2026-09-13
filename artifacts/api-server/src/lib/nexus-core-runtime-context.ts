import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, type NexusDatabase, type NexusTransaction, sessionsTable, nexusPmProjectParticipationsTable, nexusPmNexusEventsTable, nexusPmTimelineEventsTable } from "@workspace/db";
import { canonicalAuthorityService, canonicalJson, sourceRevision } from "./nexus-canonical-authority-repositories";
import { getSessionId, ISSUER_URL } from "./auth";
import { STAGING_DEVICE_IDENTITY_PROVIDER, STAGING_DEVICE_SUBJECT_PREFIX } from "./nexus-person-binding";
import { resolveEsafeCataniaCanonicalScope } from "../../../../src/data/demo/esafeCataniaRuntimeScope";
import type { NexusCanonicalAuthorityEvaluation, NexusCanonicalAuthorityRequest, NexusTrustedSessionIdentity } from "../../../../src/core/permissions/canonicalAuthorityContract";

export class CoreRuntimeError extends Error {
  constructor(readonly status: number, readonly code: string, message = code) { super(message); }
}
export const fail = (status: number, code: string): never => { throw new CoreRuntimeError(status, code); };
export type Json = Record<string, unknown>;
export const json = (v: unknown): Json => v && typeof v === "object" && !Array.isArray(v) ? v as Json : fail(400, "OBJECT_REQUIRED");
export function text(v: unknown, name: string, limit = 240): string {
  if (typeof v !== "string" || !v.trim() || v.length > limit) return fail(400, `INVALID_${name.toUpperCase()}`);
  return v.trim();
}
export const id = (v: unknown, name: string): string => {
  const value = text(v, name, 180);
  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : fail(400, `INVALID_${name.toUpperCase()}`);
};
export const asJson = (v: unknown): Json => JSON.parse(JSON.stringify(v)) as Json;
export const digestId = (prefix: string, ...parts: unknown[]): string => `${prefix}:${sourceRevision(parts).slice(0, 40)}`;

export interface CoreContext {
  sessionId: string;
  session: NexusTrustedSessionIdentity;
  personId: string;
  workspaceId: number;
  projectId: string;
  worldId: string;
}

export async function assertSession(ctx: Pick<CoreContext, "sessionId">, database: NexusDatabase): Promise<NexusTrustedSessionIdentity> {
  const [row] = await database.select().from(sessionsTable).where(eq(sessionsTable.sid, ctx.sessionId));
  if (!row || row.expire.getTime() <= Date.now()) return fail(401, "SESSION_EXPIRED");
  const sess = json(row.sess), user = json(sess.user), subject = text(user.id, "SESSION_SUBJECT", 1024);
  if (typeof sess.expires_at === "number" && sess.expires_at * 1000 <= Date.now()) return fail(401, "SESSION_EXPIRED");
  const staging = sess.access_token === "STAGING_DEVICE_CLAIM";
  if (staging && (!subject.startsWith(STAGING_DEVICE_SUBJECT_PREFIX) || process.env.NEXUS_ENV !== "development" || process.env.VERCEL_ENV === "production")) return fail(403, "STAGING_SESSION_FORBIDDEN");
  // Provider provenance comes from the trusted persisted authentication session.
  const providerKey = staging ? STAGING_DEVICE_IDENTITY_PROVIDER : `oidc:${new URL(ISSUER_URL).toString().replace(/\/$/, "")}`;
  return { providerKey, providerSubjectDigest: createHash("sha256").update(subject).digest("hex") };
}

export async function coreContext(req: Request, input: Json, database: NexusDatabase = db): Promise<CoreContext> {
  const sessionId = getSessionId(req);
  if (!req.isAuthenticated() || !sessionId) return fail(401, "AUTHENTICATION_REQUIRED");
  const scope = resolveEsafeCataniaCanonicalScope({ projectReference: text(input.projectId, "projectId"), worldReference: text(input.worldId, "worldId") });
  if (!scope) return fail(403, "PROJECT_WORLD_NOT_RELEASED");
  const session = await assertSession({ sessionId }, database);
  const bound = await canonicalAuthorityService(database).resolveSessionPerson(session);
  if (bound.state !== "BOUND") return fail(bound.state === "STORE_UNAVAILABLE" ? 503 : 403, bound.reasonCode);
  // Discover storage scope only. Participation validity is decided solely by B2.
  const rows = await database.select({ workspaceId: nexusPmProjectParticipationsTable.workspaceId }).from(nexusPmProjectParticipationsTable)
    .where(and(eq(nexusPmProjectParticipationsTable.personId, bound.personId), eq(nexusPmProjectParticipationsTable.projectId, scope.projectId), eq(nexusPmProjectParticipationsTable.worldId, scope.worldId)));
  const workspaces = [...new Set(rows.map((r) => r.workspaceId))];
  if (workspaces.length !== 1) return fail(403, "PARTICIPATION_WORKSPACE_AMBIGUOUS_OR_MISSING");
  return { sessionId, session, personId: bound.personId, workspaceId: workspaces[0]!, ...scope };
}

export function authorityRequest(ctx: CoreContext, actionKey: string, resource: Partial<Pick<NexusCanonicalAuthorityRequest, "moduleId" | "objectScopeId" | "dataScope" | "resourceOwnerPersonId" | "approvalScopeId" | "targetPersonId" | "targetCapabilityRequirements">> = {}): NexusCanonicalAuthorityRequest {
  return { session: ctx.session, workspaceId: ctx.workspaceId, projectId: ctx.projectId, worldId: ctx.worldId,
    moduleId: "worksuite", actionKey, targetCapabilityRequirements: [], ...resource };
}

export function expectAllowed(evaluation: NexusCanonicalAuthorityEvaluation): NexusCanonicalAuthorityEvaluation {
  if (!evaluation.allowed || evaluation.identity.state !== "BOUND" || !evaluation.authorityRevision) {
    return fail(evaluation.status === "STORE_UNAVAILABLE" ? 503 : evaluation.status === "STALE" ? 409 : 403, evaluation.reasonCode);
  }
  return evaluation;
}
export async function authorize(database: NexusDatabase, request: NexusCanonicalAuthorityRequest): Promise<NexusCanonicalAuthorityEvaluation> {
  return expectAllowed(await canonicalAuthorityService(database).authorize(request));
}
export async function recheck(database: NexusDatabase, request: NexusCanonicalAuthorityRequest, revision: string): Promise<NexusCanonicalAuthorityEvaluation> {
  return expectAllowed(await canonicalAuthorityService(database).recheckForCommit(request, revision));
}

/**
 * P0 deliberately serializes protected mutations while holding the existing
 * authority tables stable. This also blocks inserts of new deny grants between
 * the fresh B2 recheck and commit. All nested A/C2 adapters use this transaction.
 */
export async function coreTransaction<T>(ctx: CoreContext, run: (tx: NexusTransaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '10s'`);
    await tx.execute(sql`lock table sessions, nexus_identity_bindings, nexus_pm_people,
      nexus_pm_project_participations, nexus_pm_permission_grants, nexus_pm_access_decisions,
      nexus_pm_module_entitlements, nexus_pm_competences in share row exclusive mode`);
    const session = await assertSession(ctx, tx);
    if (canonicalJson(session) !== canonicalJson(ctx.session)) return fail(401, "SESSION_CHANGED");
    const value = await run(tx);
    await assertSession(ctx, tx);
    return value;
  });
}

export const baseRecord = (ctx: CoreContext, recordId: string, title: string, at: string) => ({
  id: recordId, status: "active" as const, title, createdAt: at, updatedAt: at,
  createdBy: ctx.personId, updatedBy: ctx.personId, sourceSystem: "nexus" as const, confidence: "confirmed" as const,
});

export interface OperationKey { eventId: string; fingerprint: string }
export function operationKey(ctx: CoreContext, requestId: string, business: unknown): OperationKey {
  return { eventId: digestId("p0-event", ctx.workspaceId, ctx.projectId, ctx.worldId, ctx.personId, requestId),
    fingerprint: sourceRevision({ personId: ctx.personId, workspaceId: ctx.workspaceId, projectId: ctx.projectId, worldId: ctx.worldId, business }) };
}

export async function replay(tx: NexusDatabase, key: OperationKey): Promise<Json | null> {
  const [event] = await tx.select().from(nexusPmNexusEventsTable).where(eq(nexusPmNexusEventsTable.eventId, key.eventId));
  if (!event) return null;
  const payload = json(event.recordJson.payload);
  if (payload.requestFingerprint !== key.fingerprint) return fail(409, "IDEMPOTENCY_CONFLICT");
  return { ...json(payload.result), status: "ALREADY_COMMITTED" };
}

/** Existing NexusEvent is the audit/idempotency record; no second receipt store. */
export async function recordOperation(tx: NexusDatabase, ctx: CoreContext, key: OperationKey, actionKey: string, result: Json, at: string, relatedRecordIds: string[]): Promise<void> {
  const event = { ...baseRecord(ctx, key.eventId, actionKey, at), projectId: ctx.projectId, worldId: ctx.worldId,
    eventType: "NEXUS_P0_OPERATION_COMMITTED", occurredAt: at, recordedAt: at, actorType: "PERSON", actorId: ctx.personId,
    eventSourceType: "NEXUS", eventState: "COMMITTED", verificationState: "VERIFIED_BY_SOURCE", relatedObjectIds: relatedRecordIds,
    payload: { requestFingerprint: key.fingerprint, operation: actionKey, result } };
  await tx.insert(nexusPmNexusEventsTable).values({ eventId: key.eventId, workspaceId: ctx.workspaceId, projectId: ctx.projectId, worldId: ctx.worldId,
    eventType: event.eventType, correlationId: key.eventId, recordJson: event, persistedAt: new Date(at) });
  const timelineId = `${key.eventId}:timeline`;
  await tx.insert(nexusPmTimelineEventsTable).values({ timelineEventId: timelineId, workspaceId: ctx.workspaceId, projectId: ctx.projectId,
    worldId: ctx.worldId, eventType: "task-updated", eventAt: new Date(at), actorPersonId: ctx.personId, persistedAt: new Date(at), commitFingerprint: key.fingerprint,
    recordJson: { ...baseRecord(ctx, timelineId, actionKey, at), projectId: ctx.projectId, worldId: ctx.worldId, eventType: "task-updated", eventAt: at,
      actorPersonId: ctx.personId, relatedRecordIds, payload: { operation: actionKey, eventId: key.eventId } } });
}

function validationSecret(): string {
  const secret = process.env.NEXUS_P0_VALIDATION_SECRET;
  if (!secret || secret.length < 32) return fail(503, "VALIDATION_SIGNING_SECRET_REQUIRED");
  return secret;
}
export function signValidation(value: Json): string {
  const payload = Buffer.from(JSON.stringify({ ...value, expiresAt: Date.now() + 10 * 60_000 })).toString("base64url");
  return `${payload}.${createHmac("sha256", validationSecret()).update(payload).digest("base64url")}`;
}
export function readValidation(token: unknown): Json {
  const raw = text(token, "validationToken", 16000), parts = raw.split(".");
  if (parts.length !== 2) return fail(400, "INVALID_VALIDATION_TOKEN");
  const expected = createHmac("sha256", validationSecret()).update(parts[0]!).digest();
  const supplied = Buffer.from(parts[1]!, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return fail(403, "INVALID_VALIDATION_SIGNATURE");
  let payload: Json;
  try { payload = json(JSON.parse(Buffer.from(parts[0]!, "base64url").toString())); } catch { return fail(400, "INVALID_VALIDATION_PAYLOAD"); }
  if (typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) return fail(409, "VALIDATION_EXPIRED");
  return payload;
}
