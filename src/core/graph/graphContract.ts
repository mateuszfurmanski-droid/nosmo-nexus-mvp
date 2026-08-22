import { defineNexusCore } from '../coreContract';
import type { NexusObjectType } from '../../registry/registryTypes';

export interface NexusGraphNode {
  id: string;
  objectType: NexusObjectType;
  label: string;
  worldId: string;
  sourceModuleId?: string;
  externalConnectorId?: string;
}

export interface NexusGraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: string;
  confidence?: number;
}

export const nexusGraphCore = defineNexusCore({
  id: 'graph',
  label: 'Project Graph',
  responsibility: 'Own the persistent relationship tree/project graph data contract linking people, companies, projects, files, tasks, assets, evidence and approvals.',
  ownsRuntimeState: true,
  canRenderUi: true,
  canMutateProjectGraph: true,
  canReadProjectMemory: true,
  canWriteProjectMemory: true,
  phase: 'phase-4-skeleton',
  notes: 'Graph is the background workspace. Modules attach context to graph nodes; they do not replace the graph.',
});
