export const multitradeSharedE2EContract = {
  id: 'nexus-multitrade-shared-e2e/v1',
  connectors: ['erpnext-trades', 'qfield-trades', 'openmaint-trades', 'bcf-trades'],
  transport: 'server-side-http-read-only',
  projection: 'external-reference-only',
  providerFixtureMode: 'local-disposable-protocol-fixture',
  persistentUpstreamValidated: false,
  projectGraphMutationAllowed: false,
  canonicalEvidencePromotionAllowed: false,
  externalIdentityPromotionAllowed: false,
} as const;
