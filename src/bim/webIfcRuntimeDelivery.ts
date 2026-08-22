export const NEXUS_WEB_IFC_RUNTIME_SCHEMA = 'nexus-web-ifc-runtime/v1' as const;
export const WEB_IFC_PACKAGE_NAME = 'web-ifc' as const;
export const WEB_IFC_VERSION = '0.0.77' as const;

export const WEB_IFC_REQUIRED_RUNTIME_ASSETS = [
  'web-ifc-api-iife.js',
  'web-ifc.wasm',
  'LICENSE.md',
] as const;

export type NexusWebIfcRuntimeDelivery =
  | 'local-self-hosted'
  | 'pinned-network-development';

export interface NexusWebIfcRuntimeDeliveryInput {
  production: boolean;
  basePath?: string;
  developmentDelivery?: NexusWebIfcRuntimeDelivery;
}

export interface NexusWebIfcRuntimeDeliveryPlan {
  schema: typeof NEXUS_WEB_IFC_RUNTIME_SCHEMA;
  packageName: typeof WEB_IFC_PACKAGE_NAME;
  version: typeof WEB_IFC_VERSION;
  delivery: NexusWebIfcRuntimeDelivery;
  runtimeUrl: string;
  wasmUrl: string;
  sameOriginRequired: boolean;
  networkDevelopmentOnly: boolean;
  productionFallbackToRemoteAllowed: false;
  liteFallbackRequiredWhenUnavailable: true;
}

const normalizeBasePath = (value?: string): string => {
  const trimmed = value?.trim() || '/';
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) {
    throw new Error('web-ifc production asset base path must be same-origin, never an absolute/network URL.');
  }
  const leading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return leading.endsWith('/') ? leading : `${leading}/`;
};

const localAssetRoot = (basePath?: string): string =>
  `${normalizeBasePath(basePath)}vendor/web-ifc/${WEB_IFC_VERSION}/`;

export const WEB_IFC_PINNED_DEVELOPMENT_RUNTIME_URL =
  `https://cdn.jsdelivr.net/npm/web-ifc@${WEB_IFC_VERSION}/web-ifc-api-iife.js` as const;
export const WEB_IFC_PINNED_DEVELOPMENT_WASM_URL =
  `https://cdn.jsdelivr.net/npm/web-ifc@${WEB_IFC_VERSION}/web-ifc.wasm` as const;

export const resolveNexusWebIfcRuntimeDelivery = (
  input: NexusWebIfcRuntimeDeliveryInput,
): NexusWebIfcRuntimeDeliveryPlan => {
  const delivery: NexusWebIfcRuntimeDelivery = input.production
    ? 'local-self-hosted'
    : input.developmentDelivery ?? 'local-self-hosted';

  if (input.production && delivery !== 'local-self-hosted') {
    throw new Error('Production web-ifc delivery must be local-self-hosted.');
  }

  if (delivery === 'pinned-network-development' && input.production) {
    throw new Error('Pinned network web-ifc delivery is development-only.');
  }

  if (delivery === 'local-self-hosted') {
    const root = localAssetRoot(input.basePath);
    return {
      schema: NEXUS_WEB_IFC_RUNTIME_SCHEMA,
      packageName: WEB_IFC_PACKAGE_NAME,
      version: WEB_IFC_VERSION,
      delivery,
      runtimeUrl: `${root}web-ifc-api-iife.js`,
      wasmUrl: `${root}web-ifc.wasm`,
      sameOriginRequired: true,
      networkDevelopmentOnly: false,
      productionFallbackToRemoteAllowed: false,
      liteFallbackRequiredWhenUnavailable: true,
    };
  }

  return {
    schema: NEXUS_WEB_IFC_RUNTIME_SCHEMA,
    packageName: WEB_IFC_PACKAGE_NAME,
    version: WEB_IFC_VERSION,
    delivery,
    runtimeUrl: WEB_IFC_PINNED_DEVELOPMENT_RUNTIME_URL,
    wasmUrl: WEB_IFC_PINNED_DEVELOPMENT_WASM_URL,
    sameOriginRequired: false,
    networkDevelopmentOnly: true,
    productionFallbackToRemoteAllowed: false,
    liteFallbackRequiredWhenUnavailable: true,
  };
};

export const assertNexusWebIfcProductionPlan = (
  plan: NexusWebIfcRuntimeDeliveryPlan,
): void => {
  const failures: string[] = [];
  if (plan.delivery !== 'local-self-hosted') failures.push('production delivery is not local-self-hosted');
  if (!plan.sameOriginRequired) failures.push('same-origin requirement is disabled');
  if (/^[a-z][a-z0-9+.-]*:/i.test(plan.runtimeUrl) || plan.runtimeUrl.startsWith('//')) {
    failures.push('runtimeUrl is remote');
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(plan.wasmUrl) || plan.wasmUrl.startsWith('//')) {
    failures.push('wasmUrl is remote');
  }
  if (plan.productionFallbackToRemoteAllowed !== false) failures.push('remote production fallback is enabled');
  if (!plan.liteFallbackRequiredWhenUnavailable) failures.push('Lite fail-closed fallback requirement is disabled');

  if (failures.length > 0) {
    throw new Error(`Invalid production web-ifc delivery plan: ${failures.join('; ')}.`);
  }
};
