# Spec — Melhorias & correções do Dashboard Circuito Agro

- **Data:** 2026-07-17
- **Projeto:** `circuito-agro`
- **Escopo:** 3 correções de bug + 1 feature nova, todas inter-relacionadas pelo casamento evento ↔ UTM/campanha.

> Contexto completo do sistema: ver [`Dashboardcircuitoagro.md`](../../../Dashboardcircuitoagro.md).

---

## Sumário dos itens

| # | Item | Tipo | Decisão do usuário |
|---|------|------|--------------------|
| 1 | Investimento da Meta não aparece em "Realizados" | Bug | Puxar automaticamente por evento |
| 2 | Lançar custos operacionais por regional | Feature | Investimento **total unificado** (tráfego + custos) |
| 3 | Atribuição quebra ao mudar UTM no anúncio (LEM) | Bug | Campo de **UTMs extras por evento** (tag input) + regra atual + fallback por cidade |
| 4 | Não consegue excluir regional no Admin | Bug | **Arquivar/ocultar** (soft-delete reversível) |

---

## Causa raiz (confirmada com evidência)

- **#4 — FK constraint.** Probe `DELETE` com id inexistente → `{"success":true}` (permissão OK). Logo, excluir evento **com vendas** viola a FK `sales.event_id → events.id`. Frontend ([AdminPage.tsx](../../../app/components/AdminPage.tsx)) ainda mascara o erro real com "Erro ao excluir evento."
- **#1 — campo estático.** [EventRealizadoRow.tsx](../../../app/components/EventRealizadoRow.tsx) usa `event.trafficInvestment`, sempre `0` no banco. O gasto real da Meta nunca é passado por evento para a linha.
- **#3 — casamento por chave única.** Análise ao vivo: `Luís Eduardo Magalhães = invested 0`, todos os outros com investimento. UTM no banco = `LUISEDUARDO`, mas a campanha na Meta foi renomeada para "EM". O investimento casa **só por `utm_nomenclatura`** (substring), sem fallback → zera.
- **Bônus:** `Belo Horizonte` tem UTM `"BELO HORIZONTE"` (com espaço) e não está nos filtros rápidos hardcoded da Análise UTM.

---

## Mudanças de banco (Supabase) — SQL a rodar no SQL Editor

> ⚠️ O usuário roda este SQL manualmente (não tenho acesso DDL). Entregar como script único.

```sql
-- #4 Arquivamento (soft-delete)
alter table events add column if not exists is_archived boolean not null default false;

-- #3 UTMs extras por evento (aliases) — array de texto
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
```

Notas:
- `on delete cascade` em `event_costs`: se um evento for **de fato** removido no futuro, seus custos somem junto. (Vendas continuam protegidas — por isso arquivamos, não excluímos.)
- `utm_aliases` como `text[]` (não CSV) → matching limpo, sem parsing frágil.

---

## Regra de casamento unificada (núcleo dos #1 e #3)

Criar **uma única função** de matching reutilizada em vendas, investimento e realizados. Um evento "casa" com um texto (nome de campanha Meta **ou** nome de oferta Hubla) se **qualquer** um bater, sob normalização `normNS` (sem acento, sem espaço, UPPER):

1. `utm_nomenclatura` (regra atual — mantida) **OU**
2. qualquer valor em `utm_aliases` **OU**
3. fallback por cidade: ≥ min(nº palavras da cidade, 2) palavras (> 2 chars) presentes.

Aplicar essa regra em:
- `lib/meta.ts` / `/api/meta/campaigns` (filtro de campanhas por cidade)
- `/api/utm/analysis` (`isTracked` de vendas **e** o cálculo de `invested` por evento — hoje o invested só usa UTM)
- `/api/hubla/webhook` (`findEvent`)
- Dashboard "Realizados" (investimento por evento)

