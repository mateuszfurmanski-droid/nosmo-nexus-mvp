import { defineNexusConnector } from '../connectorContract';

export const bimFabstationConnector = defineNexusConnector({
  definition: {
    id: 'bim-fabstation',
    name: 'BIM / FabStation',
    category: 'model-installation',
    status: 'reference-layer',
    sourceOfTruth: 'BIM, spatial model or FabStation installation model',
    nexusRole: 'Object, room, asset and installation-sequence references linked into the Project Graph.',
    objectLinks: ['Asset', 'Room', 'Floor', 'Task', 'Drawing', 'Evidence'],
    actions: ['open-model-context', 'link-asset-reference', 'link-room-reference', 'attach-installation-context'],
    notes: 'BIM/FabStation identifies the physical object and installation context. Nexus remembers who did what, when, with evidence and decisions.',
  },
  mode: 'reference-only',
  authMode: 'pending',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: true,
  canUpdateProjectGraph: true,
  capabilities: [
    {
      id: 'link-model-object',
      label: 'Link model object to Project Graph node',
      direction: 'write',
      linkedObjects: ['Asset', 'Room', 'Task'],
    },
    {
      id: 'open-install-context',
      label: 'Open installation context from graph object',
      direction: 'read',
      linkedObjects: ['Asset', 'Room', 'Drawing'],
    },
  ],
  migrationPhase: 'phase-2-contract',
});
