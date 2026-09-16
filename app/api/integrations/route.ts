import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/supabase';
import { encryptJson } from '@/lib/crypto';

function admin(req: NextRequest) {
  return !!process.env.DASHBOARD_SESSION_TOKEN && req.cookies.get('otr_admin')?.value === process.env.DASHBOARD_SESSION_TOKEN;
}

export async function POST(req: NextRequest) {
  if (!admin(req)) return NextResponse.json({error:'unauthorized'},{status:401});
  const form = await req.formData();
  const provider = String(form.get('provider') || '').toLowerCase().trim();
  if (!['wiapy','cakto','meta','generic'].includes(provider)) return NextResponse.json({error:'provider inválido'},{status:400});
  const name = String(form.get('name') || provider.toUpperCase()).slice(0,80);
  const publicConfig = {
    ad_account_id: String(form.get('ad_account_id') || '').trim() || undefined,
    pixel_id: String(form.get('pixel_id') || '').trim() || undefined,
    graph_version: String(form.get('graph_version') || '').trim() || undefined,
    notes: String(form.get('notes') || '').trim().slice(0,300) || undefined
  };
  const secrets = {
    token: String(form.get('token') || '').trim() || undefined,
    client_id: String(form.get('client_id') || '').trim() || undefined,
    client_secret: String(form.get('client_secret') || '').trim() || undefined,
    access_token: String(form.get('access_token') || '').trim() || undefined
  };
  const db = getAdminDb();
  const existing = await db.from('integrations').select('webhook_key').eq('provider',provider).maybeSingle();
  const row:any = {provider,name,status:'connected',config_public:publicConfig,secret_config:encryptJson(secrets),updated_at:new Date().toISOString()};
  if (!existing.data?.webhook_key) row.webhook_key = crypto.randomUUID();
  const { error } = await db.from('integrations').upsert(row,{onConflict:'provider'});
  if (error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.redirect(new URL('/dashboard/integracoes?saved='+provider,req.url),303);
}
