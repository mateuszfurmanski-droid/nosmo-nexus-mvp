import { defineNexusModule } from '../moduleContract';

export const electricalModule = defineNexusModule({
  definition: {
    id: 'electrical',
    label: 'ELECTRICAL',
    description: 'Electrical commissioning workflow pack linked to documents, tests, evidence and sign-off.',
    status: 'prototype',
    dock: false,
    panel: 'ElectricalPanel',
    requiredConnectors: ['google-drive'],
    linkedObjects: ['Project', 'File', 'Document', 'Asset', 'Task', 'Evidence', 'Inspection', 'Approval'],
    migrationSource: 'apps/nexus-graph-preview/electrical-commissioning',
  },
  renderMode: 'external-route',
  ownsDockTile: false,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: true,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
