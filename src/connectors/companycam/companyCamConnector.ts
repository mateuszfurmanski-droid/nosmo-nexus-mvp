import { defineNexusConnector } from '../connectorContract';

export const companyCamConnector = defineNexusConnector({
  definition: {
    id: 'companycam',
    name: 'CompanyCam',
    category: 'photo-evidence',
    status: 'planned',
    sourceOfTruth: 'CompanyCam photo project records',
    nexusRole: 'Photo evidence, visual project history and task-linked site media references.',
    objectLinks: ['Project', 'Task', 'Evidence', 'File', 'TimelineEvent'],
    actions: ['open-photo-record', 'link-photo-evidence', 'import-photo-reference'],
    notes: 'Planned connector. Nexus should keep references and evidence metadata before any full media sync.',
  },
  mode: 'reference-only',
  authMode: 'pending',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: true,
  canUpdateProjectGraph: true,
  capabilities: [
    {
      id: 'link-photo-to-task',
      label: 'Link photo reference to task/evidence',
      direction: 'write',
      linkedObjects: ['Task', 'Evidence', 'TimelineEvent'],
    },
  ],
  migrationPhase: 'phase-2-contract',
});
