-- Leads do EFAGRO Experience - 2026-09-28
-- Rodar no Supabase → SQL Editor (uma vez).

create table if not exists leads (
  id            text primary key,   -- ID da planilha, ou hash de e-mail+data
  event_id      text not null references events(id),
  nome          text,
  email         text not null,      -- normalizado: minúsculo, sem espaços nas pontas
  whatsapp      text,
  lote          text,               -- basic | standard | vip | gold | nao_informado
  origem        text not null,      -- planilha_antiga | lp_nova
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_term      text,
  utm_content   text,
  lead_date     timestamptz not null,
  payload       jsonb,
  created_at    timestamptz not null default now()
);

-- Uma linha por preenchimento. Quem escolheu Standard e depois Gold gera 2 linhas
-- com o mesmo e-mail, de propósito: a dedup por pessoa é feita na LEITURA
-- (contagem de e-mails distintos), nunca na escrita, para não perder a
-- informação de que a pessoa manifestou interesse em dois lotes.
create index if not exists idx_leads_event on leads(event_id);
create index if not exists idx_leads_email on leads(email);
create index if not exists idx_leads_date  on leads(lead_date);

alter table leads enable row level security;
drop policy if exists "leads anon all" on leads;
create policy "leads anon all" on leads for all using (true) with check (true);

-- Início da captação da edição atual. Investimento e leads anteriores a esta
-- data não contam. Nulo = comportamento de hoje (conta tudo).
alter table events add column if not exists captacao_inicio date;
update events set captacao_inicio = '2026-07-01' where id = 'saopaulo';

-- Verificação:
-- select count(*) from leads;
-- select id, captacao_inicio from events where captacao_inicio is not null;
