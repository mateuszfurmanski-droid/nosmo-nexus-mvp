import type { InstallationPilot } from "./installation-pilots";

export type IfcEntityKind = "object" | "spatial" | "type" | "relationship" | "other";

export type IfcEntityRecord = {
  stepId: number;
  entityType: string;
  globalId: string;
  name?: string;
  description?: string;
  tag?: string;
  kind: IfcEntityKind;
};

export type IfcParseResult = {
  schema?: string;
  fileName?: string;
  projectGlobalId?: string;
  entities: IfcEntityRecord[];
  duplicateGlobalIds: string[];
  warnings: string[];
};

export type IfcGuidMapping = {
  nexusObjectId: string;
  ifcGlobalId: string;
  ifcEntityType: string;
  ifcStepId: number;
  ifcName?: string;
  ifcTag?: string;
  sourceFileName: string;
  sourceFileSize: number;
  sourceSchema?: string;
  sourceFileSha256?: string;
  sourceProjectGlobalId?: string;
  mappedAt: string;
};

export const IFC_MAPPING_STORAGE_KEY = "nosmo-ifc-guid-mappings:v1";
export const MAX_LOCAL_IFC_BYTES = 64 * 1024 * 1024;

const IFC_GUID = /^[0-9A-Za-z_$]{22}$/;
const SAFE_NEXUS_ID = /^[A-Za-z0-9_-]{1,80}$/;
const SPATIAL_TYPES = new Set([
  "IFCPROJECT",
  "IFCSITE",
  "IFCBUILDING",
  "IFCBUILDINGSTOREY",
  "IFCSPACE",
  "IFCFACILITY",
  "IFCFACILITYPART",
]);

const TRADE_HINTS: Record<InstallationPilot["tradeId"], string[]> = {
  electrical: [
    "CABLE",
    "CARRIER",
    "ELECTRIC",
    "LIGHT",
    "LAMP",
    "OUTLET",
    "SWITCH",
    "JUNCTION",
    "TRANSFORMER",
    "DISTRIBUTIONBOARD",
    "PROTECTIVEDEVICE",
  ],
  "mechanical-hvac": [
    "AIR",
    "DUCT",
    "FAN",
    "DAMPER",
    "BOILER",
    "CHILLER",
    "COIL",
    "UNITARY",
    "HUMIDIFIER",
    "EVAPORATOR",
    "COMPRESSOR",
  ],
  "plumbing-public-health": [
    "PIPE",
    "PUMP",
    "VALVE",
    "SANITARY",
    "WASTE",
    "DRAIN",
    "INTERCEPTOR",
    "TANK",
    "FLOWTERMINAL",
  ],
};

function decodeStepString(token?: string) {
  const value = token?.trim();
  if (!value || value === "$" || value === "*") return undefined;
  if (!value.startsWith("'") || !value.endsWith("'")) return undefined;
  return value.slice(1, -1).replace(/''/g, "'");
}

function splitStepStatements(text: string) {
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
    if (char === ";" && !inString) {
      const statement = text.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }

  return statements;
}

function splitTopLevelArguments(source: string) {
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
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === "," && depth === 0) {
      args.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  args.push(source.slice(start).trim());
  return args;
}

function classifyEntity(entityType: string): IfcEntityKind {
  if (entityType.startsWith("IFCREL")) return "relationship";
  if (SPATIAL_TYPES.has(entityType)) return "spatial";
  if (entityType.endsWith("TYPE") || entityType.includes("STYLE")) return "type";
  if (entityType.startsWith("IFC")) return "object";
  return "other";
}

