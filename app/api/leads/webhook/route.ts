import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { eventMatchesText } from "@/lib/matching";
import { isTestLead, normalizeLote, normalizeEmail, utmsFromUrl, leadIdFrom } from "@/lib/leads";

export const dynamic = "force-dynamic";

type Corpo = {
  id?: string;
  nome?: string;
  email?: string;
  whatsapp?: string;
  ingresso?: string;
  pagina?: string;
  origem?: string;
  data?: string;
};

// "28/09/2026 11:00:28" (Brasília) → ISO em UTC.
//
// Formatos aceitos:
//   - "DD/MM/YYYY HH:MM[:SS]" (espaço ou "T" entre data e hora) → interpretado como
//     horário de Brasília (-03:00), que é o formato que a planilha manda.
//   - Qualquer outra string que termine em fuso explícito ("Z" ou "+HH:MM"/"-HH:MM") →
//     interpretada literalmente, sem adivinhar nada.
// Qualquer outro formato é ambíguo (depende do fuso do processo, ou é ambíguo entre
// dia e mês) e NÃO é adivinhado: fica registrado em log e usa o instante atual.
function dataBrasiliaParaUTC(valor: string | undefined): string {
  if (!valor) return new Date().toISOString();
  const bruto = valor.trim();

  const brasilia = bruto.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (brasilia) {
    const [, dd, mm, yyyy, hh, mi, ss] = brasilia;
    return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss ?? "00"}-03:00`).toISOString();
  }

  const temFusoExplicito = /(Z|[+-]\d{2}:\d{2})$/i.test(bruto);
  if (temFusoExplicito) {
    const d = new Date(bruto);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  console.warn("[Leads] Data em formato inesperado, sem fuso explícito — usando o instante atual:", bruto);
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  console.log("[Leads] ▶ Webhook recebido");

  let corpo: Corpo;
  try {
    corpo = JSON.parse(raw);
  } catch {
    console.warn("[Leads] Corpo não é JSON");
    return NextResponse.json({ received: true, action: "skipped_invalid_json" });
  }

  if (corpo === null || typeof corpo !== "object" || Array.isArray(corpo)) {
    console.warn("[Leads] Corpo não é um objeto:", raw.slice(0, 1000));
    return NextResponse.json({ received: true, action: "skipped_invalid_body" });
  }

  if (isTestLead(corpo.nome, corpo.email)) {
    console.log("[Leads] Linha de teste, descartada:", corpo.nome, corpo.email);
    return NextResponse.json({ received: true, action: "skipped_test" });
  }

  const email = normalizeEmail(corpo.email ?? "");
  if (!email) {
    console.warn("[Leads] Lead sem e-mail, descartado");
    return NextResponse.json({ received: true, action: "skipped_no_email" });
  }

  const { data: events, error: errEventos } = await supabase
    .from("events")
    .select("id, city, utm_nomenclatura, utm_aliases")
    .eq("is_archived", false);

  if (errEventos || !events) {
    console.error("[Leads] Erro ao buscar eventos:", errEventos?.message, "| payload:", raw.slice(0, 1000));
    return NextResponse.json({ received: true, action: "db_error" });
  }

  // A origem informada pelo formulário é o texto que identifica o evento.
  const textoDoEvento = corpo.origem ?? "";
  const evento = events.find((ev) => eventMatchesText(ev, textoDoEvento));

  if (!evento) {
    console.warn("[Leads] Nenhum evento casou com:", textoDoEvento, "| payload:", raw.slice(0, 1000));
    return NextResponse.json({ received: true, action: "skipped_no_event", origem: textoDoEvento });
  }

  const leadDate = dataBrasiliaParaUTC(corpo.data);
  const registro = {
    id: leadIdFrom(corpo.id, email, leadDate),
    event_id: evento.id,
    nome: corpo.nome?.trim() || null,
    email,
    whatsapp: corpo.whatsapp?.trim() || null,
    lote: normalizeLote(corpo.ingresso),
    origem: "lp_nova",
    ...utmsFromUrl(corpo.pagina),
    lead_date: leadDate,
    payload: corpo,
  };

  // Sem id da planilha e sem data, o hash de idempotência (lib/leads.ts leadIdFrom)
  // cairia no instante atual, que muda a cada chamada — um reenvio duplicaria em vez
  // de atualizar. Não dá para resolver de verdade sem um dos dois; só fica registrado
  // que a garantia não vale para este registro, pelo próprio id (já identifica a
  // linha no banco, sem expor dado pessoal).
  if (!corpo.id?.trim() && !corpo.data) {
    console.warn("[Leads] Lead sem id e sem data — idempotência não pode ser garantida:", registro.id, registro.lote);
  }

  const { error } = await supabase.from("leads").upsert([registro], { onConflict: "id" });
  if (error) {
    console.error("[Leads] Erro ao gravar:", error.message, "| payload:", raw.slice(0, 1000));
    return NextResponse.json({ received: true, action: "db_error" });
  }

  console.log("[Leads] ✅ Lead gravado:", registro.id, registro.lote, registro.event_id);
  return NextResponse.json({ received: true, action: "saved", id: registro.id });
}
