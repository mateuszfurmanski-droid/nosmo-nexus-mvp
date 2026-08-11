import type { IfcLocalModelSession } from "./ifc-mapping";
import { ensureWebIfcRuntime, WEB_IFC_WASM_URL } from "./ifc-web-ifc-runtime";

export type IfcSourceProperty = {
  name: string;
  value: string;
};

export type IfcSourcePropertyGroup = {
  kind: "PSET" | "TYPE" | "MATERIAL";
  name: string;
  expressId?: number;
  properties: IfcSourceProperty[];
};

export type IfcSourcePropertiesSnapshot = {
  globalId: string;
  stepId: number;
  entityType: string;
  itemProperties: IfcSourceProperty[];
  propertySets: IfcSourcePropertyGroup[];
  typeProperties: IfcSourcePropertyGroup[];
  materials: IfcSourcePropertyGroup[];
  sourceFileName: string;
  sourceFileSize: number;
  sourceFileSha256?: string;
  sourceSchema?: string;
  sourceProjectGlobalId?: string;
  readAt: string;
  warnings: string[];
};

const VALUE_KEYS = [
  "NominalValue",
  "LengthValue",
  "AreaValue",
  "VolumeValue",
  "CountValue",
  "WeightValue",
  "TimeValue",
  "BooleanValue",
  "LogicalValue",
  "EnumerationValues",
  "ListValues",
  "UpperBoundValue",
  "LowerBoundValue",
  "SetPointValue",
  "Description",
  "ObjectType",
  "Tag",
  "PredefinedType",
  "Category",
] as const;

const SKIP_KEYS = new Set([
  "expressID",
  "type",
  "GlobalId",
  "OwnerHistory",
  "ObjectPlacement",
  "Representation",
  "HasProperties",
  "Quantities",
]);

function scalar(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  if (Array.isArray(value)) {
    const parts = value.map((entry) => scalar(entry)).filter((entry): entry is string => Boolean(entry));
    return parts.length ? parts.slice(0, 12).join(", ") : undefined;
  }
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  if ("value" in candidate) return scalar(candidate.value);
  if ("Name" in candidate && Object.keys(candidate).length <= 4) return scalar(candidate.Name);
  return undefined;
}

function expressId(record: Record<string, unknown>) {
  return typeof record.expressID === "number" ? record.expressID : undefined;
}

function recordName(record: Record<string, unknown>, fallback: string) {
  return scalar(record.Name) ?? scalar(record.ObjectType) ?? fallback;
}

function pushUnique(target: IfcSourceProperty[], property: IfcSourceProperty, limit = 160) {
  if (target.length >= limit) return;
  if (target.some((entry) => entry.name === property.name && entry.value === property.value)) return;
  target.push(property);
}

function collectSimpleTopLevel(record: Record<string, unknown>, limit = 30) {
  const properties: IfcSourceProperty[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (SKIP_KEYS.has(key)) continue;
    const rendered = scalar(value);
    if (rendered === undefined || rendered === "") continue;
    pushUnique(properties, { name: key, value: rendered }, limit);
  }
  return properties;
}

function collectPropertyLeaves(
  value: unknown,
  target: IfcSourceProperty[],
  depth = 0,
  seen = new Set<object>(),
) {
  if (target.length >= 160 || depth > 6 || value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) collectPropertyLeaves(item, target, depth + 1, seen);
    return;
  }
  if (typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  const record = value as Record<string, unknown>;
  const propertyName = scalar(record.Name);
  if (propertyName) {
    for (const key of VALUE_KEYS) {
      if (!(key in record)) continue;
      const rendered = scalar(record[key]);
      if (rendered !== undefined && rendered !== "") {
        pushUnique(target, { name: propertyName, value: rendered });
        break;
      }
    }
  }

  for (const [key, child] of Object.entries(record)) {
    if (SKIP_KEYS.has(key) && key !== "HasProperties" && key !== "Quantities") continue;
    if (key === "Name" || VALUE_KEYS.includes(key as (typeof VALUE_KEYS)[number])) continue;
    collectPropertyLeaves(child, target, depth + 1, seen);
  }
}

function normaliseGroups(records: Record<string, unknown>[], kind: IfcSourcePropertyGroup["kind"]) {
  return records.slice(0, 40).map((record, index) => {
    const properties = collectSimpleTopLevel(record, 20);
    collectPropertyLeaves(record.HasProperties, properties);
    collectPropertyLeaves(record.Quantities, properties);
    collectPropertyLeaves(record, properties);
    return {
      kind,
      name: recordName(record, `${kind} ${index + 1}`),
      expressId: expressId(record),
      properties,
    } satisfies IfcSourcePropertyGroup;
  });
}

async function readGroup(
  label: string,
  reader: () => Promise<Record<string, unknown>[]>,
  warnings: string[],
) {
  try {
    const value = await reader();
    return Array.isArray(value) ? value : [];
  } catch (error) {
    warnings.push(`${label} could not be read from this IFC object.`);
    return [];
  }
}

export async function loadIfcSourceProperties(
  session: IfcLocalModelSession,
  stepId: number,
  expectedGlobalId?: string,
): Promise<IfcSourcePropertiesSnapshot> {
  const runtime = await ensureWebIfcRuntime();
  const api = new runtime.IfcAPI();
  const warnings: string[] = [];
  let modelID = -1;

  try {
    await api.Init((path) => (path.endsWith(".wasm") ? WEB_IFC_WASM_URL : path), true);
    modelID = api.OpenModel(new TextEncoder().encode(session.text));
    if (modelID < 0) throw new Error("web-ifc could not open this IFC model for property reading.");

    const guid = api.GetGuidFromExpressId(modelID, stepId);
    if (typeof guid !== "string" || !guid) throw new Error(`IFC object #${stepId} has no readable GlobalId.`);
    if (expectedGlobalId && guid !== expectedGlobalId) {
      throw new Error(`IFC identity mismatch: geometry selected ${expectedGlobalId}, property reader resolved ${guid}.`);
    }

    const lineType = api.GetLineType(modelID, stepId);
    const entityType = api.GetNameFromTypeCode(lineType) || "IFCPRODUCT";

    let item: Record<string, unknown> = api.GetLine(modelID, stepId) ?? {};
    try {
      item = (await api.properties.getItemProperties(modelID, stepId, false, false)) ?? item;
    } catch {
      warnings.push("web-ifc item helper was unavailable; Nexus used the direct IFC line for basic source fields.");
    }

    const psets = await readGroup(
      "Property sets",
      () => api.properties.getPropertySets(modelID, stepId, true, true),
      warnings,
    );
    const typeProperties = await readGroup(
      "Type properties",
      () => api.properties.getTypeProperties(modelID, stepId, true),
      warnings,
    );
    const materials = await readGroup(
      "Material properties",
      () => api.properties.getMaterialsProperties(modelID, stepId, true, true),
      warnings,
    );

    return {
      globalId: guid,
      stepId,
      entityType,
      itemProperties: collectSimpleTopLevel(item, 40),
      propertySets: normaliseGroups(psets, "PSET"),
      typeProperties: normaliseGroups(typeProperties, "TYPE"),
      materials: normaliseGroups(materials, "MATERIAL"),
      sourceFileName: session.fileName,
      sourceFileSize: session.fileSize,
      sourceFileSha256: session.sha256,
      sourceSchema: session.parsed.schema,
      sourceProjectGlobalId: session.parsed.projectGlobalId,
      readAt: new Date().toISOString(),
      warnings,
    };
  } finally {
    if (modelID >= 0) api.CloseModel(modelID);
    api.Dispose?.();
  }
}
