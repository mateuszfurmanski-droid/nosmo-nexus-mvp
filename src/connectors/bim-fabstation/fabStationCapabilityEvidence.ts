import type { NexusSpatialPartnerDescriptor } from './spatialHandoff';

export const NEXUS_FABSTATION_PUBLIC_CAPABILITY_EVIDENCE_SCHEMA =
  'nexus-fabstation-public-capability-evidence/v1' as const;

export const FABSTATION_PUBLIC_CAPABILITY_EVIDENCE = {
  schema: NEXUS_FABSTATION_PUBLIC_CAPABILITY_EVIDENCE_SCHEMA,
  observedAt: '2026-08-22T15:25:00+01:00',
  sources: [
    {
      kind: 'OFFICIAL_KNOWLEDGE_BASE',
      url: 'https://www.fabstation.com/kb/creating-zip/',
      supports: ['PROJECT_ZIP_UPLOAD', 'IFC2X3_PROJECT_FILE', 'KSS_FILE', 'PDF_DRAWINGS'],
    },
    {
      kind: 'OFFICIAL_KNOWLEDGE_BASE',
      url: 'https://www.fabstation.com/kb/tekla-export-plugin/',
      supports: ['TEKLA_PLUGIN_EXPORT', 'IFC_EXPORT', 'KSS_EXPORT', 'PDF_EXPORT'],
    },
    {
      kind: 'OFFICIAL_KNOWLEDGE_BASE',
      url: 'https://www.fabstation.com/kb/sds2-export/',
      supports: ['SDS2_IFC_EXPORT', 'SDS2_KSS_EXPORT'],
    },
    {
      kind: 'OFFICIAL_PRODUCT_INFORMATION',
      url: 'https://www.fabstation.com/bim_steel_fabrication/',
      supports: ['IFC2X3_IMPORT_FORMAT'],
    },
  ],
  confirmed: {
    projectFileExchange: true,
    projectZipUpload: true,
    ifc2x3ProjectInput: true,
    kssProjectInput: true,
    pdfProjectInput: true,
    teklaExportPlugin: true,
  },
  notConfirmedByPublicEvidence: {
    publicApi: true,
    publicSdk: true,
    webhook: true,
    stableObjectDeepLink: true,
    embeddableViewer: true,
    nexusPacketAcceptance: true,
    liveSync: true,
    twoWaySync: true,
    partnerWriteApi: true,
  },
  partnerExecutionStatus: 'NOT_EXECUTED',
  boundaries: [
    'Official FabStation documentation confirms project-level file exchange only for the capabilities listed as confirmed.',
    'This evidence does not mean FabStation accepts nexus-spatial-hand-off/v1 JSON packets.',
    'No API, SDK, webhook, deep-link, viewer embedding, live-sync or two-way-sync capability is inferred from project file upload documentation.',
    'A real Nexus-to-FabStation project package or other partner-approved PoC must execute before PARTNER_HANDOFF_PASS.',
  ],
} as const;

/**
 * Descriptor for a publicly documented FabStation file-exchange route.
 * `FILE_EXCHANGE` is confirmed as a vendor capability; `UNVERIFIED` deliberately
 * remains the claim status for the Nexus-specific spatial hand-off contract.
 */
export const FABSTATION_PUBLIC_FILE_EXCHANGE_DESCRIPTOR: NexusSpatialPartnerDescriptor = {
  connectorId: 'fabstation-file-exchange-candidate',
  displayName: 'FabStation file exchange candidate',
  maturity: 'FILE_EXCHANGE',
  claimStatus: 'UNVERIFIED',
  evidenceReference: NEXUS_FABSTATION_PUBLIC_CAPABILITY_EVIDENCE_SCHEMA,
};
