import { describe, it, expect } from "vitest";
import { parseHublaSale } from "./hubla";

function payload(over: Record<string, unknown> = {}) {
  return {
    type: "invoice.payment_succeeded",
    event: {
      invoice: {
        id: "inv-1",
        amount: { totalCents: 19700 },
        receivers: [
          { role: "platform", totalCents: 838 },
          { role: "seller", totalCents: 18862 },
        ],
        paymentMethod: "PIX",
        saleDate: "2026-08-15T22:57:18.000Z",
      },
      products: [{ offers: [{ name: "EFAGRO REGIONAL - SINOP - INDIVIDUAL " }] }],
      subscriber: { email: "fred@exemplo.com", name: "Fred" },
      ...over,
    },
  };
}

describe("parseHublaSale", () => {
  it("extrai os dados da venda de um payload de pagamento", () => {
    expect(parseHublaSale(payload())).toEqual({
      id: "inv-1",
      offer_name: "EFAGRO REGIONAL - SINOP - INDIVIDUAL ",
      ticket_type: "individual",
      faturamento_bruto: 197,
      faturamento_liquido: 188.62,
      payer_email: "fred@exemplo.com",
      payer_name: "Fred",
      payment_method: "PIX",
      sale_date: "2026-08-15T22:57:18.000Z",
    });
  });

  it("classifica como duplo quando a oferta tem DUPLO no nome", () => {
    const p = payload({ products: [{ offers: [{ name: "EFAGRO REGIONAL - SINOP  DUPLO" }] }] });
    expect(parseHublaSale(p)?.ticket_type).toBe("duplo");
  });

  it("devolve null quando o payload não traz nome de oferta", () => {
    expect(parseHublaSale(payload({ products: [] }))).toBeNull();
  });

  it("usa createdAt quando saleDate está ausente", () => {
    const p = payload({
      invoice: {
        id: "inv-2",
        amount: { totalCents: 19700 },
        receivers: [{ role: "platform", totalCents: 838 }],
        createdAt: "2026-08-20T10:00:00.000Z",
      },
    });
    expect(parseHublaSale(p)?.sale_date).toBe("2026-08-20T10:00:00.000Z");
  });
});
