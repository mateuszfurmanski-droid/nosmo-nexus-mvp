import type { NexusProjectMemorySnapshot } from '../projectMemory';
import { emptyProjectMemorySnapshot } from '../projectMemory';

export const createRiversideMemory = (): NexusProjectMemorySnapshot => {
  const memory = emptyProjectMemorySnapshot();

  memory.projects.push({
    id: 'project-riverside',
    title: 'Riverside',
    projectCode: 'RIVERSIDE',
    projectStatus: 'demo',
    worldIds: ['world-riverside'],
    status: 'active',
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
    sourceSystem: 'nexus',
    confidence: 'manual',
  });

  memory.worlds.push({
    id: 'world-riverside',
    title: 'Riverside Project World',
    projectId: 'project-riverside',
    worldCode: 'riverside',
    isolation: 'strict',
    defaultRole: 'manager',
    allowedRoles: ['manager', 'installer', 'client-viewer'],
    enabledModuleIds: ['project', 'time', 'people', 'docs', 'cloud', 'soft', 'integrations', 'evidence'],
    enabledConnectorIds: ['google-drive', 'bim-fabstation', 'gmail-whatsapp'],
    status: 'active',
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
    sourceSystem: 'nexus',
    confidence: 'manual',
    notes: 'Strictly isolated from e-SAFE Catania. Riverside is a separate Project World.',
  });

  return memory;
};
