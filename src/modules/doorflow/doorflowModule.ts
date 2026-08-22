import { defineNexusModule } from '../moduleContract';

export const doorflowModule = defineNexusModule({
  definition: {
    id: 'doorflow',
    label: 'DOORFLOW',
    description: 'Fire door workflow pack for door schedules, drawings, inspection evidence and sign-off context.',
    status: 'prototype',
    dock: false,
    panel: 'DoorFlowPanel',
    requiredConnectors: ['google-drive'],
    linkedObjects: ['Project', 'Drawing', 'File', 'Room', 'Asset', 'Task', 'Evidence', 'Inspection', 'Approval'],
    migrationSource: 'apps/doorflow and apps/nexus-graph-preview/doorflow-demo',
  },
  renderMode: 'external-route',
  ownsDockTile: false,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: true,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
