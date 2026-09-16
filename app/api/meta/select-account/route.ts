import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/supabase';
import { getIntegration } from '@/lib/integrations';
import { isAdminRequest } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.redirect(new URL('/login?error=1', req.url), 303);
  const form = await req.formData();
  const accountId = String(form.get('ad_account_id') || '').trim();
  if (!accountId) return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=account', req.url), 303);

  const integration = await getIntegration('meta');
  if (!integration) return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=not_connected', req.url), 303);
  const accounts = Array.isArray(integration.config_public?.accounts) ? integration.config_public.accounts : [];
  const selected = accounts.find((a:any)=>String(a.id)===accountId);
  if (!selected) return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=account', req.url), 303);

  const db = getAdminDb();
  const { error } = await db.from('integrations').update({
    config_public:{...integration.config_public,ad_account_id:selected.id,ad_account_name:selected.name},
    updated_at:new Date().toISOString()
  }).eq('provider','meta');
  if (error) return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=db', req.url), 303);
  return NextResponse.redirect(new URL('/dashboard/integracoes?meta_account_saved=1', req.url), 303);
}
