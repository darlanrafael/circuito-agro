import { describe, it, expect } from "vitest";
import { normNS, eventMatchesText, spendForEvent, campaignBelongsToCircuit, findEventForSale } from "./matching";

const lem = { city: "Luís Eduardo Magalhães", utm_nomenclatura: "LUISEDUARDO", utm_aliases: ["EM", "LEM"] };
const bh = { city: "Belo Horizonte", utm_nomenclatura: "BELO HORIZONTE", utm_aliases: [] as string[] };

describe("normNS", () => {
  it("remove acento, espaço e caixa", () => {
    expect(normNS("Belo Horizonte")).toBe("BELOHORIZONTE");
    expect(normNS("Luís Eduardo")).toBe("LUISEDUARDO");
  });
});

describe("eventMatchesText", () => {
  it("casa pela UTM principal (regra atual)", () => {
    expect(eventMatchesText(lem, "REGIONAL LUIS EDUARDO")).toBe(true);
  });
  it("casa por alias mesmo com a campanha renomeada", () => {
    expect(eventMatchesText(lem, "REGIONAL - EM 2026")).toBe(true);
    expect(eventMatchesText(lem, "REGIONAL LEM")).toBe(true);
  });
  it("casa por palavras da cidade quando não há UTM/alias no texto", () => {
    expect(eventMatchesText(lem, "Circuito Eduardo Magalhaes Regional")).toBe(true);
  });
  it("UTM curta não gera falso-positivo por substring", () => {
    // "EM" NÃO pode casar dentro de "BELEM" nem "SISTEMA"
    expect(eventMatchesText(lem, "REGIONAL BELEM")).toBe(false);
    expect(eventMatchesText(lem, "SISTEMA REGIONAL")).toBe(false);
  });
  it("BH com espaço na UTM casa a campanha", () => {
    expect(eventMatchesText(bh, "REGIONAL BELO HORIZONTE")).toBe(true);
  });
  it("não casa cidade errada", () => {
    expect(eventMatchesText(bh, "REGIONAL CUIABA")).toBe(false);
  });
});

describe("spendForEvent", () => {
  it("soma o spend das campanhas que casam", () => {
    const campaigns = [
      { name: "REGIONAL - EM", spend: 100 },
      { name: "REGIONAL CUIABA", spend: 50 },
      { name: "REGIONAL LEM VIDEO", spend: 25 },
    ];
    expect(spendForEvent(lem, campaigns)).toBe(125);
  });
});

describe("campaignBelongsToCircuit", () => {
  const eventos = [
    { city: "Belo Horizonte", utm_nomenclatura: "BELO HORIZONTE", utm_aliases: ["BH"] },
    { city: "EFAGRO EXPERIENCE", utm_nomenclatura: "EXPERIENCE", utm_aliases: ["EX"] },
  ];

  it("aceita campanha do Experience, que não tem a palavra REGIONAL", () => {
    expect(campaignBelongsToCircuit("[efagro_experience]_lead_frio_cbo_set26", eventos)).toBe(true);
  });

  it("aceita campanha que casa por apelido curto isolado", () => {
    expect(campaignBelongsToCircuit("LEAD_ABO_REGIONAL_MOV_BH-newpgs", eventos)).toBe(true);
  });

  it("recusa campanha de cidade que não é do circuito", () => {
    expect(campaignBelongsToCircuit("[C01] REGIONAL -LONDRINA - PR", eventos)).toBe(false);
  });

  it("recusa quando não há evento nenhum", () => {
    expect(campaignBelongsToCircuit("[efagro_experience]_lead_frio", [])).toBe(false);
  });
});

describe("findEventForSale", () => {
  const experience = { id: "saopaulo", city: "EFAGRO EXPERIENCE ", utm_nomenclatura: "EXPERIENCE", utm_aliases: ["EX"], hubla_product_id: "4pAjyd6BG6DViGRodJz9" };
  const ribeirao   = { id: "ribeirao",  city: "Ribeirão Preto",    utm_nomenclatura: "RIBEIRAO",   utm_aliases: [] as string[], hubla_product_id: null };
  const eventos = [experience, ribeirao];

  it("casa pelo id do produto, mesmo quando o nome da oferta não diz nada", () => {
    // "Super Early Bird - Vip" não contém EXPERIENCE: só o id do produto salva.
    const ev = findEventForSale(eventos, { productId: "4pAjyd6BG6DViGRodJz9", offerName: "Super Early Bird - Vip" });
    expect(ev?.id).toBe("saopaulo");
  });

  it("id do produto vence o nome da oferta quando os dois apontam para eventos diferentes", () => {
    // Este é o vazamento real: oferta de Ribeirão com a palavra EXPERIENCE no nome.
    const ev = findEventForSale(eventos, { productId: null, offerName: "REGIONAL RIBEIRÃO - DUPLO - BÔNUS EXPERIENCE" });
    expect(ev?.id).toBe("ribeirao");
  });

  it("cai no nome da oferta quando o produto não está cadastrado em evento nenhum", () => {
    const ev = findEventForSale(eventos, { productId: "produto-de-outro-curso", offerName: "REGIONAL RIBEIRÃO - INDIVIDUAL" });
    expect(ev?.id).toBe("ribeirao");
  });

  it("casa pelo nome do produto quando a oferta não diz a cidade", () => {
    // Caso real: oferta "INGRESSO DUPLO PARA 6", produto "REGIONAL BELO HORIZONTE - MG - 09/10".
    const bh = { id: "belohorizonte", city: "Belo Horizonte", utm_nomenclatura: "BELO HORIZONTE", utm_aliases: ["BH"], hubla_product_id: null };
    const ev = findEventForSale([...eventos, bh], {
      productId: "PeVRs3m24OQN3lslHHVH",
      productName: "REGIONAL BELO HORIZONTE - MG - 09/10",
      offerName: "INGRESSO DUPLO PARA 6",
    });
    expect(ev?.id).toBe("belohorizonte");
  });

  it("devolve null quando nada casa", () => {
    expect(findEventForSale(eventos, { productId: "xyz", offerName: "Workshop O Fim do Caos" })).toBeNull();
  });

  it("não deixa a ordem dos eventos decidir: id do produto sempre ganha", () => {
    const invertido = [ribeirao, experience];
    const ev = findEventForSale(invertido, { productId: "4pAjyd6BG6DViGRodJz9", offerName: "Lote Final -Vip" });
    expect(ev?.id).toBe("saopaulo");
  });
});
