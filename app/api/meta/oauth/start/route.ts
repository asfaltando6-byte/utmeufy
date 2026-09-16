import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAdminRequest } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.redirect(new URL('/login?error=1', req.url));

  const appId = process.env.META_APP_ID || '';
  const appUrl = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
  const graphVersion = process.env.META_GRAPH_VERSION || '';

  if (!appId || !graphVersion) {
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
