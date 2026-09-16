import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAdminRequest } from '@/lib/admin-auth';
import { getIntegration, integrationSecrets } from '@/lib/integrations';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.redirect(new URL('/login?error=1', req.url));

  const meta = await getIntegration('meta').catch(() => null);
  const secrets = meta ? integrationSecrets<{ app_secret?: string }>(meta) : {};
  const appId = String(meta?.config_public?.app_id || process.env.META_APP_ID || '').trim();
  const graphVersion = String(meta?.config_public?.graph_version || process.env.META_GRAPH_VERSION || '').trim();
  const appSecret = String(secrets.app_secret || process.env.META_APP_SECRET || '').trim();
  const appUrl = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');

  if (!appId || !appSecret || !graphVersion) {
    return NextResponse.redirect(new URL('/dashboard/integracoes?meta_error=config', req.url));
  }

  const state = crypto.randomBytes(24).toString('hex');
  const redirectUri = `${appUrl}/api/meta/oauth/callback`;
  const auth = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  auth.searchParams.set('client_id', appId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('state', state);
  auth.searchParams.set('scope', 'ads_read,business_management');
  auth.searchParams.set('response_type', 'code');

  const res = NextResponse.redirect(auth);
  res.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60
  });
  return res;
}
