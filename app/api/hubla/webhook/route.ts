import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type AppEvent = {
  id: string;
  city: string;
  utm_nomenclatura: string;
  individualTickets: number;
  doubleTickets: number;
  faturamento_bruto: number;
  faturamento_liquido: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extrai string de um objeto em qualquer nível de aninhamento dado uma lista de chaves candidatas */
function pick(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (typeof val === "number") return String(val);
  }
  return "";
}

/** Tenta extrair número de vários campos candidatos */
function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const n = parseFloat(val.replace(",", "."));
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

/** Retorna true se a venda está aprovada / paga */
function isApproved(payload: Record<string, unknown>): boolean {
  const status = pick(payload,
    "status", "payment_status", "order_status", "event", "type",
    "situacao", "situacaoPagamento"
  ).toLowerCase();

  const approvedTerms = ["approved", "paid", "pago", "aprovado", "completed", "active", "success"];
  return approvedTerms.some((t) => status.includes(t));
}

/** Retorna true se o ingresso é duplo */
function isDouble(productName: string): boolean {
  const lower = productName.toLowerCase();
  return ["duplo", "double", "casal", "par ", "2 pessoas", "dois"].some((t) => lower.includes(t));
}

/** Encontra o evento pelo nome do produto — tenta UTM primeiro, depois cidade */
async function findEvent(productName: string): Promise<AppEvent | null> {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, city, utm_nomenclatura, individualTickets, doubleTickets, faturamento_bruto, faturamento_liquido");

  if (error || !events) {
    console.error("[Hubla] Erro ao buscar eventos:", error);
    return null;
  }

  const upper = productName.toUpperCase();

  // 1. Tenta UTM (ex: "CUIABA", "RIO_VERDE")
  const byUtm = events.find((e: AppEvent) =>
    e.utm_nomenclatura && upper.includes(e.utm_nomenclatura.toUpperCase())
  );
  if (byUtm) return byUtm;

  // 2. Tenta nome da cidade (ex: "Cuiabá", "Rio Verde")
  const byCity = events.find((e: AppEvent) =>
    e.city && upper.includes(e.city.toUpperCase().replace(/\s+/g, " "))
  );
  if (byCity) return byCity;

  return null;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Captura tudo antes de qualquer processamento
  const rawBody = await req.text();
  const allHeaders = Object.fromEntries(req.headers.entries());

  console.log("════════════════════════════════════════");
  console.log("[Hubla Webhook] ▶ Nova requisição recebida");
  console.log("[Hubla Webhook] Headers:", JSON.stringify(allHeaders, null, 2));
  console.log("[Hubla Webhook] Body raw:", rawBody);

  // 2. Parse do body
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
    console.log("[Hubla Webhook] Body parsed:", JSON.stringify(payload, null, 2));
  } catch {
    console.warn("[Hubla Webhook] Body não é JSON — ignorando");
    return NextResponse.json({ received: true });
  }

  // 3. Log dos campos mais prováveis para mapearmos o schema
  const likelyCandidates = [
    "event", "type", "status", "payment_status", "order_status",
    "product", "product_name", "item", "item_name", "plan", "plan_name",
    "amount", "gross_amount", "net_amount", "value", "price",
    "metadata", "custom_data", "utm", "utm_campaign",
  ];
  const found: Record<string, unknown> = {};
  for (const key of likelyCandidates) {
    if (key in payload) found[key] = payload[key];
  }
  console.log("[Hubla Webhook] Campos reconhecidos:", JSON.stringify(found, null, 2));

  // 4. Verifica se é uma venda aprovada
  const approved = isApproved(payload);
  console.log("[Hubla Webhook] É venda aprovada?", approved);

  if (!approved) {
    console.log("[Hubla Webhook] Status não é de aprovação — sem ação no banco");
    return NextResponse.json({ received: true, action: "skipped_non_approved" });
  }

  // 5. Extrai nome do produto — tentamos vários campos possíveis
  const productName = pick(payload,
    "product_name", "product", "item_name", "item", "plan_name", "plan",
    "description", "nome_produto", "produto"
  );
  console.log("[Hubla Webhook] Nome do produto extraído:", productName);

  if (!productName) {
    console.warn("[Hubla Webhook] Não foi possível identificar o produto — verifique os campos acima");
    return NextResponse.json({ received: true, action: "skipped_no_product" });
  }

  // 6. Valores financeiros
  const grossAmount = pickNumber(payload,
    "gross_amount", "amount", "value", "price", "total", "valor_bruto", "valor"
  );
  const netAmount = pickNumber(payload,
    "net_amount", "net_value", "liquid_amount", "valor_liquido", "net"
  );
  console.log("[Hubla Webhook] Valor bruto:", grossAmount, "| Valor líquido:", netAmount);

  // 7. Localiza evento no Supabase
  const event = await findEvent(productName);
  console.log("[Hubla Webhook] Evento encontrado:", event ? `${event.city} (${event.id})` : "NENHUM");

  if (!event) {
    console.warn("[Hubla Webhook] Evento não encontrado para produto:", productName);
    return NextResponse.json({ received: true, action: "skipped_no_event" });
  }

  // 8. Tipo de ingresso
  const ticketIsDouble = isDouble(productName);
  console.log("[Hubla Webhook] Tipo de ingresso:", ticketIsDouble ? "Duplo" : "Individual");

  // 9. Atualiza o evento no banco
  const updates: Record<string, number> = {
    individualTickets: event.individualTickets + (ticketIsDouble ? 0 : 1),
    doubleTickets: event.doubleTickets + (ticketIsDouble ? 1 : 0),
    faturamento_bruto: parseFloat((event.faturamento_bruto + grossAmount).toFixed(2)),
    faturamento_liquido: parseFloat((event.faturamento_liquido + netAmount).toFixed(2)),
  };

  console.log("[Hubla Webhook] Atualizando evento", event.id, "com:", updates);

  const { error: updateError } = await supabase
    .from("events")
    .update(updates)
    .eq("id", event.id);

  if (updateError) {
    console.error("[Hubla Webhook] Erro ao atualizar evento:", updateError);
    // Retorna 200 mesmo com erro para a Hubla não ficar reenviando
    return NextResponse.json({ received: true, action: "db_error", error: updateError.message });
  }

  console.log("[Hubla Webhook] ✅ Evento atualizado com sucesso");
  console.log("════════════════════════════════════════");

  return NextResponse.json({
    received: true,
    action: "updated",
    event: event.city,
    ticket_type: ticketIsDouble ? "double" : "individual",
    gross: grossAmount,
    net: netAmount,
  });
}
