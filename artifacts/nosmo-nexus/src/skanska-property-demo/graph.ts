import {
  assets,
  building,
  companies,
  floors,
  materials,
  people,
  propertyPortfolio,
  spaces,
  type HistoryEvent,
} from "./data";

export type CommercialGraphNodeType =
  | "PROPERTY_PORTFOLIO"
  | "BUILDING"
  | "FLOOR"
  | "SPACE"
  | "ASSET"
  | "MATERIAL"
  | "PERSON"
  | "COMPANY"
  | "ISSUE"
  | "TASK"
  | "INSPECTION"
  | "DOCUMENT"
  | "PHOTO"
  | "MAINTENANCE_EVENT"
  | "APPROVAL"
  | "REPLACEMENT_EVENT"
  | "REUSE_EVENT"
  | "ESG_EVIDENCE";

export type CommercialGraphRelation =
  | "CONTAINS"
  | "LOCATED_ON"
  | "LOCATED_IN"
  | "COMPOSED_OF"
  | "INSTALLED_BY"
  | "OWNED_BY"
  | "BELONGS_TO"
  | "INSTALLED_BY_COMPANY"
  | "SERVICED_BY"
  | "HAS_ISSUE"
  | "HAS_EVENT"
  | "HAS_DOCUMENT"
  | "HAS_PHOTO"
  | "HAS_TASK"
  | "ASSIGNED_TO"
  | "ABOUT_ASSET"
  | "PRODUCED_EVIDENCE"
  | "APPROVED_BY"
  | "TRIGGERED_REPLACEMENT"
  | "HAS_REUSE_ROUTE"
  | "HAS_ESG_EVIDENCE";

export type CommercialWorkflowStage =
  | "issue"
  | "task"
  | "work"
  | "evidence"
  | "approved"
  | "updated"
  | "reuse"
  | "esg";

export interface CommercialGraphNode {
  id: string;
  type: CommercialGraphNodeType;
  label: string;
  provenance: "SYNTHETIC_DEMO";
  sourceId?: string;
}

export interface CommercialGraphEdge {
  id: string;
  from: string;
  to: string;
  relation: CommercialGraphRelation;
}

export interface CommercialGraphProjection {
  schema: "nexus-commercial-building-graph/v1";
  projectLabel: "SKANSKA Property Demo Building";
  workflowStage: CommercialWorkflowStage;
  nodes: CommercialGraphNode[];
  edges: CommercialGraphEdge[];
}

const stageOrder: CommercialWorkflowStage[] = [
  "issue",
  "task",
  "work",
  "evidence",
  "approved",
  "updated",
  "reuse",
  "esg",
];

function reached(current: CommercialWorkflowStage, required: CommercialWorkflowStage) {
  return stageOrder.indexOf(current) >= stageOrder.indexOf(required);
}

function eventNodeType(event: HistoryEvent): CommercialGraphNodeType {
  switch (event.type) {
    case "INSPECTION":
      return "INSPECTION";
    case "APPROVAL":
      return "APPROVAL";
    case "REPLACEMENT":
      return "REPLACEMENT_EVENT";
    case "REUSE":
      return "REUSE_EVENT";
    default:
      return "MAINTENANCE_EVENT";
  }
}

function node(id: string, type: CommercialGraphNodeType, label: string, sourceId?: string): CommercialGraphNode {
  return { id, type, label, provenance: "SYNTHETIC_DEMO", sourceId };
}

function edge(from: string, to: string, relation: CommercialGraphRelation): CommercialGraphEdge {
  return { id: `${from}::${relation}::${to}`, from, to, relation };
}

