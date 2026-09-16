import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/supabase';
import { encryptJson } from '@/lib/crypto';
import { getIntegration, integrationSecrets } from '@/lib/integrations';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const cookieState = req.cookies.get('meta_oauth_state')?.value || '';
  const error = url.searchParams.get('error') || '';

  if (error) return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=denied', req.url));
  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=state', req.url));
  }

  const existingMeta = await getIntegration('meta').catch(() => null);
  const existingSecrets = existingMeta ? integrationSecrets<{app_secret?:string;access_token?:string}>(existingMeta) : {};
  const appId = String(existingMeta?.config_public?.app_id || process.env.META_APP_ID || '').trim();
  const appSecret = String(existingSecrets.app_secret || process.env.META_APP_SECRET || '').trim();
  const graphVersion = String(existingMeta?.config_public?.graph_version || process.env.META_GRAPH_VERSION || '').trim();
  const appUrl = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
  const redirectUri = `${appUrl}/api/meta/oauth/callback`;

  if (!appId || !appSecret || !graphVersion) {
    return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=config', req.url));
  }

  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl, { cache: 'no-store' });
    const tokenJson: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) throw new Error(tokenJson?.error?.message || 'Falha ao obter token da Meta');

    let accessToken = String(tokenJson.access_token);
    const longUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', appId);
    longUrl.searchParams.set('client_secret', appSecret);
    longUrl.searchParams.set('fb_exchange_token', accessToken);
    const longRes = await fetch(longUrl, { cache: 'no-store' });
    const longJson: any = await longRes.json();
    if (longRes.ok && longJson.access_token) accessToken = String(longJson.access_token);

    const accountsUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/adaccounts`);
    accountsUrl.searchParams.set('fields', 'id,name,account_status,currency,timezone_name');
    accountsUrl.searchParams.set('limit', '200');
    accountsUrl.searchParams.set('access_token', accessToken);
    const accountsRes = await fetch(accountsUrl, { cache: 'no-store' });
    const accountsJson: any = await accountsRes.json();
    if (!accountsRes.ok) throw new Error(accountsJson?.error?.message || 'Falha ao listar contas de anúncios');

    const accounts = (accountsJson.data || []).map((a:any) => ({
      id: String(a.id || ''),
      name: String(a.name || a.id || ''),
      account_status: a.account_status ?? null,
      currency: a.currency || null,
      timezone_name: a.timezone_name || null
    })).filter((a:any) => a.id);

    const selected = accounts.find((a:any) => Number(a.account_status) === 1) || accounts[0] || null;
    const db = getAdminDb();
    const existing = await db.from('integrations').select('webhook_key,config_public').eq('provider','meta').maybeSingle();
    const row:any = {
      provider:'meta',
      name:'Meta Ads',
      status:'connected',
      config_public:{
        ...(existing.data?.config_public || {}),
        app_id: appId,
        graph_version: graphVersion,
        ad_account_id:selected?.id || null,
        ad_account_name:selected?.name || null,
        accounts,
        connected_via:'oauth'
      },
      secret_config:encryptJson({app_secret:appSecret,access_token:accessToken}),
      updated_at:new Date().toISOString()
    };
    if (!existing.data?.webhook_key) row.webhook_key = crypto.randomUUID();
    const { error: dbError } = await db.from('integrations').upsert(row,{onConflict:'provider'});
    if (dbError) throw dbError;

    const res = NextResponse.redirect(new URL(`/dashboard/integracoes?meta_connected=1&accounts=${accounts.length}`, req.url));
    res.cookies.set('meta_oauth_state','',{path:'/',maxAge:0});
    return res;
  } catch (e:any) {
    console.error('Meta OAuth:', e);
    return NextResponse.redirect(new URL(`/dashboard/integracoes?meta_error=${encodeURIComponent(String(e?.message || e).slice(0,120))}`, req.url));
  }
}
