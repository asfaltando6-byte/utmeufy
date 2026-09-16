import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/supabase';
import { encryptJson } from '@/lib/crypto';
import { isAdminRequest } from '@/lib/admin-auth';
import { getIntegration, integrationSecrets } from '@/lib/integrations';

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.redirect(new URL('/login?error=1', req.url), 303);

  const form = await req.formData();
  const appId = String(form.get('app_id') || '').trim();
  const appSecretInput = String(form.get('app_secret') || '').trim();
  const graphVersion = String(form.get('graph_version') || '').trim();

  if (!appId || !graphVersion) {
    return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=Preencha App ID e versão da Graph API', req.url), 303);
  }

  const current = await getIntegration('meta').catch(() => null);
  const currentSecrets = current ? integrationSecrets<{app_secret?:string;access_token?:string}>(current) : {};
  const appSecret = appSecretInput || currentSecrets.app_secret || '';
  if (!appSecret) {
    return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=Preencha o App Secret da Meta', req.url), 303);
  }

  const db = getAdminDb();
  const existing = await db.from('integrations').select('webhook_key,config_public').eq('provider','meta').maybeSingle();
  const row:any = {
    provider:'meta',
    name:'Meta Ads',
    status: current?.status === 'connected' ? 'connected' : 'configured',
    config_public:{
      ...(existing.data?.config_public || {}),
      app_id:appId,
      graph_version:graphVersion
    },
    secret_config:encryptJson({
      app_secret:appSecret,
      access_token:currentSecrets.access_token || undefined
    }),
    updated_at:new Date().toISOString()
  };
  if (!existing.data?.webhook_key) row.webhook_key = crypto.randomUUID();

  const { error } = await db.from('integrations').upsert(row,{onConflict:'provider'});
  if (error) return NextResponse.redirect(new URL(`/dashboard/integracoes?meta_error=${encodeURIComponent(error.message.slice(0,120))}`, req.url), 303);

  return NextResponse.redirect(new URL('/dashboard/integracoes?meta_app_saved=1', req.url), 303);
}
