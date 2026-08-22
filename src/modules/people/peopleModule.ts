import { defineNexusModule } from '../moduleContract';

export const peopleModule = defineNexusModule({
  definition: {
    id: 'people',
    label: 'PEOPLE',
    description: 'People, project roles and Person Card entry point for the active Project World.',
    status: 'active',
    dock: true,
    panel: 'PeoplePanel',
    requiredConnectors: ['work-wallet', 'gmail-whatsapp'],
    linkedObjects: ['Person', 'Company', 'Project', 'Task', 'Evidence', 'Approval'],
    migrationSource: 'apps/nexus-graph-preview/relationship-tree/nexus-people-panel.js',
  },
  renderMode: 'overlay-panel',
  ownsDockTile: true,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: true,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
