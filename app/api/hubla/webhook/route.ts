import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ─── Tipos do payload Hubla ───────────────────────────────────────────────────

type HublaReceiver = {
  role: string;
  totalCents: number;
};

type HublaOffer = {
  name: string;
};

type HublaProduct = {
  offers: HublaOffer[];
};

type HublaSubscriber = {
  email?: string;
  name?: string;
};

type HublaPayload = {
  type: string;
  event: {
    invoice: {
      id?: string;
      amount: { totalCents: number };
      receivers: HublaReceiver[];
      paymentMethod?: string;
      saleDate?: string;
      createdAt?: string;
    };
    products: HublaProduct[];
    subscriber?: HublaSubscriber;
    buyer?: HublaSubscriber;
  };
};

// ─── Tipo local do evento no Supabase ────────────────────────────────────────

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

function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove combining diacritics
    .replace(/[^A-Z0-9 ]/gi, " ")    // substitui caracteres especiais por espaço
    .replace(/\s+/g, " ")            // colapsa espaços múltiplos
    .trim()
    .toUpperCase();
}

function isDouble(offerName: string): boolean {
  const normalized = removeAccents(offerName);
  return normalized.includes("DUPLO") || normalized.includes("DOUBLE");
}

async function findEvent(offerName: string): Promise<AppEvent | null> {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, city, utm_nomenclatura, individualTickets, doubleTickets, faturamento_bruto, faturamento_liquido");

  if (error || !events) {
    console.error("[Hubla] Erro ao buscar eventos:", error);
    return null;
  }

  const normalizedOffer = removeAccents(offerName);
  console.log("[Hubla] Oferta normalizada:", normalizedOffer);

  for (const ev of events as AppEvent[]) {
    // a. Cada palavra do utm_nomenclatura aparece na oferta normalizada
    if (ev.utm_nomenclatura) {
      const utmWords = removeAccents(ev.utm_nomenclatura).split(" ").filter(Boolean);
      if (utmWords.length > 0 && utmWords.every((w) => normalizedOffer.includes(w))) {
        console.log("[Hubla] Match por UTM:", ev.utm_nomenclatura, "→", ev.city);
        return ev;
      }
    }
  }

  for (const ev of events as AppEvent[]) {
    // b. Cada palavra do nome da cidade aparece na oferta normalizada
    if (ev.city) {
      const cityWords = removeAccents(ev.city).split(" ").filter(Boolean);
      if (cityWords.length > 0 && cityWords.every((w) => normalizedOffer.includes(w))) {
        console.log("[Hubla] Match por cidade:", ev.city);
        return ev;
      }
    }
  }

  console.warn("[Hubla] Nenhum evento encontrado. Oferta normalizada:", normalizedOffer);
  console.warn("[Hubla] Eventos disponíveis:", (events as AppEvent[]).map(
    (e) => `${e.city} (utm: ${e.utm_nomenclatura})`
  ).join(", "));
  return null;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  console.log("════════════════════════════════════════");
  console.log("[Hubla] ▶ Webhook recebido");
  console.log("[Hubla] Body:", rawBody);

  let payload: HublaPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.warn("[Hubla] Body não é JSON");
    return NextResponse.json({ received: true });
  }

  console.log("[Hubla] type:", payload.type);

  // Despacha por tipo de evento
  if (payload.type === "invoice.payment_succeeded") {
    return handlePayment(payload);
  }
  if (payload.type === "invoice.refund_succeeded" || payload.type === "invoice.refunded") {
    return handleRefund(payload);
  }

  console.log("[Hubla] Ignorado — type não mapeado:", payload.type);
  return NextResponse.json({ received: true, action: "skipped", type: payload.type });
}

// ─── Handler de venda aprovada ────────────────────────────────────────────────

