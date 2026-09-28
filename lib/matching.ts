import { removeAccents } from "./utils";

// Normaliza sem espaços: "RIO VERDE" -> "RIOVERDE"
export function normNS(s: string): string {
  return removeAccents(s).replace(/\s+/g, "");
}

export type MatchableEvent = {
  city: string;
  utm_nomenclatura: string;
  utm_aliases?: string[];
};

// Códigos com <= 3 chars (ex.: "EM", "LEM") só casam como TOKEN isolado,
// nunca como substring — evita "EM" bater dentro de "BELEM"/"SISTEMA".
function textMatchesCode(text: string, code: string): boolean {
  const codeNS = normNS(code);
  if (!codeNS) return false;
  if (codeNS.length <= 3) {
    const tokens = removeAccents(text).split(" ").filter(Boolean); // já UPPER, sem acento
    return tokens.some((t) => t === codeNS);
  }
  return normNS(text).includes(codeNS);
}

export function eventMatchesText(ev: MatchableEvent, text: string): boolean {
  if (!text) return false;

  // 1. UTM principal + 2. aliases
  const codes = [ev.utm_nomenclatura, ...(ev.utm_aliases ?? [])].filter(Boolean);
  if (codes.some((c) => textMatchesCode(text, c))) return true;

  // 3. Fallback por cidade: >= min(nº palavras, 2) palavras (>2 chars) presentes
  const cityWords = removeAccents(ev.city).split(" ").filter((w) => w.length > 2);
  if (cityWords.length === 0) return false;
  const normText = removeAccents(text);
  const minMatch = Math.min(cityWords.length, 2);
  return cityWords.filter((w) => normText.includes(w)).length >= minMatch;
}

export function spendForEvent(
  ev: MatchableEvent,
  campaigns: { name: string; spend: number }[],
): number {
  return campaigns
    .filter((c) => eventMatchesText(ev, c.name))
    .reduce((sum, c) => sum + (c.spend || 0), 0);
}

// Uma campanha pertence ao circuito quando casa com algum evento cadastrado.
// Substitui a antiga regra de "tem a palavra REGIONAL no nome", que escondia
// todo o EFAGRO Experience (ver spec 2026-09-28).
export function campaignBelongsToCircuit(
  campaignName: string,
  events: MatchableEvent[],
): boolean {
  return events.some((ev) => eventMatchesText(ev, campaignName));
}

/** Evento como o casamento de venda precisa vê-lo. */
export type SaleMatchableEvent = MatchableEvent & {
  id: string;
  /** Id do produto na Hubla. Chave exata, quando cadastrada. */
  hubla_product_id?: string | null;
};

/**
 * Acha o evento de uma venda da Hubla.
 *
 * O id do produto vence sempre que estiver cadastrado, porque é exato. O nome da
 * oferta é heurística e vazava: "REGIONAL RIBEIRÃO - DUPLO - BÔNUS EXPERIENCE" casa
 * com Ribeirão E com o Experience, e quem ganhava era a ordem que o banco devolvia.
 */
export function findEventForSale<T extends SaleMatchableEvent>(
  events: T[],
  sale: { productId?: string | null; productName?: string | null; offerName?: string | null },
): T | null {
  const produto = String(sale.productId ?? "").trim();
  if (produto) {
    const exato = events.find((ev) => ev.hubla_product_id && ev.hubla_product_id === produto);
    if (exato) return exato;
  }
  // O nome do PRODUTO vem antes do nome da oferta: o produto carrega a cidade
  // ("REGIONAL BELO HORIZONTE - MG - 09/10") enquanto a oferta às vezes não diz nada
  // ("INGRESSO DUPLO PARA 6"), e uma venda assim já se perdeu por isso.
  const nome = [sale.productName, sale.offerName].find((t) => t && events.some((ev) => eventMatchesText(ev, t))) ?? "";
  const candidatos = events.filter((ev) => eventMatchesText(ev, nome));
  if (candidatos.length <= 1) return candidatos[0] ?? null;

  // Mais de um evento casa pelo nome. Nas ofertas da Hubla o assunto principal vem
  // primeiro ("REGIONAL RIBEIRÃO - DUPLO - BÔNUS EXPERIENCE" é ingresso de Ribeirão),
  // então vence quem aparece antes. Empate desempata pelo id, para nunca depender da
  // ordem em que o banco devolveu os eventos.
  const alvo = normNS(nome);
  const posicao = (ev: T) => {
    const codigos = [ev.utm_nomenclatura, ...(ev.utm_aliases ?? [])].filter(Boolean);
    const idx = codigos.map((c) => alvo.indexOf(normNS(c))).filter((i) => i >= 0);
    return idx.length ? Math.min(...idx) : Number.MAX_SAFE_INTEGER;
  };
  return [...candidatos].sort((a, b) => posicao(a) - posicao(b) || a.id.localeCompare(b.id))[0];
}
