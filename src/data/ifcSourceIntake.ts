import type { NexusIfcSchemaVersion } from './schemas/ifcExternalReference.schema';

export const NEXUS_IFC_SOURCE_INTAKE_SCHEMA = 'nexus-ifc-source-intake/v1' as const;
export const MAX_LOCAL_IFC_SOURCE_BYTES = 64 * 1024 * 1024;

export type NexusIfcEntityKind = 'object' | 'spatial' | 'type' | 'relationship' | 'other';
export type NexusIfcSourceIntakeState = 'READY_FOR_MAPPING_REVIEW' | 'BLOCKED';

export type NexusIfcSourceIntakeIssueCode =
  | 'SOURCE_TOO_LARGE'
  | 'INVALID_FILE_SIZE'
  | 'MISSING_STEP_HEADER'
  | 'IFC_SCHEMA_UNRESOLVED'
  | 'IFC_PROJECT_GLOBAL_ID_UNRESOLVED'
  | 'NO_IFC_ROOT_GLOBAL_IDS'
  | 'DUPLICATE_IFC_GLOBAL_IDS'
  | 'INVALID_SHA256';

export interface NexusIfcSourceIntakeIssue {
  code: NexusIfcSourceIntakeIssueCode;
  blocking: boolean;
  message: string;
}

export interface NexusIfcEntityCandidate {
  diagnosticExpressId: number;
  entityType: string;
  ifcGlobalId: string;
  name?: string;
  description?: string;
  tag?: string;
  kind: NexusIfcEntityKind;
}

/**
 * Session/read-only structural intake result for one local or server-authorised
 * IFC STEP/SPF source. Raw IFC text is deliberately not part of the result and
 * this record is not a Nexus Object mapping.
 */
export interface NexusIfcSourceIntakeResult {
  schema: typeof NEXUS_IFC_SOURCE_INTAKE_SCHEMA;
  state: NexusIfcSourceIntakeState;
  source: {
    fileName: string;
    fileSizeBytes: number;
    sourceFileSha256?: string;
    rawIfcSchema?: string;
    ifcSchema: NexusIfcSchemaVersion;
    ifcProjectGlobalId?: string;
  };
  candidates: NexusIfcEntityCandidate[];
  duplicateGlobalIds: string[];
  issues: NexusIfcSourceIntakeIssue[];
  boundaries: string[];
}

export interface NexusIfcSourceIntakeInput {
  text: string;
  fileName: string;
  fileSizeBytes: number;
  sourceFileSha256?: string;
}

const IFC_GLOBAL_ID_PATTERN = /^[0-9A-Za-z_$]{22}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

const SPATIAL_TYPES = new Set([
  'IFCPROJECT',
  'IFCSITE',
  'IFCBUILDING',
  'IFCBUILDINGSTOREY',
  'IFCSPACE',
  'IFCFACILITY',
  'IFCFACILITYPART',
]);

const decodeStepString = (token?: string): string | undefined => {
  const value = token?.trim();
  if (!value || value === '$' || value === '*') return undefined;
  if (!value.startsWith("'") || !value.endsWith("'")) return undefined;
  return value.slice(1, -1).replace(/''/g, "'");
};

const splitStepStatements = (text: string): string[] => {
  const statements: string[] = [];
  let start = 0;
  let inString = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "'") {
      if (inString && text[index + 1] === "'") {
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (char === ';' && !inString) {
      const statement = text.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }

  return statements;
};

const splitTopLevelArguments = (source: string): string[] => {
  const args: string[] = [];
  let start = 0;
  let depth = 0;
  let inString = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "'") {
      if (inString && source[index + 1] === "'") {
        index += 1;
        continue;
      }
      inString = !inString;
      continue;
    }

    if (inString) continue;
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === ',' && depth === 0) {
      args.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  args.push(source.slice(start).trim());
  return args;
};

const classifyEntity = (entityType: string): NexusIfcEntityKind => {
  if (entityType.startsWith('IFCREL')) return 'relationship';
  if (SPATIAL_TYPES.has(entityType)) return 'spatial';
  if (entityType.endsWith('TYPE') || entityType.includes('STYLE')) return 'type';
  if (entityType.startsWith('IFC')) return 'object';
  return 'other';
};

export const normalizeIfcSchemaVersion = (rawSchema?: string): NexusIfcSchemaVersion => {
  const normalized = rawSchema?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
  if (normalized.startsWith('IFC4X3')) return 'IFC4X3';
  if (normalized.startsWith('IFC4')) return 'IFC4';
  if (normalized.startsWith('IFC2X3')) return 'IFC2X3';
  return 'UNKNOWN';
};

/**
 * Performs a bounded structural STEP/SPF intake only. It does not evaluate
 * geometry, Psets, materials, model correctness or operational impact, and it
 * never auto-approves a Nexus Object <-> IFC GlobalId mapping.
 */
