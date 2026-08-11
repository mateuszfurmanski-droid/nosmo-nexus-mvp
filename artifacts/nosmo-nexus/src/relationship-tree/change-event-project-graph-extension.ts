import { FileCheck2, FileText, GitCompareArrows } from "lucide-react";
import {
  NODES,
  OBJECT_LINKS,
  PERSON_LINKS,
  TASK_LINKS,
  type WorkspaceNode,
} from "@/components/workspace-data";
import { SYNTHETIC_CHANGE_EVENTS } from "./change-event-projection";

function appendNode(node: WorkspaceNode) {
  if (!NODES.some((existing) => existing.id === node.id)) NODES.push(node);
}

function appendDirectLink(a: string, b: string) {
  if (!PERSON_LINKS.some(([left, right]) => (left === a && right === b) || (left === b && right === a))) {
    // The current persistent graph uses PERSON_LINKS as its generic direct-edge
    // compatibility registry. Keep this shim isolated here until the graph edge
    // registry is renamed/refactored; these are not person-only semantics.
    PERSON_LINKS.push([a, b]);
  }
}

function appendTaskDocument(taskId: string, documentId: string) {
  const task = TASK_LINKS[taskId];
  if (!task || task.docs.includes(documentId)) return;
  task.docs.push(documentId);
}

function appendObjectDocument(objectId: string, documentId: string) {
  const object = OBJECT_LINKS[objectId];
  if (!object || object.docs.includes(documentId)) return;
  object.docs.push(documentId);
}

for (const event of SYNTHETIC_CHANGE_EVENTS) {
  const rfiId = event.links.rfis[0];
  const evidenceId = event.links.documents.find((id) => id.startsWith("d-chg-evidence"));

  // Current radial Timeline positions temporal records through the document
  // primitive. The node ID remains the canonical Change Event ID; no duplicate
  // timeline/event model is created. A later graph-schema slice can introduce a
  // first-class `change` NodeType without changing event identity or links.
  appendNode({
    id: event.id,
    label: `Change Event · ${event.decision.code.replaceAll("_", " ")}`,
    sublabel: `${event.objectId} · ${event.reviewState.replaceAll("_", " ")} · SYNTHETIC`,
    type: "document",
    Icon: GitCompareArrows,
    receivedAt: event.decision.decidedAt,
    documentDate: event.decision.decidedAt.slice(0, 10),
    externalId: event.ifcGlobalId,
    trade: event.trade,
    workPackage: event.workPackage,
  });

  if (rfiId) {
    appendNode({
      id: rfiId,
      label: "RFI-DEMO-018 · Revised CT-E21 route",
      sublabel: "RFI · Prepared from Change Event · SYNTHETIC",
      type: "document",
      Icon: FileText,
      receivedAt: "2026-08-11T05:42:00Z",
      documentDate: "2026-08-11",
      externalId: event.id,
      trade: event.trade,
      workPackage: event.workPackage,
    });
  }

  if (evidenceId) {
    appendNode({
      id: evidenceId,
      label: "CT-E21 revision evidence set",
      sublabel: "Evidence requirement · SYNTHETIC",
      type: "document",
      Icon: FileCheck2,
      receivedAt: "2026-08-11T05:43:00Z",
      documentDate: "2026-08-11",
      externalId: event.id,
      trade: event.trade,
      workPackage: event.workPackage,
    });
  }

  appendTaskDocument(event.taskId, event.id);
  appendObjectDocument(event.objectId, event.id);
  if (rfiId) {
    appendTaskDocument(event.taskId, rfiId);
    appendObjectDocument(event.objectId, rfiId);
    appendDirectLink(event.id, rfiId);
  }
  if (evidenceId) {
    appendTaskDocument(event.taskId, evidenceId);
    appendObjectDocument(event.objectId, evidenceId);
    appendDirectLink(event.id, evidenceId);
  }

  for (const personId of event.links.people) appendDirectLink(event.id, personId);
  for (const issueId of event.links.issues) appendDirectLink(event.id, issueId);
  for (const inspectionId of event.links.inspections) {
    appendDirectLink(event.id, inspectionId);
    if (evidenceId) appendDirectLink(evidenceId, inspectionId);
  }
  appendDirectLink(event.id, event.objectId);
  appendDirectLink(event.id, event.taskId);
}
