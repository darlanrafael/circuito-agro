import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchMetaCampaigns } from "./meta";

function campanha(nome: string, spend: string) {
  return { id: nome, name: nome, status: "ACTIVE", insights: { data: [{ spend }] } };
}

/** Responde cada URL com a página correspondente, encadeadas por paging.next. */
function stubPaginas(paginas: { data: unknown[]; next?: string }[]) {
  let chamada = 0;
  return vi.fn(async () => {
    const p = paginas[chamada++];
    return {
      status: 200,
      statusText: "OK",
      text: async () =>
        JSON.stringify({ data: p.data, paging: p.next ? { next: p.next } : {} }),
    } as unknown as Response;
  });
}

beforeEach(() => {
  process.env.META_ACCESS_TOKEN = "token-de-teste";
  process.env.META_AD_ACCOUNT_ID = "act_123";
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); });

describe("fetchMetaCampaigns — paginação", () => {
  it("soma as campanhas de todas as páginas, não só da primeira", async () => {
    global.fetch = stubPaginas([
      { data: [campanha("REGIONAL CUIABA - VENDAS", "100.50")], next: "https://graph.facebook.com/pagina2" },
      { data: [campanha("REGIONAL RIO VERDE - VENDAS", "200.25")] },
    ]);

    const r = await fetchMetaCampaigns({ datePreset: "maximum" });

    expect(r.campaigns.map((c) => c.name)).toEqual([
      "REGIONAL CUIABA - VENDAS",
      "REGIONAL RIO VERDE - VENDAS",
    ]);
    expect(r.totalSpend).toBeCloseTo(300.75, 2);
  });

  it("para quando a última página não traz próxima", async () => {
    const fetchStub = stubPaginas([{ data: [campanha("REGIONAL SINOP - VENDAS", "10")] }]);
    global.fetch = fetchStub;

    const r = await fetchMetaCampaigns({ datePreset: "maximum" });

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(r.campaigns).toHaveLength(1);
  });

  it("não segue páginas indefinidamente se a Meta sempre devolver next", async () => {
    let chamadas = 0;
    global.fetch = vi.fn(async () => {
      chamadas++;
      return {
        status: 200, statusText: "OK",
        text: async () => JSON.stringify({
          data: [campanha(`REGIONAL LOOP ${chamadas}`, "1")],
          paging: { next: "https://graph.facebook.com/proxima" },
        }),
      } as unknown as Response;
    });

    await fetchMetaCampaigns({ datePreset: "maximum" });

    expect(chamadas).toBeLessThanOrEqual(25);
  });
});
