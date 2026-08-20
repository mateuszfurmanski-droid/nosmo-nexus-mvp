import { defineNexusConnector } from '../connectorContract';

export const hiltiConnector = defineNexusConnector({
  definition: {
    id: 'hilti',
    name: 'Hilti / Assets',
    category: 'asset-management',
    status: 'planned',
    sourceOfTruth: 'Hilti or external asset management system',
    nexusRole: 'Tool, equipment and asset references linked to projects, people, tasks and evidence.',
    objectLinks: ['Asset', 'Person', 'Project', 'Task', 'Evidence'],
    actions: ['open-asset-record', 'link-asset-to-task', 'attach-asset-evidence'],
    notes: 'Planned connector. Do not duplicate asset system; link critical asset state and project context.',
  },
  mode: 'reference-only',
  authMode: 'pending',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: true,
  canUpdateProjectGraph: true,
  capabilities: [
    {
      id: 'link-asset-reference',
      label: 'Link asset reference to project task',
      direction: 'write',
      linkedObjects: ['Asset', 'Task', 'Project'],
    },
  ],
  migrationPhase: 'phase-2-contract',
});
