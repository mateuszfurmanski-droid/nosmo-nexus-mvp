import { extractIfcLiteGeometry, type IfcLiteGeometryResult } from "./ifc-lite-geometry";
import type { IfcLocalModelSession } from "./ifc-mapping";
import { loadWebIfcGeometry, WEB_IFC_VERSION } from "./ifc-web-ifc-runtime";

export type IfcRendererBackendId = "lite-step" | "web-ifc-wasm";

export type IfcRendererCapabilities = {
  geometry: boolean;
  selectionByGlobalId: boolean;
  selectionByStepId: boolean;
  propertyRead: boolean;
  geometryCoverage: "controlled-subset" | "full-engine";
};

export type IfcRendererLoadOptions = {
  targetStepId?: number;
  maxObjects?: number;
  maxTriangles?: number;
};

export interface IfcRendererAdapter<TScene = unknown> {
  id: IfcRendererBackendId;
  label: string;
  capabilities: IfcRendererCapabilities;
  runtime: "bundled" | "pinned-network-development";
  load(session: IfcLocalModelSession, options?: IfcRendererLoadOptions): Promise<TScene> | TScene;
}

export const liteStepRenderer: IfcRendererAdapter<IfcLiteGeometryResult> = {
  id: "lite-step",
  label: "Nexus Lite STEP Geometry",
  runtime: "bundled",
  capabilities: {
    geometry: true,
    selectionByGlobalId: true,
    selectionByStepId: true,
    propertyRead: false,
    geometryCoverage: "controlled-subset",
  },
  load(session, options) {
    return extractIfcLiteGeometry(session.text, session.parsed, {
      targetStepId: options?.targetStepId,
      maxObjects: options?.maxObjects ?? 120,
      maxTriangles: options?.maxTriangles ?? 6000,
    });
  },
};

export const webIfcWasmRenderer: IfcRendererAdapter<IfcLiteGeometryResult> = {
  id: "web-ifc-wasm",
  label: `web-ifc WASM ${WEB_IFC_VERSION}`,
  runtime: "pinned-network-development",
  capabilities: {
    geometry: true,
    selectionByGlobalId: true,
    selectionByStepId: true,
    propertyRead: true,
    geometryCoverage: "full-engine",
  },
  load(session, options) {
    return loadWebIfcGeometry(session, options);
  },
};

export const IFC_RENDERERS = [liteStepRenderer, webIfcWasmRenderer] as const;

export function getIfcRendererAdapter(id: IfcRendererBackendId = "lite-step") {
  return id === "web-ifc-wasm" ? webIfcWasmRenderer : liteStepRenderer;
}
