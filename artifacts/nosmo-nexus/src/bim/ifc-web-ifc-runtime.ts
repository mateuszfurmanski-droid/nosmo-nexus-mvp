import type { IfcLiteGeometryResult, IfcLiteMesh, Triangle, Vec3 } from "./ifc-lite-geometry";
import type { IfcLocalModelSession } from "./ifc-mapping";
import type { IfcRendererLoadOptions } from "./ifc-renderer-adapter";

export const WEB_IFC_VERSION = "0.0.77";
export type WebIfcRuntimeDelivery = "local-self-hosted" | "pinned-network-development";

export const WEB_IFC_LOCAL_ASSET_ROOT = `${import.meta.env.BASE_URL}vendor/web-ifc/${WEB_IFC_VERSION}/`;
export const WEB_IFC_LOCAL_RUNTIME_URL = `${WEB_IFC_LOCAL_ASSET_ROOT}web-ifc-api-iife.js`;
export const WEB_IFC_LOCAL_WASM_URL = `${WEB_IFC_LOCAL_ASSET_ROOT}web-ifc.wasm`;

export const WEB_IFC_DEVELOPMENT_RUNTIME_URL = `https://cdn.jsdelivr.net/npm/web-ifc@${WEB_IFC_VERSION}/web-ifc-api-iife.js`;
export const WEB_IFC_DEVELOPMENT_WASM_URL = `https://cdn.jsdelivr.net/npm/web-ifc@${WEB_IFC_VERSION}/web-ifc.wasm`;

const requestedDevelopmentDelivery = import.meta.env.VITE_WEB_IFC_RUNTIME_DELIVERY === "local-self-hosted"
  ? "local-self-hosted"
  : "pinned-network-development";

/**
 * Production is deliberately fail-closed to same-origin assets. A production build
 * must never fall back to jsDelivr or another third-party runtime host. Development
 * keeps the existing pinned-network opt-in until the package-manager-generated
 * web-ifc dependency/lockfile and copied JS/WASM assets land in the next slice.
 */
export const WEB_IFC_RUNTIME_DELIVERY: WebIfcRuntimeDelivery = import.meta.env.PROD
  ? "local-self-hosted"
  : requestedDevelopmentDelivery;

export const WEB_IFC_RUNTIME_URL = WEB_IFC_RUNTIME_DELIVERY === "local-self-hosted"
  ? WEB_IFC_LOCAL_RUNTIME_URL
  : WEB_IFC_DEVELOPMENT_RUNTIME_URL;

export const WEB_IFC_WASM_URL = WEB_IFC_RUNTIME_DELIVERY === "local-self-hosted"
  ? WEB_IFC_LOCAL_WASM_URL
  : WEB_IFC_DEVELOPMENT_WASM_URL;

type WebIfcVector<T> = {
  size(): number;
  get(index: number): T;
};

type WebIfcPlacedGeometry = {
  geometryExpressID: number;
  flatTransformation: number[];
};

type WebIfcFlatMesh = {
  expressID: number;
  geometries: WebIfcVector<WebIfcPlacedGeometry>;
  delete?: () => void;
};

type WebIfcGeometry = {
  GetVertexData(): number;
  GetVertexDataSize(): number;
  GetIndexData(): number;
  GetIndexDataSize(): number;
  delete?: () => void;
};

export type WebIfcPropertiesApi = {
  getItemProperties(modelID: number, id: number, recursive?: boolean, inverse?: boolean): Promise<Record<string, unknown> | undefined>;
  getPropertySets(modelID: number, elementID?: number, recursive?: boolean, includeTypeProperties?: boolean): Promise<Record<string, unknown>[]>;
  getTypeProperties(modelID: number, elementID?: number, recursive?: boolean): Promise<Record<string, unknown>[]>;
  getMaterialsProperties(modelID: number, elementID?: number, recursive?: boolean, includeTypeMaterials?: boolean): Promise<Record<string, unknown>[]>;
};

