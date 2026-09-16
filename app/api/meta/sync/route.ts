import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/supabase';
import { getIntegration, integrationSecrets } from '@/lib/integrations';
import { isAdminRequest } from '@/lib/admin-auth';

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.redirect(new URL('/login?error=1', req.url), 303);

  const integration = await getIntegration('meta');
  if (!integration) return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=not_connected', req.url), 303);

  const secrets = integrationSecrets<{ access_token?: string }>(integration);
  const token = secrets.access_token;
  const rawAccount = String(integration.config_public?.ad_account_id || '').trim();
  const accountId = rawAccount.startsWith('act_') ? rawAccount : rawAccount ? `act_${rawAccount}` : '';
  const version = String(integration.config_public?.graph_version || process.env.META_GRAPH_VERSION || '').trim();

  if (!token || !accountId || !version) {
    return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=missing_credentials', req.url), 303);
  }

  const form = await req.formData().catch(() => null);
  const days = Math.min(Math.max(Number(form?.get('days') || 30), 1), 90);
  const until = new Date();
  const since = new Date();
  since.setDate(until.getDate() - (days - 1));

  const timeRange = JSON.stringify({ since: ymd(since), until: ymd(until) });
  const fields = ['date_start','campaign_id','campaign_name','adset_id','adset_name','ad_id','ad_name','spend','impressions','clicks'].join(',');
  const params = new URLSearchParams({
    level: 'ad',
    fields,
    time_range: timeRange,
    time_increment: '1',
    limit: '500',
    access_token: token
  });

  let nextUrl: string | null = `https://graph.facebook.com/${version}/${accountId}/insights?${params.toString()}`;
  const rows: any[] = [];

  try {
    let pages = 0;
    while (nextUrl && pages < 50) {
      const res = await fetch(nextUrl, { method: 'GET', cache: 'no-store' });
      const json: any = await res.json();
      if (!res.ok || json?.error) {
        const message = json?.error?.message || `Meta API HTTP ${res.status}`;
        console.error('Meta sync error:', message);
        return NextResponse.redirect(new URL(`/dashboard/integracoes?meta_error=${encodeURIComponent(message.slice(0,120))}`, req.url), 303);
      }
      for (const r of json.data || []) {
        if (!r.ad_id || !r.date_start) continue;
        rows.push({
          metric_date: r.date_start,
          platform: 'meta',
          campaign_id: r.campaign_id || null,
          adset_id: r.adset_id || null,
          ad_id: r.ad_id,
          campaign_name: r.campaign_name || null,
          adset_name: r.adset_name || null,
          ad_name: r.ad_name || null,
          spend: Number(r.spend || 0),
          impressions: Number(r.impressions || 0),
          clicks: Number(r.clicks || 0)
        });
      }
      nextUrl = json?.paging?.next || null;
      pages++;
    }

    const db = getAdminDb();
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from('ad_metrics').upsert(rows.slice(i, i + 500), { onConflict: 'metric_date,platform,ad_id' });
      if (error) throw error;
    }

    return NextResponse.redirect(new URL(`/dashboard/integracoes?meta_synced=${rows.length}&days=${days}`, req.url), 303);
  } catch (error: any) {
    console.error(error);
    return NextResponse.redirect(new URL(`/dashboard/integracoes?meta_error=${encodeURIComponent(String(error?.message || error).slice(0,120))}`, req.url), 303);
  }
}
