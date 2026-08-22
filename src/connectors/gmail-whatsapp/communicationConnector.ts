import { defineNexusConnector } from '../connectorContract';

export const communicationConnector = defineNexusConnector({
  definition: {
    id: 'gmail-whatsapp',
    name: 'Gmail / WhatsApp handoff',
    category: 'communication-handoff',
    status: 'reference-layer',
    sourceOfTruth: 'User communication channels and message links',
    nexusRole: 'Communication handoff, contact context and project-message references without becoming the source inbox.',
    objectLinks: ['Person', 'Company', 'Project', 'Task', 'TimelineEvent'],
    actions: ['open-contact-channel', 'draft-message-context', 'link-message-reference'],
    notes: 'Nexus should support handoff and references. It must not scrape private messages without explicit permission and scope.',
  },
  mode: 'manual-handoff',
  authMode: 'manual',
  ownsData: false,
  storesExternalRecordOnly: true,
  canCreateNexusEvidence: false,
  canUpdateProjectGraph: true,
  capabilities: [
    {
      id: 'open-person-channel',
      label: 'Open person communication channel',
      direction: 'read',
      linkedObjects: ['Person', 'Company', 'Project'],
    },
    {
      id: 'draft-context-message',
      label: 'Draft project-context message',
      direction: 'write',
      linkedObjects: ['Person', 'Task', 'Project'],
    },
  ],
  migrationPhase: 'phase-2-contract',
});
