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

type HublaPayload = {
  type: string;
  event: {
    invoice: {
      amount: { totalCents: number };
      receivers: HublaReceiver[];
    };
    products: HublaProduct[];
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

function isDouble(offerName: string): boolean {
  return ["duplo", "double", "casal", "par ", "2 pessoas", "dois"].some((t) =>
    offerName.toLowerCase().includes(t)
  );
}

async function findEvent(offerName: string): Promise<AppEvent | null> {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, city, utm_nomenclatura, individualTickets, doubleTickets, faturamento_bruto, faturamento_liquido");

  if (error || !events) {
    console.error("[Hubla] Erro ao buscar eventos:", error);
    return null;
  }

  const upper = offerName.toUpperCase();

  // 1. Tenta UTM (ex: "CUIABA" dentro de "REGIONAL - CUIABÁ")
  const byUtm = (events as AppEvent[]).find(
    (e) => e.utm_nomenclatura && upper.includes(e.utm_nomenclatura.toUpperCase())
  );
  if (byUtm) return byUtm;

  // 2. Tenta nome da cidade (ex: "Cuiabá")
  const byCity = (events as AppEvent[]).find(
    (e) => e.city && upper.includes(e.city.toUpperCase())
  );
  if (byCity) return byCity;

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

  // 1. Só processa vendas aprovadas
  if (payload.type !== "invoice.payment_succeeded") {
    console.log("[Hubla] Ignorado — type não é invoice.payment_succeeded");
    return NextResponse.json({ received: true, action: "skipped", type: payload.type });
  }

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
