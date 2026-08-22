import type { NexusProjectMemorySnapshot } from './projectMemory';
import type { NexusId } from './schemas/common.schema';
import {
  isNexusIfcExternalReference,
  resolveNexusIfcObjectIdentity,
  type NexusIfcIdentityIssueCode,
  type NexusIfcObjectIdentityProjection,
} from './schemas/ifcExternalReference.schema';

export interface NexusIfcProjectMemoryIssue {
  externalReferenceId: NexusId;
  nexusObjectId: NexusId;
  code: NexusIfcIdentityIssueCode | 'MISSING_CANONICAL_OBJECT';
  message: string;
}

export interface NexusIfcProjectMemoryInvariantReport {
  ok: boolean;
  mappings: NexusIfcObjectIdentityProjection[];
  issues: NexusIfcProjectMemoryIssue[];
}

/**
 * Validates only IFC identity/provenance records already held by canonical
 * Project Memory. It performs no model load, geometry parse or partner write.
 */
export const validateNexusIfcProjectMemoryIdentity = (
  memory: NexusProjectMemorySnapshot,
): NexusIfcProjectMemoryInvariantReport => {
  const mappings: NexusIfcObjectIdentityProjection[] = [];
  const issues: NexusIfcProjectMemoryIssue[] = [];
  const objectsById = new Map(memory.canonicalObjects.map((object) => [object.id, object]));

  for (const reference of memory.externalReferences) {
    if (!isNexusIfcExternalReference(reference)) continue;

    const object = objectsById.get(reference.nexusObjectId);
    if (!object) {
      issues.push({
        externalReferenceId: reference.id,
        nexusObjectId: reference.nexusObjectId,
        code: 'MISSING_CANONICAL_OBJECT',
        message: `IFC reference ${reference.id} targets missing canonical object ${reference.nexusObjectId}.`,
      });
      continue;
    }

    const resolution = resolveNexusIfcObjectIdentity(object, reference);
    if (resolution.ok) {
      mappings.push(resolution.mapping);
      continue;
    }

    for (const issue of resolution.issues) {
      issues.push({
        externalReferenceId: reference.id,
        nexusObjectId: reference.nexusObjectId,
        code: issue.code,
        message: issue.message,
      });
    }
  }

  return { ok: issues.length === 0, mappings, issues };
};
