import type { NexusId } from '../schemas/common.schema';

export const ESAFE_CATANIA_RUNTIME_SCOPE_SCHEMA = 'nexus-esafe-runtime-scope/v1' as const;

/**
 * e-SAFE has accumulated public/runtime routing keys before the canonical #90
 * Project Memory IDs were established. These values are aliases only; they must
 * never create a second Project or Project World record.
 */
export const ESAFE_CATANIA_RUNTIME_SCOPE = {
  schema: ESAFE_CATANIA_RUNTIME_SCOPE_SCHEMA,
  canonicalProjectId: 'project-esafe-catania' as NexusId,
  projectCode: 'NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA',
  canonicalWorldId: 'world-esafe-catania' as NexusId,
  runtimeWorldAliases: ['esafe-demo'] as const,
} as const;

export type EsafeCataniaProjectReference =
  | typeof ESAFE_CATANIA_RUNTIME_SCOPE.canonicalProjectId
  | typeof ESAFE_CATANIA_RUNTIME_SCOPE.projectCode;

export type EsafeCataniaWorldReference =
  | typeof ESAFE_CATANIA_RUNTIME_SCOPE.canonicalWorldId
  | (typeof ESAFE_CATANIA_RUNTIME_SCOPE.runtimeWorldAliases)[number];

export interface EsafeCataniaCanonicalScope {
  projectId: typeof ESAFE_CATANIA_RUNTIME_SCOPE.canonicalProjectId;
  worldId: typeof ESAFE_CATANIA_RUNTIME_SCOPE.canonicalWorldId;
}

export const resolveEsafeCataniaProjectId = (value: string): NexusId | null => {
  if (
    value === ESAFE_CATANIA_RUNTIME_SCOPE.canonicalProjectId ||
    value === ESAFE_CATANIA_RUNTIME_SCOPE.projectCode
  ) {
    return ESAFE_CATANIA_RUNTIME_SCOPE.canonicalProjectId;
  }
  return null;
};

export const resolveEsafeCataniaWorldId = (value: string): NexusId | null => {
  if (
    value === ESAFE_CATANIA_RUNTIME_SCOPE.canonicalWorldId ||
    ESAFE_CATANIA_RUNTIME_SCOPE.runtimeWorldAliases.some((alias) => alias === value)
  ) {
    return ESAFE_CATANIA_RUNTIME_SCOPE.canonicalWorldId;
  }
  return null;
};

export const resolveEsafeCataniaCanonicalScope = (input: {
  projectReference: string;
  worldReference: string;
}): EsafeCataniaCanonicalScope | null => {
  const projectId = resolveEsafeCataniaProjectId(input.projectReference);
  const worldId = resolveEsafeCataniaWorldId(input.worldReference);
  if (!projectId || !worldId) return null;
  return {
    projectId: ESAFE_CATANIA_RUNTIME_SCOPE.canonicalProjectId,
    worldId: ESAFE_CATANIA_RUNTIME_SCOPE.canonicalWorldId,
  };
};
