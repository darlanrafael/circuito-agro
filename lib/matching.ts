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