export type WebIfcApi = {
  properties: WebIfcPropertiesApi;
  Init(locateFile?: (path: string, prefix?: string) => string, forceSingleThread?: boolean): Promise<void>;
  OpenModel(data: Uint8Array): number;
  CloseModel(modelID: number): void;
  Dispose?(): void;
  StreamAllMeshes(modelID: number, callback: (mesh: WebIfcFlatMesh, index: number, total: number) => void): void;
  GetGeometry(modelID: number, geometryExpressID: number): WebIfcGeometry;
  GetVertexArray(ptr: number, size: number): Float32Array;
  GetIndexArray(ptr: number, size: number): Uint32Array;
  GetGuidFromExpressId(modelID: number, expressID: number): string | number | undefined;
  GetLine(modelID: number, expressID: number): Record<string, unknown> | undefined;
  GetLineType(modelID: number, expressID: number): number;
  GetNameFromTypeCode(type: number): string;
};

export type WebIfcGlobal = {
  IfcAPI: new () => WebIfcApi;
};

declare global {
  interface Window {
    WebIFC?: WebIfcGlobal;
  }
}

let runtimePromise: Promise<WebIfcGlobal> | null = null;

function scalarValue(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { value?: unknown };
  return typeof candidate.value === "string" ? candidate.value : undefined;
}

export function ensureWebIfcRuntime() {
  if (typeof window === "undefined") return Promise.reject(new Error("web-ifc requires a browser runtime."));
  if (window.WebIFC?.IfcAPI) return Promise.resolve(window.WebIFC);
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise<WebIfcGlobal>((resolve, reject) => {
    const deliveryKey = `${WEB_IFC_VERSION}:${WEB_IFC_RUNTIME_DELIVERY}`;
    const existing = document.querySelector<HTMLScriptElement>(`script[data-nosmo-web-ifc="${deliveryKey}"]`);
    const script = existing ?? document.createElement("script");

    const finish = () => {
      if (window.WebIFC?.IfcAPI) resolve(window.WebIFC);
      else reject(new Error("Pinned web-ifc runtime loaded without exposing WebIFC.IfcAPI."));
    };

    if (existing) {
      if (window.WebIFC?.IfcAPI) finish();
      else {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("Pinned web-ifc runtime failed to load.")), { once: true });
      }
      return;
    }

    script.src = WEB_IFC_RUNTIME_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.dataset.nosmoWebIfc = deliveryKey;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => {
      const source = WEB_IFC_RUNTIME_DELIVERY === "local-self-hosted"
        ? `same-origin web-ifc ${WEB_IFC_VERSION} assets at ${WEB_IFC_LOCAL_ASSET_ROOT}`
        : `pinned development web-ifc ${WEB_IFC_VERSION} runtime`;
      reject(new Error(`Unable to load ${source}. Lite STEP remains available.`));
    }, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    runtimePromise = null;
    throw error;
  });

  return runtimePromise;
}

function transformPoint(point: Vec3, matrix: number[]): Vec3 {
  if (matrix.length < 16) return point;
  return {
    x: matrix[0]! * point.x + matrix[4]! * point.y + matrix[8]! * point.z + matrix[12]!,
    y: matrix[1]! * point.x + matrix[5]! * point.y + matrix[9]! * point.z + matrix[13]!,
    z: matrix[2]! * point.x + matrix[6]! * point.y + matrix[10]! * point.z + matrix[14]!,
  };
}

function appendPlacedGeometry(
  api: WebIfcApi,
  modelID: number,
  placed: WebIfcPlacedGeometry,
  vertices: Vec3[],
  triangles: Triangle[],
  triangleBudget: number,
) {
  const geometry = api.GetGeometry(modelID, placed.geometryExpressID);
  try {
    const rawVertices = api.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
    const rawIndices = api.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
    const vertexOffset = vertices.length;

    // web-ifc vertex buffers are position + normal (6 floats per vertex).
    for (let index = 0; index + 5 < rawVertices.length; index += 6) {
      vertices.push(transformPoint({ x: rawVertices[index]!, y: rawVertices[index + 1]!, z: rawVertices[index + 2]! }, placed.flatTransformation));
    }

    const remaining = Math.max(0, triangleBudget - triangles.length);
    const triangleCount = Math.min(Math.floor(rawIndices.length / 3), remaining);
    for (let index = 0; index < triangleCount; index += 1) {
      const base = index * 3;
      triangles.push([
        vertexOffset + rawIndices[base]!,
        vertexOffset + rawIndices[base + 1]!,
        vertexOffset + rawIndices[base + 2]!,
      ]);
    }
  } finally {
    geometry.delete?.();
  }
}

