import type { NexusWorldDefinition } from './registryTypes';

export const nexusWorlds: NexusWorldDefinition[] = [
  {
    id: 'esafe-catania',
    name: 'e-SAFE Catania',
    status: 'demo',
    description:
      'Primary and only active Nexus demo Project World for e-SAFE Catania project memory, files, timeline, evidence and project graph testing.',
    defaultRole: 'Manager',
    allowedRoles: ['Manager', 'Joiner', 'Electrician', 'Safety', 'Viewer'],
    modules: ['project', 'time', 'people', 'docs', 'cloud', 'soft', 'integrations', 'evidence'],
    connectors: ['google-drive', 'work-wallet', 'bim-fabstation', 'gmail-whatsapp'],
    notes:
      'e-SAFE is the only active demo/test world in this MVP foundation. Do not add Riverside, Halifax or another demo fixture without a founder checkpoint.',
  },
];

export const getNexusWorld = (id: string) => nexusWorlds.find((world) => world.id === id);
