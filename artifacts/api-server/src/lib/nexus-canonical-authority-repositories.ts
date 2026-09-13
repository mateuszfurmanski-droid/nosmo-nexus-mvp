import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  db, type NexusDatabase, nexusIdentityBindingsTable, nexusPmPeopleTable,
  nexusPmProjectParticipationsTable, nexusPmPermissionGrantsTable,
  nexusPmAccessDecisionsTable, nexusPmModuleEntitlementsTable, nexusPmCompetencesTable,
} from "@workspace/db";
import { CanonicalAuthorityService } from "../../../../src/core/permissions/canonicalAuthorityService";
import type {
  NexusCanonicalAuthorityRepositories, NexusAuthorityRepositoryRead,
  NexusCanonicalParticipationSnapshot, NexusCanonicalPermissionGrantSnapshot,
  NexusCanonicalAccessDecisionSnapshot, NexusCanonicalModuleEntitlementSnapshot,
  NexusCanonicalCompetenceSnapshot, NexusCanonicalPersonSnapshot, NexusIdentityBindingCandidate,
} from "../../../../src/core/permissions/canonicalAuthorityContract";

export function canonicalJson(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export const sourceRevision = (value: unknown): string => createHash("sha256").update(canonicalJson(value)).digest("hex");

async function available<T>(read: () => Promise<T>): Promise<NexusAuthorityRepositoryRead<T>> {
  try {
    const value = await read();
    const revisionValue = Array.isArray(value) ? [...value].sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b))) : value;
    return { state: "AVAILABLE", value, revision: sourceRevision(revisionValue) };
  } catch { return { state: "STORE_UNAVAILABLE" }; }
}

const optional = (r: Record<string, unknown>, key: string): string | undefined => {
  const v = r[key];
  if (v !== undefined && typeof v !== "string") throw new Error("MALFORMED_AUTHORITY_RECORD");
  return v as string | undefined;
};
const strings = (r: Record<string, unknown>, key: string): string[] => {
  const value = r[key];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) throw new Error("MALFORMED_AUTHORITY_RECORD");
  return value;
};
const same = (r: Record<string, unknown>, key: string, expected: unknown): void => {
  if (r[key] !== expected) throw new Error("AUTHORITY_COLUMN_RECORD_DRIFT");
};

