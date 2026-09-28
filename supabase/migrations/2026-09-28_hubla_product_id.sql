-- Casamento de venda por id de produto da Hubla - 2026-09-28
-- Rodar no Supabase → SQL Editor (uma vez).
--
-- Motivo: o webhook casava a venda pelo NOME DA OFERTA, que é heurística e vaza.
-- As ofertas do EFAGRO Experience se chamam "Super Early Bird - Vip", "2º Lote -
-- Standard", "Lote Final -Vip": nenhuma cita o evento, então 31 vendas (R$ 40.057,87)
-- nunca casaram. E "REGIONAL RIBEIRÃO - DUPLO - BÔNUS EXPERIENCE" casava com dois
-- eventos ao mesmo tempo, com o vencedor decidido pela ordem do banco.
--
-- O payload da Hubla traz event.products[0].id, constante por produto. É exato.

alter table events add column if not exists hubla_product_id text;

-- EFAGRO Experience 2026. Confirmado no payload cru de 4 vendas.
update events set hubla_product_id = '4pAjyd6BG6DViGRodJz9' where id = 'saopaulo';

-- Verificação:
-- select id, hubla_product_id from events where hubla_product_id is not null;
