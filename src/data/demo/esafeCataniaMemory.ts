import type { NexusProjectMemorySnapshot } from '../projectMemory';
import { emptyProjectMemorySnapshot } from '../projectMemory';
import { assertEsafeCataniaMemory } from '../projectMemoryInvariants';
import { applyEsafeCataniaFixtures } from './esafeCataniaFixtures';
import { applyEsafeCataniaPhase9Fixtures } from './esafeCataniaPhase9Fixtures';

export const createEsafeCataniaMemory = (): NexusProjectMemorySnapshot => {
  const memory = applyEsafeCataniaPhase9Fixtures(
    applyEsafeCataniaFixtures(emptyProjectMemorySnapshot()),
  );

  assertEsafeCataniaMemory(memory);
  return memory;
};
