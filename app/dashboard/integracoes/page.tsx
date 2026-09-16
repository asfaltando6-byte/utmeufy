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
  const app='https://utmeufy.vercel.app';
  const meta=by.get('meta');
  const metaAccounts=Array.isArray(meta?.config_public?.accounts)?meta!.config_public.accounts:[];
  const metaSelected=meta?.config_public?.ad_account_id||'';
  const metaConfigured=Boolean(meta?.config_public?.app_id&&meta?.config_public?.graph_version);
  const metaConnected=meta?.status==='connected'&&Boolean(meta?.config_public?.ad_account_id);

  return <main className="wrap wide">
    <div className="hero"><div><span className="pill">Central de integrações</span><h1>Conecte suas fontes</h1><p className="muted">Anúncio → página → checkout → venda → dashboard.</p></div></div>
    {params.saved&&<div className="success">Integração {params.saved} salva.</div>}
    {params.meta_app_saved&&<div className="success">Aplicativo da Meta configurado no UTMeuFy.</div>}
    {params.meta_connected&&<div className="success">Facebook conectado. Encontramos {params.accounts||'0'} conta(s) de anúncios.</div>}
    {params.meta_account_saved&&<div className="success">Conta de anúncios selecionada.</div>}
    {params.meta_synced&&<div className="success">Meta Ads sincronizada: {params.meta_synced} linhas importadas dos últimos {params.days||30} dias.</div>}
    {params.meta_error&&<div className="alert">Erro na integração Meta: {params.meta_error}</div>}

    <div className="integrationGrid">{providers.map(p=>{const r=by.get(p.id);const connected=p.id==='meta'?metaConnected:Boolean(r);return <div className="integrationCard" key={p.id}>
      <div className="integrationTop"><div><b>{p.name}</b><span>{p.kind}</span></div><span className={connected?'status ok':p.ready?'status ready':'status soon'}>{connected?'Conectado':p.ready?'Disponível':'Em breve'}</span></div>
      <p className="muted">{p.desc}</p>

      {p.id==='meta'&&<>
        {!metaConfigured?<div className="metaSetup">
          <div className="connectedAccount"><span>Configuração inicial</span><b>Cadastre seu aplicativo da Meta uma única vez</b></div>
          <form className="stack" action="/api/meta/settings" method="post">
            <label>Meta App ID</label>
            <input className="input" name="app_id" placeholder="ID do aplicativo" required />
            <label>Meta App Secret</label>
            <input className="input" name="app_secret" type="password" placeholder="Segredo do aplicativo" required />
            <label>Versão da Graph API</label>
            <input className="input" name="graph_version" placeholder="Ex.: vXX.X" required />
            <button className="button" type="submit">Salvar configuração Meta</button>
          </form>
          <p className="muted" style={{fontSize:12}}>URL de retorno para cadastrar no seu app da Meta:</p>
          <div className="miniCode">{app}/api/meta/oauth/callback</div>
        </div>:!metaConnected?<>
          <div className="connectedAccount"><span>Aplicativo configurado</span><b>Agora conecte a conta do Facebook</b></div>
          <a className="button metaConnect" href="/api/meta/oauth/start">Conectar com Facebook</a>
          <details style={{marginTop:14}}><summary>Alterar configuração do aplicativo</summary><form className="stack" action="/api/meta/settings" method="post"><label>Meta App ID</label><input className="input" name="app_id" defaultValue={meta?.config_public?.app_id||''} required/><label>Novo App Secret</label><input className="input" name="app_secret" type="password" placeholder="Deixe vazio para manter o atual"/><label>Versão da Graph API</label><input className="input" name="graph_version" defaultValue={meta?.config_public?.graph_version||''} required/><button className="button secondary" type="submit">Atualizar configuração</button></form></details>
        </>:<>
          <div className="connectedAccount"><span>Conta atual</span><b>{meta?.config_public?.ad_account_name||meta?.config_public?.ad_account_id||'Meta Ads'}</b></div>
          {metaAccounts.length>1&&<form className="stack" action="/api/meta/select-account" method="post"><label>Conta de anúncios</label><select className="input" name="ad_account_id" defaultValue={metaSelected}>{metaAccounts.map((a:any)=><option value={a.id} key={a.id}>{a.name} · {a.id}</option>)}</select><button className="button secondary" type="submit">Usar esta conta</button></form>}
          <div className="metaActions"><a className="button secondary" href="/api/meta/oauth/start">Reconectar Facebook</a><form action="/api/meta/sync" method="post"><select name="days" className="input compact" defaultValue="30"><option value="7">7 dias</option><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option></select><button className="button" type="submit">Sincronizar Meta</button></form></div>
        </>}
      </>}

      {r&&['wiapy','cakto'].includes(p.id)&&<div className="miniCode">{app}/api/webhooks/{p.id}?key={r.webhook_key}</div>}

      {p.ready&&p.id!=='meta'&&<details><summary>{r?'Atualizar integração':'Conectar'}</summary><form className="stack" action="/api/integrations" method="post"><input type="hidden" name="provider" value={p.id}/><input className="input" name="name" placeholder="Nome da integração" defaultValue={r?.name||p.name}/>{p.id==='wiapy'&&<><label>Token Authorization da Wiapy</label><input className="input" name="token" type="password" placeholder="token do webhook"/></>}{p.id==='cakto'&&<><label>Client ID da Cakto</label><input className="input" name="client_id"/><label>Client Secret</label><input className="input" name="client_secret" type="password"/></>}{p.id==='generic'&&<><label>Observação</label><input className="input" name="notes" placeholder="Nome do provedor / finalidade"/></>}<button className="button" type="submit">Salvar integração</button></form></details>}
    </div>})}</div>

    <div className="card" style={{marginTop:18}}><h2>Meta Ads</h2><p>Depois de cadastrar o App ID, App Secret e a versão da Graph API uma única vez, o uso fica direto: clique em <b>Conectar com Facebook</b>, autorize, escolha a conta de anúncios e sincronize. As credenciais ficam armazenadas no seu próprio banco.</p></div>
    <div className="card" style={{marginTop:18}}><h2>Como usar checkouts</h2><p>Para Wiapy, copie a URL gerada acima para a área de Webhook da plataforma e use o mesmo token informado aqui. Para Cakto, use a URL gerada como destino do webhook.</p></div>
  </main>;
}
