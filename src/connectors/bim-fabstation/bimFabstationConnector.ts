import { defineNexusConnector } from '../connectorContract';

/**
 * Compatibility connector ID retained from the early scaffold. The runtime
 * contract is vendor-neutral and does not imply a live FabStation integration.
 */
export const bimFabstationConnector = defineNexusConnector({
  definition: {
    id: 'bim-fabstation',
    name: 'BIM / Spatial partner',
    category: 'model-installation',
    status: 'reference-layer',
    sourceOfTruth: 'Approved BIM/IFC model source; partner-owned field state only where a partner capability is confirmed.',
    nexusRole: 'Resolve canonical Nexus Object context from explicit IFC identity and prepare bounded spatial hand-off context for human/partner review.',
    objectLinks: ['Asset', 'Room', 'Floor', 'Task', 'Drawing', 'Evidence', 'InstallationObject'],
    actions: ['review-model-source-context', 'prepare-spatial-hand-off'],
    notes: 'Vendor-neutral reference/manual-handoff boundary. FabStation remains a candidate partner; no API, SDK, deep link, webhook, viewer embed or live sync is claimed.',
  },
  mode: 'manual-handoff',
  authMode: 'pending',
  ownsData: false,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: false,
  canUpdateProjectGraph: false,
  capabilities: [
    {
      id: 'review-model-source-context',
      label: 'Review mapped model-source context',
      direction: 'read',
      linkedObjects: ['Asset', 'Room', 'Drawing', 'InstallationObject'],
    },
    {
      id: 'prepare-spatial-hand-off',
      label: 'Prepare bounded spatial hand-off packet',
      direction: 'read',
      linkedObjects: ['Asset', 'Room', 'Task', 'InstallationObject'],
      notes: 'Packet preparation is read-only and is not partner execution, live sync or a Nexus mutation.',
    },
  ],
  migrationPhase: 'phase-2-contract',
});