export async function loadWebIfcGeometry(
  session: IfcLocalModelSession,
  options: IfcRendererLoadOptions = {},
): Promise<IfcLiteGeometryResult> {
  const runtime = await ensureWebIfcRuntime();
  const api = new runtime.IfcAPI();
  const warnings: string[] = [];
  const meshes: IfcLiteMesh[] = [];
  const maxObjects = options.maxObjects ?? 120;
  const maxTriangles = options.maxTriangles ?? 6000;
  let renderedTriangles = 0;
  let placementCount = 0;
  let skipped = 0;
  let modelID = -1;

  try {
    await api.Init((path) => (path.endsWith(".wasm") ? WEB_IFC_WASM_URL : path), true);
    modelID = api.OpenModel(new TextEncoder().encode(session.text));
    if (modelID < 0) throw new Error("web-ifc could not open this IFC model.");

    const priorityStep = options.targetStepId;
    const pending: WebIfcFlatMesh[] = [];
    api.StreamAllMeshes(modelID, (flatMesh) => {
      pending.push(flatMesh);
    });

    pending.sort((a, b) => {
      if (a.expressID === priorityStep) return -1;
      if (b.expressID === priorityStep) return 1;
      return a.expressID - b.expressID;
    });

    for (const flatMesh of pending) {
      try {
        if (meshes.length >= maxObjects || renderedTriangles >= maxTriangles) {
          skipped += 1;
          continue;
        }

        const guid = api.GetGuidFromExpressId(modelID, flatMesh.expressID);
        if (typeof guid !== "string" || !guid) {
          skipped += 1;
          continue;
        }

        const vertices: Vec3[] = [];
        const triangles: Triangle[] = [];
        const productLine = api.GetLine(modelID, flatMesh.expressID);
        const lineType = api.GetLineType(modelID, flatMesh.expressID);
        const entityType = api.GetNameFromTypeCode(lineType) || "IFCPRODUCT";

        for (let index = 0; index < flatMesh.geometries.size(); index += 1) {
          if (renderedTriangles + triangles.length >= maxTriangles) break;
          const placed = flatMesh.geometries.get(index);
          placementCount += 1;
          appendPlacedGeometry(api, modelID, placed, vertices, triangles, maxTriangles - renderedTriangles);
        }

        if (!triangles.length || !vertices.length) {
          skipped += 1;
          continue;
        }

        renderedTriangles += triangles.length;
        meshes.push({
          stepId: flatMesh.expressID,
          globalId: guid,
          entityType,
          name: scalarValue(productLine?.Name) ?? scalarValue(productLine?.Tag),
          vertices,
          triangles,
          representationKinds: ["web-ifc-wasm"],
        });
      } finally {
        flatMesh.delete?.();
      }
    }

    if (pending.length > meshes.length) warnings.push(`${pending.length - meshes.length} web-ifc mesh record(s) were not rendered within the preview limits or had no usable identity/geometry.`);
    if (renderedTriangles >= maxTriangles) warnings.push(`Full-engine preview reached the ${maxTriangles.toLocaleString()} triangle mobile limit.`);
    if (meshes.length >= maxObjects) warnings.push(`Full-engine preview reached the ${maxObjects} object mobile limit.`);

    return {
      meshes,
      renderedObjectCount: meshes.length,
      renderedTriangleCount: renderedTriangles,
      supportedRepresentationCount: placementCount,
      skippedRepresentationCount: skipped,
      warnings,
    };
  } finally {
    if (modelID >= 0) api.CloseModel(modelID);
    api.Dispose?.();
  }
}
