import { defineNexusConnector } from '../connectorContract';

export const googleDriveConnector = defineNexusConnector({
  definition: {
    id: 'google-drive',
    name: 'Google Drive / Nexus Cloud',
    category: 'cloud-storage',
    status: 'active-reference',
    sourceOfTruth: 'Google Drive project folders',
    nexusRole: 'Project files, evidence folders, drawings, documents and project-world storage references.',
    objectLinks: ['Project', 'ProjectWorld', 'File', 'Document', 'Drawing', 'Evidence', 'Task'],
    actions: ['open-folder', 'attach-file-reference', 'classify-file'],
    notes:
      'Reference/deep-link catalogue contract only. It does not declare live Google Drive API write capability. Provider writes require the Phase 17 server-side capability gate; Project Graph linking is a separate authorised Nexus action.',
  },
  mode: 'deep-link',
  authMode: 'manual',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: true,
  canUpdateProjectGraph: false,
  capabilities: [
    {
      id: 'open-project-folder',
      label: 'Open project folder',
      direction: 'read',
      linkedObjects: ['Project', 'ProjectWorld', 'File'],
    },
    {
      id: 'attach-file-reference',
      label: 'Attach external file reference in Nexus',
      direction: 'write',
      linkedObjects: ['Task', 'Evidence', 'Document', 'Drawing'],
      notes: 'Writes Nexus reference metadata only; this is not a Google Drive binary/API write capability.',
    },
  ],
  migrationPhase: 'phase-2-contract',
});
