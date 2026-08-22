import type {
  ConsumedNexusContextTicket,
  NexusContextTicketStore,
  StoredNexusContextTicket,
} from "../../src/lib/nexus-context-ticket-core";

type MemoryRecord = StoredNexusContextTicket & { consumedAt?: Date };

/** Test-only store. Not imported by application runtime. */
export class MemoryContextTicketStore implements NexusContextTicketStore {
  readonly records: MemoryRecord[] = [];

  async countIssuedSince(input: {
    workspaceId: number;
    personId: string;
    projectId: string;
    since: Date;
  }): Promise<number> {
    return this.records.filter(
      (record) =>
        record.workspaceId === input.workspaceId &&
        record.personId === input.personId &&
        record.projectId === input.projectId &&
        record.issuedAt >= input.since,
    ).length;
  }

  async insert(record: StoredNexusContextTicket): Promise<void> {
    if (this.records.some((candidate) => candidate.ticketDigest === record.ticketDigest)) {
      throw new Error("duplicate ticket digest");
    }
    this.records.push({ ...record });
  }

  async consume(input: {
    ticketDigest: string;
    now: Date;
  }): Promise<ConsumedNexusContextTicket | null> {
    const record = this.records.find(
      (candidate) => candidate.ticketDigest === input.ticketDigest,
    );
    if (!record || record.consumedAt || record.expiresAt <= input.now) return null;

    record.consumedAt = input.now;
    const {
      ticketDigest: _ticketDigest,
      issuedSessionDigest: _issuedSessionDigest,
      ...safe
    } = record;
    return safe as ConsumedNexusContextTicket;
  }
}
