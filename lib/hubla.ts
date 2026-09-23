import { removeAccents } from "./utils";

export type ParsedSale = {
  id: string;
  offer_name: string;
  ticket_type: "individual" | "duplo";
  faturamento_bruto: number;
  faturamento_liquido: number;
  payer_email: string | null;
  payer_name: string | null;
  payment_method: string | null;
  sale_date: string;
};

export function isDouble(offerName: string): boolean {
  const normalized = removeAccents(offerName);
  return normalized.includes("DUPLO") || normalized.includes("DOUBLE");
}

// Extrai os campos de uma venda do payload da Hubla. Devolve null quando o
// payload não traz nome de oferta — sem ele não dá para atribuir nem reprocessar.
export function parseHublaSale(payload: unknown): ParsedSale | null {
  const ev = (payload as { event?: Record<string, unknown> })?.event;
  if (!ev) return null;

  const products = ev.products as { offers?: { name?: string }[] }[] | undefined;
  const offerName = products?.[0]?.offers?.[0]?.name ?? "";
  if (!offerName) return null;

  const invoice = ev.invoice as {
    id?: string;
    amount?: { totalCents?: number };
    receivers?: { role: string; totalCents: number }[];
    paymentMethod?: string;
    saleDate?: string;
    createdAt?: string;
  } | undefined;

  const totalCents = invoice?.amount?.totalCents ?? 0;
  const platformCents = invoice?.receivers?.find((r) => r.role === "platform")?.totalCents ?? 0;
  const subscriber = (ev.subscriber ?? ev.buyer) as { email?: string; name?: string } | undefined;

  return {
    id: invoice?.id ?? crypto.randomUUID(),
    offer_name: offerName,
    ticket_type: isDouble(offerName) ? "duplo" : "individual",
    faturamento_bruto: totalCents / 100,
    faturamento_liquido: (totalCents - platformCents) / 100,
    payer_email: subscriber?.email ?? null,
    payer_name: subscriber?.name ?? null,
    payment_method: invoice?.paymentMethod ?? null,
    sale_date: invoice?.saleDate ?? invoice?.createdAt ?? new Date().toISOString(),
  };
}
