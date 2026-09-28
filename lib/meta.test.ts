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

const EVENTOS = [
  { city: "EFAGRO EXPERIENCE", utm_nomenclatura: "EXPERIENCE", utm_aliases: ["EX"] },
  { city: "Cuiabá", utm_nomenclatura: "CUIABA", utm_aliases: [] as string[] },
];

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
      { data: [campanha("REGIONAL CUIABA - MARKETING", "200.25")] },
    ]);

    const r = await fetchMetaCampaigns({ datePreset: "maximum", events: EVENTOS });

    expect(r.campaigns.map((c) => c.name)).toEqual([
      "REGIONAL CUIABA - VENDAS",
      "REGIONAL CUIABA - MARKETING",
    ]);
    expect(r.totalSpend).toBeCloseTo(300.75, 2);
  });

  it("para quando a última página não traz próxima", async () => {
    const fetchStub = stubPaginas([{ data: [campanha("REGIONAL CUIABA - VENDAS", "10")] }]);
    global.fetch = fetchStub;

    const r = await fetchMetaCampaigns({ datePreset: "maximum", events: EVENTOS });

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
          data: [campanha(`REGIONAL CUIABA ${chamadas}`, "1")],
          paging: { next: "https://graph.facebook.com/proxima" },
        }),
      } as unknown as Response;
    });

    await fetchMetaCampaigns({ datePreset: "maximum", events: EVENTOS });

    expect(chamadas).toBeLessThanOrEqual(25);
  });
});

describe("fetchMetaCampaigns — régua por evento", () => {
  it("inclui campanha do Experience, que não tem REGIONAL no nome", async () => {
    global.fetch = stubPaginas([
      { data: [campanha("[efagro_experience]_lead_frio_cbo_set26", "500.00")] },
    ]);

    const r = await fetchMetaCampaigns({ datePreset: "maximum", events: EVENTOS });

    expect(r.campaigns.map((c) => c.name)).toEqual(["[efagro_experience]_lead_frio_cbo_set26"]);
    expect(r.totalSpend).toBeCloseTo(500, 2);
  });

  it("descarta campanha que não casa com nenhum evento", async () => {
    global.fetch = stubPaginas([
      { data: [campanha("[C01] REGIONAL -LONDRINA - PR", "123.82")] },
    ]);

    const r = await fetchMetaCampaigns({ datePreset: "maximum", events: EVENTOS });

    expect(r.campaigns).toHaveLength(0);
    expect(r.totalSpend).toBe(0);
  });
});

describe("fetchMetaCampaigns — recorte por início de captação", () => {
  it("usa time_range começando no since quando ele é informado", async () => {
    let urlChamada = "";
    global.fetch = vi.fn(async (url: string) => {
      urlChamada = url;
      return {
        status: 200, statusText: "OK",
        text: async () => JSON.stringify({ data: [], paging: {} }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    await fetchMetaCampaigns({ events: EVENTOS, since: "2026-07-01" });

    // A URL sai percent-encoded de URLSearchParams; decodifica antes de afirmar.
    expect(decodeURIComponent(urlChamada)).toContain('"since":"2026-07-01"');
  });

  it("ignora since quando from e to são informados juntos", async () => {
    let urlChamada = "";
    global.fetch = vi.fn(async (url: string) => {
      urlChamada = url;
      return {
        status: 200, statusText: "OK",
        text: async () => JSON.stringify({ data: [], paging: {} }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    await fetchMetaCampaigns({
      events: EVENTOS,
      from: "2026-05-01",
      to: "2026-05-10",
      since: "2026-07-01",
    });

    const urlDecodificada = decodeURIComponent(urlChamada);
    expect(urlDecodificada).toContain('"since":"2026-05-01"');
    expect(urlDecodificada).not.toContain("2026-07-01");
  });
});
