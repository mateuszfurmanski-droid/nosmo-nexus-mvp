import { extractIfcLiteGeometry, type IfcLiteGeometryResult } from "./ifc-lite-geometry";
import type { IfcLocalModelSession } from "./ifc-mapping";

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
  load(session: IfcLocalModelSession, options?: IfcRendererLoadOptions): TScene;
}

export const liteStepRenderer: IfcRendererAdapter<IfcLiteGeometryResult> = {
  id: "lite-step",
  label: "Nexus Lite STEP Geometry",
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

export const plannedWebIfcRenderer = {
  id: "web-ifc-wasm" as const,
  label: "web-ifc WASM",
  capabilities: {
    geometry: true,
    selectionByGlobalId: true,
    selectionByStepId: true,
    propertyRead: true,
    geometryCoverage: "full-engine" as const,
  },
  status: "PLANNED_ADAPTER" as const,
};

export function getIfcRendererAdapter() {
  return liteStepRenderer;
}
