import type { NexusConnectorHttpFetch } from '../snipe-it/snipeItClient';

export interface OpenProjectReference {
  id: number;
  identifier?: string | null;
  name: string;
  active?: boolean;
  public?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface OpenProjectWorkPackageReference {
  id: number;
  subject: string;
  description?: { format?: string; raw?: string | null; html?: string | null } | null;
  startDate?: string | null;
  dueDate?: string | null;
  percentageDone?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  _links?: Record<string, { href?: string | null; title?: string | null } | null>;
}

interface OpenProjectCollection<T> {
  _embedded?: {
    elements?: T[];
  };
}

export interface OpenProjectServerClientOptions {
  baseUrl: string;
  apiToken: string;
  fetchImpl: NexusConnectorHttpFetch;
}

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const collectionElements = <T>(payload: unknown, errorCode: string): T[] => {
  const elements = (payload as OpenProjectCollection<T> | null)?._embedded?.elements;
  if (!Array.isArray(elements)) throw new Error(errorCode);
  return elements;
};

const encodeBasic = (value: string): string => {
  if (typeof globalThis.btoa !== 'function') {
    throw new Error('OPENPROJECT_BASIC_AUTH_ENCODER_UNAVAILABLE');
  }
  return globalThis.btoa(value);
};

export class OpenProjectServerClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly fetchImpl: NexusConnectorHttpFetch;

  constructor(options: OpenProjectServerClientOptions) {
    if (!options.baseUrl.trim()) throw new Error('OPENPROJECT_BASE_URL_REQUIRED');
    if (!options.apiToken.trim()) throw new Error('OPENPROJECT_API_TOKEN_REQUIRED');
    this.baseUrl = normalizeBaseUrl(options.baseUrl.trim());
    this.apiToken = options.apiToken.trim();
    this.fetchImpl = options.fetchImpl;
  }

  private async get(path: string): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/hal+json',
        Authorization: `Basic ${encodeBasic(`apikey:${this.apiToken}`)}`,
      },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`OPENPROJECT_API_ERROR_${response.status}`);
    return payload;
  }

  async listProjects(): Promise<OpenProjectReference[]> {
    return collectionElements<OpenProjectReference>(
      await this.get('/api/v3/projects?pageSize=100'),
      'OPENPROJECT_PROJECT_LIST_INVALID',
    );
  }

  async listWorkPackages(): Promise<OpenProjectWorkPackageReference[]> {
    return collectionElements<OpenProjectWorkPackageReference>(
      await this.get('/api/v3/work_packages?pageSize=100&filters=[]'),
      'OPENPROJECT_WORK_PACKAGE_LIST_INVALID',
    );
  }

  async getWorkPackage(id: number): Promise<OpenProjectWorkPackageReference> {
    if (!Number.isInteger(id) || id <= 0) throw new Error('OPENPROJECT_WORK_PACKAGE_ID_INVALID');
    const payload = await this.get(`/api/v3/work_packages/${id}`);
    if (!payload || typeof payload !== 'object') throw new Error('OPENPROJECT_WORK_PACKAGE_INVALID');
    return payload as OpenProjectWorkPackageReference;
  }
}
