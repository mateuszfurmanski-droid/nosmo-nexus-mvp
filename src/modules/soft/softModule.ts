import { defineNexusModule } from '../moduleContract';

export const softModule = defineNexusModule({
  definition: {
    id: 'soft',
    label: 'SOFT',
    description: 'Software connector registry view for external construction systems and source-of-truth handoffs.',
    status: 'active',
    dock: true,
    panel: 'SoftPanel',
    requiredConnectors: ['google-drive', 'work-wallet', 'bim-fabstation', 'companycam', 'microsoft365'],
    linkedObjects: ['Project', 'ProjectWorld', 'Person', 'Task', 'File', 'Evidence', 'Asset', 'Room'],
    migrationSource: 'apps/nexus-graph-preview/relationship-tree/nexus-software-panel.js',
  },
  renderMode: 'overlay-panel',
  ownsDockTile: true,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: true,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
