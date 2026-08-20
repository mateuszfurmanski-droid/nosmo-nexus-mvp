import type { NexusWorldDefinition } from './registryTypes';

export const nexusWorlds: NexusWorldDefinition[] = [
  {
    id: 'esafe-catania',
    name: 'e-SAFE Catania',
    status: 'demo',
    description: 'Separated Project World for e-SAFE Catania safety, evidence, files and project graph context.',
    defaultRole: 'Manager',
    allowedRoles: ['Manager', 'Joiner', 'Electrician', 'Safety', 'Viewer'],
    modules: ['project', 'time', 'people', 'docs', 'cloud', 'soft', 'integrations', 'evidence'],
    connectors: ['google-drive', 'work-wallet', 'bim-fabstation', 'gmail-whatsapp'],
    notes: 'Must not share evidence or source records with Riverside. Demo worlds remain separated by world id.',
  },
  {
    id: 'riverside',
    name: 'Riverside',
    status: 'demo',
    description: 'Separated Project World for Riverside demo workflow, files, people and graph context.',
    defaultRole: 'Manager',
    allowedRoles: ['Manager', 'Joiner', 'Electrician', 'Viewer'],
    modules: ['project', 'time', 'people', 'docs', 'cloud', 'soft', 'integrations', 'evidence'],
    connectors: ['google-drive', 'bim-fabstation', 'gmail-whatsapp'],
    notes: 'Must not mix with e-SAFE Catania. Riverside is a separate world, not a shared folder view.',
  },
  {
    id: 'halifax-lloyds',
    name: 'Halifax / Lloyds Demo',
    status: 'planned',
    description: 'Future demo Project World for DoorFlow, fire-door evidence, drawings and fit-out workflows.',
    defaultRole: 'Manager',
    allowedRoles: ['Manager', 'Joiner', 'FireDoorInspector', 'Viewer'],
    modules: ['project', 'time', 'people', 'docs', 'cloud', 'doorflow', 'fire-door-register', 'evidence'],
    connectors: ['google-drive', 'gmail-whatsapp'],
    notes: 'Planned future world. Do not use as default until it has clean seed data.',
  },
];

export const getNexusWorld = (id: string) => nexusWorlds.find((world) => world.id === id);