/** Repository mapping only. Every decision is made by frozen CanonicalAuthorityService. */
export function canonicalAuthorityRepositories(database: NexusDatabase = db): NexusCanonicalAuthorityRepositories {
  return {
    identities: { findExactBinding: (identity) => available(async () => {
      const rows = await database.select({ binding: nexusIdentityBindingsTable, person: nexusPmPeopleTable })
        .from(nexusIdentityBindingsTable).innerJoin(nexusPmPeopleTable, eq(nexusPmPeopleTable.personId, nexusIdentityBindingsTable.personId))
        .where(and(eq(nexusIdentityBindingsTable.provider, identity.providerKey), eq(nexusIdentityBindingsTable.providerSubjectDigest, identity.providerSubjectDigest)));
      return rows.map(({ binding, person }): NexusIdentityBindingCandidate => ({
        bindingId: binding.bindingId, personId: binding.personId, displayName: person.displayName,
        bindingStatus: binding.status.toLowerCase() as NexusIdentityBindingCandidate["bindingStatus"],
        personStatus: person.status as NexusIdentityBindingCandidate["personStatus"],
        verifiedAt: binding.verifiedAt.toISOString(), revokedAt: binding.revokedAt?.toISOString(),
      }));
    }) },
    people: { findById: (personId) => available(async () => {
      const [p] = await database.select().from(nexusPmPeopleTable).where(eq(nexusPmPeopleTable.personId, personId));
      if (!p) return null;
      same(p.recordJson, "id", p.personId); same(p.recordJson, "status", p.status);
      return { personId, displayName: p.displayName, status: p.status, revision: sourceRevision(p) } as NexusCanonicalPersonSnapshot;
    }) },
    participations: { listForPerson: ({ workspaceId, personId }) => available(async () => {
      if (typeof workspaceId !== "number") throw new Error("INVALID_WORKSPACE");
      const rows = await database.select().from(nexusPmProjectParticipationsTable).where(and(eq(nexusPmProjectParticipationsTable.workspaceId, workspaceId), eq(nexusPmProjectParticipationsTable.personId, personId)));
      return rows.map((p): NexusCanonicalParticipationSnapshot => {
        const r = p.recordJson;
        for (const [key, value] of Object.entries({ id: p.participationId, personId: p.personId, projectId: p.projectId, worldId: p.worldId, participationStatus: p.participationStatus })) same(r, key, value);
        return { workspaceId, participationId: p.participationId, personId, projectId: p.projectId, worldId: p.worldId,
          status: (r.status === "active" ? p.participationStatus : r.status) as NexusCanonicalParticipationSnapshot["status"],
          validFrom: optional(r, "validFrom"), validTo: optional(r, "validTo"),
          permissionGrantIds: strings(r, "permissionGrantIds"), approvalScopeIds: strings(r, "approvalScopeIds"),
          competenceRequirementKeys: strings(r, "competenceRequirementIds"), revision: sourceRevision(p) };
      });
    }) },
    permissionGrants: { listForParticipation: ({ workspaceId, participationId }) => available(async () => {
      if (typeof workspaceId !== "number") throw new Error("INVALID_WORKSPACE");
      const rows = await database.select().from(nexusPmPermissionGrantsTable).where(and(eq(nexusPmPermissionGrantsTable.workspaceId, workspaceId), eq(nexusPmPermissionGrantsTable.participationId, participationId)));
      return rows.map((g): NexusCanonicalPermissionGrantSnapshot => {
        const r = g.recordJson;
        for (const [key, value] of Object.entries({ id: g.grantId, participationId, effect: g.effect })) same(r, key, value);
        for (const [key, value] of Object.entries({ moduleId: g.moduleId, actionKey: g.actionKey, objectScopeId: g.objectScopeId })) if ((r[key] ?? null) !== value) throw new Error("GRANT_SCOPE_DRIFT");
        return { workspaceId, grantId: g.grantId, participationId, effect: g.effect as "allow" | "deny",
          status: r.status as NexusCanonicalPermissionGrantSnapshot["status"], moduleId: g.moduleId ?? undefined,
          actionKey: g.actionKey ?? undefined, objectScopeId: g.objectScopeId ?? undefined, dataScope: optional(r, "dataScope"),
          validFrom: optional(r, "validFrom"), validTo: optional(r, "validTo"), revision: sourceRevision(g) };
      });
    }) },
    accessDecisions: { listForPerson: ({ workspaceId, personId }) => available(async () => {
      if (typeof workspaceId !== "number") throw new Error("INVALID_WORKSPACE");
      const rows = await database.select().from(nexusPmAccessDecisionsTable).where(and(eq(nexusPmAccessDecisionsTable.workspaceId, workspaceId), eq(nexusPmAccessDecisionsTable.personId, personId)));
      return rows.map((d): NexusCanonicalAccessDecisionSnapshot => {
        const r = d.recordJson;
        for (const [key, value] of Object.entries({ id: d.decisionId, personId, participationId: d.participationId, projectId: d.projectId, worldId: d.worldId, result: d.result, moduleId: d.moduleId, actionKey: d.actionKey })) same(r, key, value);
        if ((r.objectScopeId ?? null) !== d.objectScopeId || new Date(String(r.evaluatedAt)).getTime() !== d.evaluatedAt.getTime()) throw new Error("DECISION_SCOPE_DRIFT");
        return { workspaceId, decisionId: d.decisionId, personId, participationId: d.participationId!, projectId: d.projectId,
          worldId: d.worldId, moduleId: d.moduleId!, actionKey: d.actionKey!, objectScopeId: d.objectScopeId ?? undefined,
          dataScope: optional(r, "dataScope"), result: d.result as NexusCanonicalAccessDecisionSnapshot["result"],
          status: r.status as NexusCanonicalAccessDecisionSnapshot["status"], policyVersion: r.policyVersion as string,
          evaluatedAt: d.evaluatedAt.toISOString(), validFrom: optional(r, "validFrom"), validTo: optional(r, "validTo"), revision: sourceRevision(d) };
      });
    }) },
    moduleEntitlements: { listForProjectModule: ({ workspaceId, projectId, worldId, moduleId }) => available(async () => {
      if (typeof workspaceId !== "number") throw new Error("INVALID_WORKSPACE");
      const rows = await database.select().from(nexusPmModuleEntitlementsTable).where(and(eq(nexusPmModuleEntitlementsTable.workspaceId, workspaceId), eq(nexusPmModuleEntitlementsTable.projectId, projectId), eq(nexusPmModuleEntitlementsTable.worldId, worldId), eq(nexusPmModuleEntitlementsTable.moduleId, moduleId)));
      return rows.map((e): NexusCanonicalModuleEntitlementSnapshot => {
        for (const [key, value] of Object.entries({ entitlementId: e.entitlementId, workspaceId, projectId, worldId, moduleId })) same(e.recordJson, key, value);
        return { ...e.recordJson, revision: sourceRevision(e) } as unknown as NexusCanonicalModuleEntitlementSnapshot;
      });
    }) },
    competences: { listForPerson: (personId) => available(async () => {
      const rows = await database.select().from(nexusPmCompetencesTable).where(eq(nexusPmCompetencesTable.personId, personId));
      return rows.map((c): NexusCanonicalCompetenceSnapshot => {
        for (const [key, value] of Object.entries({ competenceId: c.competenceId, personId, requirementKey: c.requirementKey })) same(c.recordJson, key, value);
        return { ...c.recordJson, revision: sourceRevision(c) } as unknown as NexusCanonicalCompetenceSnapshot;
      });
    }) },
  };
}

export const canonicalAuthorityService = (database: NexusDatabase = db): CanonicalAuthorityService =>
  new CanonicalAuthorityService(canonicalAuthorityRepositories(database));
