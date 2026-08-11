import type { IfcEntityRecord, IfcParseResult } from "./ifc-mapping";

export type Vec3 = { x: number; y: number; z: number };
export type Triangle = [number, number, number];

export type IfcLiteMesh = {
  stepId: number;
  globalId: string;
  entityType: string;
  name?: string;
  vertices: Vec3[];
  triangles: Triangle[];
  representationKinds: string[];
};

export type IfcLiteGeometryResult = {
  meshes: IfcLiteMesh[];
  renderedObjectCount: number;
  renderedTriangleCount: number;
  supportedRepresentationCount: number;
  skippedRepresentationCount: number;
  warnings: string[];
};

type StepRecord = {
  id: number;
  type: string;
  args: string[];
};

type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

type LocalGeometry = {
  vertices: Vec3[];
  triangles: Triangle[];
  representationKinds: string[];
};

const IDENTITY: Mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

const SUPPORTED_ITEM_TYPES = new Set([
  "IFCEXTRUDEDAREASOLID",
  "IFCTRIANGULATEDFACESET",
  "IFCPOLYGONALFACESET",
  "IFCFACETEDBREP",
]);

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

function parseRecords(text: string) {
  const records = new Map<number, StepRecord>();
  for (const statement of splitStepStatements(text)) {
    const match = statement.match(/^#(\d+)\s*=\s*(IFC[A-Z0-9_]+)\s*\(([\s\S]*)\)$/i);
    if (!match) continue;
    const id = Number(match[1]);
    records.set(id, {
      id,
      type: match[2]!.toUpperCase(),
      args: splitTopLevelArguments(match[3]!),
    });
  }
  return records;
}

function parseRef(token?: string) {
  const match = token?.trim().match(/^#(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

function parseRefs(token?: string) {
  if (!token) return [];
  return [...token.matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
}

function parseNumber(token?: string) {
  if (!token) return undefined;
  const value = Number(token.trim());
  return Number.isFinite(value) ? value : undefined;
}

function parseNumericTuples(token?: string) {
  if (!token) return [] as number[][];
  const tuples: number[][] = [];
  const inner = token.trim().replace(/^\(/, "").replace(/\)$/, "");
  let start = 0;
  let depth = 0;
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];
    if (char === "(") {
      if (depth === 0) start = index + 1;
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        const values = inner
          .slice(start, index)
          .split(",")
          .map((value) => Number(value.trim()))
          .filter(Number.isFinite);
        if (values.length) tuples.push(values);
      }
    }
  }
  if (!tuples.length) {
    const values = inner
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isFinite);
    if (values.length) tuples.push(values);
  }
  return tuples;
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(a: Vec3, scalar: number): Vec3 {
  return { x: a.x * scalar, y: a.y * scalar, z: a.z * scalar };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalise(vector: Vec3, fallback: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(length) || length < 1e-9) return fallback;
  return scale(vector, 1 / length);
}

function matrixFromBasis(origin: Vec3, x: Vec3, y: Vec3, z: Vec3): Mat4 {
  return [
    x.x, x.y, x.z, 0,
    y.x, y.y, y.z, 0,
    z.x, z.y, z.z, 0,
    origin.x, origin.y, origin.z, 1,
  ];
}

function multiplyMatrix(a: Mat4, b: Mat4): Mat4 {
  const result = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      result[column * 4 + row] =
        a[0 * 4 + row]! * b[column * 4 + 0]! +
        a[1 * 4 + row]! * b[column * 4 + 1]! +
        a[2 * 4 + row]! * b[column * 4 + 2]! +
        a[3 * 4 + row]! * b[column * 4 + 3]!;
    }
  }
  return result as Mat4;
}

function transformPoint(matrix: Mat4, point: Vec3): Vec3 {
  return {
    x: matrix[0] * point.x + matrix[4] * point.y + matrix[8] * point.z + matrix[12],
    y: matrix[1] * point.x + matrix[5] * point.y + matrix[9] * point.z + matrix[13],
    z: matrix[2] * point.x + matrix[6] * point.y + matrix[10] * point.z + matrix[14],
  };
}

