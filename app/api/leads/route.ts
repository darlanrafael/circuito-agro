import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/leads";

export const dynamic = "force-dynamic";

// PostgREST/Supabase limita cada resposta a 1000 linhas por padrão. A tabela `leads`
// já passa de 1500 registros para o evento de São Paulo, então uma consulta simples
// viria truncada sem erro nenhum — a contagem e o `porLote` sairiam errados e
// ninguém perceberia, porque a resposta continua sendo 200. Por isso as duas
// consultas abaixo (leads e sales) são paginadas com `.range()` até a página voltar
// menor que o tamanho pedido. `Prefer: count=exact` foi descartado: ele devolve só o
// total, mas aqui é preciso ler as linhas de verdade (email, lote, payer_email) para
// montar `porLote` e cruzar com as vendas — um contador sozinho não bastaria.
const PAGE_SIZE = 1000;

type LeadRow = { email: string; lote: string | null };
type SaleRow = { payer_email: string | null };

async function fetchAllPages<T>(
  runPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await runPage(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error: error.message };
    const pagina = data ?? [];
    rows.push(...pagina);
    if (pagina.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { rows, error: null };
}

export async function GET(req: NextRequest) {
  const eventId = new URL(req.url).searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id é obrigatório" }, { status: 400 });

  const { rows: linhas, error: erroLeads } = await fetchAllPages<LeadRow>((from, to) =>
    supabase
      .from("leads")
      .select("email, lote")
      .eq("event_id", eventId)
      .order("id", { ascending: true })
      .range(from, to)
  );

  if (erroLeads) {
    console.error("[Leads] Erro ao ler:", erroLeads);
    return NextResponse.json({ error: "Erro ao ler leads." }, { status: 500 });
  }

  const emails = new Set(linhas.map((l) => l.email));

  const porLote: Record<string, number> = {};
  for (const l of linhas) porLote[l.lote ?? "nao_informado"] = (porLote[l.lote ?? "nao_informado"] ?? 0) + 1;

  // Em SQL, `status <> 'refunded'` dá UNKNOWN (não true) quando `status` é nulo, e
  // essa linha some do resultado sem erro. Hoje a coluna sempre vem preenchida
  // (approved/refunded, por default do banco), mas o filtro usa `.or(status.is.null,
  // status.neq.refunded)` em vez de `.neq()` para não depender disso: se um dia
  // entrar uma venda com status nulo, ela continua contando como conversão.
  const { rows: vendas, error: erroVendas } = await fetchAllPages<SaleRow>((from, to) =>
    supabase
      .from("sales")
      .select("payer_email")
      .eq("event_id", eventId)
      .or("status.is.null,status.neq.refunded")
      .order("id", { ascending: true })
      .range(from, to)
  );

  if (erroVendas) {
    console.error("[Leads] Erro ao ler vendas para cruzar conversão:", erroVendas);
  }

  // sales.payer_email vem direto da Hubla, sem a normalização que os leads já
  // recebem na gravação — por isso precisa passar por normalizeEmail aqui antes
  // de comparar com o e-mail (já normalizado) dos leads.
  const emailsVenda = new Set(vendas.map((v) => normalizeEmail(v.payer_email ?? "")).filter(Boolean));
  const convertidos = [...emails].filter((e) => emailsVenda.has(e)).length;

  return NextResponse.json({ total: linhas.length, unicos: emails.size, porLote, convertidos });
}
