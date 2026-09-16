import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationByKey, integrationSecrets } from '@/lib/integrations';
import { logWebhook, pickAttribution, saveOrder } from '@/lib/orders';

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || '';
  const integration = await getIntegrationByKey('wiapy', key);
  if (!integration) return NextResponse.json({error:'integration not found'},{status:404});
  const secret = integrationSecrets<{token?:string}>(integration);
  const auth = req.headers.get('authorization') || '';
  if (secret.token && auth !== secret.token && auth !== `Bearer ${secret.token}`) {
    await logWebhook('wiapy','rejected','authorization inválida',{integrationId:integration.id});
    return NextResponse.json({error:'unauthorized'},{status:401});
  }
  const body:any = await req.json();
  const p = body.payment || body.data?.payment || body.data || body;
  const externalId = String(p.id || body.id || body.order_id || '');
  if (!externalId) return NextResponse.json({error:'payment id ausente'},{status:400});
  const amountRaw = Number(p.amount ?? body.amount ?? 0);
  const amount = amountRaw > 100 ? amountRaw / 100 : amountRaw;
  const tracking = {...(body.tracking||{}),...(p.tracking||{}),...body,...p};
  try {
    await saveOrder({provider:'wiapy',externalOrderId:externalId,eventType:String(p.type||body.event||'payment'),status:String(p.status||body.status||'unknown'),amount,currency:String(p.currency||'BRL'),paymentMethod:p.payment_method||null,productId:String(body.product?.id||p.product_id||'')||null,productName:body.product?.name||p.product_name||null,clickId:tracking.otr_click_id||tracking.click_id||null,attribution:pickAttribution(tracking),raw:body,occurredAt:p.paid_at||p.updated_at||body.created_at});
    await logWebhook('wiapy','processed','evento processado',{integrationId:integration.id,eventType:String(p.type||body.event||'payment'),externalId});
    return NextResponse.json({ok:true});
  } catch (e:any) {
    await logWebhook('wiapy','error',String(e?.message||e),{integrationId:integration.id,externalId});
    return NextResponse.json({error:'processing error'},{status:500});
  }
}
