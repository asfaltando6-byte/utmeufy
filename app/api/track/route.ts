import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/supabase';

const allowedEvents = new Set(['page_view','scroll_depth','engaged_time','click','checkout_click','form_submit','page_exit','view_offer','view_pricing','faq_open','carousel_view','video_play','video_progress','video_complete','initiate_checkout','purchase','lead','custom']);
function hashIp(ip: string | null) { const salt = process.env.IP_HASH_SALT; if (!ip || !salt) return null; return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex'); }
function response(payload: unknown, status = 200) { return NextResponse.json(payload, { status, headers: { 'access-control-allow-origin': '*' } }); }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' }}); }
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text(); const body = JSON.parse(raw || '{}');
    if (!body?.event_name || !body?.event_id || !body?.session_id || !body?.visitor_id) return response({ ok:false, error:'invalid_event' },400);
    const eventName = allowedEvents.has(String(body.event_name)) ? String(body.event_name) : 'custom';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null; const ua = req.headers.get('user-agent')?.slice(0,600) || null; const db = getAdminDb();
    const { error } = await db.from('events').upsert({ event_id:String(body.event_id), event_name:eventName.slice(0,80), session_id:String(body.session_id), visitor_id:String(body.visitor_id), click_id:body.click_id?String(body.click_id).slice(0,100):null, site_id:body.site_id?String(body.site_id).slice(0,100):null, offer_id:body.offer_id?String(body.offer_id).slice(0,100):null, page_url:String(body.page_url||'').slice(0,2000), page_path:String(body.page_path||'').slice(0,500), page_title:body.page_title?String(body.page_title).slice(0,300):null, referrer:body.referrer?String(body.referrer).slice(0,2000):null, event_time:body.timestamp||new Date().toISOString(), attribution:body.attribution&&typeof body.attribution==='object'?body.attribution:{}, properties:body.properties&&typeof body.properties==='object'?body.properties:{}, user_agent:ua, ip_hash_source:hashIp(ip) }, { onConflict:'event_id', ignoreDuplicates:true });
    if (error) throw error; return response({ ok:true });
  } catch (e) { console.error(e); return response({ ok:false },500); }
}
