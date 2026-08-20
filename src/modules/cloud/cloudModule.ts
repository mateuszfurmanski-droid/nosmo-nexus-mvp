import { defineNexusModule } from '../moduleContract';

export const cloudModule = defineNexusModule({
  definition: {
    id: 'cloud',
    label: 'CLOUD',
    description: 'Nexus Cloud entry point for project folders, evidence storage and shared file visibility.',
    status: 'active',
    dock: true,
    panel: 'CloudPanel',
    requiredConnectors: ['google-drive'],
    linkedObjects: ['ProjectWorld', 'Project', 'File', 'Document', 'Evidence', 'Drawing'],
    migrationSource: 'apps/nexus-graph-preview/relationship-tree/nexus-cloud-panel.js',
  },
  renderMode: 'overlay-panel',
  ownsDockTile: true,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: true,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
