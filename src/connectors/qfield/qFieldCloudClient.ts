import type { NexusConnectorHttpFetch } from '../snipe-it/snipeItClient';

export interface QFieldCloudProjectReference { id: string; name?: string; description?: string | null; owner?: string; updated_at?: string }
export class QFieldCloudServerClient {
  constructor(private readonly options: { baseUrl: string; bearerToken: string; fetchImpl: NexusConnectorHttpFetch }) {
    if (!options.baseUrl.trim()) throw new Error('QFIELD_BASE_URL_REQUIRED');
    if (!options.bearerToken.trim()) throw new Error('QFIELD_BEARER_TOKEN_REQUIRED');
  }
  private async get(path: string): Promise<unknown> {
    const response = await this.options.fetchImpl(`${this.options.baseUrl.replace(/\/+$/, '')}${path}`, { method: 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${this.options.bearerToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(`QFIELD_API_ERROR_${response.status}`);
    return payload;
  }
  async listProjects(): Promise<QFieldCloudProjectReference[]> {
    const payload = await this.get('/api/v1/projects/');
    const rows = Array.isArray(payload) ? payload : (payload as { results?: unknown[] })?.results;
    if (!Array.isArray(rows)) throw new Error('QFIELD_PROJECT_LIST_INVALID');
    return rows as QFieldCloudProjectReference[];
  }
  getProject(projectId: string) {
    if (!projectId.trim()) throw new Error('QFIELD_PROJECT_ID_REQUIRED');
    return this.get(`/api/v1/projects/${encodeURIComponent(projectId)}/`);
  }
}
