import { defineNexusModule } from '../moduleContract';

export const timeModule = defineNexusModule({
  definition: {
    id: 'time',
    label: 'TIME',
    description: 'Project Time instrument for live, replay and simulation context over the Project Graph.',
    status: 'active',
    dock: true,
    panel: 'ProjectTime',
    requiredConnectors: [],
    linkedObjects: ['Project', 'ProjectWorld', 'Task', 'Evidence', 'TimelineEvent'],
    migrationSource: 'apps/nexus-graph-preview/relationship-tree/nexus-project-time-instrument.js',
  },
  renderMode: 'overlay-panel',
  ownsDockTile: true,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: false,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
