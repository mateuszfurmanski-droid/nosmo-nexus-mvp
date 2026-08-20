import { defineNexusConnector } from '../connectorContract';

export const supplierConnector = defineNexusConnector({
  definition: {
    id: 'suppliers',
    name: 'Suppliers / Purchasing',
    category: 'supplier-procurement',
    status: 'planned',
    sourceOfTruth: 'Supplier websites, purchase systems and merchant records',
    nexusRole: 'Supplier, material, order and purchase reference layer connected to project tasks and evidence.',
    objectLinks: ['Company', 'Project', 'Task', 'File', 'Evidence', 'Approval'],
    actions: ['open-supplier-record', 'link-material-reference', 'link-purchase-evidence', 'attach-approval'],
    notes: 'Planned connector. Start with supplier references and purchase evidence before any ordering automation.',
  },
  mode: 'manual-handoff',
  authMode: 'manual',
  ownsData: true,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: true,
  canUpdateProjectGraph: true,
  capabilities: [
    {
      id: 'link-material-to-task',
      label: 'Link material or purchase reference to task',
      direction: 'write',
      linkedObjects: ['Task', 'Company', 'Evidence', 'Approval'],
    },
  ],
  migrationPhase: 'phase-2-contract',
});
