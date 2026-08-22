import { defineNexusModule } from '../moduleContract';

export const evidenceModule = defineNexusModule({
  definition: {
    id: 'evidence',
    label: 'EVIDENCE',
    description: 'Photo, inspection and proof-of-work evidence layer linked to graph objects and project memory.',
    status: 'planned',
    dock: false,
    panel: 'EvidencePanel',
    requiredConnectors: ['google-drive', 'companycam'],
    linkedObjects: ['Project', 'Task', 'File', 'Evidence', 'Inspection', 'Approval'],
    notes: 'Planned module. Must not be enabled in the live dock until the registry-driven shell exists.',
  },
  renderMode: 'overlay-panel',
  ownsDockTile: false,
  ownsPanel: true,
  canAttachToGraph: true,
  canReadConnectors: true,
  canWriteProjectMemory: true,
  migrationPhase: 'phase-2-contract',
});