export function parseIfcStep(text: string): IfcParseResult {
  const warnings: string[] = [];
  if (!text.includes("ISO-10303-21")) warnings.push("Missing ISO-10303-21 STEP header.");

  const schemaMatch = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  const fileNameMatch = text.match(/FILE_NAME\s*\(\s*'((?:''|[^'])*)'/i);
  const schema = schemaMatch?.[1]?.trim();
  const fileName = fileNameMatch?.[1]?.replace(/''/g, "'");
  if (!schema) warnings.push("IFC schema could not be resolved from FILE_SCHEMA.");

  const entities: IfcEntityRecord[] = [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const statement of splitStepStatements(text)) {
    const match = statement.match(/^#(\d+)\s*=\s*(IFC[A-Z0-9_]+)\s*\(([\s\S]*)\)$/i);
    if (!match) continue;

    const stepId = Number(match[1]);
    const entityType = match[2]!.toUpperCase();
    const args = splitTopLevelArguments(match[3]!);
    const globalId = decodeStepString(args[0]);
    if (!globalId || !IFC_GUID.test(globalId)) continue;

    if (seen.has(globalId)) duplicates.add(globalId);
    seen.add(globalId);

    const kind = classifyEntity(entityType);
    entities.push({
      stepId,
      entityType,
      globalId,
      name: decodeStepString(args[2]),
      description: decodeStepString(args[3]),
      tag: kind === "object" ? decodeStepString(args[7]) : undefined,
      kind,
    });
  }

  const projectGlobalId = entities.find((entity) => entity.entityType === "IFCPROJECT")?.globalId;
  if (!projectGlobalId) warnings.push("No IFCPROJECT GlobalId was found.");
  if (!entities.length) warnings.push("No IfcRoot-style 22-character GlobalIds were found.");
  if (duplicates.size) warnings.push(`${duplicates.size} duplicate IFC GlobalId value(s) detected.`);

  return {
    schema,
    fileName,
    projectGlobalId,
    entities,
    duplicateGlobalIds: [...duplicates],
    warnings,
  };
}

export function scoreIfcEntityForTrade(
  entity: IfcEntityRecord,
  tradeId: InstallationPilot["tradeId"],
) {
  const haystack = [entity.entityType, entity.name, entity.description, entity.tag]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
  return TRADE_HINTS[tradeId].reduce((score, hint) => score + (haystack.includes(hint) ? 1 : 0), 0);
}

export function searchIfcEntities(
  entities: IfcEntityRecord[],
  tradeId: InstallationPilot["tradeId"],
  query: string,
  limit = 80,
) {
  const needle = query.trim().toLowerCase();
  return entities
    .filter((entity) => entity.kind === "object")
    .filter((entity) => {
      if (!needle) return true;
      return [entity.entityType, entity.globalId, entity.name, entity.description, entity.tag]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    })
    .sort((a, b) => {
      const scoreDelta = scoreIfcEntityForTrade(b, tradeId) - scoreIfcEntityForTrade(a, tradeId);
      if (scoreDelta) return scoreDelta;
      return a.stepId - b.stepId;
    })
    .slice(0, limit);
}

function isIfcGuidMapping(value: unknown): value is IfcGuidMapping {
  if (!value || typeof value !== "object") return false;
  const mapping = value as Partial<IfcGuidMapping>;
  return Boolean(
    mapping.nexusObjectId &&
      SAFE_NEXUS_ID.test(mapping.nexusObjectId) &&
      mapping.ifcGlobalId &&
      IFC_GUID.test(mapping.ifcGlobalId) &&
      mapping.ifcEntityType &&
      mapping.ifcEntityType.startsWith("IFC") &&
      Number.isFinite(mapping.ifcStepId) &&
      mapping.sourceFileName &&
      typeof mapping.sourceFileSize === "number" &&
      mapping.mappedAt,
  );
}

export function loadIfcMappings(): IfcGuidMapping[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(IFC_MAPPING_STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isIfcGuidMapping);
  } catch {
    return [];
  }
}

export function saveIfcMappings(mappings: IfcGuidMapping[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(IFC_MAPPING_STORAGE_KEY, JSON.stringify(mappings));
  } catch {
    // Local persistence is optional. The active browser session still works.
  }
}

export function upsertIfcMapping(mappings: IfcGuidMapping[], next: IfcGuidMapping) {
  return [
    ...mappings.filter(
      (mapping) =>
        mapping.nexusObjectId !== next.nexusObjectId &&
        !(
          mapping.ifcGlobalId === next.ifcGlobalId &&
          mapping.sourceFileSha256 &&
          mapping.sourceFileSha256 === next.sourceFileSha256
        ),
    ),
    next,
  ];
}
