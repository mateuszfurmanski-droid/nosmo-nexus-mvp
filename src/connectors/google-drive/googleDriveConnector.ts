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
    actions: ['open-folder', 'attach-file-reference', 'classify-file', 'link-file-to-task'],
    notes: 'Phase 3 contract only. Do not copy full Drive contents into Nexus. Store references, provenance and graph links first.',
  },
  mode: 'deep-link',
  authMode: 'manual',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: true,
  canUpdateProjectGraph: true,
  capabilities: [
    {
      id: 'open-project-folder',
      label: 'Open project folder',
      direction: 'read',
      linkedObjects: ['Project', 'ProjectWorld', 'File'],
    },
    {
      id: 'attach-file-reference',
      label: 'Attach external file reference to graph object',
      direction: 'write',
      linkedObjects: ['Task', 'Evidence', 'Document', 'Drawing'],
    },
  ],
  migrationPhase: 'phase-2-contract',
});
