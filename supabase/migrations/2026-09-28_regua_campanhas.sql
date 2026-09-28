-- Régua de campanhas da Meta - 2026-09-28
-- Rodar no Supabase → SQL Editor (uma vez).
--
-- Contexto: a régua passou de "tem REGIONAL no nome" para "casa com algum
-- evento cadastrado". Sem os apelidos abaixo, R$ 22.125,77 de campanhas reais
-- ficariam sem evento. Medido em 28/09/2026, ver spec.

-- BH: 5 campanhas, R$ 12.820,66. Ex.: LEAD_ABO_REGIONAL_MOV_BH-newpgs
update events
   set utm_aliases = array(select distinct unnest(utm_aliases || array['BH']))
 where id = 'belohorizonte';

-- EM = Eduardo Magalhães: 2 campanhas, R$ 9.305,11. Ex.: [C01]REGIONAL-VENDAS_EM_ABO
update events
   set utm_aliases = array(select distinct unnest(utm_aliases || array['EM']))
 where id = 'luiseduardo';

-- Cascavel foi cancelado. Segue arquivado; o status só estava desatualizado.
update events set status = 'cancelado' where id = 'cascavel';

-- Verificação:
-- select id, utm_nomenclatura, utm_aliases, status, is_archived
--   from events where id in ('belohorizonte','luiseduardo','cascavel');