export function buildCommercialDemoGraph(workflowStage: CommercialWorkflowStage = "issue"): CommercialGraphProjection {
  const nodes: CommercialGraphNode[] = [];
  const edges: CommercialGraphEdge[] = [];

  nodes.push(node(propertyPortfolio.id, "PROPERTY_PORTFOLIO", propertyPortfolio.name));
  nodes.push(node(building.id, "BUILDING", building.name));
  edges.push(edge(propertyPortfolio.id, building.id, "CONTAINS"));

  for (const floor of floors) {
    nodes.push(node(floor.id, "FLOOR", `${floor.level} · ${floor.name}`));
    edges.push(edge(building.id, floor.id, "CONTAINS"));
  }

  for (const space of spaces) {
    nodes.push(node(space.id, "SPACE", `${space.code} · ${space.name}`));
    edges.push(edge(space.floorId, space.id, "CONTAINS"));
  }

  for (const company of companies) {
    nodes.push(node(company.id, "COMPANY", company.name));
  }

  for (const person of people) {
    nodes.push(node(person.id, "PERSON", `${person.name} · ${person.role}`));
    edges.push(edge(person.id, person.companyId, "BELONGS_TO"));
  }

  for (const material of materials) {
    nodes.push(node(material.id, "MATERIAL", material.name));
  }

  for (const asset of assets) {
    nodes.push(node(asset.id, "ASSET", `${asset.tag} · ${asset.name}`, asset.bimRef));
    edges.push(edge(asset.id, asset.floorId, "LOCATED_ON"));
    edges.push(edge(asset.id, asset.spaceId, "LOCATED_IN"));
    edges.push(edge(asset.id, asset.installerPersonId, "INSTALLED_BY"));
    edges.push(edge(asset.id, asset.fmOwnerPersonId, "OWNED_BY"));
    edges.push(edge(asset.id, asset.installerCompanyId, "INSTALLED_BY_COMPANY"));
    edges.push(edge(asset.id, asset.serviceCompanyId, "SERVICED_BY"));

    for (const materialId of asset.materialIds) {
      edges.push(edge(asset.id, materialId, "COMPOSED_OF"));
    }

    asset.manuals.forEach((label, index) => {
      const id = `document:${asset.id}:manual:${index + 1}`;
      nodes.push(node(id, "DOCUMENT", label));
      edges.push(edge(asset.id, id, "HAS_DOCUMENT"));
    });

    asset.certificates.forEach((label, index) => {
      const id = `document:${asset.id}:certificate:${index + 1}`;
      nodes.push(node(id, "DOCUMENT", label));
      edges.push(edge(asset.id, id, "HAS_DOCUMENT"));
    });

    asset.photos.forEach((label, index) => {
      const id = `photo:${asset.id}:${index + 1}`;
      nodes.push(node(id, "PHOTO", label));
      edges.push(edge(asset.id, id, "HAS_PHOTO"));
    });

    for (const event of asset.history) {
      const id = `event:${asset.id}:${event.id}`;
      nodes.push(node(id, eventNodeType(event), `${event.title} · ${event.date}`));
      edges.push(edge(asset.id, id, "HAS_EVENT"));
      if (event.personId) edges.push(edge(id, event.personId, event.type === "APPROVAL" ? "APPROVED_BY" : "ASSIGNED_TO"));
      if (event.companyId) edges.push(edge(id, event.companyId, "BELONGS_TO"));
    }

    if (asset.issue) {
      const issueId = `issue:${asset.issue.id}`;
      nodes.push(node(issueId, "ISSUE", asset.issue.title));
      edges.push(edge(asset.id, issueId, "HAS_ISSUE"));
    }
  }

  const workflowAsset = assets.find((asset) => asset.id === "asset-ahu-04");
  if (!workflowAsset?.issue || !workflowAsset.replacement) {
    throw new Error("Commercial graph requires the AHU-04 issue and replacement fixture");
  }

  const issueId = `issue:${workflowAsset.issue.id}`;
  const taskId = "task:ahu-04-bearing-inspection";

  if (reached(workflowStage, "task")) {
    nodes.push(node(taskId, "TASK", "AHU-04 bearing inspection"));
    edges.push(edge(workflowAsset.id, taskId, "HAS_TASK"));
    edges.push(edge(issueId, taskId, "HAS_TASK"));
    edges.push(edge(taskId, "person-piotr-service", "ASSIGNED_TO"));
    edges.push(edge(taskId, workflowAsset.id, "ABOUT_ASSET"));
  }

  if (reached(workflowStage, "evidence")) {
    for (const evidenceId of ["evidence:ahu-04:nameplate-photo", "evidence:ahu-04:bearing-photo"]) {
      nodes.push(node(evidenceId, "PHOTO", evidenceId.endsWith("nameplate-photo") ? "AHU-04 nameplate evidence" : "AHU-04 bearing evidence"));
      edges.push(edge(taskId, evidenceId, "PRODUCED_EVIDENCE"));
      edges.push(edge(workflowAsset.id, evidenceId, "HAS_PHOTO"));
    }
    const inspectionId = "inspection:ahu-04:field-completion";
    nodes.push(node(inspectionId, "INSPECTION", "AHU-04 field inspection completion"));
    edges.push(edge(workflowAsset.id, inspectionId, "HAS_EVENT"));
    edges.push(edge(taskId, inspectionId, "PRODUCED_EVIDENCE"));
  }

  if (reached(workflowStage, "approved")) {
    const approvalId = "approval:ahu-04:fm-evidence";
    nodes.push(node(approvalId, "APPROVAL", "AHU-04 evidence approval"));
    edges.push(edge(workflowAsset.id, approvalId, "HAS_EVENT"));
    edges.push(edge(approvalId, "person-anna-fm", "APPROVED_BY"));
  }

  if (reached(workflowStage, "updated")) {
    const replacementId = "replacement:ahu-04:fan-module";
    nodes.push(node(replacementId, "REPLACEMENT_EVENT", workflowAsset.replacement.replacementOption));
    edges.push(edge(workflowAsset.id, replacementId, "TRIGGERED_REPLACEMENT"));
  }

  if (reached(workflowStage, "reuse")) {
    const reuseId = "reuse:ahu-04:cross-project-opportunity";
    nodes.push(node(reuseId, "REUSE_EVENT", workflowAsset.replacement.reuseOpportunity));
    edges.push(edge(workflowAsset.id, reuseId, "HAS_REUSE_ROUTE"));
    for (const materialId of workflowAsset.materialIds) {
      edges.push(edge(reuseId, materialId, "COMPOSED_OF"));
    }
  }

  if (reached(workflowStage, "esg")) {
    const esgId = "esg:ahu-04:circular-evidence";
    nodes.push(node(esgId, "ESG_EVIDENCE", "AHU-04 circularity / ESG evidence"));
    edges.push(edge(workflowAsset.id, esgId, "HAS_ESG_EVIDENCE"));
    edges.push(edge("reuse:ahu-04:cross-project-opportunity", esgId, "HAS_ESG_EVIDENCE"));
  }

  return {
    schema: "nexus-commercial-building-graph/v1",
    projectLabel: "SKANSKA Property Demo Building",
    workflowStage,
    nodes,
    edges,
  };
}

export function validateCommercialGraphProjection(graph: CommercialGraphProjection) {
  const nodeIds = new Set(graph.nodes.map((item) => item.id));
  const edgeIds = new Set<string>();
  const errors: string[] = [];

  if (nodeIds.size !== graph.nodes.length) errors.push("DUPLICATE_NODE_ID");

  for (const item of graph.nodes) {
    if (item.provenance !== "SYNTHETIC_DEMO") errors.push(`INVALID_PROVENANCE:${item.id}`);
  }

  for (const item of graph.edges) {
    if (edgeIds.has(item.id)) errors.push(`DUPLICATE_EDGE_ID:${item.id}`);
    edgeIds.add(item.id);
    if (!nodeIds.has(item.from)) errors.push(`MISSING_EDGE_SOURCE:${item.id}`);
    if (!nodeIds.has(item.to)) errors.push(`MISSING_EDGE_TARGET:${item.id}`);
  }

  return { valid: errors.length === 0, errors };
}
