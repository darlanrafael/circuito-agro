-- Vendas órfãs do webhook da Hubla — 2026-09-23
-- Rodar no Supabase → SQL Editor (uma vez).
--
-- Motivo: quando o webhook recebia uma venda e não achava evento correspondente,
-- ele respondia `skipped_no_event` e DESCARTAVA o payload. Foi assim que Sinop
-- perdeu 21 vendas entre 30/07 e 27/08/2026 (ver §16.1 da doc mestra).
-- A partir daqui a venda órfã é guardada aqui em vez de sumir.

create table if not exists unmatched_sales (
  id                  text primary key,   -- invoice.id da Hubla: garante idempotência
  kind                text not null default 'payment',  -- 'payment' | 'refund'
  offer_name          text not null,
  ticket_type         text,               -- 'individual' | 'duplo'
  faturamento_bruto   numeric,
  faturamento_liquido numeric,
  payer_email         text,
  payer_name          text,
  payment_method      text,
  sale_date           timestamptz,
  payload             jsonb not null,     -- payload cru, para reprocessar depois
  received_at         timestamptz not null default now(),
  resolved_at         timestamptz,        -- preenchido quando a venda for importada
  resolved_event_id   text                -- evento para o qual ela foi importada
);

create index if not exists idx_unmatched_sales_pendentes
  on unmatched_sales(received_at) where resolved_at is null;

-- RLS: liberar CRUD via anon (mesmo padrão das demais tabelas do projeto)
alter table unmatched_sales enable row level security;
create policy "unmatched_sales anon all" on unmatched_sales
  for all using (true) with check (true);

-- Verificação:
-- select id, offer_name, sale_date, resolved_at from unmatched_sales order by received_at desc;