function pointFromRecord(records: Map<number, StepRecord>, ref?: number): Vec3 | undefined {
  if (!ref) return undefined;
  const record = records.get(ref);
  if (!record || record.type !== "IFCCARTESIANPOINT") return undefined;
  const tuple = parseNumericTuples(record.args[0])[0];
  if (!tuple) return undefined;
  return { x: tuple[0] ?? 0, y: tuple[1] ?? 0, z: tuple[2] ?? 0 };
}

function directionFromRecord(records: Map<number, StepRecord>, ref?: number): Vec3 | undefined {
  if (!ref) return undefined;
  const record = records.get(ref);
  if (!record || record.type !== "IFCDIRECTION") return undefined;
  const tuple = parseNumericTuples(record.args[0])[0];
  if (!tuple) return undefined;
  return normalise(
    { x: tuple[0] ?? 0, y: tuple[1] ?? 0, z: tuple[2] ?? 0 },
    { x: 0, y: 0, z: 1 },
  );
}

function axisPlacementMatrix(records: Map<number, StepRecord>, ref?: number): Mat4 {
  if (!ref) return IDENTITY;
  const record = records.get(ref);
  if (!record) return IDENTITY;

  if (record.type === "IFCAXIS2PLACEMENT3D") {
    const origin = pointFromRecord(records, parseRef(record.args[0])) ?? { x: 0, y: 0, z: 0 };
    const z = directionFromRecord(records, parseRef(record.args[1])) ?? { x: 0, y: 0, z: 1 };
    let x = directionFromRecord(records, parseRef(record.args[2])) ?? { x: 1, y: 0, z: 0 };
    if (Math.abs(dot(x, z)) > 0.999) x = { x: 1, y: 0, z: 0 };
    const y = normalise(cross(z, x), { x: 0, y: 1, z: 0 });
    x = normalise(cross(y, z), { x: 1, y: 0, z: 0 });
    return matrixFromBasis(origin, x, y, z);
  }

  if (record.type === "IFCAXIS2PLACEMENT2D") {
    const point = pointFromRecord(records, parseRef(record.args[0])) ?? { x: 0, y: 0, z: 0 };
    const refDirection = directionFromRecord(records, parseRef(record.args[1])) ?? { x: 1, y: 0, z: 0 };
    const x = normalise({ x: refDirection.x, y: refDirection.y, z: 0 }, { x: 1, y: 0, z: 0 });
    const z = { x: 0, y: 0, z: 1 };
    const y = normalise(cross(z, x), { x: 0, y: 1, z: 0 });
    return matrixFromBasis(point, x, y, z);
  }

  return IDENTITY;
}

function localPlacementMatrix(
  records: Map<number, StepRecord>,
  ref?: number,
  visited = new Set<number>(),
): Mat4 {
  if (!ref || visited.has(ref)) return IDENTITY;
  visited.add(ref);
  const record = records.get(ref);
  if (!record || record.type !== "IFCLOCALPLACEMENT") return IDENTITY;
  const parentRef = parseRef(record.args[0]);
  const relativeRef = parseRef(record.args[1]);
  const parent = parentRef ? localPlacementMatrix(records, parentRef, visited) : IDENTITY;
  const relative = axisPlacementMatrix(records, relativeRef);
  return multiplyMatrix(parent, relative);
}

function curvePoints(records: Map<number, StepRecord>, ref?: number): Vec3[] {
  if (!ref) return [];
  const record = records.get(ref);
  if (!record) return [];

  if (record.type === "IFCPOLYLINE") {
    return parseRefs(record.args[0])
      .map((pointRef) => pointFromRecord(records, pointRef))
      .filter((point): point is Vec3 => Boolean(point));
  }

  if (record.type === "IFCINDEXEDPOLYCURVE") {
    const pointListRef = parseRef(record.args[0]);
    const pointList = pointListRef ? records.get(pointListRef) : undefined;
    if (!pointList || !["IFCCARTESIANPOINTLIST2D", "IFCCARTESIANPOINTLIST3D"].includes(pointList.type)) return [];
    return parseNumericTuples(pointList.args[0]).map((tuple) => ({
      x: tuple[0] ?? 0,
      y: tuple[1] ?? 0,
      z: tuple[2] ?? 0,
    }));
  }

  return [];
}

