import type { NexusProjectMemorySnapshot } from '../projectMemory';
import { emptyProjectMemorySnapshot } from '../projectMemory';

export const createEsafeCataniaMemory = (): NexusProjectMemorySnapshot => {
  const memory = emptyProjectMemorySnapshot();

  memory.projects.push({
    id: 'project-esafe-catania',
    title: 'e-SAFE Catania',
    projectCode: 'ESAFE-CATANIA',
    projectStatus: 'demo',
    worldIds: ['world-esafe-catania'],
    status: 'active',
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
    sourceSystem: 'nexus',
    confidence: 'manual',
  });

  memory.worlds.push({
    id: 'world-esafe-catania',
    title: 'e-SAFE Catania Project World',
    projectId: 'project-esafe-catania',
    worldCode: 'esafe-catania',
    isolation: 'strict',
    defaultRole: 'manager',
    allowedRoles: ['manager', 'installer', 'client-viewer'],
    enabledModuleIds: ['project', 'time', 'people', 'docs', 'cloud', 'soft', 'integrations', 'evidence'],
    enabledConnectorIds: ['google-drive', 'work-wallet', 'bim-fabstation', 'gmail-whatsapp'],
    status: 'active',
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
    sourceSystem: 'nexus',
    confidence: 'manual',
    notes: 'Strictly isolated from Riverside. No shared evidence records.',
  });

  return memory;
};
