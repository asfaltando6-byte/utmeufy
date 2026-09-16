create extension if not exists pgcrypto;

create table if not exists events (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  event_name text not null,
  session_id uuid not null,
  visitor_id uuid not null,
  click_id text,
  site_id text,
  offer_id text,
  page_url text,
  page_path text,
  page_title text,
  referrer text,
  event_time timestamptz not null default now(),
  attribution jsonb not null default '{}'::jsonb,
  properties jsonb not null default '{}'::jsonb,
  user_agent text,
  ip_hash_source text,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_time on events(event_time desc);
create index if not exists idx_events_name on events(event_name);
create index if not exists idx_events_session on events(session_id);
create index if not exists idx_events_click on events(click_id);
create index if not exists idx_events_offer on events(offer_id);
create index if not exists idx_events_ad_id on events((attribution->>'ad_id'));
create index if not exists idx_events_campaign_id on events((attribution->>'campaign_id'));

create table if not exists orders (
  id bigint generated always as identity primary key,
  external_order_id text not null,
  provider text not null,
  event_type text,
  status text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  payment_method text,
  product_id text,
  product_name text,
  click_id text,
  attribution jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, external_order_id, event_type)
);
create index if not exists idx_orders_time on orders(occurred_at desc);
create index if not exists idx_orders_click on orders(click_id);
create index if not exists idx_orders_provider on orders(provider);
create index if not exists idx_orders_ad_id on orders((attribution->>'ad_id'));

create table if not exists ad_metrics (
  id bigint generated always as identity primary key,
  metric_date date not null,
  platform text not null default 'meta',
  campaign_id text,
  adset_id text,
  ad_id text,
  campaign_name text,
  adset_name text,
  ad_name text,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  unique(metric_date,platform,ad_id)
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  name text not null,
  status text not null default 'connected',
  webhook_key uuid not null default gen_random_uuid() unique,
  config_public jsonb not null default '{}'::jsonb,
  secret_config text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists webhook_logs (
  id bigint generated always as identity primary key,
  provider text not null,
  integration_id uuid,
  event_type text,
  external_id text,
  status text not null,
  detail text,
  received_at timestamptz not null default now()
);
create index if not exists idx_webhook_logs_time on webhook_logs(received_at desc);
create index if not exists idx_webhook_logs_provider on webhook_logs(provider);

alter table events enable row level security;
alter table orders enable row level security;
alter table ad_metrics enable row level security;
alter table integrations enable row level security;
alter table webhook_logs enable row level security;
