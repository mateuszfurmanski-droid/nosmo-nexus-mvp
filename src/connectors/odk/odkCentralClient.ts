import type { NexusConnectorHttpFetch } from '../snipe-it/snipeItClient';

export interface OdkCentralProjectReference {
  id: number;
  name: string;
  description?: string | null;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface OdkCentralFormReference {
  xmlFormId: string;
  name?: string | null;
  version?: string | null;
  state?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  submissions?: number;
}

export interface OdkCentralSubmissionReference {
  instanceId: string;
  submitterId?: number | null;
  deviceId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  reviewState?: string | null;
}

export interface OdkCentralServerClientOptions {
  baseUrl: string;
  bearerToken: string;
  fetchImpl: NexusConnectorHttpFetch;
}

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const asArray = <T>(value: unknown, errorCode: string): T[] => {
  if (!Array.isArray(value)) {
    throw new Error(errorCode);
  }

  return value as T[];
};

export class OdkCentralServerClient {
  private readonly baseUrl: string;
  private readonly bearerToken: string;
  private readonly fetchImpl: NexusConnectorHttpFetch;

  constructor(options: OdkCentralServerClientOptions) {
    if (!options.baseUrl.trim()) {
      throw new Error('ODK_CENTRAL_BASE_URL_REQUIRED');
    }

    if (!options.bearerToken.trim()) {
      throw new Error('ODK_CENTRAL_BEARER_TOKEN_REQUIRED');
    }

    this.baseUrl = normalizeBaseUrl(options.baseUrl.trim());
    this.bearerToken = options.bearerToken;
    this.fetchImpl = options.fetchImpl;
  }

  private async get(path: string): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.bearerToken}`,
      },
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(`ODK_CENTRAL_API_ERROR_${response.status}`);
    }

    return payload;
  }

  async listProjects(): Promise<OdkCentralProjectReference[]> {
    return asArray<OdkCentralProjectReference>(
      await this.get('/v1/projects'),
      'ODK_CENTRAL_PROJECT_LIST_INVALID',
    );
  }

  async listForms(projectId: number): Promise<OdkCentralFormReference[]> {
    this.assertProjectId(projectId);

    return asArray<OdkCentralFormReference>(
      await this.get(`/v1/projects/${projectId}/forms`),
      'ODK_CENTRAL_FORM_LIST_INVALID',
    );
  }

  async listSubmissions(
    projectId: number,
    xmlFormId: string,
  ): Promise<OdkCentralSubmissionReference[]> {
    this.assertProjectId(projectId);

    if (!xmlFormId.trim()) {
      throw new Error('ODK_CENTRAL_FORM_ID_REQUIRED');
    }

    return asArray<OdkCentralSubmissionReference>(
      await this.get(`/v1/projects/${projectId}/forms/${encodeURIComponent(xmlFormId)}/submissions`),
      'ODK_CENTRAL_SUBMISSION_LIST_INVALID',
    );
  }

  private assertProjectId(projectId: number): void {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new Error('ODK_CENTRAL_PROJECT_ID_INVALID');
    }
  }
}