> Guardrail p/ UTM curta ("EM"): exigir que aliases de 1–2 chars casem como **palavra isolada** ou com um separador de campanha, evitando falso-positivo por substring (ex.: "EM" dentro de "BELEM"). Definir na implementação com testes.

---

## Item #1 — Investimento em "Realizados"

- `Dashboard` já busca `metaCampaigns` (com `spend` e `name`). Calcular o `spend` **por evento** aplicando a regra de casamento sobre `metaCampaigns` e passar via prop `investment` para `EventRealizadoRow`.
- `EventRealizadoRow`: usar `investment` recebido (não `event.trafficInvestment`); ROAS = `faturamento_bruto / investment`.
- Consistência de período: realizados usam totais all-time (faturamento acumulado) → investimento também all-time do evento.

## Item #4 — Arquivar em vez de excluir

- Botão "Excluir" vira **"Arquivar"** (ícone/label). `PUT /api/events` seta `is_archived = true`. (Sem endpoint DELETE destrutivo na UI.)
- Admin: seção "Arquivados" (colapsável) listando eventos arquivados com botão **"Restaurar"** (`is_archived = false`).
- Dashboard, Análise UTM e listas principais: **filtrar `is_archived = false`** (excluir arquivados de todos os cálculos e telas).
- Surface do erro real do Supabase mantido no handler (defensivo), mas o fluxo normal não excluirá mais.

## Item #3 — Campo de UTMs por evento (tag input)

- `EventForm`: novo campo "UTMs para atribuição" — input estilo **tags**: digita e dá Enter, cada valor vira um chip removível (UPPERCASE, dedup). Persiste em `utm_aliases`.
- Placeholder/ajuda: "Além da nomenclatura principal, adicione códigos usados nos anúncios (ex.: EM, LEM)."
- Corrigir os **filtros rápidos hardcoded** da Análise UTM: gerar dinamicamente a partir dos eventos (inclui Belo Horizonte automaticamente) em vez da lista fixa.

## Item #2 — Custos operacionais (feature)

- **Backend:** `GET/POST/DELETE /api/events/costs` (por `event_id`). Categorias fixas: Espaço/Locação, Staff, Alimentação, Transmissão, Deslocamento, Outros.
- **Admin (EventForm/edição):** seção "Custos do evento" — lista de itens (categoria, descrição, valor) com adicionar/remover; mostra subtotal.
- **Dashboard (investimento total unificado):**
  - Novo conceito **Investimento Total = gasto Meta (tráfego) + custos operacionais**.
  - **Balanço Geral** passa a descontar o investimento total.
  - Novo indicador **"ROI real" = faturamento líquido / investimento total** (ao lado do ROAS de tráfego, que continua medindo só mídia).
  - Nuance de período: custos são **por evento (all-time)**, não têm data de venda. Portanto o investimento total/ROI real são exibidos na visão por evento e em "Realizados"; nos cards do topo filtrados por período, custos entram como total do(s) evento(s) selecionado(s) (deixar explícito na UI: "custos = total do evento, independente do período").

---

## Sequência de implementação

1. **SQL de schema** (usuário roda no Supabase).
2. Regra de casamento unificada + testes (fundação dos #1 e #3).
3. #4 Arquivar (rápido, isola risco de exclusão).
4. #3 Campo de UTMs (tag input) + filtros rápidos dinâmicos.
5. #1 Investimento em Realizados.
6. #2 Custos + investimento total unificado.

Cada etapa: TDD onde houver lógica (casamento, cálculos financeiros, timezone permanece intacto), verificação end-to-end antes de fechar.

---

## Questões em aberto

- Confirmar o **nome exato da campanha da Meta do LEM hoje** (pra validar o casamento e sugerir os aliases certos).
- "ROI real": nome final e se deve colorir igual ao ROAS (verde ≥ 1 / vermelho < 1).
- Custos: precisa de data por item (competência) ou só valor? (assumido: só valor, all-time).
