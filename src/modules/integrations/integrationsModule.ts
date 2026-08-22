import { defineNexusModule } from '../moduleContract';

export const integrationsModule = defineNexusModule({
  definition: {
    id: 'integrations',
    label: 'INT.',
    description: 'Integration status and connector readiness panel for systems attached to the active Project World.',
    status: 'active',
    dock: true,
    panel: 'IntegrationsPanel',
    requiredConnectors: ['google-drive', 'work-wallet', 'bim-fabstation', 'companycam', 'microsoft365'],
    linkedObjects: ['Project', 'ProjectWorld', 'File', 'Evidence', 'Task', 'Asset', 'Approval'],
    migrationSource: 'apps/nexus-graph-preview/relationship-tree/nexus-integrations-panel.js',
  },
  renderMode: 'overlay-panel',
  ownsDockTile: true,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: true,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
