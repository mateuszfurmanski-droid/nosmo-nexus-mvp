import { defineNexusConnector } from '../connectorContract';

export const workWalletConnector = defineNexusConnector({
  definition: {
    id: 'work-wallet',
    name: 'Work Wallet',
    category: 'safety-compliance',
    status: 'reference-layer',
    sourceOfTruth: 'Work Wallet safety and compliance records',
    nexusRole: 'Safety status, inductions, RAMS, permits, training and eligibility references linked to people, projects and tasks.',
    objectLinks: ['Person', 'Project', 'Task', 'Evidence', 'Approval'],
    actions: ['read-status-reference', 'open-record', 'link-person-eligibility', 'receive-demo-event'],
    notes: 'Nexus must not replace Work Wallet. Store controlled references, status snapshots and provenance first.',
  },
  mode: 'api-sync',
  authMode: 'pending',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: true,
  canUpdateProjectGraph: true,
  capabilities: [
    {
      id: 'read-worker-eligibility',
      label: 'Read worker eligibility/status reference',
      direction: 'read',
      linkedObjects: ['Person', 'Project', 'Task'],
    },
    {
      id: 'receive-compliance-event',
      label: 'Receive compliance event into Nexus memory',
      direction: 'read',
      linkedObjects: ['Person', 'Project', 'TimelineEvent', 'Evidence'],
    },
  ],
  migrationPhase: 'phase-2-contract',
});
