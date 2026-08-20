import type { NexusApprovalRecord, NexusEvidenceRecord } from './schemas/evidence.schema';
import type { NexusFileRecord, NexusDrawingReferenceRecord } from './schemas/file.schema';
import type { NexusGraphEdgeRecord, NexusGraphNodeRecord } from './schemas/graph.schema';
import type { NexusPersonRecord, NexusProjectRoleRecord } from './schemas/person.schema';
import type { NexusCompanyRecord, NexusProjectRecord, NexusProjectWorldRecord } from './schemas/project.schema';
import type { NexusAssetRecord, NexusTaskRecord } from './schemas/task.schema';
import type { NexusTimelineEventRecord } from './schemas/timeline.schema';

export interface NexusProjectMemorySnapshot {
  projects: NexusProjectRecord[];
  worlds: NexusProjectWorldRecord[];
  companies: NexusCompanyRecord[];
  people: NexusPersonRecord[];
  projectRoles: NexusProjectRoleRecord[];
  files: NexusFileRecord[];
  drawingReferences: NexusDrawingReferenceRecord[];
  tasks: NexusTaskRecord[];
  assets: NexusAssetRecord[];
  evidence: NexusEvidenceRecord[];
  approvals: NexusApprovalRecord[];
  timelineEvents: NexusTimelineEventRecord[];
  graphNodes: NexusGraphNodeRecord[];
  graphEdges: NexusGraphEdgeRecord[];
}

export const emptyProjectMemorySnapshot = (): NexusProjectMemorySnapshot => ({
  projects: [],
  worlds: [],
  companies: [],
  people: [],
  projectRoles: [],
  files: [],
  drawingReferences: [],
  tasks: [],
  assets: [],
  evidence: [],
  approvals: [],
  timelineEvents: [],
  graphNodes: [],
  graphEdges: [],
});
