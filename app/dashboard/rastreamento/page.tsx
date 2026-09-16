import { headers } from 'next/headers';

export default async function Rastreamento(){
  const h=await headers();const host=h.get('x-forwarded-host')||h.get('host')||'SEU-DOMINIO';const proto=h.get('x-forwarded-proto')||'https';const base=`${proto}://${host}`;
  const script=`<script\n  src="${base}/tracker.js"\n  data-site="minha-operacao"\n  data-offer="nome-da-oferta"\n  async>\n</script>`;
  const meta=`utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}`;
  return <main className="wrap wide"><div className="hero"><div><span className="pill">Instalação</span><h1>Códigos de rastreamento</h1><p className="muted">Um único script para todas as suas páginas. Troque apenas site e oferta.</p></div></div>
    <div className="card"><h2>1. Script universal</h2><p>Cole antes de <code>&lt;/body&gt;</code> em cada oferta.</p><pre className="code"><code>{script}</code></pre></div>
    <div className="card" style={{marginTop:16}}><h2>2. Parâmetros da Meta Ads</h2><p>Adicione estes parâmetros à URL do anúncio.</p><pre className="code"><code>{meta}</code></pre></div>
    <div className="card" style={{marginTop:16}}><h2>3. Marcar o botão de checkout</h2><pre className="code"><code>{`<a href="https://seu-checkout.com" data-checkout data-track="cta-oferta">Comprar agora</a>`}</code></pre><p className="muted">O tracker registra o clique e adiciona automaticamente UTMs, IDs de anúncio, fbc/fbp e o click_id ao link de checkout.</p></div>
    <div className="card" style={{marginTop:16}}><h2>4. Eventos personalizados</h2><pre className="code"><code>{`window.OfferTracker?.track('view_offer', { section: 'oferta' });\nwindow.OfferTracker?.track('video_play', { video: 'vsl-principal' });\nwindow.OfferTracker?.track('faq_open', { item: 'garantia' });`}</code></pre></div>
  </main>;
}
