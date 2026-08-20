export type NexusCorePhase = 'phase-4-skeleton' | 'phase-5-wire' | 'phase-6-runtime';

export interface NexusCoreContract {
  id: string;
  label: string;
  responsibility: string;
  ownsRuntimeState: boolean;
  canRenderUi: boolean;
  canMutateProjectGraph: boolean;
  canReadProjectMemory: boolean;
  canWriteProjectMemory: boolean;
  phase: NexusCorePhase;
  notes?: string;
}

export const defineNexusCore = <T extends NexusCoreContract>(contract: T): T => contract;
