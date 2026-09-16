import { getAdminDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type EventRow = { event_name: string; offer_id: string | null; site_id?: string | null; attribution: Record<string, any> | null; event_time: string };
type OrderRow = { amount: number; status: string; provider: string; occurred_at: string; attribution: Record<string, any> | null; product_name?: string | null; payment_method?: string | null };

function startFor(period:string){const d=new Date(); if(period==='yesterday'){d.setDate(d.getDate()-1);d.setHours(0,0,0,0);return {start:d,end:new Date(d.getTime()+86400000)}} if(period==='7d'){d.setDate(d.getDate()-6);d.setHours(0,0,0,0);return {start:d,end:new Date()}} if(period==='30d'){d.setDate(d.getDate()-29);d.setHours(0,0,0,0);return {start:d,end:new Date()}} d.setHours(0,0,0,0);return {start:d,end:new Date()}}

async function loadStats(period:string, platform:string, product:string, source:string) {
  const fallback={revenue:0,spend:0,profit:0,roas:null as number|null,roi:null as number|null,margin:null as number|null,refundRate:0,chargebackRate:0,clicks:0,pageviews:0,initiateCheckout:0,checkoutClicks:0,approvedSales:0,refundAmount:0,chargebackAmount:0,offers:[] as string[],platforms:[] as string[],sources:[] as string[],rows:[] as any[]};
  try {
    const db=getAdminDb(); const range=startFor(period); const start=range.start.toISOString(); const end=range.end.toISOString();
    const [{data:events},{data:orders},{data:ads}]=await Promise.all([
      db.from('events').select('event_name,offer_id,site_id,attribution,event_time').gte('event_time',start).lte('event_time',end).order('event_time',{ascending:false}).limit(20000),
      db.from('orders').select('amount,status,provider,occurred_at,attribution,product_name,payment_method').gte('occurred_at',start).lte('occurred_at',end).order('occurred_at',{ascending:false}).limit(5000),
      db.from('ad_metrics').select('metric_date,platform,campaign_id,adset_id,ad_id,campaign_name,adset_name,ad_name,spend,clicks,impressions').gte('metric_date',start.slice(0,10)).lte('metric_date',end.slice(0,10)).limit(20000)
    ]);
    let ev=(events||[]) as EventRow[]; let os=(orders||[]) as OrderRow[]; let ad=(ads||[]) as any[];
    const detectedOffers=[...new Set(ev.map(e=>e.offer_id).filter(Boolean) as string[])].sort();
    const detectedPlatforms=[...new Set(ad.map(a=>String(a.platform||'meta')).filter(Boolean))].sort();
    const detectedSources=[...new Set(ev.map(e=>String(e.attribution?.utm_source||'')).filter(Boolean))].sort();
    if(product&&product!=='all') ev=ev.filter(e=>e.offer_id===product);
    if(source&&source!=='all') ev=ev.filter(e=>String(e.attribution?.utm_source||'')===source);
    if(platform&&platform!=='all') ad=ad.filter(a=>String(a.platform||'meta')===platform);
    if(product&&product!=='all') os=os.filter(o=>String(o.product_name||o.attribution?.otr_offer_id||o.attribution?.offer_id||'')===product || String(o.attribution?.offer_id||'')===product);
    if(source&&source!=='all') os=os.filter(o=>String(o.attribution?.utm_source||'')===source);
    const approved=os.filter(o=>['paid','approved','completed','succeeded'].includes(String(o.status).toLowerCase()));
    const refunded=os.filter(o=>['refunded','refund'].includes(String(o.status).toLowerCase()));
    const chargebacks=os.filter(o=>String(o.status).toLowerCase()==='chargeback');
    const revenue=approved.reduce((s,o)=>s+Number(o.amount||0),0); const refundAmount=refunded.reduce((s,o)=>s+Number(o.amount||0),0); const chargebackAmount=chargebacks.reduce((s,o)=>s+Number(o.amount||0),0); const netRevenue=Math.max(0,revenue-refundAmount-chargebackAmount);
    const spend=ad.reduce((s,a)=>s+Number(a.spend||0),0); const clicks=ad.reduce((s,a)=>s+Number(a.clicks||0),0); const profit=netRevenue-spend;
    const count=(n:string)=>ev.filter(e=>e.event_name===n).length; const pageviews=count('page_view'); const initiateCheckout=count('initiate_checkout'); const checkoutClicks=count('checkout_click');
    const rows=approved.slice(0,12).map(o=>({time:o.occurred_at,provider:o.provider,value:Number(o.amount||0),product:o.product_name||'—',source:o.attribution?.utm_source||'—'}));
    return {revenue:netRevenue,spend,profit,roas:spend>0?netRevenue/spend:null,roi:spend>0?(profit/spend)*100:null,margin:netRevenue>0?(profit/netRevenue)*100:null,refundRate:os.length?(refunded.length/os.length)*100:0,chargebackRate:os.length?(chargebacks.length/os.length)*100:0,clicks,pageviews,initiateCheckout,checkoutClicks,approvedSales:approved.length,refundAmount,chargebackAmount,offers:detectedOffers,platforms:detectedPlatforms,sources:detectedSources,rows};
  } catch(error){console.error(error);return fallback}
}

const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const percent=(n:number|null)=>n===null?'N/A':`${n.toFixed(1)}%`;
const ratio=(current:number,base:number)=>base>0?`${Math.round(current/base*100)}%`:'0%';

export default async function Dashboard({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const q=await searchParams; const period=q.period||'today', platform=q.platform||'all', product=q.product||'all', source=q.source||'all'; const s=await loadStats(period,platform,product,source);
  return <main className="wrap wide overviewPage">
    <div className="overviewHeader"><div><span className="eyebrow">Performance</span><h1>Visão geral</h1><p className="muted">Acompanhe receita, mídia e conversão da sua operação em um só lugar.</p></div><div className="liveBadge"><span></span> Dados da operação</div></div>
    <form className="filtersCard" method="get">
      <div className="filterGrid">
        <label className="filterItem"><span>Período de Visualização</span><select name="period" defaultValue={period}><option value="today">Hoje</option><option value="yesterday">Ontem</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option></select></label>
        <label className="filterItem"><span>Conta de Anúncio</span><select name="account" defaultValue="all"><option value="all">Qualquer</option></select></label>
        <label className="filterItem"><span>Fonte de Tráfego</span><select name="source" defaultValue={source}><option value="all">Qualquer</option>{s.sources.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label className="filterItem"><span>Plataforma</span><select name="platform" defaultValue={platform}><option value="all">Qualquer</option>{s.platforms.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label className="filterItem"><span>Produto</span><select name="product" defaultValue={product}><option value="all">Qualquer</option>{s.offers.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      </div>
      <div className="filterFooter"><span>Mais filtros</span><button className="applyButton" type="submit">Aplicar filtros</button></div>
    </form>
    <section className="topMetrics">
      <Metric title="Faturamento Líquido" value={money(s.revenue)} />
      <Metric title="Gastos com anúncios" value={money(s.spend)} />
      <Metric title="ROAS" value={s.roas===null?'N/A':s.roas.toFixed(2)} />
      <Metric title="Lucro" value={money(s.profit)} />
    </section>
    <section className="dashboardMatrix">
      <div className="conversionPanel panel"><div className="panelTitle">Funil de Conversão (Meta Ads)<span className="infoDot">i</span></div><div className="conversionGrid">
        <FunnelStep label="Cliques" rate={s.clicks? '100%':'0%'} count={s.clicks}/>
        <FunnelStep label="Vis. Página" rate={ratio(s.pageviews,s.clicks)} count={s.pageviews}/>
        <FunnelStep label="ICs" rate={ratio(s.initiateCheckout,s.pageviews)} count={s.initiateCheckout}/>
        <FunnelStep label="Vendas Inic." rate={ratio(s.checkoutClicks,s.initiateCheckout||s.pageviews)} count={s.checkoutClicks}/>
        <FunnelStep label="Vendas Apr." rate={ratio(s.approvedSales,s.checkoutClicks||s.initiateCheckout)} count={s.approvedSales}/>
      </div></div>
      <div className="secondaryMetrics">
        <SmallMetric title="ROI" value={percent(s.roi)} /><SmallMetric title="Custos de Produto" value={money(0)} /><SmallMetric title="Margem" value={percent(s.margin)} /><SmallMetric title="Despesas adicionais" value={money(0)} /><SmallMetric title="Reembolso" value={`${s.refundRate.toFixed(1)}%`} /><SmallMetric title="Taxas" value={money(0)} /><SmallMetric title="Chargeback" value={`${s.chargebackRate.toFixed(1)}%`} /><SmallMetric title="Imposto Meta Ads" value={money(0)} />
      </div>
    </section>
    <section className="panel recentPanel"><div className="panelTitle">Últimas vendas aprovadas</div><div className="tableWrap"><table className="table"><thead><tr><th>Horário</th><th>Produto</th><th>Origem</th><th>Plataforma</th><th>Valor</th></tr></thead><tbody>{s.rows.length?s.rows.map((r:any,i:number)=><tr key={i}><td>{new Date(r.time).toLocaleString('pt-BR')}</td><td>{r.product}</td><td>{r.source}</td><td>{r.provider}</td><td>{money(r.value)}</td></tr>):<tr><td colSpan={5} className="muted">Aguardando vendas...</td></tr>}</tbody></table></div></section>
  </main>
}

function Metric({title,value}:{title:string,value:string}){return <div className="metricCard"><div className="metricTitle">{title}<span className="infoDot">i</span></div><div className="metricValue">{value}</div></div>}
function SmallMetric({title,value}:{title:string,value:string}){return <div className="smallMetric"><div className="metricTitle">{title}<span className="infoDot">i</span></div><div className="smallMetricValue">{value}</div></div>}
function FunnelStep({label,rate,count}:{label:string,rate:string,count:number}){return <div className="conversionStep"><div className="conversionLabel">{label}</div><div className="conversionRate">{rate}</div><div className="conversionCount">{count}</div></div>}
