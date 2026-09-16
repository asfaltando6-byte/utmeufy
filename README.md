# UTMeuFy

Tracker próprio para páginas de oferta, pensado para operação com Meta Ads e produtos digitais.

## Recursos atuais

- Identificação first-party de visitante, sessão e clique
- UTMs + campaign_id/adset_id/ad_id + fbclid/gclid/ttclid
- PageView
- Scroll 25/50/75/90%
- Tempo engajado
- Cliques e clique de checkout
- Submit de formulário **sem capturar o conteúdo digitado**
- Evento de saída
- `tracker.js` universal para instalar em outros sites
- Eventos customizados via `window.OfferTracker.track()`
- Webhook genérico de checkout com deduplicação por order ID
- Supabase/Postgres
- Dashboard privado por senha
- Multi-site/multi-oferta
- Estrutura de métricas Meta (`ad_metrics`)
- IP armazenado apenas como hash irreversível quando `IP_HASH_SALT` está configurado

## Deploy (GitHub + Vercel + Supabase)

1. Crie um projeto Supabase.
2. No SQL Editor, execute `supabase/schema.sql`.
3. Importe este repositório na Vercel.
4. Cadastre as variáveis de `.env.example` em **Vercel > Project > Settings > Environment Variables**.
5. Faça o deploy.
6. Acesse `/dashboard` e use `DASHBOARD_PASSWORD`.

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, `DASHBOARD_SESSION_TOKEN`, `CHECKOUT_WEBHOOK_SECRET` ou `IP_HASH_SALT` no navegador.

## Instalação do tracker em uma oferta

```html
<script
  src="https://SEU-DOMINIO-DO-TRACKER/tracker.js"
  data-site="site-01"
  data-offer="oferta-01"
  async>
</script>
```

Evento manual:

```html
<script>
  window.OfferTracker?.track('view_offer', { section: 'pricing' });
</script>
```

Eventos disponíveis: `view_offer`, `view_pricing`, `faq_open`, `carousel_view`, `video_play`, `video_progress`, `video_complete`, `initiate_checkout`, `purchase`, `lead` e `custom`.

## Checkout

Endpoint genérico:

`POST /api/webhooks/checkout`

Header obrigatório:

`x-webhook-secret: <CHECKOUT_WEBHOOK_SECRET>`

O adaptador específico do checkout ainda deve ser implementado conforme o provedor real usado na operação.

## Próximas etapas

- Adaptador específico do checkout
- Repasse de `click_id` ao checkout
- Meta Marketing API: gasto, campanhas, conjuntos e anúncios
- Meta Conversions API com deduplicação
- Dashboard por campanha/conjunto/anúncio
- Diagnóstico automático do funil
- Consentimento/LGPD e retenção configurável
