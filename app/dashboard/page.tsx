import { getAdminDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type EventRow = { event_name: string; offer_id: string | null; attribution: Record<string, unknown> | null; event_time: string };
type OrderRow = { amount: number; status: string; provider: string; occurred_at: string; attribution: Record<string, unknown> | null };

async function stats() {
  try {
    const db = getAdminDb();
    const since = new Date(); since.setHours(0,0,0,0);
    const [{ data: events }, { data: orders }, { data: ads }] = await Promise.all([
      db.from('events').select('event_name,offer_id,attribution,event_time').gte('event_time', since.toISOString()).order('event_time', { ascending: false }).limit(10000),
      db.from('orders').select('amount,status,provider,occurred_at,attribution').gte('occurred_at', since.toISOString()).order('occurred_at', { ascending: false }).limit(1000),
      db.from('ad_metrics').select('spend,clicks,impressions').eq('metric_date', since.toISOString().slice(0,10)).limit(10000)
    ]);
    const ev = (events || []) as EventRow[];
    const os = (orders || []) as OrderRow[];
    const approved = os.filter(o => ['paid','approved','completed','succeeded'].includes(String(o.status).toLowerCase()));
    const revenue = approved.reduce((s,o)=>s+Number(o.amount||0),0);
    const spend = (ads || []).reduce((s,a)=>s+Number(a.spend||0),0);
    const counts = (name: string) => ev.filter(e => e.event_name === name).length;
    const offers = new Map<string,{events:number,checkouts:number,purchases:number}>();
    for (const e of ev) {
      const key = e.offer_id || 'sem-oferta';
      const row = offers.get(key) || { events:0, checkouts:0, purchases:0 };
      row.events++;
      if (['checkout_click','initiate_checkout'].includes(e.event_name)) row.checkouts++;
      if (e.event_name === 'purchase') row.purchases++;
      offers.set(key,row);
    }
    return { events: ev.length, pageviews: counts('page_view'), checkoutClicks: counts('checkout_click'), initiateCheckout: counts('initiate_checkout'), orders: approved.length, revenue, spend, roas: spend > 0 ? revenue/spend : null, rows: approved.slice(0,20), offers: [...offers.entries()].sort((a,b)=>b[1].events-a[1].events).slice(0,20) };
  } catch (error) {
    console.error(error);
    return { events:0,pageviews:0,checkoutClicks:0,initiateCheckout:0,orders:0,revenue:0,spend:0,roas:null,rows:[] as OrderRow[],offers:[] as [string,{events:number,checkouts:number,purchases:number}][] };
  }
}

const money = (n:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);

export default async function Dashboard() {
  const s = await stats();
  return <main className="wrap">
    <div className="hero"><div><span className="pill">Hoje</span><h1>UTMeuFy</h1><p className="muted">Eventos, funil, vendas e atribuição em infraestrutura própria.</p></div><form action="/api/auth/logout" method="post"><button className="button secondary">Sair</button></form></div>
    <div className="grid">
      <div className="card"><div className="muted">PageViews</div><div className="metric">{s.pageviews}</div></div>
      <div className="card"><div className="muted">Checkout clicks</div><div className="metric">{s.checkoutClicks}</div></div>
      <div className="card"><div className="muted">Vendas</div><div className="metric">{s.orders}</div></div>
      <div className="card"><div className="muted">Receita</div><div className="metric">{money(s.revenue)}</div></div>
      <div className="card"><div className="muted">Gasto Meta</div><div className="metric">{money(s.spend)}</div></div>
      <div className="card"><div className="muted">ROAS</div><div className="metric">{s.roas ? s.roas.toFixed(2) : '—'}</div></div>
    </div>
    <div className="card" style={{marginTop:16}}><h2>Funil de hoje</h2><div className="funnel"><div><b>{s.pageviews}</b><span>PageView</span></div><div>→</div><div><b>{s.checkoutClicks}</b><span>Checkout click</span></div><div>→</div><div><b>{s.initiateCheckout}</b><span>IC</span></div><div>→</div><div><b>{s.orders}</b><span>Compras</span></div></div></div>
    <div className="card" style={{marginTop:16}}><h2>Ofertas</h2><table className="table"><thead><tr><th>Oferta</th><th>Eventos</th><th>Ações de checkout</th><th>Purchase events</th></tr></thead><tbody>{s.offers.length ? s.offers.map(([id,o])=><tr key={id}><td>{id}</td><td>{o.events}</td><td>{o.checkouts}</td><td>{o.purchases}</td></tr>) : <tr><td colSpan={4} className="muted">Aguardando dados...</td></tr>}</tbody></table></div>
    <div className="card" style={{marginTop:16}}><h2>Últimas vendas</h2><table className="table"><thead><tr><th>Horário</th><th>Provedor</th><th>Status</th><th>Valor</th></tr></thead><tbody>{s.rows.length ? s.rows.map((o,i)=><tr key={i}><td>{new Date(o.occurred_at).toLocaleString('pt-BR')}</td><td>{o.provider}</td><td>{o.status}</td><td>{money(Number(o.amount))}</td></tr>) : <tr><td colSpan={4} className="muted">Aguardando webhook de vendas...</td></tr>}</tbody></table></div>
  </main>;
}
