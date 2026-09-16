import { getAdminDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Row={provider:string;name:string;status:string;webhook_key:string;config_public:any;updated_at:string};

const providers=[
  {id:'wiapy',name:'Wiapy',kind:'Checkout',ready:true,desc:'Recebe compras em tempo real via webhook e atribui UTMs/fbc/fbp.'},
  {id:'cakto',name:'Cakto',kind:'Checkout',ready:true,desc:'Recebe eventos de checkout, compra aprovada, recusada, reembolso e chargeback.'},
  {id:'meta',name:'Meta Ads',kind:'Tráfego',ready:true,desc:'Conecta sua conta de anúncios para importar gasto, impressões e cliques por campanha, conjunto e anúncio.'},
  {id:'generic',name:'Webhook genérico',kind:'Webhook',ready:true,desc:'Base para provedores adicionais sem alterar o tracker das páginas.'},
  {id:'kiwify',name:'Kiwify',kind:'Checkout',ready:false,desc:'Adaptador dedicado na próxima camada.'},
  {id:'hotmart',name:'Hotmart',kind:'Checkout',ready:false,desc:'Adaptador dedicado na próxima camada.'},
  {id:'stripe',name:'Stripe',kind:'Pagamento',ready:false,desc:'Adaptador dedicado na próxima camada.'}
];

export default async function Integracoes({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const params=await searchParams;
  let rows:Row[]=[];
  try{const db=getAdminDb();const {data}=await db.from('integrations').select('provider,name,status,webhook_key,config_public,updated_at').order('provider');rows=(data||[]) as Row[]}catch{}
  const by=new Map(rows.map(r=>[r.provider,r]));
  const app=(process.env.APP_URL||'').replace(/\/$/,'');
  return <main className="wrap wide">
    <div className="hero"><div><span className="pill">Central de integrações</span><h1>Conecte suas fontes</h1><p className="muted">Anúncio → página → checkout → venda → dashboard.</p></div></div>
    {params.saved&&<div className="success">Integração {params.saved} salva.</div>}
    {params.meta_synced&&<div className="success">Meta Ads sincronizada: {params.meta_synced} linhas importadas dos últimos {params.days||30} dias.</div>}
    {params.meta_error&&<div className="alert">Erro ao sincronizar Meta Ads: {params.meta_error}</div>}
    <div className="integrationGrid">{providers.map(p=>{const r=by.get(p.id);return <div className="integrationCard" key={p.id}><div className="integrationTop"><div><b>{p.name}</b><span>{p.kind}</span></div><span className={r?'status ok':p.ready?'status ready':'status soon'}>{r?'Conectado':p.ready?'Disponível':'Em breve'}</span></div><p className="muted">{p.desc}</p>{r&&['wiapy','cakto'].includes(p.id)&&<div className="miniCode">{app||'https://SEU-DOMINIO'}/api/webhooks/{p.id}?key={r.webhook_key}</div>}{r&&p.id==='meta'&&<div className="metaSyncBox"><div className="muted" style={{fontSize:13}}>Conta: {r.config_public?.ad_account_id||'—'} {r.config_public?.pixel_id?`• Pixel ${r.config_public.pixel_id}`:''}</div><form action="/api/meta/sync" method="post" className="syncRow"><select name="days" className="input"><option value="7">Últimos 7 dias</option><option value="30" selected>Últimos 30 dias</option><option value="60">Últimos 60 dias</option><option value="90">Últimos 90 dias</option></select><button className="button" type="submit">Sincronizar Meta</button></form></div>}{p.ready&&<details><summary>{r?'Atualizar integração':'Conectar'}</summary><form className="stack" action="/api/integrations" method="post"><input type="hidden" name="provider" value={p.id}/><input className="input" name="name" placeholder="Nome da integração" defaultValue={r?.name||p.name}/>{p.id==='wiapy'&&<><label>Token Authorization da Wiapy</label><input className="input" name="token" type="password" placeholder="token do webhook"/></>}{p.id==='cakto'&&<><label>Client ID da Cakto</label><input className="input" name="client_id"/><label>Client Secret</label><input className="input" name="client_secret" type="password"/></>}{p.id==='meta'&&<><label>ID da conta de anúncios</label><input className="input" name="ad_account_id" placeholder="act_123456789" defaultValue={r?.config_public?.ad_account_id||''}/><label>Pixel ID</label><input className="input" name="pixel_id" defaultValue={r?.config_public?.pixel_id||''}/><label>Access Token da Meta</label><input className="input" name="access_token" type="password" placeholder={r?'Cole um novo token apenas se quiser substituir':'Cole seu token com permissão ads_read'}/><label>Versão Graph API</label><input className="input" name="graph_version" placeholder="ex.: v26.0" defaultValue={r?.config_public?.graph_version||''}/><p className="muted" style={{fontSize:12}}>Para leitura de métricas, use um token com acesso à conta de anúncios e permissão de leitura de anúncios. O token fica criptografado no banco e não volta a aparecer na tela.</p></>}{p.id==='generic'&&<><label>Observação</label><input className="input" name="notes" placeholder="Nome do provedor / finalidade"/></>}<button className="button" type="submit">Salvar integração</button></form></details>}</div>})}</div>
    <div className="card" style={{marginTop:18}}><h2>Meta Ads: configuração</h2><p>1. Crie ou use um app no Meta for Developers vinculado ao seu Business. 2. Gere um token com acesso à conta de anúncios e permissão de leitura. 3. Copie o ID da conta no formato <b>act_...</b>. 4. Salve aqui e clique em <b>Sincronizar Meta</b>. O UTMeuFy então importa gasto, impressões e cliques por anúncio e cruza isso com os eventos e vendas capturados pelo seu tracker.</p></div>
    <div className="card" style={{marginTop:18}}><h2>Como usar checkouts</h2><p>Para Wiapy, copie a URL gerada acima para a área de Webhook da plataforma e use o mesmo token informado aqui. Para Cakto, use a URL gerada como destino do webhook. Nenhuma credencial aparece novamente na tela depois de salva.</p></div>
  </main>;
}
