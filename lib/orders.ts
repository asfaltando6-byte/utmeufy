import { getAdminDb } from '@/lib/supabase';

const sensitive = /email|phone|telefone|name|nome|cpf|cnpj|document|address|endereco|card|cartao|cvv|password|senha/i;

export function sanitizePayload(value: any, depth = 0): any {
  if (depth > 5) return '[depth-limit]';
  if (Array.isArray(value)) return value.slice(0, 30).map(v => sanitizePayload(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value).slice(0, 80)) {
      if (sensitive.test(k)) continue;
      out[k] = sanitizePayload(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string') return value.slice(0, 1000);
  return value;
}

export function pickAttribution(source: any) {
  const s = source || {};
  const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','campaign_id','adset_id','ad_id','fbclid','fbc','fbp','gclid','ttclid'];
  return Object.fromEntries(keys.map(k => [k, s[k] ?? s?.tracking?.[k] ?? s?.utm?.[k]]).filter(([,v]) => v !== undefined && v !== null && v !== ''));
}

export async function saveOrder(input: {
  provider: string; externalOrderId: string; eventType?: string | null; status: string; amount?: number; currency?: string; paymentMethod?: string | null; productId?: string | null; productName?: string | null; clickId?: string | null; attribution?: Record<string, any>; raw?: any; occurredAt?: string;
}) {
  const db = getAdminDb();
  const row = {
    external_order_id: input.externalOrderId,
    provider: input.provider,
    event_type: input.eventType || 'payment',
    status: input.status,
    amount: Number(input.amount || 0),
    currency: input.currency || 'BRL',
    payment_method: input.paymentMethod || null,
    product_id: input.productId || null,
    product_name: input.productName || null,
    click_id: input.clickId || null,
    attribution: input.attribution || {},
    raw_payload: sanitizePayload(input.raw || {}),
    occurred_at: input.occurredAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { error } = await db.from('orders').upsert(row, { onConflict: 'provider,external_order_id,event_type' });
  if (error) throw error;
  return row;
}

export async function logWebhook(provider: string, status: string, detail: string, extra: {integrationId?: string;eventType?: string;externalId?: string} = {}) {
  try {
    const db = getAdminDb();
    await db.from('webhook_logs').insert({provider,status,detail,integration_id:extra.integrationId||null,event_type:extra.eventType||null,external_id:extra.externalId||null});
  } catch {}
}
