import type { NexusModuleDefinition } from '../registry/registryTypes';

export type NexusModuleRenderMode = 'overlay-panel' | 'graph-layer' | 'external-route' | 'service-only';

export interface NexusModuleRuntimeContract {
  definition: NexusModuleDefinition;
  renderMode: NexusModuleRenderMode;
  ownsDockTile: boolean;
  ownsPanel: boolean;
  canAttachToGraph: boolean;
  canReadConnectors: boolean;
  canWriteProjectMemory: boolean;
  migrationPhase: 'phase-1-registry' | 'phase-2-contract' | 'phase-3-migrate' | 'phase-4-live';
}

export const defineNexusModule = (contract: NexusModuleRuntimeContract): NexusModuleRuntimeContract => contract;
