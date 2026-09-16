import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function derivedSessionToken(password: string) {
  return crypto.createHash('sha256').update(`utmeufy-session:${password}`).digest('hex');
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get('password') || '');
  const expectedPassword = process.env.DASHBOARD_PASSWORD || '';
  const rawNext = String(form.get('next') || '/dashboard');
  const next = rawNext.startsWith('/dashboard') ? rawNext : '/dashboard';

  if (!expectedPassword || !password || !safeEqual(password, expectedPassword)) {
    const url = new URL('/login', req.url);
    url.searchParams.set('error', '1');
    url.searchParams.set('next', next);
    return NextResponse.redirect(url, 303);
  }

  const token = process.env.DASHBOARD_SESSION_TOKEN || derivedSessionToken(expectedPassword);
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set('otr_admin', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14
  });
  return res;
}
