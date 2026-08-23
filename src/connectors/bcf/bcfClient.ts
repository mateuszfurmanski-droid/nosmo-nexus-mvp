import type { NexusConnectorHttpFetch } from '../snipe-it/snipeItClient';

export interface BcfProjectReference { project_id: string; name: string }
export interface BcfTopicReference { guid: string; title: string; topic_status?: string; topic_type?: string; creation_date?: string; modified_date?: string }
export class BcfServerClient {
  constructor(private readonly options: { baseUrl: string; version?: string; bearerToken: string; fetchImpl: NexusConnectorHttpFetch }) {
    if (!options.baseUrl.trim()) throw new Error('BCF_BASE_URL_REQUIRED');
    if (!options.bearerToken.trim()) throw new Error('BCF_BEARER_TOKEN_REQUIRED');
  }
  private async get(path: string): Promise<unknown> {
    const version = this.options.version || '3.0';
    const response = await this.options.fetchImpl(`${this.options.baseUrl.replace(/\/+$/, '')}/bcf/${version}${path}`, { method: 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${this.options.bearerToken}` } });
    const payload = await response.json();
    if (!response.ok) throw new Error(`BCF_API_ERROR_${response.status}`);
    return payload;
  }
  async listProjects(): Promise<BcfProjectReference[]> {
    const payload = await this.get('/projects');
    if (!Array.isArray(payload)) throw new Error('BCF_PROJECT_LIST_INVALID');
    return payload as BcfProjectReference[];
  }
  async listTopics(projectId: string): Promise<BcfTopicReference[]> {
    if (!projectId.trim()) throw new Error('BCF_PROJECT_ID_REQUIRED');
    const payload = await this.get(`/projects/${encodeURIComponent(projectId)}/topics`);
    if (!Array.isArray(payload)) throw new Error('BCF_TOPIC_LIST_INVALID');
    return payload as BcfTopicReference[];
  }
}
