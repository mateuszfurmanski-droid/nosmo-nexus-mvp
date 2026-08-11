import type { Vec3 } from "./ifc-lite-geometry";
import type { IfcLocalModelSession } from "./ifc-mapping";
import { ensureWebIfcRuntime, WEB_IFC_WASM_URL, type WebIfcApi } from "./ifc-web-ifc-runtime";

export type IfcLengthUnit = {
  label: string;
  metresPerUnit?: number;
};

export type IfcObjectGeometrySnapshot = {
  globalId: string;
  stepId: number;
  sourceFileName: string;
  sourceFileSha256?: string;
  sourceProjectGlobalId?: string;
  coordinationMatrix?: number[];
  lengthUnit: IfcLengthUnit;
  min: Vec3;
  max: Vec3;
  center: Vec3;
  dimensions: Vec3;
  vertexCount: number;
  triangleCount: number;
  placementCount: number;
};

export type IfcGeometryFrameState = "MODEL_FRAME_MATCH" | "MODEL_FRAME_MISMATCH" | "MODEL_FRAME_UNKNOWN";

export type IfcGeometryRevisionDiff = {
  globalId: string;
  baseline: IfcObjectGeometrySnapshot;
  current: IfcObjectGeometrySnapshot;
  frameState: IfcGeometryFrameState;
  sameProject: boolean | "UNKNOWN";
  sameLengthUnit: boolean | "UNKNOWN";
  centerDelta: Vec3;
  movementDistance: number;
  dimensionDelta: Vec3;
  maxDimensionDelta: number;
  triangleDelta: number;
  vertexDelta: number;
  movementCandidate: boolean;
  sizeOrShapeChanged: boolean;
  humanReviewRequired: boolean;
  warnings: string[];
};

type WebIfcVector<T> = { size(): number; get(index: number): T };
type PlacedGeometry = { geometryExpressID: number; flatTransformation: number[] };
type FlatMesh = { expressID: number; geometries: WebIfcVector<PlacedGeometry>; delete?: () => void };
type GeometryHandle = {
  GetVertexData(): number;
  GetVertexDataSize(): number;
  GetIndexData(): number;
  GetIndexDataSize(): number;
  delete?: () => void;
};

type GeometryDiffApi = WebIfcApi & {
  LoadAllGeometry(modelID: number): unknown;
  GetCoordinationMatrix(modelID: number): number[];
  GetExpressIdFromGuid(modelID: number, guid: string): string | number | undefined;
  GetFlatMesh(modelID: number, expressID: number): FlatMesh;
  GetGeometry(modelID: number, geometryExpressID: number): GeometryHandle;
};

const PREFIX_METRES: Record<string, number> = {
  EXA: 1e18,
  PETA: 1e15,
  TERA: 1e12,
  GIGA: 1e9,
  MEGA: 1e6,
  KILO: 1e3,
  HECTO: 1e2,
  DECA: 1e1,
  DECI: 1e-1,
  CENTI: 1e-2,
  MILLI: 1e-3,
  MICRO: 1e-6,
  NANO: 1e-9,
  PICO: 1e-12,
};

