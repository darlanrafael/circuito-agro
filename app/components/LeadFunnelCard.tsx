"use client";

import { useEffect, useState } from "react";

type Resumo = {
  total: number;
  unicos: number;
  porLote: Record<string, number>;
  convertidos: number;
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Props = {
  eventId: string;
  eventName: string;
  /**
   * Gasto em tráfego já recortado desde o início da captação (parâmetro `since`).
   * `null` = ainda não chegou ou a busca falhou — nesse caso o card mostra o
   * mesmo placeholder "—" das outras métricas, nunca R$ 0,00 (zero é só para
   * quando o valor real, já carregado, é de fato zero).
   */
  investimento: number | null;
  capacidade: number;
  individualTickets: number;
  doubleTickets: number;
};

export function LeadFunnelCard({
  eventId,
  eventName,
  investimento,
  capacidade,
  individualTickets,
  doubleTickets,
}: Props) {
  const [dados, setDados] = useState<Resumo | null>(null);

  useEffect(() => {
    fetch(`/api/leads?event_id=${eventId}`)
      .then((r) => r.json())
      .then((d) => { if (!d?.error) setDados(d); })
      .catch(() => {});
  }, [eventId]);

  const leads   = dados?.unicos ?? 0;
  const vendas  = individualTickets + doubleTickets;
  const pessoas = individualTickets + doubleTickets * 2;

  const cpl       = leads > 0 && investimento !== null ? investimento / leads : 0;
  const conversao = leads > 0 ? (dados?.convertidos ?? 0) / leads : 0;
  const ocupacao  = capacidade > 0 ? pessoas / capacidade : 0;

  // Enquanto carrega, o traço é o mesmo placeholder que as outras telas usam.
  const n = (v: string) => (dados ? v : "—");

  const etapas = [
    { rotulo: "Investimento",    valor: investimento === null ? "—" : fmtBRL(investimento), abaixo: null },
    { rotulo: "Leads",           valor: n(String(leads)),              abaixo: dados && investimento !== null ? `${fmtBRL(cpl)} por lead` : "—" },
    { rotulo: "Vendas",          valor: n(String(vendas)),             abaixo: n(`${(conversao * 100).toFixed(1)}% dos leads`) },
    { rotulo: "Vagas ocupadas",  valor: n(`${pessoas} de ${capacidade}`), abaixo: n(`${Math.round(ocupacao * 100)}%`) },
  ];

  return (
    <div
      className="p-3 sm:p-[14px]"
      style={{
        background: "#161616",
        border: "1px solid #252525",
        borderRadius: 12,
      }}
    >
      <p
        className="text-[8px] sm:text-[9px]"
        style={{
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#4b5563",
        }}
      >
        Funil de leads · {eventName}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3" style={{ marginTop: 10 }}>
        {etapas.map((e) => (
          <div key={e.rotulo}>
            <p
              className="text-[8px] sm:text-[9px]"
              style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4b5563" }}
            >
              {e.rotulo}
            </p>
            <p
              className="text-base sm:text-[20px] leading-none"
              style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#eab308", marginTop: 4 }}
            >
              {e.valor}
            </p>
            {e.abaixo && (
              <p className="text-[9px] sm:text-[10px]" style={{ color: "#4b5563", marginTop: 2 }}>
                {e.abaixo}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
