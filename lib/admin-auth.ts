import crypto from 'crypto';
import type { NextRequest } from 'next/server';

export function adminSessionToken() {
  const password = process.env.DASHBOARD_PASSWORD || '';
  if (!password) return '';
  return process.env.DASHBOARD_SESSION_TOKEN || crypto.createHash('sha256').update(`utmeufy-session:${password}`).digest('hex');
}

export function isAdminRequest(req: NextRequest) {
  const expected = adminSessionToken();
  const actual = req.cookies.get('otr_admin')?.value || '';
  if (!expected || !actual || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
