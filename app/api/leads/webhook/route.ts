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

// "28/09/2026 11:00:28" (Brasília) → ISO em UTC
function dataBrasiliaParaUTC(valor: string | undefined): string {
  if (!valor) return new Date().toISOString();
  const m = valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    const d = new Date(valor);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const [, dd, mm, yyyy, hh, mi, ss] = m;
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss ?? "00"}-03:00`).toISOString();
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  console.log("[Leads] ▶ Webhook recebido:", raw.slice(0, 1000));

  let corpo: Corpo;
  try {
    corpo = JSON.parse(raw);
  } catch {
    console.warn("[Leads] Corpo não é JSON");
    return NextResponse.json({ received: true, action: "skipped_invalid_json" });
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
    console.error("[Leads] Erro ao buscar eventos:", errEventos?.message);
    return NextResponse.json({ received: true, action: "db_error" });
  }

  // A origem informada pelo formulário é o texto que identifica o evento.
  const textoDoEvento = corpo.origem ?? "";
  const evento = events.find((ev) => eventMatchesText(ev, textoDoEvento));

  if (!evento) {
    console.warn("[Leads] Nenhum evento casou com:", textoDoEvento, "| lead:", email);
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

  const { error } = await supabase.from("leads").upsert([registro], { onConflict: "id" });
  if (error) {
    console.error("[Leads] Erro ao gravar:", error.message, "| payload:", raw.slice(0, 1000));
    return NextResponse.json({ received: true, action: "db_error" });
  }

  console.log("[Leads] ✅ Lead gravado:", registro.id, registro.email, registro.lote);
  return NextResponse.json({ received: true, action: "saved", id: registro.id });
}
