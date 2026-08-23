import type { NexusConnectorHttpFetch } from '../snipe-it/snipeItClient';

export interface ErpNextDocumentReference { name: string; [field: string]: unknown }
interface ErpNextListResponse { data?: ErpNextDocumentReference[] }
export class ErpNextServerClient {
  constructor(private readonly options: { baseUrl: string; apiKey: string; apiSecret: string; fetchImpl: NexusConnectorHttpFetch }) {
    if (!options.baseUrl.trim()) throw new Error('ERPNEXT_BASE_URL_REQUIRED');
    if (!options.apiKey.trim() || !options.apiSecret.trim()) throw new Error('ERPNEXT_API_CREDENTIALS_REQUIRED');
  }
  private async list(doctype: 'Item' | 'Warehouse' | 'Material Request' | 'Purchase Order'): Promise<ErpNextDocumentReference[]> {
    const url = `${this.options.baseUrl.replace(/\/+$/, '')}/api/resource/${encodeURIComponent(doctype)}?limit_page_length=100`;
    const response = await this.options.fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json', Authorization: `token ${this.options.apiKey}:${this.options.apiSecret}` } });
    const payload = await response.json() as ErpNextListResponse;
    if (!response.ok) throw new Error(`ERPNEXT_API_ERROR_${response.status}`);
    if (!Array.isArray(payload.data)) throw new Error('ERPNEXT_LIST_INVALID');
    return payload.data;
  }
  listItems() { return this.list('Item'); }
  listWarehouses() { return this.list('Warehouse'); }
  listMaterialRequests() { return this.list('Material Request'); }
  listPurchaseOrders() { return this.list('Purchase Order'); }
}
