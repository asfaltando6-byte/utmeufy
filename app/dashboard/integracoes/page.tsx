import { getAdminDb } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Row={provider:string;name:string;status:string;webhook_key:string;config_public:any;updated_at:string};

const providers=[
  {id:'wiapy',name:'Wiapy',kind:'Checkout',ready:true,desc:'Recebe compras em tempo real via webhook e atribui UTMs/fbc/fbp.'},
  {id:'cakto',name:'Cakto',kind:'Checkout',ready:true,desc:'Recebe eventos de checkout, compra aprovada, recusada, reembolso e chargeback.'},
  {id:'meta',name:'Meta Ads',kind:'Tráfego',ready:true,desc:'Guarda conta de anúncio, pixel e token para a camada de gastos e server-side.'},
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
    <div className="hero"><div><span className="pill">Central de integrações</span><h1>Conecte suas fontes</h1><p className="muted">A ideia é usar o UTMeuFy como um hub: anúncio → página → checkout → venda → dashboard.</p></div></div>
    {params.saved&&<div className="success">Integração {params.saved} salva.</div>}
    <div className="integrationGrid">{providers.map(p=>{const r=by.get(p.id);return <div className="integrationCard" key={p.id}><div className="integrationTop"><div><b>{p.name}</b><span>{p.kind}</span></div><span className={r?'status ok':p.ready?'status ready':'status soon'}>{r?'Conectado':p.ready?'Disponível':'Em breve'}</span></div><p className="muted">{p.desc}</p>{r&&['wiapy','cakto'].includes(p.id)&&<div className="miniCode">{app||'https://SEU-DOMINIO'}/api/webhooks/{p.id}?key={r.webhook_key}</div>}{p.ready&&<details><summary>{r?'Atualizar integração':'Conectar'}</summary><form className="stack" action="/api/integrations" method="post"><input type="hidden" name="provider" value={p.id}/><input className="input" name="name" placeholder="Nome da integração" defaultValue={r?.name||p.name}/>{p.id==='wiapy'&&<><label>Token Authorization da Wiapy</label><input className="input" name="token" type="password" placeholder="token do webhook"/></>}{p.id==='cakto'&&<><label>Client ID da Cakto</label><input className="input" name="client_id"/><label>Client Secret</label><input className="input" name="client_secret" type="password"/></>}{p.id==='meta'&&<><label>ID da conta de anúncios</label><input className="input" name="ad_account_id" placeholder="act_..."/><label>Pixel ID</label><input className="input" name="pixel_id"/><label>Access token</label><input className="input" name="access_token" type="password"/><label>Versão Graph API</label><input className="input" name="graph_version" placeholder="ex.: vXX.X"/></>}{p.id==='generic'&&<><label>Observação</label><input className="input" name="notes" placeholder="Nome do provedor / finalidade"/></>}<button className="button" type="submit">Salvar integração</button></form></details>}</div>})}</div>
    <div className="card" style={{marginTop:18}}><h2>Como usar</h2><p>Para Wiapy, copie a URL gerada acima para a área de Webhook da plataforma e use o mesmo token que você informou aqui. Para Cakto, use a URL gerada como destino do webhook. Nenhuma credencial aparece novamente na tela depois de salva.</p></div>
  </main>;
}
