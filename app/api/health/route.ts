import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ ok: true, service: 'utmeufy', time: new Date().toISOString() }); }
