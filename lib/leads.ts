import { createHash } from "node:crypto";

/** Lote escolhido no formulário. `nao_informado` cobre a LP nova, que deixa o campo opcional. */
export type Lote = "basic" | "standard" | "vip" | "gold" | "nao_informado";

// Linhas de teste que o time cria na planilha. Decisão registrada na spec.
const PADRAO_TESTE = /teste|testte|exemplo/i;

export function isTestLead(nome: string | null | undefined, email: string | null | undefined): boolean {
  return PADRAO_TESTE.test(String(nome ?? "")) || PADRAO_TESTE.test(String(email ?? ""));
}

const LOTES: Lote[] = ["basic", "standard", "vip", "gold"];

export function normalizeLote(valor: string | null | undefined): Lote {
  const v = String(valor ?? "").trim().toLowerCase();
  return (LOTES as string[]).includes(v) ? (v as Lote) : "nao_informado";
}

export function normalizeEmail(valor: string): string {
  return String(valor ?? "").trim().toLowerCase();
}

export type Utms = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};

const UTMS_VAZIAS: Utms = {
  utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null,
};

export function utmsFromUrl(url: string | null | undefined): Utms {
  if (!url) return { ...UTMS_VAZIAS };
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return { ...UTMS_VAZIAS };
  }
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };
}

export function leadIdFrom(id: string | null | undefined, email: string, leadDate: string): string {
  const limpo = String(id ?? "").trim();
  if (limpo) return limpo;
  return createHash("sha1").update(`${normalizeEmail(email)}|${leadDate}`).digest("hex").slice(0, 24);
}
