import { getAdminDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Row={provider:string;name:string;status:string;webhook_key:string;config_public:any;updated_at:string};

const providers=[
  {id:'wiapy',name:'Wiapy',kind:'Checkout',ready:true,desc:'Recebe compras em tempo real via webhook e atribui UTMs/fbc/fbp.'},
  {id:'cakto',name:'Cakto',kind:'Checkout',ready:true,desc:'Recebe eventos de checkout, compra aprovada, recusada, reembolso e chargeback.'},
  {id:'meta',name:'Meta Ads',kind:'Tráfego',ready:true,desc:'Conecte sua conta do Facebook para importar suas contas de anúncios e métricas.'},
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
  const meta=by.get('meta');
  const metaAccounts=Array.isArray(meta?.config_public?.accounts)?meta!.config_public.accounts:[];
  const metaSelected=meta?.config_public?.ad_account_id||'';

  return <main className="wrap wide">
    <div className="hero"><div><span className="pill">Central de integrações</span><h1>Conecte suas fontes</h1><p className="muted">Anúncio → página → checkout → venda → dashboard.</p></div></div>
    {params.saved&&<div className="success">Integração {params.saved} salva.</div>}
    {params.meta_connected&&<div className="success">Facebook conectado. Encontramos {params.accounts||'0'} conta(s) de anúncios.</div>}
    {params.meta_account_saved&&<div className="success">Conta de anúncios selecionada.</div>}
    {params.meta_synced&&<div className="success">Meta Ads sincronizada: {params.meta_synced} linhas importadas dos últimos {params.days||30} dias.</div>}
    {params.meta_error&&<div className="alert">Erro na integração Meta: {params.meta_error}</div>}

    <div className="integrationGrid">{providers.map(p=>{const r=by.get(p.id);return <div className="integrationCard" key={p.id}>
      <div className="integrationTop"><div><b>{p.name}</b><span>{p.kind}</span></div><span className={r?'status ok':p.ready?'status ready':'status soon'}>{r?'Conectado':p.ready?'Disponível':'Em breve'}</span></div>
      <p className="muted">{p.desc}</p>

      {p.id==='meta'&&<>
        {!r?<a className="button metaConnect" href="/api/meta/oauth/start">Conectar com Facebook</a>:<>
          <div className="connectedAccount"><span>Conta atual</span><b>{r.config_public?.ad_account_name||r.config_public?.ad_account_id||'Meta Ads'}</b></div>
          {metaAccounts.length>1&&<form className="stack" action="/api/meta/select-account" method="post"><label>Conta de anúncios</label><select className="input" name="ad_account_id" defaultValue={metaSelected}>{metaAccounts.map((a:any)=><option value={a.id} key={a.id}>{a.name} · {a.id}</option>)}</select><button className="button secondary" type="submit">Usar esta conta</button></form>}
          <div className="metaActions"><a className="button secondary" href="/api/meta/oauth/start">Reconectar Facebook</a><form action="/api/meta/sync" method="post"><select name="days" className="input compact"><option value="7">7 dias</option><option value="30" selected>30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option></select><button className="button" type="submit">Sincronizar Meta</button></form></div>
        </>}
      </>}

      {r&&['wiapy','cakto'].includes(p.id)&&<div className="miniCode">{app||'https://SEU-DOMINIO'}/api/webhooks/{p.id}?key={r.webhook_key}</div>}

      {p.ready&&p.id!=='meta'&&<details><summary>{r?'Atualizar integração':'Conectar'}</summary><form className="stack" action="/api/integrations" method="post"><input type="hidden" name="provider" value={p.id}/><input className="input" name="name" placeholder="Nome da integração" defaultValue={r?.name||p.name}/>{p.id==='wiapy'&&<><label>Token Authorization da Wiapy</label><input className="input" name="token" type="password" placeholder="token do webhook"/></>}{p.id==='cakto'&&<><label>Client ID da Cakto</label><input className="input" name="client_id"/><label>Client Secret</label><input className="input" name="client_secret" type="password"/></>}{p.id==='generic'&&<><label>Observação</label><input className="input" name="notes" placeholder="Nome do provedor / finalidade"/></>}<button className="button" type="submit">Salvar integração</button></form></details>}
    </div>})}</div>

    <div className="card" style={{marginTop:18}}><h2>Meta Ads</h2><p>Depois da configuração inicial do aplicativo da Meta, o uso passa a ser direto: clique em <b>Conectar com Facebook</b>, autorize o acesso, escolha a conta de anúncios e sincronize. Você não precisa copiar Access Token manualmente.</p></div>
    <div className="card" style={{marginTop:18}}><h2>Como usar checkouts</h2><p>Para Wiapy, copie a URL gerada acima para a área de Webhook da plataforma e use o mesmo token informado aqui. Para Cakto, use a URL gerada como destino do webhook.</p></div>
  </main>;
}