export const parseIfcSourceForMappingReview = (
  input: NexusIfcSourceIntakeInput,
): NexusIfcSourceIntakeResult => {
  const issues: NexusIfcSourceIntakeIssue[] = [];

  if (!Number.isFinite(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
    issues.push({
      code: 'INVALID_FILE_SIZE',
      blocking: true,
      message: 'IFC source size must be a positive finite byte count.',
    });
  }

  if (input.fileSizeBytes > MAX_LOCAL_IFC_SOURCE_BYTES) {
    issues.push({
      code: 'SOURCE_TOO_LARGE',
      blocking: true,
      message: `IFC source exceeds the ${MAX_LOCAL_IFC_SOURCE_BYTES}-byte bounded local intake limit.`,
    });
  }

  if (input.sourceFileSha256 && !SHA256_PATTERN.test(input.sourceFileSha256)) {
    issues.push({
      code: 'INVALID_SHA256',
      blocking: true,
      message: 'sourceFileSha256 must be a 64-character hexadecimal SHA-256 digest when supplied.',
    });
  }

  const hasStepHeader = input.text.includes('ISO-10303-21');
  if (!hasStepHeader) {
    issues.push({
      code: 'MISSING_STEP_HEADER',
      blocking: true,
      message: 'Source does not contain the ISO-10303-21 STEP header.',
    });
  }

  const rawIfcSchema = input.text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i)?.[1]?.trim();
  const ifcSchema = normalizeIfcSchemaVersion(rawIfcSchema);
  if (ifcSchema === 'UNKNOWN') {
    issues.push({
      code: 'IFC_SCHEMA_UNRESOLVED',
      blocking: true,
      message: 'Supported IFC schema/version could not be resolved from FILE_SCHEMA.',
    });
  }

  const candidates: NexusIfcEntityCandidate[] = [];
  const seenGlobalIds = new Set<string>();
  const duplicateGlobalIds = new Set<string>();

  if (!issues.some((issue) => issue.code === 'SOURCE_TOO_LARGE')) {
    for (const statement of splitStepStatements(input.text)) {
      const match = statement.match(/^#(\d+)\s*=\s*(IFC[A-Z0-9_]+)\s*\(([\s\S]*)\)$/i);
      if (!match) continue;

      const diagnosticExpressId = Number(match[1]);
      const entityType = match[2]!.toUpperCase();
      const args = splitTopLevelArguments(match[3]!);
      const ifcGlobalId = decodeStepString(args[0]);
      if (!ifcGlobalId || !IFC_GLOBAL_ID_PATTERN.test(ifcGlobalId)) continue;

      if (seenGlobalIds.has(ifcGlobalId)) duplicateGlobalIds.add(ifcGlobalId);
      seenGlobalIds.add(ifcGlobalId);

      const kind = classifyEntity(entityType);
      candidates.push({
        diagnosticExpressId,
        entityType,
        ifcGlobalId,
        name: decodeStepString(args[2]),
        description: decodeStepString(args[3]),
        tag: kind === 'object' ? decodeStepString(args[7]) : undefined,
        kind,
      });
    }
  }

  const ifcProjectGlobalId = candidates.find((candidate) => candidate.entityType === 'IFCPROJECT')?.ifcGlobalId;
  if (!ifcProjectGlobalId) {
    issues.push({
      code: 'IFC_PROJECT_GLOBAL_ID_UNRESOLVED',
      blocking: true,
      message: 'No valid IFCPROJECT GlobalId was resolved; project lineage cannot be established.',
    });
  }

  if (candidates.length === 0) {
    issues.push({
      code: 'NO_IFC_ROOT_GLOBAL_IDS',
      blocking: true,
      message: 'No valid 22-character IfcRoot GlobalIds were resolved from the source.',
    });
  }

  if (duplicateGlobalIds.size > 0) {
    issues.push({
      code: 'DUPLICATE_IFC_GLOBAL_IDS',
      blocking: true,
      message: `${duplicateGlobalIds.size} duplicate IFC GlobalId value(s) detected; explicit mapping review is blocked.`,
    });
  }

  return {
    schema: NEXUS_IFC_SOURCE_INTAKE_SCHEMA,
    state: issues.some((issue) => issue.blocking) ? 'BLOCKED' : 'READY_FOR_MAPPING_REVIEW',
    source: {
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      sourceFileSha256: input.sourceFileSha256,
      rawIfcSchema,
      ifcSchema,
      ifcProjectGlobalId,
    },
    candidates,
    duplicateGlobalIds: [...duplicateGlobalIds],
    issues,
    boundaries: [
      'This result is structural intake only and is not REAL IFC PASS.',
      'Candidate discovery never auto-approves IFC GlobalId to Nexus Object mapping.',
      'STEP/express ID is diagnostic runtime context only.',
      'Raw IFC text, geometry arrays, meshes and full Psets are not persisted by this contract.',
      'Geometry, Psets, type, material and revision intelligence remain separate validation slices.',
    ],
  };
};

export const listIfcObjectCandidates = (
  intake: NexusIfcSourceIntakeResult,
  query = '',
  limit = 100,
): NexusIfcEntityCandidate[] => {
  if (intake.state === 'BLOCKED') return [];
  const needle = query.trim().toLowerCase();

  return intake.candidates
    .filter((candidate) => candidate.kind === 'object')
    .filter((candidate) => {
      if (!needle) return true;
      return [
        candidate.entityType,
        candidate.ifcGlobalId,
        candidate.name,
        candidate.description,
        candidate.tag,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(needle));
    })
    .sort((left, right) => left.diagnosticExpressId - right.diagnosticExpressId)
    .slice(0, Math.max(0, Math.min(limit, 500)));
};