function resolveLengthUnit(text: string): IfcLengthUnit {
  const si = text.match(/IFCSIUNIT\s*\([^;]*?\.LENGTHUNIT\.\s*,\s*(?:\.([A-Z]+)\.|\$)\s*,\s*\.METRE\./i);
  if (si) {
    const prefix = si[1]?.toUpperCase();
    return {
      label: prefix ? `${prefix.toLowerCase()}metre` : "metre",
      metresPerUnit: prefix ? PREFIX_METRES[prefix] : 1,
    };
  }
  return { label: "model unit (unresolved)" };
}

function transformPoint(point: Vec3, matrix: number[]): Vec3 {
  if (matrix.length < 16) return point;
  return {
    x: matrix[0]! * point.x + matrix[4]! * point.y + matrix[8]! * point.z + matrix[12]!,
    y: matrix[1]! * point.x + matrix[5]! * point.y + matrix[9]! * point.z + matrix[13]!,
    z: matrix[2]! * point.x + matrix[6]! * point.y + matrix[10]! * point.z + matrix[14]!,
  };
}

function matrixNearlyEqual(a?: number[], b?: number[]) {
  if (!a || !b || a.length < 16 || b.length < 16) return undefined;
  for (let index = 0; index < 16; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    const scale = Math.max(1, Math.abs(left), Math.abs(right));
    if (Math.abs(left - right) > scale * 1e-7) return false;
  }
  return true;
}

function numberFromExpressId(value: string | number | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
}

function vectorDelta(after: Vec3, before: Vec3): Vec3 {
  return { x: after.x - before.x, y: after.y - before.y, z: after.z - before.z };
}

function magnitude(vector: Vec3) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function maxAbs(vector: Vec3) {
  return Math.max(Math.abs(vector.x), Math.abs(vector.y), Math.abs(vector.z));
}

function changeTolerance(snapshot: IfcObjectGeometrySnapshot) {
  if (snapshot.lengthUnit.metresPerUnit) return 0.001 / snapshot.lengthUnit.metresPerUnit; // 1 mm in model units.
  const scale = Math.max(snapshot.dimensions.x, snapshot.dimensions.y, snapshot.dimensions.z, 1);
  return scale * 1e-6;
}

export async function loadIfcObjectGeometrySnapshot(
  session: IfcLocalModelSession,
  globalId: string,
): Promise<IfcObjectGeometrySnapshot> {
  const runtime = await ensureWebIfcRuntime();
  const api = new runtime.IfcAPI() as GeometryDiffApi;
  let modelID = -1;

  try {
    await api.Init((path) => (path.endsWith(".wasm") ? WEB_IFC_WASM_URL : path), true);
    modelID = api.OpenModel(new TextEncoder().encode(session.text));
    if (modelID < 0) throw new Error("web-ifc could not open this IFC revision for geometry comparison.");

    // web-ifc documents LoadAllGeometry before coordination-matrix retrieval.
    api.LoadAllGeometry(modelID);
    const coordinationMatrix = api.GetCoordinationMatrix(modelID);
    const expressID = numberFromExpressId(api.GetExpressIdFromGuid(modelID, globalId));
    if (expressID === undefined) throw new Error(`GlobalId ${globalId} has no express ID in ${session.fileName}.`);

    const flatMesh = api.GetFlatMesh(modelID, expressID);
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    let vertexCount = 0;
    let triangleCount = 0;
    let placementCount = 0;

    try {
      for (let placementIndex = 0; placementIndex < flatMesh.geometries.size(); placementIndex += 1) {
        const placed = flatMesh.geometries.get(placementIndex);
        placementCount += 1;
        const geometry = api.GetGeometry(modelID, placed.geometryExpressID);
        try {
          const vertices = api.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
          const indices = api.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
          triangleCount += Math.floor(indices.length / 3);
          for (let index = 0; index + 5 < vertices.length; index += 6) {
            const point = transformPoint(
              { x: vertices[index]!, y: vertices[index + 1]!, z: vertices[index + 2]! },
              placed.flatTransformation,
            );
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            minZ = Math.min(minZ, point.z);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
            maxZ = Math.max(maxZ, point.z);
            vertexCount += 1;
          }
        } finally {
          geometry.delete?.();
        }
      }
    } finally {
      flatMesh.delete?.();
    }

    if (!vertexCount || !Number.isFinite(minX)) {
      throw new Error(`GlobalId ${globalId} has no usable tessellated geometry in ${session.fileName}.`);
    }

    const min = { x: minX, y: minY, z: minZ };
    const max = { x: maxX, y: maxY, z: maxZ };
    return {
      globalId,
      stepId: expressID,
      sourceFileName: session.fileName,
      sourceFileSha256: session.sha256,
      sourceProjectGlobalId: session.parsed.projectGlobalId,
      coordinationMatrix: coordinationMatrix?.length >= 16 ? coordinationMatrix.slice(0, 16) : undefined,
      lengthUnit: resolveLengthUnit(session.text),
      min,
      max,
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
      dimensions: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
      vertexCount,
      triangleCount,
      placementCount,
    };
  } finally {
    if (modelID >= 0) api.CloseModel(modelID);
    api.Dispose?.();
  }
}

export async function compareIfcObjectGeometryRevisions(
  baselineSession: IfcLocalModelSession,
  currentSession: IfcLocalModelSession,
  globalId: string,
): Promise<IfcGeometryRevisionDiff> {
  // Sequential reads deliberately avoid keeping two WASM models open on mobile.
  const baseline = await loadIfcObjectGeometrySnapshot(baselineSession, globalId);
  const current = await loadIfcObjectGeometrySnapshot(currentSession, globalId);
  const warnings: string[] = [];
  const sameProject = baseline.sourceProjectGlobalId && current.sourceProjectGlobalId
    ? baseline.sourceProjectGlobalId === current.sourceProjectGlobalId
    : "UNKNOWN" as const;
  const sameLengthUnit = baseline.lengthUnit.metresPerUnit && current.lengthUnit.metresPerUnit
    ? Math.abs(baseline.lengthUnit.metresPerUnit - current.lengthUnit.metresPerUnit) < 1e-15
    : "UNKNOWN" as const;
  const matrixMatch = matrixNearlyEqual(baseline.coordinationMatrix, current.coordinationMatrix);
  const frameState: IfcGeometryFrameState = sameProject === false || matrixMatch === false || sameLengthUnit === false
    ? "MODEL_FRAME_MISMATCH"
    : sameProject === true && matrixMatch === true && sameLengthUnit === true
      ? "MODEL_FRAME_MATCH"
      : "MODEL_FRAME_UNKNOWN";

  if (sameProject === false) warnings.push("IFCPROJECT GlobalId differs; coordinate movement cannot be interpreted as one project revision lineage.");
  if (matrixMatch === false) warnings.push("web-ifc coordination matrices differ between revisions; raw centroid movement may include a model-frame/origin change.");
  if (sameLengthUnit === false) warnings.push("IFC length units differ between revisions; raw geometric deltas are not directly comparable.");
  if (sameLengthUnit === "UNKNOWN") warnings.push("One or both IFC length units could not be resolved to SI metres; deltas remain in model units.");

  const centerDelta = vectorDelta(current.center, baseline.center);
  const dimensionDelta = vectorDelta(current.dimensions, baseline.dimensions);
  const movementDistance = magnitude(centerDelta);
  const maxDimensionDelta = maxAbs(dimensionDelta);
  const triangleDelta = current.triangleCount - baseline.triangleCount;
  const vertexDelta = current.vertexCount - baseline.vertexCount;
  const tolerance = Math.max(changeTolerance(baseline), changeTolerance(current));
  const sizeOrShapeChanged = maxDimensionDelta > tolerance || triangleDelta !== 0 || vertexDelta !== 0;
  const movementCandidate = frameState === "MODEL_FRAME_MATCH" && movementDistance > tolerance;
  const humanReviewRequired = movementCandidate || sizeOrShapeChanged || frameState !== "MODEL_FRAME_MATCH";

  return {
    globalId,
    baseline,
    current,
    frameState,
    sameProject,
    sameLengthUnit,
    centerDelta,
    movementDistance,
    dimensionDelta,
    maxDimensionDelta,
    triangleDelta,
    vertexDelta,
    movementCandidate,
    sizeOrShapeChanged,
    humanReviewRequired,
    warnings,
  };
}

export function formatIfcGeometryDistance(value: number, unit: IfcLengthUnit) {
  if (unit.metresPerUnit) {
    const millimetres = value * unit.metresPerUnit * 1000;
    if (Math.abs(millimetres) < 1000) return `${millimetres.toFixed(1)} mm`;
    return `${(millimetres / 1000).toFixed(3)} m`;
  }
  return `${value.toFixed(4)} ${unit.label}`;
}
