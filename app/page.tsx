export default function Home() {
  return <main className="wrap">
    <div className="hero"><div><span className="pill">UTMeuFy v0.2</span><h1>Tracker próprio de ofertas</h1><p className="muted">Atribuição first-party, comportamento da página, vendas e base para integração com Meta Ads.</p></div><a className="buttonLink" href="/dashboard">Abrir dashboard</a></div>
    <div className="grid">
      <div className="card"><div className="muted">Tracking</div><div className="metric">First-party</div></div>
      <div className="card"><div className="muted">Eventos</div><div className="metric">14+</div></div>
      <div className="card"><div className="muted">Sites/ofertas</div><div className="metric">Múltiplos</div></div>
      <div className="card"><div className="muted">Dashboard</div><div className="metric">Protegido</div></div>
    </div>
    <div className="card" style={{marginTop:16}}><h2>Instalação em qualquer oferta</h2><pre className="code">{`<script\n  src="https://SEU-TRACKER.vercel.app/tracker.js"\n  data-site="meu-site"\n  data-offer="minha-oferta"\n  async>\n</script>`}</pre><p className="muted">Para eventos específicos: <code>OfferTracker.track('view_offer', &#123; section: 'pricing' &#125;)</code>.</p></div>
  </main>;
}
