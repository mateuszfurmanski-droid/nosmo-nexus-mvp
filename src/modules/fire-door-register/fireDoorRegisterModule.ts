import { defineNexusModule } from '../moduleContract';

export const fireDoorRegisterModule = defineNexusModule({
  definition: {
    id: 'fire-door-register',
    label: 'FIRE REGISTER',
    description: 'Manual fire door register and inspection pack independent of drawings and schedules.',
    status: 'prototype',
    dock: false,
    panel: 'FireDoorRegisterPanel',
    requiredConnectors: ['google-drive'],
    linkedObjects: ['Project', 'Room', 'Asset', 'Task', 'Evidence', 'Inspection', 'Approval'],
    migrationSource: 'apps/fire-door-register and apps/nexus-graph-preview/fire-door-register-demo',
  },
  renderMode: 'external-route',
  ownsDockTile: false,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: true,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
