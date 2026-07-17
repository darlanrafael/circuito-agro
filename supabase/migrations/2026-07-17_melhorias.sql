-- Melhorias Dashboard Circuito Agro — 2026-07-17
-- Rodar no Supabase → SQL Editor (uma vez).

-- #4 Arquivamento (soft-delete)
alter table events add column if not exists is_archived boolean not null default false;

-- #3 UTMs extras por evento (aliases de campanha/venda)
alter table events add column if not exists utm_aliases text[] not null default '{}';

-- #2 Custos operacionais por evento
create table if not exists event_costs (
  id          uuid primary key default gen_random_uuid(),
  event_id    text not null references events(id) on delete cascade,
  categoria   text not null,        -- 'espaco' | 'staff' | 'alimentacao' | 'transmissao' | 'deslocamento' | 'outros'
  descricao   text,
  valor       numeric not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_event_costs_event on event_costs(event_id);

-- RLS: liberar CRUD via anon (mesmo padrão das demais tabelas do projeto)
alter table event_costs enable row level security;
create policy "event_costs anon all" on event_costs
  for all using (true) with check (true);

-- Verificação (opcional):
-- select is_archived, utm_aliases from events limit 1;
-- select * from event_costs limit 1;
