import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', req.url), 303);
  res.cookies.set('otr_admin', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
