export interface NexusConnectorHttpResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

export type NexusConnectorHttpFetch = (
  input: string,
  init: {
    method: 'GET';
    headers: Record<string, string>;
  },
) => Promise<NexusConnectorHttpResponse>;

export interface SnipeItAssetReference {
  id: number;
  name?: string | null;
  asset_tag?: string | null;
  serial?: string | null;
  model?: { id?: number; name?: string | null } | null;
  status_label?: { id?: number; name?: string | null; status_type?: string | null } | null;
  assigned_to?: { id?: number; name?: string | null; type?: string | null } | null;
  location?: { id?: number; name?: string | null } | null;
  image?: string | null;
  notes?: string | null;
  last_checkout?: { datetime?: string | null; formatted?: string | null } | string | null;
}

export interface SnipeItAssetListResponse {
  total: number;
  rows: SnipeItAssetReference[];
}

interface SnipeItErrorPayload {
  status?: string;
  messages?: unknown;
  message?: unknown;
}

export interface SnipeItServerClientOptions {
  baseUrl: string;
  bearerToken: string;
  fetchImpl: NexusConnectorHttpFetch;
  userAgent?: string;
}

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const encodeQuery = (query: Record<string, string | number | undefined>): string => {
  const entries = Object.entries(query).filter((entry): entry is [string, string | number] => entry[1] !== undefined);

  if (entries.length === 0) {
    return '';
  }

  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&')}`;
};

const readErrorMessage = (payload: SnipeItErrorPayload): string => {
  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (typeof payload.messages === 'string') {
    return payload.messages;
  }

  return 'Snipe-IT API request failed';
};

export class SnipeItServerClient {
  private readonly baseUrl: string;
  private readonly bearerToken: string;
  private readonly fetchImpl: NexusConnectorHttpFetch;
  private readonly userAgent: string;

  constructor(options: SnipeItServerClientOptions) {
    if (!options.baseUrl.trim()) {
      throw new Error('SNIPE_IT_BASE_URL_REQUIRED');
    }

    if (!options.bearerToken.trim()) {
      throw new Error('SNIPE_IT_BEARER_TOKEN_REQUIRED');
    }

    this.baseUrl = normalizeBaseUrl(options.baseUrl.trim());
    this.bearerToken = options.bearerToken;
    this.fetchImpl = options.fetchImpl;
    this.userAgent = options.userAgent ?? 'NOSMO-Nexus-SnipeIT-Connector';
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.bearerToken}`,
        'User-Agent': this.userAgent,
      },
    });

    const payload = (await response.json()) as SnipeItErrorPayload & T;

    if (!response.ok || payload.status === 'error') {
      throw new Error(`SNIPE_IT_API_ERROR_${response.status}: ${readErrorMessage(payload)}`);
    }

    return payload as T;
  }

  async listAssets(options: {
    search?: string;
    limit?: number;
    offset?: number;
    statusId?: number;
    categoryId?: number;
    assignedTo?: number;
  } = {}): Promise<SnipeItAssetListResponse> {
    const query = encodeQuery({
      search: options.search,
      limit: options.limit,
      offset: options.offset,
      status_id: options.statusId,
      category_id: options.categoryId,
      assigned_to: options.assignedTo,
    });

    return this.get<SnipeItAssetListResponse>(`/api/v1/hardware${query}`);
  }

  async getAsset(assetId: number): Promise<SnipeItAssetReference> {
    if (!Number.isInteger(assetId) || assetId <= 0) {
      throw new Error('SNIPE_IT_ASSET_ID_INVALID');
    }

    return this.get<SnipeItAssetReference>(`/api/v1/hardware/${assetId}`);
  }
}
