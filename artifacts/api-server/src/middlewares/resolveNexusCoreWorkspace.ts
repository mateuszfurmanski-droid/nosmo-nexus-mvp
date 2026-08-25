import { and, eq } from "drizzle-orm";
import { type NextFunction, type Request, type Response } from "express";
import { db, nexusPmProjectParticipationsTable } from "@workspace/db";
import { resolveEsafeCataniaCanonicalScope } from "../../../../src/data/demo/esafeCataniaRuntimeScope";
import { resolveNexusPersonBinding } from "../lib/nexus-person-binding";

function readStatus(record: Record<string, unknown>): string | undefined {
  return typeof record.status === "string" ? record.status : undefined;
}

function readDate(record: Record<string, unknown>, key: "validFrom" | "validTo"): number | null {
  const value = record[key];
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function activeAt(record: Record<string, unknown>, now: number): boolean {
  if (readStatus(record) !== "active") return false;
  const from = readDate(record, "validFrom");
  const to = readDate(record, "validTo");
  if (Number.isNaN(from) || Number.isNaN(to)) return false;
  if (from !== null && from > now) return false;
  if (to !== null && to < now) return false;
  return true;
}

function requestedScope(req: Request): { projectReference: string; worldReference: string } | null {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : null;
  const projectReference = req.method === "GET"
    ? String(req.query.projectId ?? "")
    : typeof body?.projectId === "string" ? body.projectId : "";
  const worldReference = req.method === "GET"
    ? String(req.query.worldId ?? "")
    : typeof body?.worldId === "string" ? body.worldId : "";
  if (!projectReference || !worldReference) return null;
  return { projectReference, worldReference };
}

/**
 * Core work is project-participation scoped, not personal-workspace scoped.
 *
 * The legacy MVP requireWorkspace middleware creates one starter workspace per auth
 * user, which cannot represent manager and worker sessions participating in the same
 * Project World. For /nexus/core only, derive the shared workspace from:
 * authenticated session -> canonical Person binding -> exactly one active Project
 * Participation for the canonical project/world. The downstream Core authority layer
 * re-resolves the binding and re-checks Participation, AccessDecision, PermissionGrant,
 * explicit deny and competence before every mutation.
 */
export async function resolveNexusCoreWorkspace(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.path.startsWith("/nexus/core")) {
    next();
    return;
  }
  if (!req.isAuthenticated() || !req.user?.id) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const input = requestedScope(req);
  if (!input) {
    res.status(400).json({ error: "CORE_SCOPE_REQUIRED" });
    return;
  }
  const scope = resolveEsafeCataniaCanonicalScope(input);
  if (!scope) {
    res.status(404).json({ error: "CORE_E2E_SCOPE_NOT_FOUND" });
    return;
  }

  try {
    const binding = await resolveNexusPersonBinding(String(req.user.id));
    if (!binding) {
      res.status(403).json({ error: "CANONICAL_PERSON_UNBOUND" });
      return;
    }

    const rows = await db
      .select()
      .from(nexusPmProjectParticipationsTable)
      .where(
        and(
          eq(nexusPmProjectParticipationsTable.personId, binding.personId),
          eq(nexusPmProjectParticipationsTable.projectId, scope.projectId),
          eq(nexusPmProjectParticipationsTable.worldId, scope.worldId),
          eq(nexusPmProjectParticipationsTable.participationStatus, "active"),
        ),
      );
    const active = rows.filter((row) => activeAt(row.recordJson, Date.now()));
    if (active.length !== 1) {
      res.status(403).json({
        error: "PARTICIPATION_WORKSPACE_INVALID",
        message: `Exactly one active shared Project Participation is required; resolved ${active.length}.`,
      });
      return;
    }

    req.workspaceId = active[0]!.workspaceId;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Failed to resolve canonical Nexus Core workspace");
    res.status(500).json({ error: "CORE_WORKSPACE_RESOLUTION_FAILED" });
  }
}
