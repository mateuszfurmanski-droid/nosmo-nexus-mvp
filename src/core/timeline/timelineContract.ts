import { defineNexusCore } from '../coreContract';

export type NexusTimelineMode = 'real' | 'replay' | 'simulation';

export interface NexusTimelineEvent {
  id: string;
  worldId: string;
  projectId: string;
  timestampIso: string;
  mode: NexusTimelineMode;
  sourceModuleId: string;
  sourceConnectorId?: string;
  title: string;
  detail?: string;
}

export const nexusTimelineCore = defineNexusCore({
  id: 'timeline',
  label: 'Project Time',
  responsibility: 'Own project time, replay, simulation and chronological memory for project events.',
  ownsRuntimeState: true,
  canRenderUi: true,
  canMutateProjectGraph: false,
  canReadProjectMemory: true,
  canWriteProjectMemory: true,
  phase: 'phase-4-skeleton',
  notes: 'Migrates from the current Project Time instrument but must remain a module-driven event timeline, not a standalone widget.',
});
