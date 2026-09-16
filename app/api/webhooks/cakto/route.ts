import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationByKey } from '@/lib/integrations';
import { logWebhook, pickAttribution, saveOrder } from '@/lib/orders';

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || '';
  const integration = await getIntegrationByKey('cakto', key);
  if (!integration) return NextResponse.json({error:'integration not found'},{status:404});
  const body:any = await req.json();
  const eventType = String(body.event || body.type || body.event_type || body.data?.event || 'payment');
  const d = body.data || body;
  const order = d.order || d.purchase || d.transaction || d;
  const externalId = String(order.id || order.order_id || order.transaction_id || d.id || '');
  if (!externalId) return NextResponse.json({error:'order id ausente'},{status:400});
  const amountRaw = Number(order.amount ?? order.total ?? order.price ?? 0);
  const amount = amountRaw > 1000 ? amountRaw / 100 : amountRaw;
  const statusMap:Record<string,string> = {purchase_approved:'paid',purchase_refused:'refused',refund:'refunded',chargeback:'chargeback',initiate_checkout:'initiated'};
  const status = String(order.status || statusMap[eventType] || eventType || 'unknown');
  const tracking = {...(d.tracking||{}),...(order.tracking||{}),...d,...order};
  try {
    await saveOrder({provider:'cakto',externalOrderId:externalId,eventType,status,amount,currency:String(order.currency||'BRL'),paymentMethod:order.payment_method||order.method||null,productId:String(d.product?.id||order.product_id||'')||null,productName:d.product?.name||order.product_name||null,clickId:tracking.otr_click_id||tracking.click_id||null,attribution:pickAttribution(tracking),raw:body,occurredAt:order.paid_at||order.updated_at||body.created_at});
    await logWebhook('cakto','processed','evento processado',{integrationId:integration.id,eventType,externalId});
    return NextResponse.json({ok:true});
  } catch (e:any) {
    await logWebhook('cakto','error',String(e?.message||e),{integrationId:integration.id,eventType,externalId});
    return NextResponse.json({error:'processing error'},{status:500});
  }
}