async function handlePayment(payload: HublaPayload) {

  // 2. Extrai nome da oferta
  const offerName = payload.event?.products?.[0]?.offers?.[0]?.name ?? "";
  console.log("[Hubla] Oferta:", offerName);

  if (!offerName) {
    console.warn("[Hubla] Nome da oferta não encontrado em event.products[0].offers[0].name");
    return NextResponse.json({ received: true, action: "skipped_no_offer" });
  }

  // 3. Valores financeiros
  const grossAmount = (payload.event?.invoice?.amount?.totalCents ?? 0) / 100;
  const sellerReceiver = payload.event?.invoice?.receivers?.find((r) => r.role === "seller");
  const netAmount = (sellerReceiver?.totalCents ?? 0) / 100;

  console.log("[Hubla] Bruto:", grossAmount, "| Líquido (seller):", netAmount);

  // 4. Localiza evento
  const event = await findEvent(offerName);
  console.log("[Hubla] Evento:", event ? `${event.city} (${event.id})` : "NÃO ENCONTRADO");

  if (!event) {
    console.warn("[Hubla] Nenhum evento encontrado para oferta:", offerName);
    return NextResponse.json({ received: true, action: "skipped_no_event", offer: offerName });
  }

  // 5. Tipo de ingresso
  const ticketIsDouble = isDouble(offerName);
  console.log("[Hubla] Ingresso:", ticketIsDouble ? "Duplo" : "Individual");

  // 6. Atualiza Supabase
  const updates = {
    individualTickets: event.individualTickets + (ticketIsDouble ? 0 : 1),
    doubleTickets:     event.doubleTickets     + (ticketIsDouble ? 1 : 0),
    faturamento_bruto:   parseFloat((event.faturamento_bruto   + grossAmount).toFixed(2)),
    faturamento_liquido: parseFloat((event.faturamento_liquido + netAmount).toFixed(2)),
  };

  console.log("[Hubla] Atualizando", event.id, "→", updates);

  const { error: updateError } = await supabase
    .from("events")
    .update(updates)
    .eq("id", event.id);

  if (updateError) {
    console.error("[Hubla] Erro no update:", updateError);
    return NextResponse.json({ received: true, action: "db_error", error: updateError.message });
  }

  // 10. Insere registro na tabela sales
  const invoiceId = payload.event?.invoice?.id;
  const subscriber = payload.event?.subscriber ?? payload.event?.buyer;
  const saleDate =
    payload.event?.invoice?.saleDate ??
    payload.event?.invoice?.createdAt ??
    new Date().toISOString();

  const saleRecord = {
    id: invoiceId ?? crypto.randomUUID(),
    event_id: event.id,
    offer_name: offerName,
    ticket_type: ticketIsDouble ? "duplo" : "individual",
    faturamento_bruto: grossAmount,
    faturamento_liquido: netAmount,
    payer_email: subscriber?.email ?? null,
    payer_name: subscriber?.name ?? null,
    payment_method: payload.event?.invoice?.paymentMethod ?? null,
    sale_date: saleDate,
  };

  console.log("[Hubla] Inserindo venda:", saleRecord);

  const { error: saleError } = await supabase.from("sales").insert([saleRecord]);
  if (saleError) {
    console.error("[Hubla] Erro ao inserir venda:", saleError);
    // Não bloqueia: evento já foi atualizado
  } else {
    console.log("[Hubla] ✅ Venda registrada na tabela sales");
  }

  console.log("[Hubla] ✅ Atualizado com sucesso");
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

// ─── Handler de reembolso ─────────────────────────────────────────────────────

async function handleRefund(payload: HublaPayload) {
  const invoiceId = payload.event?.invoice?.id;
  console.log("[Hubla Refund] invoice id:", invoiceId);

  if (!invoiceId) {
    console.warn("[Hubla Refund] invoice.id não encontrado");
    return NextResponse.json({ received: true, action: "skipped_no_invoice_id" });
  }

  // 1. Busca a venda original na tabela sales
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("id, event_id, ticket_type, faturamento_bruto, faturamento_liquido")
    .eq("id", invoiceId)
    .single();

  if (saleError || !sale) {
    console.warn("[Hubla Refund] Venda não encontrada para id:", invoiceId, saleError);
    return NextResponse.json({ received: true, action: "skipped_sale_not_found" });
  }
  console.log("[Hubla Refund] Venda encontrada:", sale);

  // 2. Busca o evento
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, city, individualTickets, doubleTickets, faturamento_bruto, faturamento_liquido")
    .eq("id", sale.event_id)
    .single();

  if (eventError || !event) {
    console.warn("[Hubla Refund] Evento não encontrado:", sale.event_id);
    return NextResponse.json({ received: true, action: "skipped_event_not_found" });
  }
  console.log("[Hubla Refund] Evento:", event.city);

  // 3. Decrementa os totais no evento
  const isDouble = sale.ticket_type === "duplo";
  const eventUpdates = {
    individualTickets: Math.max(0, event.individualTickets - (isDouble ? 0 : 1)),
    doubleTickets:     Math.max(0, event.doubleTickets     - (isDouble ? 1 : 0)),
    faturamento_bruto:   parseFloat(Math.max(0, event.faturamento_bruto   - sale.faturamento_bruto).toFixed(2)),
    faturamento_liquido: parseFloat(Math.max(0, event.faturamento_liquido - sale.faturamento_liquido).toFixed(2)),
  };

  console.log("[Hubla Refund] Atualizando evento →", eventUpdates);

  const { error: updateError } = await supabase
    .from("events")
    .update(eventUpdates)
    .eq("id", event.id);

  if (updateError) {
    console.error("[Hubla Refund] Erro ao atualizar evento:", updateError);
    return NextResponse.json({ received: true, action: "db_error", error: updateError.message });
  }

  // 4. Marca a venda como reembolsada
  const { error: refundError } = await supabase
    .from("sales")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", invoiceId);

  if (refundError) {
    console.error("[Hubla Refund] Erro ao atualizar venda:", refundError);
  } else {
    console.log("[Hubla Refund] ✅ Venda marcada como reembolsada");
  }

  console.log("════════════════════════════════════════");

  return NextResponse.json({
    received: true,
    action: "refunded",
    event: event.city,
    ticket_type: sale.ticket_type,
    refunded_bruto: sale.faturamento_bruto,
    refunded_liquido: sale.faturamento_liquido,
  });
}