function profilePoints(records: Map<number, StepRecord>, ref?: number): Vec3[] {
  if (!ref) return [];
  const record = records.get(ref);
  if (!record) return [];

  if (record.type === "IFCRECTANGLEPROFILEDEF") {
    const position = axisPlacementMatrix(records, parseRef(record.args[2]));
    const xDim = parseNumber(record.args[3]);
    const yDim = parseNumber(record.args[4]);
    if (!xDim || !yDim) return [];
    const hx = xDim / 2;
    const hy = yDim / 2;
    return [
      { x: -hx, y: -hy, z: 0 },
      { x: hx, y: -hy, z: 0 },
      { x: hx, y: hy, z: 0 },
      { x: -hx, y: hy, z: 0 },
    ].map((point) => transformPoint(position, point));
  }

  if (record.type === "IFCCIRCLEPROFILEDEF") {
    const position = axisPlacementMatrix(records, parseRef(record.args[2]));
    const radius = parseNumber(record.args[3]);
    if (!radius) return [];
    return Array.from({ length: 20 }, (_, index) => {
      const angle = (index / 20) * Math.PI * 2;
      return transformPoint(position, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: 0 });
    });
  }

  if (record.type === "IFCARBITRARYCLOSEDPROFILEDEF") {
    return curvePoints(records, parseRef(record.args[2]));
  }

  return [];
}

function triangulateFan(startIndex: number, count: number, reverse = false): Triangle[] {
  const triangles: Triangle[] = [];
  for (let index = 1; index < count - 1; index += 1) {
    triangles.push(reverse
      ? [startIndex, startIndex + index + 1, startIndex + index]
      : [startIndex, startIndex + index, startIndex + index + 1]);
  }
  return triangles;
}

function buildExtrudedAreaSolid(records: Map<number, StepRecord>, record: StepRecord): LocalGeometry | null {
  const profile = profilePoints(records, parseRef(record.args[0]));
  const position = axisPlacementMatrix(records, parseRef(record.args[1]));
  const direction = directionFromRecord(records, parseRef(record.args[2])) ?? { x: 0, y: 0, z: 1 };
  const depth = parseNumber(record.args[3]);
  if (profile.length < 3 || !depth || depth <= 0) return null;

  const extrusion = scale(direction, depth);
  const bottom = profile.map((point) => transformPoint(position, point));
  const top = profile.map((point) => transformPoint(position, add(point, extrusion)));
  const vertices = [...bottom, ...top];
  const count = profile.length;
  const triangles: Triangle[] = [
    ...triangulateFan(0, count, true),
    ...triangulateFan(count, count, false),
  ];
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    triangles.push([index, next, count + next], [index, count + next, count + index]);
  }
  return { vertices, triangles, representationKinds: [record.type] };
}

function buildTriangulatedFaceSet(records: Map<number, StepRecord>, record: StepRecord): LocalGeometry | null {
  const pointList = records.get(parseRef(record.args[0]) ?? -1);
  if (!pointList || pointList.type !== "IFCCARTESIANPOINTLIST3D") return null;
  const vertices = parseNumericTuples(pointList.args[0]).map((tuple) => ({
    x: tuple[0] ?? 0,
    y: tuple[1] ?? 0,
    z: tuple[2] ?? 0,
  }));
  const faces = parseNumericTuples(record.args[3]);
  const triangles: Triangle[] = [];
  for (const face of faces) {
    if (face.length < 3) continue;
    const indices = face.map((value) => Math.max(0, Math.trunc(value) - 1));
    for (let index = 1; index < indices.length - 1; index += 1) {
      triangles.push([indices[0]!, indices[index]!, indices[index + 1]!]);
    }
  }
  return vertices.length && triangles.length
    ? { vertices, triangles, representationKinds: [record.type] }
    : null;
}

