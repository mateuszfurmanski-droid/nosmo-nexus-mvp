import { defineNexusConnector } from '../connectorContract';

export const WORK_WALLET_EXTERNAL_CAPABILITY_LABEL =
  'DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API' as const;

export const workWalletConnector = defineNexusConnector({
  definition: {
    id: 'work-wallet',
    name: 'Work Wallet',
    category: 'safety-compliance',
    status: 'reference-layer',
    sourceOfTruth: 'Work Wallet safety and compliance records',
    nexusRole:
      'Read/context/navigation references linked to canonical Nexus people, projects, tasks, evidence and approvals. Work Wallet remains source-of-record for its formal safety/compliance records.',
    objectLinks: ['Person', 'Project', 'Task', 'Evidence', 'Approval'],
    actions: ['read-status-reference', 'open-record', 'open-nexus-context', 'receive-demo-event'],
    notes:
      `${WORK_WALLET_EXTERNAL_CAPABILITY_LABEL}. Current canonical boundary is read/context/navigation only. Exact external references may resolve through server-owned verified mappings; no browser integration secret, vendor write, automatic approval or graph mutation is declared.`,
  },
  mode: 'deep-link',
  authMode: 'pending',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: false,
  canUpdateProjectGraph: false,
  capabilities: [
    {
      id: 'read-status-reference',
      label: 'Read Work Wallet status/reference context',
      direction: 'read',
      linkedObjects: ['Person', 'Project', 'Task', 'Evidence', 'Approval'],
      notes: 'Reference/context capability only; it does not claim a live Work Wallet API connection.',
    },
    {
      id: 'resolve-exact-nexus-context',
      label: 'Resolve an exact external record to a canonical Nexus object',
      direction: 'read',
      linkedObjects: ['Person', 'Project', 'Task', 'Evidence', 'Approval'],
      notes:
        'Requires exact server-owned project + external object type + external record mapping. External Work Wallet IDs never become Nexus canonical IDs.',
    },
  ],
  migrationPhase: 'phase-2-contract',
});
