import type { NexusAsset, NexusAssetLink, NexusAssetTargetType, NexusPersonId, NexusProjectId } from "./nexus-asset-contracts";

export type NexusProjectFunction =
  | "CLIENT_OWNER"
  | "PROJECT_DIRECTOR"
  | "PROJECT_MANAGER"
  | "SITE_MANAGER"
  | "TRADE_SUPERVISOR"
  | "QA_INSPECTOR"
  | "COMMISSIONING_ENGINEER"
  | "TEAM_MEMBER"
  | "VIEWER";

export type NexusAssetPermission = "asset:read" | "asset:write" | "asset:link" | "asset:delete";

export interface NexusProjectScopeGrant {
  targetType: NexusAssetTargetType | "project" | "all";
  targetId: string;
  permissions: NexusAssetPermission[];
}

export interface NexusProjectParticipation {
  personId: NexusPersonId;
  projectId: NexusProjectId;
  status: "ACTIVE" | "SUSPENDED" | "LEFT";
  projectFunctions: NexusProjectFunction[];
  scopeGrants: NexusProjectScopeGrant[];
  explicitDeny?: NexusAssetPermission[];
  professionalQualifications?: string[];
}

export interface NexusAssetPermissionContext {
  viewerPersonId: NexusPersonId;
  projectId: NexusProjectId;
  permission: NexusAssetPermission;
  participation?: NexusProjectParticipation;
  asset?: NexusAsset;
  link?: NexusAssetLink;
  targetType?: NexusAssetTargetType;
  targetId?: string;
}

export interface NexusPermissionDecision {
  allowed: boolean;
  reason: string;
}

const highAuthorityFunctions: NexusProjectFunction[] = [
  "CLIENT_OWNER",
  "PROJECT_DIRECTOR",
  "PROJECT_MANAGER",
  "SITE_MANAGER",
];

const functionDefaults: Record<NexusProjectFunction, NexusAssetPermission[]> = {
  CLIENT_OWNER: ["asset:read", "asset:write", "asset:link", "asset:delete"],
  PROJECT_DIRECTOR: ["asset:read", "asset:write", "asset:link", "asset:delete"],
  PROJECT_MANAGER: ["asset:read", "asset:write", "asset:link", "asset:delete"],
  SITE_MANAGER: ["asset:read", "asset:write", "asset:link"],
  TRADE_SUPERVISOR: ["asset:read", "asset:write", "asset:link"],
  QA_INSPECTOR: ["asset:read", "asset:write", "asset:link"],
  COMMISSIONING_ENGINEER: ["asset:read", "asset:write", "asset:link"],
  TEAM_MEMBER: ["asset:read", "asset:write"],
  VIEWER: ["asset:read"],
};

function grantMatches(context: NexusAssetPermissionContext, grant: NexusProjectScopeGrant) {
  if (!grant.permissions.includes(context.permission)) return false;
  if (grant.targetType === "all") return true;
  if (grant.targetType === "project") return grant.targetId === context.projectId;

  const targetType = context.targetType ?? context.link?.targetType;
  const targetId = context.targetId ?? context.link?.targetId;
  return targetType === grant.targetType && targetId === grant.targetId;
}

export function resolveNexusAssetPermission(context: NexusAssetPermissionContext): NexusPermissionDecision {
  const participation = context.participation;
  if (!participation) return { allowed: false, reason: "No project participation record." };
  if (participation.status !== "ACTIVE") return { allowed: false, reason: "Project participation is not active." };
  if (participation.personId !== context.viewerPersonId) return { allowed: false, reason: "Viewer does not match project participation." };
  if (participation.projectId !== context.projectId) return { allowed: false, reason: "Participation belongs to another project." };
  if (participation.explicitDeny?.includes(context.permission)) return { allowed: false, reason: "Explicit project deny overrides inherited authority." };

  const functionAllows = participation.projectFunctions.some((projectFunction) => functionDefaults[projectFunction]?.includes(context.permission));
  const scopeAllows = participation.scopeGrants.some((grant) => grantMatches(context, grant));
  const highAuthority = participation.projectFunctions.some((projectFunction) => highAuthorityFunctions.includes(projectFunction));

  if (functionAllows && (highAuthority || scopeAllows)) {
    return { allowed: true, reason: "Allowed by project function and project scope." };
  }

  if (scopeAllows && context.permission === "asset:read") {
    return { allowed: true, reason: "Allowed by explicit project asset scope." };
  }

  return {
    allowed: false,
    reason: "Denied: professional qualification is not project authority; active project function and scope are required.",
  };
}

export function createDemoManagerParticipation(personId: NexusPersonId, projectId: NexusProjectId): NexusProjectParticipation {
  return {
    personId,
    projectId,
    status: "ACTIVE",
    projectFunctions: ["PROJECT_MANAGER"],
    scopeGrants: [{ targetType: "project", targetId: projectId, permissions: ["asset:read", "asset:write", "asset:link", "asset:delete"] }],
    professionalQualifications: [],
  };
}