function buildPolygonalFaceSet(records: Map<number, StepRecord>, record: StepRecord): LocalGeometry | null {
  const pointList = records.get(parseRef(record.args[0]) ?? -1);
  if (!pointList || pointList.type !== "IFCCARTESIANPOINTLIST3D") return null;
  const vertices = parseNumericTuples(pointList.args[0]).map((tuple) => ({
    x: tuple[0] ?? 0,
    y: tuple[1] ?? 0,
    z: tuple[2] ?? 0,
  }));
  const triangles: Triangle[] = [];
  for (const faceRef of parseRefs(record.args[2])) {
    const face = records.get(faceRef);
    if (!face || !face.type.startsWith("IFCINDEXEDPOLYGONALFACE")) continue;
    const indices = parseNumericTuples(face.args[0])[0]?.map((value) => Math.max(0, Math.trunc(value) - 1)) ?? [];
    for (let index = 1; index < indices.length - 1; index += 1) {
      triangles.push([indices[0]!, indices[index]!, indices[index + 1]!]);
    }
  }
  return vertices.length && triangles.length
    ? { vertices, triangles, representationKinds: [record.type] }
    : null;
}

function buildFacetedBrep(records: Map<number, StepRecord>, record: StepRecord): LocalGeometry | null {
  const shell = records.get(parseRef(record.args[0]) ?? -1);
  if (!shell || !["IFCCLOSEDSHELL", "IFCOPENSHELL"].includes(shell.type)) return null;
  const vertices: Vec3[] = [];
  const triangles: Triangle[] = [];

  for (const faceRef of parseRefs(shell.args[0])) {
    const face = records.get(faceRef);
    if (!face || face.type !== "IFCFACE") continue;
    const boundRef = parseRefs(face.args[0])[0];
    const bound = boundRef ? records.get(boundRef) : undefined;
    if (!bound || !["IFCFACEOUTERBOUND", "IFCFACEBOUND"].includes(bound.type)) continue;
    const loop = records.get(parseRef(bound.args[0]) ?? -1);
    if (!loop || loop.type !== "IFCPOLYLOOP") continue;
    const points = parseRefs(loop.args[0])
      .map((pointRef) => pointFromRecord(records, pointRef))
      .filter((point): point is Vec3 => Boolean(point));
    if (points.length < 3) continue;
    const start = vertices.length;
    vertices.push(...points);
    triangles.push(...triangulateFan(start, points.length, bound.args[1]?.trim().toUpperCase() === ".F."));
  }

  return vertices.length && triangles.length
    ? { vertices, triangles, representationKinds: [record.type] }
    : null;
}

function buildRepresentationItem(records: Map<number, StepRecord>, ref: number): LocalGeometry | null {
  const record = records.get(ref);
  if (!record) return null;
  if (record.type === "IFCEXTRUDEDAREASOLID") return buildExtrudedAreaSolid(records, record);
  if (record.type === "IFCTRIANGULATEDFACESET") return buildTriangulatedFaceSet(records, record);
  if (record.type === "IFCPOLYGONALFACESET") return buildPolygonalFaceSet(records, record);
  if (record.type === "IFCFACETEDBREP") return buildFacetedBrep(records, record);
  return null;
}

