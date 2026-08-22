import { defineNexusModule } from '../moduleContract';

export const docsModule = defineNexusModule({
  definition: {
    id: 'docs',
    label: 'DOCS',
    description: 'Documents, file loader, drawings and project file classification layer.',
    status: 'active',
    dock: true,
    panel: 'DocsPanel',
    requiredConnectors: ['google-drive'],
    linkedObjects: ['Project', 'File', 'Document', 'Drawing', 'Task', 'Evidence'],
    migrationSource: 'apps/nexus-file-loader and relationship-tree file actions',
  },
  renderMode: 'overlay-panel',
  ownsDockTile: true,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: true,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
