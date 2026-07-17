import { describe, it, expect } from "vitest";
import { normNS, eventMatchesText, spendForEvent } from "./matching";

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