function productGeometry(records: Map<number, StepRecord>, entity: IfcEntityRecord): LocalGeometry | null {
  const product = records.get(entity.stepId);
  if (!product || product.args.length < 7) return null;
  const placement = localPlacementMatrix(records, parseRef(product.args[5]));
  const representation = records.get(parseRef(product.args[6]) ?? -1);
  if (!representation || representation.type !== "IFCPRODUCTDEFINITIONSHAPE") return null;

  const vertices: Vec3[] = [];
  const triangles: Triangle[] = [];
  const representationKinds = new Set<string>();

  for (const shapeRef of parseRefs(representation.args[2])) {
    const shape = records.get(shapeRef);
    if (!shape || shape.type !== "IFCSHAPEREPRESENTATION") continue;
    for (const itemRef of parseRefs(shape.args[3])) {
      const item = buildRepresentationItem(records, itemRef);
      if (!item) continue;
      const offset = vertices.length;
      vertices.push(...item.vertices.map((point) => transformPoint(placement, point)));
      triangles.push(...item.triangles.map(([a, b, c]) => [a + offset, b + offset, c + offset] as Triangle));
      item.representationKinds.forEach((kind) => representationKinds.add(kind));
    }
  }

  if (!vertices.length || !triangles.length) return null;
  return { vertices, triangles, representationKinds: [...representationKinds] };
}

export function extractIfcLiteGeometry(
  text: string,
  parsed: IfcParseResult,
  options?: {
    targetStepId?: number;
    maxObjects?: number;
    maxTriangles?: number;
  },
): IfcLiteGeometryResult {
  const records = parseRecords(text);
  const maxObjects = Math.max(1, options?.maxObjects ?? 120);
  const maxTriangles = Math.max(100, options?.maxTriangles ?? 6000);
  const warnings: string[] = [];
  const meshes: IfcLiteMesh[] = [];
  let renderedTriangleCount = 0;
  let supportedRepresentationCount = 0;
  let skippedRepresentationCount = 0;

  const candidates = parsed.entities
    .filter((entity) => entity.kind === "object")
    .sort((a, b) => {
      if (a.stepId === options?.targetStepId) return -1;
      if (b.stepId === options?.targetStepId) return 1;
      return a.stepId - b.stepId;
    });

  for (const entity of candidates) {
    if (meshes.length >= maxObjects || renderedTriangleCount >= maxTriangles) break;
    const product = records.get(entity.stepId);
    const productRepresentation = product ? records.get(parseRef(product.args[6]) ?? -1) : undefined;
    if (productRepresentation?.type === "IFCPRODUCTDEFINITIONSHAPE") {
      const itemTypes = new Set<string>();
      for (const shapeRef of parseRefs(productRepresentation.args[2])) {
        const shape = records.get(shapeRef);
        if (!shape || shape.type !== "IFCSHAPEREPRESENTATION") continue;
        for (const itemRef of parseRefs(shape.args[3])) {
          const itemType = records.get(itemRef)?.type;
          if (itemType) itemTypes.add(itemType);
        }
      }
      itemTypes.forEach((type) => {
        if (SUPPORTED_ITEM_TYPES.has(type)) supportedRepresentationCount += 1;
        else skippedRepresentationCount += 1;
      });
    }

    const geometry = productGeometry(records, entity);
    if (!geometry) continue;
    const remaining = maxTriangles - renderedTriangleCount;
    if (remaining <= 0) break;
    const triangles = geometry.triangles.slice(0, remaining);
    meshes.push({
      stepId: entity.stepId,
      globalId: entity.globalId,
      entityType: entity.entityType,
      name: entity.name,
      vertices: geometry.vertices,
      triangles,
      representationKinds: geometry.representationKinds,
    });
    renderedTriangleCount += triangles.length;
  }

  if (!meshes.length) {
    warnings.push("No supported geometry was found. This lite preview currently supports extruded solids, faceted BReps and IFC4 polygonal/triangulated face sets.");
  }
  if (renderedTriangleCount >= maxTriangles) warnings.push(`Geometry preview stopped at the mobile-safe ${maxTriangles.toLocaleString()} triangle limit.`);
  if (meshes.length >= maxObjects) warnings.push(`Geometry preview stopped at the ${maxObjects} object limit.`);
  if (skippedRepresentationCount > 0) warnings.push(`${skippedRepresentationCount} representation item(s) use geometry types not yet rendered by the lite preview.`);

  return {
    meshes,
    renderedObjectCount: meshes.length,
    renderedTriangleCount,
    supportedRepresentationCount,
    skippedRepresentationCount,
    warnings,
  };
}
