import type { NexusConnectorHttpFetch } from '../snipe-it/snipeItClient';

export interface OpenMaintCardReference { _id: string | number; Code?: string; Description?: string; [field: string]: unknown }
export class OpenMaintServerClient {
  constructor(private readonly options: { baseUrl: string; sessionToken: string; fetchImpl: NexusConnectorHttpFetch }) {
    if (!options.baseUrl.trim()) throw new Error('OPENMAINT_BASE_URL_REQUIRED');
    if (!options.sessionToken.trim()) throw new Error('OPENMAINT_SESSION_TOKEN_REQUIRED');
  }
  private async get(path: string): Promise<unknown> {
    const response = await this.options.fetchImpl(`${this.options.baseUrl.replace(/\/+$/, '')}/services/rest/v3${path}`, { method: 'GET', headers: { Accept: 'application/json', 'CMDBuild-Authorization': this.options.sessionToken } });
    const payload = await response.json();
    if (!response.ok) throw new Error(`OPENMAINT_API_ERROR_${response.status}`);
    return payload;
  }
  async listClasses(): Promise<unknown[]> {
    const payload = await this.get('/classes') as { data?: unknown[] };
    if (!Array.isArray(payload.data)) throw new Error('OPENMAINT_CLASS_LIST_INVALID');
    return payload.data;
  }
  async listCards(classId: string): Promise<OpenMaintCardReference[]> {
    if (!classId.trim()) throw new Error('OPENMAINT_CLASS_ID_REQUIRED');
    const payload = await this.get(`/classes/${encodeURIComponent(classId)}/cards`) as { data?: unknown[] };
    if (!Array.isArray(payload.data)) throw new Error('OPENMAINT_CARD_LIST_INVALID');
    return payload.data as OpenMaintCardReference[];
  }
}
