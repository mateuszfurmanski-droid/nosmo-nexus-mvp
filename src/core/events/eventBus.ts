import { defineNexusCore } from '../coreContract';

export type NexusEventScope = 'app' | 'world' | 'module' | 'connector' | 'graph' | 'timeline';

export interface NexusEvent<TPayload = unknown> {
  id: string;
  scope: NexusEventScope;
  type: string;
  source: string;
  createdAtIso: string;
  payload: TPayload;
}

export type NexusEventHandler<TPayload = unknown> = (event: NexusEvent<TPayload>) => void;

export const nexusEventsCore = defineNexusCore({
  id: 'events',
  label: 'Nexus Event Bus',
  responsibility: 'Provide a typed event contract between shell, graph, modules, connectors, timeline and project memory.',
  ownsRuntimeState: true,
  canRenderUi: false,
  canMutateProjectGraph: false,
  canReadProjectMemory: false,
  canWriteProjectMemory: false,
  phase: 'phase-4-skeleton',
  notes: 'This is a contract only. Runtime dispatch implementation comes later.',
});
