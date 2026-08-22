import { defineNexusModule } from '../moduleContract';

export const projectModule = defineNexusModule({
  definition: {
    id: 'project',
    label: 'PROJECT',
    description: 'Project World control surface for selecting project context, role context and active world scope.',
    status: 'active',
    dock: true,
    panel: 'ProjectPanel',
    requiredConnectors: [],
    linkedObjects: ['Project', 'ProjectWorld', 'Company', 'Person', 'Task'],
    migrationSource: 'apps/nexus-graph-preview/relationship-tree/nexus-project-switcher.js',
  },
  renderMode: 'overlay-panel',
  ownsDockTile: true,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: false,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
