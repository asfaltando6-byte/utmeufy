import { NextRequest, NextResponse } from 'next/server';

async function derivedSessionToken(password: string) {
  const raw = new TextEncoder().encode(`utmeufy-session:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', raw);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD || '';
  if (!password) return NextResponse.redirect(new URL('/login?error=config', req.url));

  const expected = process.env.DASHBOARD_SESSION_TOKEN || await derivedSessionToken(password);
  const session = req.cookies.get('otr_admin')?.value;
  if (session === expected) return NextResponse.next();

  const login = new URL('/login', req.url);
  login.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/dashboard/:path*'] };
